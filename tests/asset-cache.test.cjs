const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const {createHash,webcrypto} = require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../asset-cache.js'),'utf8');

function harness(names=['a.mp3','b.mp3','c.mp3','d.mp3'],existing=new Map()) {
  const files={},payloads={};
  for(const name of names) {
    const bytes=Buffer.from('content:'+name);
    files[name]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,type:'audio/mpeg'};
    payloads[name]=bytes;
  }
  const requests=[],events=new Map();
  let handler=async(url)=>new Response(payloads[new URL(url).pathname.slice(1)]);
  const caches={async open(name){if(!existing.has(name))existing.set(name,new Map());const map=existing.get(name);return {
    async match(key){return map.get(String(key))?.clone();},async put(key,r){map.set(String(key),r.clone());},async delete(key){return map.delete(String(key));}
  };}};
  const context=vm.createContext({URL,Response,Headers,Request,AbortController,Uint8Array,Map,Set,Promise,
    crypto:webcrypto,caches,setTimeout,clearTimeout,location:new URL('https://game.test/'),
    LERNWORT_OFFLINE_ASSETS:{files},fetch:async(url,opts)=>{requests.push(url);return handler(url,opts);},
    addEventListener:(name,fn)=>events.set(name,fn),navigator:{onLine:true}});
  vm.runInContext(source,context);
  return {api:context.LernwortAssets,context,files,payloads,requests,existing,events,setHandler(fn){handler=fn;}};
}

test('only complete, hash-verified responses are stored; cache works with no network',async()=>{
  const h=harness();const full=await h.api.load('a.mp3');assert.equal(await full.text(),'content:a.mp3');
  h.setHandler(()=>{throw new Error('offline');});
  assert.equal(await (await h.api.load('a.mp3')).text(),'content:a.mp3');assert.equal(h.requests.length,1);
});

test('partial, truncated and wrong-revision responses never enter content storage',async()=>{
  for(const response of [new Response('part',{status:206}),new Response('short'),new Response('CONTENT:a.mp3')]) {
    const h=harness();h.setHandler(async()=>response.clone());
    await assert.rejects(h.api.load('a.mp3'));assert.equal(await h.api.cached('a.mp3'),undefined);
  }
});

test('concurrent foreground and preload requests download a file only once',async()=>{
  const h=harness();let release;
  h.setHandler(()=>new Promise(resolve=>{release=()=>resolve(new Response(h.payloads['a.mp3']));}));
  const a=h.api.load('a.mp3'),b=h.api.load('a.mp3');
  await new Promise(setImmediate);release();
  assert.equal(await (await a).text(),await (await b).text());assert.equal(h.requests.length,1);
});

test('cached media supports bounded, open-ended, suffix and unsatisfiable byte ranges offline',async()=>{
  const h=harness();await h.api.load('a.mp3');h.setHandler(()=>{throw new Error('offline');});
  for(const [range,text,contentRange] of [['bytes=0-1','co','bytes 0-1/13'],['bytes=8-','a.mp3','bytes 8-12/13'],['bytes=-3','mp3','bytes 10-12/13']]) {
    const r=await h.api.respond(new Request(h.api.urlFor('a.mp3'),{headers:{Range:range}}));
    assert.equal(r.status,206);assert.equal(await r.text(),text);assert.equal(r.headers.get('Content-Range'),contentRange);
  }
  for(const range of ['bytes=99-','bytes=5-2','bytes=-0']) {
    assert.equal((await h.api.respond(new Request(h.api.urlFor('a.mp3'),{headers:{Range:range}}))).status,416);
  }
});

test('versioned cached files survive shell changes and cannot be substituted with a newer revision',async()=>{
  const storage=new Map();const old=harness(['a.mp3'],storage);await old.api.load('a.mp3');
  const oldUrl=old.api.urlFor('a.mp3');
  const next=harness(['a.mp3'],storage);next.context.LERNWORT_OFFLINE_ASSETS.files['a.mp3'].sha256='different';
  assert.equal(next.api.info(oldUrl),null);
  // The old page can still read its intact content cache even while another version exists.
  old.setHandler(()=>{throw new Error('offline');});assert.equal(await (await old.api.load('a.mp3')).text(),'content:a.mp3');
});

test('a full or denied storage area keeps the online response playable',async()=>{
  const h=harness();h.context.caches.open=async()=>{throw new Error('QuotaExceededError');};
  assert.equal(await (await h.api.load('a.mp3')).text(),'content:a.mp3');
});

test('one background slot is reserved; urgent work overtakes pending background files',async()=>{
  const h=harness();const pending=[];
  h.setHandler(url=>new Promise(resolve=>pending.push({url,resolve})));
  const p=h.api.createPreloader();const background=p.background(['a.mp3','b.mp3','c.mp3']);
  await new Promise(setImmediate);assert.equal(pending.length,1);
  const urgent=p.warm(['d.mp3']);await new Promise(setImmediate);
  assert.equal(pending.length,2);assert.ok(pending[1].url.includes('/d.mp3?'));
  const finish=job=>job.resolve(new Response(h.payloads[new URL(job.url).pathname.slice(1)]));
  finish(pending[1]);await urgent;finish(pending[0]);
  for(let i=2;i<4;i++){await new Promise(setImmediate);await new Promise(setImmediate);finish(pending[i]);}
  await background;
});

test('changing the selected set drops queued old downloads and keeps completed files',async()=>{
  const h=harness();let finish;
  h.setHandler(url=>new Promise(resolve=>{finish=()=>resolve(new Response(h.payloads[new URL(url).pathname.slice(1)]));}));
  const p=h.api.createPreloader();const old=p.background(['a.mp3','b.mp3']);await new Promise(setImmediate);
  const next=p.background(['c.mp3']);finish();await new Promise(setImmediate);await new Promise(setImmediate);finish();
  await Promise.all([old,next]);assert.equal(h.requests.length,2);assert.ok(!h.requests.some(u=>u.includes('/b.mp3?')));
});

test('network recovery silently retries wanted files',async()=>{
  const h=harness();h.context.navigator.onLine=false;h.setHandler(()=>{throw new Error('offline');});
  const p=h.api.createPreloader();assert.deepEqual(Array.from(await p.background(['a.mp3'])),[false]);
  h.context.navigator.onLine=true;h.setHandler(async()=>new Response(h.payloads['a.mp3']));h.events.get('online')();
  for(let i=0;i<10;i++)await new Promise(setImmediate);
  assert.ok(await h.api.cached('a.mp3'));
});


test('a recovered origin is retried even without an online event',async()=>{
  const h=harness();h.context.navigator.onLine=false;
  h.setHandler(()=>{throw new Error('offline');});
  let recover;
  h.context.setTimeout=(fn,ms)=>{if(ms===15000)recover=fn;return 1;};
  h.context.clearTimeout=()=>{};
  const p=h.api.createPreloader();assert.deepEqual(Array.from(await p.background(['a.mp3'])),[false]);
  // download timeout also uses setTimeout; restore a real timer for the now-online request.
  h.context.setTimeout=setTimeout;h.context.clearTimeout=clearTimeout;
  h.setHandler(async()=>new Response(h.payloads['a.mp3']));recover();
  for(let i=0;i<10;i++)await new Promise(setImmediate);
  assert.ok(await h.api.cached('a.mp3'));
});

test('activating a shell update preserves downloaded lessons and unrelated caches',async()=>{
  const handlers=new Map(),deleted=[];
  const context=vm.createContext({importScripts(){},caches:{keys:async()=>['lernwort-pwa-v31','lernwort-pwa-v34','lernwort-content-v1','other-app'],delete:async key=>deleted.push(key)},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers.set(name,fn)});
  context.self=context;vm.runInContext(fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8'),context);
  let work;handlers.get('activate')({waitUntil(p){work=p;}});await work;
  assert.deepEqual(deleted,['lernwort-pwa-v31']);
});


test('prepared audio plays locally before a new service worker takes control',async()=>{
  const h=harness();h.context.document={visibilityState:'visible',addEventListener(){}};
  await h.api.load('a.mp3');const url=h.api.audioUrl('a.mp3');assert.match(url,/^blob:/);
  h.setHandler(()=>{throw new Error('origin offline');});
  assert.equal(await (await fetch(url)).text(),'content:a.mp3');assert.equal(h.requests.length,1);
  URL.revokeObjectURL(url);
});
