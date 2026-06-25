export const PREVIEW_CAPACITY = Object.freeze({
  minimumMessages: 1,
  minimumHeightPx: 160,
  growthPerMessagePx: 25,
  maximumHeightPx: 720,
  fallbackMessages: 12,
});

export function previewHeightForCapacity(maxMessages, options = PREVIEW_CAPACITY) {
  const normalized = Number(maxMessages);
  const messageCount = Number.isFinite(normalized) ? normalized : options.fallbackMessages;
  const extraMessages = Math.max(0, messageCount - options.minimumMessages);
  const height = options.minimumHeightPx + extraMessages * options.growthPerMessagePx;

  return Math.round(Math.min(options.maximumHeightPx, height));
}
