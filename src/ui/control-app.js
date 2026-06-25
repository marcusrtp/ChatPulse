import { createEventBus } from "../core/event-bus.js";
import { createDiagnostics } from "../core/diagnostics.js";
import { createOverlayUrl, loadConfig } from "../core/config.js";
import { readLiveConfig, writeLiveConfig } from "../core/live-config.js";
import { PREMIUM_OPTION_LOCKS, enforceOptionLocks, normalizeOptionLocks } from "../core/option-access.js";
import { createDemoChatSource } from "../chat/demo-source.js";
import { createTwitchSessionController } from "../twitch/session-controller.js";
import { createChatRenderer } from "./chat-renderer.js";
import { createControlForm } from "./control-form.js";
import { createDiagnosticsView } from "./diagnostics-view.js";
import { formatOverlayUrl } from "./overlay-url-display.js";
import { createHistoryView } from "./history-view.js";
import { createObsConnectionMonitor } from "./obs-connection-monitor.js";
import { previewHeightForCapacity } from "./preview-capacity.js";
import { createPremiumLockController } from "./premium-locks.js";
import { applySettingsPreset, getSettingsPreset } from "./settings-presets.js";
import { createSimulationActions } from "./simulation-actions.js";
import { createTwitchVisualStatusView } from "./twitch-visual-status-view.js";

const bus = createEventBus();
const diagnostics = createDiagnostics();
const optionLocks = normalizeOptionLocks(PREMIUM_OPTION_LOCKS);
const config = enforceOptionLocks(loadConfig(), optionLocks);
const liveConfig = readLiveConfig();
const demoSource = createDemoChatSource({ emit: bus.emit });
let renderer;
let simulationActions;
let obsMonitor;
let twitchVisualAssets = {};

const elements = {
  form: document.querySelector("#config-form"),
  channel: document.querySelector("#channel-input"),
  twitchClientId: document.querySelector("#twitch-client-id-input"),
  accent: document.querySelector("#accent-input"),
  presetButtons: document.querySelector("#preset-buttons"),
  presetStatus: document.querySelector("#preset-status"),
  lifetime: document.querySelector("#lifetime-input"),
  lifetimeValue: document.querySelector("#lifetime-value"),
  lifetimeNumber: document.querySelector("#lifetime-number-input"),
  maxMessages: document.querySelector("#max-messages-input"),
  maxMessagesValue: document.querySelector("#max-messages-value"),
  maxMessagesNumber: document.querySelector("#max-messages-number-input"),
  messageOrder: document.querySelector("#message-order-input"),
  position: document.querySelector("#position-input"),
  density: document.querySelector("#density-input"),
  fontScale: document.querySelector("#font-scale-input"),
  fontScaleValue: document.querySelector("#font-scale-value"),
  fontScaleNumber: document.querySelector("#font-scale-number-input"),
  gap: document.querySelector("#gap-input"),
  gapValue: document.querySelector("#gap-value"),
  gapNumber: document.querySelector("#gap-number-input"),
  opacity: document.querySelector("#opacity-input"),
  opacityValue: document.querySelector("#opacity-value"),
  opacityNumber: document.querySelector("#opacity-number-input"),
  radius: document.querySelector("#radius-input"),
  radiusValue: document.querySelector("#radius-value"),
  radiusNumber: document.querySelector("#radius-number-input"),
  animation: document.querySelector("#animation-input"),
  debug: document.querySelector("#debug-input"),
  showMeta: document.querySelector("#show-meta-input"),
  notifications: document.querySelector("#notifications-input"),
  twitchVisuals: document.querySelector("#twitch-visuals-input"),
  externalEmotes: document.querySelector("#external-emotes-input"),
  overlayUrl: document.querySelector("#overlay-url"),
  copyUrlButton: document.querySelector("#copy-url-button"),
  copyUrlStatus: document.querySelector("#copy-url-status"),
  connectTwitchButton: document.querySelector("#connect-twitch-button"),
  startLiveButton: document.querySelector("#start-live-button"),
  twitchSessionStatus: document.querySelector("#twitch-session-status"),
  statusTitle: document.querySelector("#status-title"),
  statusGrid: document.querySelector("#status-grid"),
  visualStatusList: document.querySelector("#visual-status-list"),
  eventLog: document.querySelector("#event-log"),
  messageCount: document.querySelector("#message-count"),
  visibleCount: document.querySelector("#visible-count"),
  pendingCount: document.querySelector("#pending-count"),
  displayedCount: document.querySelector("#displayed-count"),
  deletedCount: document.querySelector("#deleted-count"),
  blockedCount: document.querySelector("#blocked-count"),
  messageHistory: document.querySelector("#message-history"),
  testButton: document.querySelector("#test-message-button"),
  obsNotificationButton: document.querySelector("#obs-notification-button"),
  stressButton: document.querySelector("#stress-test-button"),
  deleteButton: document.querySelector("#simulate-delete-button"),
  automodButton: document.querySelector("#simulate-automod-button"),
  warningButton: document.querySelector("#simulate-warning-button"),
  errorButton: document.querySelector("#simulate-error-button"),
};

const historyView = createHistoryView({ listElement: elements.messageHistory });
const diagnosticsView = createDiagnosticsView({
  statusTitle: elements.statusTitle,
  statusGrid: elements.statusGrid,
  eventLog: elements.eventLog,
});
const twitchVisualStatusView = createTwitchVisualStatusView({
  listElement: elements.visualStatusList,
});
const controlForm = createControlForm(elements, { optionLocks });
const premiumLockController = createPremiumLockController({ elements, optionLocks });
const twitchSession = createTwitchSessionController({
  diagnostics,
  emit: bus.emit,
  getConfig: readFormConfig,
  renderDiagnostics,
  statusElement: elements.twitchSessionStatus,
});

renderer = createChatRenderer(document.querySelector("#chat-preview"), {
  ...config,
  onStatsChange: updateQueueStats,
});
simulationActions = createSimulationActions({
  elements,
  bus,
  demoSource,
  getRenderer: () => renderer,
  diagnostics,
  readFormConfig,
  applyVisualConfig,
  updateOverlayUrl,
  renderDiagnostics,
  renderMessageHistory,
  publishLiveConfig,
  sendLiveCommand,
  initialAutomodEnabled: liveConfig.automodSimulation,
});
obsMonitor = createObsConnectionMonitor({
  diagnostics,
  getExpectedConfig: () => ({
    ...collectFormConfig(),
    automodSimulation: simulationActions.isAutomodEnabled(),
  }),
  renderDiagnostics,
});
controlForm.hydrate(config);
premiumLockController.apply();
twitchSession.processOAuthRedirect();
applyAccent(config.accentColor);
diagnostics.info("overlay", "Centre de contrôle chargé");
diagnostics.warn("twitch", twitchSession.twitchAccessToken() ? "OAuth Twitch prêt. Démarre le live quand tu veux." : "OAuth Twitch non connecté. Le mode démo est actif.");
renderDiagnostics();
renderTwitchVisualStatus();
simulationActions.updateAutomodButtonLabel();
updateOverlayUrl();
obsMonitor.start();

bus.on("chat:message", (message) => {
  if (simulationActions.handleIncomingMessage(message)) {
    refreshLivePanels();
    return;
  }

  renderer.renderMessage(message);
  diagnostics.info("demo", `Message démo reçu depuis ${message.author}`);
  diagnostics.info("obs", "URL OBS prête. Colle-la dans une source navigateur.");
  refreshLivePanels();
});

bus.on("chat:moderation", (event) => {
  renderer.applyModeration(event);
  diagnostics.warn("twitch", simulationActions.moderationLogMessage(event));
  refreshLivePanels();
});

bus.on("twitch:visuals", (payload) => {
  updateTwitchVisualAssets(payload);
});

elements.form.addEventListener("input", (event) => {
  if (event.target.classList.contains("precise-number")) {
    controlForm.handlePreciseInput(event.target);
  }
  commitFormConfig();
});

elements.form.addEventListener("change", (event) => {
  if (event.target.classList.contains("precise-number")) {
    controlForm.handlePreciseInput(event.target);
  }
  commitFormConfig();
});

elements.presetButtons.addEventListener("click", (event) => {
  const button = event.target.closest("[data-preset-id]");
  if (!button) return;

  applyPreset(button.dataset.presetId);
});

function commitFormConfig() {
  const nextConfig = readFormConfig();
  applyVisualConfig(nextConfig);
  renderer.setOptions(nextConfig);
  publishLiveConfig(nextConfig);
  updateOverlayUrl();
  controlForm.updateCustomizationLabels(nextConfig);
  renderTwitchVisualStatus(nextConfig);
}

elements.testButton.addEventListener("click", () => {
  const messages = demoSource.emitPremiumTestMessages();
  diagnostics.info("demo", "Pack de test visuel Twitch envoyé : badges, emotes et couleurs de pseudo.");
  sendLiveCommand("test-message", {
    messages: messages.map(serializeLiveTestMessage),
  });
  refreshLivePanels();
});

function applyPreset(id) {
  const preset = getSettingsPreset(id);
  if (!preset) return;

  const nextConfig = applySettingsPreset(readFormConfig(), id);
  controlForm.hydrate(nextConfig);
  commitFormConfig();
  updatePresetSelection(id);
  elements.presetStatus.textContent = `${preset.label} appliqué`;
  diagnostics.info("overlay", `Profil ${preset.label} appliqué aux réglages OBS.`);
  renderDiagnostics();
}

function updatePresetSelection(activeId) {
  for (const button of elements.presetButtons.querySelectorAll("[data-preset-id]")) {
    button.setAttribute("aria-pressed", button.dataset.presetId === activeId ? "true" : "false");
  }
}

elements.obsNotificationButton.addEventListener("click", () => {
  simulationActions.emitObsNotification();
});

elements.copyUrlButton.addEventListener("click", () => {
  copyOverlayUrl();
});

elements.connectTwitchButton.addEventListener("click", () => {
  twitchSession.connectTwitchOAuth();
});

elements.startLiveButton.addEventListener("click", () => {
  twitchVisualAssets = {};
  renderTwitchVisualStatus();
  twitchSession.startTwitchLive();
});

elements.stressButton.addEventListener("click", () => {
  simulationActions.runStressTest();
});

elements.deleteButton.addEventListener("click", () => {
  simulationActions.simulateDeletedMessage();
});

elements.automodButton.addEventListener("click", () => {
  simulationActions.toggleAutomodSimulation();
});

elements.warningButton.addEventListener("click", () => {
  diagnostics.warn("obs", "Aucune activité OBS confirmée. Colle ou rafraîchis l'URL de l'overlay.");
  sendLiveCommand("warning", { message: "Alerte test envoyée depuis le panneau." });
  renderDiagnostics();
});

elements.errorButton.addEventListener("click", () => {
  diagnostics.error("twitch", "Échec de jeton simulé. Reconnecte Twitch quand OAuth sera activé.");
  sendLiveCommand("error", { message: "Erreur test envoyée depuis le panneau." });
  renderDiagnostics();
});

function readFormConfig() {
  return controlForm.read();
}

function collectFormConfig() {
  return controlForm.collect();
}

function applyAccent(accentColor) {
  document.documentElement.style.setProperty("--accent", accentColor);
  const nextConfig = readFormConfig();
  applyVisualConfig(nextConfig);
  renderer.setOptions(nextConfig);
}

function applyVisualConfig(config) {
  document.documentElement.style.setProperty("--accent", config.accentColor);
  document.documentElement.style.setProperty("--chat-font-scale", `${config.fontScale / 100}`);
  document.documentElement.style.setProperty("--chat-gap", `${config.gapPx}px`);
  document.documentElement.style.setProperty("--chat-bg-opacity", String(config.backgroundOpacity));
  document.documentElement.style.setProperty("--chat-radius", `${config.radiusPx}px`);
  setPreviewCapacityHeight(config.maxMessages);
  document.body.dataset.position = config.position;
  document.body.dataset.density = config.density;
  document.body.dataset.order = config.messageOrder;
  document.body.dataset.animation = config.animation;
}

function setPreviewCapacityHeight(maxMessages) {
  const height = previewHeightForCapacity(maxMessages);
  document.documentElement.style.setProperty("--preview-target-height", `${height}px`);
}

function updateOverlayUrl() {
  const overlayUrl = createOverlayUrl(window.location.href, {
    ...readFormConfig(),
    automodSimulation: simulationActions.isAutomodEnabled(),
  });
  elements.overlayUrl.textContent = formatOverlayUrl(overlayUrl);
  elements.overlayUrl.title = overlayUrl;
  elements.overlayUrl.dataset.fullUrl = overlayUrl;
  elements.copyUrlStatus.textContent = "";
}

function publishLiveConfig(nextConfig = readFormConfig()) {
  writeLiveConfig(globalThis.localStorage, {
    automodSimulation: simulationActions.isAutomodEnabled(),
    overlayConfig: nextConfig,
  });
}

function sendLiveCommand(type, payload = {}) {
  return obsMonitor.sendLiveCommand(type, payload);
}

function serializeLiveTestMessage(message) {
  return {
    author: message.author,
    text: message.text,
    source: message.source,
    badges: message.badges,
    color: message.color,
    fragments: message.fragments,
  };
}

async function copyOverlayUrl() {
  const overlayUrl = elements.overlayUrl.dataset.fullUrl?.trim() || elements.overlayUrl.textContent.trim();
  if (!overlayUrl) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(overlayUrl);
    } else {
      fallbackCopyText(overlayUrl);
    }
    elements.copyUrlStatus.textContent = "Copié";
  } catch {
    fallbackCopyText(overlayUrl);
    elements.copyUrlStatus.textContent = "Copié";
  }

  window.setTimeout(() => {
    elements.copyUrlStatus.textContent = "";
  }, 1800);
}

function fallbackCopyText(text) {
  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function updateQueueStats(stats = renderer.getStats()) {
  elements.messageCount.textContent = `${stats.visible} message${stats.visible > 1 ? "s" : ""} visible${stats.visible > 1 ? "s" : ""}`;
  elements.visibleCount.textContent = `${stats.visible} visible${stats.visible > 1 ? "s" : ""}`;
  elements.pendingCount.textContent = `${stats.pending} en attente`;
  elements.displayedCount.textContent = `${stats.received} reçu${stats.received > 1 ? "s" : ""}`;
  elements.deletedCount.textContent = `${stats.deleted} supprimé${stats.deleted > 1 ? "s" : ""}`;
  elements.blockedCount.textContent = `${stats.blocked} bloqué${stats.blocked > 1 ? "s" : ""}`;
}

function renderMessageHistory() {
  historyView.render(renderer.getHistory());
}

function refreshLivePanels() {
  updateQueueStats(renderer.getStats());
  renderMessageHistory();
  renderDiagnostics();
  renderTwitchVisualStatus();
}

function renderDiagnostics() {
  diagnosticsView.render(diagnostics.snapshot());
}

function updateTwitchVisualAssets(payload = {}) {
  if (payload.kind === "badges") {
    twitchVisualAssets = { ...twitchVisualAssets, badges: payload };
  }
  if (payload.kind === "external-emotes") {
    twitchVisualAssets = { ...twitchVisualAssets, externalEmotes: payload };
  }
  renderTwitchVisualStatus();
}

function renderTwitchVisualStatus(nextConfig = readFormConfig()) {
  twitchVisualStatusView.render({
    config: nextConfig,
    oauthConnected: Boolean(twitchSession.twitchAccessToken()),
    assets: twitchVisualAssets,
  });
}
