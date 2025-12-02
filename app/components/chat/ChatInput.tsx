import { Send } from "../icons";
import type { Team } from "./types";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isAdmin: boolean;
  teams: Team[];
  recipientType: "all" | "team";
  onRecipientTypeChange: (type: "all" | "team") => void;
  recipientId: string;
  onRecipientIdChange: (id: string) => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  isAdmin,
  teams,
  recipientType,
  onRecipientTypeChange,
  recipientId,
  onRecipientIdChange,
}: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSend();
    }
  };

  return (
    <div className="chat-input-container">
      {isAdmin && teams.length > 0 && (
        <div className="chat-recipient-selector">
          <select
            value={recipientType}
            onChange={(e) => onRecipientTypeChange(e.target.value as "all" | "team")}
            className="chat-select"
          >
            <option value="all">Everyone</option>
            <option value="team">Specific Team</option>
          </select>
          {recipientType === "team" && (
            <select
              value={recipientId}
              onChange={(e) => onRecipientIdChange(e.target.value)}
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button
          onClick={onSend}
          className="chat-send-btn"
          disabled={!value.trim()}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
