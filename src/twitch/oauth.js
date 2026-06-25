import { requiredEventSubScopes } from "./eventsub-mapper.js";

export function buildTwitchAuthUrl(options = {}) {
  const clientId = String(options.clientId ?? "").trim();
  const redirectUri = String(options.redirectUri ?? "").trim();
  const scopes = options.scopes ?? requiredEventSubScopes();
  const state = String(options.state ?? createState()).trim();
  const url = new URL("https://id.twitch.tv/oauth2/authorize");

  url.searchParams.set("response_type", "token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("state", state);
  if (options.forceVerify) url.searchParams.set("force_verify", "true");

  return url.toString();
}

export function readTwitchTokenFromUrl(currentUrl) {
  const url = new URL(currentUrl);
  if (!url.hash.includes("access_token=")) return null;

  const params = new URLSearchParams(url.hash.slice(1));
  const accessToken = params.get("access_token");
  if (!accessToken) return null;

  return {
    accessToken,
    scopes: parseScopes(params.get("scope")),
    expiresIn: Number(params.get("expires_in") ?? 0),
    state: params.get("state") ?? "",
  };
}

export function createState() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(4);
    cryptoApi.getRandomValues(values);
    return [...values].map((value) => value.toString(16).padStart(8, "0")).join("");
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function parseScopes(value) {
  return String(value ?? "").split(/\s+/).map((scope) => scope.trim()).filter(Boolean);
}
