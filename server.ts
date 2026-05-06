import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  function getAiClient(apiKey?: string) {
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      throw new Error("Vui lòng cung cấp Gemini API Key trong cấu hình.");
    }
    return new GoogleGenAI({ apiKey: keyToUse });
  }

  app.post("/api/tts", async (req, res) => {
    try {
      const { chunks, voiceName } = req.body;
      const apiKey = req.headers['x-gemini-api-key'] as string;
      const client = getAiClient(apiKey);
      const audioChunks = [];
      const BATCH_SIZE = 3;
      
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (chunk) => {
          let retries = 2;
          while (retries > 0) {
            try {
              const response = await client.models.generateContent({
                model: 'gemini-3.1-flash-tts-preview',
                contents: [{ parts: [{ text: chunk }] }],
                config: {
                  responseModalities: ['AUDIO'],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName },
                    },
                  },
                },
              });
              const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
              if (base64Audio) return base64Audio;
              throw new Error("Missing audio payload from response.");
            } catch (e) {
              retries--;
              if (retries === 0) throw e;
              await new Promise(r => setTimeout(r, 1500));
            }
          }
          return null;
        });

        const results = await Promise.all(batchPromises);
        for (const res of results) if (res) audioChunks.push(res);
      }
      res.json({ audioChunks });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  app.post("/api/enhance", async (req, res) => {
    try {
      const { text, languageCode } = req.body;
      const apiKey = req.headers['x-gemini-api-key'] as string;
      const client = getAiClient(apiKey);
      const prompt = `Bạn là một chuyên gia về ngôn ngữ, phát thanh và tạo kịch bản lồng tiếng (Voiceover).
Hãy xử lý đoạn văn bản học thuật sau để khi đưa vào hệ thống Text-to-Speech, giọng đọc sẽ trở nên truyền cảm, tự nhiên, và có ngữ điệu tốt hơn.
Các kỹ thuật cần áp dụng:
- Thêm các dấu câu (phẩy, chấm, ba chấm) hợp lý để tạo nhịp nghỉ (pause) tự nhiên giúp hệ thống TTS hiểu chỗ lấy hơi.
- Viết rõ các từ nối, có thể chuyển cụm từ trang trọng sang văn nói tự nhiên một cách tinh tế (nhưng không làm mất đi tính học thuật và ý nghĩa gốc).
- Đảm bảo đầu ra phù hợp với mã ngôn ngữ: ${languageCode}.
Chỉ trả về đoạn văn bản đã được tối ưu hóa, KHÔNG thêm bất kỳ lời bình luận hay giải thích nào.

Văn bản gốc:
${text}`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ result: response.text || text });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  app.post("/api/transcribe", async (req, res) => {
    try {
      const { fileBase64, mimeType, languageCode } = req.body;
      const apiKey = req.headers['x-gemini-api-key'] as string;
      const client = getAiClient(apiKey);
      const prompt = `Bạn là một chuyên gia bóc băng (transcribe) âm thanh. Hãy nghe đoạn âm thanh này và chuyển đổi thành văn bản một cách chính xác nhất bằng ngôn ngữ có mã là: ${languageCode}. Chỉ trả về nội dung văn bản, không bỏ sót chi tiết, không giải thích gì thêm.`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: fileBase64,
                  mimeType: mimeType,
                }
              }
            ]
          }
        ],
      });

      res.json({ result: response.text || '' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
