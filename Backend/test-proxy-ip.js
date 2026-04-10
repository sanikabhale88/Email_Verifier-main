const { createProxySocket } = require('./utils/proxy.js');

async function checkIP(port) {
  try {
    const socket = await createProxySocket('api.ipify.org', 80, port);
    
    return new Promise((resolve) => {
      let data = '';
      socket.on('data', chunk => { data += chunk.toString(); });
      socket.on('close', () => {
        // Find the body (last part after double CRLF)
        const parts = data.split('\r\n\r\n');
        const body = parts.length > 1 ? parts[1].trim() : data;
        resolve(body);
      });
      socket.on('error', (err) => resolve('Error: ' + err.message));

      socket.write("GET / HTTP/1.1\r\nHost: api.ipify.org\r\nConnection: close\r\n\r\n");
    });
  } catch(e) {
    return 'Proxy connect error: ' + e.message;
  }
}

async function start() {
  const testPorts = [10001, 10002, 10003, 10004];
  console.log('Testing proxy IP rotation across different ports...');
  for (const port of testPorts) {
    const ip = await checkIP(port);
    console.log(`[Port ${port}] -> Assigned IP: ${ip}`);
  }
  console.log('Done.');
  process.exit(0);
}

start();
