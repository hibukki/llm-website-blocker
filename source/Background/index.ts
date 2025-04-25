import { browser, WebRequest } from "webextension-polyfill-ts";

interface BlockedSite {
  domain: string;
  reason: string;
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
    details: WebRequest.OnBeforeRequestDetailsType
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
      domain.includes(site.domain)
    );

    if (blockedSite) {
      console.log(
        `Blocking navigation to ${details.url} (Matched: ${blockedSite.domain})`
      );
      const redirectUrl = browser.runtime.getURL(
        `blocked.html?reason=${encodeURIComponent(blockedSite.reason || "")}&url=${encodeURIComponent(details.url)}`
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
  ["blocking"] // Specify that this listener intends to block requests
);
