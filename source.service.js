// backend/src/ai/research/source.service.js

/**
 * Normalize a single search result.
 *
 * Keeps only the fields our AI agent needs.
 */
export const normalizeSource = (
  source,
  index = 0
) => {
  if (!source) {
    return null;
  }

  const url =
    typeof source.url === "string"
      ? source.url.trim()
      : "";

  if (!url) {
    return null;
  }

  return {
    title:
      typeof source.title === "string" &&
      source.title.trim()
        ? source.title.trim()
        : "Untitled source",

    url,

    domain:
      typeof source.domain === "string"
        ? source.domain.trim()
        : extractDomain(url),

    snippet:
      typeof source.snippet === "string"
        ? source.snippet.trim()
        : "",

    position:
      Number.isInteger(source.position)
        ? source.position
        : index + 1,
  };
};

/**
 * Normalize multiple search results.
 */
export const normalizeSources = (
  results = []
) => {
  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((source, index) =>
      normalizeSource(
        source,
        index
      )
    )
    .filter(Boolean)
    .slice(0, 10)
    .map((source, index) => ({
      ...source,
      position: index + 1,
    }));
};

/**
 * Convert sources into a safe text context
 * for Gemini.
 */
export const buildResearchContext = (
  results = []
) => {
  const sources =
    normalizeSources(results);

  if (!sources.length) {
    return "";
  }

  return sources
    .map(
      (source) => `
[SOURCE ${source.position}]

Title:
${source.title}

Domain:
${source.domain}

URL:
${source.url}

Content:
${source.snippet}
`
    )
    .join("\n");
};

/**
 * Extract hostname safely.
 */
const extractDomain = (url) => {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./, "");
  } catch {
    return "";
  }
};
