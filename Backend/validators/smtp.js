const dns = require("dns");
const net = require("net");
const { createProxySocket } = require("../utils/proxy");

// ── Use fast DNS servers ──
dns.setServers(["1.1.1.1", "8.8.8.8"]);

// ── MX Cache — same domain never looked up twice ──
const mxCache = new Map();

// ── SMTP Cache — same email never checked twice ──
const smtpCache = new Map();

// ── Prefetch all MX records in parallel before bulk validation ──
exports.prefetchMx = async (emails) => {
  const domains = [
    ...new Set(
      emails
        .filter((e) => e && e.includes("@") && e.split("@").length === 2)
        .map((e) => e.split("@")[1].toLowerCase())
    ),
  ];
  await Promise.all(domains.map(getMx));
};

// ── Cached MX lookup ──
function getMx(domain) {
  if (mxCache.has(domain)) return Promise.resolve(mxCache.get(domain));

  return new Promise((resolve) => {
    dns.resolveMx(domain, (err, addresses) => {
      if (err || !addresses || !addresses.length) {
        mxCache.set(domain, null);
        resolve(null);
      } else {
        const host = addresses.sort((a, b) => a.priority - b.priority)[0].exchange;
        mxCache.set(domain, host);
        resolve(host);
      }
    });
  });
}

// ── Bounce Code Classification ──
const classifyBounce = (code) => {
  if (!code) return "Unknown";

  const codeStr = code.toString().trim();
  const mainDigit = codeStr[0];

  if (codeStr.startsWith("5")) return "Hard";
  if (codeStr.startsWith("4")) return "Soft";

  return "Unknown";
};

// ── SMTP check ──
async function smtpCheck(email, mxHost) {
  try {
    // 🔥 create socket via direct connection (bypass proxy to fix port 25 blocked)
    const socket = net.createConnection(25, mxHost);
    socket.setTimeout(20000);

    return new Promise((resolve) => {
      let step = 0;
      let resolved = false;

      let finalResult = {
        smtp: false,
        code: "Unknown",
        bounceType: "Unknown",
        reason: "Unknown error",
      };

      const done = (result) => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
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

        console.log("SMTP Response:", msg);

        const codeMatch = msg.match(/^(\d{3})(?: |$)/);
        if (!codeMatch) return;

        // Step 1: Greeting
        if (step === 0 && msg.startsWith("220")) {
          socket.write("EHLO yourdomain.com\r\n");
          step++;
          return;
        }

        // Step 2: MAIL FROM
        if (step === 1 && msg.startsWith("250")) {
          socket.write("MAIL FROM:<verify@yourdomain.com>\r\n");
          step++;
          return;
        }

        // Step 3: RCPT TO
        if (step === 2 && msg.startsWith("250")) {
          socket.write(`RCPT TO:<${email}>\r\n`);
          step++;
          return;
        }

        // Step 4: Final response
        if (step === 3) {
          const code = codeMatch[1];
          const bounceType = classifyBounce(code);

          if (code.startsWith("250")) {
            finalResult = {
              smtp: true,
              code,
              bounceType: "None",
              reason: "OK",
            };
          } else if (
            code.startsWith("451") ||
            code.startsWith("421") ||
            code.startsWith("450")
          ) {
            finalResult = {
              smtp: true,
              code,
              bounceType: "Soft",
              reason: "Temporary accept (greylisted)",
            };
          } else {
            finalResult = {
              smtp: false,
              code,
              bounceType,
              reason: msg.trim(),
            };
          }

          socket.end();
        }
      });

      socket.on("timeout", () =>
        done({
          smtp: false,
          code: "Timeout",
          bounceType: "Soft",
          reason: "SMTP connection timeout",
        })
      );

      socket.on("error", (err) =>
        done({
          smtp: false,
          code: "Connection Error",
          bounceType: "Soft",
          reason: err.message || "SMTP connection error",
        })
      );

      socket.on("close", () => done(finalResult));
    });

  } catch (err) {
    return {
      smtp: false,
      code: "Proxy Error",
      bounceType: "Soft",
      reason: err.message || "SOCKS proxy connection failed",
    };
  }
}

// ── Main function ──
exports.checkSMTP = async (email) => {
  if (!email || !email.includes("@")) {
    return {
      smtp: false,
      code: "Invalid",
      bounceType: "Hard",
      reason: "Invalid email format",
    };
  }

  const parts = email.split("@");
  if (parts.length !== 2 || !parts[1]) {
    return {
      smtp: false,
      code: "Invalid",
      bounceType: "Hard",
      reason: "Invalid email format",
    };
  }

  const domain = parts[1].toLowerCase();

  if (smtpCache.has(email)) return smtpCache.get(email);

  const mxHost = await getMx(domain);

  if (!mxHost) {
    const result = {
      smtp: false,
      code: "No MX",
      bounceType: "Hard",
      reason: "No MX server found",
    };
    smtpCache.set(email, result);
    return result;
  }

  const result = await smtpCheck(email, mxHost);
  smtpCache.set(email, result);
  return result;
};
