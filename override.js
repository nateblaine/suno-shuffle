// override.js
// Runs in the page context—overrides window.fetch to shuffle playlist_clips

(() => {
    console.log('🔀 Suno Shuffler: override.js loaded');
  
    const originalFetch = window.fetch;
    function shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
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
          shuffleArray(data.playlist_clips);
          console.log('🔀 Suno Shuffler: playlist_clips array shuffled');
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
  })();
  