import assert from "node:assert/strict";

const { createHistoryView, renderHistoryItem } = await import("../src/ui/history-view.js");
const { createDiagnosticsView } = await import("../src/ui/diagnostics-view.js");
const { createPremiumLockController } = await import("../src/ui/premium-locks.js");

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
