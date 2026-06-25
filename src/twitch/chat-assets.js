const TWITCH_API = "https://api.twitch.tv/helix";

export function createTwitchChatAssets(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch?.bind(globalThis);
  const badges = new Map();

  async function loadForBroadcaster(broadcasterId) {
    validateCredentials();
    await loadBadgeEndpoint("/chat/badges/global");

    const safeBroadcasterId = String(broadcasterId ?? "").trim();
    if (safeBroadcasterId) {
      await loadBadgeEndpoint(`/chat/badges?broadcaster_id=${encodeURIComponent(safeBroadcasterId)}`);
    }

    return getStatus();
  }

  async function loadBadgeEndpoint(path) {
    const payload = await twitchFetch(path);
    for (const badgeSet of Array.isArray(payload.data) ? payload.data : []) {
      const setId = String(badgeSet.set_id ?? "").trim();
      if (!setId) continue;

      for (const version of Array.isArray(badgeSet.versions) ? badgeSet.versions : []) {
        const badge = normalizeBadgeAsset(setId, version);
        if (badge) storeBadge(badge);
      }
    }
  }

  function resolveBadge(input) {
    const badge = normalizeBadgeInput(input);
    if (!badge.setId) return null;

    const versions = badges.get(badge.setId);
    if (!versions) return null;

    if (badge.id && versions.has(badge.id)) return versions.get(badge.id);
    if (versions.has("1")) return versions.get("1");
    return versions.values().next().value ?? null;
  }

  function storeBadge(badge) {
    if (!badges.has(badge.setId)) badges.set(badge.setId, new Map());
    badges.get(badge.setId).set(badge.id, badge);
  }

  async function twitchFetch(path) {
    if (!fetchImpl) throw new Error("Fetch indisponible dans cet environnement.");
    const response = await fetchImpl(`${TWITCH_API}${path}`, {
      headers: {
        "Client-Id": options.clientId,
        Authorization: `Bearer ${options.accessToken}`,
      },
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message ?? `Erreur Twitch ${response.status}`);
    }
    return payload;
  }

  function validateCredentials() {
    if (!String(options.clientId ?? "").trim()) throw new Error("Client ID Twitch manquant.");
    if (!String(options.accessToken ?? "").trim()) throw new Error("Jeton OAuth Twitch manquant.");
  }

  function getStatus() {
    let badgeCount = 0;
    for (const versions of badges.values()) badgeCount += versions.size;
    return { badgeSets: badges.size, badges: badgeCount };
  }

  return { loadForBroadcaster, resolveBadge, getStatus };
}

function normalizeBadgeAsset(setId, version = {}) {
  const id = String(version.id ?? "").trim();
  if (!id) return null;

  return {
    setId,
    id,
    title: String(version.title ?? setId),
    description: String(version.description ?? ""),
    imageUrl1x: String(version.image_url_1x ?? ""),
    imageUrl2x: String(version.image_url_2x ?? ""),
    imageUrl4x: String(version.image_url_4x ?? ""),
  };
}

function normalizeBadgeInput(input) {
  if (typeof input === "string") {
    return { setId: input.trim(), id: "" };
  }

  if (!input || typeof input !== "object") {
    return { setId: "", id: "" };
  }

  return {
    setId: String(input.setId ?? input.set_id ?? input.name ?? "").trim(),
    id: String(input.id ?? input.versionId ?? "").trim(),
  };
}
