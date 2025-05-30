// override.js
// Runs in the page context—overrides window.fetch to shuffle playlist_clips and adds shuffle button

(() => {
    console.log('🔀 Suno Shuffler: override.js loaded');
  
    const originalFetch = window.fetch;
    let isShuffled = false;

    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    function createShuffleButton() {
      const button = document.createElement('button');
      button.className = 'relative inline-flex items-center justify-center font-sans font-medium text-center before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit] before:border before:border-transparent before:bg-transparent after:absolute after:inset-0 after:pointer-events-none after:rounded-[inherit] after:bg-transparent after:opacity-0 enabled:hover:after:opacity-100 transition duration-75 before:transition before:duration-75 after:transition after:duration-75 select-none cursor-pointer text-[14px] leading-[20px] rounded-md text-background-primary bg-foreground-primary enabled:before:hover:bg-overlay-onLight disabled:brightness-50';
      button.title = 'Shuffle Playlist';
      button.style.marginLeft = '8px';
      button.style.width = '36px';
      button.style.height = '40px';
      button.textContent = 'S';
      
      button.addEventListener('click', () => {
        window.location.reload();
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
      targetContainer.insertBefore(shuffleButton, targetContainer.lastElementChild);
      console.log('✅ Suno Shuffler: Shuffle button injected');
    }
  
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
  
      // Only target the Studio API playlist endpoint
      if (url.includes('/api/playlist/') && url.includes('?page=')) {
        const response = await originalFetch(input, init);
  
        let data;
        try {
          data = await response.clone().json();
        } catch (err) {
          return response;
        }
  
        if (Array.isArray(data.playlist_clips)) {
          if (!isShuffled) {
            shuffleArray(data.playlist_clips);
            isShuffled = true;
            console.log('🔀 Suno Shuffler: playlist_clips array shuffled');
            
            // Inject the shuffle button after the first successful shuffle
            setTimeout(injectShuffleButton, 500);
          }
        }
  
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        return new Response(blob, {
          status:       response.status,
          statusText:   response.statusText,
          headers:      response.headers
        });
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
  