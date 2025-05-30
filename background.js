// background.js
// Clicking the toolbar icon just reloads the tab so React re-fetches (and re-shuffles) the playlist
chrome.action.onClicked.addListener((tab) => {
    console.log('🔄 Suno Shuffler: icon clicked → reloading', tab.id);
    chrome.tabs.reload(tab.id);
  });
  