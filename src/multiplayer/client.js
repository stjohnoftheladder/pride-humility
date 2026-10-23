export class MultiplayerClient {
  constructor(endpoint, onMessage, onStatus) {
    this.endpoint = endpoint; this.onMessage = onMessage; this.onStatus = onStatus;
    this.peers = new Map(); this.stopped = true; this.delay = 1000; this.latest = {};
  }
  connect(world, name) {
    this.disconnect(); this.stopped = false; this.world = world; this.name = name;
    this.delay = 1000; this.open();
  }
  open() {
    if (this.stopped) return;
    this.onStatus('connecting');
    let ws;
    try { const url = new URL(this.endpoint); url.searchParams.set('world', this.world); ws = new WebSocket(url); }
    catch { this.onStatus('offline'); return; }
    this.socket = ws;
    ws.onmessage = event => {
      if (this.socket !== ws) return;
      let message; try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'welcome') {
        this.selfId = message.selfId; this.videoEnabled = message.videoEnabled;
        this.peers.clear(); for (const peer of message.peers) this.peers.set(peer.id, peer);
        this.send({ type: 'hello', name: this.name, ...this.latest });
        this.delay = 1000; this.onStatus('connected');
        this.heartbeat = setInterval(() => this.send({ type: 'heartbeat' }), 10_000);
      } else if (message.type === 'peer' && message.peer.id !== this.selfId) this.peers.set(message.peer.id, message.peer);
      else if (message.type === 'leave') this.peers.delete(message.id);
      this.onMessage(message);
    };
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      if (this.socket !== ws) return;
      clearInterval(this.heartbeat); this.socket = null; this.selfId = null; this.peers.clear();
      this.onMessage({ type: 'reset' });
      if (this.stopped) return;
      this.onStatus('reconnecting');
      this.retry = setTimeout(() => this.open(), this.delay);
      this.delay = Math.min(15_000, this.delay * 2);
    };
  }
  update(presence, force = false) {
    this.latest = presence;
    const now = performance.now();
    if (force || now - (this.lastSent ?? 0) > 120) {
      this.lastSent = now; this.send({ type: 'move', ...presence });
    }
  }
  send(message) {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message)); return true;
  }
  disconnect() {
    this.stopped = true; clearTimeout(this.retry); clearInterval(this.heartbeat);
    const ws = this.socket; this.socket = null; ws?.close(1000, 'Left gathering');
    this.peers.clear(); this.selfId = null; this.videoEnabled = false;
    this.onMessage({ type: 'reset' }); this.onStatus('offline');
  }
}
