/**
 * Additive realtime layer for the Community area.
 *
 * NOTE: This file does NOT change any existing GitHub-backed storage or PeerJS
 * behaviour. It only adds an instant browser-to-browser (and app-to-browser)
 * transport on top of Lovable Cloud Realtime broadcast, so that:
 *   - chat messages arrive instantly in every open tab / browser / account
 *   - audio + video calls can be established directly between websites
 *   - the Electron app can join the same channel (see /api/public/community)
 */
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const COMMUNITY_CHANNEL = "zyraxon-community";

export type CommunityIdentity = {
  userId: string;
  username: string;
  avatarUrl?: string;
};

type Handlers = {
  onChat?: (message: any) => void;
  onPeers?: (peers: { id: string; username: string; stream: MediaStream }[]) => void;
  onPresence?: (users: string[]) => void;
  onCallers?: (users: string[]) => void;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
};

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class CommunityRealtime {
  readonly peerId = randomId();
  private channel: RealtimeChannel | null = null;
  private identity: CommunityIdentity;
  private handlers: Handlers;
  private connections = new Map<string, RTCPeerConnection>();
  private remote = new Map<string, { username: string; stream: MediaStream }>();
  private pendingIce = new Map<string, RTCIceCandidateInit[]>();
  private localStream: MediaStream | null = null;
  private inCall = false;

  constructor(identity: CommunityIdentity, handlers: Handlers) {
    this.identity = identity;
    this.handlers = handlers;
  }

  async connect() {
    if (this.channel) return;
    const channel = supabase.channel(COMMUNITY_CHANNEL, {
      config: { broadcast: { self: false }, presence: { key: this.peerId } },
    });
    this.channel = channel;

    channel.on("broadcast", { event: "chat" }, ({ payload }) => {
      this.handlers.onChat?.(payload?.message ?? payload);
    });
    channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      void this.onSignal(payload);
    });
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, any[]>;
      const all = Object.values(state).flat() as any[];
      this.handlers.onPresence?.(all.map((p) => p.username).filter(Boolean));
      this.handlers.onCallers?.(all.filter((p) => p.inCall).map((p) => p.username).filter(Boolean));
    });

    await new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ ...this.identity, peerId: this.peerId, inCall: this.inCall });
          resolve();
        }
      });
    });
  }

  private send(event: string, payload: any) {
    this.channel?.send({ type: "broadcast", event, payload });
  }

  sendChat(message: any) {
    this.send("chat", { message, from: this.peerId });
  }

  // ---- WebRTC mesh ----------------------------------------------------

  private emitPeers() {
    this.handlers.onPeers?.(
      Array.from(this.remote.entries()).map(([id, v]) => ({ id, username: v.username, stream: v.stream })),
    );
  }

  private createConnection(peerId: string, username: string) {
    const existing = this.connections.get(peerId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    this.connections.set(peerId, pc);

    this.localStream?.getTracks().forEach((track) => pc.addTrack(track, this.localStream!));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send("signal", { kind: "ice", to: peerId, from: this.peerId, candidate: event.candidate.toJSON() });
      }
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      this.remote.set(peerId, { username, stream });
      this.emitPeers();
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) this.dropPeer(peerId);
    };
    return pc;
  }

  private dropPeer(peerId: string) {
    this.connections.get(peerId)?.close();
    this.connections.delete(peerId);
    this.remote.delete(peerId);
    this.pendingIce.delete(peerId);
    this.emitPeers();
  }

  private async onSignal(payload: any) {
    if (!payload || payload.from === this.peerId) return;
    const from = payload.from as string;

    if (payload.kind === "join") {
      if (!this.inCall) return;
      // Existing participants initiate the offer towards the newcomer.
      const pc = this.createConnection(from, payload.username || "peer");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.send("signal", { kind: "offer", to: from, from: this.peerId, username: this.identity.username, sdp: offer });
      return;
    }

    if (payload.to !== this.peerId) return;

    if (payload.kind === "offer") {
      if (!this.inCall) return;
      const pc = this.createConnection(from, payload.username || "peer");
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await this.flushIce(from, pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send("signal", { kind: "answer", to: from, from: this.peerId, username: this.identity.username, sdp: answer });
    } else if (payload.kind === "answer") {
      const pc = this.connections.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      await this.flushIce(from, pc);
    } else if (payload.kind === "ice") {
      const pc = this.connections.get(from);
      if (!pc || !pc.remoteDescription) {
        const list = this.pendingIce.get(from) ?? [];
        list.push(payload.candidate);
        this.pendingIce.set(from, list);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch {
        /* ignore */
      }
    } else if (payload.kind === "leave") {
      this.dropPeer(from);
    }
  }

  private async flushIce(peerId: string, pc: RTCPeerConnection) {
    const list = this.pendingIce.get(peerId);
    if (!list) return;
    for (const candidate of list) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        /* ignore */
      }
    }
    this.pendingIce.delete(peerId);
  }

  async startCall(stream: MediaStream) {
    await this.connect();
    this.localStream = stream;
    this.inCall = true;
    await this.channel?.track({ ...this.identity, peerId: this.peerId, inCall: true });
    this.send("signal", { kind: "join", from: this.peerId, username: this.identity.username });
  }

  endCall() {
    this.send("signal", { kind: "leave", from: this.peerId });
    this.connections.forEach((pc) => pc.close());
    this.connections.clear();
    this.remote.clear();
    this.pendingIce.clear();
    this.localStream = null;
    this.inCall = false;
    void this.channel?.track({ ...this.identity, peerId: this.peerId, inCall: false });
    this.emitPeers();
  }

  disconnect() {
    if (this.inCall) this.endCall();
    if (this.channel) supabase.removeChannel(this.channel);
    this.channel = null;
  }
}
