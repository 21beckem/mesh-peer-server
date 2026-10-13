import express from "express";
import cors from "cors";
import { PeerServer } from "./dist/module.mjs";
import { MeshMatchmaker } from "./mesh-matchmaker.mjs";

const port = Number(process.env.PORT || 9000);
const host = process.env.HOST || "0.0.0.0";
const peerPath = process.env.PEER_PATH || "/peerjs";
const leaseMs = Number(process.env.MESH_LEASE_MS || 30_000);
const meshPath = peerPath === "/" ? "/mesh" : `${peerPath.replace(/\/$/, "")}/mesh`;
const matchmaker = new MeshMatchmaker({ leaseMs });

const peerServer = PeerServer({
  host,
  port,
  path: peerPath,
  key: process.env.PEER_KEY || "peerjs",
  allow_discovery: false,
  corsOptions: { origin: true },
});

peerServer.use(express.json({ limit: "32kb" }));
peerServer.use(cors({ origin: true }));

peerServer.post(`${meshPath}/random-peer`, (req, res) => {
  try {
    const requesterId = String(req.body?.requesterId || "");
    const excluded = Array.isArray(req.body?.excluded)
      ? req.body.excluded.map(String)
      : [];
    const result = matchmaker.requestPeer(requesterId, excluded);
    if (!result) return res.status(204).end();
    return res.json(result);
  } catch (error) {
    const status = Number(error?.statusCode) || 400;
    return res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

peerServer.post(`${meshPath}/release-peer`, (req, res) => {
  const released = matchmaker.releaseLease(
    String(req.body?.leaseId || ""),
    String(req.body?.requesterId || ""),
  );
  return res.json({ released });
});

peerServer.get(`${meshPath}/status`, (_req, res) => res.json(matchmaker.snapshot()));

peerServer.on("connection", (client) => matchmaker.addClient(client));
peerServer.on("disconnect", (client) => matchmaker.removeClient(client));

console.log(`Started Mesh PeerServer on ${host}:${port}${peerPath}`);
console.log(`Matchmaking endpoint: ${meshPath}/random-peer`);
