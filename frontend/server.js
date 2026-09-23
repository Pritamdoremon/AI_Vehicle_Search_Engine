// Production start script for a separate Render Web Service
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import handler from 'serve-handler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;

const server = createServer((request, response) => {
  return handler(request, response, {
    public: path.join(__dirname, 'dist'),
    rewrites: [{ source: '**', destination: '/index.html' }]
  });
});

// Bind 0.0.0.0 so Render can detect the open port
server.listen(port, '0.0.0.0', () => {
  console.log(`Frontend listening on http://0.0.0.0:${port}`);
});
