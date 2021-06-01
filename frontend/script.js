const base_api = "https://burkeblack/extensions/game_interaction/api.php";
var current_page = 1;
var current_game_id = 0;
var panel_token;

window.Twitch.ext.onAuthorized(function(auth) {
    panel_token = auth.token;
    var sections = auth.token.split('.');
    payload = JSON.parse(window.atob(sections[1]));
    if(payload.user_id) {
        showAuthed();
    } else {
        showAuth();
    }
});

function initializeConnector() {
    window.Twitch.ext.actions.requestIdShare();
}

function showAuth() {
    $('#authed').hide();
    $('#login-button').show();
    $('#loading-spinner').hide();
    $('#auth').show();
}

function showAuthed() {
    $('#login-button').hide();
    $('#loading-spinner').show();
}

function showInfoDialog(title, description) {
    $('#modal-info-title').html(title);
    $('#modal-info-description').html(description);
    $('#modal-info').modal("show");
}

function closeInfoDialog() {
    $('#modal-info').modal("hide");
}

function alertSuccess(msg) {
    newAlert('success', msg);
}

function alertError(msg) {
    newAlert('danger', msg);
}

function newAlert (type, message) {
    $("#alert-area").append($('<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert"><span>' + message + '</span><button type="button" class="close" data-dismiss="alert" aria-label="Close"> <span aria-hidden="true">&times;</span> </button> </div>'));
    setTimeout(function() {
        $(".alert").alert('close');
    }, 4000);
}

function getGameActions(game_id) {
    getRequest("?action=get_actions&game_id=" + game_id + "&page=" + current_page, getGameActionsCallback);
}

function getNextActions() {
    current_page += 1;
    getGameActions(current_game_id);
}

function getPrevActions() {
    if(current_page < 2) {
        return;
    }
    current_page -= 1;
    getGameActions(current_game_id);
}

function getGameActionsCallback(response) {
    var game_id = response.game_id;
    var actions = response.actions;
    var hasPrevActions = response.has_prev_actions;
    var hasNextActions = response.has_next_actions;
    $('#actions').html("");
    actions.forEach(action => {
        var name = action.name.replace(/'/g, "\\'");
        var description = action.description.replace(/'/g, "\\'");
        var cost = action.cost;
        var action_code = action.action_code;

        var rowHtml = '<tr> <td>' + action.name + ' <a href="#" onclick="showInfoDialog(\'' + name + '\', \'' + description + '\')">[info]</a></td> <td>' + cost + '</td> <td><button type="button" class="btn btn-xs btn-success" onclick="sendAction(' + game_id + ',\'' + action_code + '\');">Send</button></td> </tr>';
        $('#actions').append(rowHtml);
    });
    setPrev(hasPrevActions);
    setNext(hasNextActions);
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

function sendAction(game_id, action) {
    getRequest("?action=send_action&game_id=" + game_id + "&action_name=" + action, sendActionCallback);
}

function sendActionCallback(response) {
    if(response.successful) {
        alertSuccess(response.message);
    } else {
        alertError(response.message);
    }
}

function refresh() {
    getRequest("?action=refresh", getGameActionsCallback);
}

function refreshCallback(response) {
    var extTitle = response.title;
    var profilePicture = response.user.profile_picture;
    var game = response.game;

    $('#ext_title').html(extTitle);
    $('#profile_picture').attr('src', profilePicture);
    $('#game_name').html(game.name);
    current_game_id = game.id;
    $('#loading-spinner').hide();
    $('#landing').hide();
    $('#authed').show();
}

function getRequest(params, callback) {
    $.get(base_api + params, function(data){
        if (data.successful) {
            callback(data.message);
        } else {
            alertError(data.message);
        }
    });
}