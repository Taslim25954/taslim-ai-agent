import { env } from "../config/env.js";

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const REQUEST_TIMEOUT_MS = 30000;

const delay = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

/**
 * Generate response from Gemini
 */
export const generateGeminiResponse = async ({
  systemInstruction,
  history = [],
  userMessage,
  message,
}) => {
  const apiKey = env.geminiApiKey?.trim();
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing"
    );
  }

  const finalUserMessage =
    typeof userMessage === "string"
      ? userMessage
      : typeof message === "string"
        ? message
        : "";

  if (!finalUserMessage.trim()) {
    throw new Error(
      "User message is required"
    );
  }

  const model =
    env.geminiModel ||
    "gemini-2.5-flash";

  const contents = [];

  for (const item of history) {
    if (!item?.content) continue;

    contents.push({
      role:
        item.role === "assistant"
          ? "model"
          : "user",
      parts: [{ text: item.content }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: finalUserMessage }],
  });

  const payload = {
    systemInstruction: {
      parts: [
        {
          text:
            systemInstruction ||
            "You are a helpful AI assistant.",
        },
      ],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const text = await response.text();
      let data = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errMessage =
          data?.error?.message ||
          `Gemini API request failed with status ${response.status}`;

        const error = new Error(
          response.status === 401 || response.status === 403
            ? "Gemini authentication failed. Set GEMINI_API_KEY to a valid Gemini Developer API key from Google AI Studio; OAuth access tokens and Google Cloud credentials are not API keys."
            : errMessage
        );
        error.retryable = response.status >= 500 || response.status === 429;
        throw error;
      }

      const extractedText =
        data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text || "")
          .join("")
          .trim();

      if (!extractedText) {
        throw new Error(
          "Gemini returned an empty response"
        );
      }

      return {
        text: extractedText,
        model,
      };
    } catch (error) {
      lastError = error;

      if (attempt < 3 && error?.retryable !== false) {
        await delay(400 * attempt);
      } else {
        break;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  console.error(
    "Gemini provider failed after retries:",
    lastError?.message || "Unknown error"
  );

  throw new Error(
    lastError?.message ||
      "Gemini request failed after retries"
  );
};
