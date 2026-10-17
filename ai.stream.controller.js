import mongoose from "mongoose";

import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

import {
  streamAIResponse,
} from "../ai/ai.service.js";

import { ApiError } from "../utils/ApiError.js";

export const streamAI = async (
  req,
  res,
  next
) => {
  let userMessage = null;
  let chat = null;

  try {
    const {
      chatId,
      message,
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate chat ID
    |--------------------------------------------------------------------------
    */

    if (
      chatId &&
      !mongoose.Types.ObjectId.isValid(
        chatId
      )
    ) {
      throw new ApiError(
        400,
        "Invalid chat ID."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Find existing chat
    |--------------------------------------------------------------------------
    */

    if (chatId) {
      chat = await Chat.findOne({
        _id: chatId,

        user: req.user.id,
      });

      if (!chat) {
        throw new ApiError(
          404,
          "Chat not found."
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create new chat
    |--------------------------------------------------------------------------
    */

    if (!chat) {
      const title =
        message.length > 60
          ? `${message.slice(0, 60)}...`
          : message;

      chat = await Chat.create({
        user: req.user.id,

        title,

        lastMessagePreview:
          message.slice(0, 300),
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Load history
    |--------------------------------------------------------------------------
    */

    const previousMessages =
      await Message.find({
        chat: chat._id,
      })
        .sort({
          createdAt: -1,
        })
        .limit(30)
        .select(
          "role content createdAt"
        )
        .lean();

    previousMessages.reverse();

    const history =
      previousMessages.map(
        (item) => ({
          role: item.role,

          content:
            item.content,
        })
      );

    /*
    |--------------------------------------------------------------------------
    | Save user message
    |--------------------------------------------------------------------------
    */

    userMessage =
      await Message.create({
        chat: chat._id,

        role: "user",

        content: message,
      });

    /*
    |--------------------------------------------------------------------------
    | HTTP streaming headers
    |--------------------------------------------------------------------------
    */

    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      "text/event-stream; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-transform"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    res.setHeader(
      "X-Accel-Buffering",
      "no"
    );

    res.flushHeaders();

    /*
    |--------------------------------------------------------------------------
    | Send helper
    |--------------------------------------------------------------------------
    */

    const sendEvent = (
      event,
      data
    ) => {
      res.write(
        `event: ${event}\n`
      );

      res.write(
        `data: ${JSON.stringify(data)}\n\n`
      );
    };

    /*
    |--------------------------------------------------------------------------
    | Initial event
    |--------------------------------------------------------------------------
    */

    sendEvent(
      "start",
      {
        chatId:
          chat._id.toString(),
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Gemini stream
    |--------------------------------------------------------------------------
    */

    const stream =
      await streamAIResponse({
        history,

        message,
      });

    let fullResponse = "";

    /*
    |--------------------------------------------------------------------------
    | Read Gemini chunks
    |--------------------------------------------------------------------------
    */

    for await (
      const chunk of stream
    ) {
      const text =
        chunk?.text || "";

      if (!text) {
        continue;
      }

      fullResponse += text;

      sendEvent(
        "chunk",
        {
          text,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent empty AI response
    |--------------------------------------------------------------------------
    */

    if (!fullResponse.trim()) {
      throw new Error(
        "AI returned an empty response."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Save complete assistant response
    |--------------------------------------------------------------------------
    */

    const assistantMessage =
      await Message.create({
        chat: chat._id,

        role: "assistant",

        content:
          fullResponse,

        model:
          process.env.GEMINI_MODEL ||
          null,
      });

    /*
    |--------------------------------------------------------------------------
    | Update chat
    |--------------------------------------------------------------------------
    */

    chat.lastMessagePreview =
      fullResponse.slice(
        0,
        300
      );

    chat.updatedAt =
      new Date();

    await chat.save();

    /*
    |--------------------------------------------------------------------------
    | Complete event
    |--------------------------------------------------------------------------
    */

    sendEvent(
      "complete",
      {
        messageId:
          assistantMessage._id.toString(),

        chatId:
          chat._id.toString(),

        model:
          assistantMessage.model,
      }
    );

    res.end();
  } catch (error) {
    console.error(
      "Streaming AI error:",
      error
    );

    /*
    |--------------------------------------------------------------------------
    | If headers already sent, send SSE error
    |--------------------------------------------------------------------------
    */

    if (res.headersSent) {
      try {
        res.write(
          `event: error\n`
        );

        res.write(
          `data: ${JSON.stringify({
            message:
              error instanceof ApiError
                ? error.message
                : "AI service is temporarily unavailable.",
          })}\n\n`
        );

        res.end();
      } catch {
        res.end();
      }

      return;
    }

    next(error);
  }
};
