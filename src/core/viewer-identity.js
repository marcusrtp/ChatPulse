const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function normalizeViewerIdentity(input = {}) {
  const displayName = sanitizeDisplayName(input.displayName ?? input.author ?? input.login);
  const login = sanitizeLogin(input.login || displayName);

  return {
    userId: sanitizeUserId(input.userId),
    login,
    displayName,
    color: sanitizeColor(input.color),
    badges: sanitizeBadges(input.badges),
  };
}

export function viewerHistoryKey(identity = {}) {
  const normalized = normalizeViewerIdentity(identity);
  if (normalized.userId) return `id:${normalized.userId}`;
  if (normalized.login) return `login:${normalized.login}`;
  return `display:${normalized.displayName.toLowerCase()}`;
}

function sanitizeUserId(value) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
}

function sanitizeLogin(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 80);
}

function sanitizeDisplayName(value) {
  const safeName = String(value ?? "Viewer")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return safeName || "Viewer";
}

function sanitizeColor(value) {
  const color = String(value ?? "").trim().toLowerCase();
  return COLOR_PATTERN.test(color) ? color : "";
}

function sanitizeBadges(badges) {
  if (!Array.isArray(badges)) return [];

  return badges.slice(0, 8).map((badge) => {
    if (typeof badge === "string") return badge.slice(0, 40);
    return badge && typeof badge === "object" ? { ...badge } : "";
  }).filter(Boolean);
}
