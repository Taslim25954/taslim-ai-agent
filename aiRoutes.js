import express from "express";

import {
  askAI,
} from "../controllers/aiController.js";

import { identifyRequest } from "../middlewares/identityMiddleware.js";

import {
  validate,
} from "../middlewares/validate.middleware.js";

import {
  askAISchema,
} from "../validators/ai.validator.js";

import {
  runResearchAgent,
} from "../ai/research/research.agent.js";

const router =
  express.Router();

// =========================================================
// AI CHAT
// =========================================================

router.post(
  "/:chatId/ask",
  identifyRequest,
  validate(askAISchema),
  askAI
);

// =========================================================
// RESEARCH TEST
// =========================================================

router.get(
  "/research-test",
  identifyRequest,
  async (req, res, next) => {
    try {
      const query =
        String(
          req.query.q || ""
        ).trim();

      if (!query) {
        return res.status(400).json({
          success: false,

          message:
            "Query is required.",
        });
      }

      const research =
        await runResearchAgent({
          query,
        });

      return res.status(200).json({
        success: true,

        data: research,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

