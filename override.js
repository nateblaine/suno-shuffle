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
      button.className = 'relative inline-flex items-center justify-center font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer text-[14px] leading-[20px] rounded-md text-background-primary bg-foreground-primary enabled:before:hover:bg-overlay-onLight disabled:brightness-50';
      button.title = 'Shuffle Playlist';
      button.style.marginLeft = '8px';
      button.style.width = '36px';
      button.style.height = '40px';
      button.textContent = 'S';
      
      button.addEventListener('click', async () => {
        if (playlistData && Array.isArray(playlistData.playlist_clips)) {
          // Create a new shuffled copy of the data
          const shuffledData = {
            ...playlistData,
            playlist_clips: shuffleArray([...playlistData.playlist_clips])
          };
          
          // Store the shuffled data in session storage
          sessionStorage.setItem('sunoShuffledData', JSON.stringify(shuffledData));
          
          // Visual feedback before refresh
          button.textContent = '✓';
          button.style.color = '#4ade80';
          
          // Refresh the page after a short delay to show the checkmark
          setTimeout(() => {
            window.location.reload();
          }, 300);
        }
      });
      
      return button;
    }

    function injectShuffleButton() {
      // Find the target container - looking for the flex container with gap-2 class
      const targetContainer = document.querySelector('.flex.flex-row.justify-end.items-center.gap-2');
      if (!targetContainer) {
        console.log('🔍 Suno Shuffler: Target container not found, will retry...');
        setTimeout(injectShuffleButton, 3000); // Retry after 3 seconds
        return;
      }

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
  
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
  
      // Only target the Studio API playlist endpoint
      if (url.includes('/api/playlist/') && url.includes('?page=')) {
        // Check for shuffled data in session storage first
        const shuffledDataJson = sessionStorage.getItem('sunoShuffledData');
        if (shuffledDataJson) {
          try {
            const shuffledData = JSON.parse(shuffledDataJson);
            // Clear the stored data after using it
            sessionStorage.removeItem('sunoShuffledData');
            
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
  