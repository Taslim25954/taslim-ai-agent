import mongoose from "mongoose";

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import Source from "../models/Source.js";

import { generateAIResponse } from "../ai/ai.service.js";

import {
  runResearchAgent,
} from "../ai/research/research.agent.js";

import {
  shouldResearch,
} from "../ai/research/research.decision.js";


// =========================================================
// ASK AI
// =========================================================

export const askAI = async (
  req,
  res,
  next
) => {
  let userMessage = null;

  try {
    // =======================================================
    // 1. GET REQUEST DATA
    // =======================================================

    const chatId =
      req.params.chatId;

    const message =
      req.body?.message;

    const userId =
      req.user?.id;

    const guestId =
      req.guestId;

    console.log(
      "========================================"
    );

    console.log(
      "🤖 ASK AI REQUEST"
    );

    console.log(
      "Chat ID:",
      chatId
    );

    console.log(
      "User ID:",
      userId
    );

    console.log(
      "Message:",
      message
    );

    console.log(
      "========================================"
    );


    // =======================================================
    // 2. AUTH CHECK
    // =======================================================

    if (!userId && !guestId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }


    // =======================================================
    // 3. MESSAGE VALIDATION
    // =======================================================

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message is required",
      });
    }

    const cleanMessage =
      message.trim();


    // Production safety limit
    if (
      cleanMessage.length > 10000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Message is too long. Maximum 10000 characters allowed.",
      });
    }


    // =======================================================
    // 4. CHAT ID VALIDATION
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
    // 5. FIND CONVERSATION
    // =======================================================

    const conversation =
      await Conversation.findOne({
        _id: chatId,

        ...(userId ? { createdBy: userId } : { guestId }),

        isDeleted: false,
      });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message:
          "Conversation not found",
      });
    }

    console.log(
      "✅ Conversation found:",
      conversation._id.toString()
    );


    // =======================================================
    // 6. GET PREVIOUS MESSAGES
    // =======================================================

    const previousMessages =
      await Message.find({
        conversation:
          conversation._id,
      })
        .sort({
          createdAt: -1,
        })
        .limit(30)
        .select(
          "role text createdAt"
        )
        .lean();


    // Oldest → newest
    previousMessages.reverse();


    // =======================================================
    // 7. PREPARE AI HISTORY
    // =======================================================

    const history =
      previousMessages.map(
        (item) => ({
          role:
            item.role,

          content:
            item.text,
        })
      );

    console.log(
      "📚 Previous messages:",
      history.length
    );


    // =======================================================
    // 8. SAVE USER MESSAGE
    // =======================================================

    userMessage =
      await Message.create({
        conversation:
          conversation._id,

        ...(userId ? { sender: userId } : { guestId }),

        role:
          "user",

        text:
          cleanMessage,
      });

    console.log(
      "✅ User message saved:",
      userMessage._id.toString()
    );


    // =======================================================
    // 9. RESEARCH DECISION
    // =======================================================

    let research = null;

    let researchRequired =
      false;

    try {
      researchRequired =
        shouldResearch(
          cleanMessage
        );
    } catch (decisionError) {
      console.error(
        "⚠️ Research decision failed:",
        decisionError?.message
      );

      // Safe fallback:
      // If decision system fails, don't search.
      researchRequired = false;
    }


    console.log(
      "🔎 Research required:",
      researchRequired
    );


    // =======================================================
    // 10. RUN RESEARCH ONLY WHEN NEEDED
    // =======================================================

    if (researchRequired) {
      try {
        console.log(
          "🌐 Starting web research..."
        );

        research =
          await runResearchAgent({
            query:
              cleanMessage,
          });

        console.log(
          "✅ Web research completed"
        );

        console.log(
          "🔎 Research sources:",
          research?.results?.length || 0
        );

      } catch (researchError) {
        console.error(
          "⚠️ Web research failed:",
          researchError?.message
        );

        /*
         * IMPORTANT
         *
         * Tavily/research failure should NOT
         * stop Gemini.
         *
         * Gemini will answer without research.
         */

        research = null;
      }
    }


    // =======================================================
    // 11. CALL AI SERVICE
    // =======================================================

    let aiResult;

    try {
      console.log(
        "🤖 Calling AI service..."
      );

      aiResult =
        await generateAIResponse({
          history,

          message:
            cleanMessage,

          research,
        });

      console.log(
        "✅ AI service response received"
      );

    } catch (aiError) {
      console.error(
        "========================================"
      );

      console.error(
        "❌ AI PROVIDER ERROR"
      );

      console.error(
        "Message:",
        aiError?.message
      );

      console.error(
        "Stack:",
        aiError?.stack
      );

      console.error(
        "========================================"
      );


      // -------------------------------------------------------
      // ROLLBACK USER MESSAGE
      // -------------------------------------------------------

      if (userMessage?._id) {
        try {
          await Message.deleteOne({
            _id:
              userMessage._id,
          });
        } catch (deleteError) {
          console.error(
            "Failed to rollback user message:",
            deleteError?.message
          );
        }
      }


      return res.status(502).json({
        success: false,

        message:
          "AI service is temporarily unavailable",

        ...(process.env.NODE_ENV !==
          "production" && {
          error:
            aiError?.message,
        }),
      });
    }


    // =======================================================
    // 12. EXTRACT AI RESPONSE
    // =======================================================

    const aiText =
      aiResult?.content ||
      aiResult?.text ||
      aiResult?.message ||
      "";


    if (
      typeof aiText !== "string" ||
      !aiText.trim()
    ) {
      console.error(
        "❌ AI returned empty response:",
        aiResult
      );


      if (userMessage?._id) {
        try {
          await Message.deleteOne({
            _id:
              userMessage._id,
          });
        } catch (deleteError) {
          console.error(
            "Failed to rollback user message:",
            deleteError?.message
          );
        }
      }


      return res.status(502).json({
        success: false,

        message:
          "AI returned an empty response",
      });
    }


    const cleanAIText =
      aiText.trim();


    // =======================================================
    // 13. SAVE ASSISTANT MESSAGE
    // =======================================================

    const assistantMessage =
      await Message.create({
        conversation:
          conversation._id,

        ...(userId ? { sender: userId } : { guestId }),

        role:
          "assistant",

        text:
          cleanAIText,

        model:
          aiResult?.model ||
          null,
      });


    console.log(
      "✅ Assistant message saved:",
      assistantMessage._id.toString()
    );


    // =======================================================
    // 14. PREPARE RAW SOURCES
    // =======================================================

    const rawSources =
      Array.isArray(
        aiResult?.sources
      )
        ? aiResult.sources
        : [];


    // =======================================================
    // 15. REMOVE DUPLICATE SOURCES
    // =======================================================

    const seenUrls =
      new Set();

    const uniqueSources =
      rawSources.filter(
        (source) => {
          if (
            !source ||
            typeof source.url !==
              "string"
          ) {
            return false;
          }

          const url =
            source.url.trim();

          if (
            !url ||
            seenUrls.has(url)
          ) {
            return false;
          }

          seenUrls.add(url);

          return true;
        }
      );


    // =======================================================
    // 16. PREPARE SOURCE DOCUMENTS
    // =======================================================

    const sourceDocuments =
      uniqueSources
        .map(
          (source, index) => ({
            conversation:
              conversation._id,

            message:
              assistantMessage._id,

            title:
              typeof source.title ===
              "string"
                ? source.title.trim() ||
                  "Untitled source"
                : "Untitled source",

            url:
              source.url.trim(),

            domain:
              typeof source.domain ===
              "string"
                ? source.domain.trim()
                : "",

            snippet:
              typeof source.snippet ===
              "string"
                ? source.snippet.trim()
                : "",

            position:
              Number.isInteger(
                source.position
              )
                ? source.position
                : index + 1,
          })
        )
        .filter(Boolean);


    // =======================================================
    // 17. SAVE SOURCES SAFELY
    // =======================================================

    let savedSources = [];

    try {
      if (
        sourceDocuments.length > 0
      ) {
        savedSources =
          await Source.insertMany(
            sourceDocuments,
            {
              ordered: true,
            }
          );

        console.log(
          "✅ Sources saved:",
          savedSources.length
        );
      }
    } catch (sourceError) {
      /*
       * IMPORTANT:
       *
       * Source database failure should NOT
       * destroy the AI response.
       */

      console.error(
        "⚠️ Source save failed:",
        sourceError?.message
      );

      savedSources = [];
    }


    // =======================================================
    // 18. UPDATE CONVERSATION
    // =======================================================

    conversation.lastMessage =
      cleanAIText.slice(
        0,
        300
      );

    conversation.lastMessageAt =
      new Date();

    await conversation.save();


    console.log(
      "✅ Conversation updated"
    );


    // =======================================================
    // 19. FORMAT SOURCES FOR RESPONSE
    // =======================================================

    const sources =
      savedSources.map(
        (source) => ({
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
        })
      );


    // =======================================================
    // 20. SUCCESS RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,

      message:
        "AI response generated successfully",

      data: {
        conversationId:
          conversation._id,

        userMessage: {
          id:
            userMessage._id,

          role:
            userMessage.role,

          text:
            userMessage.text,

          createdAt:
            userMessage.createdAt,
        },

        assistantMessage: {
          id:
            assistantMessage._id,

          role:
            assistantMessage.role,

          text:
            assistantMessage.text,

          model:
            assistantMessage.model,

          createdAt:
            assistantMessage.createdAt,
        },

        webSearch: {
          enabled:
            Boolean(
              aiResult?.researched
            ),

          count:
            sources.length,

          sources,
        },
      },
    });

  } catch (error) {
    // =======================================================
    // GLOBAL ERROR HANDLER
    // =======================================================

    console.error(
      "========================================"
    );

    console.error(
      "❌ ASK AI CONTROLLER ERROR"
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Stack:",
      error?.stack
    );

    console.error(
      "========================================"
    );


    // =======================================================
    // ROLLBACK USER MESSAGE
    // =======================================================

    if (userMessage?._id) {
      try {
        await Message.deleteOne({
          _id:
            userMessage._id,
        });
      } catch (deleteError) {
        console.error(
          "Failed to rollback user message:",
          deleteError?.message
        );
      }
    }


    next(error);
  }
};
