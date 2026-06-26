export const LIVE_STATE_ENDPOINT = "/api/live-state";
export const LIVE_CONFIG_ENDPOINT = "/api/live-config";
export const LIVE_COMMAND_ENDPOINT = "/api/live-command";
export const OVERLAY_HEARTBEAT_ENDPOINT = "/api/overlay-heartbeat";
export const COMMAND_ACK_ENDPOINT = "/api/command-ack";

export function publishLiveConfigHttp(liveConfig, options = {}) {
  return postLiveJson(LIVE_CONFIG_ENDPOINT, liveConfig, options);
}

export function publishLiveCommandHttp(command, options = {}) {
  return postLiveJson(LIVE_COMMAND_ENDPOINT, command, options);
}

export function publishOverlayHeartbeatHttp(heartbeat, options = {}) {
  return postLiveJson(OVERLAY_HEARTBEAT_ENDPOINT, heartbeat, options);
}

export function publishCommandAckHttp(ack, options = {}) {
  return postLiveJson(COMMAND_ACK_ENDPOINT, ack, options);
}

export async function readLiveStateHttp(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;

  try {
    const response = await fetchImpl(LIVE_STATE_ENDPOINT, {
      method: "GET",
      cache: "no-store",
    });
    if (!response?.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function createLiveStatePoller(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const windowRef = options.windowRef ?? globalThis.window;
  const intervalMs = Math.max(250, Number(options.intervalMs ?? 500));
  const ignoreCommandsBefore = Number(options.ignoreCommandsBefore ?? 0);
  const onLiveConfig = options.onLiveConfig ?? (() => {});
  const onLiveCommand = options.onLiveCommand ?? (() => {});
  let lastConfigUpdatedAt = Number(options.lastConfigUpdatedAt ?? 0);
  let lastCommandId = String(options.lastCommandId ?? "");
  let stopped = false;
  let timer = null;

  async function poll() {
    const state = await readLiveStateHttp({ fetchImpl });
    if (!state) return null;

    const configUpdatedAt = Number(state.liveConfig?.updatedAt ?? 0);
    if (configUpdatedAt > lastConfigUpdatedAt) {
      lastConfigUpdatedAt = configUpdatedAt;
      onLiveConfig(state.liveConfig);
    }

    const command = state.liveCommand;
    const commandId = String(command?.id ?? "");
    const commandCreatedAt = Number(command?.createdAt ?? 0);
    if (command?.type && commandId && commandId !== lastCommandId && commandCreatedAt >= ignoreCommandsBefore) {
      lastCommandId = commandId;
      onLiveCommand(command);
    }

    return state;
  }

  function start() {
    if (typeof fetchImpl !== "function" || stopped) return () => {};

    poll();
    timer = windowRef?.setInterval?.(poll, intervalMs) ?? null;
    return stop;
  }

  function stop() {
    stopped = true;
    if (timer && typeof windowRef?.clearInterval === "function") {
      windowRef.clearInterval(timer);
    }
  }

  return { poll, start, stop };
}

async function postLiveJson(url, payload, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") return null;

  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    });
    if (!response?.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
