import { tavily } from "@tavily/core";

import { env } from "../config/env.js";

if (!env.tavilyApiKey) {
  console.warn(
    "⚠️ TAVILY_API_KEY is not configured. Web search will be unavailable."
  );
}

const client = env.tavilyApiKey
  ? tavily({
      apiKey: env.tavilyApiKey,
    })
  : null;

export const searchWeb = async ({
  query,
  limit = env.tavilyMaxResults,
}) => {
  if (!query?.trim()) {
    return [];
  }

  if (!client) {
    console.warn("⚠️ Tavily client is not configured.");
    return [];
  }

  try {
    const response = await client.search(query.trim(), {
      searchDepth: env.tavilySearchDepth,
      maxResults: limit,
      includeAnswer: false,
      includeRawContent: false,
    });

    const results = response?.results || [];

    return results.map((item, index) => ({
      title: item.title || "Untitled source",

      url: item.url || "",

      snippet: item.content || "",

      domain: extractDomain(item.url),

      position: index + 1,
    }));
  } catch (error) {
    console.error("❌ Tavily search error:", error);

    throw new Error(
      `Web search failed: ${error?.message || "Unknown Tavily error"}`
    );
  }
};

const extractDomain = (url) => {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./, "");
  } catch {
    return "";
  }
};
