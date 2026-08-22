import {
  useEffect,
  useState,
} from "react";

import {
  useAuth,
} from "./context/authContext.jsx";

import {
  useChat,
} from "./context/Chatcontext.jsx";

import "./App.css";
import Login from "./pages/login.jsx";

// =========================================================
// APP
// =========================================================

function App() {
  const {
    user,
    isAuthenticated,
    logout,
  } = useAuth();

  const {
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
  } = useChat();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [authModal, setAuthModal] =
    useState(null);

  const [input, setInput] =
    useState("");

  const profileImage =
    user?.profileImage ||
    user?.avatar ||
    "";

  const displayName =
    user?.username ||
    user?.name ||
    user?.email ||
    "User";

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "U";


  // =======================================================
  // LOAD CONVERSATIONS AFTER LOGIN
  // =======================================================

  useEffect(() => {
    if (
      isAuthenticated
    ) {
      loadConversations()
        .catch(() => {});
    }
  }, [
    isAuthenticated,
    loadConversations,
  ]);


  // =======================================================
  // CREATE CHAT
  // =======================================================

  const handleNewChat =
    async () => {
      try {
        clearError();

        await createNewChat();

        setInput("");

        setSidebarOpen(false);
      } catch {
        // ChatContext handles error
      }
    };


  // =======================================================
  // OPEN CHAT
  // =======================================================

  const handleOpenChat =
    async (chatId) => {
      try {
        clearError();

        await openChat(chatId);

        setSidebarOpen(false);
      } catch {
        // ChatContext handles error
      }
    };


  // =======================================================
  // SEND MESSAGE
  // =======================================================

  const handleSend =
    async () => {
      const message =
        input.trim();

      if (!message) {
        return;
      }

      if (sending) {
        return;
      }

      try {
        if (!activeChatId) {
          await createNewChat();
        }

        setInput("");

        await sendMessage(
          message
        );
      } catch {
        // ChatContext handles error
      }
    };


  // =======================================================
  // ENTER KEY
  // =======================================================

  const handleKeyDown =
    (event) => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        handleSend();
      }
    };


  // =======================================================
  // LOGOUT
  // =======================================================

  const handleLogout =
    () => {
      logout();
      resetChat();

      setSidebarOpen(false);
    };


  // =======================================================
  // MAIN APPLICATION
  // =======================================================

  return (
    <div className="app-shell">


      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Close sidebar"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}


      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`chat-sidebar ${
          sidebarOpen
            ? "chat-sidebar-open"
            : ""
        }`}
      >

        <div className="sidebar-header">

          <div className="brand">
            <div className="brand-mark">
              AI
            </div>

            <div className="brand-text">
              <strong>
                Taslim AI
              </strong>

              <span>
                Intelligent Agent
              </span>
            </div>
          </div>


          <button
            type="button"
            className="sidebar-close"
            aria-label="Close sidebar"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            ×
          </button>

        </div>


        {/* =================================================
            NEW CHAT
        ================================================= */}

        <button
          type="button"
          className="new-chat-button"
          onClick={handleNewChat}
          disabled={loadingChats}
        >
          <span className="new-chat-icon">
            +
          </span>

          <span>
            New Chat
          </span>
        </button>


        {/* =================================================
            HISTORY
        ================================================= */}

        <div className="history-section">

          <div className="history-heading">
            <span>
              History
            </span>

            <span className="history-count">
              {conversations.length}
            </span>
          </div>


          <div className="history-list">

            {loadingChats ? (
              <div className="history-loading">
                <span />
                <span />
                <span />
              </div>
            ) : conversations.length === 0 ? (

              <div className="empty-history">
                <div className="empty-history-icon">
                  ✦
                </div>

                <p>
                  No conversations yet
                </p>

                <span>
                  Start a new chat
                  to begin.
                </span>
              </div>

            ) : (

              conversations.map(
                (conversation) => {
                  const id =
                    conversation?.id ||
                    conversation?._id;

                  const title =
                    conversation?.title ||
                    "New Chat";

                  const active =
                    id ===
                    activeChatId;

                  return (
                    <button
                      key={id}
                      type="button"
                      className={`history-item ${
                        active
                          ? "history-item-active"
                          : ""
                      }`}
                      onClick={() =>
                        handleOpenChat(id)
                      }
                    >
                      <span className="history-item-icon">
                        ◇
                      </span>

                      <span className="history-item-content">
                        <span className="history-item-title">
                          {title}
                        </span>

                        {conversation?.lastMessage && (
                          <span className="history-item-preview">
                            {
                              conversation.lastMessage
                            }
                          </span>
                        )}
                      </span>
                    </button>
                  );
                }
              )
            )}

          </div>

        </div>


        {/* =================================================
            SIDEBAR FOOTER
        ================================================= */}

        <div className="sidebar-footer">

          {isAuthenticated ? <>
          <div className="user-card">

            <div className="user-avatar">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={displayName}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="user-info">

              <strong>
                {displayName}
              </strong>

              <span>
                {user?.email || ""}
              </span>

            </div>

          </div>


          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            <span>
              ↪
            </span>

            Logout
          </button>
          </> : (
            <div className="guest-auth-actions">
              <span>Sign in to save your chats</span>
              <button type="button" className="login-button" onClick={() => setAuthModal("login")}>Login</button>
              <button type="button" className="register-button" onClick={() => setAuthModal("register")}>Register</button>
            </div>
          )}

        </div>

      </aside>


      {/* =================================================
          MAIN CHAT
      ================================================= */}

      <main className="chat-main">


        {/* =================================================
            TOP BAR
        ================================================= */}

        <header className="chat-header">

          <button
            type="button"
            className="mobile-menu-button"
            aria-label="Open sidebar"
            onClick={() =>
              setSidebarOpen(true)
            }
          >
            ☰
          </button>


          <div className="chat-header-info">

            <div className="mobile-brand-mark">
              AI
            </div>

            <div>
              <h1>
                {activeChatId
                  ? "AI Assistant"
                  : "New Conversation"}
              </h1>

              <span>
                {sending
                  ? "Thinking..."
                  : "Ready to help"}
              </span>
            </div>

          </div>


          <div className="header-status">
            <span className="status-dot" />

            Online
          </div>

          {!isAuthenticated && (
            <button type="button" className="header-login-button" onClick={() => setAuthModal("login")}>Login</button>
          )}

        </header>


        {/* =================================================
            CHAT CONTENT
        ================================================= */}

        <section className="chat-content">

          {!activeChatId ? (

            <div className="welcome-screen">

              <div className="welcome-icon">
                ✦
              </div>

              <h2>
                What can I help you with?
              </h2>

              <p>
                Ask anything. I can research,
                reason through problems,
                and give you clear answers.
              </p>


              <div className="suggestion-grid">

                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Explain artificial intelligence in simple terms"
                    )
                  }
                >
                  <strong>
                    Explain something
                  </strong>

                  <span>
                    Learn a complex topic
                  </span>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "What are the latest developments in AI?"
                    )
                  }
                >
                  <strong>
                    Research latest news
                  </strong>

                  <span>
                    Find current information
                  </span>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Help me build a production-ready MERN application"
                    )
                  }
                >
                  <strong>
                    Build something
                  </strong>

                  <span>
                    Get coding assistance
                  </span>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setInput(
                      "Create a step-by-step learning plan for me"
                    )
                  }
                >
                  <strong>
                    Make a plan
                  </strong>

                  <span>
                    Organize your next steps
                  </span>
                </button>

              </div>

            </div>

          ) : loadingMessages ? (

            <div className="messages-loading">

              <div className="loading-spinner" />

              <p>
                Loading conversation...
              </p>

            </div>

          ) : messages.length === 0 ? (

            <div className="empty-chat">

              <div className="welcome-icon">
                ✦
              </div>

              <h2>
                Start the conversation
              </h2>

              <p>
                Send your first message below.
              </p>

            </div>

          ) : (

            <div className="messages-container">

              {messages.map(
                (message) => (
                  <Message
                    key={
                      message.id ||
                      message._id
                    }
                    message={message}
                  />
                )
              )}

              {sending && (
                <div className="message-row assistant-row">

                  <div className="assistant-avatar">
                    AI
                  </div>

                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>

                </div>
              )}

            </div>

          )}

        </section>


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="chat-error">

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={clearError}
            >
              ×
            </button>

          </div>
        )}


        {/* =================================================
            CHAT INPUT
        ================================================= */}

        <div className="chat-input-area">

          <div className="chat-input-wrapper">

            <textarea
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Ask anything..."
              rows={1}
              disabled={sending}
            />

            <button
              type="button"
              className="send-button"
              onClick={handleSend}
              disabled={
                sending ||
                !input.trim()
              }
              aria-label="Send message"
            >
              ↑
            </button>

          </div>

          <div className="input-hint">
            Press Enter to send · Shift + Enter for new line
          </div>

        </div>

      </main>

      {authModal && (
        <div className="auth-modal-backdrop" role="presentation" onMouseDown={() => setAuthModal(null)}>
          <div className="auth-modal" role="dialog" aria-modal="true" aria-label={authModal === "login" ? "Login" : "Register"} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="auth-modal-close" aria-label="Close authentication" onClick={() => setAuthModal(null)}>Ã—</button>
            <Login initialMode={authModal} onAuthenticated={() => setAuthModal(null)} />
          </div>
        </div>
      )}

    </div>
  );
}


// =========================================================
// MESSAGE COMPONENT
// =========================================================

function Message({
  message,
}) {
  const isUser =
    message.role ===
    "user";

  const sources =
    Array.isArray(
      message.sources
    )
      ? message.sources
      : [];


  return (
    <article
      className={`message-row ${
        isUser
          ? "user-row"
          : "assistant-row"
      }`}
    >

      {!isUser && (
        <div className="assistant-avatar">
          AI
        </div>
      )}


      <div className="message-column">

        <div
          className={`message-bubble ${
            isUser
              ? "user-bubble"
              : "assistant-bubble"
          }`}
        >
          <div className="message-text">
            {message.text}
          </div>
        </div>


        {/* =================================================
            SOURCES
        ================================================= */}

        {!isUser &&
          sources.length > 0 && (
            <div className="sources">

              <div className="sources-title">
                Sources
              </div>

              <div className="sources-list">

                {sources.map(
                  (
                    source,
                    index
                  ) => (
                    <a
                      key={
                        source.id ||
                        source._id ||
                        index
                      }
                      href={
                        source.url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="source-card"
                    >
                      <span className="source-number">
                        {index + 1}
                      </span>

                      <span className="source-content">

                        <strong>
                          {source.title ||
                            source.domain ||
                            "Source"}
                        </strong>

                        <span>
                          {source.domain ||
                            source.url}
                        </span>

                      </span>

                      <span className="source-arrow">
                        ↗
                      </span>
                    </a>
                  )
                )}

              </div>

            </div>
          )}

      </div>

    </article>
  );
}


export default App;
