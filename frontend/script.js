const version = 3;
const base_api = "https://burkeblack.tv/extensions/game_interaction/api.php";

var current_page = 1;
var current_game_id = 0;
var current_type_id = 0;
var panel_token;
var actions = [];

window.Twitch.ext.onAuthorized(function(auth) {
    panel_token = auth.token;
    var sections = auth.token.split('.');
    payload = JSON.parse(window.atob(sections[1]));
    if(payload.user_id) {
        refresh();
        showAuthing();
    } else {
        showAuth();
    }
});

$(document).ready(function() {
    platform = getPlatform(getUrlVars());
    $('#login-button').click(function() {
        window.Twitch.ext.actions.requestIdShare();
    });
    $('#pagination_prev').click(function() {
        getPrevActions();
    });
    $('#refresh_ui').click(function() {
        refresh();
    });
    $('#pagination_next').click(function() {
        getNextActions();
    });
    $(document).on('click', '.send-button', function () {
        handleSendButton($(this).attr("id"));
    });
    $(document).on('click', '.info-link', function () {
        handleInfoLink($(this).attr("id"));
    });
    $(document).on('click', '#modal-info-close-btn', function() {
        $('#modal-info').modal('hide');
    });
    $(document).on('click', '#send-cancel', function() {
        $('#modal-send').modal('hide');
    });
    $(document).on('click', '#modal-send-close-btn', function() {
        $('#modal-send').modal('hide');
    })
    $(document).on('click', '#send-confirm', function() {
        var actionCode = $('#modal-send-authcode').val();
        var action = actions[actionCode];
        sendAction(current_game_id, actionCode, action.cost);
        $('#modal-send').modal('hide');
    });
    $(document).on('click', '#actions_ui_link', function() {
        showActions();
    });
    $(document).on('click', '#credits_ui_link', function() {
        showCredits();
    });
    $(document).on('click', '.type-selection', function() {
        console.log("test");
        handleTypeSelected($(this).attr("id"), $(this).text()); 
    });
});

function initializeConnector() {
    window.Twitch.ext.actions.requestIdShare();
}

function handleTypeSelected(typeId, typeName) {
    $('#dropdownMenuButton').html(typeName);
    current_type_id = typeId;
    getGameActions(current_game_id);
}

function showAuth() {
    $('#authed').hide();
    $('#login-button').show();
    $('#loading-spinner').hide();
    $('#landing').show();
}

function showAuthing() {
    $('#authed').hide();
    $('#landing').show();
    $('#login-button').hide();
    $('#loading-spinner').show();
}

function showAuthed() {
    $('#landing').hide();
    $('#authed').show();
}

function showActions() {
    $('#credits_ui').hide();
    $('#actions_ui').show();
}

function showCredits() {
    $('#credits_ui').show();
    $('#actions_ui').hide();
}

function handleSendButton(btnId) {
    // send_<action_id>_<action_code>
    var parts = btnId.split("_");
    parts.shift();
    var actionId = parts[0];
    parts.shift();
    var actionCode = parts.join("_");

    var action = actions[actionCode];
    $('#modal-send-authcode').val(actionCode);
    $('#modal-send-title').html('Action: ' + action.name);
    $('#modal-send-description').html('You are about to send the action <b>' + action.name + '</b> for a cost of <b>' + action.cost + '</b> credits. Continue?');
    $('#modal-send').modal('show');
}

function handleInfoLink(linkId) {
    // info_<action_id>_<action_code>
    var parts = linkId.split("_");
    parts.shift();
    var actionId = parts[0];
    parts.shift();
    var actionCode = parts.join("_");
    $('#modal-send-title').html();
    showInfoDialog(actionCode);
}

function showInfoDialog(actionCode) {
    var action = actions[actionCode];
    $('#modal-info-title').html(action.name);
    $('#modal-info-description').html(action.description);
    $('#modal-info').modal("show");
}

function alertSuccess(msg, global = false) {
    newAlert('success', msg);
}

function alertError(msg, global = false) {
    newAlert('danger', msg);
}

function newAlert (type, message, global = false) {
    var id = "alert-area";
    if (global) { id = "alert-area-global"; }
    $("#" + id).append($('<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert"><span>' + message + '</span><button type="button" class="close" data-dismiss="alert" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div>'));
    setTimeout(function() {
        $(".alert").alert('close');
    }, 4000);
}

function getGameActions(game_id) {
    getRequest("?action=get_actions&game_id=" + game_id + "&page=" + current_page + "&action_type_id=" + current_type_id, getGameActionsCallback);
}

function getNextActions() {
    setNext(false);
    current_page += 1;
    getGameActions(current_game_id);
}

function getPrevActions() {
    if(current_page < 2) {
        return;
    }
    setPrev(false);
    current_page -= 1;
    getGameActions(current_game_id);
}

function getGameActionsCallback(response) {
    var game_id = response.game_id;
    var hasPrevActions = response.has_prev_actions;
    var hasNextActions = response.has_next_actions;
    var types = response.types;
    $('#actions').html("");
    response.actions.forEach(action => {
        var cost = action.cost;
        var action_code = action.action_code;
        actions[action_code] = action;
        var rowHtml = '<tr> <td>' + action.name + ' <a id="info_' + action.id + '_' + action_code + '" class="info-link" href="#">[info]</a></td> <td>' + cost + '</td> <td><button id="send_' + action.id + '_' + action_code + '" type="button" class="send-button btn btn-xs btn-success">Send</button></td> </tr>';
        $('#actions').append(rowHtml);
    });
    setPrev(hasPrevActions);
    setNext(hasNextActions);
    handleTypeLoading(types);
}

function setPrev(enabled) {
    if(enabled) {
        $('#pagination_prev').removeClass('disabled');
        $('#pagination_prev').prop('disabled', false);
    } else {
        $('#pagination_prev').addClass('disabled');
        $('#pagination_prev').prop('disabled', true);
    }
}

function setNext(enabled) {
    if(enabled) {
        $('#pagination_next').removeClass('disabled');
        $('#pagination_next').prop('disabled', false);
    } else {
        $('#pagination_next').addClass('disabled');
        $('#pagination_next').prop('disabled', true);
    }
}

function sendAction(game_id, action, cost) {
    getRequest("?action=send_action&game_id=" + game_id + "&action_name=" + action + "&cost=" + cost, sendActionCallback);
}

function sendActionCallback(response) {
    if(response.successful) {
        alertSuccess(response.message);
    } else {
        alertError(response.message);
    }
    refresh();
}

function refresh() {
    getRequest("?action=refresh", refreshCallback);
}

function refreshCallback(response) {
    var extTitle = response.title;
    var profilePicture = response.user.profile_picture;
    var credits = response.user.credits;
    var gameName = response.game.name;
    var gameId = response.game.id;

    $('#ext_title').html(extTitle);
    $('#profile_picture').attr('src', profilePicture);
    $('#credit_count').html(credits);
    $('#game_name').html(gameName);
    $('#game_name_main').html(gameName);
    current_game_id = gameId;
    $('#loading-spinner').hide();
    $('#landing').hide();
    $('#authed').show();
    getGameActions(current_game_id);
}

function handleTypeLoading(types) {
    var row = '<a class="dropdown-item w-100 type-selection" href="#" id="0">All</a>';
    $('#typeMenu').html(row);
    types.forEach(typeObj => {
        $('#typeMenu a:last').after('<a class="dropdown-item w-100 type-selection" href="#" id="' + typeObj.id + '">' + typeObj.name + '</a>');
    });
}

function getRequest(params, callback) {
    $.get({
        url: base_api + params, 
        type: 'GET',
        headers: {
            "x-extension-jwt": panel_token,
            accept: "application/json",
            version: version,
            platform: platform,
        },
        success: function(data){
            if (data.successful) {
                callback(data.message);
            } else {
                alertError(data.message);
            }
        },
        error: function(data) {
            alertError("Server returned an invalid response!", true);
        }
    });
}

// source: https://stackoverflow.com/questions/4656843/jquery-get-querystring-from-url
function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function getPlatform(queryStringArr) {
	if(queryStringArr.hasOwnProperty("platform")) {
		switch(queryStringArr["platform"]) {
			case "mobile":
				return "mobile";
			case "web":
				return "web";
			default:
				return "unknown";
		}
	} else {
		return "not_set";
	}
}