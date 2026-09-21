import { generateCodeChallenge, generateCodeVerifier } from './pkce';
import { SPOTIFY_AUTHORIZE_ENDPOINT, SPOTIFY_CLIENT_ID, SPOTIFY_SCOPES, SPOTIFY_TOKEN_ENDPOINT, getRedirectUri } from './config';

const STORAGE_KEY = 'discoteca_spotify_auth';
const VERIFIER_KEY = 'discoteca_spotify_pkce_verifier';

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

function saveStoredAuth(auth: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isLoggedIn(): boolean {
  return loadStoredAuth() !== null;
}

/** Redirects the browser to Spotify's consent screen. Run once per device. */
export async function beginLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });
  window.location.href = `${SPOTIFY_AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

async function exchangeCodeForToken(code: string, verifier: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: verifier,
  });
  const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Falha ao trocar o código de autorização pelo token do Spotify.');
  return res.json() as Promise<TokenResponse>;
}

/**
 * If the page just came back from Spotify's consent redirect (?code=...),
 * finishes the login and persists the tokens. Safe to call on every mount —
 * it's a no-op when there's no pending code.
 */
export async function completeLoginIfRedirected(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!code || !verifier) return false;

  // Consume the one-time code + verifier synchronously, before the network
  // call, so a duplicate effect run (React StrictMode in dev) can't replay it.
  sessionStorage.removeItem(VERIFIER_KEY);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());

  const token = await exchangeCodeForToken(code, verifier);
  saveStoredAuth({
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? '',
    expiresAt: Date.now() + token.expires_in * 1000,
  });
  return true;
}

async function refreshAccessToken(refreshToken: string): Promise<StoredAuth> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });
  const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('invalid_grant');
  const token = (await res.json()) as TokenResponse;
  const auth: StoredAuth = {
    accessToken: token.access_token,
    // Spotify rotates refresh tokens on every use — always keep the newest one.
    refreshToken: token.refresh_token ?? refreshToken,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  saveStoredAuth(auth);
  return auth;
}

/**
 * Returns a valid access token for this device, refreshing it silently if
 * needed. Returns null when nobody has logged in on this browser yet, or the
 * stored session was revoked/expired (in which case beginLogin() is needed
 * again, once, on this device).
 */
export async function ensureFreshAccessToken(): Promise<string | null> {
  const stored = loadStoredAuth();
  if (!stored) return null;
  if (stored.expiresAt - Date.now() > 60_000) return stored.accessToken;
  try {
    const refreshed = await refreshAccessToken(stored.refreshToken);
    return refreshed.accessToken;
  } catch {
    clearStoredAuth();
    return null;
  }
}
