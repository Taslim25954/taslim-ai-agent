import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  askAI,
  createConversation,
  getConversationMessages,
  getConversations,
} from "../services/ai.api.js";


// =========================================================
// CONTEXT
// =========================================================

const ChatContext =
  createContext(null);


// =========================================================
// PROVIDER
// =========================================================

export const ChatProvider = ({
  children,
}) => {
  const [conversations, setConversations] =
    useState([]);

  const [activeChatId, setActiveChatId] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [loadingChats, setLoadingChats] =
    useState(false);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState(null);


  // =======================================================
  // CLEAR ERROR
  // =======================================================

  const clearError =
    useCallback(() => {
      setError(null);
    }, []);


  // =======================================================
  // LOAD CONVERSATIONS
  // =======================================================

  const loadConversations =
    useCallback(async () => {
      try {
        setLoadingChats(true);
        setError(null);

        const response =
          await getConversations();

        const list =
          response?.data?.conversations ||
          response?.data ||
          response?.conversations ||
          [];

        setConversations(
          Array.isArray(list)
            ? list
            : []
        );

        return list;
      } catch (err) {
        console.error(
          "❌ Failed to load conversations:",
          err
        );

        setError(
          err?.message ||
            "Failed to load conversations"
        );

        throw err;
      } finally {
        setLoadingChats(false);
      }
    }, []);


  // =======================================================
  // OPEN CHAT
  // =======================================================

  const openChat =
    useCallback(async (chatId) => {
      if (!chatId) {
        throw new Error(
          "Chat ID is required"
        );
      }

      try {
        setActiveChatId(chatId);

        setLoadingMessages(true);

        setError(null);

        const response =
          await getConversationMessages(
            chatId
          );

        const chatMessages =
          response?.data?.messages ||
          [];

        setMessages(
          Array.isArray(
            chatMessages
          )
            ? chatMessages
            : []
        );

        return response;
      } catch (err) {
        console.error(
          "❌ Failed to open chat:",
          err
        );

        setMessages([]);

        setError(
          err?.message ||
            "Failed to load chat"
        );

        throw err;
      } finally {
        setLoadingMessages(false);
      }
    }, []);


  // =======================================================
  // CREATE NEW CHAT
  // =======================================================

  const createNewChat =
    useCallback(async () => {
      try {
        setError(null);

        const response =
          await createConversation();

        const conversation =
          response?.data?.conversation ||
          response?.data ||
          null;

        const chatId =
          conversation?.id ||
          conversation?._id;

        if (!chatId) {
          throw new Error(
            "Conversation ID was not returned"
          );
        }

        const newConversation = {
          ...conversation,
          id: chatId,
          _id: chatId,
        };

        setConversations(
          (previous) => [
            newConversation,
            ...previous.filter(
              (item) =>
                (item?.id ||
                  item?._id) !==
                chatId
            ),
          ]
        );

        setActiveChatId(
          chatId
        );

        setMessages([]);

        return newConversation;
      } catch (err) {
        console.error(
          "❌ Failed to create chat:",
          err
        );

        setError(
          err?.message ||
            "Failed to create chat"
        );

        throw err;
      }
    }, []);


  // =======================================================
  // SEND MESSAGE
  // =======================================================

  const sendMessage =
    useCallback(
      async (text) => {
        const cleanText =
          typeof text === "string"
            ? text.trim()
            : "";

        if (!cleanText) {
          throw new Error(
            "Message is required"
          );
        }

        if (!activeChatId) {
          throw new Error(
            "Please select a conversation first"
          );
        }

        if (sending) {
          return null;
        }

        try {
          setSending(true);

          setError(null);


          // -------------------------------------------------
          // OPTIMISTIC USER MESSAGE
          // -------------------------------------------------

          const temporaryId =
            `temp-${Date.now()}`;

          const temporaryMessage = {
            id: temporaryId,

            role: "user",

            text: cleanText,

            createdAt:
              new Date().toISOString(),

            sources: [],
          };

          setMessages(
            (previous) => [
              ...previous,
              temporaryMessage,
            ]
          );


          // -------------------------------------------------
          // AI REQUEST
          // -------------------------------------------------

          const response =
            await askAI(
              activeChatId,
              cleanText
            );


          // -------------------------------------------------
          // GET SERVER MESSAGES
          // -------------------------------------------------

          const userMessage =
            response?.data?.userMessage;

          const assistantMessage =
            response?.data?.assistantMessage;

          const research =
            response?.data?.research;


          // -------------------------------------------------
          // REPLACE TEMP USER MESSAGE
          // -------------------------------------------------

          setMessages(
            (previous) =>
              previous.map(
                (message) =>
                  message.id ===
                  temporaryId
                    ? {
                        ...message,

                        id:
                          userMessage?.id ||
                          temporaryId,

                        role:
                          userMessage?.role ||
                          "user",

                        text:
                          userMessage?.text ||
                          cleanText,

                        createdAt:
                          userMessage?.createdAt ||
                          message.createdAt,
                      }
                    : message
              )
          );


          // -------------------------------------------------
          // ADD ASSISTANT MESSAGE
          // -------------------------------------------------

          if (assistantMessage) {
            setMessages(
              (previous) => [
                ...previous,
                {
                  ...assistantMessage,

                  sources:
                    assistantMessage.sources ||
                    research?.sources ||
                    [],
                },
              ]
            );
          }


          // -------------------------------------------------
          // UPDATE SIDEBAR CONVERSATION
          // -------------------------------------------------

          setConversations(
            (previous) =>
              previous.map(
                (conversation) => {
                  const id =
                    conversation?.id ||
                    conversation?._id;

                  if (
                    id !==
                    activeChatId
                  ) {
                    return conversation;
                  }

                  return {
                    ...conversation,

                    lastMessage:
                      assistantMessage?.text ||
                      conversation.lastMessage,

                    lastMessageAt:
                      assistantMessage?.createdAt ||
                      new Date().toISOString(),
                  };
                }
              )
          );


          return response;
        } catch (err) {
          console.error(
            "❌ Failed to send message:",
            err
          );


          // -------------------------------------------------
          // REMOVE OPTIMISTIC MESSAGE
          // -------------------------------------------------

          setMessages(
            (previous) =>
              previous.filter(
                (message) =>
                  !String(
                    message.id
                  ).startsWith(
                    "temp-"
                  )
              )
          );


          setError(
            err?.message ||
              "Failed to send message"
          );

          throw err;
        } finally {
          setSending(false);
        }
      },
      [
        activeChatId,
        sending,
      ]
    );


  // =======================================================
  // RESET CHAT STATE
  // =======================================================

  const resetChat =
    useCallback(() => {
      setConversations([]);
      setActiveChatId(null);
      setMessages([]);
      setError(null);
    }, []);


  // =======================================================
  // CONTEXT VALUE
  // =======================================================

  const value =
    useMemo(
      () => ({
        conversations,

        activeChatId,

        messages,

        loadingChats,

        loadingMessages,

        sending,

        error,

        loadConversations,

        openChat,

        createNewChat,

        sendMessage,

        resetChat,

        clearError,

        setActiveChatId,
      }),
      [
        conversations,
        activeChatId,
        messages,
        loadingChats,
        loadingMessages,
        sending,
        error,
        loadConversations,
        openChat,
        createNewChat,
        sendMessage,
        resetChat,
        clearError,
      ]
    );


  return (
    <ChatContext.Provider
      value={value}
    >
      {children}
    </ChatContext.Provider>
  );
};


// =========================================================
// CUSTOM HOOK
// =========================================================

export const useChat = () => {
  const context =
    useContext(
      ChatContext
    );

  if (!context) {
    throw new Error(
      "useChat must be used inside ChatProvider"
    );
  }

  return context;
};


export default ChatContext;
