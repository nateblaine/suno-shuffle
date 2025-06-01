// // override.js
// Runs in the page context—overrides window.fetch to shuffle playlist_clips, adds shuffle button,
// and (optionally) auto-plays the first song after shuffle.

(() => {

  // ─── Prevent double-injection ─────────────────────────────────────────────
  if (window.__sunoShuffleInjected) {
    return;
  }
  window.__sunoShuffleInjected = true;
  // ────────────────────────────────────────────────────────────────────────────────
  const originalFetch = window.fetch.bind(window);
  let playlistData = null;
  // ────────────────────────────────────────────────────────────────────────────────
  // STEP 0: Always override fetch at the very start, so we can capture playlist JSON
  // ────────────────────────────────────────────────────────────────────────────────
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    // Only target the playlist endpoint (e.g. /api/playlist/?page=…)
    if (url.includes('/api/playlist/')) {
      // 1) If we have a stored shuffled JSON, return it immediately (and re-populate playlistData)
      const shuffledDataJson = sessionStorage.getItem('sunoShuffledData');
      const storedShuffleId  = sessionStorage.getItem('sunoShuffleId');

      if (shuffledDataJson && storedShuffleId) {
        try {
          const shuffledData = JSON.parse(shuffledDataJson);

          // Repopulate our in-memory playlistData so createShuffleButton can see it
          playlistData = shuffledData;

          // Clear the sessionStorage entries if they match, to avoid reusing old shuffle
          const currentShuffleId = sessionStorage.getItem('sunoShuffleId');
          if (currentShuffleId === storedShuffleId) {
            sessionStorage.removeItem('sunoShuffledData');
            sessionStorage.removeItem('sunoShuffleId');
          }

          // Return a fake Response containing the shuffled JSON
          const blob = new Blob([shuffledDataJson], { type: 'application/json' });
          return new Response(blob, {
            status: 200,
            statusText: 'OK',
            headers: new Headers({
              'Content-Type': 'application/json'
            })
          });
        } catch (e) {
          // Error parsing shuffled data
        }
      }

      // 2) Otherwise, do a real network fetch and capture the JSON
      const response = await originalFetch(input, init);
      let data;
      try {
        data = await response.clone().json();
      } catch (err) {
        // If it’s not JSON or fails, just return the raw response
        return response;
      }

      if (Array.isArray(data.playlist_clips)) {
        // Store the original playlist data so our shuffle button can use it
        playlistData = data;
        // Playlist data loaded

        // Inject the shuffle button if it hasn’t been added yet
        if (!document.querySelector('.suno-shuffle-button')) {
          // Delay injection slightly to allow the container to exist
          setTimeout(injectShuffleButton, 500);
        }
      }

      return response;
    }

    // For any other request, just do the normal fetch
    return originalFetch(input, init);
  };

  // ────────────────────────────────────────────────────────────────────────────────
  // STEP 1: Check sessionStorage for the "play first song" flag from a previous shuffle.
  // If present, repeatedly poll until the first play-button is in the DOM, click it, then clear the flag.
  const shouldAutoPlay = sessionStorage.getItem('sunoPlayFirst');
  if (shouldAutoPlay) {
    const clickFirstSong = () => {
      // Attempt to locate the first song-row play button
      const firstPlayBtn = document.querySelector('[data-testid="song-row-play-button"]');
      if (firstPlayBtn) {
        // Auto-clicking first song play button
        firstPlayBtn.click();
        // Clear the flag so we don't keep auto-playing on subsequent navigations
        sessionStorage.removeItem('sunoPlayFirst');
      } else {
        // If not found yet, try again in 300 ms
        setTimeout(clickFirstSong, 300);
      }
    };

    // Wait until DOMContentLoaded, then start polling:
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', clickFirstSong);
    } else {
      clickFirstSong();
    }
  }



  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // At the top of override.js (anywhere before createShuffleButton):
  const scriptSrc = document.currentScript.src;
  // This will yield something like "chrome-extension://<EXT_ID>/override.js"
  const iconUrl = new URL('icons/icon128.png', scriptSrc).href;

  function createShuffleButton() {
    // Create a <button> container
    const button = document.createElement('button');
    button.title = 'Shuffle Playlist';
    button.classList.add('suno-shuffle-button'); // optional: reuse the class if needed
  
    // Style the button to be 48×48px, round‐cornered, no default text
    button.style.cssText = `
      margin-left: 8px;
      width: 48px;
      height: 48px;
      border: none;
      border-radius: 12px;
      background-color: transparent;       /* fully transparent background */
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
      padding: 0;                           /* eliminate default padding */
      box-shadow: 0 2px 6px rgba(0,0,0,0.2); /* optional drop shadow */
    `;
  
    // Insert an <img> that points to our iconUrl
    const img = document.createElement('img');
    img.src = iconUrl;                     // e.g. chrome-extension://〈ID〉/icons/icon48.png
    img.width = 48;                        // adjust as desired (e.g. 24×24 for some padding)
    img.height = 48;
    img.alt = 'Shuffle';
  
    // Remove whitespace around the image (ensures pixel‐perfect centering)
    img.style.display = 'block';
  
    button.appendChild(img);
  
    // Keep the original click handler logic from override.js:
    button.addEventListener('click', async () => {
      // Button was clicked

      if (playlistData && Array.isArray(playlistData.playlist_clips)) {
        // Button was clicked
  
        // Shuffle the array copy
        const shuffledData = {
          ...playlistData,
          playlist_clips: shuffleArray([...playlistData.playlist_clips])
        };
  
        // Store shuffled data + timestamp
        const shuffleId = Date.now().toString();
        sessionStorage.setItem('sunoShuffleId', shuffleId);
        sessionStorage.setItem('sunoShuffledData', JSON.stringify(shuffledData));
        sessionStorage.setItem('sunoPlayFirst', 'true');
  
        // Give quick visual feedback (optional—for example, tint the icon green)
        img.style.opacity = '0.6';
  
        // Reload after a brief delay
        setTimeout(() => {
          window.location.reload();
        }, 300);
      }
    });
  
    return button;
  }

  function injectShuffleButton() {
    const observer = new MutationObserver(() => {
      const targetContainer = document.querySelector('.flex.flex-row.justify-end.items-center.gap-2');
      if (targetContainer) {
        observer.disconnect();

        // If we’ve already injected, do nothing
        if (document.querySelector('.suno-shuffle-button')) {
          return;
        }

        const shuffleButton = createShuffleButton();
        shuffleButton.classList.add('suno-shuffle-button');

        // Insert the button as the first child of that container
        targetContainer.insertBefore(shuffleButton, targetContainer.firstChild);
        // Shuffle button injected
      }
    });

    // Watch the entire document until we see that container appear
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Also start observing/injecting as soon as the page is parsed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectShuffleButton);
  } else {
    injectShuffleButton();
  }
})();
