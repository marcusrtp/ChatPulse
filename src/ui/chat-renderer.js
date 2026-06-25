export function createChatRenderer(container, options = {}) {
  let maxMessages = options.maxMessages ?? 24;
  let lifetimeMs = options.messageLifetimeMs ?? 12000;
  const maxHistory = options.maxHistory ?? 1000;
  const onStatsChange = options.onStatsChange ?? (() => {});
  let accentColor = options.accentColor ?? "#8b5cf6";
  let messageOrder = options.messageOrder ?? "bottom";
  let showMeta = options.showMeta ?? true;
  let animation = options.animation ?? "slide";
  let twitchVisuals = Boolean(options.twitchVisuals);
  let externalEmotes = Boolean(options.externalEmotes);
  let displayed = 0;
  let deleted = 0;
  let removed = 0;
  let blocked = 0;
  const pending = [];
  const history = [];

  function renderMessage(message) {
    const displayedBefore = displayed;
    history.push(message);
    history.splice(0, Math.max(0, history.length - maxHistory));
    pending.push(message);
    pumpQueue();
    notifyStats();
    return displayed > displayedBefore ? container.children[0] : null;
  }

  function pumpQueue() {
    while (container.children.length < maxMessages && pending.length > 0) {
      const message = pending.shift();
      const node = displayMessage(message);
      if (isContainerOverflowing() && container.children.length > 1) {
        node.remove();
        displayed -= 1;
        pending.unshift(message);
        break;
      }
    }
    notifyStats();
  }

  function displayMessage(message) {
    const node = document.createElement("article");
    node.className = "chat-message";
    node.style.setProperty("--message-accent", accentColor);
    node.dataset.messageId = message.id;
    node.dataset.userId = message.userId ?? message.author;

    const header = document.createElement("div");
    header.className = "chat-header";

    const badgeList = twitchVisuals ? renderBadges(message.badges) : null;
    if (badgeList) header.append(badgeList);

    const author = document.createElement("strong");
    author.className = "chat-author";
    author.textContent = message.author;
    const authorColor = twitchVisuals ? safeTwitchColor(message.color) : "";
    if (authorColor) author.style.color = authorColor;
    header.append(author);

    const text = document.createElement("p");
    text.className = "chat-text";
    appendMessageContent(text, message, { twitchVisuals, externalEmotes });

    const meta = document.createElement("span");
    meta.className = "chat-meta";
    meta.textContent = metaLabel(message.source);
    meta.hidden = !showMeta;

    node.append(header, text, meta);
    if (messageOrder === "top") {
      container.append(node);
    } else {
      container.prepend(node);
    }
    displayed += 1;

    window.setTimeout(() => {
      if (animation !== "none") node.classList.add("is-fading");
      window.setTimeout(() => {
        node.remove();
        pumpQueue();
      }, 420);
    }, lifetimeMs);

    return node;
  }

  function isContainerOverflowing() {
    if (container.clientHeight > 0 && typeof getComputedStyle === "function") {
      const children = [...container.children];
      const gap = Number.parseFloat(getComputedStyle(container).gap) || 0;
      const childrenHeight = children.reduce((total, node) => {
        if (typeof node.getBoundingClientRect !== "function") return total;
        return total + node.getBoundingClientRect().height;
      }, 0);
      const totalHeight = childrenHeight + Math.max(0, children.length - 1) * gap;
      return totalHeight > container.clientHeight - 4;
    }

    return container.clientHeight > 0 && container.scrollHeight > container.clientHeight + 1;
  }

  function setAccentColor(nextAccentColor) {
    accentColor = nextAccentColor;
    for (const node of [...container.children]) {
      node.style?.setProperty("--message-accent", accentColor);
    }
  }

  function setOptions(nextOptions = {}) {
    if (nextOptions.accentColor) setAccentColor(nextOptions.accentColor);
    if (nextOptions.maxMessages) maxMessages = nextOptions.maxMessages;
    if (nextOptions.messageLifetimeMs) lifetimeMs = nextOptions.messageLifetimeMs;
    if (nextOptions.messageOrder) messageOrder = nextOptions.messageOrder;
    if (nextOptions.showMeta !== undefined) showMeta = Boolean(nextOptions.showMeta);
    if (nextOptions.animation) animation = nextOptions.animation;
    if (nextOptions.twitchVisuals !== undefined) twitchVisuals = Boolean(nextOptions.twitchVisuals);
    if (nextOptions.externalEmotes !== undefined) externalEmotes = Boolean(nextOptions.externalEmotes);
    for (const node of [...container.children]) {
      const meta = node.querySelector?.(".chat-meta");
      if (meta) meta.hidden = !showMeta;
    }
    trimVisibleMessages();
    pumpQueue();
  }

  function trimVisibleMessages() {
    while (container.children.length > maxMessages) {
      const node = messageOrder === "top" ? container.children[0] : container.lastElementChild;
      if (!node) break;
      node.remove();
    }
  }

  function getStats() {
    return {
      received: history.length,
      displayed,
      pending: pending.length,
      visible: container.children.length,
      deleted,
      removed,
      blocked,
    };
  }

  function getHistory() {
    return [...history];
  }

  function getVisibleMessages() {
    return [...container.children].map((node) => ({
      id: node.dataset?.messageId,
      userId: node.dataset?.userId,
    }));
  }

  function notifyStats() {
    onStatsChange(getStats());
  }

  function clear() {
    container.replaceChildren();
    pending.length = 0;
    notifyStats();
  }

  function applyModeration(event = {}) {
    if (event.type === "message_deleted") {
      const count = markMessages((message) => message.id === event.messageId, "deleted");
      deleted += count;
      moveHistoryMessageToEnd(event.messageId);
      removeVisibleByMessageId(event.messageId);
      removePending((message) => message.id === event.messageId);
    } else if (event.type === "user_banned" || event.type === "user_timeout" || event.type === "clear_user") {
      const count = markMessages((message) => sameUser(message, event), "removed");
      removed += count;
      removeVisibleByUser(event.userId ?? event.author);
      removePending((message) => sameUser(message, event));
    } else if (event.type === "clear_chat") {
      const count = markMessages((message) => !message.moderationStatus, "removed");
      removed += count;
      container.replaceChildren();
      pending.length = 0;
    } else if (event.type === "automod_held" || event.type === "blocked") {
      let count = 0;
      if (event.messageId) {
        count = markMessages((message) => message.id === event.messageId, "blocked");
        removeVisibleByMessageId(event.messageId);
        removePending((message) => message.id === event.messageId);
      } else if (event.message) {
        history.push({ ...event.message, moderationStatus: "blocked" });
        history.splice(0, Math.max(0, history.length - maxHistory));
        count = 1;
      }
      blocked += count;
    }

    pumpQueue();
    notifyStats();
  }

  function markMessages(predicate, moderationStatus) {
    let count = 0;
    for (const message of history) {
      if (!message.moderationStatus && predicate(message)) {
        message.moderationStatus = moderationStatus;
        count += 1;
      }
    }
    return count;
  }

  function removeVisibleByMessageId(messageId) {
    for (const node of [...container.children]) {
      if (node.dataset?.messageId === messageId) node.remove();
    }
  }

  function removeVisibleByUser(userId) {
    for (const node of [...container.children]) {
      if (node.dataset?.userId === userId) node.remove();
    }
  }

  function removePending(predicate) {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      if (predicate(pending[index])) pending.splice(index, 1);
    }
  }

  function moveHistoryMessageToEnd(messageId) {
    const index = history.findIndex((message) => message.id === messageId);
    if (index < 0 || index === history.length - 1) return;

    const [message] = history.splice(index, 1);
    history.push(message);
  }

  return { renderMessage, applyModeration, setAccentColor, setOptions, getStats, getHistory, getVisibleMessages, clear };
}

function metaLabel(source) {
  if (source === "notification") return "OBS";
  if (source === "demo") return "DEMO";
  return "LIVE";
}

const TWITCH_BADGE_LABELS = new Map([
  ["moderator", { label: "MOD", className: "chat-badge-mod" }],
  ["mod", { label: "MOD", className: "chat-badge-mod" }],
  ["vip", { label: "VIP", className: "chat-badge-vip" }],
  ["subscriber", { label: "SUB", className: "chat-badge-sub" }],
  ["sub", { label: "SUB", className: "chat-badge-sub" }],
]);

function renderBadges(badges = []) {
  const knownBadges = Array.isArray(badges)
    ? badges.map(normalizeBadgeForRender).filter(Boolean)
    : [];
  if (knownBadges.length === 0) return null;

  const list = document.createElement("span");
  list.className = "chat-badges";

  for (const badge of knownBadges) {
    if (badge.imageUrl) {
      list.append(createBadgeImageNode(badge));
      continue;
    }

    const item = document.createElement("span");
    item.className = `chat-badge ${badge.className}`;
    item.textContent = badge.label;
    item.title = twitchBadgeTitle(badge.label);
    list.append(item);
  }

  return list;
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

function createBadgeImageNode(badge) {
  const image = document.createElement("img");
  image.className = "chat-badge-image";
  image.src = badge.imageUrl;
  image.alt = badge.label;
  image.title = badge.title || twitchBadgeTitle(badge.label);
  image.loading = "lazy";
  image.decoding = "async";
  return image;
}

function twitchBadgeTitle(label) {
  if (label === "MOD") return "Modérateur Twitch";
  if (label === "VIP") return "VIP Twitch";
  if (label === "SUB") return "Abonné Twitch";
  return "Badge Twitch";
}

function appendMessageContent(target, message = {}, options = {}) {
  const fragments = Array.isArray(message.fragments) && message.fragments.length > 0
    ? message.fragments
    : [{ type: "text", text: message.text ?? "" }];

  for (const fragment of fragments) {
    if (options.twitchVisuals && fragment.type === "emote" && fragment.emoteId) {
      target.append(createEmoteNode(fragment));
      continue;
    }

    if (options.externalEmotes && fragment.type === "external-emote") {
      const emote = createExternalEmoteNode(fragment);
      if (emote) {
        target.append(emote);
        continue;
      }
    }

    const textNode = document.createElement("span");
    textNode.className = "chat-fragment";
    textNode.textContent = fragment.text ?? "";
    target.append(textNode);
  }
}

function createExternalEmoteNode(fragment) {
  const imageUrl = safeExternalEmoteUrl(fragment.imageUrl);
  if (!imageUrl) return null;

  const provider = externalProvider(fragment.provider);
  const emote = document.createElement("img");
  emote.className = `chat-emote chat-emote-external chat-emote-${provider.toLowerCase()}`;
  emote.src = imageUrl;
  emote.alt = fragment.text ?? "emote";
  emote.title = provider ? `${fragment.text ?? "Emote"} ${provider}` : fragment.text ?? "Emote externe";
  emote.loading = "lazy";
  emote.decoding = "async";
  return emote;
}

function createEmoteNode(fragment) {
  const emote = document.createElement("img");
  const emoteId = String(fragment.emoteId).replace(/[^a-zA-Z0-9_-]/g, "");
  emote.className = "chat-emote";
  emote.src = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0`;
  emote.alt = fragment.text ?? "emote";
  emote.title = fragment.text ?? "Emote Twitch";
  emote.loading = "lazy";
  emote.decoding = "async";
  return emote;
}

function safeTwitchColor(color) {
  return /^#[0-9a-f]{6}$/i.test(String(color ?? "")) ? color : "";
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

function sameUser(message, event) {
  const target = event.userId ?? event.author;
  return Boolean(target) && (message.userId === target || message.author === target);
}
