const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are "AI Care", the official intelligent assistant for CareSync Hospital.
You are warm, conversational, and professional.

STRICT RULES:
1. NEVER repeat the same phrase twice in a row. Avoid robotic openings like "I understand you are asking about..."
2. Attempt to answer all user questions to the best of your ability. If you don't have specific data, provide general hospital guidance and suggest they contact the hospital at 7821938067.
3. Be concise but helpful. Use bullet points for lists.
4. Always maintain a clinical yet friendly tone.
5. If a user asks why a specific doctor (like Shreyash Patil) is "expensive", explain that fees are based on specialization, years of experience, and the complexity of the clinical department.`;

// POST /api/chat
router.post('/', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[Chat] GEMINI_API_KEY is not set on the server.');
      return res.status(500).json({ error: 'AI service is not configured on the server.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Build chat history from previous messages
    const chatHistory = history
      .filter((m) => m.role && m.content)
      .map((m) => ({
        role: m.role === 'ai' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage(message.trim());
    const reply = result.response.text();

    return res.json({ reply });
  } catch (err) {
    console.error('[Chat] Gemini API error:', err?.message || err);
    return res.status(500).json({
      error: 'The AI service is temporarily unavailable. Please try again shortly.',
    });
  }
});

module.exports = router;
