import { useCallback, useEffect, useState } from "react";
import { getApiUrl } from "~/lib/api";
import { useToast } from "../Toast";
import type { ChatConfig, ChatMessage } from "./types";

interface UseChatOptions extends ChatConfig {
  onNewMessage?: (message: ChatMessage) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (message: string, recipientType: "all" | "team", recipientId?: string) => Promise<boolean>;
  unreadCount: number;
  resetUnreadCount: () => void;
}

export function useChat({
  gameSlug,
  token,
  isAdmin = false,
  gameId,
  adminCode,
  currentTeamId,
  onNewMessage,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const toast = useToast();

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
            console.error("Failed to load messages:", response.status);
          }
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
        isAdmin;

      if (isForMe) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });

        // Notify about new message
        if (message.senderType !== (isAdmin ? "admin" : "team")) {
          setUnreadCount((prev) => prev + 1);
          toast.info(`New message from ${message.senderName}`);
          onNewMessage?.(message);
        }
      }
    });

    return () => {
      eventSource.close();
    };
  }, [gameSlug, currentTeamId, isAdmin, toast, onNewMessage]);

  const sendMessage = useCallback(
    async (message: string, recipientType: "all" | "team", recipientId?: string): Promise<boolean> => {
      if (!message.trim()) return false;

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
          toast.error("Chat not configured properly");
          return false;
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message,
            recipientType,
            recipientId: recipientType === "team" ? recipientId : undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.message) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === data.message.id)) {
                return prev;
              }
              return [...prev, data.message];
            });
          }
          return true;
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || "Failed to send message");
          return false;
        }
      } catch (error) {
        console.error("Chat send exception:", error);
        toast.error("Failed to send message");
        return false;
      }
    },
    [isAdmin, adminCode, gameId, token, toast]
  );

  const resetUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return {
    messages,
    sendMessage,
    unreadCount,
    resetUnreadCount,
  };
}
