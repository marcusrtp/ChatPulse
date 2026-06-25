import assert from "node:assert/strict";

const { createHistoryView, renderHistoryItem } = await import("../src/ui/history-view.js");
const { createDiagnosticsView } = await import("../src/ui/diagnostics-view.js");
const { createPremiumLockController } = await import("../src/ui/premium-locks.js");
const { createTwitchVisualStatusView } = await import("../src/ui/twitch-visual-status-view.js");

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

function createDomHarness() {
  const documentRef = {
    createElement(tagName) {
      return createElement(tagName);
    },
  };

  return { documentRef, createElement };
}

function createElement(tagName) {
  const node = {
    tagName,
    className: "",
    dataset: {},
    children: [],
    textContent: "",
    disabled: false,
    parentNode: null,
    attributes: new Map(),
    append(...children) {
      for (const child of children) child.parentNode = this;
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    getAttribute(name) {
      return this.attributes.get(name) ?? null;
    },
    querySelector(selector) {
      if (selector === "[data-history-text]") {
        return findNode(this, (child) => Object.hasOwn(child.dataset, "historyText"));
      }
      if (selector === "p") {
        return findNode(this, (child) => child.tagName === "p");
      }
      if (selector === ".premium-lock-badge") {
        return findNode(this, (child) => child.classList.contains("premium-lock-badge"));
      }
      return null;
    },
    closest(selector) {
      const selectors = selector.split(",").map((value) => value.trim());
      let current = this;
      while (current) {
        if (selectors.some((item) => matchesSelector(current, item))) return current;
        current = current.parentNode;
      }
      return null;
    },
    classList: {
      add: (...classNames) => {
        const current = new Set(node.className.split(/\s+/).filter(Boolean));
        for (const className of classNames) current.add(className);
        node.className = [...current].join(" ");
      },
      remove: (...classNames) => {
        const current = new Set(node.className.split(/\s+/).filter(Boolean));
        for (const className of classNames) current.delete(className);
        node.className = [...current].join(" ");
      },
      toggle: (className, force) => {
        const current = new Set(node.className.split(/\s+/).filter(Boolean));
        const shouldAdd = force ?? !current.has(className);
        if (shouldAdd) current.add(className);
        else current.delete(className);
        node.className = [...current].join(" ");
      },
      contains: (className) => node.className.split(/\s+/).includes(className),
    },
  };
  return node;
}

function matchesSelector(node, selector) {
  if (selector === "label") return node.tagName === "label";
  if (selector.startsWith(".")) return node.classList.contains(selector.slice(1));
  return false;
}

function findNode(node, predicate) {
  for (const child of node.children) {
    if (predicate(child)) return child;
    const match = findNode(child, predicate);
    if (match) return match;
  }
  return null;
}

await test("history view renders notifications as OBS alerts", () => {
  const { documentRef } = createDomHarness();
  const item = renderHistoryItem({
    author: "Alerte OBS",
    text: "Alerte test OBS affichée.",
    source: "notification",
  }, { documentRef });

  assert.equal(item.className, "history-notification");
  assert.equal(item.children[1].textContent, "Alerte OBS");
  assert.equal(item.children[2].textContent, "Alerte test OBS affichée.");
});

await test("history view lets moderated messages reveal their original text", () => {
  const { documentRef } = createDomHarness();
  const item = renderHistoryItem({
    author: "Viewer",
    text: "Message supprimé original",
    source: "demo",
    moderationStatus: "deleted",
  }, { documentRef });

  assert.equal(item.getAttribute("aria-expanded"), "false");
  assert.match(item.children[2].textContent, /Clique pour voir/);

  createHistoryView({ listElement: createElement("ul"), documentRef }).toggleReveal(item);

  assert.equal(item.getAttribute("aria-expanded"), "true");
  assert.equal(item.children[2].textContent, "Message original : Message supprimé original");
});

await test("history view renders the most recent messages first", () => {
  const { documentRef } = createDomHarness();
  const listElement = createElement("ul");
  const historyView = createHistoryView({ listElement, documentRef, maxItems: 2 });

  historyView.render([
    { author: "Old", text: "Ancien", source: "demo" },
    { author: "Recent", text: "Récent", source: "demo" },
    { author: "Newest", text: "Dernier", source: "demo" },
  ]);

  assert.equal(listElement.children.length, 2);
  assert.equal(listElement.children[0].children[0].textContent, "Newest");
  assert.equal(listElement.children[1].children[0].textContent, "Recent");
});

await test("history view renders visible message fragments with emotes", () => {
  const { documentRef } = createDomHarness();
  const item = renderHistoryItem({
    author: "Viewer",
    text: "Salut Kappa wideVIBE",
    source: "demo",
    fragments: [
      { type: "text", text: "Salut " },
      { type: "emote", text: "Kappa", emoteId: "25" },
      { type: "text", text: " " },
      {
        type: "external-emote",
        text: "wideVIBE",
        provider: "7TV",
        imageUrl: "https://cdn.7tv.app/emote/01G1GXCR380004YN3NKDRR9QHD/2x.webp",
      },
    ],
  }, { documentRef });

  const text = item.children[2];

  assert.equal(text.children[0].textContent, "Salut ");
  assert.equal(text.children[1].className, "chat-emote");
  assert.match(text.children[1].src, /static-cdn\.jtvnw\.net\/emoticons\/v2\/25\/default\/dark\/1\.0/);
  assert.equal(text.children[3].className, "chat-emote chat-emote-external chat-emote-7tv");
  assert.equal(text.children[3].src, "https://cdn.7tv.app/emote/01G1GXCR380004YN3NKDRR9QHD/2x.webp");
});

await test("history view renders visible Twitch badges next to the author", () => {
  const { documentRef } = createDomHarness();
  const item = renderHistoryItem({
    author: "ModViewer",
    text: "Message badge",
    source: "demo",
    badges: [
      { setId: "moderator", title: "Moderator", imageUrl1x: "https://static-cdn.jtvnw.net/badges/mod-1.png" },
      "vip",
      "subscriber",
    ],
  }, { documentRef });

  const author = item.children[0];
  const badgeList = author.children[0];

  assert.equal(author.className, "history-author");
  assert.equal(badgeList.className, "chat-badges history-badges");
  assert.equal(badgeList.children[0].className, "chat-badge-image");
  assert.equal(badgeList.children[0].src, "https://static-cdn.jtvnw.net/badges/mod-1.png");
  assert.deepEqual(badgeList.children.slice(1).map((badge) => badge.textContent), ["VIP", "SUB"]);
  assert.equal(author.children[1].textContent, "ModViewer");
});

await test("diagnostics view renders status and event nodes", () => {
  const { documentRef } = createDomHarness();
  const statusTitle = createElement("h2");
  const statusGrid = createElement("div");
  const eventLog = createElement("ol");
  const diagnosticsView = createDiagnosticsView({ statusTitle, statusGrid, eventLog, documentRef });

  diagnosticsView.render({
    overall: { message: "Vérification recommandée" },
    components: [{ name: "twitch", status: "warning", message: "OAuth absent" }],
    events: [{ timestamp: 1000, component: "obs", level: "info", message: "OBS prêt" }],
  });

  assert.equal(statusTitle.textContent, "Vérification recommandée");
  assert.equal(statusGrid.children[0].className, "status-card status-warning");
  assert.equal(statusGrid.children[0].children[1].textContent, "Attention");
  assert.equal(eventLog.children[0].className, "event-info");
  assert.equal(eventLog.children[0].children[1].textContent, "OBS");
});

await test("Twitch visual status view explains OAuth options and loaded assets", () => {
  const { documentRef } = createDomHarness();
  const listElement = createElement("div");
  const view = createTwitchVisualStatusView({ listElement, documentRef });

  view.render({
    config: { twitchVisuals: true, externalEmotes: true },
    oauthConnected: false,
  });

  assert.equal(listElement.children[0].children[0].textContent, "OAuth Twitch");
  assert.equal(listElement.children[0].children[1].textContent, "Non connecté");
  assert.equal(listElement.children[1].children[1].textContent, "Aperçu local");
  assert.equal(listElement.children[2].children[1].textContent, "Fallback abonné");
  assert.equal(listElement.children[3].children[1].textContent, "Mode test");

  view.render({
    config: { twitchVisuals: true, externalEmotes: true },
    oauthConnected: true,
    assets: {
      badges: { status: "loaded", badges: 12, badgeSets: 4 },
      externalEmotes: { status: "loaded", providers: { seventv: 2, bttv: 3, ffz: 1 } },
    },
  });

  assert.equal(listElement.children[0].children[1].textContent, "Connecté");
  assert.equal(listElement.children[1].children[1].textContent, "12 badges chargés");
  assert.equal(listElement.children[2].children[1].textContent, "4 familles chargées");
  assert.equal(listElement.children[3].children[1].textContent, "7TV 2 · BTTV 3 · FFZ 1");
});

await test("premium lock controller disables locked option controls and marks them premium", () => {
  const { documentRef } = createDomHarness();
  const maxWrapper = createElement("div");
  maxWrapper.className = "field-block";
  const maxMessages = createElement("input");
  const maxMessagesNumber = createElement("input");
  maxWrapper.append(maxMessages, maxMessagesNumber);

  const notificationsWrapper = createElement("label");
  notificationsWrapper.className = "toggle-row";
  const notifications = createElement("input");
  notificationsWrapper.append(notifications);

  const controller = createPremiumLockController({
    documentRef,
    elements: { maxMessages, maxMessagesNumber, notifications },
    optionLocks: {
      maxMessages: true,
      notifications: false,
    },
  });

  controller.apply();

  assert.equal(maxMessages.disabled, true);
  assert.equal(maxMessagesNumber.disabled, true);
  assert.equal(maxWrapper.classList.contains("premium-locked"), true);
  assert.equal(maxWrapper.dataset.premiumOption, "maxMessages");
  assert.equal(maxWrapper.querySelector(".premium-lock-badge").textContent, "Premium");
  assert.equal(notifications.disabled, false);
  assert.equal(notificationsWrapper.classList.contains("premium-locked"), false);
});
