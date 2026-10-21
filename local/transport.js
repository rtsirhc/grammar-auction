// Peer-compatible LAN transport: one event stream per browser, no WebRTC/CDNs.
class LocalEvents {
  constructor() { this.handlers = {}; }
  on(type, fn) { (this.handlers[type] ||= []).push(fn); return this; }
  emit(type, data) { for (const fn of this.handlers[type] || []) fn(data); }
}
class LocalConnection extends LocalEvents {
  constructor(owner, id) { super(); this.owner = owner; this.id = id; this.open = false; }
  send(data) {
    this.pending = (this.pending || Promise.resolve()).then(() => this.owner.request('/local/send', {connection:this.id, data})).catch(error => {
      this.open = false; this.emit('error', error);
      if (error.type === 'unauthorized') this.owner.restart();
    }); }
  close() {
    if (this.closed) return;
    this.closed = true; this.open = false;
    this.owner.request('/local/close', {connection:this.id}).catch(() => {});
    this.emit('close');
  }
}
class LocalPeer extends LocalEvents {
  constructor(id) {
    super(); this.id = id || 'student-' + localIdentity(); this.connections = new Map(); this.destroyed = false;
    this.token = localIdentity(); this.disconnected = false;
    this.start();
  }
  start() {
    this.recovering = true;
    this.request('/local/register', {}).then(() => {
      if (this.destroyed) return;
      this.stream = new EventSource('/local/events?id=' + encodeURIComponent(this.id) + '&token=' + this.token);
      let opened = false;
      this.stream.onopen = () => { this.disconnected = false; this.recovering = false; if (!opened) { opened = true; this.emit('open', this.id); } else this.emit('reconnected'); };
      this.stream.onmessage = event => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connection') {
          const conn = new LocalConnection(this, msg.connection); this.connections.set(conn.id, conn);
          conn.open = true; this.emit('connection', conn);
        } else {
          const conn = this.connections.get(msg.connection); if (!conn) return;
          if (msg.type === 'open') { conn.open = true; conn.emit('open'); }
          if (msg.type === 'data') conn.emit('data', msg.data);
          if (msg.type === 'close') { conn.open = false; conn.emit('close'); this.connections.delete(conn.id); }
          if (msg.type === 'error') conn.emit('error', {type:msg.error});
        }
      };
      this.stream.onerror = () => { this.disconnected = true; this.emit('disconnected'); }; 
    }).catch(error => { this.recovering = false; this.emit('error', error); if (!this.destroyed && error.type !== 'unavailable-id') this.retryTimer = setTimeout(() => this.start(), 2000); });
  }
  request(path, body) {
    return fetch(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...body, id:this.id, token:this.token})})
      .then(async response => { const result = await response.json(); if (!response.ok) throw Object.assign(new Error(result.error), {type:result.error}); return result; });
  }
  connect(destination) {
    const conn = new LocalConnection(this, localIdentity()); this.connections.set(conn.id, conn);
    this.request('/local/connect', {destination, connection:conn.id}).catch(error => conn.emit('error', error)); return conn;
  }
  reconnect() {
    // EventSource resumes short interruptions without creating another stream.
    // HTTP 403 after a server restart closes it permanently: re-register then.
    if (!this.destroyed && this.stream && this.stream.readyState === 2) this.restart();
  }
  restart() {
    if (this.destroyed || this.recovering) return;
    if (this.stream) this.stream.close();
    for (const conn of this.connections.values()) { conn.open = false; conn.emit('close'); }
    this.connections.clear(); this.start();
  }
  destroy() { this.destroyed = true; clearTimeout(this.retryTimer); if (this.stream) this.stream.close(); this.request('/local/destroy', {}).catch(() => {}); }
}
function localIdentity() {
  const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join('');
}
window.Peer = LocalPeer;
