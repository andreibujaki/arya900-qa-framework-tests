/** @typedef {'blocker'|'soft'} Severity */
/** @typedef {'pass'|'fail'|'soft_fail'|'skip'|'error'|'quarantine'} ResultStatus */
/** @typedef {'tools-only'|'tools+route'|'tools+route+skill'} GoldenScope */
/** @typedef {'light'|'aggressive'} ChaosProfile */

/**
 * @typedef {object} TurnCapture
 * @property {string} [at]
 * @property {string} [prompt]
 * @property {string} [lastModel]
 * @property {number} [lastModelLen]
 * @property {string[]} [activityItems]
 * @property {number} [elapsedMs]
 * @property {boolean} [deniedClick]
 * @property {boolean} [stopped]
 * @property {boolean} [taDisabled]
 * @property {boolean} [fileExists]
 * @property {string} [writeName]
 * @property {string} [routeBand]
 * @property {Record<string, unknown>} [extra]
 */

/**
 * @typedef {object} OracleSpec
 * @property {string} oracle
 * @property {string} [pattern]
 * @property {string} [path]
 * @property {string} [band]
 * @property {string} [tool]
 * @property {number} [min]
 * @property {boolean} [required]
 */

/**
 * @typedef {object} CaseDefinition
 * @property {string} id
 * @property {string} [title]
 * @property {string} [prompt]
 * @property {string} [kind]
 * @property {string} [capture]
 * @property {string[]} [tags]
 * @property {Severity} [severity]
 * @property {string} [requirementId]
 * @property {'high'|'med'|'low'} [risk]
 * @property {string[]} [requires]
 * @property {string} [fixturePack]
 * @property {number} [timeoutMs]
 * @property {string[]} [dependsOn]
 * @property {Record<string, unknown>[]} [matrix]
 * @property {OracleSpec[]} [expect]
 * @property {{ allOf?: OracleSpec[], anyOf?: OracleSpec[] }} [expectGroups]
 * @property {string[]} [invariants]
 * @property {{ path?: string, scope?: GoldenScope }} [golden]
 * @property {{ profile?: ChaosProfile, seed?: number, denyRandom?: number, abortAfterMs?: number, cdpDelayMs?: number }} [chaos]
 * @property {number} [retries]
 * @property {boolean} [knownFlaky]
 * @property {{ onFail?: string[] }} [artifacts]
 * @property {string} [locale]
 * @property {'deleteCreatedFiles'|'none'} [cleanup]
 * @property {boolean} [differential]
 */

/**
 * @typedef {object} CaseResult
 * @property {string} id
 * @property {string} [prompt]
 * @property {ResultStatus} status
 * @property {string[]} notes
 * @property {number} [elapsedMs]
 * @property {string} [requirementId]
 * @property {string} [risk]
 * @property {boolean} [quarantine]
 * @property {TurnCapture} [capture]
 */

/**
 * @typedef {object} AdapterContext
 * @property {import('./config.mjs').RuntimeConfig} config
 * @property {Record<string, boolean>} caps
 * @property {string} projectRoot
 * @property {TurnCapture} [capture]
 */

/**
 * @typedef {object} Adapter
 * @property {string} name
 * @property {string} version
 * @property {(cfg: import('./config.mjs').RuntimeConfig) => Promise<Record<string, boolean>>} probeCapabilities
 * @property {(ctx: AdapterContext, c: CaseDefinition) => Promise<TurnCapture>} runCase
 */

export {};
