import { LOCKABLE_OPTION_DEFINITIONS, normalizeOptionLocks } from "../core/option-access.js";

export function createPremiumLockController(options = {}) {
  const documentRef = options.documentRef ?? globalThis.document;
  const elements = options.elements ?? {};
  const optionDefinitions = options.optionDefinitions ?? LOCKABLE_OPTION_DEFINITIONS;
  let optionLocks = normalizeOptionLocks(options.optionLocks);

  function apply(nextLocks = optionLocks) {
    optionLocks = normalizeOptionLocks(nextLocks);

    for (const option of optionDefinitions) {
      const locked = Boolean(optionLocks[option.id]);
      for (const elementKey of option.elementKeys) {
        applyElementLock(elements[elementKey], option.id, locked);
      }
    }
  }

  function applyElementLock(element, optionId, locked) {
    if (!element) return;

    element.disabled = locked;
    element.setAttribute("aria-disabled", locked ? "true" : "false");

    const wrapper = element.closest?.(".field-block, .toggle-row, label");
    if (!wrapper) return;

    wrapper.classList.toggle("premium-locked", locked);
    if (locked) {
      wrapper.dataset.premiumOption = optionId;
      ensurePremiumBadge(wrapper);
      return;
    }

    delete wrapper.dataset.premiumOption;
    removePremiumBadge(wrapper);
  }

  function ensurePremiumBadge(wrapper) {
    if (wrapper.querySelector?.(".premium-lock-badge")) return;

    const badge = documentRef.createElement("span");
    badge.className = "premium-lock-badge";
    badge.textContent = "Premium";
    wrapper.append(badge);
  }

  function removePremiumBadge(wrapper) {
    const badge = wrapper.querySelector?.(".premium-lock-badge");
    if (!badge) return;
    if (typeof badge.remove === "function") {
      badge.remove();
      return;
    }
    wrapper.children = wrapper.children?.filter?.((child) => child !== badge) ?? wrapper.children;
  }

  return { apply };
}
