// // override.js
// Runs in the page context—overrides window.fetch to shuffle playlist_clips, adds shuffle button,
// and (optionally) auto-plays the first song after shuffle.

(() => {
  console.log('🔀 Suno Shuffler: override.js loaded');

  // ────────────────────────────────────────────────────────────────────────────────
  // STEP 1: Check sessionStorage for the "play first song" flag from a previous shuffle.
  // If present, repeatedly poll until the first play-button is in the DOM, click it, then clear the flag.
  const shouldAutoPlay = sessionStorage.getItem('sunoPlayFirst');
  if (shouldAutoPlay) {
    const clickFirstSong = () => {
      // Attempt to locate the first song-row play button
      const firstPlayBtn = document.querySelector('[data-testid="song-row-play-button"]');
      if (firstPlayBtn) {
        console.log('🔀 Suno Shuffler: Auto-clicking first song play button');
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

  // ────────────────────────────────────────────────────────────────────────────────
  const originalFetch = window.fetch;
  let playlistData = null;

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function createShuffleButton() {
    const button = document.createElement('button');
    button.textContent = '§';
    button.title = 'Shuffle Suno';

    button.style.cssText = `
      margin-left: 8px;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #FFB74D 0%, #FF3D00 100%);
      color: white;
      font-size: 20px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      cursor: pointer;
      user-select: none;
    `;

    button.addEventListener('click', async () => {
      if (playlistData && Array.isArray(playlistData.playlist_clips)) {
        console.log('🔀 Suno Shuffler: button was clicked');

        // Create a new shuffled copy of the data
        const shuffledData = {
          ...playlistData,
          playlist_clips: shuffleArray([...playlistData.playlist_clips])
        };

        // Store the shuffled data + a timestamp
        const shuffleId = Date.now().toString();
        sessionStorage.setItem('sunoShuffleId', shuffleId);
        sessionStorage.setItem('sunoShuffledData', JSON.stringify(shuffledData));

        // ALSO set a "play-first-song" flag so that, on reload, we click the first play button.
        sessionStorage.setItem('sunoPlayFirst', 'true');

        // Visual feedback before refresh
        button.textContent = '✓';
        button.style.color = '#ffffff';

        // Refresh the page after a short delay (to show the checkmark briefly)
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
        console.log('✅ Suno Shuffler: Shuffle button injected');
      }
    });

    // Watch the entire document until we see that container appear
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ────────────────────────────────────────────────────────────────────────────────
  // Override window.fetch to intercept the playlist API calls.
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;

    // Only target the playlist endpoint (e.g. /api/playlist/?page=…)
    if (url.includes('/api/playlist/') && url.includes('?page=')) {
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
          console.error('🔀 Suno Shuffler: Error parsing shuffled data:', e);
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
        console.log('🔍 Suno Shuffler: Playlist data loaded');

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
  // Also start observing/injecting as soon as the page is parsed
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectShuffleButton);
  } else {
    injectShuffleButton();
  }
})();
