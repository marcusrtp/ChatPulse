import { appendMessageContent, renderBadges } from "./rich-message-rendering.js";

export function createHistoryView({ listElement, documentRef = globalThis.document, maxItems = 200 }) {
  listElement.addEventListener?.("click", (event) => {
    const item = event.target.closest?.(".history-revealable");
    if (item) toggleModeratedHistoryReveal(item);
  });

  listElement.addEventListener?.("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const item = event.target.closest?.(".history-revealable");
    if (!item) return;

    event.preventDefault();
    toggleModeratedHistoryReveal(item);
  });

  return {
    render(messages = [], options = {}) {
      const sourceMessages = options.moderatedOnly
        ? messages.filter(isModeratedHistoryMessage)
        : messages;
      const recentMessages = sourceMessages.slice(-maxItems).reverse();
      listElement.replaceChildren(...recentMessages.map((message) => renderHistoryItem(message, { documentRef })));
    },
    toggleReveal: toggleModeratedHistoryReveal,
  };
}

export function isModeratedHistoryMessage(message = {}) {
  return ["blocked", "deleted", "removed"].includes(message.moderationStatus);
}

export function renderHistoryItem(message, { documentRef = globalThis.document } = {}) {
  const item = documentRef.createElement("li");
  const author = documentRef.createElement("strong");
  const status = documentRef.createElement("small");
  const text = documentRef.createElement("span");
  const moderationStatus = message.source === "notification" ? "notification" : message.moderationStatus ?? "visible";

  item.className = `history-${moderationStatus}`;
  text.dataset.historyText = "";
  renderHistoryAuthor(author, message, documentRef);

  if (message.source === "notification") {
    status.textContent = "Alerte OBS";
    text.textContent = message.text;
  } else if (message.moderationStatus === "blocked") {
    status.textContent = "Automod";
    makeModeratedHistoryItem(item, text, message, "Message bloqué par Automod. Clique pour voir le contenu original.");
  } else if (message.moderationStatus === "deleted") {
    status.textContent = "Supprimé";
    makeModeratedHistoryItem(item, text, message, "Message supprimé par la modération. Clique pour voir le contenu original.");
  } else if (message.moderationStatus === "removed") {
    status.textContent = "Retiré";
    makeModeratedHistoryItem(item, text, message, "Message retiré suite à un ban, timeout ou clear chat. Clique pour voir le contenu original.");
  } else {
    status.textContent = "Reçu";
    renderHistoryMessageContent(text, message, documentRef);
  }

  item.append(author, status, text);
  return item;
}

function renderHistoryMessageContent(target, message, documentRef) {
  target.replaceChildren?.();
  appendMessageContent(target, message, {
    documentRef,
    twitchVisuals: true,
    externalEmotes: true,
  });
}

function renderHistoryAuthor(author, message, documentRef) {
  const badgeList = renderBadges(message.badges, {
    documentRef,
    className: "chat-badges history-badges",
  });

  if (!badgeList) {
    author.textContent = message.author;
    return;
  }

  const name = documentRef.createElement("span");
  name.textContent = message.author;
  author.className = "history-author";
  author.replaceChildren(badgeList, name);
}

export function toggleModeratedHistoryReveal(item) {
  const text = item.querySelector("[data-history-text]");
  if (!text) return;

  const nextRevealed = item.getAttribute("aria-expanded") !== "true";
  item.setAttribute("aria-expanded", String(nextRevealed));
  item.classList.toggle("history-revealed", nextRevealed);
  text.textContent = nextRevealed
    ? `Message original : ${item.getAttribute("data-original-text") || "contenu indisponible"}`
    : item.getAttribute("data-hidden-label");
}

function makeModeratedHistoryItem(item, text, message, hiddenLabel) {
  item.classList.add("history-revealable");
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.setAttribute("aria-expanded", "false");
  item.setAttribute("data-original-text", message.text ?? "");
  item.setAttribute("data-hidden-label", hiddenLabel);
  text.textContent = hiddenLabel;
}
