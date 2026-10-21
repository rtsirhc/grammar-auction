const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {createServer} = require('../local/server.cjs');
const server = createServer();
const resources = [], timers = new Set();
let base;
class TestEventSource {
  constructor(url) { this.readyState = 0; this.controller = new AbortController(); resources.push(this); this.read(url); }
  async read(url) {
    try {
      const response = await fetch(base + url, {signal:this.controller.signal});
      if (!response.ok) { this.readyState = 2; this.onerror?.(); return; }
      this.readyState = 1; this.onopen?.();
      let buffer = '';
      for await (const chunk of response.body) {
        buffer += Buffer.from(chunk).toString();
        let end;
        while ((end = buffer.indexOf('\n\n')) !== -1) {
          const line = buffer.slice(0,end); buffer = buffer.slice(end + 2);
          if (line.startsWith('data: ')) this.onmessage?.({data:line.slice(6)});
        }
      }
    } catch (_) { if (!this.controller.signal.aborted) { this.readyState = 2; this.onerror?.(); } }
  }
  close() { this.readyState = 2; this.controller.abort(); }
}
function app() {
  const elements = new Map(), storage = new Map();
  const el = id => {
    if (!elements.has(id)) elements.set(id, {textContent:'', innerHTML:'', value:'', style:{}, disabled:false, focus(){}, classList:{add(){},remove(){},toggle(){},contains(){return false;}}});
    return elements.get(id);
  };
  const ctx = vm.createContext({console, crypto:webcrypto, URLSearchParams, Uint8Array,
    location:{search:'',pathname:'/',origin:base,protocol:'http:'}, history:{replaceState(){}}, addEventListener(){},
    GRAMMAR_RUSH_LOCAL:true, EventSource:TestEventSource,
    fetch:(url, opts) => fetch(base + url, opts),
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{hidden:false, getElementById:el, createElement(){return {textContent:'',innerHTML:''};}, querySelectorAll(){return [];}, addEventListener(){}},
    setTimeout(fn, ms){const timer=setTimeout(fn,ms);timers.add(timer);return timer;}, clearTimeout,
    setInterval(){return 1;}, clearInterval(){}, alert(message){throw new Error(message);}
  });
  ctx.window = ctx;
  vm.runInContext(fs.readFileSync(require.resolve('../local/transport.js'),'utf8'),ctx);
  vm.runInContext(fs.readFileSync(require.resolve('../index.html'),'utf8').split('<script>')[1].split('</script>')[0],ctx);
  vm.runInContext('playStartSound=playBuzzerSound=playCorrectSound=playWrongSound=()=>{};',ctx);
  return {ctx, el, run:code=>vm.runInContext(code,ctx)};
}
async function until(fn, message) {
  const deadline = Date.now()+5000;
  while (!fn()) { if (Date.now()>deadline) throw new Error(message); await new Promise(r=>setTimeout(r,20)); }
}
(async () => {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port;
  const page=await (await fetch(base)).text();
  assert(page.includes('window.GRAMMAR_RUSH_LOCAL = true'));
  assert(!page.includes('<script src='));
  assert.equal((await fetch(base+'/local/server.cjs')).status,404);
  const teacher=app();
  teacher.run("role='host';roomCode='3285';peer=new Peer('ESL-AUCTION-3285');setupHostListeners();");
  await until(()=>teacher.run('peer.stream && peer.stream.readyState === 1'),'host stream');
  const students=[];
  for(let i=0;i<3;i++) {
    const student=app(); student.el('clientRoomInput').value='3285';student.el('clientTeamInput').value='Team '+i;
    student.run("role='client';connectToHost();"); students.push(student);
  }
  try { await until(()=>students.every(s=>s.run('clientState.hasJoined')),'three teams must join'); } catch(error) { console.log(students.map(s=>({error:s.el('clientError').textContent,state:s.run('JSON.stringify({joining:clientState.joining,peer:peer && peer.id,stream:peer && peer.stream && peer.stream.readyState, conn:clientState.conn && clientState.conn.open})')}))); console.log(teacher.run('JSON.stringify(Object.keys(hostState.teams))')); throw error; }
  assert.equal(teacher.run('Object.keys(hostState.teams).length'),3);
  teacher.run("hostState.topicFilters=['clothing'];hostState.levelFilters=['A1'];startGame();nextQuestion();");
  await until(()=>students.every(s=>s.el('clientStatusText').textContent.includes('Choose')) || students.every(s=>s.run('clientState.selectedChoice === null')), 'round broadcast');
  // Deliver real bets through the transport to the original authoritative game handler.
  const correct=teacher.run('hostState.shuffledQuestions[0].status');
  students[0].run(`clientState.conn.send({type:'bet',choice:'${correct}',amount:200});`);
  students[1].run(`clientState.conn.send({type:'bet',choice:'${correct==='LEGAL'?'ILLEGAL':'LEGAL'}',amount:100});`);
  await until(()=>teacher.run('Object.keys(hostState.bets).length')===2,'two bets delivered');
  teacher.run('skipTimer();');
  await until(()=>students[0].run('clientState.balance')===1500,'result delivered');
  assert.equal(students[1].run('clientState.balance'),900);
  assert.equal(students[2].run('clientState.balance'),800);
  const id=students[0].run('clientState.teamId');
  students[0].run('clientState.conn.close();');
  await until(()=>!teacher.run(`hostState.teams['${id}'].conn`),'close notified');
  students[0].run('reconnectClient();');
  await until(()=>Boolean(teacher.run(`hostState.teams['${id}'].conn`)),'rejoin');
  assert.equal(teacher.run('Object.keys(hostState.teams).length'),3);
  assert.equal(students[0].run('clientState.balance'),1500);
  students[0].run('handleClientOffline();');
  assert.equal(students[0].run('clientState.offline'),false,'LAN must work without internet');
  const late=app();late.el('clientRoomInput').value='3285';late.el('clientTeamInput').value='Late';late.run("role='client';connectToHost();");
  await until(()=>late.run('clientState.hasJoined'),'late join');
  const wrong=app();wrong.el('clientRoomInput').value='9999';wrong.el('clientTeamInput').value='Wrong';wrong.run("role='client';connectToHost();");
  await until(()=>wrong.el('clientError').textContent.includes('waking'),'invalid code feedback');
  assert.equal(wrong.run('clientState.hasJoined'),false);
  console.log('Passed: LAN teacher + 3 students join, real bets, scoring/20% penalty, reconnect without duplicates, late join, offline LAN, wrong-code response, no external scripts or source exposure.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  for(const timer of timers) clearTimeout(timer);
  for(const resource of resources) resource.close();
  server.closeAllConnections();server.close();
});
