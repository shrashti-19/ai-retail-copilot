import { useEffect, useRef, useState } from "react";

const suggestions = [
  "Which products are trending this week?",
  "Compare Q3 vs Q4 inventory turnover",
  "What is causing the sales dip in electronics?",
  "Forecast demand for holiday season",
];

const quickFilters = [
  { label: "Sales", prompt: "Summarize sales performance by category for the last 30 days." },
  { label: "Inventory", prompt: "Show inventory risks: stockouts, overstock, and dead stock." },
  { label: "Forecast", prompt: "Forecast demand for the next 8 weeks and list uncertainty drivers." },
  { label: "Region", prompt: "Compare performance by region and identify lagging markets." },
  { label: "Date Range", prompt: "Compare this period vs previous period with key deltas." },
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function toValidPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > 100) return null;
  return Number(num.toFixed(1));
}

function getNestedValue(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function extractStockoutPercent(data, insightText) {
  const paths = [
    "stockoutPercent",
    "stockout_percentage",
    "stockout_rate",
    "metrics.stockoutPercent",
    "metrics.stockout_percentage",
    "metrics.stockout_rate",
    "kpis.stockoutPercent",
    "kpis.stockout_rate",
  ];

  for (const path of paths) {
    const value = toValidPercent(getNestedValue(data, path));
    if (value !== null) return value;
  }

  if (!insightText) return null;
  const stockoutMatch = insightText.match(/stockout(?:\s+rate|\s+risk)?[^0-9]{0,25}(\d{1,3}(?:\.\d+)?)\s*%/i);
  if (stockoutMatch) return toValidPercent(stockoutMatch[1]);

  return null;
}

function classifyStockoutRisk(stockoutPercent) {
  if (stockoutPercent === null) return null;
  if (stockoutPercent > 20) {
    return { label: "High Risk", tone: "high", percent: stockoutPercent };
  }
  if (stockoutPercent >= 10) {
    return { label: "Moderate Risk", tone: "moderate", percent: stockoutPercent };
  }
  return { label: "Stable", tone: "stable", percent: stockoutPercent };
}

function renderInline(text) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={idx}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    return <span key={idx}>{part}</span>;
  });
}

function renderMarkdown(text) {
  const lines = text.split("\n");
  const nodes = [];
  let i = 0;
  let key = 0;

  const nextKey = () => {
    key += 1;
    return key;
  };

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      if (level === 1) nodes.push(<h1 key={nextKey()}>{content}</h1>);
      if (level === 2) nodes.push(<h2 key={nextKey()}>{content}</h2>);
      if (level === 3) nodes.push(<h3 key={nextKey()}>{content}</h3>);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ul key={nextKey()}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ol key={nextKey()}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim())
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    nodes.push(<p key={nextKey()}>{renderInline(paragraph.join(" "))}</p>);
  }

  return nodes;
}

function TypingDots() {
  return (
    <span className="typing-dots" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>
  );
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (q) => {
    const query = q || question;
    if (!query.trim() || loading) return;

    setMessages((prev) => [...prev, { id: makeId(), role: "user", text: query }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      const stockoutPercent = extractStockoutPercent(data, data.insight);
      const risk = classifyStockoutRisk(stockoutPercent);
      setMessages((prev) => [...prev, { id: makeId(), role: "ai", text: data.insight, feedback: null, risk }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: makeId(), role: "ai", text: "Failed to reach the server. Please try again.", feedback: null, risk: null },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const handleCopy = async (msg) => {
    try {
      await navigator.clipboard.writeText(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 1200);
    } catch {
      setCopiedId(null);
    }
  };

  const handleRegenerate = (messageIndex) => {
    for (let i = messageIndex - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        ask(messages[i].text);
        break;
      }
    }
  };

  const handleFeedback = (id, value) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, feedback: msg.feedback === value ? null : value } : msg)),
    );
  };

  const applyFilter = (filter) => {
    setActiveFilter(filter.label);
    setQuestion(filter.prompt);
    inputRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

        :root {
          --bg: #071018;
          --bg-soft: #0d1822;
          --panel-border: rgba(154, 192, 229, 0.18);
          --text: #e6eef5;
          --muted: #8ca0b3;
          --primary: #4ef2c2;
          --bubble-ai: #111f2f;
          --bubble-user: #1a2d42;
        }

        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          min-height: 100vh;
          background:
            radial-gradient(1000px 700px at -10% -10%, rgba(13, 213, 159, 0.18), transparent 60%),
            radial-gradient(800px 600px at 110% 0%, rgba(55, 117, 255, 0.24), transparent 58%),
            linear-gradient(180deg, #060d14 0%, #071018 55%, #081420 100%);
          color: var(--text);
          font-family: "IBM Plex Mono", monospace;
        }

        @keyframes riseIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes bob {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(78, 242, 194, 0.22); }
          50% { box-shadow: 0 0 0 10px rgba(78, 242, 194, 0); }
        }

        .page {
          min-height: 100vh;
          padding: 24px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .app-shell {
          width: 100%;
          max-width: 980px;
          height: min(92vh, 900px);
          border: 1px solid var(--panel-border);
          border-radius: 24px;
          background: linear-gradient(170deg, rgba(15, 28, 41, 0.78), rgba(8, 16, 26, 0.86));
          backdrop-filter: blur(10px);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .header {
          padding: 18px 24px;
          border-bottom: 1px solid var(--panel-border);
          display: flex;
          align-items: center;
          gap: 14px;
          background: linear-gradient(180deg, rgba(14, 31, 45, 0.82), rgba(14, 31, 45, 0.22));
        }

        .logo {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(160deg, var(--primary), #79f4d7);
          color: #082116;
          font-family: "Space Grotesk", sans-serif;
          font-weight: 700;
          font-size: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 25px rgba(78, 242, 194, 0.35);
          flex-shrink: 0;
        }

        .header-meta h1 {
          font-family: "Space Grotesk", sans-serif;
          font-weight: 700;
          font-size: 18px;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }

        .header-meta p {
          color: var(--muted);
          margin-top: 4px;
          font-size: 11px;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .status {
          margin-left: auto;
          font-size: 11px;
          color: #b8f7e6;
          border: 1px solid rgba(78, 242, 194, 0.3);
          background: rgba(78, 242, 194, 0.1);
          border-radius: 999px;
          padding: 6px 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .status::before {
          content: "";
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--primary);
          box-shadow: 0 0 8px rgba(78, 242, 194, 0.8);
        }

        .chat-area {
          flex: 1;
          overflow-y: auto;
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          scrollbar-width: thin;
          scrollbar-color: #2a445b transparent;
        }

        .empty-state {
          flex: 1;
          display: grid;
          gap: 26px;
          align-content: center;
          animation: riseIn 0.45s ease;
        }

        .hero {
          background: linear-gradient(140deg, rgba(78, 242, 194, 0.09), rgba(55, 117, 255, 0.08));
          border: 1px solid var(--panel-border);
          border-radius: 20px;
          padding: 28px;
        }

        .hero h2 {
          font-family: "Space Grotesk", sans-serif;
          font-size: clamp(28px, 4vw, 40px);
          letter-spacing: -0.05em;
          line-height: 1.02;
          max-width: 13ch;
        }

        .hero h2 span {
          color: var(--primary);
          text-shadow: 0 0 24px rgba(78, 242, 194, 0.35);
        }

        .hero p {
          margin-top: 10px;
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .suggestions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .suggestion-btn {
          padding: 14px 14px;
          text-align: left;
          border-radius: 14px;
          border: 1px solid var(--panel-border);
          background: linear-gradient(180deg, rgba(20, 35, 51, 0.8), rgba(15, 27, 40, 0.76));
          color: #c9d7e5;
          font-family: "IBM Plex Mono", monospace;
          font-size: 12px;
          line-height: 1.45;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .suggestion-btn:hover {
          border-color: rgba(78, 242, 194, 0.58);
          background: linear-gradient(180deg, rgba(28, 48, 68, 0.92), rgba(18, 33, 47, 0.85));
          transform: translateY(-2px);
        }

        .message {
          animation: riseIn 0.3s ease;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .message.user {
          flex-direction: row-reverse;
        }

        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: "Space Grotesk", sans-serif;
          font-weight: 700;
          font-size: 11px;
        }

        .avatar.user-av {
          background: #24384d;
          color: #d8e4f1;
          border: 1px solid rgba(184, 205, 227, 0.3);
        }

        .avatar.ai-av {
          background: linear-gradient(145deg, var(--primary), #95ffe3);
          color: #0a2015;
          border: 1px solid rgba(177, 255, 233, 0.4);
        }

        .bubble {
          max-width: min(78%, 700px);
          padding: 13px 15px;
          border-radius: 14px;
          font-size: 13px;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .bubble-content {
          display: grid;
          gap: 8px;
        }

        .bubble-content h1,
        .bubble-content h2,
        .bubble-content h3 {
          font-family: "Space Grotesk", sans-serif;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }

        .bubble-content h1 { font-size: 18px; }
        .bubble-content h2 { font-size: 16px; }
        .bubble-content h3 { font-size: 15px; }

        .bubble-content p {
          margin: 0;
        }

        .bubble-content ul,
        .bubble-content ol {
          margin: 0;
          padding-left: 20px;
          display: grid;
          gap: 6px;
        }

        .bubble-content code {
          background: rgba(128, 166, 202, 0.2);
          border: 1px solid rgba(128, 166, 202, 0.28);
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 12px;
        }

        .bubble.user-bubble {
          background: var(--bubble-user);
          border: 1px solid rgba(125, 165, 202, 0.36);
          border-bottom-right-radius: 4px;
          color: #d7e4f1;
        }

        .bubble.ai-bubble {
          background: var(--bubble-ai);
          border: 1px solid rgba(103, 155, 201, 0.26);
          border-bottom-left-radius: 4px;
          color: #e4eef8;
        }

        .bubble-top {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
        }

        .risk-badge {
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          border: 1px solid transparent;
        }

        .risk-badge.high {
          background: rgba(248, 113, 113, 0.18);
          color: #fecaca;
          border-color: rgba(248, 113, 113, 0.45);
        }

        .risk-badge.moderate {
          background: rgba(250, 204, 21, 0.18);
          color: #fde68a;
          border-color: rgba(250, 204, 21, 0.45);
        }

        .risk-badge.stable {
          background: rgba(74, 222, 128, 0.18);
          color: #bbf7d0;
          border-color: rgba(74, 222, 128, 0.45);
        }

        .msg-actions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          opacity: 0.88;
          flex-wrap: wrap;
        }

        .action-btn {
          border: 1px solid rgba(112, 151, 186, 0.35);
          background: rgba(20, 36, 52, 0.7);
          color: #a8c0d7;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          line-height: 1;
          font-family: "IBM Plex Mono", monospace;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          border-color: rgba(78, 242, 194, 0.58);
          color: #cbfbee;
        }

        .action-btn.active {
          border-color: rgba(78, 242, 194, 0.68);
          color: #cbfbee;
          background: rgba(16, 49, 43, 0.8);
        }

        .action-btn:disabled {
          cursor: not-allowed;
          opacity: 0.45;
        }

        .typing-shell {
          background: var(--bubble-ai);
          border: 1px solid rgba(103, 155, 201, 0.26);
          border-radius: 14px;
          border-bottom-left-radius: 4px;
          padding: 12px 14px;
        }

        .typing-dots {
          display: inline-flex;
          gap: 5px;
          align-items: center;
          height: 16px;
        }

        .typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: var(--primary);
          animation: bob 1s ease-in-out infinite;
        }

        .composer {
          border-top: 1px solid var(--panel-border);
          padding: 14px 16px 16px;
          background: linear-gradient(180deg, rgba(10, 20, 31, 0.5), rgba(10, 20, 31, 0.85));
        }

        .filters {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 2px 2px 6px;
          scrollbar-width: thin;
          scrollbar-color: #2a445b transparent;
        }

        .filter-btn {
          border: 1px solid rgba(130, 164, 196, 0.3);
          background: rgba(14, 32, 46, 0.85);
          color: #a9c1d7;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-radius: 999px;
          padding: 8px 11px;
          white-space: nowrap;
          font-family: "IBM Plex Mono", monospace;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .filter-btn:hover {
          border-color: rgba(78, 242, 194, 0.5);
          color: #d8fbf2;
        }

        .filter-btn.active {
          border-color: rgba(78, 242, 194, 0.65);
          background: rgba(15, 58, 48, 0.88);
          color: #dcfff5;
        }

        .input-wrap {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          border-radius: 16px;
          padding: 12px;
          background: var(--bg);
          border: 1px solid ${focused ? "rgba(78, 242, 194, 0.62)" : "rgba(130, 164, 196, 0.24)"};
          transition: border-color 0.2s ease;
          ${focused ? "animation: pulse 2s ease infinite;" : ""}
        }

        textarea {
          flex: 1;
          border: 0;
          outline: none;
          resize: none;
          max-height: 140px;
          min-height: 20px;
          background: transparent;
          color: var(--text);
          font-family: "IBM Plex Mono", monospace;
          font-size: 13px;
          line-height: 1.6;
        }

        textarea::placeholder {
          color: #62809b;
        }

        .send-btn {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          border: 1px solid rgba(78, 242, 194, 0.3);
          background: ${loading ? "rgba(52, 75, 98, 0.45)" : "linear-gradient(145deg, #23e8b3, #65f7cf)"};
          color: #082216;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: ${loading ? "not-allowed" : "pointer"};
          flex-shrink: 0;
          transition: transform 0.2s ease, filter 0.2s ease;
        }

        .send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.06);
        }

        .send-btn:disabled {
          opacity: 0.45;
        }

        .hint {
          margin-top: 8px;
          text-align: center;
          font-size: 10px;
          color: #7290a9;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        @media (max-width: 780px) {
          .page {
            padding: 8px;
          }

          .app-shell {
            height: calc(100vh - 16px);
            border-radius: 18px;
          }

          .header {
            padding: 14px;
            gap: 10px;
          }

          .header-meta h1 {
            font-size: 16px;
          }

          .status {
            display: none;
          }

          .chat-area {
            padding: 14px;
          }

          .hero {
            padding: 18px;
          }

          .suggestions {
            grid-template-columns: 1fr;
          }

          .bubble {
            max-width: 86%;
          }

          .composer {
            padding: 10px;
          }
        }
      `}</style>

      <div className="page">
        <div className="app-shell">
          <header className="header">
            <div className="logo">RI</div>
            <div className="header-meta">
              <h1>Retail Intelligence Copilot</h1>
              <p>AI Driven Retail Insights</p>
            </div>
            <div className="status">Connected</div>
          </header>

          <div className="chat-area">
            {isEmpty ? (
              <div className="empty-state">
                <div className="hero">
                  <h2>
                    Ask sharper questions, get <span>faster</span> retail decisions.
                  </h2>
                  <p>Inventory . Sales . Forecasting . Root Cause Analysis</p>
                </div>
                <div className="suggestions">
                  {suggestions.map((s) => (
                    <button key={s} className="suggestion-btn" onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={msg.id ?? i} className={`message ${msg.role}`}>
                    <div className={`avatar ${msg.role === "user" ? "user-av" : "ai-av"}`}>
                      {msg.role === "user" ? "YOU" : "RI"}
                    </div>
                    <div className={`bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}>
                      {msg.role === "ai" && msg.risk && (
                        <div className="bubble-top">
                          <div className={`risk-badge ${msg.risk.tone}`}>
                            {msg.risk.label} ({msg.risk.percent}%)
                          </div>
                        </div>
                      )}
                      <div className="bubble-content">{msg.role === "ai" ? renderMarkdown(msg.text) : <p>{msg.text}</p>}</div>
                      {msg.role === "ai" && (
                        <div className="msg-actions">
                          <button className={`action-btn ${copiedId === msg.id ? "active" : ""}`} onClick={() => handleCopy(msg)}>
                            {copiedId === msg.id ? "Copied" : "Copy"}
                          </button>
                          <button className="action-btn" onClick={() => handleRegenerate(i)} disabled={loading}>
                            Regenerate
                          </button>
                          <button
                            className={`action-btn ${msg.feedback === "up" ? "active" : ""}`}
                            onClick={() => handleFeedback(msg.id, "up")}
                          >
                            Helpful
                          </button>
                          <button
                            className={`action-btn ${msg.feedback === "down" ? "active" : ""}`}
                            onClick={() => handleFeedback(msg.id, "down")}
                          >
                            Not Helpful
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="message">
                    <div className="avatar ai-av">RI</div>
                    <div className="typing-shell">
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          <div className="composer">
            <div className="filters">
              {quickFilters.map((filter) => (
                <button
                  key={filter.label}
                  className={`filter-btn ${activeFilter === filter.label ? "active" : ""}`}
                  onClick={() => applyFilter(filter)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="input-wrap">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder="Ask about sales, inventory, trends..."
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={handleKey}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <button className="send-btn" onClick={() => ask()} disabled={loading || !question.trim()}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div className="hint">Press Enter to send, Shift+Enter for a new line</div>
          </div>
        </div>
      </div>
    </>
  );
}
