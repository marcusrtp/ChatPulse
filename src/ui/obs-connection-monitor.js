import { writeLiveCommand } from "../core/live-command.js";
import {
  COMMAND_ACK_STORAGE_KEY,
  OVERLAY_HEARTBEAT_STORAGE_KEY,
  createOverlayConfigHash,
  isOverlayHeartbeatFresh,
  readCommandAck,
  readOverlayHeartbeat,
} from "../core/live-status.js";

export function createObsConnectionMonitor({
  diagnostics,
  getExpectedConfig,
  renderDiagnostics,
  storage = globalThis.localStorage,
  windowRef = globalThis.window,
}) {
  let pendingLiveCommandId = "";
  let lastObsConnectionMessage = "";

  function start() {
    updateObsConnectionStatus();
    windowRef?.setInterval?.(updateObsConnectionStatus, 2500);
    windowRef?.addEventListener?.("storage", (event) => {
      if (event.key === OVERLAY_HEARTBEAT_STORAGE_KEY || event.key === COMMAND_ACK_STORAGE_KEY) {
        updateObsConnectionStatus();
      }
    });
  }

  function sendLiveCommand(type, payload = {}) {
    const command = writeLiveCommand(storage, { type, payload });
    pendingLiveCommandId = command.id;
    markObsConnection("warning", "Commande envoyée à OBS. En attente de confirmation.");
    renderDiagnostics();
    return command;
  }

  function updateObsConnectionStatus() {
    const heartbeat = readOverlayHeartbeat(storage);
    const ack = readCommandAck(storage);
    const isConnected = isOverlayHeartbeatFresh(heartbeat);
    const expectedConfigHash = createOverlayConfigHash(getExpectedConfig());
    const hasDifferentConfig = isConnected && heartbeat.configHash && heartbeat.configHash !== expectedConfigHash;

    if (pendingLiveCommandId && ack.commandId === pendingLiveCommandId) {
      pendingLiveCommandId = "";
      markObsConnection(
        ack.status === "ok" ? "info" : "warning",
        ack.status === "ok" ? "OBS connecté. Dernière commande confirmée." : ack.message || "OBS a refusé la dernière commande.",
      );
      renderDiagnostics();
      return;
    }

    if (hasDifferentConfig) {
      markObsConnection("warning", "Réglages OBS différents. Recharge ou attends la synchronisation.");
      renderDiagnostics();
      return;
    }

    markObsConnection(
      isConnected ? "info" : "warning",
      isConnected
        ? `OBS connecté : ${heartbeat.visible} visible(s), ${heartbeat.pending} en attente.`
        : "OBS non confirmé. Ouvre ou rafraîchis l'URL OBS.",
    );
    renderDiagnostics();
  }

  function markObsConnection(level, message) {
    if (message === lastObsConnectionMessage && diagnostics.snapshot().obs?.message === message) return;

    lastObsConnectionMessage = message;
    if (level === "info") {
      diagnostics.info("obs", message);
    } else {
      diagnostics.warn("obs", message);
    }
  }

  return { start, sendLiveCommand, updateObsConnectionStatus };
}
