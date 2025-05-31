// override.js
// Runs in the page context—overrides window.fetch to shuffle playlist_clips and adds shuffle button

(() => {
    console.log('🔀 Suno Shuffler: override.js loaded');
  
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
          console.log('button was clicked');

          // Create a new shuffled copy of the data
          const shuffledData = {
            ...playlistData,
            playlist_clips: shuffleArray([...playlistData.playlist_clips])
          };
          
          // Store the shuffled data in session storage with a timestamp
          const shuffleId = Date.now();
          sessionStorage.setItem('sunoShuffleId', shuffleId.toString());
          sessionStorage.setItem('sunoShuffledData', JSON.stringify(shuffledData));
          
          // Visual feedback before refresh
          button.textContent = '✓';
          button.style.color = '#ffffff';
          
          // Refresh the page after a short delay to show the checkmark
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
          // Check if button already exists
          if (document.querySelector('.suno-shuffle-button')) {
            return;
          }

          const shuffleButton = createShuffleButton();
          shuffleButton.classList.add('suno-shuffle-button');
          
          // Insert the button before the last element in the container
          targetContainer.insertBefore(shuffleButton, targetContainer.firstChild);
          console.log('✅ Suno Shuffler: Shuffle button injected');
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
  
      // Only target the Studio API playlist endpoint
      if (url.includes('/api/playlist/') && url.includes('?page=')) {
        // Check for shuffled data in session storage first
        const shuffledDataJson = sessionStorage.getItem('sunoShuffledData');
        const storedShuffleId = sessionStorage.getItem('sunoShuffleId');
        
        if (shuffledDataJson && storedShuffleId) {
          try {
            const shuffledData = JSON.parse(shuffledDataJson);

            // Repopulate playlistData so the click handler sees it
            playlistData = shuffledData;

            // Clear the stored data after using it if it's from a previous shuffle
            const currentShuffleId = sessionStorage.getItem('sunoShuffleId');
            if (currentShuffleId === storedShuffleId) {
              sessionStorage.removeItem('sunoShuffledData');
              sessionStorage.removeItem('sunoShuffleId');
            }
            
            // Return the shuffled data without making a new request
            const blob = new Blob([shuffledDataJson], { type: 'application/json' });
            return new Response(blob, {
              status: 200,
              statusText: 'OK',
              headers: new Headers({
                'Content-Type': 'application/json'
              })
            });
          } catch (e) {
            console.error('Error parsing shuffled data:', e);
          }
        }
        
        // No shuffled data, proceed with normal fetch
        const response = await originalFetch(input, init);
  
        let data;
        try {
          data = await response.clone().json();
        } catch (err) {
          return response;
        }
  
        if (Array.isArray(data.playlist_clips)) {
          // Store the original data
          playlistData = data;
          console.log('🔍 Suno Shuffler: Playlist data loaded');
          
          // Inject the shuffle button after the first successful load
          if (!document.querySelector('.suno-shuffle-button')) {
            setTimeout(injectShuffleButton, 500);
          }
        }
        
        return response;
      }
  
      // Fallback: normal fetch
      return originalFetch(input, init);
    };

    // Also try to inject the button when the page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectShuffleButton);
    } else {
      injectShuffleButton();
    }
  })();
  