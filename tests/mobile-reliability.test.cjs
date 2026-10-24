const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  let gesture = false;
  const instances = [], timers = new Map();
  let nextTimer = 0;
  class Media {
    constructor() { this.listeners = new Map(); this.plays = []; instances.push(this); }
    setAttribute() {}
    addEventListener(event, fn) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event).add(fn); }
    removeEventListener(event, fn) { this.listeners.get(event)?.delete(fn); }
    fire(event) { for (const fn of [...(this.listeners.get(event) || [])]) fn(); }
    pause() { this.paused = true; }
    play() {
      this.plays.push(this.src);
      if (gesture) this.unlocked = true;
      if (!this.unlocked) return Promise.reject(Object.assign(new Error('gesture required'), {name:'NotAllowedError'}));
      this.paused = false;
      if (this.src.startsWith('data:')) return Promise.resolve();
      return new Promise((resolve) => { this.begin = () => { this.fire('playing'); resolve(); }; });
    }
  }
  const audioStatus = {textContent:''};
  const app = {querySelector:(s) => s === '.audio-load-status' ? audioStatus : null};
  const document = {querySelector:()=>app,createElement:(tag)=>tag==='audio'?new Media():{addEventListener(){},type:'',textContent:''},body:{append(){}}};
  const window = {location:{protocol:"https:",hostname:"localhost"},setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}};
  const context = vm.createContext({window,document,console,Set,Map,Promise,Date,fetch:()=>new Promise(()=>{})});
  const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
  vm.runInContext(source.slice(0,source.indexOf('\ndocument.addEventListener("click", unlockAudioPlayback')), context);
  return {context,instances,timers,audioStatus,run:(s)=>vm.runInContext(s,context),gesture(fn){gesture=true;fn();gesture=false;}};
}

test('one element unlocked by a tap plays later prompts; loading does not consume playback time', async()=>{
  const h=harness();
  h.gesture(()=>h.run('unlockAudioPlayback()')); await Promise.resolve();
  const result=h.run('playAudioFile("cat.mp3")');
  assert.equal(h.instances.length,1);
  assert.deepEqual([...h.timers.values()].map(t=>t.ms),[600,12000]);
  h.instances[0].begin(); await Promise.resolve();
  assert.deepEqual([...h.timers.values()].map(t=>t.ms),[8000]);
  h.instances[0].fire('ended');assert.equal(await result,'ended');
  const next=h.run('playAudioFile("dog.mp3")');h.instances[0].begin();h.instances[0].fire('ended');
  assert.equal(await next,'ended'); assert.equal(h.instances.length,1);assert.equal(h.timers.size,0);
});

test('stopping removes listeners so an old ended event cannot complete the next clip',async()=>{
  const h=harness();h.gesture(()=>h.run('unlockAudioPlayback()'));await Promise.resolve();
  const old=h.run('playAudioFile("cat.mp3")');h.instances[0].begin();
  const next=h.run('playAudioFile("dog.mp3")');assert.equal(await old,'stopped');
  assert.equal(h.instances[0].listeners.get('ended').size,1);
  h.instances[0].begin();h.instances[0].fire('ended');assert.equal(await next,'ended');
});

test('blocked audio offers a visible retry and is recoverable on a tap',async()=>{
  const h=harness();assert.equal(await h.run('playAudioFile("cat.mp3")'),'blocked');
  assert.match(h.audioStatus.textContent,/Mrs. Honey/);
  let retry;h.gesture(()=>{retry=h.run('playAudioFile("cat.mp3")');});
  h.instances[0].begin();h.instances[0].fire('ended');assert.equal(await retry,'ended');
});

function imageRound(failures) {
  let calls=0;
  const image={src:'assets/cat.png',naturalWidth:768,getAttribute(){return this.src;},decode(){return ++calls<=failures?Promise.reject(new Error('network')):Promise.resolve();}};
  const card={disabled:false,querySelector:()=>image};
  const status={textContent:'',append(button){this.button=button;}};
  const screen={isConnected:true,querySelector:()=>status,querySelectorAll:()=>[card],classList:{add(){},remove(){},contains(){return true;}}};
  return {screen,card,status,image,calls:()=>calls};
}

test('a failed image is retried before answers or autoplay become available',async()=>{
  const h=harness(),r=imageRound(1);h.context.screen=r.screen;h.run('state.mode="hear-tap"');
  await h.run('loadRoundImages(screen)');assert.equal(r.calls(),2);assert.match(r.image.src,/\?retry=/);
  assert.equal(r.card.disabled,false);assert.equal(r.status.textContent,'');
  assert.ok([...h.timers.values()].some(t=>t.ms===620));
});

test('persistent image failure keeps the entire choice unplayable and exposes retry',async()=>{
  const h=harness(),r=imageRound(99);h.context.screen=r.screen;await h.run('loadRoundImages(screen)');
  assert.equal(r.card.disabled,true);assert.equal(r.status.button.textContent,'Erneut laden');
  assert.deepEqual([...h.timers.values()].map(t=>t.ms),[8000]);
});

test('leaving during image loading never starts a stale round',async()=>{
  const h=harness(),r=imageRound(0);r.screen.isConnected=false;h.context.screen=r.screen;h.run('state.mode="hear-tap"');
  await h.run('loadRoundImages(screen)');assert.equal(r.calls(),0);assert.equal(h.timers.size,0);
});


test('offline shell precaches every local script and every exact set-cover URL',()=>{
  const root=require('node:path').join(__dirname,'..');
  const sw=fs.readFileSync(require('node:path').join(root,'service-worker.js'),'utf8');
  const html=fs.readFileSync(require('node:path').join(root,'index.html'),'utf8');
  const urls=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]).filter(u=>!u.startsWith('https:'));
  const h=harness();
  for (const url of [...urls,...h.run('learningSets.map(s=>s.cover)')]) {
    assert.ok(sw.includes(JSON.stringify('./'+url)),`Missing exact precache URL: ${url}`);
  }
});


test('a transient manifest failure does not disable audio for the rest of the session',async()=>{
  const h=harness();let calls=0;
  h.context.fetch=async()=>++calls===1?{ok:false}:{ok:true,json:async()=>({files:['cat.mp3']})};
  assert.equal(await h.run('audioExists("cat.mp3")'),false);
  assert.equal(await h.run('audioExists("cat.mp3")'),true);
  assert.equal(calls,2);
});


test('the actual generated manifest bundle supports offline feedback without a JSON fetch',async()=>{
  const h=harness();let calls=0;h.context.fetch=()=>{calls++;throw new Error('offline');};
  h.run('window.LERNWORT_AUDIO_MANIFEST={files:["cat.mp3"]}');
  assert.equal(await h.run('audioExists("cat.mp3")'),true);assert.equal(calls,0);
});
