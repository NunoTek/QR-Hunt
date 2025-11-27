import { useEffect, useRef, useState } from "react";
import { getApiUrl } from "~/lib/api";
import { useToast } from "./Toast";

interface ChatMessage {
  id: string;
  senderType: "admin" | "team";
  senderId: string | null;
  senderName: string;
  recipientType: "all" | "team";
  recipientId: string | null;
  message: string;
  createdAt: string;
}

interface ChatProps {
  gameSlug: string;
  token?: string;
  isAdmin?: boolean;
  gameId?: string;
  adminCode?: string;
  currentTeamId?: string;
  teams?: Array<{ id: string; name: string }>;
}

export function Chat({ gameSlug, token, isAdmin = false, gameId, adminCode, currentTeamId, teams = [] }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [recipientType, setRecipientType] = useState<"all" | "team">("all");
  const [recipientId, setRecipientId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const baseUrl = getApiUrl();
        const headers: Record<string, string> = {};
        let url = "";

        if (isAdmin && adminCode && gameId) {
          headers["x-admin-code"] = adminCode;
          url = `${baseUrl}/api/v1/chat/admin/${gameId}/messages`;
        } else if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          url = `${baseUrl}/api/v1/chat/messages`;
        }

        if (url) {
          const response = await fetch(url, { headers });
          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages || []);
          } else {
            console.error("Failed to load messages:", response.status, await response.text().catch(() => ""));
          }
        } else {
          console.warn("Chat: No URL for loading messages - token:", !!token, "isAdmin:", isAdmin);
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    loadMessages();
  }, [isAdmin, adminCode, gameId, token]);

  // Listen for new messages via SSE
  useEffect(() => {
    const baseUrl = getApiUrl();
    const eventSource = new EventSource(`${baseUrl}/api/v1/game/${gameSlug}/leaderboard/stream`);

    eventSource.addEventListener("chat", (event) => {
      const message = JSON.parse(event.data) as ChatMessage;
      
      // Check if message is for this user
      const isForMe = 
        message.recipientType === "all" ||
        (message.recipientType === "team" && message.recipientId === currentTeamId) ||
        (isAdmin);

      if (isForMe) {
        setMessages((prev) => {
          // Avoid duplicates (message might already be added from POST response)
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        // Show notification if chat is closed
        if (!isOpen && message.senderType !== (isAdmin ? "admin" : "team")) {
          setUnreadCount((prev) => prev + 1);
          toast.info(`New message from ${message.senderName}`);
        }
      }
    });

    return () => {
      eventSource.close();
    };
  }, [gameSlug, currentTeamId, isAdmin, isOpen, toast]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      const baseUrl = getApiUrl();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      let url = "";

      if (isAdmin && adminCode && gameId) {
        headers["x-admin-code"] = adminCode;
        url = `${baseUrl}/api/v1/chat/admin/${gameId}/messages`;
      } else if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        url = `${baseUrl}/api/v1/chat/messages`;
      }

      if (!url) {
        console.error("Chat: No URL configured - token:", !!token, "isAdmin:", isAdmin);
        toast.error("Chat not configured properly");
        return;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: newMessage,
          recipientType,
          recipientId: recipientType === "team" ? recipientId : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Optimistically add the message to the UI
        if (data.message) {
          setMessages((prev) => {
            // Check if message already exists (from SSE)
            if (prev.some(m => m.id === data.message.id)) {
              return prev;
            }
            return [...prev, data.message];
          });
        }
        setNewMessage("");
        setRecipientType("all");
        setRecipientId("");
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Chat send error:", response.status, errorData);
        toast.error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Chat send exception:", error);
      toast.error("Failed to send message");
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        className="chat-toggle-btn"
        onClick={toggleChat}
        aria-label="Toggle chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="chat-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message ${
                  msg.senderType === (isAdmin ? "admin" : "team") && 
                  (isAdmin || msg.senderId === currentTeamId)
                    ? "chat-message-own"
                    : "chat-message-other"
                }`}
              >
                <div className="chat-message-sender">{msg.senderName}</div>
                <div className="chat-message-text">{msg.message}</div>
                <div className="chat-message-time">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-container">
            {isAdmin && teams.length > 0 && (
              <div className="chat-recipient-selector">
                <select
                  value={recipientType}
                  onChange={(e) => setRecipientType(e.target.value as "all" | "team")}
                  className="chat-select"
                >
                  <option value="all">Everyone</option>
                  <option value="team">Specific Team</option>
                </select>
                {recipientType === "team" && (
                  <select
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    className="chat-select"
                  >
                    <option value="">Select team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            <div className="chat-input-row">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="chat-input"
              />
              <button onClick={handleSend} className="chat-send-btn" disabled={!newMessage.trim()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
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
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        .chat-message {
          max-width: 85%;
          padding: 0.625rem 0.75rem;
          border-radius: var(--radius);
          animation: slideIn var(--transition-fast) ease-out;
        }
        @keyframes slideIn {
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
      `}</style>
    </>
  );
}
