import { useState } from "react";

function App() {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState("");

  const askBackend = async () => {
    const res = await fetch(import.meta.env.VITE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    setResponse(data.insight);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>AI Retail Intelligence Copilot 🚀</h1>

      <input
        type="text"
        placeholder="Ask about sales, inventory..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        style={{ padding: "10px", width: "300px" }}
      />

      <button
        onClick={askBackend}
        style={{ padding: "10px", marginLeft: "10px" }}
      >
        Ask
      </button>

      <div style={{ marginTop: "20px" }}>
        <strong>Insight:</strong>
        <p>{response}</p>
      </div>
    </div>
  );
}

export default App;