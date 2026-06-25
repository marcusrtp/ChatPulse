export function formatOverlayUrl(overlayUrl) {
  const url = new URL(overlayUrl);
  const channel = url.searchParams.get("channel") || "non definie";
  const count = url.searchParams.size;
  return `${url.pathname.split("/").pop()} - chaine ${channel} - ${count} reglage${count > 1 ? "s" : ""}`;
}
