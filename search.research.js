import { tavily } from "@tavily/core";

import { env } from "../../config/env.js";

import {
  normalizeSources,
} from "./source.service.js";

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

  try {
    const response =
      await client.search(
        query.trim(),
        {
          searchDepth:
            env.tavilySearchDepth,

          maxResults:
            Math.min(
              Math.max(limit, 1),
              10
            ),

          includeAnswer: false,

          includeRawContent: false,
        }
      );

    const results =
      Array.isArray(
        response?.results
      )
        ? response.results
        : [];

    return normalizeSources(
      results.map(
        (item, index) => ({
          title:
            item.title,

          url:
            item.url,

          snippet:
            item.content,

          domain:
            extractDomain(
              item.url
            ),

          position:
            index + 1,
        })
      )
    );
  } catch (error) {
    console.error(
      "Web search failed:",
      error
    );

    throw error;
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
