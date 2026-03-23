/**
 * nodewatcher demo — run with: npm run example
 *
 * This simulates a real Node.js app with:
 * - An HTTP server receiving requests
 * - Periodic console.log output
 * - Some CPU work
 * - Occasional errors
 */

// One line is all you need:
require('../dist/auto');

const http = require('http');

// Create a simple HTTP server
const server = http.createServer((req, res) => {
  // Simulate some work
  const delay = Math.random() * 100;
  setTimeout(() => {
    // Occasionally return errors
    if (Math.random() < 0.05) {
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', path: req.url }));
  }, delay);
});

server.listen(3456, () => {
  console.log('Demo server running on http://localhost:3456');
});

// Simulate periodic logging
let counter = 0;
setInterval(() => {
  counter++;
  console.log(`[app] Request batch #${counter} processed`);

  if (counter % 5 === 0) {
    console.log(`[app] Cache cleared, ${Math.floor(Math.random() * 100)} items evicted`);
  }
}, 3000);

// Simulate occasional warnings
setInterval(() => {
  console.warn('[app] Memory pressure detected, running GC hints');
}, 15000);

// Simulate some CPU work periodically
setInterval(() => {
  let sum = 0;
  for (let i = 0; i < 1e6; i++) {
    sum += Math.sqrt(i);
  }
}, 2000);

// Auto-generate some HTTP traffic
setInterval(() => {
  const paths = ['/api/users', '/api/orders', '/api/products', '/health', '/api/stats'];
  const path = paths[Math.floor(Math.random() * paths.length)];

  http.get(`http://localhost:3456${path}`, (res) => {
    res.resume(); // consume response
  }).on('error', () => {});
}, 500);
