import Sources from "./Sources.jsx";

const ChatMessage = ({
  message,
}) => {
  const isUser =
    message.role === "user";

  return (
    <article
      className={
        isUser
          ? "message user-message"
          : "message assistant-message"
      }
    >
      <div className="message-content">
        {message.content}
      </div>

      {!isUser &&
        message.sources?.length > 0 && (
          <Sources
            sources={
              message.sources
            }
          />
        )}
    </article>
  );
};

export default ChatMessage;
