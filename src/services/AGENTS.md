# services/ — Local data and model services

## Purpose

Own LM Studio requests, prompt construction, evidence-based memory transformations, built-in cards, and LocalStorage persistence. App.jsx coordinates requests and passes service results/callbacks to UI components.

## Ownership

- Owner: Mark.
- `lmStudioClient.js`: native streaming chat with OpenAI-compatible fallback, validated character generation/rewrites, quoted-card extraction, chronological memory synthesis, user profile auto-fill, and system prompt fingerprint cache for regenerations. Background tasks use fixed right-sized `maxTokens` caps (synthesis 1400, extraction 800, auto-fill 600) independent of user chat settings.
- `promptService.js`: shared dialogue/design rules (condensed), character template, output schemas, continuity rules, and the actual chat/Brain preview prompt builder.
- `pipelineEngine.js`: SceneStateManager, TokenBudgetManager (adaptive budget allocation), MemoryConflictEngine, HybridLoreRetriever, ModelAdapter, and StructuredPromptCompiler (merged behavior+continuity section).
- `brainService.js`: version 3 brain model, migration normalization, evidence fingerprints, invalidation, relevance selection (with fast-path early return), transcript chunking (10,000 chars / 20 messages), and correction application. No persistence or request scheduling.
- `storageService.js`: all browser storage access, image offloading coordination, quota recovery, and legacy import migration.
- `imageStorage.js`: native IndexedDB object store (`loreforge_media_db`) for offloading heavy Base64 chat image attachments with an in-memory fallback for non-browser/testing environments.
- `defaultCharacters.js`: Laura/Esther presets and exact old field snapshots used solely to upgrade untouched defaults.

## Local Contracts

- Stay local. Default server URL is `/lmstudio-proxy`; App supplies settings to the client.
- Preserve native `/api/v1/chat` SSE and `/v1/chat/completions` fallback. Native requests use `store: false`; preserve sampling/vision support.
- Generation tries JSON schema output, then validates a JSON fallback with the same validator. Abort never triggers another request. A bad result must not partially replace existing data. Character generation prompts enforce distinct character naming and advise using `{{user}}` for modularity.
- Chat and preview call the same builder, dynamically resolving `{{user}}` and `{{char}}` macros across character narrative fields and lorebook before prompt assembly. Character-specific directives and personality remain authored facts; opening mood/location can evolve. Mature themes are permission, not mandatory escalation.
- Initial brains contain authored context and an empty user profile, not invented preferences or experiences. Optional AI backstory extraction must quote a real card field verbatim.
- Version 3 separates `characterContext` from manually specified `userProfile` and evidence-backed `memories`. Memories carry provenance, subject, kind, confidence, status and evidence references.
- Statuses: `established`, `tentative`, `superseded`, `needs_review`. Only established/tentative entries with confidence >= 0.6 and manual authority or source references are selected; tentative impressions are labeled. Confidence is never inflated.
- Summaries carry `sourceFingerprint` and status. Changed/deleted evidence or changed card/persona context requires review. Never select stale summaries.
- Learning processes changed sessions oldest first, in chunks of at most 8,000 content characters / 16 message pieces. Long messages are split without dropping their tails. Each chunk receives a rolling summary.
- `userProfile` remains a manual override; machine observations live in the memory bank. Preserve manual memories during synthesis. Deletion signatures prevent automatic recreation of deleted entries.
- No keyword-based genre guessing or maternal-profile resets. Ownership is per character ID. `repliesSinceLearning` persists the eight-reply cadence; missing or invalid counters normalize to zero.
- Persistent key `loreforge_brains_by_char_v3` replaces v2 for active data. Leave `loreforge_brains_by_char_v2` and `loreforge_brain_v1` untouched as recovery originals. Legacy profiles/memories/summaries remain reviewable; do not inject them as verified facts.
- Update only known unchanged default card fields during migration. Preserve custom cards and old presets; never purge them on load.
- No React imports in services. Existing browser-download helpers remain in storageService; other service logic is DOM-independent.

## Work Guidance

- All storage keys belong in storageService. Core keys retain their existing versions: characters, sessions, settings, user persona and lorebook remain v1; brains are v3.
- State and learning request ownership stay in App.jsx. Services return a new result and must not mutate a supplied brain.
- Add no runtime packages or test framework. A model's quoted evidence establishes attribution, not guaranteed semantic correctness; retain review controls.

## Verification

- `npm run lint` (zero errors required).
- `node scripts/verify-coherence.mjs` (offline, mocked model responses and in-memory storage).
- Smoke-test streaming, cancellation, generation, imports, and Brain preview against the dev server. If LM Studio is available, check distinct voices, corrections, and emotional recovery.

## Child DOX Index

No sub-folders.
