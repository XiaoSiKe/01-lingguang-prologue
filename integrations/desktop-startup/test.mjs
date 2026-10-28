import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { apply, localRequest } from '../native-startup/plugin.mjs';

test('Desktop forwarding requires the official cookie and a per-launch mutation token', async () => {
  const directory=mkdtempSync(join(tmpdir(),'rixin-desktop-auth-'));
  const previous=process.env.DSH_HOME;process.env.DSH_HOME=directory;
  try {
    let route;
    apply({
      webServer:{port:3000,register(value){route=value;return()=>{};}},
      effect(effect){effect();},on(){},
      connection:{requestRejection(req){return req.headers.cookie==='official-test-cookie'?undefined:401;}},
    },{desktop:true});
    async function request(path,{cookie='official-test-cookie',token,origin,body}={}) {
      const headers={host:'127.0.0.1:3000',cookie};
      if(token)headers['x-dsh-token']=token;if(origin)headers.origin=origin;
      const req={url:'/__dsh_startup'+path,method:body?'POST':'GET',headers,socket:{remoteAddress:'127.0.0.1'},async *[Symbol.asyncIterator](){if(body)yield JSON.stringify(body);}};
      const res={writeHead(status){this.status=status;},end(value){this.body=value?JSON.parse(String(value)):null;}};
      await route.handler(req,res);return res;
    }
    assert.equal((await request('/api/profile',{cookie:''})).status,401);
    assert.equal((await request('/assets/rixin-logo.jpg',{cookie:''})).status,401);
    const profile=await request('/api/profile');assert.equal(profile.status,200);
    assert.equal((await request('/api/profile',{token:'wrong',body:{username:'bad'}})).status,403);
    const saved=await request('/api/profile',{token:profile.body.token,body:{username:'Desktop Test'}});
    assert.equal(saved.status,200);assert.equal(saved.body.username,'Desktop Test');
    assert.equal((await request('/api/profile',{token:profile.body.token,origin:'https://attacker.example',body:{username:'bad'}})).status,403);
    const bare={headers:{host:'127.0.0.1:3000','x-dsh-token':profile.body.token},socket:{remoteAddress:'127.0.0.1'}};
    assert.equal(localRequest(bare,3000,profile.body.token,true),false,'Web keeps its same-origin requirement');
  } finally {
    if(previous===undefined)delete process.env.DSH_HOME;else process.env.DSH_HOME=previous;
    rmSync(directory,{recursive:true,force:true});
  }
});

test('The completion bridge accepts only the exact owned Desktop origin', () => {
  const source=readFileSync(new URL('../../docs/startup-embed.js',import.meta.url),'utf8');
  for(const origin of ['dsh-app://app','dsh-app://shell','dsh-app://attacker','file:///tmp/app']) {
    const messages=[],listeners=new Map();
    const window={addEventListener(kind,callback){listeners.set(kind,callback);}};
    const parent={postMessage(message,target){messages.push({message,target});}};
    const sandbox={window,parent,URL,URLSearchParams,location:{search:'?embed=1&parentOrigin='+encodeURIComponent(origin)+'&channel=desktop-channel-123456'}};
    runInNewContext(source,sandbox);
    assert.equal(sandbox.DSHEmbed.embedded,origin==='dsh-app://app');
    sandbox.DSHEmbed.ready();
    if(origin==='dsh-app://app') {
      assert.equal(messages[0].target,'dsh-app://app');
      assert.equal(sandbox.DSHEmbed.finish('complete'),true);
      assert.equal(sandbox.DSHEmbed.finish('complete'),false);
    } else assert.equal(messages.length,0);
  }
});
