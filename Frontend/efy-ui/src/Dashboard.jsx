import React, { useState, useRef } from "react";
import WelcomeModal from "./WelcomeModal";
import Creditbalancepage from "./Creditbalancepage";
import CreditBillingPage from "./CreditBillingPage";
import "./Dashboard.css";
import {
  FaSearch, FaEnvelope, FaCoins, FaSignOutAlt,
  FaUser, FaBell, FaFileAlt, FaCode, FaCloudUploadAlt,
  FaDownload, FaTrash, FaSync, FaExclamationTriangle, FaQuestion,
  FaPlug, FaChevronDown, FaChevronUp, FaCheckCircle, FaTimes, FaCloudDownloadAlt,
} from "react-icons/fa";
import { validateSingleEmail, validateMultipleEmails } from "./services/emailApi";

// ── Donut Chart Component ──
function DonutChart({ valid, invalid, catchAll, unknown, total }) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const r = 52;
  const stroke = 18;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { value: valid,    color: "#4ade80" },
    { value: invalid,  color: "#f87171" },
    { value: catchAll, color: "#fbbf24" },
    { value: unknown,  color: "#cbd5e1" },
  ];

  let offset = 0;
  const arcs = segments.map((seg) => {
    const pct  = total > 0 ? seg.value / total : 0;
    const dash = pct * circumference;
    const gap  = circumference - dash;
    const arc  = { ...seg, dash, gap, offset };
    offset += dash;
    return arc;
  });

  const validPct = total > 0 ? Math.round((valid / total) * 100) : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {arcs.map((arc, i) => (
        <circle
          key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={arc.color} strokeWidth={stroke}
          strokeDasharray={`${arc.dash} ${arc.gap}`}
          strokeDashoffset={-arc.offset}
          style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dasharray 0.8s ease" }}
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="700" fill="#1e293b">{validPct}%</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#94a3b8">Valid</text>
    </svg>
  );
}

// ── Progress Bar ──
function ProgressBar({ progress }) {
  return (
    <div className="progress-bar-wrap">
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      {progress < 100 && <span className="progress-label">{progress}%</span>}
    </div>
  );
}

// ── Determine result type ──
function getResultType(result) {
  if (!result) return null;
  if (!result.syntaxValid) return "unknown";
  if (!result.mxValid)     return "unknown";
  if (result.catchAll)     return "catchall";
  if (result.deliverable)  return "valid";
  return "invalid";
}

// ── Single Result Card ──
function ResultCard({ result }) {
  const type = getResultType(result);
  const verificationTime = result.verificationTime || null;

  const typeConfig = {
    valid: {
      headerClass: "valid-bg", iconClass: "valid-icon", iconEl: <span>✓</span>,
      title: "Valid Email", scoreColor: "#1a3c34", titleColor: "#1a3c34",
      recommendationBorderColor: "#2d6a4f", recommendationTitleColor: "#2d6a4f",
      recommendationText: (<>This email is <strong style={{ color: "#2d6a4f" }}>SAFE TO USE</strong>. It's verified and deliverable.</>),
    },
    invalid: {
      headerClass: "invalid-bg", iconClass: "invalid-icon", iconEl: <span>✗</span>,
      title: "Invalid Email", scoreColor: "#7f1d1d", titleColor: "#7f1d1d",
      recommendationBorderColor: "#c0392b", recommendationTitleColor: "#c0392b",
      recommendationText: (<>This email <strong style={{ color: "#c0392b" }}>SHOULD NOT BE USED.</strong> It's invalid or doesn't exist.</>),
    },
    catchall: {
      headerClass: "catchall-bg", iconClass: "catchall-icon", iconEl: <FaExclamationTriangle />,
      title: "Catch-All Domain", scoreColor: "#92400e", titleColor: "#92400e",
      recommendationBorderColor: "#d97706", recommendationTitleColor: "#d97706",
      recommendationText: (<>This domain accepts <strong style={{ color: "#d97706" }}>ALL EMAILS</strong>. The address may or may not exist — use with caution.</>),
    },
    unknown: {
      headerClass: "unknown-bg", iconClass: "unknown-icon", iconEl: <FaQuestion />,
      title: "Unknown Email", scoreColor: "#475569", titleColor: "#475569",
      recommendationBorderColor: "#94a3b8", recommendationTitleColor: "#64748b",
      recommendationText: (<>This email <strong style={{ color: "#64748b" }}>COULD NOT BE VERIFIED.</strong> The domain or MX records are unreachable. Avoid using it.</>),
    },
  };

  const cfg = typeConfig[type] || typeConfig.valid;

  return (
    <div className="result-card-new">
      <div className={`result-top ${cfg.headerClass}`}>
        <div className="result-top-left">
          <div className={`result-icon ${cfg.iconClass}`}>{cfg.iconEl}</div>
          <div>
            <h2 className="result-title" style={{ color: cfg.titleColor }}>{cfg.title}</h2>
            <p className="result-email">{result.email}</p>
          </div>
        </div>
        <div className="result-top-right">
          <span className="result-score" style={{ color: cfg.scoreColor }}>{result.score}%</span>
          <p className="result-score-label" style={{ color: cfg.scoreColor }}>Quality Score</p>
        </div>
      </div>
      <div className="result-middle">
        <div className="result-section">
          <p className="result-section-title">VERIFICATION DETAILS</p>
          <div className="result-row">
            <span className="result-key">Domain</span>
            <span className="result-value">{result.email.split("@")[1]}</span>
          </div>
          <div className="result-row">
            <span className="result-key">MX Records Found</span>
            <span className={`result-check ${result.mxValid ? "check-yes" : "check-no"}`}>
              {result.mxValid ? "✓ Yes" : "✗ Failed"}
            </span>
          </div>
          <div className="result-row">
            <span className="result-key">SMTP Check</span>
            <span className={`result-check ${result.smtp?.success ? "check-yes" : "check-no"}`}>
              {result.smtp?.success ? "✓ Yes" : "✗ Failed"}
            </span>
          </div>
        </div>
        <div className="result-divider" />
        <div className="result-section">
          <p className="result-section-title">ADDITIONAL INFO</p>
          <div className="result-row">
            <span className="result-key">Disposable Email</span>
            <span className={`result-check ${!result.disposable ? "check-yes" : "check-no"}`}>
              {result.disposable ? "✗ Yes" : "✓ No"}
            </span>
          </div>
          <div className="result-row">
            <span className="result-key">Free Provider</span>
            <span className={`result-check ${!result.freeEmail ? "check-yes" : "check-no"}`}>
              {result.freeEmail ? "✗ Yes" : "✓ No"}
            </span>
          </div>
          <div className="result-row">
            <span className="result-key">Verification Time</span>
            <span className="result-value">
              {verificationTime ? `${verificationTime}s` : (result.catchAll ? "1.0s" : "1.3s")}
            </span>
          </div>
        </div>
      </div>
      <div className="result-bottom" style={{ borderTop: `2px solid ${cfg.recommendationBorderColor}20` }}>
        <h3 className="recommendation-title" style={{ color: cfg.recommendationTitleColor }}>Recommendation</h3>
        <p className="recommendation-text">{cfg.recommendationText}</p>
      </div>
    </div>
  );
}

// ── Live Result Row ──
function LiveResultRow({ result, index }) {
  const type = getResultType(result);
  const typeColors = { valid: "#22c55e", invalid: "#ef4444", catchall: "#f59e0b", unknown: "#94a3b8" };
  const typeLabels = { valid: "Valid", invalid: "Invalid", catchall: "Catch-all", unknown: "Unknown" };
  const getScoreColor = (s) => s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <tr className="stream-row-animate">
      <td>{index + 1}</td>
      <td style={{ fontWeight: 500 }}>{result.email}</td>
      <td><span className="score-pill" style={{ background: typeColors[type] || "#94a3b8" }}>{typeLabels[type] || "Unknown"}</span></td>
      <td><span className="score-pill" style={{ background: getScoreColor(result.score) }}>{result.score}%</span></td>
      <td style={{ color: result.mxValid ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{result.mxValid ? "✓" : "✗"}</td>
      <td style={{ color: result.smtp?.success ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{result.smtp?.success ? "✓" : "✗"}</td>
    </tr>
  );
}

// ════════════════════════════════════════════
// FILE UPLOAD TAB COMPONENT
// ════════════════════════════════════════════
function FileUploadTab({ credits, setCredits }) {
  const fileInputRef = useRef(null);
  const [isDragOver,    setIsDragOver]    = useState(false);
  const [showModal,     setShowModal]     = useState(false);
  const [uploadedFile,  setUploadedFile]  = useState(null);
  const [parsedEmails,  setParsedEmails]  = useState([]);
  const [dedupeEnabled, setDedupeEnabled] = useState(true);

  // Verification states
  const [verifying,      setVerifying]      = useState(false);
  const [fileProgress,   setFileProgress]   = useState(0);
  const [fileResults,    setFileResults]    = useState([]); // list of completed file runs
  const [activeStream,   setActiveStream]   = useState([]); // currently verifying
  const [showResultTable, setShowResultTable] = useState(null); // index of expanded result

  // ── Parse file → extract emails ──
  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      let emails = [];

      if (file.name.endsWith(".csv")) {
        // CSV: look for email column or treat each cell as email
        const lines = text.split("\n").filter(l => l.trim());
        lines.forEach((line) => {
          const cells = line.split(",");
          cells.forEach((cell) => {
            const val = cell.trim().replace(/"/g, "");
            if (val.includes("@") && val.includes(".")) emails.push(val);
          });
        });
      } else {
        // .txt: split by newline/comma/semicolon
        emails = text
          .split(/[\n,;\s]+/)
          .map(e => e.trim().replace(/"/g, ""))
          .filter(e => e.includes("@") && e.includes("."));
      }

      if (dedupeEnabled) {
        emails = [...new Set(emails)];
      }

      setParsedEmails(emails);
      setUploadedFile(file);
      setShowModal(true);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file);
    e.target.value = ""; // reset so same file can be re-selected
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  // ── Start verification from modal ──
  const handleStartVerification = async () => {
    if (!parsedEmails.length) return;
    setShowModal(false);
    setVerifying(true);
    setFileProgress(0);
    setActiveStream([]);

    const emails = parsedEmails;
    let completed = [];

    for (let i = 0; i < emails.length; i++) {
      try {
        const data = await validateSingleEmail(emails[i]);
        completed = [...completed, data];
        setCredits(prev => Math.max(0, prev - 1));
      } catch {
        completed = [...completed, {
          email: emails[i], error: true, score: 0,
          syntaxValid: false, mxValid: false, deliverable: false,
          catchAll: false, disposable: false, freeEmail: false,
          smtp: { success: false },
        }];
      }
      setActiveStream([...completed]);
      setFileProgress(Math.round(((i + 1) / emails.length) * 100));
    }

    // Build summary
    const valid    = completed.filter(r => r.deliverable && !r.catchAll).length;
    const invalid  = completed.filter(r => r.syntaxValid && r.mxValid && !r.catchAll && !r.deliverable).length;
    const catchAll = completed.filter(r => r.catchAll).length;
    const unknown  = completed.filter(r => !r.syntaxValid || !r.mxValid).length;
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2,"0")}-${(now.getMonth()+1).toString().padStart(2,"0")}-${now.getFullYear()}`;

    setFileResults(prev => [...prev, {
      id: Date.now(),
      fileName: uploadedFile?.name || "Uploaded File",
      date: dateStr,
      results: completed,
      total: completed.length,
      valid, invalid, catchAll, unknown,
    }]);

    setVerifying(false);
    setActiveStream([]);
    setUploadedFile(null);
    setParsedEmails([]);
  };

  // ── Download CSV for a result set ──
  const handleDownload = (run) => {
    const headers = "Email,Deliverable,Score,MX,SMTP,Disposable,FreeEmail,CatchAll,Type\n";
    const rows = run.results.map(r => {
      const type = getResultType(r);
      return `${r.email},${r.deliverable},${r.score},${r.mxValid},${r.smtp?.success},${r.disposable},${r.freeEmail},${r.catchAll},${type}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${run.fileName}-results.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRun = (id) => {
    setFileResults(prev => prev.filter(r => r.id !== id));
    if (showResultTable === id) setShowResultTable(null);
  };

  const getScoreColor = (s) => s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="file-upload-tab">

      {/* ── Drop Zone (always visible unless verifying) ── */}
      {!verifying && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.xlsx"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <div
            className={`fu-dropzone ${isDragOver ? "dragover" : ""}`}
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="fu-check-icon"><FaCloudUploadAlt /></div>
            <p className="fu-drop-title">
              {isDragOver ? "Drop it here!" : "Drop your file here or click to browse"}
            </p>
            <p className="fu-drop-sub">Supports .csv, .txt — emails parsed automatically</p>
            <button
              className="fu-plus-btn"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
            >+</button>
          </div>
        </>
      )}

      {/* ── MODAL: shown after file parsed, before verification starts ── */}
      {showModal && uploadedFile && (
        <div className="fu-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="fu-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fu-modal-close" onClick={() => setShowModal(false)}><FaTimes /></button>
            <h2 className="fu-modal-title">Email Found</h2>

            {/* Email count card */}
            <div className="fu-email-found-card">
              <div className="fu-email-found-top">
                <FaEnvelope className="fu-modal-envelope" />
                <span className="fu-email-count-big">{parsedEmails.length}</span>
              </div>
              <p className="fu-email-found-label">Emails Found</p>
              <div className="fu-filename-bar">
                📄 {uploadedFile.name}
              </div>
            </div>

            {/* Credits info */}
            <div className="fu-modal-row">
              <div>
                <p className="fu-modal-credits-label">Credits Required</p>
                <p className="fu-modal-avail">Available: <strong>{credits}</strong></p>
                {credits < parsedEmails.length && (
                  <p className="fu-modal-need" style={{ color: "#ef4444" }}>
                    ⚠ Need {parsedEmails.length - credits} more credits
                  </p>
                )}
              </div>
              <span className="fu-credits-needed">{parsedEmails.length}</span>
            </div>

            {/* Deduplicate toggle */}
            <div className="fu-modal-row" style={{ marginTop: 16 }}>
              <span style={{ fontSize: 14, color: "#1e293b", fontWeight: 500 }}>
                Remove duplicates
              </span>
              <label className="fu-toggle">
                <input
                  type="checkbox"
                  checked={dedupeEnabled}
                  onChange={(e) => {
                    setDedupeEnabled(e.target.checked);
                    // re-parse with new dedupe setting
                    if (uploadedFile) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const text = ev.target.result;
                        let emails = text
                          .split(/[\n,;\s]+/)
                          .map(em => em.trim().replace(/"/g, ""))
                          .filter(em => em.includes("@") && em.includes("."));
                        if (e.target.checked) emails = [...new Set(emails)];
                        setParsedEmails(emails);
                      };
                      reader.readAsText(uploadedFile);
                    }
                  }}
                />
                <span className="fu-toggle-slider" />
              </label>
            </div>

            <button
              className="fu-modal-start-btn"
              disabled={credits < parsedEmails.length}
              onClick={handleStartVerification}
              style={credits < parsedEmails.length ? { opacity: 0.5, cursor: "not-allowed" } : {}}
            >
              {credits < parsedEmails.length ? "Insufficient Credits" : "Start Verification →"}
            </button>
          </div>
        </div>
      )}

      {/* ── LIVE VERIFICATION PROGRESS ── */}
      {verifying && (
        <div className="file-results-page">
          <div className="file-results-header">
            <h3 className="file-results-title">Verifying Emails...</h3>
          </div>
          <ProgressBar progress={fileProgress} />
          <p className="validating-text" style={{ marginBottom: 16 }}>
            ⚡ {activeStream.length} of {parsedEmails.length} verified
          </p>

          {activeStream.length > 0 && (
            <div className="bulk-table-wrap stream-table-wrap" style={{ marginTop: 16 }}>
              <table className="bulk-table">
                <thead>
                  <tr>
                    <th>#</th><th>Email</th><th>Type</th><th>Score</th><th>MX</th><th>SMTP</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStream.map((r, i) => (
                    <LiveResultRow key={i} result={r} index={i} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── COMPLETED FILE RESULTS LIST ── */}
      {fileResults.length > 0 && !verifying && (
        <div className="file-result-list" style={{ marginTop: 24 }}>
          {fileResults.map((run) => (
            <div key={run.id} className="file-result-card">

              {/* Left: name + count */}
              <div className="frc-left">
                <p className="frc-list-name">{run.fileName}</p>
                <div className="frc-email-count">
                  <FaEnvelope className="frc-envelope" />
                  <div>
                    <span className="frc-count">{run.total}</span>
                    <span className="frc-label">Emails</span>
                  </div>
                </div>
                <p className="frc-id">{run.date}</p>
              </div>

              {/* Donut */}
              <div className="frc-chart">
                <DonutChart
                  valid={run.valid} invalid={run.invalid}
                  catchAll={run.catchAll} unknown={run.unknown}
                  total={run.total}
                />
              </div>

              {/* Legend */}
              <div className="frc-legend">
                {[
                  { label: "Valid",     count: run.valid,    color: "#4ade80" },
                  { label: "Invalid",   count: run.invalid,  color: "#f87171" },
                  { label: "Catch-all", count: run.catchAll, color: "#fbbf24" },
                  { label: "Unknown",   count: run.unknown,  color: "#cbd5e1" },
                ].map((item, i) => (
                  <div className="frc-legend-row" key={i}>
                    <span className="frc-dot" style={{ background: item.color }} />
                    <span className="frc-legend-label">{item.label}</span>
                    <span className="frc-legend-count">{item.count}</span>
                    <span className="frc-legend-pct">
                      {run.total > 0 ? `${Math.round((item.count / run.total) * 100)}%` : "0%"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="frc-actions">
                <button className="frc-action-btn frc-download" onClick={() => handleDownload(run)}>
                  <FaDownload /><span>Download</span>
                </button>
                <button
                  className="frc-action-btn"
                  style={{ color: "#0fa3b1" }}
                  onClick={() => setShowResultTable(showResultTable === run.id ? null : run.id)}
                >
                  <FaFileAlt />
                  <span>{showResultTable === run.id ? "Hide" : "View"}</span>
                </button>
                <button className="frc-action-btn frc-delete" onClick={() => handleDeleteRun(run.id)}>
                  <FaTrash /><span>Delete</span>
                </button>
              </div>

              {/* Expandable detail table */}
              {showResultTable === run.id && (
                <div style={{ width: "100%", marginTop: 16 }}>
                  <div className="bulk-table-wrap stream-table-wrap">
                    <table className="bulk-table">
                      <thead>
                        <tr><th>#</th><th>Email</th><th>Type</th><th>Score</th><th>MX</th><th>SMTP</th></tr>
                      </thead>
                      <tbody>
                        {run.results.map((r, i) => (
                          <LiveResultRow key={i} result={r} index={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add more button if results exist */}
      {fileResults.length > 0 && !verifying && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="fu-add-more-btn" onClick={() => fileInputRef.current.click()}>
            + Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// INTEGRATION TAB COMPONENT
// ════════════════════════════════════════════
const ALL_INTEGRATIONS = [
  { name: "Zapier",          color: "#FF4A00", textColor: "white", abbr: "ZP", category: "Automation",  desc: "Connect 5000+ apps" },
  { name: "HubSpot",         color: "#FF7A59", textColor: "white", abbr: "HS", category: "CRM",         desc: "Marketing & sales CRM" },
  { name: "Salesforce",      color: "#00A1E0", textColor: "white", abbr: "SF", category: "CRM",         desc: "Enterprise CRM platform" },
  { name: "Mailchimp",       color: "#FFE01B", textColor: "#1e293b", abbr: "MC", category: "Email",    desc: "Email marketing platform" },
  { name: "ActiveCampaign",  color: "#356AE6", textColor: "white", abbr: "AC", category: "Email",      desc: "Marketing automation" },
  { name: "Make",            color: "#6D00CC", textColor: "white", abbr: "MK", category: "Automation", desc: "Visual automation builder" },
  { name: "Klaviyo",         color: "#000000", textColor: "white", abbr: "KL", category: "Email",      desc: "eCommerce email platform" },
  { name: "SendGrid",        color: "#1A82E2", textColor: "white", abbr: "SG", category: "Email",      desc: "Transactional email API" },
  { name: "Pipedrive",       color: "#1C946B", textColor: "white", abbr: "PD", category: "CRM",        desc: "Sales pipeline CRM" },
  { name: "Intercom",        color: "#286EFA", textColor: "white", abbr: "IC", category: "Support",    desc: "Customer messaging" },
  { name: "Zendesk",         color: "#03363D", textColor: "white", abbr: "ZD", category: "Support",    desc: "Customer support platform" },
  { name: "Notion",          color: "#1e293b", textColor: "white", abbr: "NO", category: "Productivity", desc: "All-in-one workspace" },
];

function IntegrationTab() {
  const [showAll,    setShowAll]    = useState(false);
  const [connected,  setConnected]  = useState({});
  const [connecting, setConnecting] = useState({});

  const visible = showAll ? ALL_INTEGRATIONS : ALL_INTEGRATIONS.slice(0, 6);

  const handleConnect = async (name) => {
    if (connected[name]) {
      // Disconnect
      setConnected(prev => { const n = { ...prev }; delete n[name]; return n; });
      return;
    }
    // Simulate connecting
    setConnecting(prev => ({ ...prev, [name]: true }));
    await new Promise(res => setTimeout(res, 1200));
    setConnecting(prev => { const n = { ...prev }; delete n[name]; return n; });
    setConnected(prev => ({ ...prev, [name]: true }));
  };

  return (
    <div className="integration-tab">
      <div className="integration-grid">
        {visible.map((intg, i) => (
          <div className="integration-card" key={i}>
            <div className="integration-logo-wrap" style={{ background: intg.color }}>
              <div className="integration-logo-fallback" style={{ color: intg.textColor }}>
                {intg.abbr}
              </div>
            </div>
            <div className="integration-info">
              <span className="integration-name">{intg.name}</span>
              <span className="integration-category">{intg.desc}</span>
              <button
                className={`integration-connect-btn ${connected[intg.name] ? "connected" : ""}`}
                onClick={() => handleConnect(intg.name)}
                disabled={connecting[intg.name]}
              >
                {connecting[intg.name]
                  ? "Connecting..."
                  : connected[intg.name]
                  ? "✓ Connected"
                  : "Connect"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="show-more-btn" onClick={() => setShowAll(prev => !prev)}>
        {showAll ? "Show Less" : `Show More (${ALL_INTEGRATIONS.length - 6} more)`}
        {showAll ? <FaChevronUp className="show-more-icon" /> : <FaChevronDown className="show-more-icon" />}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════
function Dashboard() {
  const [activeMenu, setActiveMenu] = useState("verification");
  const [activeTab,  setActiveTab]  = useState("single");

  // Single email
  const [emailInput, setEmailInput] = useState("");
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // Bulk / paste list
  const [listInput,        setListInput]        = useState("");
  const [bulkLoading,      setBulkLoading]      = useState(false);
  const [bulkProgress,     setBulkProgress]     = useState(0);
  const [bulkDone,         setBulkDone]         = useState(false);
  const [bulkResults,      setBulkResults]      = useState(null);
  const [bulkError,        setBulkError]        = useState("");
  const [listDate,         setListDate]         = useState("");
  const [streamingResults, setStreamingResults] = useState([]);
  const [showTable,        setShowTable]        = useState(false);

  // Credits
  const [credits, setCredits] = useState(100000);

  // Billing page
  const [showBillingPage, setShowBillingPage] = useState(false);

  // ── Single Verify ──
  const handleVerify = async () => {
    if (!emailInput.trim()) return setError("Please enter an email");
    setLoading(true); setError(""); setResult(null);
    try {
      const data = await validateSingleEmail(emailInput.trim());
      setResult(data);
      setCredits(prev => Math.max(0, prev - 1));
    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    }
    setLoading(false);
  };

  // ── Bulk Verify (streaming) ──
  const handleBulkVerify = async () => {
    const emails = listInput.split(/[\n,]+/).map(e => e.trim()).filter(Boolean);
    if (!emails.length) return setBulkError("Please enter at least one email");

    setBulkLoading(true); setBulkError(""); setBulkDone(false);
    setBulkResults(null); setBulkProgress(0); setStreamingResults([]); setShowTable(true);

    let completed = [];

    for (let i = 0; i < emails.length; i++) {
      try {
        const data = await validateSingleEmail(emails[i]);
        completed = [...completed, data];
        setCredits(prev => Math.max(0, prev - 1));
      } catch {
        completed = [...completed, {
          email: emails[i], error: true, score: 0,
          syntaxValid: false, mxValid: false, deliverable: false,
          catchAll: false, disposable: false, freeEmail: false, smtp: { success: false },
        }];
      }

      const valid    = completed.filter(r => r.deliverable && !r.catchAll).length;
      const catchAll = completed.filter(r => r.catchAll).length;
      const unknown  = completed.filter(r => !r.syntaxValid || !r.mxValid).length;
      const invalid  = completed.filter(r => r.syntaxValid && r.mxValid && !r.catchAll && !r.deliverable).length;

      setBulkProgress(Math.round(((i + 1) / emails.length) * 100));
      setStreamingResults([...completed]);
      setBulkResults({ results: completed, valid, invalid, catchAll, unknown, total: emails.length });
    }

    setBulkDone(true);
    setBulkLoading(false);
    const now = new Date();
    setListDate(`${now.getDate().toString().padStart(2,"0")}-${(now.getMonth()+1).toString().padStart(2,"0")}-${now.getFullYear()}`);
  };

  // ── Download CSV (paste list) ──
  const handleDownload = () => {
    if (!bulkResults) return;
    const headers = "Email,Deliverable,Score,MX,SMTP,Disposable,FreeEmail,CatchAll,Type\n";
    const rows = bulkResults.results.map(r => {
      const type = getResultType(r);
      return `${r.email},${r.deliverable},${r.score},${r.mxValid},${r.smtp?.success},${r.disposable},${r.freeEmail},${r.catchAll},${type}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "email-results.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setBulkResults(null); setBulkDone(false); setBulkProgress(0);
    setListInput(""); setBulkError(""); setStreamingResults([]); setShowTable(false);
  };

  const totalEmailCount = listInput.split(/[\n,]+/).map(e => e.trim()).filter(Boolean).length;

  return (
    <div className="dashboard">
      <div className="dashboard-bg">
        <div className="bg-orb orb1" /><div className="bg-orb orb2" />
        <div className="bg-orb orb3" /><div className="bg-orb orb4" />
        <div className="bg-wave" />
      </div>

      {showBillingPage ? (
        <CreditBillingPage
          credits={credits} userName="Kamlesh Surana" userEmail="kamlesh@sphurti.net"
          onClose={() => setShowBillingPage(false)}
          onBuyCredits={() => { setCredits(prev => prev + 100); setShowBillingPage(false); }}
        />
      ) : (
        <div className="sidebar">
          <div className="logo-container"><h2 className="logo">E-fy</h2></div>
          <div className="user-profile">
            <div className="avatar"><FaUser /></div>
            <div className="user-info"><h4>Kamlesh Surana</h4></div>
          </div>
          <div className="menu">
            {[
              { key: "find",         icon: <FaSearch />,   label: "Find Email" },
              { key: "verification", icon: <FaEnvelope />, label: "Email Verification" },
              { key: "credits",      icon: <FaCoins />,    label: "Credit Balance" },
            ].map(item => (
              <div
                key={item.key}
                className={`menu-item ${activeMenu === item.key ? "active" : ""}`}
                onClick={() => setActiveMenu(item.key)}
              >
                <span className="menu-icon">{item.icon}</span><span>{item.label}</span>
              </div>
            ))}
          </div>
          {activeMenu !== "credits" && (
            <div className="credit-section">
              <div className="credit-box">
                <div className="credit-header"><FaCoins className="credit-icon" /><span>Credits</span></div>
                <div className="credit-amount"><span className="amount">{credits}</span></div>
                <button className="buy-credits-btn" onClick={() => setShowBillingPage(true)}>₹ Buy Credits</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!showBillingPage && (
        <div className="main">
          <div className={`header ${activeMenu === "credits" ? "header-credits" : ""}`}>
            <div className="header-left">
              {activeMenu !== "credits" && <h2>Welcome back, Kamlesh!</h2>}
            </div>
            <div className="header-right">
              {activeMenu !== "credits" && (
                <div className="notification-badge"><FaBell /><span className="badge">3</span></div>
              )}
              {activeMenu === "credits" ? (
                <div className="cb-header-user">
                  <div className="cb-header-avatar"><FaUser /></div>
                  <span className="cb-header-name">Kamlesh Surana</span>
                  <FaChevronDown style={{ color: "white", fontSize: 12 }} />
                </div>
              ) : (
                <button className="logout-btn"><FaSignOutAlt /> Logout</button>
              )}
            </div>
          </div>

          {activeMenu === "credits" && (
            <Creditbalancepage
              credits={credits} userName="Kamlesh Surana" userEmail="kamlesh@sphurti.net"
              onBuyCredits={() => setShowBillingPage(true)}
            />
          )}

          {activeMenu !== "credits" && (
            <div className="content-card">
              {/* TABS */}
              <div className="tabs-container">
                {[
                  { key: "single",      icon: <FaEnvelope />,      label: "Single Email" },
                  { key: "list",        icon: <FaFileAlt />,        label: "Paste Email List" },
                  { key: "file",        icon: <FaCloudUploadAlt />, label: "File Upload" },
                  { key: "integration", icon: <FaPlug />,           label: "Integration" },
                  { key: "api",         icon: <FaCode />,           label: "API" },
                ].map(tab => (
                  <button
                    key={tab.key}
                    className={`tab ${activeTab === tab.key ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="content-area">

                {/* ════ SINGLE EMAIL ════ */}
                {activeTab === "single" && (
                  <div className="verification-content">
                    <h3>Add Email</h3>
                    <div className="input-container">
                      <input
                        type="email" className="email-input"
                        placeholder="Enter email to verify..."
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                      />
                      <button className="verify-btn" onClick={handleVerify} disabled={loading}>
                        {loading ? "Checking..." : "Verify"}
                      </button>
                    </div>
                    {error && <p style={{ color: "#ef4444", marginTop: 12, fontSize: 14 }}>❌ {error}</p>}
                    {result && <ResultCard result={result} />}
                  </div>
                )}

                {/* ════ PASTE LIST ════ */}
                {activeTab === "list" && (
                  <div className="bulk-tab">
                    {!bulkLoading && !bulkDone && (
                      <div className="bulk-input-area">
                        <h3>Enter Your Email List</h3>
                        <textarea
                          className="bulk-textarea"
                          placeholder="Ex. abc@gmail.com, xyz@yahoo.com,..."
                          value={listInput}
                          onChange={(e) => setListInput(e.target.value)}
                          rows="6"
                        />
                        {bulkError && <p style={{ color: "#ef4444", fontSize: 14, marginBottom: 10 }}>❌ {bulkError}</p>}
                        <div style={{ textAlign: "center" }}>
                          <button className="start-verify-btn" onClick={handleBulkVerify}>Start Verification</button>
                        </div>
                      </div>
                    )}

                    {(bulkLoading || bulkDone) && (
                      <div className="bulk-results-area">
                        <div className="bulk-results-header">
                          <h3>{bulkDone ? "Validation Complete ✓" : "Verifying Emails..."}</h3>
                          <button className="refresh-btn" onClick={handleReset}><FaSync /></button>
                        </div>
                        <ProgressBar progress={bulkProgress} />
                        <p className="validating-text" style={{ marginBottom: 16 }}>
                          {bulkDone
                            ? `✅ All ${streamingResults.length} emails verified`
                            : `⚡ Verifying ${streamingResults.length} of ${totalEmailCount}...`}
                        </p>

                        {bulkResults && (
                          <div className="bulk-summary-card">
                            <div className="summary-left">
                              <h4 className="list-title">{bulkDone ? `List: ${listDate}` : "Live Results"}</h4>
                              <div className="summary-email-count">
                                <FaEnvelope className="summary-icon" />
                                <div>
                                  <span className="count-number">{streamingResults.length}</span>
                                  <span className="count-label">{bulkDone ? "Emails" : `/ ${totalEmailCount}`}</span>
                                </div>
                              </div>
                            </div>
                            <div className="summary-chart">
                              <DonutChart
                                valid={bulkResults.valid} invalid={bulkResults.invalid}
                                catchAll={bulkResults.catchAll} unknown={bulkResults.unknown}
                                total={streamingResults.length}
                              />
                            </div>
                            <div className="summary-legend">
                              {[
                                { label: "Valid Emails",     count: bulkResults.valid,    color: "#4ade80" },
                                { label: "Invalid Emails",   count: bulkResults.invalid,  color: "#f87171" },
                                { label: "Catch-all Emails", count: bulkResults.catchAll, color: "#fbbf24" },
                                { label: "Unknown",          count: bulkResults.unknown,  color: "#cbd5e1" },
                              ].map((item, i) => (
                                <div className="legend-item" key={i}>
                                  <span className="legend-dot" style={{ background: item.color }} />
                                  <span className="legend-label">{item.label}</span>
                                  <span className="legend-count">{item.count}</span>
                                  <span className="legend-pct">
                                    {streamingResults.length > 0 ? `${Math.round((item.count / streamingResults.length) * 100)}%` : "0%"}
                                  </span>
                                </div>
                              ))}
                            </div>
                            {bulkDone && (
                              <div className="summary-actions">
                                <button className="action-btn download-btn" onClick={handleDownload}><FaDownload /><span>Download</span></button>
                                <button className="action-btn delete-btn" onClick={handleReset}><FaTrash /><span>Delete</span></button>
                              </div>
                            )}
                          </div>
                        )}

                        {streamingResults.length > 0 && (
                          <div style={{ marginTop: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Results ({streamingResults.length} shown)</p>
                              <button className="view-list-btn" onClick={() => setShowTable(prev => !prev)}>
                                {showTable ? "Hide Details" : "View Details"}
                              </button>
                            </div>
                            {showTable && (
                              <div className="bulk-table-wrap stream-table-wrap">
                                <table className="bulk-table">
                                  <thead><tr><th>#</th><th>Email</th><th>Type</th><th>Score</th><th>MX</th><th>SMTP</th></tr></thead>
                                  <tbody>
                                    {streamingResults.map((r, i) => <LiveResultRow key={i} result={r} index={i} />)}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ════ FILE UPLOAD ════ */}
                {activeTab === "file" && (
                  <FileUploadTab credits={credits} setCredits={setCredits} />
                )}

                {/* ════ INTEGRATION ════ */}
                {activeTab === "integration" && <IntegrationTab />}

                {/* ════ API ════ */}
                {activeTab === "api" && (
                  <div style={{ padding: "20px 0" }}>
                    <h3 style={{ color: "#1e293b", marginBottom: 12 }}>API Access</h3>
                    <p style={{ color: "#64748b", fontSize: 14 }}>
                      Use our REST API to verify emails programmatically. Generate your API key from the settings panel.
                    </p>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;