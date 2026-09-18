# Change log

## 2026-09-18 — Repository initialization and user chat privacy protection for GitHub

- Initialized Git repository on `main` branch.
- Hardened `.gitignore` to strictly exclude all user chat data, session transcripts (`*_transcript.md`, `*transcript*`), exported character cards (`*_card.json`), local storage dumps, session logs, database files, and environment/secret files (`.env*`).
- Verified zero user chat data, transcripts, or personal credentials exist in tracked/staged project files.

## 2026-09-18 — Real-time memory & token overview bar at bottom of main chat window

- Added `TokenOverviewBar` component rendered at the bottom of the main chat window (`ChatArea.jsx`), matching the obsidian glassmorphism aesthetic.
- Displays persistent real-time token metrics: subconscious memory tokens (active in prompt vs total in bank), session summary tokens, active lorebook tokens, and current chat conversation history tokens.
- Dynamic context budget gauge with color gradient (normal, warning, critical) showing total input tokens vs available context headroom and output reserve.
- Displays brain learning cadence (`X/8 replies until auto-synthesis`) and brain revision.
- Added interactive expandable diagnostics drawer with tabs for:
  - "Context & Budgets": 4 diagnostic metric cards and visual stacked context breakdown bar (System, Memory, Lore, Chat, Headroom, Reserve).
  - "Memory Bank": list of all subconscious memories with category badges, confidence ratings, token counts, and prompt injection status.
  - "Prompt Sections": compiled prompt sections with token counts and percentage share of context.
  - Direct quick actions to open the Brain Data Bank and Lorebook modals.
- Files: `src/components/TokenOverviewBar.jsx`, `src/components/ChatArea.jsx`, `src/App.jsx`, `src/index.css`, `src/components/AGENTS.md`, and this log.
- Verification: 39 coherence tests passed; `npm run lint` passed with 0 errors.

## 2026-09-18 — LLM request optimization: token reduction, speed, and efficiency

- Halved background task token budgets: brain synthesis `maxTokens` 2800→1400, initial extraction 1200→800, user profile auto-fill 1200→600, character generation 3000→2000, field optimization 1400→800. Actual outputs are well within these caps.
- Trimmed all background task input payloads: compact card context (identity fields only, truncated), candidate memory content capped at 400 chars, chunk message content capped at 600 chars, user persona reduced to name+bio, memory snippets 25→15, user messages 15→10.
- Condensed `HUMAN_DIALOGUE_RULES` by ~40% while preserving all behavioral instructions. Merged `CONTINUITY_RULES` into a compact single export.
- Merged `behavior_rules` and `continuity_precedence` into a single prompt section, saving XML tag overhead and removing repeated concepts.
- Made `TokenBudgetManager.allocateBudgets()` adaptive: redistributes empty section budgets (no summaries, no lore) to memories and conversation history. Added minimum context guard with observability warning.
- Added system prompt fingerprint cache in `streamChat()` to skip rebuilding identical prompts on regenerations.
- Increased `sessionChunks` sizing (8000→10000 chars, 16→20 messages) to reduce LLM call count by ~25% per synthesis.
- Added early-return fast path in `selectMemories` when all eligible memories fit within the limit.
- Files: `src/services/lmStudioClient.js`, `src/services/promptService.js`, `src/services/pipelineEngine.js`, `src/services/brainService.js`, `docs/CHANGELOG.md`, `docs/DECISIONS.md`, `src/services/AGENTS.md`.
- Verification: 39 coherence checks passed; `npm run lint` passed with zero errors and 13 pre-existing warnings.

## 2026-09-18 — Intelligent prompt, context, scene state & memory pipeline upgrade

- Implemented comprehensive context pipeline: `SceneStateManager`, `TokenBudgetManager`, `MemoryConflictEngine`, `HybridLoreRetriever`, `ModelAdapter`, and `StructuredPromptCompiler` in `src/services/pipelineEngine.js`.
- Strict prompt precedence enforced: `current user message > recent corrections > scene state > confirmed memory > scenario > user profile > character assumptions > lore > old summaries`.
- Upgraded memory structure with `type`, `importance`, `createdAt`, `updatedAt`, and `supersedes` while ensuring 100% backward compatibility with legacy v1/v2/v3 memories.
- Automated contradiction handling detects outdated memories (location, preferences, relationship transitions) and supersedes them automatically.
- Smarter memory retrieval calculates weighted score (`relevance * 3.5 + confidence * 1.5 + importance * 2.0 + recencyBoost`) and filters low-relevance items under scale.
- Hybrid lore retrieval combines comma-separated keyword triggers, regex, and semantic n-gram overlap with strict token limit bounding and deduplication.
- Transient scene state tracks location, participants, objects, and unresolved threads separately from static scenarios and updates across chat turns.
- Strict token budget manager protects generation reserve (`maxTokens`) and safety margin, trimming low-priority context (distant summaries, low-ranked lore/memory) before critical identity and rules.
- ModelAdapter supports native role-based chat messages, LM Studio native `/api/v1/chat`, and legacy transcripts with safe logging that sanitizes large base64 image strings.
- Files: `src/services/pipelineEngine.js`, `src/services/promptService.js`, `src/services/brainService.js`, `src/services/lmStudioClient.js`, `src/components/BrainModal.jsx`, `src/App.jsx`, `scripts/verify-coherence.mjs`, `docs/PROJECT_MAP.md`, `docs/DECISIONS.md`, and this log.
- Verification: 39 offline regression assertions in `scripts/verify-coherence.mjs` passed; `npm run lint` passed with zero errors.

## 2026-09-18 — Modular macro system ({{USER}} & {{CHAR}}) and character generator disambiguation

- Introduced modular `{{user}}` and `{{char}}` macro replacement (case-insensitive) across character cards, prompt construction, greetings, blueprints, and message display.
- Prevented AI Character Architect & Auto-Filler from latching onto the conversation partner's name when creating new character cards: prompts now instruct the model on the distinct conversation partner and separate character naming rules, and character creation blueprints use `{{user}}`.
- Rebalanced `HUMAN_DIALOGUE_RULES` in `promptService.js` to encourage active two-way reciprocal conversation and natural follow-up/closing questions rather than purely passive responses.
- Added "Auto-Fill Profile with AI" feature to `BrainModal.jsx` and `lmStudioClient.js`, allowing users to synthesize their roleplay summary, formatting style, traits, likes, and dislikes directly from conversation memory and recent turns, and defaulted the Brain modal to the Memory Bank tab when memories exist.
- Files: `src/utils/macroUtils.js`, `src/services/promptService.js`, `src/services/lmStudioClient.js`, `src/components/CharacterModal.jsx`, `src/components/BrainModal.jsx`, `src/components/MessageItem.jsx`, `src/App.jsx`, `scripts/verify-coherence.mjs`, `src/utils/AGENTS.md`, `src/services/AGENTS.md`, `src/components/AGENTS.md`, `docs/DECISIONS.md`, and this log.
- Verification: 28 offline regression checks passed in `scripts/verify-coherence.mjs`; `npm run lint` passed with zero errors.
- DOX: Updated utility, service, and component contracts and decision logs.

## 2026-09-18 — Batch automatic learning every eight replies

- Changed automatic model analysis to initialize new characters and then run after eight completed nonempty replies per character, reducing interruptions between chat turns. Regeneration and continuation count; failed/empty replies do not. Manual synthesis remains available.
- Persisted `repliesSinceLearning` in each brain. Successful conversation synthesis resets it; failures, cancellation and authored-backstory extraction preserve it. Existing brains start counting from zero. Source edits still invalidate evidence but defer inference until the next batch or manual synthesis.
- Files: `src/App.jsx`, `src/services/brainService.js`, `src/components/BrainModal.jsx`, `scripts/verify-coherence.mjs`, `README.md`, source/service/component `AGENTS.md`, `docs/DECISIONS.md`, and this log.
- Verification: 24 dependency-free assertions passed; lint has zero errors and eight existing effect warnings. Isolated desktop Edge with mocked LM Studio verified creation extraction, no analysis before reply eight, reload continuity, eighth-reply synthesis and the ninth-reply counter. No production build.
- Limitations: learning may still take time at each batch; foreground requests retain priority. Manual synthesis can update sooner. No additional follow-up is required.
- DOX: updated cadence contracts and UI help. Root, script and utility contracts and child indexes remain applicable without changes.

## 2026-09-18 — README and DOX synchronization

### What changed and why

Replaced outdated README instructions with the implemented character, persona and brain v3 workflows. Corrected the Node requirement, storage key versions, chapter continuity, privacy boundaries and proxy setup. Removed unsupported guarantees about model output and the unverified license declaration; no license was introduced or changed.

### Files touched

`README.md`, root `AGENTS.md`, `src/AGENTS.md`, `src/components/AGENTS.md`, `docs/AGENTS.md`, and `docs/CHANGELOG.md`.

### New behavior

No application behavior changed. Agent contracts now accurately distinguish application state from local form state, allow existing explicit JSON exports, document regression and desktop verification, and use the actual purple `--primary` token. The protected DOX framework rules remain unchanged.

### Verification

Checked setup requirements against installed Vite metadata, commands against package.json, storage keys and UI labels against source, and local Markdown links/Child DOX Index targets. No production bundle or runtime tests were needed for documentation-only edits.

### Known issues and follow-ups

Model-dependent limitations remain as recorded below. No standalone LICENSE file is present; an explicit owner decision is needed before declaring a license. Keep user-facing workflows in README and operational contracts in the nearest AGENTS.md.

### DOX closeout

Source/service, script and utility boundaries are unchanged. `src/services/AGENTS.md`, `scripts/AGENTS.md`, `src/utils/AGENTS.md`, `docs/PROJECT_MAP.md` and `docs/DECISIONS.md` remain unchanged because their existing contracts and descriptions still apply. Child indexes retain the same valid targets.

## 2026-09-18 — Character coherence and evidence-based memory

### What changed and why

- Centralized character/chat instructions and prompt preview to remove conflicting identity, emotional-intensity and generic voice rules. Characters may be affectionate, reserved, formal, witty or expressive according to their own card.
- Separated enduring personality, opening situation, authored relationships, manual user information and observed memories. New brains no longer fabricate user traits or shared history.
- Added persona-aware generation/templates, whole-card rewriting in one request, full context for field polish, and validation on structured/fallback outputs. Token-truncated field output cannot replace existing text. Custom categories remain visible in the editor.
- Corrected Laura/Esther's ambiguous speaker text and greetings, upgrading only exact unchanged preset fields. Removed destructive legacy-character purges during storage loading.
- Introduced brain v3 provenance, evidence references, source fingerprints and established/tentative/superseded/needs-review states. Low confidence is preserved. Explicit corrections can supersede older learned claims; manual entries remain protected.
- Preserved v1/v2 storage as recovery originals and retained legacy payloads/entries for review. Unsupported legacy information is not injected as fact. Keyword-based genre/personality guessing and maternal-profile resets were removed.
- Implemented serial, two-second idle Auto-Learn; foreground chat/generation/model operations take priority. Source snapshots reject stale asynchronous results. Session edits and later messages refresh summaries through chronological chunks; errors preserve the existing brain.
- Updated Brain review labels, confidence display and complete prompt preview. Scenario refresh preserves conversation history. Mobile-specific styling was removed at the user's request; desktop remains the target.

### Files touched

- Application orchestration: `src/App.jsx`.
- Services: `src/services/lmStudioClient.js`, `storageService.js`, `defaultCharacters.js`; new `promptService.js` and `brainService.js`.
- UI: `src/components/CharacterModal.jsx`, `BrainModal.jsx`, `src/index.css`.
- Verification: new `scripts/verify-coherence.mjs` and `scripts/AGENTS.md`.
- Documentation: root `AGENTS.md`, `src/AGENTS.md`, services/components `AGENTS.md`, `README.md`; new `docs/AGENTS.md`, `PROJECT_MAP.md`, `DECISIONS.md`, and this log.

### New behavior

- Existing unverified memories remain reviewable. Editing/confirming a memory establishes manual authority; deleting it records an exclusion so analysis cannot immediately recreate it.
- Auto-Learn resumes pending work when re-enabled or when foreground activity ends. Offline and failed learning show a status without resetting stored memory; Synthesize Brain retries failures.
- Initial AI backstory extraction accepts only verbatim card quotations. Learned memories cite transcript message IDs; tentative impressions are labeled and old scene details are historical context.
- Whole-card rewriting includes personality, scenario, greeting and system directives. Concurrent edits or closing the editor invalidate pending generated results.

### Verification

- `node scripts/verify-coherence.mjs`: 23 offline checks passed, including migration recovery, confidence, corrections, stale sources, full transcripts, failed/aborted requests, malformed imports, exact preview/transport parity and truncated-output rejection.
- `npm run lint`: zero errors; React effect synchronization warnings remain in existing modal/application patterns and the offline learning status effect.
- `npm run dev -- --host localhost`: Vite development server, no production build.
- Isolated desktop Edge/Playwright checks with mocked LM Studio: generation, whole-card rewrite, selected persona, auto-learning, exact prompt preview, message edits, regeneration, toggles/catch-up, foreground priority, reset during delayed synthesis, legacy import/export and failed-analysis data preservation. No browser runtime errors or Vite overlay. Test data was isolated from the user's browser storage.
- Live LM Studio (`google/gemma-4-e4b`): character generation, quote-grounded initial brain, native chat, five voice styles over three turns each, and evidence-backed synthesis of a corrected fact. Tests used fictional fixtures only.

### Known limitations

- Prompt rules and cited evidence do not guarantee semantic accuracy. The local model still sometimes repeats gestures, adds unsupported descriptive details, or recalls facts imperfectly in dialogue. The live synthesis check correctly retained a dog-to-cat correction with message references.
- Short reasoning-enabled output budgets produced incomplete/empty live replies. A separate native-chat run with reasoning off and 1,536 output tokens produced complete replies. Existing user sampling settings were not changed. Generation helpers honor larger configured output limits and reject finish-reason `length` results.
- Conservative card/persona invalidation may require reanalysis of otherwise valid derived memories. Legacy entries without corroborating evidence remain pending review, not automatically deleted.
- No new test framework, runtime dependency, production bundle, or mobile optimization was added.

### Follow-up

- Try existing favorite characters with the preferred local model; review legacy entries in the Brain and confirm only facts that should remain canonical.
- Use the full prompt preview to diagnose card-specific contradictions. Tune reasoning/output settings if replies are cut short.

### DOX closeout

Updated root, source, service and component contracts plus new documentation/script child indexes. `src/utils/AGENTS.md` is intentionally unchanged: no utility files or utility contracts changed.
