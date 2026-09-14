import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const distDirectory = resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const portArgument = process.argv.find((argument) => argument.startsWith('--port='));
const port = Number(portArgument?.split('=')[1] || process.env.PORT || 4173);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function getDistPath(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://127.0.0.1').pathname);
  const relativePath = pathname === '/ContextPacker' || pathname.startsWith('/ContextPacker/')
    ? pathname.slice('/ContextPacker'.length) || '/'
    : pathname;
  const filePath = resolve(distDirectory, `.${relativePath}`);
  const relativePathFromDist = relative(distDirectory, filePath);

  if (relativePathFromDist.startsWith('..') || relativePathFromDist.includes('..\\')) {
    return null;
  }

  return relativePath === '/' ? resolve(distDirectory, 'index.html') : filePath;
}

const server = createServer(async (request, response) => {
  try {
    const filePath = request.url ? getDistPath(request.url) : null;
    if (!filePath) {
      response.writeHead(400);
      response.end('Bad request');
      return;
    }

    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${distDirectory} on http://127.0.0.1:${port}/`);
});
