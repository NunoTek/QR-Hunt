import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { MessageSquare } from "../icons";
import type { ChatMessage as ChatMessageType } from "./types";

interface ChatMessageListProps {
  messages: ChatMessageType[];
  isAdmin: boolean;
  currentTeamId?: string;
  emptyStateText?: {
    title: string;
    subtitle: string;
  };
}

export function ChatMessageList({
  messages,
  isAdmin,
  currentTeamId,
  emptyStateText = { title: "No messages yet", subtitle: "Send a message to the organizers" },
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isOwnMessage = (msg: ChatMessageType): boolean => {
    return (
      msg.senderType === (isAdmin ? "admin" : "team") &&
      (isAdmin || msg.senderId === currentTeamId)
    );
  };

  if (messages.length === 0) {
    return (
      <div className="chat-messages">
        <div className="chat-empty">
          <MessageSquare size={48} strokeWidth={1.5} className="text-muted" />
          <p>{emptyStateText.title}</p>
          <span>{emptyStateText.subtitle}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} isOwn={isOwnMessage(msg)} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
