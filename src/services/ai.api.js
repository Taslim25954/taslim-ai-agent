import {
  getAccessToken,
  getGuestId,
  removeAccessToken,
} from "./token.js";


// =========================================================
// API CONFIG
// =========================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/v1";


// =========================================================
// GENERIC API REQUEST
// =========================================================

const apiRequest = async (
  endpoint,
  options = {}
) => {
  const token =
    getAccessToken();

  const headers = {
    "Content-Type": "application/json",

    ...(options.headers || {}),
  };


  // -------------------------------------------------------
  // JWT
  // -------------------------------------------------------

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  } else {
    headers["X-Guest-Id"] = getGuestId();
  }


  let response;

  try {
    response =
      await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          ...options,
          headers,
        }
      );
  } catch (networkError) {
    const error =
      new Error(
        "Unable to connect to the server. Please make sure the backend is running."
      );

    error.cause =
      networkError;

    throw error;
  }


  // -------------------------------------------------------
  // RESPONSE
  // -------------------------------------------------------

  const contentType =
    response.headers.get(
      "content-type"
    );

  let data = null;

  if (
    contentType?.includes(
      "application/json"
    )
  ) {
    try {
      data =
        await response.json();
    } catch {
      data = null;
    }
  } else {
    const text =
      await response.text();

    data =
      text || null;
  }


  // -------------------------------------------------------
  // UNAUTHORIZED
  // -------------------------------------------------------

  if (
    response.status === 401
  ) {
    removeAccessToken();
  }


  // -------------------------------------------------------
  // ERROR
  // -------------------------------------------------------

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    const error =
      new Error(message);

    error.status =
      response.status;

    error.data =
      data;

    throw error;
  }


  return data;
};


// =========================================================
// CREATE CONVERSATION
// =========================================================

export const createConversation =
  async (title = "New Chat") => {
    return apiRequest(
      "/chats",
      {
        method: "POST",

        body: JSON.stringify({
          title,
        }),
      }
    );
  };


// =========================================================
// GET CONVERSATIONS
// =========================================================

export const getConversations =
  async () => {
    return apiRequest(
      "/chats",
      {
        method: "GET",
      }
    );
  };


// =========================================================
// GET CHAT MESSAGES
// =========================================================

export const getConversationMessages =
  async (chatId) => {
    if (!chatId) {
      throw new Error(
        "Chat ID is required"
      );
    }

    return apiRequest(
      `/chats/${encodeURIComponent(
        chatId
      )}`,
      {
        method: "GET",
      }
    );
  };


// =========================================================
// ASK AI
// =========================================================

export const askAI =
  async (
    chatId,
    message
  ) => {
    if (!chatId) {
      throw new Error(
        "Chat ID is required"
      );
    }

    const cleanMessage =
      typeof message === "string"
        ? message.trim()
        : "";

    if (!cleanMessage) {
      throw new Error(
        "Message is required"
      );
    }


    return apiRequest(
      `/ai/${encodeURIComponent(
        chatId
      )}/ask`,
      {
        method: "POST",

        body: JSON.stringify({
          message:
            cleanMessage,
        }),
      }
    );
  };


// =========================================================
// RESEARCH TEST
// =========================================================

export const researchTest =
  async (query) => {
    const cleanQuery =
      typeof query === "string"
        ? query.trim()
        : "";

    if (!cleanQuery) {
      throw new Error(
        "Research query is required"
      );
    }

    return apiRequest(
      `/ai/research-test?q=${encodeURIComponent(
        cleanQuery
      )}`,
      {
        method: "GET",
      }
    );
  };
