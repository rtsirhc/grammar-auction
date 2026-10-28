const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ROOT = path.resolve(__dirname, '..');
function createServer() {
  const peers = new Map(), connections = new Map();
  const push = (peer, message) => {
    if (peer.stream) peer.stream.write('data: ' + JSON.stringify(message) + '\n\n');
    else { peer.queue.push(message); if (peer.queue.length > 200) peer.queue.shift(); }
  };
  function removePeer(id) {
    const peer = peers.get(id); if (!peer) return;
    for (const [cid, pair] of connections) if (pair.includes(id)) {
      const other = peers.get(pair.find(value => value !== id));
      if (other) push(other, {type:'close', connection:cid});
      connections.delete(cid);
    }
    if (peer.stream) peer.stream.end(); peers.delete(id);
  }
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const json = (status, body) => { res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
    if (url.pathname === '/local/events' && req.method === 'GET') {
      const peer = peers.get(url.searchParams.get('id'));
      if (!peer || peer.token !== url.searchParams.get('token')) return json(403, {error:'unauthorized'});
      res.writeHead(200, {'Content-Type':'text/event-stream', 'Cache-Control':'no-store', 'Connection':'keep-alive'});
      res.write(': connected\n\n');
      if (peer.stream) peer.stream.end(); peer.stream = res; peer.lastSeen = Date.now();
      for (const message of peer.queue.splice(0)) push(peer, message);
      req.on('close', () => { if (peer.stream === res) { peer.stream = null; peer.lastSeen = Date.now(); } }); return;
    }
    if (url.pathname.startsWith('/local/') && req.method === 'POST') {
      // Browsers on unrelated websites may not control a classroom server.
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) return json(403, {error:'invalid-origin'});
      let raw = ''; try {
        for await (const chunk of req) { raw += chunk; if (raw.length > 65536) { json(413,{error:'too-large'}); return; } }
        const data = JSON.parse(raw);
        if (!/^[\w-]{1,100}$/.test(data.id || '') || !/^[a-f0-9]{48}$/.test(data.token || '')) return json(400,{error:'invalid-session'});
        if (url.pathname === '/local/register') {
          const prior = peers.get(data.id);
          if (prior && prior.token !== data.token) {
            if (prior.stream) return json(409, {error:'unavailable-id'});
            removePeer(data.id);
          }
          if (!peers.has(data.id)) peers.set(data.id, {token:data.token, queue:[], stream:null, lastSeen:Date.now()});
          return json(200, {});
        }
        const sender = peers.get(data.id);
        if (!sender || sender.token !== data.token) return json(403, {error:'unauthorized'});
        sender.lastSeen = Date.now();
        if (url.pathname === '/local/connect') {
          const target = peers.get(data.destination);
          if (!target || !target.stream) return json(404,{error:'peer-unavailable'});
          if (!/^[a-f0-9]{48}$/.test(data.connection || '') || connections.has(data.connection)) return json(400,{error:'invalid-connection'});
          connections.set(data.connection, [data.id, data.destination]);
          push(target, {type:'connection', connection:data.connection}); push(sender, {type:'open', connection:data.connection});
        } else if (url.pathname === '/local/send' || url.pathname === '/local/close') {
          const pair = connections.get(data.connection);
          if (!pair || !pair.includes(data.id)) return json(404,{error:'connection-closed'});
          const other = peers.get(pair.find(id => id !== data.id));
          if (other) push(other, {type:url.pathname.endsWith('send') ? 'data' : 'close', connection:data.connection, data:data.data});
          if (url.pathname.endsWith('close')) connections.delete(data.connection);
        } else if (url.pathname === '/local/destroy') removePeer(data.id);
        else return json(404,{error:'not-found'});
        return json(200, {});
      } catch (_) { if (!res.headersSent) json(400,{error:'invalid-request'}); return; }
    }
    if (!['GET','HEAD'].includes(req.method)) return json(405,{error:'method-not-allowed'});
    if (url.pathname === '/LOCAL.md') {
      res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'}); return res.end(fs.readFileSync(path.join(ROOT,'LOCAL.md')));
    }
    const files = {'/':'index.html', '/index.html':'index.html', '/grammar-auction.html':'grammar-auction.html', '/offline.html':'offline.html', '/teacher-bakery-guide.html':'teacher-bakery-guide.html'};
    if (url.pathname === '/sw.js') { res.writeHead(404); return res.end(); }
    if (!files[url.pathname]) return json(404,{error:'not-found'});
    let html = fs.readFileSync(path.join(ROOT, files[url.pathname]), 'utf8');
    const addresses = Object.values(os.networkInterfaces()).flat().filter(info => info && info.family === 'IPv4' && !info.internal).map(info => info.address);
    const address = addresses.find(ip => ip.startsWith('192.168.')) || addresses.find(ip => ip.startsWith('10.')) || addresses[0] || 'localhost';
    const shareOrigin = /^localhost:|^127\.0\.0\.1:/.test(req.headers.host || '') ? 'http://' + address + ':' + server.address().port : 'http://' + req.headers.host;
    html = html.replace('</style>', fs.readFileSync(path.join(__dirname,'halloween.css'),'utf8') + '</style>');
    html = html.replace('<script>', '<script>\nwindow.GRAMMAR_RUSH_LOCAL = true; window.GRAMMAR_RUSH_LOCAL_ORIGIN = ' + JSON.stringify(shareOrigin) + ';\n' + fs.readFileSync(path.join(__dirname,'transport.js'),'utf8') + '\n' + fs.readFileSync(path.join(__dirname,'halloween.js'),'utf8'));
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'}); res.end(req.method === 'HEAD' ? '' : html);
  });
  const heartbeat = setInterval(() => {
    for (const [id, peer] of peers) {
      if (peer.stream) peer.stream.write(': heartbeat\n\n');
      else if (Date.now() - peer.lastSeen > 120000) removePeer(id);
    }
  }, 15000);
  heartbeat.unref(); server.on('close', () => { clearInterval(heartbeat); for (const id of peers.keys()) removePeer(id); });
  return server;
}
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const server = createServer();
  server.on('error', error => { console.error('No se pudo iniciar:', error.message); process.exitCode = 1; });
  server.listen(port, '0.0.0.0', () => {
    console.log('\nGRAMMAR RUSH · RED LOCAL\nMaestro: http://localhost:' + port + '/?role=host');
    for (const entries of Object.values(os.networkInterfaces())) for (const info of entries || []) if (info.family === 'IPv4' && !info.internal) console.log('Alumnos: http://' + info.address + ':' + port + '/?role=client');
    console.log('\nConecta los dispositivos al mismo Wi-Fi/hotspot. No se necesita internet.\nCtrl+C para cerrar.');
    if (process.argv.includes('--open')) {
      const {spawn} = require('node:child_process');
      const url = 'http://localhost:' + port + '/?role=host';
      const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
      const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
      const child = spawn(command, args, {stdio:'ignore'});
      child.on('error', () => console.log('Abre manualmente la dirección Maestro en tu navegador.'));
      child.unref();
    }
  });
}
module.exports = {createServer};
