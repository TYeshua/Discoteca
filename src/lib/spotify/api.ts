import { SPOTIFY_API_BASE, SPOTIFY_PLAYLIST_ID } from './config';

export interface SpotifyTrack {
  uri: string;
  id: string;
  name: string;
  artist: string;
  image: string;
}

interface SpotifyImage {
  url: string;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyApiTrack {
  uri: string;
  id: string;
  name: string;
  artists?: SpotifyArtist[];
  album?: { images: SpotifyImage[] };
}

interface SpotifyPlaylistItemsResponse {
  items: { item: SpotifyApiTrack | null }[];
}

interface SpotifyErrorBody {
  error?: { status?: number; message?: string };
}

async function describeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as SpotifyErrorBody;
    if (body.error?.message) return `${res.status} ${body.error.message}`;
  } catch {
    // resposta sem corpo JSON — segue com o status cru
  }
  return `${res.status} ${res.statusText}`;
}

export async function fetchPlaylistTracks(accessToken: string): Promise<SpotifyTrack[]> {
  const fields = encodeURIComponent('items(item(uri,id,name,artists(name),album(images)))');
  const res = await fetch(
    `${SPOTIFY_API_BASE}/playlists/${SPOTIFY_PLAYLIST_ID}/items?fields=${fields}&limit=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Falha ao buscar as faixas da playlist do Spotify (${await describeError(res)}).`);
  const data = (await res.json()) as SpotifyPlaylistItemsResponse;
  return data.items
    .map(entry => entry.item)
    // só músicas — episódios de podcast não têm artistas/álbum no mesmo formato
    .filter((track): track is SpotifyApiTrack => !!track && !!track.artists && !!track.album)
    .map(track => ({
      uri: track.uri,
      id: track.id,
      name: track.name,
      artist: track.artists!.map(a => a.name).join(', '),
      image: track.album!.images[0]?.url ?? '',
    }));
}

/** Starts playback of a track from the configured playlist on a given Web Playback SDK device. */
export async function playTrackOnDevice(accessToken: string, deviceId: string, trackUri: string): Promise<void> {
  const res = await fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      context_uri: `spotify:playlist:${SPOTIFY_PLAYLIST_ID}`,
      offset: { uri: trackUri },
    }),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Falha ao iniciar a reprodução no Spotify (${await describeError(res)}).`);
}
