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
The archive contains only hosted frontend assets, with `index.html` at its root.
It excludes developer metadata and credentials. A source push does not publish
this extension to Twitch.

The existing developer metadata identifies **Burke's Game Interaction**, client
ID `46j5wbrm3pdnwprnsvcomfq3p6b07m`. Revision4 here is the client protocol revision;
it does not choose or change the Twitch Developer Console release version.
Before publishing, deploy the Go/website game API migration and securely configure
its existing client ID and extension secret in
`KRAKEN_LEGACY_WEBSITE_GAME_INTERACTION_JSON`. The setting is independent of
Burke's Booty. Credentials are currently unset; the new API fails closed until
configured. Keep the existing hosted assets until the backend and configuration
are ready. Publication and real signed game effects still need verification.
