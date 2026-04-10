import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./FindEmail.css";
import {
  FaSearch, FaEnvelope, FaCoins, FaUser, FaBell, 
  FaSignOutAlt, FaGlobe, FaCopy, FaCheck,
  FaArrowLeft
} from "react-icons/fa";

// Email generation logic
function generateEmails(firstName, lastName, domain) {
  const f = firstName.toLowerCase().trim();
  const l = lastName.toLowerCase().trim();
  const fi = f[0];
  const li = l[0];

  return [
    { email: `${f}.${l}@${domain}`, pattern: "firstname.lastname" },
    { email: `${fi}${l}@${domain}`, pattern: "f.lastname" },
    { email: `${f}@${domain}`, pattern: "firstname" },
    { email: `${fi}.${l}@${domain}`, pattern: "f+lastname" },
    { email: `${f}${l}@${domain}`, pattern: "firstnamelastname" },
    { email: `${f}_${l}@${domain}`, pattern: "firstname_lastname" },
    { email: `${l}.${f}@${domain}`, pattern: "lastname.firstname" },
    { email: `${f}-${l}@${domain}`, pattern: "firstname-lastname" },
    { email: `${f}${li}@${domain}`, pattern: "firstname+l" },
    { email: `${l}${fi}@${domain}`, pattern: "lastname+f" },
  ];
}

// Function to generate domain suggestions based on input
function generateDomainSuggestions(domainInput) {
  if (!domainInput || domainInput.length < 2) return [];
  
  const suggestions = [];
  const cleanInput = domainInput.toLowerCase().trim();
  
  // Common TLDs
  const tlds = ['.com', '.io', '.co', '.net', '.org', '.ai', '.app', '.dev', '.tech', '.in', '.uk', '.ca', '.au'];
  
  // Remove any existing TLD if present
  let baseDomain = cleanInput;
  tlds.forEach(tld => {
    if (baseDomain.endsWith(tld)) {
      baseDomain = baseDomain.slice(0, -tld.length);
    }
  });
  
  // Generate domain suggestions with different TLDs
  tlds.forEach(tld => {
    if (baseDomain.length > 0) {
      suggestions.push({
        domain: `${baseDomain}${tld}`,
        type: `${tld} domain`,
        logo: baseDomain.charAt(0).toUpperCase(),
        color: getDomainColor(baseDomain)
      });
    }
  });
  
  // Add common prefixes
  const prefixes = ['mail.', 'email.', 'contact.', 'go.', 'app.', 'try.', 'get.', 'my.'];
  prefixes.forEach(prefix => {
    suggestions.push({
      domain: `${prefix}${baseDomain}.com`,
      type: `${prefix} subdomain`,
      logo: prefix.charAt(0).toUpperCase(),
      color: getDomainColor(baseDomain)
    });
  });
  
  // Add hyphenated variations
  if (baseDomain.length > 3) {
    suggestions.push({
      domain: `${baseDomain}-mail.com`,
      type: 'hyphenated',
      logo: 'H',
      color: getDomainColor(baseDomain)
    });
    suggestions.push({
      domain: `${baseDomain}-app.com`,
      type: 'hyphenated',
      logo: 'H',
      color: getDomainColor(baseDomain)
    });
  }
  
  // Remove duplicates and limit to 10 suggestions
  const uniqueDomains = [];
  const seen = new Set();
  for (const suggestion of suggestions) {
    if (!seen.has(suggestion.domain)) {
      seen.add(suggestion.domain);
      uniqueDomains.push(suggestion);
    }
  }
  
  return uniqueDomains.slice(0, 10);
}

// Get color based on domain name
function getDomainColor(domain) {
  const colors = [
    "#4285F4", "#EA4335", "#FBBC05", "#34A853", "#FF6B6B", 
    "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
    "#0fa3b1", "#0b5563", "#10a37f", "#CC785C", "#0866FF"
  ];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = ((hash << 5) - hash) + domain.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

function FindEmail({ credits: initialCredits = 100, onLogout }) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [domain, setDomain] = useState("");
  const [domainQuery, setDomainQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [domainSuggestions, setDomainSuggestions] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState("");
  const [noResult, setNoResult] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [showBillingPage, setShowBillingPage] = useState(false);

  // Generate domain suggestions when domainQuery changes
  useEffect(() => {
    if (domainQuery.length > 1) {
      const suggestions = generateDomainSuggestions(domainQuery);
      setDomainSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setDomainSuggestions([]);
      setShowSuggestions(false);
    }
  }, [domainQuery]);

  const handleDomainInput = (val) => {
    setDomainQuery(val);
    setDomain(val);
    setSelectedCompany(null);
    setResults(null);
    setNoResult(false);
  };

  const handleSelectDomain = (suggestion) => {
    setSelectedCompany({
      name: suggestion.domain.split('.')[0],
      domain: suggestion.domain,
      logo: suggestion.logo,
      color: suggestion.color
    });
    setDomain(suggestion.domain);
    setDomainQuery(suggestion.domain);
    setShowSuggestions(false);
  };

  const handleFindEmail = () => {
    if (!firstName.trim() || !lastName.trim() || !domain.trim()) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);
    setResults(null);
    setNoResult(false);

    setTimeout(() => {
      const emails = generateEmails(firstName, lastName, domain);
      if (emails.length === 0) {
        setNoResult(true);
      } else {
        setResults(emails);
        setCredits(prev => Math.max(0, prev - 1));
      }
      setLoading(false);
    }, 800);
  };

  const handleCopy = (email, id) => {
    navigator.clipboard.writeText(email);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleFindEmail();
    }
  };

  const handleExampleClick = (first, last, dom) => {
    setFirstName(first);
    setLastName(last);
    setDomain(dom);
    setDomainQuery(dom);
    setSelectedCompany({
      name: dom.split('.')[0],
      domain: dom,
      logo: dom.charAt(0).toUpperCase(),
      color: getDomainColor(dom)
    });
  };

  const handleBuyCredits = (amount) => {
    setCredits(prev => prev + amount);
    setShowBillingPage(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("efy_token");
    localStorage.removeItem("user_credits");
    if (onLogout) onLogout();
    navigate("/login");
  };

  // Navigation handlers
  const handleNavigateToVerification = () => {
    navigate("/dashboard");
  };

  const handleNavigateToCredits = () => {
    navigate("/creditBalance");
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="find-email-dashboard">
      <div className="dashboard-bg">
        <div className="bg-orb orb1"></div>
        <div className="bg-orb orb2"></div>
        <div className="bg-orb orb3"></div>
        <div className="bg-orb orb4"></div>
        <div className="bg-wave"></div>
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <div className="logo-container">
          <h2 className="logo">E-fy</h2>
        </div>
        
        {/* Back Button */}
        <button className="back-to-dashboard-btn" onClick={handleBackToDashboard}>
          <FaArrowLeft /> Back to Dashboard
        </button>
        
        <div className="menu-divider"></div>
        
        <div className="user-profile">
          <div className="avatar"><FaUser /></div>
          <div className="user-info"><h4>Kamlesh Surana</h4></div>
        </div>

        <div className="menu">
          <div className="menu-item active">
            <FaSearch className="menu-icon" /><span>Find Email</span>
          </div>
          <div className="menu-item" onClick={handleNavigateToVerification}>
            <FaEnvelope className="menu-icon" /><span>Email Verification</span>
          </div>
          <div className="menu-item" onClick={handleNavigateToCredits}>
            <FaCoins className="menu-icon" /><span>Credit Balance</span>
          </div>
        </div>

        <div className="credit-section">
          <div className="credit-box">
            <div className="credit-header">
              <FaCoins className="credit-icon" /><span>Credits</span>
            </div>
            <div className="credit-amount">
              <span className="amount">{credits}</span>
            </div>
            <button className="buy-credits-btn" onClick={() => setShowBillingPage(true)}>
              ₹ Buy Credits
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="find-email-main">
        <div className="header">
          <div className="header-left">
            <h2>Find Email</h2>
          </div>
          <div className="header-right">
            <div className="notification-badge">
              <FaBell /><span className="badge">3</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>

        <div className="content-card">
          <div className="find-email-page">
            {/* Header */}
            <div className="fe-header">
              <h2 className="fe-title">Find Email Address</h2>
              <p className="fe-subtitle">Enter name and company domain to discover email patterns</p>
            </div>

            {/* Search Form */}
            <div className="fe-form-container">
              <div className="fe-input-grid">
                <div className="fe-input-group">
                  <label className="fe-input-label">First Name</label>
                  <input
                    className="fe-input-field"
                    placeholder="e.g., John"
                    value={firstName}
                    onChange={e => { setFirstName(e.target.value); setResults(null); setNoResult(false); }}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <div className="fe-input-group">
                  <label className="fe-input-label">Last Name</label>
                  <input
                    className="fe-input-field"
                    placeholder="e.g., Doe"
                    value={lastName}
                    onChange={e => { setLastName(e.target.value); setResults(null); setNoResult(false); }}
                    onKeyPress={handleKeyPress}
                  />
                </div>

                <div className="fe-input-group fe-domain-group">
                  <label className="fe-input-label">Company Domain</label>
                  <div className="fe-domain-wrapper">
                    <input
                      className="fe-input-field fe-domain-input"
                      placeholder="e.g., company.com"
                      value={domainQuery}
                      onChange={e => handleDomainInput(e.target.value)}
                      onFocus={() => domainQuery.length > 1 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onKeyPress={handleKeyPress}
                    />
                    <FaGlobe className="fe-domain-icon" />
                    {showSuggestions && domainSuggestions.length > 0 && (
                      <div className="fe-suggestions-dropdown">
                        <div className="fe-suggestions-header">
                          <span>Suggested Domains</span>
                        </div>
                        {domainSuggestions.map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="fe-suggestion-item"
                            onMouseDown={() => handleSelectDomain(suggestion)}
                          >
                            <div className="fe-suggestion-logo" style={{ background: suggestion.color }}>
                              {suggestion.logo}
                            </div>
                            <div className="fe-suggestion-info">
                              <div className="fe-suggestion-name">{suggestion.domain}</div>
                              <div className="fe-suggestion-domain">{suggestion.type}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="fe-input-group fe-button-group">
                  <button
                    className="fe-find-button"
                    onClick={handleFindEmail}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="fe-loading-dots">
                        <span></span><span></span><span></span>
                      </span>
                    ) : "Find Email"}
                  </button>
                </div>
              </div>

              {error && <div className="fe-error-message">{error}</div>}
            </div>

            {/* Example Hints */}
            <div className="fe-examples">
              <span className="fe-examples-label">Try:</span>
              <button 
                className="fe-example-btn"
                onClick={() => handleExampleClick("Sam", "Altman", "openai.com")}
              >
                Sam Altman @ openai.com
              </button>
              <button 
                className="fe-example-btn"
                onClick={() => handleExampleClick("Elon", "Musk", "tesla.com")}
              >
                Elon Musk @ tesla.com
              </button>
              <button 
                className="fe-example-btn"
                onClick={() => handleExampleClick("Sundar", "Pichai", "google.com")}
              >
                Sundar Pichai @ google.com
              </button>
              <button 
                className="fe-example-btn"
                onClick={() => handleExampleClick("Bill", "Gates", "microsoft.com")}
              >
                Bill Gates @ microsoft.com
              </button>
            </div>

            {/* Selected Domain Badge */}
            {selectedCompany && (
              <div className="fe-selected-company-badge">
                <div className="fe-badge-logo" style={{ background: selectedCompany.color }}>
                  {selectedCompany.logo}
                </div>
                <span className="fe-badge-name">{selectedCompany.name}</span>
                <span className="fe-badge-domain">{selectedCompany.domain}</span>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="fe-loading-state">
                <div className="fe-spinner"></div>
                <p>Generating email patterns...</p>
              </div>
            )}

            {/* Results List - Patterns Only */}
            {results && results.length > 0 && !loading && (
              <div className="fe-results-container">
                <div className="fe-results-header">
                  <div className="fe-results-title-section">
                    <h3 className="fe-results-count">
                      Found {results.length} possible email patterns
                    </h3>
                    <p className="fe-results-query">
                      for {firstName} {lastName} @ {domain}
                    </p>
                  </div>
                </div>

                <div className="fe-results-list">
                  {results.map((item, idx) => {
                    const isCopied = copiedId === idx;
                    
                    return (
                      <div key={idx} className="fe-result-card">
                        <div className="fe-result-email-section">
                          <span className="fe-result-email">{item.email}</span>
                          <span className="fe-result-pattern">{item.pattern}</span>
                        </div>
                        
                        <button
                          className={`fe-copy-btn ${isCopied ? 'copied' : ''}`}
                          onClick={() => handleCopy(item.email, idx)}
                          title="Copy to clipboard"
                        >
                          {isCopied ? '✓ Copied!' : 'Copy'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Tip Box */}
                <div className="fe-tip-box">
                  <span className="fe-tip-icon">💡</span>
                  <span className="fe-tip-text">
                    <strong>Pro tip:</strong> Patterns like <code>firstname.lastname</code> and <code>f.lastname</code> are most commonly used. 
                    Use the <strong>Email Verification</strong> tab to check deliverability.
                  </span>
                </div>
              </div>
            )}

            {/* No Result State */}
            {noResult && !loading && (
              <div className="fe-no-result">
                <div className="fe-no-result-icon">📭</div>
                <h3 className="fe-no-result-title">No email patterns found</h3>
                <p className="fe-no-result-text">
                  We couldn't generate any email patterns for this combination.
                </p>
                <button 
                  className="fe-try-example-btn"
                  onClick={() => handleExampleClick("Sam", "Altman", "openai.com")}
                >
                  Try Example
                </button>
              </div>
            )}

            {/* Empty State */}
            {!results && !loading && !noResult && (
              <div className="fe-empty-state">
                <div className="fe-empty-icon">🔍</div>
                <h3 className="fe-empty-title">Find anyone's work email</h3>
                <p className="fe-empty-text">
                  Enter a name and company domain to discover all possible email patterns
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Billing Modal */}
     
    </div>
  );
}

export default FindEmail;