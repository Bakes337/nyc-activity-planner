// Server-only helpers for Spotify Web API. Never import this from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SPOTIFY_AUTH = "https://accounts.spotify.com";
const SPOTIFY_API = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPES = [
  "user-top-read",
  "user-read-recently-played",
  "user-read-private",
  "playlist-modify-private",
  "playlist-modify-public",
  "playlist-read-private",
].join(" ");

export function getSpotifyEnv() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials are not configured.");
  }
  return { clientId, clientSecret };
}

export function getRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/spotify/callback`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getSpotifyEnv();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${SPOTIFY_AUTH}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getSpotifyEnv();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${SPOTIFY_AUTH}/api/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Spotify refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Returns a valid access token, refreshing if needed. Returns null if not connected. */
export async function getValidAccessToken(): Promise<{ token: string; spotifyUserId: string } | null> {
  const { data: conn } = await supabaseAdmin
    .from("spotify_connection")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conn) return null;

  const expiresAt = new Date(conn.expires_at as string).getTime();
  if (expiresAt > Date.now() + 60_000) {
    return { token: conn.access_token as string, spotifyUserId: conn.spotify_user_id as string };
  }

  const refreshed = await refreshAccessToken(conn.refresh_token as string);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("spotify_connection")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? conn.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conn.id as string);
  return { token: refreshed.access_token, spotifyUserId: conn.spotify_user_id as string };
}

export async function spotifyFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify API ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return null;
  return res.json();
}