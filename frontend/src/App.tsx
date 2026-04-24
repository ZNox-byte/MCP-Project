import { useState } from "react";
import "./App.css";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatResponse = {
  conversationId: string;
  message: ChatMessage;
};

function App() {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "你好，我是 AI Research Lite。你可以问我关于 AI、MCP、Agent 或前后端开发的问题。",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!input.trim()) {
      setError("请输入问题");
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversationId,
          message: userMessage.content,
        }),
      });

      if (!response.ok) {
        throw new Error(`请求失败，状态码：${response.status}`);
      }

      const data: ChatResponse = await response.json();

      setConversationId(data.conversationId);

      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      console.error(err);
      setError("请求失败，请检查后端是否启动，或者模型 API 是否正常。");
    } finally {
      setLoading(false);
    }
  }

  function handleNewChat() {
    setConversationId(null);
    setMessages([
      {
        role: "assistant",
        content:
          "你好，我是 AI Research Lite。你可以问我关于 AI、MCP、Agent 或前后端开发的问题。",
      },
    ]);
    setInput("");
    setError("");
  }

  return (
    <div className="page">
      <div className="chat-card">
        <header className="header">
          <div>
            <h1>AI Research Lite</h1>
            <p>React 前端 + Express 后端 + DeepSeek 模型 + SQLite 数据库</p>
          </div>

          <button className="new-chat-button" onClick={handleNewChat}>
            新建对话
          </button>
        </header>

        {conversationId && (
          <div className="conversation-id">
            当前会话 ID：{conversationId}
          </div>
        )}

        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="role">{msg.role === "user" ? "你" : "AI"}</div>
              <div className="content">{msg.content}</div>
            </div>
          ))}

          {loading && (
            <div className="message assistant">
              <div className="role">AI</div>
              <div className="content">思考中...</div>
            </div>
          )}
        </div>

        {error && <div className="error">{error}</div>}

        <div className="input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入问题，比如：什么是 MCP？"
            rows={3}
          />

          <button onClick={handleSend} disabled={loading}>
            {loading ? "发送中..." : "发送"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;