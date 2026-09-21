declare global {
  interface SpotifyPlayerOptions {
    name: string;
    getOAuthToken: (callback: (token: string) => void) => void;
    volume?: number;
  }

  interface SpotifyWebPlaybackTrack {
    uri: string;
    name: string;
    artists: { name: string }[];
    album: { images: { url: string }[] };
  }

  interface SpotifyPlaybackState {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: SpotifyWebPlaybackTrack;
    };
  }

  interface SpotifyPlayer {
    connect(): Promise<boolean>;
    disconnect(): void;
    /** Must be called synchronously inside a user gesture (click/tap) to unlock audio playback in the browser. */
    activateElement(): Promise<void>;
    togglePlay(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    nextTrack(): Promise<void>;
    previousTrack(): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getCurrentState(): Promise<SpotifyPlaybackState | null>;
    addListener(event: 'ready' | 'not_ready', callback: (data: { device_id: string }) => void): void;
    addListener(event: 'player_state_changed', callback: (state: SpotifyPlaybackState | null) => void): void;
    addListener(
      event: 'initialization_error' | 'authentication_error' | 'account_error' | 'playback_error',
      callback: (data: { message: string }) => void
    ): void;
    removeListener(event: string): void;
  }

  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer;
    };
  }
}

export {};
