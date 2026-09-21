/**
 * Preencha com os dados do SEU app criado em https://developer.spotify.com/dashboard
 * e da playlist que você quer que toque nos discos.
 *
 * O Client ID não é secreto (ele é enviado ao navegador em qualquer app Spotify
 * client-side), então pode ficar aqui no código sem problema.
 *
 * No dashboard do Spotify, em "Redirect URIs", cadastre exatamente a URL onde
 * este site vai rodar (ex: https://seuusuario.github.io/discoteca/).
 */
export const SPOTIFY_CLIENT_ID = '';

/** ID da playlist (a parte depois de /playlist/ na URL do Spotify). */
export const SPOTIFY_PLAYLIST_ID = '';

export const SPOTIFY_SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

export const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
export const SPOTIFY_AUTHORIZE_ENDPOINT = 'https://accounts.spotify.com/authorize';
export const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export function isSpotifyConfigured(): boolean {
  return SPOTIFY_CLIENT_ID.length > 0 && SPOTIFY_PLAYLIST_ID.length > 0;
}

export function getRedirectUri(): string {
  return `${window.location.origin}${window.location.pathname}`;
}
