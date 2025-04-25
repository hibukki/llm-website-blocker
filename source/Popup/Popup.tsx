import React, { useState, useEffect } from "react";
import { browser, Tabs } from "webextension-polyfill-ts";

import "./styles.scss";

function openWebPage(url: string): Promise<Tabs.Tab> {
  return browser.tabs.create({ url });
}

const Popup: React.FC = () => {
  const [blockedCount, setBlockedCount] = useState<number | null>(null);

  useEffect(() => {
    browser.storage.local.get("blockedSites").then((result) => {
      const count = Array.isArray(result.blockedSites)
        ? result.blockedSites.length
        : 0;
      setBlockedCount(count);
    });
  }, []);

  return (
    <section className="popup-container">
      <h1>Website Blocker</h1>
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
        Manage Blocklist (Options)
      </button>
    </section>
  );
};

export default Popup;
