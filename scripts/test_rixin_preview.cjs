const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts/preview_rixin.mjs');

test('the real preview serves the complete opening and refuses fabricated APIs or writes', async t => {
  const child = spawn(process.execPath, [script, '--port', '0'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  t.after(async () => {
    if (child.exitCode === null) {
      const closed = once(child, 'exit');
      child.kill('SIGTERM');
      await closed;
    }
  });
  const origin = await new Promise((resolve, reject) => {
    const deadline = setTimeout(() => reject(new Error('Preview did not start')), 5000);
    child.once('error', error => { clearTimeout(deadline); reject(error); });
    child.once('exit', code => { clearTimeout(deadline); reject(new Error(`Preview exited ${code}: ${output}`)); });
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(deadline); resolve(match[0]); }
    });
  });
  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(page.url, /startup-preview\.html\?theme=dark$/);
  const html = await page.text();
  assert.match(html, /零一·棱光序章/);
  const resources = [...html.matchAll(/(?:src|href)="((?:startup-|assets\/)[^"]+)"/g)].map(match => match[1]);
  assert.ok(resources.length >= 18);
  for (const resource of resources) {
    const response = await fetch(new URL(resource, page.url));
    assert.equal(response.status, 200, resource);
    assert.ok((await response.arrayBuffer()).byteLength > 0, resource);
  }
  for (const api of ['/api/profile', '/api/load', '/api/access']) {
    const response = await fetch(origin + api, { method: api === '/api/load' ? 'POST' : 'GET' });
    assert.equal(response.status, 404);
    assert.equal((await response.json()).error.code, 'preview_only');
  }
  const write = await fetch(origin + '/startup-preview.html', { method: 'POST', body: 'no writes' });
  assert.equal(write.status, 405);
  const head = await fetch(origin + '/assets/rixin-logo.jpg', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-type'), 'image/jpeg');
  assert.equal(await head.text(), '');
  for (const [requestPath, expected] of [['/assets/%2e%2e%2f%2e%2e%2f.git/config', 404], ['/assets/%ZZ', 400]]) {
    const status = await new Promise((resolve, reject) => {
      http.get(origin + requestPath, response => { response.resume(); resolve(response.statusCode); }).on('error', reject);
    });
    assert.equal(status, expected, requestPath);
  }
});
