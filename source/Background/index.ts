import { browser, WebRequest, Runtime } from "webextension-polyfill-ts";

interface BlockedSite {
  domain: string;
  reason: string;
}

// --- Types for Messaging ---
interface AskGeminiPayload {
  message: string;
  url: string;
  originalReason: string;
  // history?: ChatMessage[]; // Could add history later
}

interface BackgroundListenerMessage {
  type: "ASK_GEMINI";
  payload: AskGeminiPayload;
}

browser.runtime.onInstalled.addListener((): void => {
  console.log("Extension installed/updated");
  // Initialize storage if it doesn't exist
  browser.storage.local.get("blockedSites").then((result) => {
    if (!result.blockedSites) {
      browser.storage.local.set({ blockedSites: [] });
    }
  });
});

// Listener for web requests
browser.webRequest.onBeforeRequest.addListener(
  async (
    details: WebRequest.OnBeforeRequestDetailsType,
  ): Promise<WebRequest.BlockingResponse> => {
    const url = new URL(details.url);
    const domain = url.hostname.startsWith("www.")
      ? url.hostname.substring(4)
      : url.hostname;

    // Don't block requests originating from our own extension pages
    if (
      details.initiator &&
      details.initiator.startsWith(browser.runtime.getURL(""))
    ) {
      return {};
    }

    const data = await browser.storage.local.get("blockedSites");
    const blockedSites: BlockedSite[] = data.blockedSites || [];

    const blockedSite = blockedSites.find((site) =>
      domain.includes(site.domain),
    );

    if (blockedSite) {
      console.log(
        `Blocking navigation to ${details.url} (Matched: ${blockedSite.domain})`,
      );
      const redirectUrl = browser.runtime.getURL(
        `blocked.html?reason=${encodeURIComponent(blockedSite.reason || "")}&url=${encodeURIComponent(details.url)}`,
      );
      return { redirectUrl };
    }

    // Allow the request to proceed if no match is found
    return {};
  },
  {
    urls: ["<all_urls>"], // Listen to all URLs
    types: ["main_frame"], // Only block top-level navigation
  },
  ["blocking"], // Specify that this listener intends to block requests
);

// --- Gemini API Integration ---

const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Define the expected JSON schema for the response
const geminiResponseSchema = {
  type: "OBJECT", // Using string values as SDK might not be available here
  properties: {
    allowAccess: { type: "BOOLEAN" },
    reasoning: { type: "STRING" },
  },
  required: ["allowAccess", "reasoning"],
};

async function callGeminiApi(
  apiKey: string,
  userMessage: string,
  url: string,
  originalReason: string,
): Promise<{ responseText: string; allowAccess: boolean }> {
  // Updated prompt with more context
  const prompt = `A user wants to access a website (${url}) they previously blocked. 
Their original reason for blocking was: "${originalReason || "None provided"}".
Their current justification for temporary access is: "${userMessage}". 
Analyze this justification in the context of the site and the original reason. Should they be allowed temporary access? Provide a brief reasoning.`;

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: geminiResponseSchema,
        },
        // safetySettings: [...],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        "Gemini API Error Status:",
        response.status,
        "Body:",
        errorBody,
      );
      throw new Error(
        `Gemini API request failed with status ${response.status}`,
      );
    }

    const data = await response.json();

    // Safely extract content - expecting JSON directly now
    const candidate = data?.candidates?.[0];
    const contentPart = candidate?.content?.parts?.[0];

    // Check if the content part itself exists
    if (!contentPart || !contentPart.text) {
      console.error(
        "Gemini API response missing JSON content part:",
        JSON.stringify(data),
      );
      throw new Error(
        "Invalid response structure from Gemini API (missing content part)",
      );
    }

    // The 'text' field should now contain the JSON string directly
    const jsonText = contentPart.text;

    try {
      // Parse the JSON string provided by the API
      const parsedContent = JSON.parse(jsonText);

      if (
        typeof parsedContent.allowAccess === "boolean" &&
        typeof parsedContent.reasoning === "string"
      ) {
        return {
          responseText: parsedContent.reasoning,
          allowAccess: parsedContent.allowAccess,
        };
      }
      console.error(
        "Gemini response JSON content has unexpected format:",
        parsedContent,
      );
      throw new Error("Gemini response JSON format incorrect.");
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini JSON response text:",
        jsonText,
        parseError,
      );
      throw new Error("Gemini response was not valid JSON as requested.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Listener for messages from content scripts (e.g., blocked.tsx)
browser.runtime.onMessage.addListener(
  async (
    message: BackgroundListenerMessage,
    sender: Runtime.MessageSender,
  ): Promise<void> => {
    if (message.type === "ASK_GEMINI") {
      const { message: userMessage, url, originalReason } = message.payload;
      let apiKey: string | undefined;

      try {
        // 1. Get API Key from storage
        const storageResult = await browser.storage.local.get("geminiApiKey");
        apiKey = storageResult.geminiApiKey;

        if (!apiKey) {
          throw new Error("Gemini API Key not set in options.");
        }

        // 2. Call Gemini API with extra context
        const { responseText, allowAccess } = await callGeminiApi(
          apiKey,
          userMessage,
          url,
          originalReason,
        );

        // 3. Send Success Response back
        if (sender.tab?.id) {
          browser.tabs.sendMessage(sender.tab.id, {
            type: "GEMINI_RESPONSE",
            payload: { responseText, allowAccess },
          });
        }
      } catch (error) {
        console.error("Error handling ASK_GEMINI message:", error);
        // 4. Send Error Response back
        if (sender.tab?.id) {
          browser.tabs.sendMessage(sender.tab.id, {
            type: "GEMINI_ERROR",
            payload: {
              error: error instanceof Error ? error.message : String(error),
            },
          });
        }
      }
    }
    // Return true if you want to send a response asynchronously (optional here as we use tabs.sendMessage)
    // return true;
  },
);
