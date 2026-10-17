import { z } from "zod";

export const askAISchema = z.object({
  body: z.object({
    message: z
      .string({
        required_error: "Message is required",
      })
      .trim()
      .min(1, "Message cannot be empty")
      .max(10000, "Message cannot exceed 10000 characters"),
  }),

  params: z.object({
    chatId: z
      .string({
        required_error: "Chat ID is required",
      })
      .regex(
        /^[0-9a-fA-F]{24}$/,
        "Invalid chat ID"
      ),
  }),

  query: z.object({}).passthrough(),
});
