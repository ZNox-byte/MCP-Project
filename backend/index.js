import express from "express";
import cors from "cors";
import OpenAI from "openai";
import dotenv from "dotenv";

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

app.post("/chat", async (req, res) => {
  const { messages } = req.body;

  try {
    const response = await client.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: messages,
    });

    res.json({
      role: "assistant",
      content: response.choices[0].message.content,
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

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});