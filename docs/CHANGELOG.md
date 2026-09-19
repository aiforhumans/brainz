# Change log

## 2026-09-19 — Workspace Inspector Mind, Lore & Context Data Population

- **Live Token Telemetry in Context Tab**:
  - Fixed property mismatch where `InspectorPanel.jsx` looked for non-existent `promptPipeline.metrics` instead of `promptPipeline.observability`, causing all context token numbers to report 0.
  - Implemented multi-segment visual token bar (System, Memories, Lore, Chat Turns, Free Headroom) with proportional segment widths and color-coded legend.
  - Added live telemetry boxes displaying System Directives, Active Memories, Lorebook Context, and Chat Turns with exact token counts, plus Context Window limit and Generation Reserve specifications.
- **Enriched Mind Tab with Partner Model & Learning Cadence**:
  - Integrated the Conversation Partner Model (Mindprint) displaying User Persona name, bio/summary, dialogue preferences, personality traits, and likes.
  - Added an Autonomous Learning progress bar tracking turns until next background synthesis (`repliesSinceLearning / 8` cadence).
  - Enhanced Subconscious Memory items with `In Prompt` context inclusion badges and confidence ratings, plus past Chapter Summaries when available.
- **Comprehensive Lore Tab with Encyclopedia & Active Status**:
  - Replaced raw keyword pills with a full World Lorebook Library list, showing each entry's title, keyword triggers, content snippet, and active/standby status.
  - Connected `activeLore` directly to the compiled prompt pipeline (`promptPipeline.selectedLore`), displaying triggered scene lore with keyword badges.
- **Verification**:
  - `npm run lint` passed with zero errors.
  - `node scripts/verify-coherence.mjs` passed 49/49 coherence checks.
  - Browser subagent smoke test confirmed live data populated across Mind, Lore, and Context tabs.

## 2026-09-19 — Ultrawide & Display Scaling Layout Fix

- **Root Cause Resolution for Scaling & Centering Disconnect**:
  - Identified missing `.chat-area` flexbox container rules in `src/index.css`, which previously caused `<main className="chat-area">` to default to `flex-grow: 0; display: block;` inside `.main-content`.
  - On wide and ultrawide screens (e.g. 3440x1440/1305), the unconstrained `.chat-area` previously clamped to content width (~960px on the left), pushing the Inspector inward and allowing the floating input dock to center relative to `.main-content` across the entire viewport, creating a severe horizontal misalignment.
- **Cohesive Centering & Scaling Across All Resolutions**:
  - Added `.chat-area` flexbox styling (`flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; min-width: 0; background: var(--bg-main);`).
  - Added `align-items: center; width: 100%;` to `.messages-container` so `.messages-stream` centers precisely within the full chat area.
  - Aligned `.messages-stream` and `.chat-floating-dock-wrap` on the identical vertical axis and maximum width (`920px`).
  - Anchored `.inspector-panel` cleanly to the right edge of the screen, with full flexbox distribution of the chat canvas between sidebar and inspector.
  - Adjusted `.jump-to-bottom-btn` sticky offset (`bottom: 96px`) to float neatly above the omni-dock.
  - Verified across both 3440x1305 ultrawide and 1920x1080 standard viewports.

## 2026-09-19 — UI De-Duplication and Information Architecture Cleanup

- **Clean Separation of Concerns across Panels**:
  - **Top Navbar (Pure System Bar)**: Removed duplicate Brain and Lorebook buttons. Focused strictly on Model selection, VRAM load/eject, LM Studio connection latency, User Persona, and Global Settings.
  - **Bento Inspector (Context Home)**: Dedicated as the single source of truth for character and narrative inspectables. Overview tab now includes the full Scenario & World Setting card with macro resolution (`{{user}}`, `{{char}}`), alongside Scene State and Character Studio shortcut.
- **Unified Chapter Dropdown (`📖 Chapter 1 ▾`)**:
  - Replaced horizontal chapter pills and detached `...` menu with a unified dropdown selector in the chat header.
  - Groups chapter switching, `+ New Chapter`, Restore Greeting, Export Transcript (.md), Clear Turn History, and Delete Chapter in one cohesive menu.
- **Pure Input Focus on Floating Omni-Dock**:
  - Removed duplicate `Continue` button next to Send (Continue lives exclusively on the latest assistant message bubble toolbar next to Steer, Reroll, Edit, Copy, Delete).
  - Removed bottom formatting hint tags and streaming indicator row; integrated roleplay syntax guide directly into the textarea placeholder.
  - Decoupled heavy `TokenOverviewBar` from the floating dock, slimming it down to a sleek, floating glass island with reduced scroll padding (`padding-bottom: 110px`).
- **Clean Sidebar Card Design & Dual Footer**:
  - Removed individual download/export buttons from character cards to eliminate visual clutter and accidental clicks (Export JSON remains easily accessible inside Character Studio).
  - Added clean dual footer actions: `+ New Character` (primary) and `Import JSON` (secondary with file upload).
- **Clean Chat Scroll Canvas**:
  - Removed the persistent `session-scenario-banner` above the chat messages so conversation threads start immediately with character greetings and roleplay turns.
- **Strict Verification**:
  - `npm run lint` passed with zero errors.
  - `node scripts/verify-coherence.mjs` passed 49/49 coherence checks.

## 2026-09-19 — UI Layout Modernization (inspired by ui-layouts): Unified Context Header, Bento Inspector, Mini Icon Dock & Floating Omni-Dock

- **Integrated Context Header with Inline Chapter Strip & Overflow Menu**:
  - Replaced the stacked character header and 42px separate session bar with a unified 62px header (`.chat-header-unified`), regaining ~45px of vertical message scroll space.
  - Interactive chapter carousel pills (`.chat-header-chapters`, `.chapter-pill`) allow switching and adding chapters (`+ New`) directly inside the header.
  - Tidy `...` overflow menu with outside-click dismissal houses "Restore Greeting", "Export Transcript (.md)", "Clear Turn History", and "Delete Chapter".
- **Collapsible Dual-State Sidebar (Expanded 280px / Collapsed 68px Mini Icon Dock)**:
  - Collapsed state transforms into a sleek 68px vertical icon dock (`.sidebar.collapsed`) displaying centered circular character avatars with glowing active indicators.
  - Hover tooltips (`.sidebar-avatar-tooltip`) display character name, category, and 18+ badge when collapsed.
  - Toggle via top navbar button or keyboard shortcut (`Ctrl+B`), with state persisted in LocalStorage (`loreforge_sidebar_collapsed_v1`).
- **Tabbed Bento Inspector (330px Collapsible Slide-Over Panel)**:
  - Collapsible side panel (`.inspector-panel`) accessible via header button or `Ctrl+I` / `Ctrl+/` shortcut.
  - 4 tabs:
    - **Overview**: Character summary card, active Scene State (location, participants, mood, time of day), quick action to open Character Studio.
    - **Mind**: Subconscious brain state, established & tentative memories count, auto-learn reply cadence tracker, and quick link to Memory Data Bank.
    - **Lore**: Active turn-triggered lorebook entries matched against recent conversation text with keyword highlight badges, and link to Lorebook manager.
    - **Context**: Real-time token budget breakdown (System, Memory, Lore, History, Generation Reserve, Headroom) with dynamic utilization bar.
- **Floating Omni-Dock & Telemetry Strip**:
  - Replaced flat bottom chat input with a floating glass omni-dock (`.chat-floating-dock-wrap`) hovering gracefully over the chat canvas.
  - Embedded telemetry pill button displaying live context tokens and load status that toggles the inspector or token drawer.
  - Added bottom padding (`padding-bottom: 160px`) to messages container ensuring message text and "Jump to latest" pill are never obscured.
- **Zero Inline Styles & Strict Verification**:
  - All styling added in `src/index.css` following the obsidian glassmorphism design system.
  - Added layout state persistence tests in `scripts/verify-coherence.mjs` (49/49 coherence checks passing).
  - `npm run lint` passed with zero errors.

## 2026-09-19 — Character Studio redesign: obsidian 2-column layout, drag-and-drop avatar, live card & token preview, blueprint generator, and alternate greetings deck

- **Obsidian 2-column Character Studio layout**:
  - Replaced legacy single-column modal with a wide desktop studio experience: structured authoring panels on the left and sticky live preview on the right.
  - Extracted all styling to `src/index.css` (`.character-studio-modal`, `.character-studio-layout`, `.character-studio-editor`, `.character-studio-preview`, `.studio-card`, `.avatar-dropzone`, `.greetings-deck`, `.preview-card-box`, `.preview-budget-box`) with zero inline styles.
- **Direct Avatar Drag & Drop + Local File Upload**:
  - Replaced external URL dependency with an interactive drag-and-drop zone supporting local image file selection and drop.
  - Image files are persisted directly into IndexedDB via `imageStorage.saveImage()`, avoiding LocalStorage 5MB quota exhaustion, with instant preview resolution via `imageStorage.resolveImage()`.
  - Built unified `AvatarImage.jsx` component that seamlessly resolves `idb:avatar_*` keys across the chat header, message turns, sidebar character list, brain modal, and studio preview card with zero-flicker synchronous in-memory cache lookup (`imageStorage.getCachedImage`) and graceful fallback rendering.
  - Added character and persona avatar pre-warming and cleanup in `App.jsx`.
- **Live Card & Token Breakdown Preview**:
  - Sticky right panel displays a live preview card with resolved avatar, name, subtitle, and 18+ badge.
  - Real-time token breakdown meter tracks Persona, Scenario/World, Greetings, and Directives individually against their token budgets.
  - Live prose preview with interactive `{{user}}` and `{{char}}` macro resolution demonstrating how roleplay asterisks and quotes will appear in chat.
- **Top Quick Blueprint Generator**:
  - Top expandable bar with one-click archetype inserts (3-part templates for Identity, Personality, and Scenario), roleplay tone selector, whole-card AI generation from scenario, and full card rewrite.
  - Inline field-level AI assist pills for each card: "Enhance Voice", "Flesh out World", "Draft from Scenario", and "Optimize Directives".
- **Alternate Greetings Deck**:
  - Added multi-greeting authoring deck in Character Studio with custom scenario labels, inline token counts, and add/remove controls.
  - Integrated with chat session initialization (`App.jsx`): opening messages are populated with `swipes` containing the primary greeting and all alternate greetings, allowing instant `< 1/3 >` cycling and Alt+Left/Right navigation across starting scenarios.
  - Updated character import in `App.jsx` and template in `promptService.js` to preserve `alternate_greetings`.
- **Verification**:
  - Added automated test in `scripts/verify-coherence.mjs` verifying alternate greetings preservation and template integrity (48/48 coherence checks passing).
  - `npm run lint` passed with zero errors.
  - Browser subagent smoke test verified layout, live preview rendering, blueprint expansion, avatar dropzone, and blank state handling without console warnings.

- **SillyTavern-style response swiping (`< 1/3 >`)**:
  - Pinned obsidian glass footer toolbar on the active/latest assistant bubble featuring swipe pager (`[ < 1/3 > ]`), Continue (`Play`), Steer (`Compass`), Reroll (`RotateCw`), Edit (`Edit3`), Copy (`Copy`), and Delete (`Trash2`).
  - Implemented keyboard navigation: `Alt + ArrowLeft` and `Alt + ArrowRight` to cycle swipes smoothly without leaving the keyboard.
  - Backward-compatible storage schema: messages store `swipes: [{ content, reasoningContent, stats, model, responseId, createdAt }]` with `swipeIndex: number`, keeping `message.content` synchronized to the active swipe so all downstream services (brain auto-learn, token diagnostics, prompt builder, transcript export) operate seamlessly.
  - Swipe deletion ergonomics: if `swipes.length > 1`, deleting removes only the active swipe and shifts to an adjacent reply; if 1 swipe remains, deleting removes the entire turn.
- **Continue / Lengthen generation**:
  - Implemented seamless text continuation from where the model stopped, appending new streaming tokens directly to the current swipe content in real time.
- **Steer / Guided re-roll**:
  - Added inline steer popover with quick chips ("Describe surroundings & atmosphere", "More playful & teasing", "More assertive & direct", "Advance the action & plot", "Focus on internal emotion") and directive prompt input to guide alternative swipes without breaking roleplay immersion.
- **Smart scroll lock & jump-to-bottom**:
  - Added user scroll detection in `ChatArea.jsx`: scrolling up by >80px pauses sticky auto-scroll during active streaming or reading.
  - Added floating pill button: "Jump to latest ↓" with an unread token/message counter that smoothly re-engages sticky bottom auto-scroll on click.
- **Verification**: Added automated test in `scripts/verify-coherence.mjs` verifying swipe normalization, persistence, and active content synchronization (47 coherence checks passing); `npm run lint` passed with zero errors.

- **Full prompt cache fingerprinting**: Updated `_computePromptFingerprint()` in `lmStudioClient.js` to hash all message turns across the entire conversation history (including role, content, image references, completion, failed, and control flags) alongside all authored character fields, persona, lorebook, settings, and brain state. Edits or regenerations to any historical turn reliably invalidate cached system prompts.
- **Strict context bounding for oversized latest message**: Enhanced `TokenBudgetManager.fitHistory()` in `pipelineEngine.js` to detect when the latest message alone exceeds the remaining conversation budget. Instead of letting oversized inputs overflow the model context, it now intelligently truncates the message text to fit within the available tokens while maintaining valid history structure and setting truncation flags.
- **Accurate section token budgeting & safety buffer**: Updated `TokenBudgetManager.fitContent()` to include XML enclosing tags (`<tag>`), markdown headings (`# Title`), and newlines in token calculations for every compiled prompt section. Added an explicit safety buffer in `buildCompiledPromptPipeline()` and `fitHistory()`, guaranteeing that `totalInputTokens + maxTokens` strictly stays below `contextLength`.
- **Reliable IndexedDB image saving & write confirmation**: In `storageService.saveSessions()`, new Base64 image attachments are only replaced by `idb:img_{id}` pointers in LocalStorage AFTER the IndexedDB write completes successfully. A failed or aborted IndexedDB write never leaves dangling unresolvable pointers.
- **Redundant write prevention on hydration**: Stored image keys (`msg.imageKey`) are tracked upon hydration in `storageService.js` and remembered via `imageStorage.isKeyPersisted()`. On subsequent session saves, already-persisted images are preserved as pointers directly without redundant Base64 re-uploads to IndexedDB.
- **Comprehensive image cleanup**: Integrated image deletion into `App.jsx` and `storageService.js`. Deleting individual messages (`handleDeleteMessage`), clearing sessions (`handleClearSession`), deleting sessions (`handleDeleteSession`), and deleting/purging characters (`handleDeleteCharacter`, `purgeOrphanedSessions`) promptly deletes all associated image keys from IndexedDB.
- **Native vision user-turn binding**: Refactored `ModelAdapter.format('lmstudio_native')` to interleave text and image blocks sequentially, placing each attached image immediately after its originating user message turn rather than batching all images at the very end of the transcript.
- **Verification**: All 46 offline regression tests in `scripts/verify-coherence.mjs` passing; `npm run lint` passed with zero errors.

## 2026-09-18 — Correctness & hardening fixes: media persistence, prompt cache, multimodal history, token diagnostics, telemetry & preview security

- **IndexedDB offloading for chat images**: Created zero-dependency `imageStorage.js` utilizing browser IndexedDB (`loreforge_media_db`) with in-memory fallback for non-browser/testing environments. In `storageService.saveSessions()`, large Base64 data URLs are automatically stored in IndexedDB and replaced with lightweight `idb:img_{msgId}` keys in LocalStorage, preventing the 5MB browser quota from being exhausted and breaking chat persistence or brain writes. Added automated hydration on startup (`storageService.hydrateSessionImages`) and lazy image resolution in `MessageItem.jsx`. Added emergency quota recovery to `saveSessions` and `saveBrains`.
- **Prompt cache fingerprinting**: Replaced the shallow cache key in `lmStudioClient.js` with `_computePromptFingerprint()`. The fingerprint now comprehensively includes character narrative fields, system prompts, user persona, active lorebook entries, brain memories, summaries, transient scene states, sampling settings, and conversation turn signatures. Stale prompt caching is eliminated.
- **Multimodal history support for native vision**: Updated `ModelAdapter.format('lmstudio_native')` in `pipelineEngine.js` to process and supply all user turns containing images in chronological order instead of only the single latest turn, ensuring older images remain within model context.
- **Token overview diagnostics field correction**: Corrected property access in `TokenOverviewBar.jsx`. Subconscious memory tokens now correctly evaluate `m.content` (with `m.text` fallback), and session summary tokens evaluate `s.summary` (with `s.content` and `s.text` fallback), resolving the bug where memory and summary token diagnostics reported 0.
- **Fallback transport telemetry calculation**: Updated fallback OpenAI-compatible SSE streaming in `lmStudioClient.js` to request `stream_options: { include_usage: true }`. Telemetry now uses server-reported `completion_tokens` when provided by the backend, or precise token estimation over full content and reasoning text, eliminating inaccurate tokens/second and output token counts caused by counting raw SSE chunks.
- **Safe image preview**: Eliminated `document.write()` in `MessageItem.jsx` for image popup preview, replacing it with secure DOM element creation (`document.createElement('img')`) with zero external execution or markup injection risk.
- **Verification**: Added 3 automated coherence checks in `scripts/verify-coherence.mjs` (45 total checks passing); `npm run lint` passed with zero errors.

## 2026-09-18 — Correctness fixes: session persistence flags, conversation token budget, and stream race condition

- **Session persistence flags**: Preserved `control`, `failed`, and `complete` message properties in `storageService.saveSessions()` and `getSessions()`. Incomplete generations, connection error messages, and synthetic control commands are now reliably excluded from memory learning after browser reloads.
- **Conversation history token budgeting**: Added `TokenBudgetManager.fitHistory()` in `pipelineEngine.js` to dynamically window messages backwards from newest to oldest within context limits. Integrated history budgeting into `promptService.buildCompiledPromptPipeline()` and `lmStudioClient.streamChat()`, ensuring total input tokens (`systemPrompt + history + maxTokens + safetyMargin`) strictly respect `contextLength`.
- **TokenOverviewBar diagnostics**: Updated real-time context and history metrics to display fitted history tokens, accurate input tokens, and a windowed message badge (`fitted/total`) when history truncation is active.
- **Stream Stop race condition**: Guarded streaming chat lifecycle in `App.jsx` with `currentStreamIdRef`. Callback handlers, errors, and the `finally` block for an aborted or preceding stream can no longer clear the state, reset `isStreaming`, or wipe `abortControllerRef` of an active subsequent generation.
- **Verification**: Added 3 automated coherence tests covering session flag persistence/filtering and history token windowing (42 total coherence tests passing); `npm run lint` passed with zero errors.

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
