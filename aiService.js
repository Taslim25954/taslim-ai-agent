import { env } from '../config/env.js';

export const askGemini = async (prompt) => {
  // If no API key provided, return a safe echo response for local/dev use.
  if (!env.geminiApiKey && !process.env.GEMINI_API_KEY) {
    return `Echo: ${prompt}`;
  }

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const genai = await import('@google/genai');
      let client;

      if (genai.TextGenerationClient) {
        client = new genai.TextGenerationClient({ apiKey: env.geminiApiKey || process.env.GEMINI_API_KEY });
        const res = await client.generate({ model: env.geminiModel || process.env.GEMINI_MODEL, input: prompt });
        return res?.candidates?.[0]?.output || String(res);
      }

      if (genai.GenerativeModelsClient) {
        client = new genai.GenerativeModelsClient({ apiKey: env.geminiApiKey || process.env.GEMINI_API_KEY });
        const res = await client.generate({ model: env.geminiModel || process.env.GEMINI_MODEL, prompt });
        return res.output?.[0]?.content || String(res);
      }

      return `Echo: ${prompt}`;
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) {
        console.warn('Gemini client unavailable after retries, using fallback. Error:', err?.message || err);
        return `Echo: ${prompt}`;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  return `Echo: ${prompt}`;
};
