const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const publicDir = __dirname;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function buildFilePath(requestUrl) {
  const { pathname } = new URL(requestUrl, 'http://localhost');
  const decodedPath = decodeURIComponent(pathname);
  const resolvedPath = path.resolve(publicDir, `.${decodedPath}`);

  if (!resolvedPath.startsWith(publicDir)) {
    return null;
  }

  return resolvedPath;
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

function sendMethodNotAllowed(res) {
  res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('405 Method Not Allowed');
}

const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    return sendMethodNotAllowed(res);
  }

  const requestedPath = buildFilePath(req.url);

  if (!requestedPath) {
    return sendNotFound(res);
  }

  fs.stat(requestedPath, (statErr, stats) => {
    if (statErr) {
      return sendNotFound(res);
    }

    const targetPath = stats.isDirectory()
      ? path.join(requestedPath, 'index.html')
      : requestedPath;

    fs.stat(targetPath, (targetErr, targetStats) => {
      if (targetErr || !targetStats.isFile()) {
        return sendNotFound(res);
      }

      const headers = { 'Content-Type': getContentType(targetPath) };
      res.writeHead(200, headers);

      if (req.method === 'HEAD') {
        return res.end();
      }

      const stream = fs.createReadStream(targetPath);
      stream.pipe(res);
      stream.on('error', () => sendNotFound(res));
    });
  });
});

const port = process.env.PORT || 3000;
const host = '0.0.0.0';

server.listen(port, host, () => {
  console.log(`Server running at http://${host}:${port}`);
});
