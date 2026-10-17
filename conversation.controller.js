import mongoose from "mongoose";

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Source from "../models/Source.js";


// =========================================================
// GET CONVERSATION MESSAGES
// =========================================================

export const getConversationMessages = async (
  req,
  res,
  next
) => {
  try {
    // =======================================================
    // 1. GET PARAMS
    // =======================================================

    const { chatId } = req.params;

    const userId =
      req.user?.id;


    // =======================================================
    // 2. AUTH CHECK
    // =======================================================

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }


    // =======================================================
    // 3. CHAT ID VALIDATION
    // =======================================================

    if (!chatId) {
      return res.status(400).json({
        success: false,
        message:
          "Chat ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        chatId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid chat ID",
      });
    }


    // =======================================================
    // 4. CHECK CONVERSATION OWNERSHIP
    // =======================================================

    const conversation =
      await Conversation.findOne({
        _id: chatId,

        createdBy: userId,

        isDeleted: false,
      }).lean();


    if (!conversation) {
      return res.status(404).json({
        success: false,
        message:
          "Conversation not found",
      });
    }


    // =======================================================
    // 5. GET MESSAGES
    // =======================================================

    const messages =
      await Message.find({
        conversation:
          conversation._id,
      })
        .sort({
          createdAt: 1,
        })
        .lean();


    // =======================================================
    // 6. GET ALL MESSAGE IDS
    // =======================================================

    const messageIds =
      messages.map(
        (message) =>
          message._id
      );


    // =======================================================
    // 7. GET SOURCES
    // =======================================================

    let sources = [];

    if (
      messageIds.length > 0
    ) {
      sources =
        await Source.find({
          message: {
            $in: messageIds,
          },
        })
          .sort({
            position: 1,
          })
          .lean();
    }


    // =======================================================
    // 8. GROUP SOURCES BY MESSAGE
    // =======================================================

    const sourcesByMessage =
      new Map();

    for (const source of sources) {
      const key =
        source.message.toString();

      if (
        !sourcesByMessage.has(
          key
        )
      ) {
        sourcesByMessage.set(
          key,
          []
        );
      }

      sourcesByMessage
        .get(key)
        .push({
          id:
            source._id,

          title:
            source.title,

          url:
            source.url,

          domain:
            source.domain,

          snippet:
            source.snippet,

          position:
            source.position,
        });
    }


    // =======================================================
    // 9. BUILD FRONTEND-FRIENDLY MESSAGES
    // =======================================================

    const formattedMessages =
      messages.map(
        (message) => {
          const messageSources =
            sourcesByMessage.get(
              message._id.toString()
            ) || [];

          return {
            id:
              message._id,

            role:
              message.role,

            text:
              message.text,

            model:
              message.model,

            createdAt:
              message.createdAt,

            updatedAt:
              message.updatedAt,

            sources:
              messageSources,
          };
        }
      );


    // =======================================================
    // 10. SUCCESS RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,

      data: {
        conversation: {
          id:
            conversation._id,

          title:
            conversation.title,

          participants:
            conversation.participants,

          createdBy:
            conversation.createdBy,

          lastMessage:
            conversation.lastMessage,

          lastMessageAt:
            conversation.lastMessageAt,

          createdAt:
            conversation.createdAt,

          updatedAt:
            conversation.updatedAt,
        },

        messages:
          formattedMessages,

        messageCount:
          formattedMessages.length,
      },
    });

  } catch (error) {
    console.error(
      "❌ GET CONVERSATION MESSAGES ERROR:",
      error
    );

    next(error);
  }
};
