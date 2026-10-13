# Mesh PeerServer extensions

This directory keeps the upstream PeerServer source intact and adds a small
runtime wrapper for same-room peer discovery.

Build the cloned PeerServer first:

```powershell
npm install
npm run build
node mesh-server.mjs
```

The server exposes the normal PeerJS signaling endpoint at `/peerjs` and adds:

- `POST /peerjs/mesh/random-peer`
- `POST /peerjs/mesh/release-peer`
- `GET /peerjs/mesh/status`

The server only tracks connected peer IDs and short-lived matchmaking leases.
Audio remains browser-to-browser through WebRTC and is never sent to this
server.
