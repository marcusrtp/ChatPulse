import { buildTwitchAuthUrl, createState, readTwitchTokenFromUrl } from "./oauth.js";
import { createTwitchEventSubSource } from "./eventsub-source.js";

export function createTwitchSessionController({
  diagnostics,
  emit,
  getConfig,
  renderDiagnostics,
  statusElement,
  windowRef = globalThis.window,
  sessionStorageRef = globalThis.sessionStorage,
}) {
  let twitchSource;

  function connectTwitchOAuth() {
    const nextConfig = getConfig();
    if (!nextConfig.twitchClientId) {
      diagnostics.error("twitch", "Client ID Twitch manquant. Renseigne-le avant la connexion.");
      renderDiagnostics();
      return;
    }

    const state = createState();
    sessionStorageRef.setItem("chatpulse-twitch-oauth-state", state);
    windowRef.location.href = buildTwitchAuthUrl({
      clientId: nextConfig.twitchClientId,
      redirectUri: windowRef.location.origin + windowRef.location.pathname,
      state,
    });
  }

  async function startTwitchLive() {
    const nextConfig = getConfig();
    const token = twitchAccessToken();
    if (!token) {
      diagnostics.warn("twitch", "Connexion OAuth nécessaire avant de recevoir le chat live.");
      renderDiagnostics();
      updateStatus("Connexion Twitch requise");
      return;
    }

    try {
      twitchSource?.stop();
      twitchSource = createTwitchEventSubSource({
        channel: nextConfig.channel,
        clientId: nextConfig.twitchClientId,
        accessToken: token,
        twitchVisuals: nextConfig.twitchVisuals,
        externalEmotes: nextConfig.externalEmotes,
        emit,
        diagnostics,
      });
      await twitchSource.start();
      updateStatus("Connexion live en cours");
      renderDiagnostics();
    } catch (error) {
      diagnostics.error("twitch", error.message || "Connexion Twitch impossible.");
      updateStatus("Connexion Twitch refusée");
      renderDiagnostics();
    }
  }

  function processOAuthRedirect() {
    const token = readTwitchTokenFromUrl(windowRef.location.href);
    if (!token) {
      updateStatus(twitchAccessToken() ? "OAuth prêt" : "Mode démo actif");
      return;
    }

    const expectedState = sessionStorageRef.getItem("chatpulse-twitch-oauth-state");
    if (expectedState && token.state && token.state !== expectedState) {
      diagnostics.error("twitch", "Réponse OAuth ignorée : état de sécurité invalide.");
      updateStatus("OAuth refusé");
      return;
    }

    sessionStorageRef.setItem("chatpulse-twitch-token", JSON.stringify({
      accessToken: token.accessToken,
      scopes: token.scopes,
      expiresAt: Date.now() + token.expiresIn * 1000,
    }));
    sessionStorageRef.removeItem("chatpulse-twitch-oauth-state");
    windowRef.history.replaceState({}, windowRef.document.title, windowRef.location.pathname + windowRef.location.search);
    updateStatus("OAuth prêt");
  }

  function twitchAccessToken() {
    try {
      const raw = sessionStorageRef.getItem("chatpulse-twitch-token");
      if (!raw) return "";
      const token = JSON.parse(raw);
      if (token.expiresAt && token.expiresAt < Date.now()) {
        sessionStorageRef.removeItem("chatpulse-twitch-token");
        return "";
      }
      return token.accessToken ?? "";
    } catch {
      return "";
    }
  }

  function updateStatus(message) {
    statusElement.textContent = message;
  }

  return { connectTwitchOAuth, startTwitchLive, processOAuthRedirect, twitchAccessToken, updateStatus };
}
