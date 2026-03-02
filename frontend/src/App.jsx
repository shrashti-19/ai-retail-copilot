// import { useState } from "react";

// function App() {
//   const [question, setQuestion] = useState("");
//   const [response, setResponse] = useState("");

//   const askBackend = async () => {
//     const res = await fetch(import.meta.env.VITE_API_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ question }),
//     });

//     const data = await res.json();
//     setResponse(data.insight);
//   };

//   return (
//     <div style={{ padding: "40px", fontFamily: "Arial" }}>
//       <h1>AI Retail Intelligence Copilot 🚀</h1>

//       <input
//         type="text"
//         placeholder="Ask about sales, inventory..."
//         value={question}
//         onChange={(e) => setQuestion(e.target.value)}
//         style={{ padding: "10px", width: "300px" }}
//       />

//       <button
//         onClick={askBackend}
//         style={{ padding: "10px", marginLeft: "10px" }}
//       >
//         Ask
//       </button>

//       <div style={{ marginTop: "20px" }}>
//         <strong>Insight:</strong>
//         <p>{response}</p>
//       </div>
//     </div>
//   );
// }

// export default App;

import { useState, useRef, useEffect } from "react";

const suggestions = [
  "Which products are trending this week?",
  "Compare Q3 vs Q4 inventory turnover",
  "What's causing the sales dip in electronics?",
  "Forecast demand for holiday season",
];

function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: "4px", alignItems: "center", height: "20px" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#c8ff00",
            animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </span>
  );
}

export default function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ask = async (q) => {
    const query = q || question;
    if (!query.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch(import.meta.env.VITE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.insight }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "⚠️ Failed to reach the server. Please try again." },
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

  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0a0a;
          color: #e8e4dc;
          font-family: 'DM Mono', monospace;
          min-height: 100vh;
        }

        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(200, 255, 0, 0.15); }
          50% { box-shadow: 0 0 0 6px rgba(200, 255, 0, 0); }
        }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 860px;
          margin: 0 auto;
          padding: 0 24px;
        }

        .header {
          padding: 28px 0 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid #1e1e1e;
          flex-shrink: 0;
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          background: #c8ff00;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 16px;
          color: #0a0a0a;
          flex-shrink: 0;
        }

        .header-text h1 {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 17px;
          letter-spacing: -0.3px;
          color: #f0ece2;
        }

        .header-text p {
          font-size: 11px;
          color: #555;
          margin-top: 1px;
          letter-spacing: 0.04em;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #c8ff00;
          margin-left: auto;
          box-shadow: 0 0 8px rgba(200, 255, 0, 0.6);
        }

        .chat-area {
          flex: 1;
          overflow-y: auto;
          padding: 32px 0 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          scrollbar-width: thin;
          scrollbar-color: #222 transparent;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          animation: fadeUp 0.5s ease;
        }

        .empty-title {
          font-family: 'Syne', sans-serif;
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -1px;
          text-align: center;
          line-height: 1.1;
          color: #f0ece2;
        }

        .empty-title span { color: #c8ff00; }

        .empty-sub {
          font-size: 12px;
          color: #444;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .suggestions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          width: 100%;
          max-width: 560px;
        }

        .suggestion-btn {
          background: #111;
          border: 1px solid #222;
          border-radius: 10px;
          padding: 14px 16px;
          text-align: left;
          color: #888;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          line-height: 1.5;
          cursor: pointer;
          transition: all 0.2s;
        }

        .suggestion-btn:hover {
          background: #161616;
          border-color: #c8ff00;
          color: #e8e4dc;
        }

        .message {
          animation: fadeUp 0.35s ease;
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .message.user { flex-direction: row-reverse; }

        .avatar {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          font-family: 'Syne', sans-serif;
        }

        .avatar.user-av {
          background: #1e1e1e;
          color: #888;
          border: 1px solid #2a2a2a;
        }

        .avatar.ai-av {
          background: #c8ff00;
          color: #0a0a0a;
        }

        .bubble {
          max-width: 72%;
          padding: 14px 18px;
          border-radius: 14px;
          font-size: 13.5px;
          line-height: 1.7;
        }

        .bubble.user-bubble {
          background: #181818;
          border: 1px solid #252525;
          color: #c8c4bc;
          border-bottom-right-radius: 4px;
        }

        .bubble.ai-bubble {
          background: #111;
          border: 1px solid #1e1e1e;
          color: #e8e4dc;
          border-bottom-left-radius: 4px;
        }

        .typing-bubble {
          background: #111;
          border: 1px solid #1e1e1e;
          padding: 14px 18px;
          border-radius: 14px;
          border-bottom-left-radius: 4px;
          width: fit-content;
        }

        .input-row {
          padding: 16px 0 28px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .input-wrap {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: #111;
          border: 1px solid ${focused ? "#c8ff00" : "#222"};
          border-radius: 14px;
          padding: 12px 14px;
          transition: border-color 0.2s;
          ${focused ? "animation: pulse-border 2s ease infinite;" : ""}
        }

        textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #e8e4dc;
          font-family: 'DM Mono', monospace;
          font-size: 13.5px;
          line-height: 1.6;
          resize: none;
          max-height: 140px;
          min-height: 22px;
        }

        textarea::placeholder { color: #3a3a3a; }

        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: ${loading ? "#1a1a1a" : "#c8ff00"};
          border: none;
          cursor: ${loading ? "not-allowed" : "pointer"};
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
          color: #0a0a0a;
        }

        .send-btn:hover:not(:disabled) { background: #d8ff40; transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.4; }

        .hint {
          font-size: 11px;
          color: #333;
          letter-spacing: 0.04em;
          text-align: center;
        }
      `}</style>

      <div className="app">
        <div className="header">
          <div className="logo-mark">RI</div>
          <div className="header-text">
            <h1>Retail Intelligence Copilot</h1>
            <p>POWERED BY AI · REAL-TIME INSIGHTS</p>
          </div>
          <div className="status-dot" title="Connected" />
        </div>

        <div className="chat-area">
          {isEmpty ? (
            <div className="empty-state">
              <div>
                <div className="empty-title">
                  What do you want to<br />know about your <span>retail</span>?
                </div>
                <div className="empty-sub" style={{ textAlign: "center", marginTop: "12px" }}>
                  Ask anything · Inventory · Sales · Trends
                </div>
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
                <div key={i} className={`message ${msg.role}`}>
                  <div className={`avatar ${msg.role === "user" ? "user-av" : "ai-av"}`}>
                    {msg.role === "user" ? "U" : "RI"}
                  </div>
                  <div className={`bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message">
                  <div className="avatar ai-av">RI</div>
                  <div className="typing-bubble">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        <div className="input-row">
          <div className="input-wrap" style={{ borderColor: focused ? "#c8ff00" : "#222" }}>
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Ask about sales, inventory, trends..."
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={handleKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <button className="send-btn" onClick={() => ask()} disabled={loading || !question.trim()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div className="hint">⏎ to send · shift+⏎ for new line</div>
        </div>
      </div>
    </>
  );
}

