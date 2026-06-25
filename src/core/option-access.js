import { DEFAULT_CONFIG } from "./config.js";

export const LOCKABLE_OPTION_DEFINITIONS = Object.freeze([
  lockableOption("channel", "Chaîne Twitch", ["channel"]),
  lockableOption("twitchClientId", "Client ID Twitch", ["twitchClientId"]),
  lockableOption("accentColor", "Couleur principale", ["accentColor"], ["accent"]),
  lockableOption("messageLifetimeMs", "Durée des messages", ["messageLifetimeMs"], ["lifetime", "lifetimeNumber"]),
  lockableOption("maxMessages", "Nombre messages visible", ["maxMessages"], ["maxMessages", "maxMessagesNumber"]),
  lockableOption("messageOrder", "Sens d'apparition", ["messageOrder"]),
  lockableOption("position", "Position OBS", ["position"]),
  lockableOption("density", "Style des messages", ["density"]),
  lockableOption("fontScale", "Taille du texte", ["fontScale"], ["fontScale", "fontScaleNumber"]),
  lockableOption("gapPx", "Espacement", ["gapPx"], ["gap", "gapNumber"]),
  lockableOption("backgroundOpacity", "Opacité du fond", ["backgroundOpacity"], ["opacity", "opacityNumber"]),
  lockableOption("radiusPx", "Arrondi des cartes", ["radiusPx"], ["radius", "radiusNumber"]),
  lockableOption("animation", "Animation", ["animation"]),
  lockableOption("showMeta", "Badge DEMO/LIVE", ["showMeta"]),
  lockableOption("notifications", "Notifications OBS", ["notifications"]),
  lockableOption("twitchVisuals", "Badges et emotes Twitch", ["twitchVisuals"]),
  lockableOption("externalEmotes", "Emotes externes", ["externalEmotes"]),
  lockableOption("debug", "Diagnostic OBS", ["debug"]),
]);

// Set an option id to true here when it must become premium in the free build.
export const PREMIUM_OPTION_LOCKS = Object.freeze({});

export function normalizeOptionLocks(input = PREMIUM_OPTION_LOCKS) {
  const source = input && typeof input === "object" ? input : {};
  const locks = {};

  for (const option of LOCKABLE_OPTION_DEFINITIONS) {
    locks[option.id] = isLockedValue(source[option.id]);
  }

  return locks;
}

export function enforceOptionLocks(config, locks = normalizeOptionLocks(), defaults = DEFAULT_CONFIG) {
  const unlockedConfig = { ...config };

  for (const option of LOCKABLE_OPTION_DEFINITIONS) {
    if (!locks[option.id]) continue;

    for (const key of option.configKeys) {
      unlockedConfig[key] = defaults[key];
    }
  }

  return unlockedConfig;
}

export function lockedOptionIds(locks = normalizeOptionLocks()) {
  return LOCKABLE_OPTION_DEFINITIONS
    .filter((option) => locks[option.id])
    .map((option) => option.id);
}

function lockableOption(id, label, configKeys, elementKeys = configKeys) {
  return Object.freeze({
    id,
    label,
    configKeys: Object.freeze(configKeys),
    elementKeys: Object.freeze(elementKeys),
  });
}

function isLockedValue(value) {
  return value === true || value === "true" || value === "premium" || value === "locked";
}
