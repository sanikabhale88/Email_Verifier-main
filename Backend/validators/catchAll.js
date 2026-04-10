const dns = require("dns");
const { createProxySocket } = require("../utils/proxy");

// Generate random email ID
function randomEmail(domain) {
  const random = Math.random().toString(36).substring(2, 12);
  return `${random}@${domain}`;
}

async function smtpCheck(email, host) {
  let socket;
  try {
    socket = await createProxySocket(host);
    socket.setTimeout(20000);
  } catch (err) {
    console.error("CatchAll proxy error:", err.message);
    return false; // Connection/proxy error
  }

  return new Promise((resolve) => {
    let step = 0;
    let resolved = false;

    const done = (result) => {
      if (!resolved) {
        resolved = true;
        try {
          socket.end();
          socket.destroy();
        } catch (e) {}
        resolve(result);
      }
    };

    let buffer = "";

    socket.on("data", (data) => {
      buffer += data.toString();

      if (!buffer.endsWith("\r\n")) return;

      const lines = buffer.trim().split("\r\n");
      const msg = lines[lines.length - 1];
      buffer = "";

      if (step === 0 && msg.startsWith("220")) {
        socket.write("EHLO testdomain.com\r\n");
        step++;
      } 
      else if (step === 1 && msg.startsWith("250")) {
        socket.write("MAIL FROM:<verify@testdomain.com>\r\n");
        step++;
      } 
      else if (step === 2 && msg.startsWith("250")) {
        socket.write(`RCPT TO:<${email}>\r\n`);
        step++;
      } 
      else if (step === 3) {
        if (msg.startsWith("250")) {
          done(true);   // Server accepts email
        } else {
          done(false);  // Rejected
        }
      }
    });

    socket.on("error", () => done(false));
    socket.on("timeout", () => done(false));
    socket.on("close", () => done(false));
  });
}

exports.checkCatchAll = async (email) => {
  const domain = email.split("@")[1];

  // Step 1: Get MX
  const mxHost = await new Promise((resolve, reject) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses.length) reject(null);
      else resolve(addresses[0].exchange);
    });
  }).catch(() => null);

  if (!mxHost) return { catchAll: false };

  // Step 2: Test real mailbox
  const realCheck = await smtpCheck(email, mxHost);

  // Step 3: Test fake mailbox
  const fakeEmail = randomEmail(domain);
  const fakeCheck = await smtpCheck(fakeEmail, mxHost);

  // Step 4: Determine catch-all
  if (realCheck && fakeCheck) {
    return { catchAll: true };
  }

  return { catchAll: false };
};
