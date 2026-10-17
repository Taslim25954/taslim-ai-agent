import { tavily } from "@tavily/core";

import { env } from "../../config/env.js";

const client = tavily({
  apiKey: env.tavilyApiKey,
});

export const searchWeb = async ({
  query,
  limit = env.tavilyMaxResults,
}) => {
  if (
    typeof query !== "string" ||
    !query.trim()
  ) {
    return [];
  }

  if (!env.tavilyApiKey) {
    throw new Error(
      "TAVILY_API_KEY is not configured"
    );
  }

  try {
    const response =
      await client.search(
        query.trim(),
        {
          searchDepth:
            env.tavilySearchDepth,

          maxResults:
            limit,

          includeAnswer:
            false,

          includeRawContent:
            false,
        }
      );

    const results =
      response?.results || [];

    return results.map(
      (item, index) => ({
        title:
          item.title ||
          "Untitled source",

        url:
          item.url || "",

        snippet:
          item.content || "",

        domain:
          extractDomain(
            item.url
          ),

        position:
          index + 1,
      })
    );
  } catch (error) {
    console.error(
      "❌ Tavily search error:",
      error?.message
    );

    throw error;
  }
};

const extractDomain = (
  url
) => {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./, "");
  } catch {
    return "";
  }
};
