export const LOCALES = {
  en: {
    allow: /^(Allow|Approve|Yes)$/i,
    deny: /^(Deny|Reject|No)$/i,
    stop: "button.stopGenerationButton"
  },
  ro: {
    allow: /^(Permite|Allow|Approve|Aprobă|Da)$/i,
    deny: /^(Refuză|Deny|Reject|Nu)$/i,
    stop: "button.stopGenerationButton"
  }
};

export function localePack(name = "ro") {
  return LOCALES[name] || LOCALES.ro;
}
