const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const script = html.split('<script>')[1].split('</script>')[0];
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {textContent: '', innerHTML: '', disabled: false,
    classList: {add() {}, remove() {}, toggle() {}}});
  return elements.get(id);
};
const context = vm.createContext({
  window: {location: {search: ''}}, URLSearchParams,
  localStorage: {getItem() { return null; }, setItem() {}},
  document: {getElementById: element, createElement() { return {textContent: '', innerHTML: ''}; }},
  alert: message => { context.alertMessage = message; },
  setInterval() { return 1; }, clearInterval() {}, clearTimeout() {}, setTimeout() {}, console
});
vm.runInContext(script, context);
vm.runInContext(`
  playStartSound = () => {};
  hostState.topicFilters = ['requests'];
  hostState.levelFilters = ['B1'];
  const single = filteredQuestionBank();
  if (single.length !== 1) throw new Error('Expected one-card test mix');
  hostState.gameStarted = true;
  hostState.shuffledQuestions = single;
  nextQuestion();
  revealAnswer();
  if (document.getElementById('nextQuestionBtn').disabled) throw new Error('Next question disabled');
  nextQuestion();
`, context);
assert.equal(vm.runInContext('hostState.currentQ', context), 2);
assert.equal(vm.runInContext('hostState.finalChallengeActive', context), false);
// Reloading an exhausted round must keep Next Question available.
vm.runInContext('hostState.bettingOpen = false; hostState.roundRevealed = true; restoreHostView();', context);
assert.equal(element('nextQuestionBtn').onclick, vm.runInContext('nextQuestion', context));
// A combination with no cards must not start the final or mutate the round.
vm.runInContext("hostState.topicFilters = ['articles']; hostState.levelFilters = ['B2']; nextQuestion();", context);
assert.equal(vm.runInContext('hostState.currentQ', context), 2);
assert.equal(vm.runInContext('hostState.finalChallengeActive', context), false);
assert.match(context.alertMessage, /No questions match/);
console.log('Passed: one-card mix continues, reload restores Next Question, empty mix leaves round intact.');
// Switching classes cancels the old connection and clears the form, not saved team records.
const saved = new Map([['grammar-auction:v1:client:8866', JSON.stringify({teamId: 'existing-team', balance: 2700})]]);
context.localStorage.setItem = (key, value) => saved.set(key, value);
context.window.location.pathname = '/';
context.window.history = {replaceState(_state, _title, url) { context.replacedUrl = url; }};
element('clientRoomInput').focus = () => {};
vm.runInContext(`
  clientState.room = '8866';
  clientState.conn = {close() { if (clientState.conn !== null) throw new Error('Connection not detached'); }};
  peer = {destroy() { if (peer !== null) throw new Error('Peer not detached'); }};
  document.getElementById('clientRoomInput').value = '8866';
  document.getElementById('clientTeamInput').value = 'Old team';
  changeClientClass();
`, context);
assert.equal(element('clientRoomInput').value, '');
assert.equal(element('clientTeamInput').value, '');
assert.equal(element('clientJoinBtn').disabled, false);
assert.equal(vm.runInContext('clientState.kicked', context), true);
assert.equal(vm.runInContext('clientState.balance', context), 1000);
assert.equal(context.replacedUrl, '/?role=client');
assert.equal(JSON.parse(saved.get('grammar-auction:v1:client:8866')).balance, 2700);
assert.deepEqual(JSON.parse(saved.get('grammar-auction:v1:active')), {role: 'client'});
console.log('Passed: change class cancels recovery, enables form and preserves previous room storage.');
// A new team is accepted after the game starts and is synced into the live round.
vm.runInContext(`
  hostState.gameStarted = true;
  hostState.bettingOpen = true;
  hostState.currentQ = 1;
  hostState.teams = {};
  const lateMessages = [];
  const lateConn = {open: true, send(message) { lateMessages.push(message); }};
  handleClientMessage(lateConn, {type: 'join', teamId: 'late-team-123456789', teamName: 'Late Team'});
`, context);
assert.equal(vm.runInContext("hostState.teams['late-team-123456789'].balance", context), 1000);
assert.equal(vm.runInContext("hostState.teams['late-team-123456789'].joinedLate", context), true);
assert.equal(vm.runInContext("lateMessages.some(m => m.type === 'joined' && m.lateJoin)", context), true);
assert.equal(vm.runInContext("lateMessages.some(m => m.type === 'openBetting')", context), true);
console.log('Passed: late teams can join and receive the current round.');
// Auto mode can be toggled and triggers a skip once every connected team has bet.
vm.runInContext(`
  hostState.autoAdvance = false;
  toggleAutoAdvance(true);
  const autoWasEnabled = hostState.autoAdvance;
  let autoSkipCalled = false;
  skipTimer = () => { autoSkipCalled = true; };
  hostState.bettingOpen = true; hostState.roundRevealed = false;
  hostState.teams = {
    a: {conn: {open: true}}, b: {conn: {open: true}}
  };
  hostState.bets = {a: {amount: 100}, b: {amount: 100}};
  checkAllBetsIn();
  toggleAutoAdvance(false);
`, context);
assert.equal(vm.runInContext('autoWasEnabled', context), true);
assert.equal(vm.runInContext('autoSkipCalled', context), true);
assert.equal(vm.runInContext('hostState.autoAdvance', context), false);
console.log('Passed: auto mode skips after all connected teams bet and can be disabled.');
