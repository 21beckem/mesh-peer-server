// @ts-nocheck
import { randomUUID } from "node:crypto";

const DEFAULT_LEASE_MS = 30_000;

export class MeshMatchmaker {
  constructor({ leaseMs = DEFAULT_LEASE_MS } = {}) {
    this.leaseMs = leaseMs;
    this.clients = new Map();
    this.leases = new Map();
  }

  addClient(client) {
    this.clients.set(client.getId(), {
      client,
      connectedAt: Date.now(),
      lastSeenAt: Date.now(),
    });
  }

  removeClient(clientOrId) {
    const id = typeof clientOrId === "string" ? clientOrId : clientOrId.getId();
    this.clients.delete(id);
    for (const [leaseId, lease] of this.leases) {
      if (lease.requesterId === id || lease.peerId === id) this.leases.delete(leaseId);
    }
  }

  touch(peerId) {
    const entry = this.clients.get(peerId);
    if (entry) entry.lastSeenAt = Date.now();
  }

  isConnected(peerId) {
    return this.clients.has(peerId);
  }

  cleanupExpiredLeases(now = Date.now()) {
    for (const [leaseId, lease] of this.leases) {
      if (lease.expiresAt <= now) this.leases.delete(leaseId);
    }
  }

  leasedPeerIds(now = Date.now()) {
    this.cleanupExpiredLeases(now);
    const ids = new Set();
    for (const lease of this.leases.values()) {
      ids.add(lease.requesterId);
      ids.add(lease.peerId);
    }
    return ids;
  }

  requestPeer(requesterId, excluded = []) {
    this.cleanupExpiredLeases();
    if (!this.isConnected(requesterId)) {
      const error = new Error("Requester is not connected to the PeerJS server");
      error.statusCode = 403;
      throw error;
    }

    const excludedIds = new Set([requesterId, ...excluded]);
    const leased = this.leasedPeerIds();
    const candidates = [...this.clients.keys()].filter(
      (id) => !excludedIds.has(id) && !leased.has(id),
    );
    if (!candidates.length) return null;

    const peerId = candidates[Math.floor(Math.random() * candidates.length)];
    const leaseId = randomUUID();
    this.leases.set(leaseId, {
      leaseId,
      requesterId,
      peerId,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.leaseMs,
    });
    return { peerId, leaseId, expiresIn: this.leaseMs };
  }

  releaseLease(leaseId, requesterId) {
    const lease = this.leases.get(leaseId);
    if (!lease || lease.requesterId !== requesterId) return false;
    this.leases.delete(leaseId);
    return true;
  }

  snapshot() {
    this.cleanupExpiredLeases();
    return {
      connectedPeers: [...this.clients.keys()],
      leases: [...this.leases.values()].map(({ leaseId, requesterId, peerId, expiresAt }) => ({
        leaseId,
        requesterId,
        peerId,
        expiresAt,
      })),
    };
  }
}
