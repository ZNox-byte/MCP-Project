import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";
import { randomUUID } from "crypto";
import db from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

app.get("/", (req, res) => {
  res.send("Backend is Running");
});

/**
 * AI 聊天接口：数据库版本
 *
 * 前端传：
 * {
 *   conversationId?: string,
 *   message: string
 * }
 *
 * 后端返回：
 * {
 *   conversationId: string,
 *   message: {
 *     role: "assistant",
 *     content: string
 *   }
 * }
 */
app.post("/chat", async (req, res) => {
  const { conversationId, message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      message: "message is required",
    });
  }

  let currentConversationId = conversationId;
  const now = new Date().toISOString();

  try {
    // 1. 如果没有 conversationId，说明这是一个新对话
    if (!currentConversationId) {
      currentConversationId = randomUUID();

      const title = message.slice(0, 30);

      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(currentConversationId, title, now, now);
    }

    // 2. 保存用户消息
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      currentConversationId,
      "user",
      message,
      now
    );

    // 3. 从数据库读取当前对话的全部历史消息
    const history = db.prepare(`
      SELECT role, content
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(currentConversationId);

    // 4. 把历史消息发给模型
    const response = await client.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: history,
    });

    const assistantContent = response.choices[0].message.content;
    const replyTime = new Date().toISOString();

    // 5. 保存 AI 回复
    db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      currentConversationId,
      "assistant",
      assistantContent,
      replyTime
    );

    // 6. 更新会话的更新时间
    db.prepare(`
      UPDATE conversations
      SET updated_at = ?
      WHERE id = ?
    `).run(replyTime, currentConversationId);

    // 7. 把结果返回给前端
    res.json({
      conversationId: currentConversationId,
      message: {
        role: "assistant",
        content: assistantContent,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "AI request failed",
      error: error.message,
      status: error.status,
      code: error.code,
    });
  }
});

/**
 * 查询所有对话
 *
 * 用途：
 * 以后前端左侧历史记录列表会用它
 */
app.get("/conversations", (req, res) => {
  const conversations = db.prepare(`
    SELECT id, title, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
  `).all();

  res.json(conversations);
});

/**
 * 查询某个对话里的所有消息
 *
 * 用途：
 * 点击历史对话后，加载聊天记录
 */
app.get("/conversations/:id/messages", (req, res) => {
  const { id } = req.params;

  const messages = db.prepare(`
    SELECT role, content, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(id);

  res.json(messages);
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});