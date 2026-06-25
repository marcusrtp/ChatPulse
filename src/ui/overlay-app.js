import { normalizeConfig } from "../core/config.js";
import { createEventBus } from "../core/event-bus.js";
import { LIVE_CONFIG_STORAGE_KEY, readLiveConfig } from "../core/live-config.js";
import { LIVE_COMMAND_STORAGE_KEY, readLiveCommand } from "../core/live-command.js";
import { createOverlayConfigHash, writeCommandAck, writeOverlayHeartbeat } from "../core/live-status.js";
import { createDemoChatSource } from "../chat/demo-source.js";
import { emitStressTestMessages } from "../chat/stress-fixtures.js";
import { createChatRenderer } from "./chat-renderer.js";

const params = new URLSearchParams(window.location.search);
const config = normalizeConfig({
  channel: params.get("channel") ?? "",
  accentColor: params.get("accent") ?? "#8b5cf6",
  life: params.get("life") ?? undefined,
  maxMessages: params.get("max") ?? undefined,
  order: params.get("order") ?? undefined,
  pos: params.get("pos") ?? undefined,
  style: params.get("style") ?? undefined,
  font: params.get("font") ?? undefined,
  gap: params.get("gap") ?? undefined,
  opacity: params.get("opacity") ?? undefined,
  radius: params.get("radius") ?? undefined,
  anim: params.get("anim") ?? undefined,
  meta: params.get("meta") ?? undefined,
  notifs: params.get("notifs") ?? undefined,
  visuals: params.get("visuals") ?? undefined,
  extemotes: params.get("extemotes") ?? undefined,
  automod: params.get("automod") ?? undefined,
  debug: params.get("debug") === "1",
});
const liveConfig = readLiveConfig();
if (liveConfig.updatedAt > 0) {
  Object.assign(config, liveConfig.overlayConfig);
  config.automodSimulation = liveConfig.automodSimulation;
}
const stressMode = params.get("stress") === "1";
const overlayId = createOverlayId();
let automodReviewedCount = 0;
let nextAutomodBlockAt = 3;

const bus = createEventBus();
const feed = document.querySelector("#overlay-feed");
const debugPanel = document.querySelector("#overlay-debug");
const debugText = document.querySelector("#overlay-debug-text");
const renderer = createChatRenderer(feed, {
  ...config,
  onStatsChange: updateDebugStats,
});
const demoSource = createDemoChatSource({ emit: bus.emit });

applyVisualConfig(config);
sendOverlayHeartbeat();
window.setInterval(sendOverlayHeartbeat, 2000);
window.addEventListener("storage", (event) => {
  if (event.key === LIVE_CONFIG_STORAGE_KEY) {
    applyLiveConfig(readLiveConfig());
  } else if (event.key === LIVE_COMMAND_STORAGE_KEY) {
    applyLiveCommand(readLiveCommand());
  }
});

if (config.debug) {
  debugPanel.hidden = false;
  debugText.textContent = config.channel
    ? `Flux démo prêt pour ${config.channel}`
    : "Flux démo prêt sans compte Twitch";
}

bus.on("chat:message", (message) => {
  if (shouldBlockByAutomod(message)) {
    renderer.applyModeration({
      type: "automod_held",
      message: {
        ...message,
        moderationReason: "Simulation AutoMod OBS",
      },
    });
    if (config.debug) {
      updateDebugStats(renderer.getStats(), `AutoMod OBS : ${message.author} retenu`);
    }
    return;
  }

  renderer.renderMessage(message);
  if (config.debug) {
    updateDebugStats(renderer.getStats(), `Dernier message démo : ${message.author}`);
  }
});

function updateDebugStats(stats = renderer.getStats(), prefix = "Flux démo actif") {
  sendOverlayHeartbeat(stats);

  if (!config.debug) return;
  debugText.textContent = `${prefix} · ${stats.visible} visibles · ${stats.pending} en attente · ${stats.received} reçus · ${stats.deleted} supprimé${stats.deleted > 1 ? "s" : ""} · ${stats.blocked} bloqué${stats.blocked > 1 ? "s" : ""}`;
}

function sendOverlayHeartbeat(stats = renderer.getStats()) {
  writeOverlayHeartbeat(globalThis.localStorage, {
    overlayId,
    configHash: createOverlayConfigHash(config),
    visible: stats.visible,
    pending: stats.pending,
    received: stats.received,
  });
}

demoSource.emitTestMessage("StreamCheck", "Overlay chargé dans OBS.");
if (config.notifications) {
  bus.emit("chat:message", {
    id: `notification-${Date.now()}`,
    author: "Notification OBS",
    text: "Les notifications OBS sont activées.",
    timestamp: Date.now(),
    source: "notification",
    badges: ["obs"],
  });
}
if (stressMode) {
  runStressTest();
} else {
  demoSource.start(5200);
}

function applyVisualConfig(config) {
  document.documentElement.style.setProperty("--accent", config.accentColor);
  document.documentElement.style.setProperty("--chat-font-scale", `${config.fontScale / 100}`);
  document.documentElement.style.setProperty("--chat-gap", `${config.gapPx}px`);
  document.documentElement.style.setProperty("--chat-bg-opacity", String(config.backgroundOpacity));
  document.documentElement.style.setProperty("--chat-radius", `${config.radiusPx}px`);
  document.body.dataset.position = config.position;
  document.body.dataset.density = config.density;
  document.body.dataset.order = config.messageOrder;
  document.body.dataset.animation = config.animation;
}

function applyLiveConfig(nextLiveConfig) {
  const previousAutomod = config.automodSimulation;
  Object.assign(config, normalizeConfig({
    ...config,
    ...nextLiveConfig.overlayConfig,
    automodSimulation: nextLiveConfig.automodSimulation,
  }));

  applyVisualConfig(config);
  renderer.setOptions(config);

  if (config.debug && previousAutomod === config.automodSimulation) {
    updateDebugStats(renderer.getStats(), "Réglages OBS mis à jour sans rechargement");
  }

  if (previousAutomod === config.automodSimulation) return;

  automodReviewedCount = 0;
  nextAutomodBlockAt = 3;

  if (config.debug) {
    updateDebugStats(
      renderer.getStats(),
      config.automodSimulation
        ? "AutoMod OBS activé sans rechargement"
        : "AutoMod OBS désactivé sans rechargement",
    );
  }

  if (config.automodSimulation) {
    emitAutomodProbe();
  }
}

function applyLiveCommand(command) {
  if (!command.type) return;

  if (command.type === "test-message") {
    if (Array.isArray(command.payload.messages) && command.payload.messages.length > 0) {
      for (const message of command.payload.messages) {
        demoSource.emitTestMessage(
          message.author || "StreamCheck",
          message.text || "Message de test envoyé depuis le panneau.",
          {
            source: message.source || "premium-test",
            badges: message.badges,
            color: message.color,
            fragments: message.fragments,
          },
        );
      }
    } else {
      demoSource.emitTestMessage(
        command.payload.author || "StreamCheck",
        command.payload.text || "Message de test envoyé depuis le panneau.",
      );
    }
  } else if (command.type === "obs-notification") {
    bus.emit("chat:message", {
      id: `notification-${command.id || Date.now()}`,
      author: command.payload.author || "Notification OBS",
      text: command.payload.text || "Alerte test OBS affichée dans l'overlay.",
      timestamp: Date.now(),
      source: "notification",
      badges: ["obs"],
    });
  } else if (command.type === "stress-test") {
    runStressTest();
  } else if (command.type === "delete-message") {
    simulateDeletedMessage();
  } else if (command.type === "warning" && config.debug) {
    updateDebugStats(renderer.getStats(), command.payload.message || "Alerte test reçue depuis le panneau");
  } else if (command.type === "error" && config.debug) {
    updateDebugStats(renderer.getStats(), command.payload.message || "Erreur test reçue depuis le panneau");
  }

  ackLiveCommand(command);
}

function ackLiveCommand(command, status = "ok", message = "Commande reçue par OBS") {
  writeCommandAck(globalThis.localStorage, {
    commandId: command.id,
    type: command.type,
    overlayId,
    status,
    message,
  });
}

function runStressTest() {
  emitStressTestMessages(demoSource);
}

function simulateDeletedMessage() {
  const [visibleMessage] = renderer.getVisibleMessages();
  if (!visibleMessage?.id) return;

  renderer.applyModeration({ type: "message_deleted", messageId: visibleMessage.id });
  if (config.debug) {
    updateDebugStats(renderer.getStats(), "Suppression test reçue depuis le panneau");
  }
}

function emitAutomodProbe() {
  demoSource.emitTestMessage(
    "AutoModTest",
    "Message sonde banword retenu pour vérifier le compteur bloqué après saturation.",
  );
}

function shouldBlockByAutomod(message) {
  if (!config.automodSimulation || message.source === "notification" || message.source === "premium-test") return false;

  automodReviewedCount += 1;
  const text = String(message.text ?? "").toLowerCase();
  const riskyWords = ["insulte", "spam", "haine", "toxique", "banword"];
  const matchesRiskyWord = riskyWords.some((word) => text.includes(word));
  const scheduledBlock = automodReviewedCount >= nextAutomodBlockAt;

  if (!matchesRiskyWord && !scheduledBlock) return false;

  automodReviewedCount = 0;
  nextAutomodBlockAt = 3 + Math.floor(Math.random() * 4);
  return true;
}

function createOverlayId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
