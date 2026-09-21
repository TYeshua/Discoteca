const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js';

let sdkPromise: Promise<void> | null = null;

/** Injects Spotify's Web Playback SDK script exactly once and resolves when it's ready. */
export function loadSpotifySdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise(resolve => {
    const previousReady = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      previousReady?.();
      resolve();
    };
    if (document.querySelector(`script[src="${SDK_SRC}"]`)) return;
    const script = document.createElement('script');
    script.src = SDK_SRC;
    script.async = true;
    document.body.appendChild(script);
  });
  return sdkPromise;
}
