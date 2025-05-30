// preload.js
// Injects override.js as an external <script> (CSP‑safe)
(() => {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('override.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  })();
  