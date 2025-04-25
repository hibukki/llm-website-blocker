import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

interface ChatMessage {
  id: string;
  sender: "user" | "gemini";
  text: string;
}

const BlockedPage: React.FC = () => {
  const [reason, setReason] = useState("");
  const [blockedUrl, setBlockedUrl] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isUnblocked, setIsUnblocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const reasonParam = urlParams.get("reason");
    const urlParam = urlParams.get("url");
    setReason(decodeURIComponent(reasonParam || "No reason provided."));
    setBlockedUrl(decodeURIComponent(urlParam || "Unknown URL"));
    setChatMessages([
      {
        id: `gemini-${Date.now()}`,
        sender: "gemini",
        text: "This site is blocked. Please explain why you need to access it.",
      },
    ]);
  }, []);

  const handleSendMessage = async (): Promise<void> => {
    if (!chatInput.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: chatInput,
    };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsLoading(true);

    // --- Placeholder for Gemini API Call --- C
    // In a real implementation, you would send `chatInput`
    // to your secure backend, which calls the Gemini API.
    // The backend would return the response text and an allow/deny boolean.
    console.log("Simulating Gemini call for message:", userMessage.text);
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate network delay

    // Simulated response (always deny for now)
    const geminiResponseText =
      "Access request denied. Please focus on other tasks.";
    const allowAccess = false; // TODO: Replace with actual Gemini logic
    // --- End Placeholder ---

    const geminiMessage: ChatMessage = {
      id: `gemini-${Date.now()}`,
      sender: "gemini",
      text: geminiResponseText,
    };

    setChatMessages((prev) => [...prev, geminiMessage]);
    setIsUnblocked(allowAccess);
    setIsLoading(false);
  };

  const handleProceed = (): void => {
    // Redirect user to the originally requested URL
    if (blockedUrl) {
      window.location.href = blockedUrl;
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Site Blocked</h1>
      <p>
        Access to <strong>{blockedUrl}</strong> is blocked.
      </p>
      <p>
        Your reason: <em>{reason}</em>
      </p>

      <hr style={{ margin: "20px 0" }} />

      <h2>Negotiate Access</h2>
      <div
        style={{
          marginBottom: "10px",
          maxHeight: "300px",
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "10px",
        }}
      >
        {chatMessages.map((msg) => (
          <p
            key={msg.id}
            style={{ textAlign: msg.sender === "user" ? "right" : "left" }}
          >
            <strong>{msg.sender === "user" ? "You" : "Assistant"}:</strong>{" "}
            {msg.text}
          </p>
        ))}
        {isLoading && (
          <p>
            <em>Assistant is thinking...</em>
          </p>
        )}
      </div>
      <div>
        <input
          type="text"
          value={chatInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setChatInput(e.target.value);
          }}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}
          placeholder="Explain why you need access..."
          disabled={isLoading || isUnblocked}
        />
        <button
          type="button"
          onClick={handleSendMessage}
          disabled={isLoading || isUnblocked}
        >
          Send
        </button>
      </div>

      {isUnblocked && (
        <div style={{ marginTop: "20px" }}>
          <p style={{ color: "green" }}>Access granted!</p>
          <button type="button" onClick={handleProceed}>
            Proceed to {blockedUrl}
          </button>
        </div>
      )}
    </div>
  );
};

ReactDOM.render(<BlockedPage />, document.getElementById("root"));
