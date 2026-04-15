/* ----------------------------------------------------
   IMPORTS
---------------------------------------------------- */
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");

// DB Connection
const connectDB = require("./config/db");
const authMiddleware = require("./middleware/authMiddleware");
const User = require("./models/User");

// Email Validation Helpers
const { checkSyntax } = require("./validators/syntax");
const { checkDomain } = require("./validators/domain");
const { checkMx } = require("./validators/mx");
const { checkSMTP, prefetchMx } = require("./validators/smtp");
const { checkDisposable } = require("./validators/disposable");
const { checkRoleBased } = require("./validators/roleBased");
const { checkFreeEmail } = require("./validators/freeEmail");
const { checkCatchAll } = require("./validators/catchAll");
const { calculateScore } = require("./validators/scoring");

/* ----------------------------------------------------
   Load ENV + Connect DB
---------------------------------------------------- */
dotenv.config();
connectDB();

/* ----------------------------------------------------
   Initialize App
---------------------------------------------------- */
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("json spaces", 2);

/* ----------------------------------------------------
   Multer Config (CSV Upload)
---------------------------------------------------- */
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith(".csv")) cb(null, true);
    else cb(new Error("Only CSV files allowed"));
  },
});

/* ----------------------------------------------------
   ROUTES
---------------------------------------------------- */
const authRoutes = require("./routes/authRoutes");
const otpRoutes = require("./routes/otpRoutes");
const userRoutes = require("./routes/userRoutes");
const findEmailRoutes = require("./routes/findEmailRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/user", userRoutes);
app.use("/api", findEmailRoutes);

/* ----------------------------------------------------
   HELPER FUNCTIONS
---------------------------------------------------- */
function getBounceType(code) {
  if (!code) return null;
  const s = code.toString();
  if (s.startsWith("4")) return "Soft";
  if (s.startsWith("5")) return "Hard";
  return null;
}

function buildResult({
  email,
  syntaxValid,
  domainValid,
  mxValid,
  disposable,
  roleBased,
  freeEmail,
  catchAll,
  smtpInfo,
  score,
}) {
  const effectiveDomainValid = domainValid || mxValid;

  return {
    email,
    syntaxValid,
    domainValid: effectiveDomainValid,
    mxValid,
    disposable,
    roleBased,
    freeEmail,
    catchAll,
    smtp: {
      success: smtpInfo.smtp,
      code: smtpInfo.code || null,
      type: getBounceType(smtpInfo.code),
      message:
        smtpInfo.reason ||
        (smtpInfo.smtp ? "Valid email" : "Could not verify SMTP"),
    },
    score,

    // ✅ IMPROVED DELIVERABLE LOGIC
    deliverable: smtpInfo.smtp && !disposable,

    reason:
      smtpInfo.reason ||
      (smtpInfo.smtp ? "Valid email" : "Could not verify SMTP"),
  };
}

function invalidSyntaxResult(email) {
  return {
    email,
    syntaxValid: false,
    domainValid: false,
    mxValid: false,
    disposable: false,
    roleBased: false,
    freeEmail: false,
    catchAll: false,
    smtp: { success: false, code: null, type: null, message: "Invalid syntax" },
    score: 0,
    deliverable: false,
    reason: "Invalid syntax",
  };
}

/* ----------------------------------------------------
   EMAIL VALIDATION CORE
---------------------------------------------------- */
async function validateOne(email) {
  console.log("Checking email:", email);

  if (!checkSyntax(email)) return invalidSyntaxResult(email);

  const domain = email.split("@")[1];

  const [domainValid, mxInfo] = await Promise.all([
    checkDomain(domain),
    checkMx(domain),
  ]);

  const effectiveDomainValid = domainValid || mxInfo.valid;

  if (!effectiveDomainValid || !mxInfo.valid) {
    const disposable = checkDisposable(email);
    const roleBased = checkRoleBased(email);
    const freeEmail = checkFreeEmail(email);

    const score = calculateScore({
      syntaxValid: true,
      domainValid: effectiveDomainValid,
      mxValid: mxInfo.valid,
      smtp: false,
      disposable,
      roleBased,
      catchAll: false,
    });

    return buildResult({
      email,
      syntaxValid: true,
      domainValid: effectiveDomainValid,
      mxValid: mxInfo.valid,
      disposable,
      roleBased,
      freeEmail,
      catchAll: false,
      smtpInfo: { smtp: false, code: "No MX", reason: "Domain or MX invalid" },
      score,
    });
  }

  // ✅ SAFE SMTP + TIMEOUT
  let smtpInfo;

  try {
    const smtpPromise = checkSMTP(email);
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            smtp: false,
            code: "Timeout",
            reason: "SMTP timeout",
          }),
        20000
      )
    );

    smtpInfo = await Promise.race([smtpPromise, timeoutPromise]);
  } catch (err) {
    console.log("SMTP Error:", err.message);
    smtpInfo = {
      smtp: false,
      code: "Error",
      reason: "SMTP failed",
    };
  }

  console.log("SMTP Result:", smtpInfo);

  const catchAllInfo = await checkCatchAll(email);
  const disposable = checkDisposable(email);
  const roleBased = checkRoleBased(email);
  const freeEmail = checkFreeEmail(email);

  const score = calculateScore({
    syntaxValid: true,
    domainValid: effectiveDomainValid,
    mxValid: mxInfo.valid,
    smtp: smtpInfo.smtp,
    disposable,
    roleBased,
    catchAll: catchAllInfo.catchAll,
  });

  return buildResult({
    email,
    syntaxValid: true,
    domainValid: effectiveDomainValid,
    mxValid: mxInfo.valid,
    disposable,
    roleBased,
    freeEmail,
    catchAll: catchAllInfo.catchAll,
    smtpInfo,
    score,
  });
}

/* ----------------------------------------------------
   API ROUTES
---------------------------------------------------- */
app.post("/api/validate", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user || user.credits < 1) {
      return res.status(403).json({ error: "Insufficient credits" });
    }

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    user.credits -= 1;
    await user.save();

    const result = await validateOne(email);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Validation failed", detail: err.message });
  }
});

app.post("/api/validate/multiple", authMiddleware, async (req, res) => {
  const { emails } = req.body;
  if (!Array.isArray(emails))
    return res.status(400).json({ error: "emails must be an array" });

  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user || user.credits < emails.length) {
      return res.status(403).json({ error: "Insufficient credits" });
    }

    user.credits -= emails.length;
    await user.save();

    await prefetchMx(emails);
    const results = await Promise.all(emails.map(validateOne));
    res.json({ total: results.length, results });
  } catch (err) {
    res.status(500).json({ error: "Bulk validation failed", detail: err.message });
  }
});

app.post("/api/validate/csv", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "CSV file required" });

  const emails = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => {
      const email = row.email || row.Email || row.EMAIL;
      if (email) emails.push(email.trim());
    })
    .on("end", async () => {
      try {
        await prefetchMx(emails);
        const results = await Promise.all(emails.map(validateOne));
        res.json({ total: results.length, results });
      } catch (err) {
        res.status(500).json({ error: "CSV validation failed", detail: err.message });
      } finally {
        fs.unlink(req.file.path, () => {});
      }
    });
});

/* ----------------------------------------------------
   HEALTH CHECK
---------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Email Verifier API running",
  });
});

/* ----------------------------------------------------
   START SERVER
---------------------------------------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
