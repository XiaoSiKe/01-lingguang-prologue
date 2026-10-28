// Exercise the shipped controller with the same burst pattern as local discovery.
// Operation budgets are deterministic; elapsed time is diagnostic, never a flaky gate.
const assert = require('node:assert/strict');
const test = require('node:test');
const {createHarness,jsonResponse,ndjsonStream,settle}=require('./test_startup_browser.cjs');
const profile={username:'Performance fixture',badge_id:'QA',token:'test-only',mode:'local',runtime:'native'};

async function loadingHarness() {
  const stream=ndjsonStream();
  const host=createHarness({fetch:async url=>url==='/api/profile'?jsonResponse(profile):stream.response});
  await settle();host.element('seek').value='6.1';host.element('seek').emit('input');host.tap();await settle();host.frame(5001);
  return {host,stream};
}

test('a burst of real-shaped inventory events is painted as one batch', async t=>{
  const {host,stream}=await loadingHarness();
  const plugins=Array.from({length:200},(_,i)=>({id:'fixture-'+i,name:'fixture-plugin-'+i,source:'test-fixture/'+i,status:'loaded'}));
  const events=[...plugins.map(item=>({type:'item',kind:'plugin',...item})),{type:'complete',skills:[],plugins,issues:[],elapsed_ms:20}];
  const before={draws:host.drawStates.length,writes:host.domWrites.length,reads:host.layoutReads.length},start=performance.now();
  stream.bytes(new TextEncoder().encode(events.map(value=>JSON.stringify(value)).join('\n')+'\n'));stream.close();await settle();
  const result={elapsedMs:Math.round(performance.now()-start),draws:host.drawStates.length-before.draws,domWrites:host.domWrites.length-before.writes,layoutReads:host.layoutReads.length-before.reads};
  t.diagnostic(JSON.stringify(result));
  host.windowEvents.emit('pagehide');
  assert.equal(host.element('pluginsCount').textContent,'200');
  assert.equal(host.element('pluginsList').children.length,200);
  assert.ok(result.draws<=8,'a network chunk must not synchronously redraw once per item');
  assert.ok(result.layoutReads<=64,'a network chunk must not repeatedly force the same layout');
  assert.ok(result.domWrites<10000,'streaming updates must not rewrite all preceding rows');
});

test('completion keeps existing inventory rows instead of restarting their lettering',async()=>{
  const {host,stream}=await loadingHarness();
  const item={name:'literal-plugin',source:'test-fixture/source',status:'loaded'};
  stream.event({type:'item',kind:'plugin',...item});await settle();
  const row=host.element('pluginsList').children[0];
  stream.event({type:'complete',skills:[],plugins:[{id:'resolved-host-id',...item}],issues:[],elapsed_ms:5});stream.close();await settle();
  host.windowEvents.emit('pagehide');
  assert.ok(host.element('pluginsList').children[0]===row,'the final host id must not replace an already visible name/source row');
});

test('pointer movement reuses the current stage bounds',async()=>{
  const host=createHarness();await settle();
  const start=host.layoutReads.filter(id=>id==='experience').length;
  for(let i=0;i<120;i++)host.element('experience').emit('pointermove',{pointerId:1,clientX:200+i,clientY:300+i});
  host.frame(17);
  const reads=host.layoutReads.filter(id=>id==='experience').length-start;
  host.windowEvents.emit('pagehide');
  assert.ok(reads<=1,'pointer events must not force a fresh DOM measurement for every movement');
  assert.equal(host.drawStates.at(-1).pointer.x,.319);
  assert.equal(host.drawStates.at(-1).pointer.y,.52375);
});


test('mechanical audio reuses its PCM table across phases and mute stops all sources',async()=>{
  const host=createHarness();await settle();host.tap();await settle();
  const context=host.contexts[0];
  assert.equal(context.buffersCreated,1);
  for(const time of ['3.9','6.1','11.3','0']){
    host.element('seek').value=time;host.element('seek').emit('input');host.tap();await settle();
  }
  assert.equal(context.buffersCreated,1,'phase changes and replay must reuse the precomputed machine-noise table');
  assert.ok(host.sources.some(source=>source.type==='sawtooth'),'the real controller must schedule the motor/servo engine');
  assert.ok(host.sources.some(source=>source.type==='square'),'the motor must include its mechanical pulse modulation');
  host.element('sound').emit('click');await settle();
  assert.ok(host.sources.every(source=>source.stopped),'mute must stop scheduled as well as currently playing mechanical sources');
  host.windowEvents.emit('pagehide');
});
