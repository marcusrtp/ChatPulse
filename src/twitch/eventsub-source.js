import { createTwitchEventSubMapper } from "./eventsub-mapper.js";
import { createTwitchChatAssets } from "./chat-assets.js";
import { createExternalEmoteAssets } from "../chat/external-emotes.js";

const TWITCH_API = "https://api.twitch.tv/helix";
const EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";
const SUBSCRIPTIONS = Object.freeze([
  { type: "channel.chat.message", version: "1", condition: ["broadcaster_user_id", "user_id"] },
  { type: "channel.chat.message_delete", version: "1", condition: ["broadcaster_user_id", "moderator_user_id", "user_id"] },
  { type: "channel.chat.clear_user_messages", version: "1", condition: ["broadcaster_user_id", "moderator_user_id", "user_id"] },
  { type: "channel.chat.clear", version: "1", condition: ["broadcaster_user_id", "moderator_user_id", "user_id"] },
  { type: "automod.message.hold", version: "2", condition: ["broadcaster_user_id", "moderator_user_id"] },
  { type: "channel.ban", version: "1", condition: ["broadcaster_user_id"] },
]);

export function createTwitchEventSubSource(options = {}) {
  const emit = options.emit ?? (() => {});
  const diagnostics = options.diagnostics;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  const WebSocketImpl = options.WebSocketImpl ?? globalThis.WebSocket;
  let mapper = options.mapper ?? createTwitchEventSubMapper({ channel: options.channel });
  const state = {
    socket: null,
    connected: false,
    sessionId: "",
    broadcaster: null,
    user: null,
    subscriptions: [],
  };

  async function start() {
    validateCredentials();
    state.broadcaster = await getUserByLogin(options.channel);
    state.user = await getAuthenticatedUser();
    await prepareVisualAssets();
    state.socket = new WebSocketImpl(EVENTSUB_WEBSOCKET_URL);
    state.socket.onopen = () => {
      diagnostics?.info?.("twitch", "WebSocket EventSub ouvert. En attente de session Twitch.");
    };
    state.socket.onmessage = async (event) => {
      await handleMessage(event.data);
    };
    state.socket.onerror = () => {
      state.connected = false;
      diagnostics?.error?.("twitch", "Erreur WebSocket EventSub.");
    };
    state.socket.onclose = () => {
      state.connected = false;
      diagnostics?.warn?.("twitch", "WebSocket EventSub fermé.");
    };
    return getStatus();
  }

  function stop() {
    state.socket?.close?.();
    state.socket = null;
    state.connected = false;
  }

  async function handleMessage(rawData) {
    const message = JSON.parse(rawData);
    const messageType = message.metadata?.message_type;

    if (messageType === "session_welcome") {
      state.sessionId = message.payload?.session?.id ?? "";
      await subscribeToEvents(state.sessionId);
      state.connected = true;
      diagnostics?.info?.("twitch", "EventSub connecté. Les messages live peuvent alimenter l'overlay.");
      return;
    }

    if (messageType === "notification") {
      const mapped = mapper.mapNotification(message.payload);
      if (mapped) emit(mapped.eventName, mapped.payload);
      return;
    }

    if (messageType === "session_reconnect") {
      const reconnectUrl = message.payload?.session?.reconnect_url;
      if (reconnectUrl) reconnect(reconnectUrl);
    }
  }

  async function subscribeToEvents(sessionId) {
    const subscriptions = [];
    for (const subscription of SUBSCRIPTIONS) {
      const response = await twitchFetch("/eventsub/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          type: subscription.type,
          version: subscription.version,
          condition: conditionFor(subscription.condition),
          transport: {
            method: "websocket",
            session_id: sessionId,
          },
        }),
      });
      subscriptions.push(response.data?.[0] ?? { type: subscription.type });
    }
    state.subscriptions = subscriptions;
  }

  async function prepareVisualAssets() {
    if (options.mapper) return;

    let badgeResolver;
    let externalEmoteResolver;

    if (options.twitchVisuals) {
      const assets = options.chatAssets ?? createTwitchChatAssets({
        clientId: options.clientId,
        accessToken: options.accessToken,
        fetchImpl,
      });

      try {
        const status = await assets.loadForBroadcaster(state.broadcaster.id);
        badgeResolver = assets.resolveBadge;
        emit("twitch:visuals", { kind: "badges", status: "loaded", ...status });
        diagnostics?.info?.("twitch", `Badges Twitch officiels chargés (${status.badges}).`);
      } catch (error) {
        emit("twitch:visuals", { kind: "badges", status: "error", message: error.message || "chargement impossible" });
        diagnostics?.warn?.("twitch", `Badges Twitch officiels indisponibles : ${error.message || "chargement impossible"}.`);
      }
    }

    if (options.externalEmotes) {
      const assets = options.externalEmoteAssets ?? createExternalEmoteAssets({ fetchImpl });

      try {
        const status = await assets.loadForTwitchUser(state.broadcaster.id);
        externalEmoteResolver = assets.resolveEmote;
        emit("twitch:visuals", { kind: "external-emotes", status: "loaded", ...status });
        diagnostics?.info?.("twitch", `Emotes externes chargées : 7TV ${status.providers.seventv}, BTTV ${status.providers.bttv}, FFZ ${status.providers.ffz}.`);
        for (const error of status.errors) {
          diagnostics?.warn?.("twitch", `${error.provider} indisponible : ${error.message}.`);
        }
      } catch (error) {
        emit("twitch:visuals", { kind: "external-emotes", status: "error", message: error.message || "chargement impossible" });
        diagnostics?.warn?.("twitch", `Emotes externes indisponibles : ${error.message || "chargement impossible"}.`);
      }
    }

    if (badgeResolver || externalEmoteResolver) {
      mapper = createTwitchEventSubMapper({
        channel: options.channel,
        badgeResolver,
        externalEmoteResolver,
      });
    }
  }

  function conditionFor(keys) {
    const values = {
      broadcaster_user_id: state.broadcaster.id,
      moderator_user_id: state.user.id,
      user_id: state.user.id,
    };
    return Object.fromEntries(keys.map((key) => [key, values[key]]));
  }

  async function getAuthenticatedUser() {
    const response = await twitchFetch("/users");
    const user = response.data?.[0];
    if (!user) throw new Error("Impossible de lire l'utilisateur Twitch connecté.");
    return user;
  }

  async function getUserByLogin(login) {
    const channel = String(login ?? "").trim();
    if (!channel) throw new Error("Chaîne Twitch manquante.");
    const response = await twitchFetch(`/users?login=${encodeURIComponent(channel)}`);
    const user = response.data?.[0];
    if (!user) throw new Error("Chaîne Twitch introuvable.");
    return user;
  }

  async function twitchFetch(path, request = {}) {
    if (!fetchImpl) throw new Error("Fetch indisponible dans cet environnement.");
    const response = await fetchImpl(`${TWITCH_API}${path}`, {
      ...request,
      headers: {
        "Client-Id": options.clientId,
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json",
        ...(request.headers ?? {}),
      },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message ?? `Erreur Twitch ${response.status}`);
    }
    return payload;
  }

  function reconnect(reconnectUrl) {
    state.socket?.close?.();
    state.socket = new WebSocketImpl(reconnectUrl);
    state.socket.onmessage = async (event) => {
      await handleMessage(event.data);
    };
  }

  function validateCredentials() {
    if (!String(options.clientId ?? "").trim()) throw new Error("Client ID Twitch manquant.");
    if (!String(options.accessToken ?? "").trim()) throw new Error("Jeton OAuth Twitch manquant.");
    if (!WebSocketImpl) throw new Error("WebSocket indisponible dans cet environnement.");
  }

  function getStatus() {
    return {
      connected: state.connected,
      sessionId: state.sessionId,
      broadcaster: state.broadcaster,
      user: state.user,
      subscriptions: [...state.subscriptions],
    };
  }

  return { start, stop, getStatus };
}
