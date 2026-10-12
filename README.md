# GameInteractionExtension

This extension is used to make user-friendly API calls to BurkeBlack.tv for interacting with various games The Late Shift is playing.

### Change log

##### v3
- allow listing remote endpoints on burkeblack.tv

##### v2
- allow remote changes on name, etc

##### v1
- initial release

##### Client revision 4 (prepared; not a Twitch publication)

Uses the migrated Go API with the Twitch extension JWT and Helix token in
headers. Refresh and game actions use form POST. Catalog requests remain GET.
Every action has a cryptographically random request ID, retained in session
storage before sending. Double clicks are blocked. Uncertain delivery remains
visible after a reload and is never retried automatically; the viewer must
review the game and credits before allowing a new request. API/catalog text is
rendered as text rather than executable HTML. Fetch works with the bundled
jQuery slim build, which does not provide the old AJAX API.

Run `node tests/request-contract.cjs` and `node --check frontend/script.js`.
Preview with `python3 -m http.server 8080 --directory frontend` in the Twitch
Developer Rig or with an isolated mocked Twitch helper and API. Do not use live
game actions for automated tests. Mobile (320px) and desktop (800px) views and
uncertain-delivery recovery were checked in a browser with synthetic responses.

Run `python3 tools/package.py` to produce `dist/game-interaction-client-4.zip`.
The archive contains only hosted frontend assets, with `index.html` and
`config.html` at its root.
It excludes developer metadata and credentials. A source push does not publish
this extension to Twitch.

The existing developer metadata identifies **Burke's Game Interaction**, client
ID `46j5wbrm3pdnwprnsvcomfq3p6b07m`. Revision4 here is the client protocol revision;
it does not choose or change the Twitch Developer Console release version.
The Go/website game API and its existing credential configuration were deployed
and verified on October 12, 2026 (UTC). The credential is held in
`KRAKEN_LEGACY_WEBSITE_GAME_INTERACTION_JSON`, independently of Burke's Booty;
no credential was added to this client package. All 88 backend configuration,
read, and rejected-request checks passed without submitting a game action.
The Twitch metadata currently names this extension **Game Interactions**.

Publish `dist/game-interaction-client-4.zip` through the existing extension in
the Twitch Developer Console. Keep the current hosted package available for
recovery. Publication, signed viewer rendering, and real game effects still
need verification; a source push does not complete that transition.

## Twitch hosting settings

The Twitch Console release number (for example, `0.0.5`) is separate from the
client/API protocol revision `4`. Use the prepared ZIP for the new console
version without changing its protocol header.

- Panel Viewer Path: `index.html`
- Mobile Path: `index.html`
- Config Path: `config.html`
- Panel Height: `500`
- Live Config Path: empty

These paths are relative to the ZIP root: do not prefix them with `frontend/`.
The configuration page makes no backend requests and has no settings to save.
Keep mobile enabled and use this public Privacy Policy URL in Version Details:

https://burkeblack.tv/gameinteractions/privacy-policy.html

After uploading, use Hosted Test to check configuration, Twitch identity sharing,
catalog navigation, and mobile rendering before requesting review. A live game
action requires a running supported game integration; catalog rendering alone
does not verify that effect.

## Privacy notice

Read the [Game Interactions privacy policy](https://burkeblack.tv/gameinteractions/privacy-policy.html) on burkeblack.tv.
