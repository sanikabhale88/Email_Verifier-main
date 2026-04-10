const { SocksClient } = require("socks");

const USERNAME = process.env.PROXY_USERNAME;
const PASSWORD = process.env.PROXY_PASSWORD;

// Use either 10001-10010 ports or a fallback port 7000 used previously
const proxyPorts = [
  10001, 10002, 10003, 10004, 10005,
  10006, 10007, 10008, 10009, 10010
];

/**
 * Creates a SOCKS5 proxy socket to the destination host/port using Decodo.
 * @param {string} destinationHost - The MX server hostname
 * @param {number} destinationPort - The port to connect to on the destination (default: 25)
 * @returns {Promise<import("net").Socket>}
 */
async function createProxySocket(destinationHost, destinationPort = 25) {
  // If no env credentials are provided, fallback to hardcoded ones found in the project.
  const proxyUserId = USERNAME || "spr1if7d1e";
  const proxyPassword = PASSWORD || "1y9de22sZumruJVyQ~";

  // Pick a random proxy port to rotate IPs
  const randomPort = proxyPorts[Math.floor(Math.random() * proxyPorts.length)];

  const info = await SocksClient.createConnection({
    proxy: {
      host: "gate.decodo.com",
      port: randomPort,
      type: 5,
      userId: proxyUserId,
      password: proxyPassword,
    },
    command: "connect",
    destination: {
      host: destinationHost,
      port: destinationPort,
    },
    timeout: 10000, // 10s connection timeout for SOCKS
  });

  return info.socket;
}

module.exports = {
  createProxySocket
};