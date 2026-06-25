import assert from "node:assert/strict";

const { createChatRenderer } = await import("../src/ui/chat-renderer.js");

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

function installDomHarness({ clientHeight = 0 } = {}) {
  const nodes = [];
  const timers = [];
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousGetComputedStyle = globalThis.getComputedStyle;

  const container = {
    children: nodes,
    clientHeight,
    append(node) {
      nodes.push(node);
    },
    prepend(node) {
      nodes.unshift(node);
    },
    replaceChildren() {
      nodes.length = 0;
    },
    get lastElementChild() {
      return nodes[nodes.length - 1];
    },
  };

  globalThis.window = {
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
  };

  globalThis.document = {
    createElement(tagName) {
      return {
        tagName,
        className: "",
        dataset: {},
        children: [],
        hidden: false,
        textContent: "",
        style: {
          values: {},
          setProperty(name, value) {
            this.values[name] = value;
          },
        },
        append(...children) {
          this.children.push(...children);
        },
        querySelector(selector) {
          if (selector === ".chat-meta") {
            return this.children.find((child) => child.className === "chat-meta") ?? null;
          }
          return null;
        },
        getBoundingClientRect() {
          return { height: 34 };
        },
        remove() {
          const index = nodes.indexOf(this);
          if (index >= 0) nodes.splice(index, 1);
        },
        classList: { add() {} },
      };
    },
  };

  globalThis.getComputedStyle = () => ({ gap: "7px" });

  return {
    container,
    timers,
    restore() {
      globalThis.document = previousDocument;
      globalThis.window = previousWindow;
      globalThis.getComputedStyle = previousGetComputedStyle;
    },
  };
}

await test("audit: saturated chat keeps moderated deleted automod and banned messages out of the live preview", () => {
  const harness = installDomHarness();

  try {
    const renderer = createChatRenderer(harness.container, {
      maxMessages: 42,
      messageLifetimeMs: 30000,
      messageOrder: "bottom",
    });

    for (let index = 0; index < 300; index += 1) {
      renderer.renderMessage({
        id: `msg-${index}`,
        userId: `viewer-${index % 48}`,
        author: `Viewer_${index % 48}`,
        text: `Message live #${index}`,
        source: "demo",
      });
    }

    assert.equal(renderer.getStats().received, 300);
    assert.equal(renderer.getStats().visible, 42);
    assert.equal(renderer.getStats().pending, 258);

    const [deleteTarget, automodTarget, banTarget, timeoutTarget] = renderer.getVisibleMessages();

    renderer.applyModeration({ type: "message_deleted", messageId: deleteTarget.id });
    assert.equal(renderer.getVisibleMessages().some((message) => message.id === deleteTarget.id), false);
    assert.equal(renderer.getHistory().find((message) => message.id === deleteTarget.id).moderationStatus, "deleted");
    assert.equal(renderer.getStats().deleted, 1);

    renderer.applyModeration({ type: "automod_held", messageId: automodTarget.id });
    assert.equal(renderer.getVisibleMessages().some((message) => message.id === automodTarget.id), false);
    assert.equal(renderer.getHistory().find((message) => message.id === automodTarget.id).moderationStatus, "blocked");
    assert.equal(renderer.getStats().blocked, 1);

    const banUserCount = renderer.getHistory().filter((message) => message.userId === banTarget.userId && !message.moderationStatus).length;
    renderer.applyModeration({ type: "user_banned", userId: banTarget.userId });
    assert.equal(renderer.getVisibleMessages().some((message) => message.userId === banTarget.userId), false);
    assert.equal(renderer.getHistory().filter((message) => message.userId === banTarget.userId && message.moderationStatus === "removed").length, banUserCount);

    const timeoutUserCount = renderer.getHistory().filter((message) => message.userId === timeoutTarget.userId && !message.moderationStatus).length;
    renderer.applyModeration({ type: "user_timeout", userId: timeoutTarget.userId });
    assert.equal(renderer.getVisibleMessages().some((message) => message.userId === timeoutTarget.userId), false);
    assert.equal(renderer.getHistory().filter((message) => message.userId === timeoutTarget.userId && message.moderationStatus === "removed").length, timeoutUserCount);

    for (let index = 0; index < 80; index += 1) {
      const nextTimer = harness.timers.shift();
      if (!nextTimer) break;
      nextTimer.callback();
    }

    assert.equal(renderer.getVisibleMessages().some((message) => message.userId === banTarget.userId), false);
    assert.equal(renderer.getVisibleMessages().some((message) => message.userId === timeoutTarget.userId), false);

    renderer.applyModeration({
      type: "automod_held",
      message: {
        id: "held-before-display",
        userId: "viewer-held",
        author: "ViewerHeld",
        text: "Message bloqué avant affichage",
        source: "twitch",
      },
    });

    assert.equal(renderer.getVisibleMessages().some((message) => message.id === "held-before-display"), false);
    assert.equal(renderer.getHistory().find((message) => message.id === "held-before-display").moderationStatus, "blocked");
    assert.equal(renderer.getStats().blocked, 2);

    renderer.applyModeration({ type: "clear_chat" });
    assert.equal(renderer.getStats().visible, 0);
    assert.equal(renderer.getStats().pending, 0);
    assert.equal(renderer.getHistory().some((message) => !message.moderationStatus), false);
  } finally {
    harness.restore();
  }
});

