import { useCallback, useEffect, useRef, useState } from 'react';
import { beginLogin, completeLoginIfRedirected, ensureFreshAccessToken } from './auth';
import { fetchPlaylistTracks, playTrackOnDevice, type SpotifyTrack } from './api';
import { loadSpotifySdk } from './loadSdk';
import { isSpotifyConfigured } from './config';

export type SpotifyStatus =
  | 'unconfigured' // faltam CLIENT_ID/PLAYLIST_ID em config.ts
  | 'checking'     // verificando se já existe login salvo neste dispositivo
  | 'logged_out'   // configurado, mas precisa do login único neste dispositivo
  | 'connecting'   // logado, carregando SDK e a playlist
  | 'ready'        // player pronto, pode tocar
  | 'unavailable'; // login ok, mas o SDK não conseguiu ativar um player neste navegador

export interface SpotifyPlayback {
  status: SpotifyStatus;
  errorMessage: string | null;
  tracks: SpotifyTrack[];
  currentTrackUri: string | null;
  isPlaying: boolean;
  login: () => void;
  playTrackAt: (index: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
}

const READY_TIMEOUT_MS = 10_000;

export function useSpotifyPlayback(): SpotifyPlayback {
  const [status, setStatus] = useState<SpotifyStatus>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [currentTrackUri, setCurrentTrackUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const tracksRef = useRef<SpotifyTrack[]>([]);

  useEffect(() => {
    if (!isSpotifyConfigured()) {
      setStatus('unconfigured');
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        await completeLoginIfRedirected();
      } catch (err) {
        if (!cancelled) setErrorMessage(err instanceof Error ? err.message : String(err));
      }

      const token = await ensureFreshAccessToken();
      if (cancelled) return;
      if (!token) {
        setStatus('logged_out');
        return;
      }

      setStatus('connecting');
      try {
        const playlistTracks = await fetchPlaylistTracks(token);
        if (cancelled) return;
        tracksRef.current = playlistTracks;
        setTracks(playlistTracks);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(err instanceof Error ? err.message : String(err));
          setStatus('unavailable');
        }
        return;
      }

      await loadSpotifySdk();
      if (cancelled) return;

      const player = new window.Spotify.Player({
        name: 'Discoteca — Vinyl Jukebox',
        getOAuthToken: cb => {
          ensureFreshAccessToken().then(t => cb(t ?? ''));
        },
        volume: 0.7,
      });
      playerRef.current = player;

      const readyTimer = window.setTimeout(() => {
        if (!cancelled && deviceIdRef.current === null) {
          setErrorMessage('O player do Spotify não respondeu neste navegador.');
          setStatus('unavailable');
        }
      }, READY_TIMEOUT_MS);

      player.addListener('ready', ({ device_id }) => {
        if (cancelled) return;
        deviceIdRef.current = device_id;
        window.clearTimeout(readyTimer);
        setStatus('ready');
      });

      player.addListener('not_ready', () => {
        deviceIdRef.current = null;
      });

      player.addListener('player_state_changed', state => {
        if (cancelled || !state) return;
        setIsPlaying(!state.paused);
        setCurrentTrackUri(state.track_window.current_track.uri);
      });

      player.addListener('initialization_error', ({ message }) => {
        if (cancelled) return;
        setErrorMessage(message);
        setStatus('unavailable');
      });
      player.addListener('authentication_error', ({ message }) => {
        if (cancelled) return;
        setErrorMessage(message);
        setStatus('unavailable');
      });
      player.addListener('account_error', ({ message }) => {
        if (cancelled) return;
        setErrorMessage('É preciso Spotify Premium para tocar no navegador: ' + message);
        setStatus('unavailable');
      });

      await player.connect();
    };

    setup();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, []);

  const login = useCallback(() => {
    beginLogin();
  }, []);

  const playTrackAt = useCallback((index: number) => {
    const track = tracksRef.current[index];
    const deviceId = deviceIdRef.current;
    if (!track || !deviceId) return;
    ensureFreshAccessToken().then(token => {
      if (!token) return;
      playTrackOnDevice(token, deviceId, track.uri).catch(err => {
        setErrorMessage(err instanceof Error ? err.message : String(err));
      });
    });
  }, []);

  const togglePlay = useCallback(() => {
    playerRef.current?.togglePlay();
  }, []);

  const next = useCallback(() => {
    playerRef.current?.nextTrack();
  }, []);

  const previous = useCallback(() => {
    playerRef.current?.previousTrack();
  }, []);

  const setVolume = useCallback((v: number) => {
    playerRef.current?.setVolume(v);
  }, []);

  return { status, errorMessage, tracks, currentTrackUri, isPlaying, login, playTrackAt, togglePlay, next, previous, setVolume };
}
