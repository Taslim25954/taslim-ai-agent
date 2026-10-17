// backend/src/ai/ai.service.js

import {
  generateGeminiResponse,
} from "./gemini.provider.js";

import {
  PERPLEXCITY_SYSTEM_PROMPT,
} from "./ai.prompt.js";

import {
  buildResearchContext,
} from "./research/source.service.js";

/**
 * Generate the final AI response.
 *
 * This service is responsible for combining:
 *
 * 1. Conversation history
 * 2. User's current message
 * 3. Optional web research
 * 4. PerplexCity system instructions
 * 5. Gemini
 */
export const generateAIResponse = async ({
  history = [],
  message,
  research = null,
}) => {
  // ------------------------------------------
  // Validation
  // ------------------------------------------

  if (
    typeof message !== "string" ||
    !message.trim()
  ) {
    throw new Error(
      "AI message is required."
    );
  }

  // ------------------------------------------
  // Normalize history
  // ------------------------------------------

  const safeHistory =
    normalizeHistory(history);

  // ------------------------------------------
  // Build research context
  // ------------------------------------------

  const researchContext =
    buildResearchContext(
      research?.results || []
    );

  // ------------------------------------------
  // Build final user prompt
  // ------------------------------------------

  const enrichedMessage =
    buildUserPrompt({
      message: message.trim(),

      researchContext,

      hasResearch:
        Boolean(
          researchContext
        ),
    });

  // ------------------------------------------
  // Generate Gemini response
  // ------------------------------------------

  const result =
    await generateGeminiResponse({
      history: safeHistory,

      userMessage:
        enrichedMessage,

      systemInstruction:
        PERPLEXCITY_SYSTEM_PROMPT,
    });

  // ------------------------------------------
  // Return normalized result
  // ------------------------------------------

  return {
    content:
      result?.text || "",

    model:
      result?.model || null,

    sources:
      research?.results || [],

    researched:
      Boolean(
        research?.results?.length
      ),
  };
};


/**
 * Normalize conversation history.
 *
 * Gemini should receive only the roles/content
 * that are actually useful.
 */
const normalizeHistory = (
  history
) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (item) =>
        item &&
        typeof item.content ===
          "string" &&
        item.content.trim()
    )
    .slice(-20)
    .map((item) => ({
      role:
        normalizeRole(
          item.role
        ),

      content:
        item.content.trim(),
    }));
};


/**
 * Convert application roles into
 * Gemini-compatible roles.
 */
const normalizeRole = (
  role
) => {
  if (
    role === "assistant" ||
    role === "model"
  ) {
    return "model";
  }

  return "user";
};


/**
 * Build the prompt sent to Gemini.
 */
const buildUserPrompt = ({
  message,
  researchContext,
  hasResearch,
}) => {
  if (!hasResearch) {
    return message;
  }

  return `
USER QUESTION
============

${message}


WEB RESEARCH
============

${researchContext}


RESEARCH INSTRUCTIONS
=====================

Use the supplied research when it is
relevant to the user's question.

CITATION RULES:

- Cite factual claims using [1], [2], [3], etc.
- Use only source numbers that actually exist.
- Never invent a source.
- Never invent a URL.
- Do not cite unrelated sources.
- If the research is insufficient, say so.
- If sources disagree, explain the disagreement.


FINAL ANSWER
============

Answer the user's question directly.

Do not describe the internal research process
unless the user asks about it.

Do not say that you searched the web unless
web research was actually supplied.
`;
};
