import { appendMessageContent, renderBadges, safeTwitchColor } from "./rich-message-rendering.js";

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

function sameUser(message, event) {
  const target = event.userId ?? event.author;
  return Boolean(target) && (message.userId === target || message.author === target);
}
