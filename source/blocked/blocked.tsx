import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { browser } from "webextension-polyfill-ts"; // Need browser API for messaging

import "./styles.scss"; // Import the SCSS file

interface ChatMessage {
  id: string;
  sender: "user" | "gemini";
  text: string;
}

// Define expected message structure from background
interface GeminiResponsePayload {
  responseText: string;
  allowAccess: boolean;
}

interface GeminiErrorPayload {
  error: string;
}

interface BackgroundMessage {
  type: "GEMINI_RESPONSE" | "GEMINI_ERROR";
  payload: GeminiResponsePayload | GeminiErrorPayload;
}

interface AskGeminiPayload {
  message: string;
  url: string;
  originalReason: string;
}

const BlockedPage: React.FC = () => {
  const [reason, setReason] = useState("");
  const [blockedUrl, setBlockedUrl] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isUnblocked, setIsUnblocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Listener for responses from the background script
  useEffect(() => {
    const handleBackgroundMessage = (message: BackgroundMessage): void => {
      if (message.type === "GEMINI_RESPONSE") {
        // Type assertion needed because TS doesn't automatically narrow based on 'type' here
        const payload = message.payload as GeminiResponsePayload;
        const { responseText, allowAccess } = payload;
        const geminiMessage: ChatMessage = {
          id: `gemini-${Date.now()}`,
          sender: "gemini",
          text: responseText,
        };
        setChatMessages((prev) => [...prev, geminiMessage]);
        setIsUnblocked(allowAccess);
        setIsLoading(false);
      } else if (message.type === "GEMINI_ERROR") {
        // Type assertion needed
        const payload = message.payload as GeminiErrorPayload;
        const errorMessage = payload.error;
        const geminiMessage: ChatMessage = {
          id: `gemini-error-${Date.now()}`,
          sender: "gemini",
          text: `Error: ${errorMessage}`,
        };
        setChatMessages((prev) => [...prev, geminiMessage]);
        setIsLoading(false); // Stop loading on error
      }
    };

    browser.runtime.onMessage.addListener(handleBackgroundMessage);

    // Cleanup listener on component unmount
    return () => {
      browser.runtime.onMessage.removeListener(handleBackgroundMessage);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  // Get initial data
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
    const currentMessages = [...chatMessages, userMessage];
    setChatMessages(currentMessages);
    setChatInput("");
    setIsLoading(true);
    setIsUnblocked(false);

    // Send message to background script for processing
    try {
      await browser.runtime.sendMessage({
        type: "ASK_GEMINI",
        payload: {
          message: userMessage.text,
          url: blockedUrl,
          originalReason: reason,
        } satisfies AskGeminiPayload,
      });
      // Response will be handled by the message listener in useEffect
    } catch (error) {
      console.error("Error sending message to background script:", error);
      const geminiMessage: ChatMessage = {
        id: `gemini-error-${Date.now()}`,
        sender: "gemini",
        text: `Error communicating with background script: ${error instanceof Error ? error.message : String(error)}`,
      };
      setChatMessages((prev) => [...prev, geminiMessage]);
      setIsLoading(false); // Stop loading on comms error
    }
  };

  const handleProceed = (): void => {
    // Redirect user to the originally requested URL
    if (blockedUrl) {
      window.location.href = blockedUrl;
    }
  };

  return (
    <div className="blocked-container">
      <h1>Site Blocked</h1>
      <p className="blocked-info">
        Access to <strong>{blockedUrl}</strong> is blocked.
      </p>
      <p className="blocked-info">
        Your reason: <em>{reason}</em>
      </p>

      <hr />

      <h2>Negotiate Access</h2>
      <div className="chat-area">
        {chatMessages.map((msg) => (
          <p
            key={msg.id}
            className={`${msg.sender}-message ${msg.text.startsWith("Error:") ? "error-message" : ""}`.trim()}
          >
            <strong>{msg.sender === "user" ? "You" : "Assistant"}:</strong>{" "}
            {msg.text.replace(/^Error: /, "")}
          </p>
        ))}
        {isLoading && (
          <p>
            <em>Assistant is thinking...</em>
          </p>
        )}
      </div>
      <div className="input-area">
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
        <div className="proceed-section">
          <p>Access granted!</p>
          <button type="button" onClick={handleProceed}>
            Proceed to {blockedUrl}
          </button>
        </div>
      )}
    </div>
  );
};

ReactDOM.render(<BlockedPage />, document.getElementById("root"));
