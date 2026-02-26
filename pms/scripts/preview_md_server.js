const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const projectRoot = path.resolve(__dirname, '..');
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function safeResolveMarkdown(requested) {
  const candidate = path.resolve(projectRoot, requested);
  if (!candidate.startsWith(projectRoot)) {
    return null;
  }
  if (path.extname(candidate).toLowerCase() !== '.md') {
    return null;
  }
  return candidate;
}

function htmlTemplate(fileParam) {
  const title = 'Markdown 预览';
  const fileQS = encodeURIComponent(fileParam || '');
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial; line-height: 1.6; color: #1f2328; }
    header { padding: 12px 16px; background: #0d1117; color: #c9d1d9; display: flex; align-items: center; gap: 12px; }
    header input { flex: 1; padding: 8px 10px; border-radius: 6px; border: 1px solid #30363d; background: #161b22; color: #c9d1d9; }
    main { max-width: 860px; padding: 24px; margin: 0 auto; }
    main img { max-width: 100%; }
    pre, code { background: #f6f8fa; }
    pre { padding: 12px; overflow: auto; }
    h1,h2,h3 { border-bottom: 1px solid #d0d7de; padding-bottom: .3em; }
    table { border-collapse: collapse; }
    table, th, td { border: 1px solid #d0d7de; }
    th, td { padding: 6px 10px; }
    .error { color: #cf222e; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js"></script>
  <script>
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const file = params.get('file') || '${fileQS}';
      const input = document.getElementById('file');
      input.value = file;
      if (!file) return;
      try {
        const res = await fetch('/raw?file=' + encodeURIComponent(file));
        if (!res.ok) throw new Error('无法读取文件: ' + res.status);
        const text = await res.text();
        const html = DOMPurify.sanitize(marked.parse(text));
        document.getElementById('app').innerHTML = html;
      } catch (e) {
        document.getElementById('app').innerHTML = '<p class="error">' + e.message + '</p>';
      }
    }
    function go() {
      const v = document.getElementById('file').value.trim();
      const url = new URL(window.location.href);
      url.searchParams.set('file', v);
      window.location.href = url.toString();
    }
    window.addEventListener('DOMContentLoaded', load);
  </script>
  </head>
<body>
  <header>
    <div>Markdown 预览</div>
    <input id="file" placeholder="相对项目根目录的 .md 文件路径，如 背景介绍.md" />
    <button onclick="go()">打开</button>
  </header>
  <main id="app">加载中...</main>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname === '/') {
    const defaultCandidates = ['背景介绍.md', '公司介绍.md', 'README.md'];
    let chosen = '';
    for (const f of defaultCandidates) {
      if (exists(path.join(projectRoot, f))) { chosen = f; break; }
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlTemplate(chosen));
    return;
  }

  if (parsed.pathname === '/raw') {
    const q = parsed.query.file;
    const mdPath = typeof q === 'string' ? safeResolveMarkdown(q) : null;
    if (!mdPath || !exists(mdPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('未找到 Markdown 文件');
      return;
    }
    const text = fs.readFileSync(mdPath, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
    return;
  }

  // Fallback: serve static files if needed
  const filePath = path.join(projectRoot, decodeURIComponent(parsed.pathname));
  if (filePath.startsWith(projectRoot) && exists(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const map = { '.md': 'text/plain; charset=utf-8', '.html': 'text/html; charset=utf-8' };
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  const defaultFile = ['背景介绍.md', '公司介绍.md', 'README.md'].find(f => exists(path.join(projectRoot, f))) || '';
  const url = `http://localhost:${PORT}/?file=${encodeURIComponent(defaultFile)}`;
  console.log(`预览已启动: ${url}`);
});
