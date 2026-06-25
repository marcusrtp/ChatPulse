import assert from "node:assert/strict";

const { createEventBus } = await import("../src/core/event-bus.js");
const { createDiagnostics } = await import("../src/core/diagnostics.js");
const { CONFIG_LIMITS, DEFAULT_CONFIG, normalizeConfig, createOverlayUrl } = await import("../src/core/config.js");
const {
  LOCKABLE_OPTION_DEFINITIONS,
  enforceOptionLocks,
  normalizeOptionLocks,
} = await import("../src/core/option-access.js");
const { createDemoChatSource } = await import("../src/chat/demo-source.js");
const { createSimulationActions } = await import("../src/ui/simulation-actions.js");

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

await test("event bus delivers payloads to subscribers and supports unsubscribe", () => {
  const bus = createEventBus();
  const received = [];
  const unsubscribe = bus.on("chat:message", (payload) => received.push(payload));

  bus.emit("chat:message", { id: "1", text: "hello" });
  unsubscribe();
  bus.emit("chat:message", { id: "2", text: "ignored" });

  assert.deepEqual(received, [{ id: "1", text: "hello" }]);
});

await test("diagnostics starts in demo mode and records readable events", () => {
  const diagnostics = createDiagnostics({ now: () => 1000 });

  diagnostics.info("overlay", "Centre de contrôle chargé");
  diagnostics.warn("twitch", "OAuth Twitch non connecté");

  const snapshot = diagnostics.snapshot();
  assert.equal(snapshot.overall.status, "warning");
  assert.equal(snapshot.twitch.status, "warning");
  assert.equal(snapshot.overlay.status, "ok");
  assert.equal(snapshot.events.length, 2);
  assert.equal(snapshot.events[0].message, "OAuth Twitch non connecté");
  assert.equal(snapshot.events[1].message, "Centre de contrôle chargé");
});

await test("diagnostics marks critical errors and keeps the log bounded", () => {
  const diagnostics = createDiagnostics({ now: () => 2000, maxEvents: 3 });

  diagnostics.info("overlay", "one");
  diagnostics.info("overlay", "two");
  diagnostics.info("overlay", "three");
  diagnostics.error("twitch", "Jeton expiré");

  const snapshot = diagnostics.snapshot();
  assert.equal(snapshot.overall.status, "error");
  assert.equal(snapshot.twitch.status, "error");
  assert.equal(snapshot.events.length, 3);
  assert.equal(snapshot.events[0].message, "Jeton expiré");
  assert.equal(snapshot.events[2].message, "two");
});

await test("config normalizes unsafe or missing values", () => {
  const config = normalizeConfig({
    channel: "  My_Channel  ",
    twitchClientId: "  client-id-123  ",
    accentColor: "not-a-color",
    messageLifetimeMs: 500,
    maxMessages: 200,
    messageOrder: "sideways",
    position: "somewhere",
    density: "huge",
    fontScale: 200,
    gapPx: -10,
    backgroundOpacity: 2,
    radiusPx: 99,
    animation: "bounce",
    showMeta: false,
    notifications: true,
    twitchVisuals: true,
    externalEmotes: true,
    debug: true,
  });

  assert.equal(config.channel, "my_channel");
  assert.equal(config.twitchClientId, "clientid123");
  assert.equal(config.accentColor, DEFAULT_CONFIG.accentColor);
  assert.equal(config.messageLifetimeMs, CONFIG_LIMITS.messageLifetimeMs.min);
  assert.equal(config.maxMessages, CONFIG_LIMITS.maxMessages.max);
  assert.equal(config.messageOrder, DEFAULT_CONFIG.messageOrder);
  assert.equal(config.position, DEFAULT_CONFIG.position);
  assert.equal(config.density, DEFAULT_CONFIG.density);
  assert.equal(config.fontScale, 140);
  assert.equal(config.gapPx, 4);
  assert.equal(config.backgroundOpacity, 1);
  assert.equal(config.radiusPx, 24);
  assert.equal(config.animation, DEFAULT_CONFIG.animation);
  assert.equal(config.showMeta, false);
  assert.equal(config.notifications, true);
  assert.equal(config.twitchVisuals, true);
  assert.equal(config.externalEmotes, true);
  assert.equal(config.debug, true);
});

await test("config accepts a one-message overlay and caps visible messages to a realistic screen limit", () => {
  assert.equal(normalizeConfig({ maxMessages: 0 }).maxMessages, CONFIG_LIMITS.maxMessages.min);
  assert.equal(normalizeConfig({ maxMessages: 1 }).maxMessages, 1);
  assert.equal(normalizeConfig({ maxMessages: 999 }).maxMessages, CONFIG_LIMITS.maxMessages.max);
});

await test("config keeps notification duration at five seconds minimum", () => {
  assert.equal(normalizeConfig({ messageLifetimeMs: 4000 }).messageLifetimeMs, CONFIG_LIMITS.messageLifetimeMs.min);
  assert.equal(normalizeConfig({ life: 3000 }).messageLifetimeMs, CONFIG_LIMITS.messageLifetimeMs.min);
  assert.equal(normalizeConfig({ messageLifetimeMs: 5000 }).messageLifetimeMs, 5000);
});

await test("option access registry can lock any OBS-facing setting after release", () => {
  const optionIds = LOCKABLE_OPTION_DEFINITIONS.map((option) => option.id);

  assert.deepEqual(optionIds, [
    "channel",
    "twitchClientId",
    "accentColor",
    "messageLifetimeMs",
    "maxMessages",
    "messageOrder",
    "position",
    "density",
    "fontScale",
    "gapPx",
    "backgroundOpacity",
    "radiusPx",
    "animation",
    "showMeta",
    "notifications",
    "twitchVisuals",
    "externalEmotes",
    "debug",
  ]);
  assert.equal(normalizeOptionLocks({ maxMessages: true }).maxMessages, true);
  assert.equal(normalizeOptionLocks({ maxMessages: false }).maxMessages, false);
  assert.equal(normalizeOptionLocks({ unknownOption: true }).unknownOption, undefined);
});

await test("locked premium options fall back to free defaults before saving or building OBS URL", () => {
  const config = normalizeConfig({
    channel: "Pantoufl",
    accentColor: "#14f195",
    maxMessages: 20,
    notifications: true,
    twitchVisuals: true,
    debug: true,
  });
  const locks = normalizeOptionLocks({
    accentColor: true,
    maxMessages: true,
    notifications: true,
    twitchVisuals: true,
  });

  const freeConfig = enforceOptionLocks(config, locks);
  const overlayUrl = new URL(createOverlayUrl("https://example.com/app/index.html", freeConfig));

  assert.equal(freeConfig.channel, "pantoufl");
  assert.equal(freeConfig.accentColor, DEFAULT_CONFIG.accentColor);
  assert.equal(freeConfig.maxMessages, DEFAULT_CONFIG.maxMessages);
  assert.equal(freeConfig.notifications, DEFAULT_CONFIG.notifications);
  assert.equal(freeConfig.twitchVisuals, DEFAULT_CONFIG.twitchVisuals);
  assert.equal(freeConfig.debug, true);
  assert.equal(overlayUrl.searchParams.get("accent"), DEFAULT_CONFIG.accentColor);
  assert.equal(overlayUrl.searchParams.get("max"), String(DEFAULT_CONFIG.maxMessages));
  assert.equal(overlayUrl.searchParams.has("notifs"), false);
  assert.equal(overlayUrl.searchParams.has("visuals"), false);
});

await test("overlay url never includes OAuth tokens and includes safe config", () => {
  const url = createOverlayUrl("https://example.com/app/index.html", {
    channel: "Streamer Name",
    accentColor: "#14f195",
    maxMessages: 18,
    messageOrder: "top",
    position: "right",
    density: "comfortable",
    fontScale: 115,
    gapPx: 14,
    backgroundOpacity: 0.72,
    radiusPx: 12,
    animation: "none",
    showMeta: false,
    notifications: true,
    twitchVisuals: true,
    externalEmotes: true,
    token: "secret-token",
    accessToken: "secret-token",
    twitchClientId: "client-id-123",
    debug: true,
  });

  assert.equal(url, "https://example.com/app/overlay.html?channel=streamername&accent=%2314f195&life=12000&max=18&order=top&pos=right&style=comfortable&font=115&gap=14&opacity=72&radius=12&anim=none&meta=0&notifs=1&visuals=1&extemotes=1&debug=1");
  assert.equal(url.includes("secret-token"), false);
  assert.equal(url.includes("client-id-123"), false);
  assert.equal(url.includes("token"), false);
});

await test("overlay url reflects every OBS-facing option", () => {
  const url = new URL(createOverlayUrl("https://example.com/app/index.html", {
    channel: "Pantoufl",
    accentColor: "#0044cc",
    messageLifetimeMs: 5000,
    maxMessages: 18,
    messageOrder: "top",
    position: "right",
    density: "comfortable",
    fontScale: 110,
    gapPx: 7,
    backgroundOpacity: 0.6,
    radiusPx: 4,
    animation: "fade",
    showMeta: false,
    notifications: true,
    twitchVisuals: true,
    externalEmotes: true,
    debug: true,
    twitchClientId: "clientid123",
    accessToken: "secret-token",
  }));

  assert.equal(url.pathname, "/app/overlay.html");
  assert.equal(url.searchParams.get("channel"), "pantoufl");
  assert.equal(url.searchParams.get("accent"), "#0044cc");
  assert.equal(url.searchParams.get("life"), "5000");
  assert.equal(url.searchParams.get("max"), "18");
  assert.equal(url.searchParams.get("order"), "top");
  assert.equal(url.searchParams.get("pos"), "right");
  assert.equal(url.searchParams.get("style"), "comfortable");
  assert.equal(url.searchParams.get("font"), "110");
  assert.equal(url.searchParams.get("gap"), "7");
  assert.equal(url.searchParams.get("opacity"), "60");
  assert.equal(url.searchParams.get("radius"), "4");
  assert.equal(url.searchParams.get("anim"), "fade");
  assert.equal(url.searchParams.get("meta"), "0");
  assert.equal(url.searchParams.get("notifs"), "1");
  assert.equal(url.searchParams.get("visuals"), "1");
  assert.equal(url.searchParams.get("extemotes"), "1");
  assert.equal(url.searchParams.get("debug"), "1");
  assert.equal(url.searchParams.has("twitchClientId"), false);
  assert.equal(url.searchParams.has("accessToken"), false);
  assert.equal(url.searchParams.has("token"), false);
});

await test("overlay url omits optional flags when disabled", () => {
  const url = new URL(createOverlayUrl("https://example.com/app/index.html", {
    channel: "",
    notifications: false,
    debug: false,
  }));

  assert.equal(url.searchParams.has("channel"), false);
  assert.equal(url.searchParams.has("notifs"), false);
  assert.equal(url.searchParams.has("visuals"), false);
  assert.equal(url.searchParams.has("extemotes"), false);
  assert.equal(url.searchParams.has("debug"), false);
});

await test("overlay url carries optional OBS automod simulation flag", () => {
  const url = createOverlayUrl("https://example.com/app/index.html", {
    channel: "streamer",
    automodSimulation: true,
  });

  assert.equal(new URL(url).searchParams.get("automod"), "1");
});

await test("preview capacity height keeps the minimum visible space coherent", async () => {
  const { previewHeightForCapacity } = await import("../src/ui/preview-capacity.js");

  assert.equal(previewHeightForCapacity(1), 160);
  assert.equal(previewHeightForCapacity(16), 535);
  assert.equal(previewHeightForCapacity(CONFIG_LIMITS.maxMessages.max), 720);
  assert.equal(previewHeightForCapacity(80), 720);
  assert.equal(previewHeightForCapacity("invalid"), 435);
});

await test("live config shares automod changes without refreshing the OBS page", async () => {
  const { readLiveConfig, writeLiveConfig } = await import("../src/core/live-config.js");
  const stored = new Map();
  const storage = {
    getItem(key) {
      return stored.get(key) ?? null;
    },
    setItem(key, value) {
      stored.set(key, value);
    },
  };

  writeLiveConfig(storage, { automodSimulation: true }, () => 1234);

  const config = readLiveConfig(storage);

  assert.equal(config.automodSimulation, true);
  assert.equal(config.updatedAt, 1234);
  assert.equal(config.overlayConfig.channel, "");
});

await test("live config shares OBS-facing settings with an already open overlay", async () => {
  const { readLiveConfig, writeLiveConfig } = await import("../src/core/live-config.js");
  const stored = new Map();
  const storage = {
    getItem(key) {
      return stored.get(key) ?? null;
    },
    setItem(key, value) {
      stored.set(key, value);
    },
  };

  writeLiveConfig(storage, {
    overlayConfig: {
      channel: "Pantoufl",
      accentColor: "#14f195",
      maxMessages: 37,
      position: "right",
    },
  }, () => 5678);

  const config = readLiveConfig(storage);

  assert.equal(config.updatedAt, 5678);
  assert.equal(config.overlayConfig.channel, "pantoufl");
  assert.equal(config.overlayConfig.accentColor, "#14f195");
  assert.equal(config.overlayConfig.maxMessages, CONFIG_LIMITS.maxMessages.max);
  assert.equal(config.overlayConfig.position, "right");
});

await test("live commands can send panel test actions to another overlay page", async () => {
  const { readLiveCommand, writeLiveCommand } = await import("../src/core/live-command.js");
  const stored = new Map();
  const storage = {
    getItem(key) {
      return stored.get(key) ?? null;
    },
    setItem(key, value) {
      stored.set(key, value);
    },
  };

  writeLiveCommand(storage, {
    type: "test-message",
    payload: {
      author: "StreamCheck",
      text: "Bonjour OBS",
      messages: [{
        author: "ModLuna",
        text: "Badge moderateur visible",
        source: "premium-test",
        badges: ["moderator"],
        color: "#22c55e",
        fragments: [
          { type: "text", text: "Badge " },
          { type: "emote", text: "Kappa", emoteId: "25" },
          {
            type: "external-emote",
            text: "OMEGALUL",
            provider: "7TV",
            imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
          },
        ],
      }],
    },
  }, () => 9000);

  const command = readLiveCommand(storage);

  assert.equal(command.type, "test-message");
  assert.equal(command.createdAt, 9000);
  assert.equal(command.payload.author, "StreamCheck");
  assert.equal(command.payload.text, "Bonjour OBS");
  assert.deepEqual(command.payload.messages[0], {
    author: "ModLuna",
    text: "Badge moderateur visible",
    source: "premium-test",
    color: "#22c55e",
    badges: ["moderator"],
    fragments: [
      { type: "text", text: "Badge ", emoteId: undefined },
      { type: "emote", text: "Kappa", emoteId: "25" },
      {
        type: "external-emote",
        text: "OMEGALUL",
        provider: "7TV",
        imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
        emoteId: undefined,
      },
    ],
  });
  assert.ok(command.id.startsWith("command-9000-"));
});

await test("live status tracks OBS overlay heartbeat and command acknowledgements", async () => {
  const {
    writeOverlayHeartbeat,
    readOverlayHeartbeat,
    writeCommandAck,
    readCommandAck,
    isOverlayHeartbeatFresh,
    createOverlayConfigHash,
  } = await import("../src/core/live-status.js");
  const stored = new Map();
  const storage = {
    getItem(key) {
      return stored.get(key) ?? null;
    },
    setItem(key, value) {
      stored.set(key, value);
    },
  };

  const heartbeat = writeOverlayHeartbeat(storage, {
    overlayId: "overlay-1",
    configHash: "channel:test|max:12",
    visible: 3,
    pending: 2,
    received: 20,
  }, () => 2000);

  assert.equal(heartbeat.overlayId, "overlay-1");
  assert.equal(heartbeat.configHash, "channel:test|max:12");
  assert.equal(heartbeat.visible, 3);
  assert.equal(heartbeat.pending, 2);
  assert.equal(heartbeat.received, 20);
  assert.equal(heartbeat.updatedAt, 2000);
  assert.equal(isOverlayHeartbeatFresh(heartbeat, 5000, 6000), true);
  assert.equal(isOverlayHeartbeatFresh(heartbeat, 5000, 8001), false);
  assert.deepEqual(readOverlayHeartbeat(storage), heartbeat);
  assert.equal(
    createOverlayConfigHash({
      channel: "pantoufl",
      accentColor: "#14f195",
      maxMessages: 12,
      twitchVisuals: true,
      externalEmotes: true,
    }),
    "channel=pantoufl|accent=#14f195|max=12|life=12000|order=bottom|pos=left|style=compact|font=100|gap=8|opacity=88|radius=8|anim=slide|meta=1|notifs=0|visuals=1|extemotes=1|automod=0|debug=0",
  );

  const ack = writeCommandAck(storage, {
    commandId: "command-1",
    type: "test-message",
    overlayId: "overlay-1",
    status: "ok",
    message: "Commande reçue par OBS",
  }, () => 2100);

  assert.equal(ack.commandId, "command-1");
  assert.equal(ack.type, "test-message");
  assert.equal(ack.overlayId, "overlay-1");
  assert.equal(ack.status, "ok");
  assert.equal(ack.message, "Commande reçue par OBS");
  assert.equal(ack.updatedAt, 2100);
  assert.deepEqual(readCommandAck(storage), ack);
});

await test("demo chat source emits deterministic premium-looking test messages", () => {
  const emitted = [];
  const source = createDemoChatSource({
    now: () => 3000,
    emit: (event, payload) => emitted.push({ event, payload }),
  });

  source.emitTestMessage("CodexUser", "Test overlay prêt");

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].event, "chat:message");
  assert.equal(emitted[0].payload.author, "CodexUser");
  assert.equal(emitted[0].payload.text, "Test overlay prêt");
  assert.equal(emitted[0].payload.source, "demo");
  assert.ok(emitted[0].payload.id.startsWith("demo-3000-"));
});

await test("demo chat source emits Twitch and external visual samples", () => {
  const emitted = [];
  const source = createDemoChatSource({
    now: () => 4000,
    emit: (event, payload) => emitted.push({ event, payload }),
  });

  const messages = source.emitPremiumTestMessages();

  assert.equal(messages.length, 4);
  assert.deepEqual(messages.map((message) => message.badges.map((badge) => badge.setId ?? badge)), [
    ["moderator"],
    ["vip"],
    ["subscriber"],
    ["moderator", "vip", "subscriber"],
  ]);
  assert.equal(messages[0].badges[0].imageUrl2x, "https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/2");
  assert.equal(messages[1].badges[0].imageUrl2x, "https://static-cdn.jtvnw.net/badges/v1/b817aba4-fad8-49e2-b88a-7cc744dfa6ec/2");
  assert.equal(messages[2].badges[0].title, "Badge abonne Twitch de la chaine");
  assert.deepEqual(messages.map((message) => message.source), ["premium-test", "premium-test", "premium-test", "premium-test"]);
  assert.equal(messages[0].color, "#22c55e");
  assert.equal(messages[0].fragments[1].type, "emote");
  assert.equal(messages[0].fragments[1].emoteId, "25");
  assert.deepEqual(messages[3].fragments.filter((fragment) => fragment.type === "external-emote").map((fragment) => fragment.provider), ["7TV", "BTTV", "FFZ"]);
  assert.equal(emitted.length, 4);
  assert.equal(emitted[3].payload.author, "ComboPremium");
});


await test("chat renderer updates the accent color for future preview messages", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const container = {
    children: nodes,
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout: () => 0 };
  globalThis.document = {
    createElement(tagName) {
      return {
        tagName,
        className: "",
        dataset: {},
        children: [],
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
        remove() {},
        classList: { add() {} },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { accentColor: "#8b5cf6" });
    renderer.setAccentColor("#14f195");
    const node = renderer.renderMessage({ id: "1", author: "Test", text: "Bonjour", source: "demo" });

    assert.equal(node.style.values["--message-accent"], "#14f195");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

await test("stress action enables free visual samples before injection", () => {
  const previousSetTimeout = globalThis.setTimeout;
  const scheduled = [];
  const emitted = [];
  const appliedConfigs = [];
  const publishedConfigs = [];
  const commands = [];

  globalThis.setTimeout = (callback, delay) => {
    scheduled.push({ callback, delay });
    return scheduled.length;
  };

  try {
    const elements = {
      twitchVisuals: { checked: false },
      externalEmotes: { checked: false },
    };
    const actions = createSimulationActions({
      elements,
      bus: {},
      demoSource: {
        emitTestMessage(author, text, options) {
          emitted.push({ author, text, options });
        },
      },
      getRenderer: () => ({
        setOptions(config) {
          appliedConfigs.push(config);
        },
      }),
      diagnostics: { warn() {} },
      readFormConfig: () => ({
        twitchVisuals: elements.twitchVisuals.checked,
        externalEmotes: elements.externalEmotes.checked,
      }),
      applyVisualConfig(config) {
        appliedConfigs.push({ visual: config });
      },
      updateOverlayUrl() {},
      renderDiagnostics() {},
      renderMessageHistory() {},
      publishLiveConfig(config) {
        publishedConfigs.push(config);
      },
      sendLiveCommand(command) {
        commands.push(command);
      },
    });

    actions.runStressTest();

    assert.equal(elements.twitchVisuals.checked, true);
    assert.equal(elements.externalEmotes.checked, true);
    assert.deepEqual(publishedConfigs, [{ twitchVisuals: true, externalEmotes: true }]);
    assert.equal(appliedConfigs.length, 2);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].options.fragments.some((fragment) => fragment.type === "emote"), true);
    assert.equal(commands.includes("stress-test"), true);
    assert.equal(scheduled[0].delay, 35);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
  }
});

await test("chat renderer hides Twitch visuals until the free option is enabled", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const container = {
    children: nodes,
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout: () => 0 };
  globalThis.document = {
    createElement(tagName) {
      return {
        tagName,
        className: "",
        dataset: {},
        children: [],
        textContent: "",
        title: "",
        alt: "",
        src: "",
        style: {
          values: {},
          setProperty(name, value) {
            this.values[name] = value;
          },
        },
        append(...children) {
          this.children.push(...children);
        },
        remove() {},
        classList: { add() {} },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { maxMessages: 4, messageLifetimeMs: 30000 });
    const node = renderer.renderMessage({
      id: "visuals-off-1",
      author: "Viewer Premium",
      color: "#14f195",
      badges: ["moderator", "vip", "subscriber"],
      text: "Salut Kappa le chat",
      fragments: [
        { type: "text", text: "Salut " },
        { type: "emote", text: "Kappa", emoteId: "25" },
        { type: "text", text: " le chat" },
      ],
      source: "twitch",
    });

    const header = node.children[0];
    const author = header.children[0];
    const text = node.children[1];

    assert.equal(header.className, "chat-header");
    assert.equal(author.style.color, undefined);
    assert.equal(text.children.map((child) => child.textContent).join(""), "Salut Kappa le chat");
    assert.equal(text.children.some((child) => child.className === "chat-emote"), false);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

await test("chat renderer displays free Twitch badges emotes and username colors when enabled", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const container = {
    children: nodes,
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout: () => 0 };
  globalThis.document = {
    createElement(tagName) {
      return {
        tagName,
        className: "",
        dataset: {},
        children: [],
        textContent: "",
        title: "",
        alt: "",
        src: "",
        style: {
          values: {},
          setProperty(name, value) {
            this.values[name] = value;
          },
        },
        append(...children) {
          this.children.push(...children);
        },
        remove() {},
        classList: { add() {} },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { maxMessages: 4, messageLifetimeMs: 30000, twitchVisuals: true });
    const node = renderer.renderMessage({
      id: "visuals-on-1",
      author: "Viewer Premium",
      color: "#14f195",
      badges: [
        { setId: "moderator", id: "1", title: "Moderator", imageUrl1x: "https://static-cdn.jtvnw.net/badges/mod-1.png" },
        "vip",
        "subscriber",
      ],
      text: "Salut Kappa le chat",
      fragments: [
        { type: "text", text: "Salut " },
        { type: "emote", text: "Kappa", emoteId: "25" },
        { type: "text", text: " le chat" },
      ],
      source: "twitch",
    });

    const header = node.children[0];
    const badgeList = header.children[0];
    const author = header.children[1];
    const text = node.children[1];

    assert.equal(header.className, "chat-header");
    assert.equal(badgeList.children[0].className, "chat-badge-image");
    assert.equal(badgeList.children[0].src, "https://static-cdn.jtvnw.net/badges/mod-1.png");
    assert.deepEqual(badgeList.children.slice(1).map((badge) => badge.textContent), ["VIP", "SUB"]);
    assert.equal(author.style.color, "#14f195");
    assert.equal(text.children[1].className, "chat-emote");
    assert.match(text.children[1].src, /static-cdn\.jtvnw\.net\/emoticons\/v2\/25\/default\/dark\/1\.0/);
    assert.equal(text.children[1].alt, "Kappa");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

await test("chat renderer displays external 7TV BTTV and FFZ emotes only when enabled", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const container = {
    children: nodes,
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout: () => 0 };
  globalThis.document = {
    createElement(tagName) {
      return {
        tagName,
        className: "",
        dataset: {},
        children: [],
        textContent: "",
        title: "",
        alt: "",
        src: "",
        style: {
          values: {},
          setProperty(name, value) {
            this.values[name] = value;
          },
        },
        append(...children) {
          this.children.push(...children);
        },
        remove() {},
        classList: { add() {} },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { maxMessages: 4, messageLifetimeMs: 30000, externalEmotes: true });
    const node = renderer.renderMessage({
      id: "external-1",
      author: "Viewer Emotes",
      text: "OMEGALUL monkaS Pog",
      fragments: [
        {
          type: "external-emote",
          text: "OMEGALUL",
          provider: "7TV",
          imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
        },
        { type: "text", text: " " },
        {
          type: "external-emote",
          text: "monkaS",
          provider: "BTTV",
          imageUrl: "https://cdn.betterttv.net/emote/56e9f494fff3cc5c35e5287e/2x",
        },
        { type: "text", text: " " },
        {
          type: "external-emote",
          text: "Pog",
          provider: "FFZ",
          imageUrl: "https://cdn.frankerfacez.com/emote/123/2",
        },
      ],
      source: "twitch",
    });

    const text = node.children[1];

    assert.equal(text.children[0].className, "chat-emote chat-emote-external chat-emote-7tv");
    assert.equal(text.children[0].src, "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp");
    assert.equal(text.children[2].className, "chat-emote chat-emote-external chat-emote-bttv");
    assert.equal(text.children[4].className, "chat-emote chat-emote-external chat-emote-ffz");

    renderer.setOptions({ externalEmotes: false });
    const nextNode = renderer.renderMessage({
      id: "external-2",
      author: "Viewer Emotes",
      text: "OMEGALUL",
      fragments: [{
        type: "external-emote",
        text: "OMEGALUL",
        provider: "7TV",
        imageUrl: "https://cdn.7tv.app/emote/01F7WQ2J000000000000000001/2x.webp",
      }],
      source: "twitch",
    });

    assert.equal(nextNode.children[1].children[0].textContent, "OMEGALUL");
    assert.equal(nextNode.children[1].children[0].className, "chat-fragment");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

await test("chat renderer queues saturated messages without losing access", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const timers = [];
  const container = {
    children: nodes,
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.window = {
    setTimeout(callback) {
      timers.push(callback);
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
        remove() {
          const index = nodes.indexOf(this);
          if (index >= 0) nodes.splice(index, 1);
        },
        classList: { add() {} },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { maxMessages: 12, messageLifetimeMs: 30000 });
    for (let index = 0; index < 80; index += 1) {
      renderer.renderMessage({
        id: `stress-${index}`,
        author: `PseudoTresLong_${index}_AvecBeaucoupDeCaracteres`,
        text: `Message stress test ${index} avec une phrase volontairement tres longue pour verifier les retours a la ligne et les debordements visuels.`,
        source: "demo",
      });
    }

    assert.equal(container.children.length, 12);
    assert.equal(renderer.getStats().received, 80);
    assert.equal(renderer.getStats().displayed, 12);
    assert.equal(renderer.getStats().pending, 68);
    assert.equal(renderer.getHistory().length, 80);
    assert.equal(container.children[0].dataset.messageId, "stress-11");
    assert.equal(container.children[11].dataset.messageId, "stress-0");

    timers.shift()();
    timers.pop()();

    assert.equal(container.children.length, 12);
    assert.equal(renderer.getStats().displayed, 13);
    assert.equal(renderer.getStats().pending, 67);
    assert.equal(container.children[0].dataset.messageId, "stress-12");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

await test("chat renderer keeps overflowed-by-height messages pending", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const timers = [];
  const container = {
    children: nodes,
    clientHeight: 250,
    get scrollHeight() {
      return nodes.length * 120;
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.window = {
    setTimeout(callback) {
      timers.push(callback);
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
        remove() {
          const index = nodes.indexOf(this);
          if (index >= 0) nodes.splice(index, 1);
        },
        classList: { add() {} },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { maxMessages: 24, messageLifetimeMs: 30000 });
    for (let index = 0; index < 10; index += 1) {
      renderer.renderMessage({
        id: `height-${index}`,
        author: `Author_${index}`,
        text: `Message ${index}`,
        source: "demo",
      });
    }

    assert.equal(container.children.length, 2);
    assert.equal(renderer.getStats().received, 10);
    assert.equal(renderer.getStats().displayed, 2);
    assert.equal(renderer.getStats().pending, 8);
    assert.equal(container.children[0].dataset.messageId, "height-1");
    assert.equal(container.children[1].dataset.messageId, "height-0");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

await test("chat renderer applies moderation events without showing blocked messages", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const timers = [];
  const container = {
    children: nodes,
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.window = {
    setTimeout(callback) {
      timers.push(callback);
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
        remove() {
          const index = nodes.indexOf(this);
          if (index >= 0) nodes.splice(index, 1);
        },
        classList: { add() {} },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { maxMessages: 2, messageLifetimeMs: 30000 });
    renderer.renderMessage({ id: "m1", userId: "u1", author: "Alice", text: "Visible 1", source: "demo" });
    renderer.renderMessage({ id: "m2", userId: "u2", author: "Bob", text: "Visible 2", source: "demo" });
    renderer.renderMessage({ id: "m3", userId: "u1", author: "Alice", text: "Pending", source: "demo" });

    assert.deepEqual(renderer.getVisibleMessages().map((message) => message.id), ["m2", "m1"]);

    renderer.applyModeration({ type: "message_deleted", messageId: "m2" });

    assert.equal(container.children.some((node) => node.dataset.messageId === "m2"), false);
    assert.equal(renderer.getStats().deleted, 1);
    const deletedMessage = renderer.getHistory().find((message) => message.id === "m2");
    assert.equal(deletedMessage.moderationStatus, "deleted");
    assert.equal(deletedMessage.text, "Visible 2");

    renderer.applyModeration({ type: "user_banned", userId: "u1" });

    assert.equal(container.children.some((node) => node.dataset.userId === "u1"), false);
    assert.equal(renderer.getHistory().find((message) => message.id === "m1").moderationStatus, "removed");
    assert.equal(renderer.getHistory().find((message) => message.id === "m3").moderationStatus, "removed");
    assert.equal(renderer.getStats().removed, 2);

    renderer.applyModeration({
      type: "automod_held",
      message: { id: "held-1", userId: "u9", author: "HeldUser", text: "Message bloqué", source: "twitch" },
    });

    assert.equal(container.children.some((node) => node.dataset.messageId === "held-1"), false);
    assert.equal(renderer.getStats().blocked, 1);
    assert.equal(renderer.getHistory().find((message) => message.id === "held-1").moderationStatus, "blocked");

    renderer.renderMessage({ id: "m4", userId: "u4", author: "Carol", text: "Visible Automod", source: "demo" });
    renderer.applyModeration({ type: "automod_held", messageId: "m4" });

    assert.equal(container.children.some((node) => node.dataset.messageId === "m4"), false);
    assert.equal(renderer.getStats().blocked, 2);
    assert.equal(renderer.getHistory().find((message) => message.id === "m4").moderationStatus, "blocked");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

await test("chat renderer applies updated lifetime and max visible settings", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const timers = [];
  const container = {
    children: nodes,
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
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
        remove() {
          const index = nodes.indexOf(this);
          if (index >= 0) nodes.splice(index, 1);
        },
        classList: { add() {} },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { maxMessages: 1, messageLifetimeMs: 30000 });
    renderer.setOptions({ maxMessages: 2, messageLifetimeMs: 5000 });
    renderer.renderMessage({ id: "fast-1", author: "A", text: "one", source: "demo" });
    renderer.renderMessage({ id: "fast-2", author: "B", text: "two", source: "demo" });

    assert.equal(container.children.length, 2);
    assert.equal(timers[0].delay, 5000);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});

await test("chat renderer leaves messages with a smoother fade before replacing them", async () => {
  const { createChatRenderer } = await import("../src/ui/chat-renderer.js");
  const nodes = [];
  const timers = [];
  const container = {
    children: nodes,
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
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
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
        remove() {
          const index = nodes.indexOf(this);
          if (index >= 0) nodes.splice(index, 1);
        },
        classList: {
          values: [],
          add(value) {
            this.values.push(value);
          },
        },
      };
    },
  };

  try {
    const renderer = createChatRenderer(container, { maxMessages: 1, messageLifetimeMs: 5000 });
    const node = renderer.renderMessage({ id: "smooth-1", author: "A", text: "one", source: "demo" });

    assert.equal(timers[0].delay, 5000);

    timers[0].callback();

    assert.deepEqual(node.classList.values, ["is-fading"]);
    assert.equal(timers[1].delay, 420);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});


