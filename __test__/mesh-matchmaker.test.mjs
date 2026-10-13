// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { MeshMatchmaker } from "../mesh-matchmaker.mjs";

const client = (id) => ({ getId: () => id });

test("selects a connected peer while excluding the requester", () => {
  const matchmaker = new MeshMatchmaker();
  matchmaker.addClient(client("a"));
  matchmaker.addClient(client("b"));
  const result = matchmaker.requestPeer("a");
  assert.equal(result?.peerId, "b");
  assert.ok(result?.leaseId);
});

test("does not return a leased peer twice", () => {
  const matchmaker = new MeshMatchmaker();
  matchmaker.addClient(client("a"));
  matchmaker.addClient(client("b"));
  matchmaker.addClient(client("c"));
  const first = matchmaker.requestPeer("a");
  const second = matchmaker.requestPeer("c");
  assert.equal(first?.peerId, "b");
  assert.equal(second, null);
});

test("removes leases when a peer disconnects", () => {
  const matchmaker = new MeshMatchmaker();
  matchmaker.addClient(client("a"));
  matchmaker.addClient(client("b"));
  matchmaker.requestPeer("a");
  matchmaker.removeClient("b");
  assert.equal(matchmaker.snapshot().leases.length, 0);
});
