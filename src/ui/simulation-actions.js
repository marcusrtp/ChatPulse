import { STRESS_TEST_TOTAL, emitStressTestMessages } from "../chat/stress-fixtures.js";

export function createSimulationActions({
  elements,
  bus,
  demoSource,
  getRenderer,
  diagnostics,
  readFormConfig,
  applyVisualConfig,
  updateOverlayUrl,
  renderDiagnostics,
  renderMessageHistory,
  publishLiveConfig,
  sendLiveCommand,
  initialAutomodEnabled = false,
}) {
  let automodSimulationEnabled = initialAutomodEnabled;
  let automodReviewedCount = 0;
  let nextAutomodBlockAt = randomAutomodThreshold();

  function isAutomodEnabled() {
    return automodSimulationEnabled;
  }

  function handleIncomingMessage(message) {
    if (!shouldBlockByAutomod(message)) return false;

    getRenderer().applyModeration({
      type: "automod_held",
      message: {
        ...message,
        moderationReason: "Simulation AutoMod",
      },
    });
    diagnostics.warn("twitch", `AutoMod a retenu un message de ${message.author} avant l'overlay.`);
    return true;
  }

  function runStressTest() {
    ensureStressVisualOptions();
    emitStressTestMessages(demoSource, { intervalMs: 35 });

    diagnostics.warn("demo", `${STRESS_TEST_TOTAL} messages injectés progressivement avec badges, emotes et couleurs pour tester la saturation.`);
    sendLiveCommand("stress-test");
    renderDiagnostics();
  }

  function ensureStressVisualOptions() {
    let changed = false;

    if (elements.twitchVisuals && !elements.twitchVisuals.checked) {
      elements.twitchVisuals.checked = true;
      changed = true;
    }

    if (elements.externalEmotes && !elements.externalEmotes.checked) {
      elements.externalEmotes.checked = true;
      changed = true;
    }

    if (!changed) return;

    const nextConfig = readFormConfig();
    applyVisualConfig(nextConfig);
    getRenderer().setOptions(nextConfig);
    publishLiveConfig(nextConfig);
    updateOverlayUrl();
  }

  function emitObsNotification() {
    elements.notifications.checked = true;
    const nextConfig = readFormConfig();
    applyVisualConfig(nextConfig);
    getRenderer().setOptions(nextConfig);
    updateOverlayUrl();

    const notification = {
      id: `notification-${Date.now()}`,
      author: "Alerte OBS",
      text: "Alerte test OBS affichée dans l'overlay.",
      timestamp: Date.now(),
      source: "notification",
      badges: ["obs"],
    };
    bus.emit("chat:message", notification);
    sendLiveCommand("obs-notification", {
      author: notification.author,
      text: notification.text,
    });
    diagnostics.info("obs", "Alerte test OBS affichée.");
    renderDiagnostics();
  }

  function simulateDeletedMessage() {
    const [visibleMessage] = getRenderer().getVisibleMessages();
    if (visibleMessage?.id) {
      bus.emit("chat:moderation", { type: "message_deleted", messageId: visibleMessage.id });
      sendLiveCommand("delete-message");
      return;
    }

    const message = {
      id: `moderated-${Date.now()}`,
      userId: "demo-moderation-user",
      author: "ModerationTest",
      text: "Ce message va être supprimé par la modération.",
      timestamp: Date.now(),
      source: "moderation-test",
      badges: ["demo"],
    };
    bus.emit("chat:message", message);
    bus.emit("chat:moderation", { type: "message_deleted", messageId: message.id });
    sendLiveCommand("delete-message");
  }

  function toggleAutomodSimulation() {
    automodSimulationEnabled = !automodSimulationEnabled;
    automodReviewedCount = 0;
    nextAutomodBlockAt = randomAutomodThreshold();
    publishLiveConfig();
    updateAutomodButtonLabel();
    if (automodSimulationEnabled) {
      emitAutomodProbe();
    }
    diagnostics.warn(
      "twitch",
      automodSimulationEnabled
        ? "AutoMod activé : certains prochains messages seront retenus avant l'overlay."
        : "AutoMod désactivé.",
    );
    updateOverlayUrl();
    renderDiagnostics();
  }

  function updateAutomodButtonLabel() {
    elements.automodButton.textContent = automodSimulationEnabled
      ? "Désactiver AutoMod"
      : "Activer AutoMod";
    elements.automodButton.setAttribute("aria-pressed", automodSimulationEnabled ? "true" : "false");
  }

  function emitAutomodProbe() {
    demoSource.emitTestMessage(
      "AutoModTest",
      "Message sonde banword retenu pour vérifier le compteur bloqué après saturation.",
    );
  }

  function shouldBlockByAutomod(message) {
    if (!automodSimulationEnabled || message.source === "notification" || message.source === "moderation-test" || message.source === "premium-test") return false;

    automodReviewedCount += 1;
    const text = String(message.text ?? "").toLowerCase();
    const riskyWords = ["insulte", "spam", "haine", "toxique", "banword"];
    const matchesRiskyWord = riskyWords.some((word) => text.includes(word));
    const randomHit = automodReviewedCount >= nextAutomodBlockAt && Math.random() < 0.7;

    if (!matchesRiskyWord && !randomHit) return false;

    automodReviewedCount = 0;
    nextAutomodBlockAt = randomAutomodThreshold();
    return true;
  }

  function randomAutomodThreshold() {
    return 2 + Math.floor(Math.random() * 5);
  }

  function moderationLogMessage(event) {
    if (event.type === "message_deleted") return "Message supprimé retiré de l'overlay et de la file.";
    if (event.type === "user_banned" || event.type === "user_timeout" || event.type === "clear_user") {
      return "Messages utilisateur retirés après ban, timeout ou purge.";
    }
    if (event.type === "clear_chat") return "Chat vidé côté Twitch. Overlay remis à zéro.";
    if (event.type === "automod_held" || event.type === "blocked") return "Message bloqué par Automod. Non affiché dans l'overlay.";
    return "Événement de modération appliqué.";
  }

  return {
    isAutomodEnabled,
    handleIncomingMessage,
    runStressTest,
    emitObsNotification,
    simulateDeletedMessage,
    toggleAutomodSimulation,
    updateAutomodButtonLabel,
    moderationLogMessage,
  };
}
