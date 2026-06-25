const TWITCH_BADGE_LABELS = new Map([
  ["moderator", { label: "MOD", className: "chat-badge-mod" }],
  ["mod", { label: "MOD", className: "chat-badge-mod" }],
  ["vip", { label: "VIP", className: "chat-badge-vip" }],
  ["subscriber", { label: "SUB", className: "chat-badge-sub" }],
  ["sub", { label: "SUB", className: "chat-badge-sub" }],
]);

export function renderBadges(badges = [], { documentRef = globalThis.document, className = "chat-badges" } = {}) {
  const knownBadges = Array.isArray(badges)
    ? badges.map(normalizeBadgeForRender).filter(Boolean)
    : [];
  if (knownBadges.length === 0) return null;

  const list = documentRef.createElement("span");
  list.className = className;

  for (const badge of knownBadges) {
    if (badge.imageUrl) {
      list.append(createBadgeImageNode(badge, documentRef));
      continue;
    }

    const item = documentRef.createElement("span");
    item.className = `chat-badge ${badge.className}`;
    item.textContent = badge.label;
    item.title = twitchBadgeTitle(badge.label);
    list.append(item);
  }

  return list;
}

export function appendMessageContent(target, message = {}, options = {}) {
  const documentRef = options.documentRef ?? globalThis.document;
  const fragments = Array.isArray(message.fragments) && message.fragments.length > 0
    ? message.fragments
    : [{ type: "text", text: message.text ?? "" }];

  for (const fragment of fragments) {
    if (options.twitchVisuals && fragment.type === "emote" && fragment.emoteId) {
      target.append(createEmoteNode(fragment, documentRef));
      continue;
    }

    if (options.externalEmotes && fragment.type === "external-emote") {
      const emote = createExternalEmoteNode(fragment, documentRef);
      if (emote) {
        target.append(emote);
        continue;
      }
    }

    const textNode = documentRef.createElement("span");
    textNode.className = "chat-fragment";
    textNode.textContent = fragment.text ?? "";
    target.append(textNode);
  }
}

export function safeTwitchColor(color) {
  return /^#[0-9a-f]{6}$/i.test(String(color ?? "")) ? color : "";
}

function normalizeBadgeForRender(input) {
  if (typeof input === "string") {
    const fallback = TWITCH_BADGE_LABELS.get(input.toLowerCase());
    return fallback ? { ...fallback } : null;
  }

  if (!input || typeof input !== "object") return null;

  const setId = String(input.setId ?? input.set_id ?? "").toLowerCase();
  const fallback = TWITCH_BADGE_LABELS.get(setId);
  const imageUrl = safeAssetUrl(input.imageUrl1x || input.imageUrl2x || input.imageUrl4x);

  if (imageUrl) {
    return {
      imageUrl,
      label: fallback?.label ?? setId.toUpperCase(),
      title: input.title || fallback?.label || "Badge Twitch",
    };
  }

  return fallback ? { ...fallback } : null;
}

function createBadgeImageNode(badge, documentRef) {
  const image = documentRef.createElement("img");
  image.className = "chat-badge-image";
  image.src = badge.imageUrl;
  image.alt = badge.label;
  image.title = badge.title || twitchBadgeTitle(badge.label);
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function twitchBadgeTitle(label) {
  if (label === "MOD") return "Moderateur Twitch";
  if (label === "VIP") return "VIP Twitch";
  if (label === "SUB") return "Abonne Twitch";
  return "Badge Twitch";
}

function createExternalEmoteNode(fragment, documentRef) {
  const imageUrl = safeExternalEmoteUrl(fragment.imageUrl);
  if (!imageUrl) return null;

  const provider = externalProvider(fragment.provider);
  const emote = documentRef.createElement("img");
  emote.className = `chat-emote chat-emote-external chat-emote-${provider.toLowerCase()}`;
  emote.src = imageUrl;
  emote.alt = fragment.text ?? "emote";
  emote.title = provider ? `${fragment.text ?? "Emote"} ${provider}` : fragment.text ?? "Emote externe";
  emote.loading = "lazy";
  emote.decoding = "async";
  return emote;
}

function createEmoteNode(fragment, documentRef) {
  const emote = documentRef.createElement("img");
  const emoteId = String(fragment.emoteId).replace(/[^a-zA-Z0-9_-]/g, "");
  emote.className = "chat-emote";
  emote.src = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`;
  emote.alt = fragment.text ?? "emote";
  emote.title = fragment.text ?? "Emote Twitch";
  emote.loading = "lazy";
  emote.decoding = "async";
  return emote;
}

function safeAssetUrl(url) {
  const value = String(url ?? "").trim();
  return /^https:\/\/static-cdn\.jtvnw\.net\//i.test(value) ? value : "";
}

function safeExternalEmoteUrl(url) {
  const value = String(url ?? "").trim();
  return /^https:\/\/(cdn\.7tv\.app|cdn\.betterttv\.net|cdn\.frankerfacez\.com)\//i.test(value) ? value : "";
}

function externalProvider(provider) {
  const value = String(provider ?? "").trim().toUpperCase();
  return ["7TV", "BTTV", "FFZ"].includes(value) ? value : "external";
}
