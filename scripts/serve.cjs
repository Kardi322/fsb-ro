const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const allowed = new Set(['index.html','styles.css','app.js','logic.js','features.js','data.js','favicon.svg','Уголовный кодекс РО.txt','Процессуальный кодекс РО.txt','Конституция РО.txt']);
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.svg':'image/svg+xml', '.txt':'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  try {
    let filename = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/(?:fsb-ro-info\/)?/, '');
    if (!filename) filename = 'index.html';
    if (!allowed.has(filename)) { res.writeHead(404); return res.end('Not found'); }
    const content = fs.readFileSync(path.join(root, filename));
    res.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control':'no-store' });
    res.end(content);
  } catch { res.writeHead(400); res.end('Bad request'); }
}).listen(4173, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4173/fsb-ro-info/'));

