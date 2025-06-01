// background.js
// --------------------
// ─── NEW: Listen for SPA navigations via webNavigation ────────────────────────
chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    // Only inject if the URL now matches /playlist/*
    if (details.url && details.url.match(/^https:\/\/suno\.com\/playlist\/.+/)) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId, allFrames: false },
        files: ['preload.js']
      });
    }
  },
  {
    // Restrict to Suno.com so we don’t fire on every site’s history state change
    url: [
      {
        hostEquals: 'suno.com',
        pathPrefix: '/playlist/'
      }
    ]
  }
);
