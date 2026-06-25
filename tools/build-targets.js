import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const expectedFiles = [
  "index.html",
  "overlay.html",
  "src/core/event-bus.js",
  "src/core/diagnostics.js",
  "src/core/config.js",
  "src/core/option-access.js",
  "src/core/live-command.js",
  "src/core/live-config.js",
  "src/core/live-status.js",
  "src/chat/demo-source.js",
  "src/chat/external-emotes.js",
  "src/chat/stress-fixtures.js",
  "src/twitch/eventsub-mapper.js",
  "src/twitch/eventsub-source.js",
  "src/twitch/chat-assets.js",
  "src/twitch/oauth.js",
  "src/twitch/preview-badges.js",
  "src/twitch/session-controller.js",
  "src/ui/chat-renderer.js",
  "src/ui/control-app.js",
  "src/ui/control-form.js",
  "src/ui/diagnostics-view.js",
  "src/ui/history-view.js",
  "src/ui/obs-connection-monitor.js",
  "src/ui/overlay-url-display.js",
  "src/ui/premium-locks.js",
  "src/ui/preview-capacity.js",
  "src/ui/rich-message-rendering.js",
  "src/ui/settings-presets.js",
  "src/ui/simulation-actions.js",
  "src/ui/twitch-visual-status-view.js",
  "src/ui/overlay-app.js",
  "styles/base.css",
  "styles/control.css",
  "styles/overlay.css",
  "tests/unit.test.js",
  "tests/moderation-audit.test.js",
  "tests/overlay-url-display.test.js",
  "tests/settings-presets.test.js",
  "tests/stress-fixtures.test.js",
  "tests/ui-views.test.js",
  "tests/external-emotes.test.js",
  "tests/twitch-eventsub-mapper.test.js",
  "tests/twitch-chat-assets.test.js",
  "tests/twitch-source.test.js",
  "tests/browser-smoke.js",
  "tools/build-targets.js",
  "tools/dev-server.js",
  "README.md",
];

for (const file of expectedFiles) {
  assert.equal(existsSync(join(root, file)), true, `${file} should exist`);
}

const incompleteMarkers = new RegExp(["TO" + "DO", "T" + "BD", "a compl" + "eter", "à compl" + "éter"].join("|"), "i");

for (const file of expectedFiles.filter((name) => name.endsWith(".js") || name.endsWith(".html") || name.endsWith(".css") || name.endsWith(".md"))) {
  const content = readFileSync(join(root, file), "utf8");
  assert.notEqual(content.charCodeAt(0), 0xfeff, `${file} should not start with a UTF-8 BOM`);
  assert.equal(incompleteMarkers.test(content), false, `${file} should not contain incomplete markers`);
}

const overlayHtml = readFileSync(join(root, "overlay.html"), "utf8");
assert.match(overlayHtml, /data-page="overlay"/);
assert.match(overlayHtml, /src="src\/ui\/overlay-app\.js"/);

const controlHtml = readFileSync(join(root, "index.html"), "utf8");
assert.match(controlHtml, /data-page="control"/);
assert.match(controlHtml, /id="overlay-url"/);
assert.match(controlHtml, /id="event-log"/);

const readme = readFileSync(join(root, "README.md"), "utf8");
assert.match(readme, /## Socle deja verifie/);
assert.match(readme, /URL OBS ne contient pas de token Twitch/);
assert.match(readme, /OAuth optionnel/);
assert.match(readme, /Handshake OBS/);
assert.match(readme, /configuration, URL OBS, moderation, EventSub, historique, diagnostic, handshake OBS et smoke HTML\/CSS/);

const roadmap = readFileSync(join(root, ".docs/roadmap.md"), "utf8");
assert.match(roadmap, /## Socle deja valide/);
assert.match(roadmap, /handshake OBS local/);
assert.match(roadmap, /fiabilite\/debug OBS/);

console.log("PASS build targets verified");

