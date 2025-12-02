import { useState } from "react";
import { ChatMessageList } from "./chat/ChatMessageList";
import { ChatInput } from "./chat/ChatInput";
import { useChat } from "./chat/useChat";
import type { Team } from "./chat/types";
import { MessageSquare, Close } from "./icons";

interface ChatProps {
  gameSlug: string;
  token?: string;
  isAdmin?: boolean;
  gameId?: string;
  adminCode?: string;
  currentTeamId?: string;
  teams?: Team[];
  embedded?: boolean;
}

export function Chat({
  gameSlug,
  token,
  isAdmin = false,
  gameId,
  adminCode,
  currentTeamId,
  teams = [],
  embedded = false,
}: ChatProps) {
  const [isOpen, setIsOpen] = useState(embedded);
  const [newMessage, setNewMessage] = useState("");
  const [recipientType, setRecipientType] = useState<"all" | "team">("all");
  const [recipientId, setRecipientId] = useState("");

  const { messages, sendMessage, unreadCount, resetUnreadCount } = useChat({
    gameSlug,
    token,
    isAdmin,
    gameId,
    adminCode,
    currentTeamId,
    teams,
  });

  const handleSend = async () => {
    const success = await sendMessage(newMessage, recipientType, recipientId);
    if (success) {
      setNewMessage("");
      setRecipientType("all");
      setRecipientId("");
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      resetUnreadCount();
    }
  };

  // Embedded mode - render inline without floating button
  if (embedded) {
    return (
      <div className="chat-embedded">
        <div className="chat-header">
          <h3>Team Chat</h3>
        </div>

        <ChatMessageList
          messages={messages}
          isAdmin={isAdmin}
          currentTeamId={currentTeamId}
        />

        <ChatInput
          value={newMessage}
          onChange={setNewMessage}
          onSend={handleSend}
          isAdmin={isAdmin}
          teams={teams}
          recipientType={recipientType}
          onRecipientTypeChange={setRecipientType}
          recipientId={recipientId}
          onRecipientIdChange={setRecipientId}
        />

        <style>{embeddedStyles}</style>
      </div>
    );
  }

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        className="chat-toggle-btn"
        onClick={toggleChat}
        aria-label="Toggle chat"
      >
        <MessageSquare size={24} />
        {unreadCount > 0 && (
          <span className="chat-badge">{unreadCount}</span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Chat</h3>
            <button onClick={toggleChat} aria-label="Close chat">
              <Close size={20} />
            </button>
          </div>

          <ChatMessageList
            messages={messages}
            isAdmin={isAdmin}
            currentTeamId={currentTeamId}
          />

          <ChatInput
            value={newMessage}
            onChange={setNewMessage}
            onSend={handleSend}
            isAdmin={isAdmin}
            teams={teams}
            recipientType={recipientType}
            onRecipientTypeChange={setRecipientType}
            recipientId={recipientId}
            onRecipientIdChange={setRecipientId}
          />
        </div>
      )}

      <style>{floatingStyles}</style>
    </>
  );
}

const sharedStyles = `
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .chat-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    gap: 0.5rem;
  }
  .chat-empty p {
    margin: 0;
    font-weight: 500;
  }
  .chat-empty span {
    font-size: 0.875rem;
  }
  .chat-message {
    max-width: 85%;
    padding: 0.625rem 0.75rem;
    border-radius: var(--radius);
    animation: chatSlideIn var(--transition-fast) ease-out;
  }
  @keyframes chatSlideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .chat-message-own {
    align-self: flex-end;
    background: var(--color-primary);
    color: white;
  }
  .chat-message-other {
    align-self: flex-start;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }
  .chat-message-sender {
    font-size: 0.6875rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    opacity: 0.8;
  }
  .chat-message-text {
    font-size: 0.8125rem;
    line-height: 1.4;
    word-wrap: break-word;
  }
  .chat-message-time {
    font-size: 0.6875rem;
    margin-top: 0.25rem;
    opacity: 0.6;
  }
  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--border-color);
    background: var(--bg-secondary);
  }
  .chat-header h3 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  .chat-input-container {
    border-top: 1px solid var(--border-color);
    padding: 0.75rem;
    background: var(--bg-secondary);
  }
  .chat-recipient-selector {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.625rem;
  }
  .chat-select {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.8125rem;
    min-height: 2.5rem;
  }
  .chat-input-row {
    display: flex;
    gap: 0.5rem;
  }
  .chat-input {
    flex: 1;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--border-color);
    border-radius: var(--radius);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 0.8125rem;
    min-height: 2.75rem;
    transition: border-color var(--transition-fast);
  }
  .chat-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }
  .chat-send-btn {
    padding: 0.625rem 0.75rem;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background var(--transition-fast);
    min-width: 2.75rem;
  }
  .chat-send-btn:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }
  .chat-send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const embeddedStyles = `
  ${sharedStyles}
  .chat-embedded {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-elevated);
  }
`;

const floatingStyles = `
  ${sharedStyles}
  .chat-toggle-btn {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }
  .chat-toggle-btn:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-lg);
  }
  .chat-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: var(--color-error);
    color: white;
    border-radius: 50%;
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6875rem;
    font-weight: 700;
  }
  .chat-window {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    width: 90vw;
    max-width: 350px;
    height: 70vh;
    max-height: 500px;
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    display: flex;
    flex-direction: column;
    z-index: 1000;
    border: 1px solid var(--border-color);
  }
  .chat-header button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color var(--transition-fast);
  }
  .chat-header button:hover {
    color: var(--text-primary);
  }

  /* Tablet (640px+) */
  @media (min-width: 640px) {
    .chat-toggle-btn {
      bottom: 2rem;
      right: 2rem;
      width: 3.5rem;
      height: 3.5rem;
    }
    .chat-badge {
      width: 1.375rem;
      height: 1.375rem;
      font-size: 0.75rem;
    }
    .chat-window {
      bottom: 2rem;
      right: 2rem;
      width: 350px;
      height: 500px;
    }
    .chat-header {
      padding: 1rem;
    }
    .chat-header h3 {
      font-size: 1rem;
    }
    .chat-messages {
      padding: 1rem;
      gap: 0.75rem;
    }
    .chat-message {
      max-width: 80%;
      padding: 0.75rem;
    }
    .chat-message-sender {
      font-size: 0.75rem;
    }
    .chat-message-text {
      font-size: 0.875rem;
    }
    .chat-message-time {
      font-size: 0.7rem;
    }
    .chat-input-container {
      padding: 0.75rem;
    }
    .chat-recipient-selector {
      margin-bottom: 0.75rem;
    }
    .chat-select {
      font-size: 0.875rem;
    }
    .chat-input {
      padding: 0.75rem;
      font-size: 0.875rem;
    }
    .chat-send-btn {
      padding: 0.75rem;
    }
  }
`;
