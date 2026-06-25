export const COMPONENT_LABELS = Object.freeze({
  twitch: "Twitch",
  overlay: "Overlay",
  obs: "OBS",
  demo: "Démo",
});

export const STATUS_LABELS = Object.freeze({
  idle: "En attente",
  ok: "OK",
  warning: "Attention",
  error: "Erreur",
});

export function createDiagnosticsView({
  statusTitle,
  statusGrid,
  eventLog,
  documentRef = globalThis.document,
  componentLabels = COMPONENT_LABELS,
  statusLabels = STATUS_LABELS,
}) {
  return {
    render(snapshot) {
      statusTitle.textContent = snapshot.overall.message;
      statusGrid.replaceChildren(
        ...snapshot.components.map((component) => renderStatusCard(component, { documentRef, componentLabels, statusLabels })),
      );
      eventLog.replaceChildren(
        ...snapshot.events.map((event) => renderEvent(event, { documentRef, componentLabels })),
      );
    },
  };
}

export function renderStatusCard(component, {
  documentRef = globalThis.document,
  componentLabels = COMPONENT_LABELS,
  statusLabels = STATUS_LABELS,
} = {}) {
  const card = documentRef.createElement("article");
  card.className = `status-card status-${component.status}`;
  const name = documentRef.createElement("span");
  const status = documentRef.createElement("strong");
  const message = documentRef.createElement("p");

  name.textContent = componentLabels[component.name] ?? component.name;
  status.textContent = statusLabels[component.status] ?? component.status;
  message.textContent = component.message;
  card.append(name, status, message);
  return card;
}

export function renderEvent(event, {
  documentRef = globalThis.document,
  componentLabels = COMPONENT_LABELS,
} = {}) {
  const item = documentRef.createElement("li");
  item.className = `event-${event.level}`;
  const time = new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const timeElement = documentRef.createElement("span");
  const component = documentRef.createElement("strong");
  const message = documentRef.createElement("p");

  timeElement.textContent = time;
  component.textContent = componentLabels[event.component] ?? event.component;
  message.textContent = event.message;
  item.append(timeElement, component, message);
  return item;
}
