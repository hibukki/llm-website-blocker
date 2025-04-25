import React, { useState, useEffect, useCallback } from "react";
import { browser } from "webextension-polyfill-ts";

import "./styles.scss";

interface BlockedSite {
  domain: string;
  reason: string;
}

const Options: React.FC = () => {
  const [domain, setDomain] = useState("");
  const [reason, setReason] = useState("");
  const [blockedSites, setBlockedSites] = useState<BlockedSite[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    browser.storage.local
      .get(["blockedSites", "geminiApiKey"])
      .then((result) => {
        setBlockedSites(result.blockedSites || []);
        setApiKey(result.geminiApiKey || "");
      });
  }, []);

  const handleApiKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setApiKey(event.target.value);
    setSaveStatus("");
  };

  const handleSaveApiKey = useCallback(async () => {
    setSaveStatus("Saving...");
    try {
      await browser.storage.local.set({ geminiApiKey: apiKey });
      setSaveStatus("API Key Saved!");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (error) {
      console.error("Error saving API key:", error);
      setSaveStatus("Error saving key.");
    }
  }, [apiKey]);

  const handleAddSite = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!domain) return;

      const newSite: BlockedSite = {
        domain: domain.trim(),
        reason: reason.trim(),
      };
      const updatedSites = [...blockedSites, newSite];

      await browser.storage.local.set({ blockedSites: updatedSites });
      setBlockedSites(updatedSites);
      setDomain("");
      setReason("");
    },
    [domain, reason, blockedSites],
  );

  const handleRemoveSite = useCallback(
    async (domainToRemove: string) => {
      const updatedSites = blockedSites.filter(
        (site) => site.domain !== domainToRemove,
      );
      await browser.storage.local.set({ blockedSites: updatedSites });
      setBlockedSites(updatedSites);
    },
    [blockedSites],
  );

  return (
    <div className="options-container">
      <h1>Website Blocker Settings</h1>

      <div className="api-key-section">
        <h2>Gemini API Key</h2>
        <div className="api-key-header">
          <p className="description">
            Needed for the chat feature on blocked pages. The key is stored
            locally in the extension&apos;s storage.
          </p>
          <a
            href="https://ai.google.dev/gemini-api/docs/api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="api-key-help-link"
          >
            How to get an API key?
          </a>
        </div>
        <div className="input-group">
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={handleApiKeyChange}
            placeholder="Enter your Gemini API Key"
          />
          <button
            type="button"
            onClick={handleSaveApiKey}
            disabled={saveStatus === "Saving..."}
          >
            Save Key
          </button>
        </div>
        {saveStatus && (
          <p
            className={`status-message ${saveStatus.startsWith("Error") ? "error" : "success"}`}
          >
            {saveStatus}
          </p>
        )}
      </div>

      <form className="add-site-form" onSubmit={handleAddSite}>
        <h2>Add a site to block</h2>
        <div>
          <label htmlFor="domain">Domain:</label>
          <input
            type="text"
            id="domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="reason">Reason:</label>
          <input
            type="text"
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you blocking this site?"
          />
        </div>
        <button type="submit">Add Site</button>
      </form>

      <div className="blocked-sites-list">
        <h2>Currently Blocked Sites</h2>
        {blockedSites.length === 0 ? (
          <p className="no-sites">No sites blocked yet.</p>
        ) : (
          <ul>
            {blockedSites.map((site) => (
              <li key={site.domain}>
                <span>
                  <strong>{site.domain}</strong>:{" "}
                  {site.reason || "No reason provided"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSite(site.domain)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Options;
