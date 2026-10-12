const version = 5;
const base_api = "https://burkeblack.tv/extensions/game_interaction/api.php";

var current_page = 1;
var current_game_id = 0;
var current_type_id = 0;
var panel_token;
var helix_token;
var actions = [];

var platform = 'not_set';
var identityScope = '';
var authGeneration = 0;
var actionInFlight = false;
var pendingAction = null;

function authorize(auth) {
    authGeneration += 1;
    panel_token = auth.token;
    helix_token = auth.helixToken;
    try {
        const encoded = auth.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
        // This only chooses the UI. The backend verifies both credentials.
        if (!/^[0-9]{1,20}$/.test(payload.user_id || '') || !helix_token) throw new Error('Identity not shared');
        identityScope = 'game-action:' + auth.channelId + ':' + payload.user_id;
        try { pendingAction = JSON.parse(sessionStorage.getItem(identityScope) || 'null'); }
        catch (_) { pendingAction = {unreadable: true}; }
        showAuthing();
        showPendingAction();
        refresh();
    } catch (_) {
        identityScope = '';
        pendingAction = null;
        showAuth();
    }
}

$(document).ready(function() {
    platform = getPlatform(getUrlVars());
    window.Twitch.ext.onAuthorized(authorize);
    $('#review-pending-action').click(function() {
        if (actionInFlight || !identityScope) return;
        try { sessionStorage.removeItem(identityScope); } catch (_) { return; }
        pendingAction = null;
        showPendingAction();
        refresh();
    });
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
        if (!action) return;
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
        handleTypeSelected($(this).attr("id"), $(this).text()); 
    });
});

function initializeConnector() {
    window.Twitch.ext.actions.requestIdShare();
}

function handleTypeSelected(typeId, typeName) {
    $('#dropdownMenuButton').text(typeName);
    current_page = 1;
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
    if (!action || pendingAction || actionInFlight) return;
    $('#modal-send-title').text('Action: ' + action.name);
    $('#modal-send-description').text('Send ' + action.name + ' for ' + action.cost + ' credits?');
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
    if (!action) return;
    $('#modal-info-title').text(action.name);
    $('#modal-info-description').text(action.description);
    $('#modal-info').modal("show");
}

function alertSuccess(msg, global = false) {
    newAlert('success', msg, global);
}

function alertError(msg, global = false) {
    newAlert('danger', msg, global);
}

function newAlert(type, message, global = false) {
    const area = global ? '#alert-area-global' : '#alert-area';
    const alert = $('<div class="alert alert-dismissible fade show" role="alert"></div>').addClass('alert-' + type);
    alert.append($('<span></span>').text(String(message || 'Request unavailable.')));
    alert.append('<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>');
    $(area).append(alert);
    if (type === 'success') setTimeout(function() { alert.alert('close'); }, 4000);
}

function getGameActions(game_id) {
    return apiRequest('GET', {action: 'get_actions', game_id, page: current_page, action_type_id: current_type_id}, getGameActionsCallback);
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
    actions = [];
    response.actions.forEach(action => {
        const code = String(action.action_code);
        const id = String(action.id);
        if (!/^[0-9]+$/.test(code) || !/^[0-9]+$/.test(id)) return;
        actions[code] = action;
        const row = $('<tr></tr>');
        const label = $('<td></td>').text(action.name + ' ');
        label.append($('<a class="info-link" href="#">[info]</a>').attr('id', 'info_' + id + '_' + code));
        row.append(label, $('<td></td>').text(action.cost), $('<td></td>').append(
            $('<button type="button" class="send-button btn btn-xs btn-success">Send</button>').attr('id', 'send_' + id + '_' + code)));
        $('#actions').append(row);
    });
    showPendingAction();
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

function showPendingAction() {
    $('.send-button, #send-confirm').prop('disabled', actionInFlight || !!pendingAction);
    $('#pending-action').toggle(!!pendingAction);
    $('#review-pending-action').prop('disabled', actionInFlight);
    $('#pending-action-message').text(actionInFlight ? 'Sending action. Please wait.' :
        'The previous action may have run. Check the game and your credits before sending another. Refreshing will not resend it.');
}

async function sendAction(game_id, action, cost) {
    if (actionInFlight || pendingAction || !identityScope) return;
    const scope = identityScope;
    const bytes = new Uint8Array(16);
    const intent = {action: 'send_action', game_id, action_name: action, cost};
    try {
        crypto.getRandomValues(bytes);
        intent.request_id = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
        sessionStorage.setItem(scope, JSON.stringify(intent));
        if (sessionStorage.getItem(scope) !== JSON.stringify(intent)) throw new Error('Storage unavailable');
    } catch (_) {
        alertError('This browser cannot retain the pending request. Allow extension storage before sending actions.');
        return;
    }
    pendingAction = intent;
    actionInFlight = true;
    showPendingAction();
    const result = await apiRequest('POST', intent);
    // Network/server failures and duplicate reservations can have an unknown
    // delivery outcome. Keep the intent; never resend it automatically.
    const confirmed = result && [200, 400, 401, 403, 404, 405, 413, 415, 422, 429].includes(result.status);
    if (confirmed) {
        try { sessionStorage.removeItem(scope); } catch (_) { /* keep review state if persistence fails */ }
    }
    actionInFlight = false;
    if (scope !== identityScope) { showPendingAction(); return; }
    if (confirmed) {
        try { pendingAction = JSON.parse(sessionStorage.getItem(scope) || 'null'); } catch (_) { /* review required */ }
    }
    showPendingAction();
    if (result && result.data.successful) alertSuccess(result.data.message.message || 'Action accepted.');
    refresh();
}

function refresh() {
    return apiRequest('POST', {action: 'refresh'}, refreshCallback);
}

function refreshCallback(response) {
    var extTitle = response.title;
    var profilePicture = response.user.profile_picture;
    var credits = response.user.credits;
    var gameName = response.game.name;
    var gameId = response.game.id;

    $('#ext_title').text(extTitle);
    $('#user_profile_picture').attr('src', profilePicture);
    $('#credit_count').text(credits);
    $('#game_name').text(gameName);
    $('#game_name_main').text(gameName);
    current_game_id = gameId;
    $('#loading-spinner').hide();
    $('#landing').hide();
    $('#authed').show();
    getGameActions(current_game_id);
}

function handleTypeLoading(types) {
    $('#typeMenu').empty().append('<a class="dropdown-item w-100 type-selection" href="#" id="0">All</a>');
    types.forEach(type => {
        if (/^[0-9]+$/.test(String(type.id))) $('#typeMenu').append(
            $('<a class="dropdown-item w-100 type-selection" href="#"></a>').attr('id', type.id).text(type.name));
    });
}

async function apiRequest(method, fields, callback) {
    const generation = authGeneration;
    const params = new URLSearchParams(fields);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const response = await fetch(base_api + (method === 'GET' ? '?' + params.toString() : ''), {
            method, credentials: 'omit', cache: 'no-store', redirect: 'error', signal: controller.signal,
            headers: {'X-Extension-Jwt': panel_token, 'X-Helix-Token': helix_token,
                'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded',
                'Version': String(version), 'Platform': platform},
            body: method === 'POST' ? params.toString() : undefined
        });
        const data = await response.json();
        if (!data || typeof data.successful !== 'boolean' || typeof data.message === 'undefined') throw new Error('Invalid response');
        if (generation === authGeneration) {
            if (response.ok && data.successful && callback) callback(data.message);
            else if (!response.ok || !data.successful) {
                $('#loading-spinner').hide();
                if (fields.action !== 'send_action' || response.status < 500 && response.status !== 409)
                    alertError(typeof data.message === 'string' ? data.message : 'Request unavailable.', true);
            }
        }
        return {status: response.status, data};
    } catch (_) {
        if (generation === authGeneration) {
            $('#loading-spinner').hide();
            if (fields.action !== 'send_action') alertError('Unable to load game interaction. Please try Refresh again.', true);
        }
        return null;
    } finally { clearTimeout(timeout); }
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
