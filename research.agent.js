import {
  searchWeb,
} from "./search.service.js";

export const runResearchAgent =
  async ({
    query,
  }) => {
    if (
      typeof query !== "string" ||
      !query.trim()
    ) {
      throw new Error(
        "Research query is required"
      );
    }

    const results =
      await searchWeb({
        query: query.trim(),
      });

    return {
      query: query.trim(),

      results,

      searched:
        results.length > 0,

      count:
        results.length,
    };
  };
  