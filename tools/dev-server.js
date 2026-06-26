import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_LIVE_CONFIG, normalizeLiveConfig } from "../src/core/live-config.js";
import { normalizeLiveCommand } from "../src/core/live-command.js";
import { normalizeCommandAck, normalizeOverlayHeartbeat } from "../src/core/live-status.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT ?? 8080);
const host = "127.0.0.1";
const liveState = {
  liveConfig: DEFAULT_LIVE_CONFIG,
  liveCommand: normalizeLiveCommand(),
  overlayHeartbeat: normalizeOverlayHeartbeat(),
  commandAck: normalizeCommandAck(),
};
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApiRequest(request, response, url);
      return;
    }

    const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = normalize(join(root, requestPath));

    if (!filePath.startsWith(root)) {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": mimeTypes.get(extname(filePath)) ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

async function handleApiRequest(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/live-state") {
    writeJson(response, 200, liveState);
    return;
  }

  if (request.method !== "POST") {
    writeJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJsonBody(request);
  if (url.pathname === "/api/live-config") {
    liveState.liveConfig = normalizeLiveConfig(body);
    writeJson(response, 200, liveState.liveConfig);
    return;
  }

  if (url.pathname === "/api/live-command") {
    liveState.liveCommand = normalizeLiveCommand(body);
    writeJson(response, 200, liveState.liveCommand);
    return;
  }

  if (url.pathname === "/api/overlay-heartbeat") {
    liveState.overlayHeartbeat = normalizeOverlayHeartbeat(body);
    writeJson(response, 200, liveState.overlayHeartbeat);
    return;
  }

  if (url.pathname === "/api/command-ack") {
    liveState.commandAck = normalizeCommandAck(body);
    writeJson(response, 200, liveState.commandAck);
    return;
  }

  writeJson(response, 404, { error: "Not found" });
}

async function readJsonBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 65536) throw new Error("Payload too large");
  }

  return raw ? JSON.parse(raw) : {};
}

function writeJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

server.listen(port, host, () => {
  console.log(`ChatPulse running at http://${host}:${port}/`);
});

