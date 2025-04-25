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

  // Load blocked sites from storage on component mount
  useEffect(() => {
    browser.storage.local.get("blockedSites").then((result) => {
      setBlockedSites(result.blockedSites || []);
    });
  }, []);

  const handleAddSite = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault(); // Prevent form submission
      if (!domain) return; // Basic validation

      const newSite: BlockedSite = {
        domain: domain.trim(),
        reason: reason.trim(),
      };
      const updatedSites = [...blockedSites, newSite];

      await browser.storage.local.set({ blockedSites: updatedSites });
      setBlockedSites(updatedSites);
      setDomain(""); // Clear input fields
      setReason("");
    },
    [domain, reason, blockedSites]
  );

  const handleRemoveSite = useCallback(
    async (domainToRemove: string) => {
      const updatedSites = blockedSites.filter(
        (site) => site.domain !== domainToRemove
      );
      await browser.storage.local.set({ blockedSites: updatedSites });
      setBlockedSites(updatedSites);
    },
    [blockedSites]
  );

  return (
    <div className="options-container">
      <h1>Website Blocker Settings</h1>

      <form onSubmit={handleAddSite}>
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

      <h2>Currently Blocked Sites</h2>
      {blockedSites.length === 0 ? (
        <p>No sites blocked yet.</p>
      ) : (
        <ul>
          {blockedSites.map((site) => (
            <li key={site.domain}>
              <strong>{site.domain}</strong>:{" "}
              {site.reason || "No reason provided"}
              <button
                onClick={() => handleRemoveSite(site.domain)}
                style={{ marginLeft: "10px" }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Options;
