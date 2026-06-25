const STATUS_WEIGHT = {
  idle: 0,
  ok: 1,
  warning: 2,
  error: 3,
};

const DEFAULT_COMPONENTS = ["twitch", "overlay", "obs", "demo"];

export function createDiagnostics(options = {}) {
  const now = options.now ?? (() => Date.now());
  const maxEvents = options.maxEvents ?? 40;
  const components = new Map();
  const events = [];

  for (const name of DEFAULT_COMPONENTS) {
    components.set(name, {
      name,
      status: name === "demo" ? "ok" : "idle",
      message: name === "demo" ? "Mode démo disponible" : "En attente",
      updatedAt: now(),
    });
  }

  function setStatus(component, level, message) {
    const record = {
      name: component,
      status: level,
      message,
      updatedAt: now(),
    };
    components.set(component, record);
    events.unshift({ component, level, message, timestamp: record.updatedAt });
    events.splice(maxEvents);
    return record;
  }

  function info(component, message) {
    return setStatus(component, "ok", message);
  }

  function warn(component, message) {
    return setStatus(component, "warning", message);
  }

  function error(component, message) {
    return setStatus(component, "error", message);
  }

  function snapshot() {
    const componentList = [...components.values()];
    const highest = componentList.reduce((current, component) => {
      return STATUS_WEIGHT[component.status] > STATUS_WEIGHT[current] ? component.status : current;
    }, "idle");

    return {
      overall: {
        status: highest === "idle" ? "warning" : highest,
        message: overallMessage(highest),
        updatedAt: now(),
      },
      twitch: components.get("twitch"),
      overlay: components.get("overlay"),
      obs: components.get("obs"),
      demo: components.get("demo"),
      components: componentList,
      events: [...events],
    };
  }

  return { info, warn, error, snapshot };
}

function overallMessage(status) {
  if (status === "error") return "Action requise avant le live";
  if (status === "warning" || status === "idle") return "Vérification recommandée avant le live";
  return "Prêt pour le live";
}
