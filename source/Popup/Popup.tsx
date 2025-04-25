import React, { useState, useEffect } from "react";
import { browser, Tabs } from "webextension-polyfill-ts";

import "./styles.scss";

function openWebPage(url: string): Promise<Tabs.Tab> {
  return browser.tabs.create({ url });
}

const Popup: React.FC = () => {
  const [blockedCount, setBlockedCount] = useState<number | null>(null);
  const [apiKeySet, setApiKeySet] = useState<boolean | null>(null);

  useEffect(() => {
    browser.storage.local
      .get(["blockedSites", "geminiApiKey"])
      .then((result) => {
        const count = Array.isArray(result.blockedSites)
          ? result.blockedSites.length
          : 0;
        setBlockedCount(count);
        setApiKeySet(!!result.geminiApiKey);
      });
  }, []);

  return (
    <section className="popup-container">
      <h1>Website Blocker</h1>

      {apiKeySet === false && (
        <p className="warning-message">
          ⚠ Gemini API Key not set in Settings. The chat feature on blocked
          pages will not work.
        </p>
      )}

      <div className="status-info">
        {blockedCount === null ? (
          <p>Loading...</p>
        ) : (
          <p>
            Currently blocking <strong>{blockedCount}</strong> site
            {blockedCount !== 1 ? "s" : ""}.
          </p>
        )}
      </div>
      <button
        className="options-button"
        type="button"
        onClick={(): Promise<Tabs.Tab> => {
          return openWebPage("options.html");
        }}
      >
        Settings
      </button>
    </section>
  );
};

export default Popup;
