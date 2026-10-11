const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');

function fixture() {
    const storage = new Map(), calls = [];
    const chain = new Proxy({}, {get: (_, key) => key === 'ready' ? () => {} : () => chain});
    const context = vm.createContext({document: {}, window: {}, $: () => chain,
        URLSearchParams, AbortController, crypto: webcrypto, console, Uint8Array,
        sessionStorage: {getItem: key => storage.get(key) || null,
            setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key)},
        setTimeout: () => 1, clearTimeout: () => {}, atob,
        fetch: async (url, options) => {
            calls.push({url, options});
            return context.reply(url, options);
        }});
    context.reply = async () => ({status: 200, ok: true,
        json: async () => ({successful: true, message: {successful: true, message: 'accepted'}})});
    vm.runInContext(fs.readFileSync('frontend/script.js', 'utf8'), context);
    vm.runInContext("panel_token='jwt-fixture';helix_token='helix-fixture';identityScope='game-action:44338537:123';platform='web';refresh=()=>Promise.resolve();", context);
    return {context, calls, storage};
}

(async () => {
    let {context:c,calls,storage} = fixture();
    await c.apiRequest('GET', {action:'get_actions',game_id:1,page:1});
    assert.equal(calls.length, 1);
    assert(!calls[0].url.includes('fixture'));
    assert.equal(calls[0].options.headers['X-Extension-Jwt'], 'jwt-fixture');
    assert.equal(calls[0].options.headers['X-Helix-Token'], 'helix-fixture');
    assert.equal(calls[0].options.credentials, 'omit');
    assert.equal(calls[0].options.redirect, 'error');
    calls.length=0;
    await c.apiRequest('POST', {action:'refresh'});
    assert.equal(calls[0].url, 'https://burkeblack.tv/extensions/game_interaction/api.php');
    assert.equal(calls[0].options.body, 'action=refresh');
    calls.length=0;
    let resolve;
    c.reply = () => new Promise(r => {resolve=r;});
    const first = c.sendAction(1,1,2);
    await c.sendAction(1,1,2);
    assert.equal(calls.length,1,'double click dispatched twice');
    const sent = new URLSearchParams(calls[0].options.body);
    assert.match(sent.get('request_id'), /^[a-f0-9]{32}$/);
    assert.equal(sent.get('cost'),'2');
    assert.equal(storage.size,1,'intent not stored before dispatch');
    resolve({status:200,ok:true,json:async()=>({successful:true,message:{successful:true,message:'accepted'}})});
    await first;
    assert.equal(storage.size,0,'accepted action remained pending');
    for (const status of [408,409,500,502,503,504]) {
        ({context:c,calls,storage}=fixture());
        c.reply=async()=>({status,ok:false,json:async()=>({successful:false,message:'uncertain'})});
        await c.sendAction(1,1,2);
        await c.sendAction(1,1,2);
        assert.equal(calls.length,1,'uncertain request retried');
        assert.equal(storage.size,1,'uncertain intent lost');
    }
    for (const mode of ['network','invalid-json']) {
        ({context:c,calls,storage}=fixture());
        c.reply=async()=>{if(mode==='network')throw new Error('offline');return {status:200,ok:true,json:async()=>{throw new Error('bad JSON');}};};
        await c.sendAction(1,1,2);await c.sendAction(1,1,2);
        assert.equal(calls.length,1);assert.equal(storage.size,1);
    }
    for (const status of [200,400,403,405]) {
        ({context:c,calls,storage}=fixture());
        c.reply=async()=>({status,ok:status===200,json:async()=>({successful:false,message:'denied before commit'})});
        await c.sendAction(1,1,2);
        assert.equal(storage.size,0,'definite denial held unnecessarily');
    }
    ({context:c,calls,storage}=fixture());
    c.sessionStorage.setItem=()=>{throw new Error('blocked');};
    await c.sendAction(1,1,2);
    assert.equal(calls.length,0,'sent without durable browser intent');
    console.log('Request contracts passed: header auth, form POST, random IDs, duplicate clicks, uncertain outcomes, denials and blocked storage.');
})().catch(error=>{console.error(error);process.exitCode=1;});
