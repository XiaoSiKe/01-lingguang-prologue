#!/usr/bin/env node
// Read-only visual preview. API calls deliberately return unavailable rather than fixtures.
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = resolve(root, 'docs');
const web = resolve(root, 'web/dist');
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex === -1 ? 4186 : Number(args[portIndex + 1]);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port requires a number from 0 to 65535.');
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
const json = (res, code, value) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(value));
};
function open(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
  const child = spawn(command, [url], { stdio: 'ignore' });
  child.on('error', error => console.error(`Open this URL in your browser: ${url}\n${error.message}`));
  child.unref();
}
async function asset(base, relative) {
  const candidate = resolve(base, relative);
  if (!candidate.startsWith(base + sep)) return null;
  try {
    const actual = await realpath(candidate);
    if (!actual.startsWith(base + sep) || !(await stat(actual)).isFile() || !mime[extname(actual)]) return null;
    return { content: await readFile(actual), type: mime[extname(actual)] };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
    throw error;
  }
}
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (path === '/__rixin_preview' && req.method === 'GET') return json(res, 200, { service: 'rixin-visual-preview', root });
    if (path === '/api' || path.startsWith('/api/')) return json(res, 404, { error: { code: 'preview_only', message: '离线视觉预览未连接 Rust 本机服务；真实工作台请使用 dsh web --startup。' } });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'This preview is read-only.' });
    if (path === '/') {
      res.writeHead(302, { Location: '/startup-preview.html?theme=dark', 'Cache-Control': 'no-store' });
      return res.end();
    }
    let file;
    if (path === '/workbench' || path === '/workbench/') file = await asset(web, 'index.html');
    else if (path.startsWith('/workbench/')) file = await asset(web, path.slice('/workbench/'.length));
    else if (path.startsWith('/startup-') || path.startsWith('/assets/')) file = await asset(docs, path.slice(1));
    if (!file && (path.startsWith('/assets/') || path === '/rixin-logo.jpg' || path.startsWith('/pets/'))) file = await asset(web, path.slice(1));
    if (!file) return json(res, 404, { error: path.startsWith('/workbench') ? 'Build the real workbench first: cd web && npm ci && npm run build' : 'Preview asset not found.' });
    res.writeHead(200, { 'Content-Type': file.type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : file.content);
  } catch (error) {
    json(res, error instanceof URIError ? 400 : 500, { error: error instanceof URIError ? 'Invalid URL encoding.' : 'Could not read preview asset.' });
  }
});
server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/__rixin_preview`, { signal: AbortSignal.timeout(1500) });
      const existing = await response.json();
      if (existing.service === 'rixin-visual-preview' && existing.root === root) {
        const url = `http://127.0.0.1:${port}/`;
        console.log(`Reusing this repository's visual preview: ${url}`);
        if (args.includes('--open')) open(url);
        return;
      }
    } catch { /* Another application owns this port. Leave it alone. */ }
    console.error(`Port ${port} is in use. Use --port <another-port>; no existing service was stopped.`);
  } else console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  console.log(`零一·棱光序章 · 社员开场动效: ${origin}/`);
  console.log(`真实工作台构建（需 Rust 服务）: ${origin}/workbench/`);
  console.log('This read-only preview has no runtime API. Ctrl+C closes it.');
  if (args.includes('--open')) open(origin + '/');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
