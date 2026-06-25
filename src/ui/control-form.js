import { saveConfig } from "../core/config.js";
import { enforceOptionLocks, normalizeOptionLocks } from "../core/option-access.js";

export function createControlForm(elements, { optionLocks = normalizeOptionLocks() } = {}) {
  const locks = normalizeOptionLocks(optionLocks);

  function hydrate(initialConfig) {
    const config = enforceOptionLocks(initialConfig, locks);
    elements.channel.value = config.channel;
    elements.twitchClientId.value = config.twitchClientId;
    elements.accent.value = config.accentColor;
    elements.lifetime.value = config.messageLifetimeMs;
    elements.maxMessages.value = config.maxMessages;
    elements.messageOrder.value = config.messageOrder;
    elements.position.value = config.position;
    elements.density.value = config.density;
    elements.fontScale.value = config.fontScale;
    elements.gap.value = config.gapPx;
    elements.opacity.value = Math.round(config.backgroundOpacity * 100);
    elements.radius.value = config.radiusPx;
    elements.animation.value = config.animation;
    elements.debug.checked = config.debug;
    elements.showMeta.checked = config.showMeta;
    elements.notifications.checked = config.notifications;
    elements.twitchVisuals.checked = config.twitchVisuals;
    elements.externalEmotes.checked = config.externalEmotes;
    updateCustomizationLabels(read());
  }

  function collect() {
    return enforceOptionLocks({
      channel: elements.channel.value,
      twitchClientId: elements.twitchClientId.value,
      accentColor: elements.accent.value,
      messageLifetimeMs: elements.lifetime.value,
      maxMessages: elements.maxMessages.value,
      messageOrder: elements.messageOrder.value,
      position: elements.position.value,
      density: elements.density.value,
      fontScale: elements.fontScale.value,
      gapPx: elements.gap.value,
      backgroundOpacity: Number(elements.opacity.value) / 100,
      radiusPx: elements.radius.value,
      animation: elements.animation.value,
      showMeta: elements.showMeta.checked,
      notifications: elements.notifications.checked,
      twitchVisuals: elements.twitchVisuals.checked,
      externalEmotes: elements.externalEmotes.checked,
      debug: elements.debug.checked,
    }, locks);
  }

  function read() {
    return saveConfig(collect());
  }

  function updateCustomizationLabels(config) {
    syncPreciseInputs(config);
  }

  function syncPreciseInputs(config) {
    elements.lifetimeNumber.value = Math.round(config.messageLifetimeMs / 1000);
    elements.maxMessagesNumber.value = config.maxMessages;
    elements.fontScaleNumber.value = config.fontScale;
    elements.gapNumber.value = config.gapPx;
    elements.opacityNumber.value = Math.round(config.backgroundOpacity * 100);
    elements.radiusNumber.value = config.radiusPx;
  }

  function handlePreciseInput(input) {
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;

    if (input === elements.lifetimeNumber) {
      elements.lifetime.value = String(value * 1000);
    } else if (input === elements.maxMessagesNumber) {
      elements.maxMessages.value = String(value);
    } else if (input === elements.fontScaleNumber) {
      elements.fontScale.value = String(value);
    } else if (input === elements.gapNumber) {
      elements.gap.value = String(value);
    } else if (input === elements.opacityNumber) {
      elements.opacity.value = String(value);
    } else if (input === elements.radiusNumber) {
      elements.radius.value = String(value);
    }
  }

  return { hydrate, collect, read, updateCustomizationLabels, syncPreciseInputs, handlePreciseInput };
}
