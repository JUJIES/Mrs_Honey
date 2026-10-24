const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function harness() {
  const timers = new Map(), players = [];
  let timerId = 0;
  const classes = (...initial) => {
    const values = new Set(initial);
    return { add: (...xs) => xs.forEach(x => values.add(x)), remove: (...xs) => xs.forEach(x => values.delete(x)), contains: x => values.has(x), toggle(x, on) { on ? values.add(x) : values.delete(x); } };
  };
  const nodes = ['cat-a', 'cat-b', 'dog-a', 'dog-b'].map(id => ({
    dataset: { cardId: id }, classList: classes(), word: { textContent: '' },
    setAttribute(name, value) { this[name] = value; },
    querySelector() { return this.word; },
  }));
  const progress = {}, word = {}, replay = {}, status = { textContent: '' };
  const screen = {
    isConnected: true, classList: classes('memory-screen'), querySelectorAll: () => nodes,
    querySelector: s => ({ '.progress': progress, '.memory-current-word': word, '.memory-replay': replay })[s],
  };
  const app = { firstElementChild: screen, querySelector: s => s === '.audio-load-status' ? status : null };
  class Media {
    constructor() { this.listeners = new Map(); this.plays = []; this.muted = false; players.push(this); }
    setAttribute() {}
    addEventListener(event, fn) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event).add(fn); }
    removeEventListener(event, fn) { this.listeners.get(event)?.delete(fn); }
    fire(event) { for (const fn of [...(this.listeners.get(event) || [])]) fn(); }
    pause() { this.paused = true; }
    play() {
      this.plays.push(this.src);
      if (this.blocked) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
      this.paused = false;
      return new Promise(resolve => { this.begin = () => { this.fire('playing'); resolve(); }; });
    }
  }
  const window = { location: { protocol: 'https:', hostname: 'localhost' }, setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); } };
  const document = { querySelector: () => app, createElement: () => new Media(), body: { append() {} } };
  const context = vm.createContext({ window, document, console, Set, Map, Promise, Date, fetch() { throw new Error('No manifest or extra feedback fetch is allowed.'); } });
  const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  vm.runInContext(source.slice(0, source.indexOf('\ndocument.addEventListener("click", unlockAudioPlayback')), context);
  const run = s => vm.runInContext(s, context);
  run(`state.language = 'en'; state.audioUnlocked = true;
    state.memory.cards = ['cat-a','cat-b','dog-a','dog-b'].map(id => ({id, matchId:id.split('-')[0], item:{labels:{en:id.split('-')[0]}, readFeedback:{en:'feedback-'+id.split('-')[0]+'.mp3'},audio:{en:'prompt-'+id.split('-')[0]+'.mp3'}}}));`);
  async function flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
  async function tick(ms) { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); timer.fn(); } await flush(); }
  return { run, nodes, players, screen, app, replay, status, timers, word, tick, flush };
}

test('a matched pair speaks only its existing item feedback at full volume; emphasis follows real audio events', async () => {
  const h = harness();
  await h.run('handleMemoryCard("cat-a")');
  assert.equal(h.nodes[0].classList.contains('is-open'), true);
  const match = h.run('handleMemoryCard("cat-b")');
  assert.equal(h.players.length, 0); // Allow the flip to finish first.
  await h.tick(220);
  const audio = h.players[0];
  assert.deepEqual(audio.plays, ['feedback-cat.mp3']);
  assert.equal(audio.volume, 1);
  assert.equal(audio.muted, false);
  assert.equal(h.screen.classList.contains('is-match-speaking'), false);
  audio.begin(); await h.flush();
  assert.equal(h.screen.classList.contains('is-match-speaking'), true);
  assert.equal(h.nodes.filter(n => n.classList.contains('is-match-speaking')).length, 2);
  assert.equal(h.word.textContent, 'cat');
  assert.equal(h.run('state.locked'), true);
  assert.equal(h.replay.disabled, true);
  audio.fire('ended'); await h.flush();
  assert.equal(h.screen.classList.contains('is-match-speaking'), false);
  await h.tick(220); await match;
  assert.equal(h.run('state.locked'), false);
  assert.equal(h.replay.disabled, false);
  assert.equal(h.players.length, 1);
});

test('blocked speech has a visible Memory-specific retry and does not lock the board forever', async () => {
  const h = harness(); h.run('getAudioPlayer()'); h.players[0].blocked = true;
  await h.run('handleMemoryCard("cat-a")'); const match = h.run('handleMemoryCard("cat-b")');
  await h.tick(220); await h.tick(220); await match;
  assert.match(h.status.textContent, /Lautsprecher/);
  assert.equal(h.run('state.locked'), false);
  h.players[0].blocked = false;
  const retry = h.run('replayMemoryMatch()'); h.players[0].begin(); await h.flush();
  assert.equal(h.screen.classList.contains('is-match-speaking'), true);
  h.players[0].fire('ended'); await retry;
  assert.deepEqual(h.players[0].plays, ['feedback-cat.mp3', 'feedback-cat.mp3']);
  assert.equal(h.status.textContent, '');
});

test('an unavailable feedback MP3 falls back to the item prompt, never generic praise', async () => {
  const h = harness();
  await h.run('handleMemoryCard("cat-a")'); const match = h.run('handleMemoryCard("cat-b")');
  await h.tick(220); h.players[0].fire('error'); await h.flush();
  assert.deepEqual(h.players[0].plays, ['feedback-cat.mp3', 'prompt-cat.mp3']);
  h.players[0].begin(); h.players[0].fire('ended'); await h.flush(); await h.tick(220); await match;
  assert.equal(h.run('state.locked'), false);
});

test('leaving during the card flip never starts stale feedback in the next screen', async () => {
  const h = harness();
  await h.run('handleMemoryCard("cat-a")'); const match = h.run('handleMemoryCard("cat-b")');
  h.screen.isConnected = false; h.run('resetMemoryState(); state.locked = true');
  await h.tick(220); await match;
  assert.equal(h.players.length, 0);
  assert.equal(h.run('state.locked'), true);
});

test('leaving during speech removes its emphasis and does not start a stale victory', async () => {
  const h = harness();
  await h.run('handleMemoryCard("cat-a")'); const match = h.run('handleMemoryCard("cat-b")');
  await h.tick(220); h.players[0].begin(); await h.flush();
  h.screen.isConnected = false; h.run('stopActiveAudio(); resetMemoryState(); state.locked = true');
  await match;
  assert.equal(h.screen.classList.contains('is-match-speaking'), false);
  assert.equal(h.run('state.locked'), true);
  assert.deepEqual(h.players[0].plays, ['feedback-cat.mp3']);
});

test('a mismatch closes smoothly on the same card nodes without speech', async () => {
  const h = harness(); const first = h.nodes[0];
  await h.run('handleMemoryCard("cat-a")'); const turn = h.run('handleMemoryCard("dog-a")');
  await h.tick(760); await turn;
  assert.equal(h.nodes[0], first);
  assert.equal(first.classList.contains('is-open'), false);
  assert.equal(h.players.length, 0);
});

test('the final pair finishes its spoken word before the winning sequence starts', async () => {
  const h = harness();
  h.run('state.memory.cards = state.memory.cards.slice(0,2); renderMemoryScreen = () => {}; playWinningSequence = async () => { window.won = true; }');
  h.nodes.splice(2); // The DOM contains the same final pair as the model.
  await h.run('handleMemoryCard("cat-a")'); const match = h.run('handleMemoryCard("cat-b")');
  await h.tick(220); h.players[0].begin(); await h.flush();
  assert.equal(h.run('window.won'), undefined);
  h.players[0].fire('ended'); await h.flush();
  assert.equal(h.run('window.won'), undefined);
  await h.tick(220); await match;
  assert.equal(h.run('window.won'), true);
  assert.equal(h.run('state.locked'), false);
});
