import type { ChatMessage as ChatMessageType } from "./types";

interface ChatMessageProps {
  message: ChatMessageType;
  isOwn: boolean;
}

export function ChatMessage({ message, isOwn }: ChatMessageProps) {
  return (
    <div className={`chat-message ${isOwn ? "chat-message-own" : "chat-message-other"}`}>
      <div className="chat-message-sender">{message.senderName}</div>
      <div className="chat-message-text">{message.message}</div>
      <div className="chat-message-time">
        {new Date(message.createdAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
