# LoreForge

A local-first roleplay chat application for desktop browsers, built with React 19, Vite 8, Vanilla CSS and LM Studio. The interface uses an obsidian glass theme with purple accents.

## Features

- **Obsidian Character Studio**: Wide 2-column desktop editor with categorized authoring cards, live card header, 4-part token breakdown meter, and formatted prose preview with `{{user}}` / `{{char}}` macro resolution.
- **Local Avatar Drag & Drop**: Native drag-and-drop image upload with automated IndexedDB storage, URL fallback, and 18+ NSFW toggle.
- **Alternate Greetings Deck**: Multi-scenario opening greeting authoring with custom labels and inline token counters, initialized as instant chat swipes.
- **Blueprint Generator & Field AI Assist**: One-click 3-part archetype templates (Fantasy, Modern Noir, Sci-Fi, Slice of Life), tone selector, whole-card AI generation/rewrite, and inline field polish pills ("Enhance Voice", "Flesh out World", "Draft from Scenario", "Optimize Directives").
- **SillyTavern-Style Response Swiping (`[ < 1/3 > ]`)**: Pinned obsidian glass toolbar on assistant messages with swipe navigation, monospace counter, and `Alt + ArrowLeft` / `Alt + ArrowRight` keyboard shortcuts.
- **Continue & Steer Directives**: Seamless mid-sentence generation continuation and guided alternative re-rolls with quick directive chips or custom instructions without breaking character immersion.
- **Smart Scroll Lock & Jump-to-Bottom**: Automatic detection of reading/scrolling up during streaming with a floating "Jump to latest ↓" pill showing unread tokens/messages.
- **Real-Time Memory & Token Overview Bar**: Pinned main chat footer tracking subconscious memory tokens, session summaries, lorebook tokens, and fitted conversation history alongside a dynamic context budget headroom gauge and expandable diagnostics drawer.
- **Zero-Quota Media Offloading**: Chat images and local avatars are automatically offloaded to browser IndexedDB, eliminating LocalStorage 5MB quota exhaustion while maintaining fast lazy rendering.
- **Evidence-Based Character Memory**: Automatic idle learning (8-reply cadence), explicit manual profile confirmation, contradiction resolution, and live system-prompt preview.
- **Strict Context & Cache Pipeline**: Deterministic prompt cache fingerprinting across all conversation turns and character state, backwards history windowing, oversized message safety truncation, and multimodal history interleaving.
- **Mature Creative Roleplay Support**: Enabled by default. Character voice and scene context guide responses; permission for mature themes is not an instruction to escalate.

## Requirements and setup

- Node.js `^20.19.0 || >=22.12.0` (the installed Vite 8 requirement).
- LM Studio with its local server running on port `1234` and a downloaded model available to load. Native API, vision, reasoning and structured-output support depend on the server and model.

From the project directory:

```sh
npm install
npm run dev
```

Open `http://localhost:5173/` and check the connection badge and selected model. If Vite chooses another port, use the URL printed in the terminal.

The default `/lmstudio-proxy` route forwards requests through Vite to `http://localhost:1234`. Keep proxy mode enabled for this setup. Direct URL mode is configurable in Settings; the target server must allow requests from the browser's origin. If LM Studio uses another port, update the proxy target in [vite.config.js](vite.config.js) or configure direct mode accordingly.

Production bundles are created only when requested with `npm run build`; `npm run preview` previews a generated bundle. Static hosting must provide suitable API routing or use a configured direct server URL: the built files do not embed a proxy server.

## Using LoreForge

### Character Studio and authoring

Open the Character Studio by clicking an existing character in the sidebar or clicking **New Character**. The Studio provides a wide two-column authoring environment:

- **Authoring Engine (Left)**: Grouped into dedicated obsidian glass cards:
  - **Identity & Visuals**: Character name, subtitle tagline, genre category, 18+ toggle, and interactive drag-and-drop avatar zone. Drop any image file directly to store it securely in IndexedDB without consuming LocalStorage space.
  - **Persona & Voice**: Core personality traits, speech quirks, and psychological makeup. Includes an inline token meter and "Enhance Voice" AI assist.
  - **World & Scenario**: Physical setting, cultural context, and starting scenario. Includes a "Flesh out World" AI assist.
  - **Alternate Greetings Deck**: Author multiple starting scenarios for a single character. Each alternate greeting includes a custom scenario label and individual token count.
  - **Directives & Guardrails**: System instructions, formatting constraints, and boundaries. Includes an "Optimize Directives" AI assist.
- **Live Telemetry & Preview (Right)**:
  - **Live Card Header**: Renders the resolved avatar, character name, category, and NSFW status.
  - **4-Part Token Breakdown Meter**: Displays exact token usage for Persona, Scenario, Greetings, and Directives against their individual recommended budgets.
  - **Formatted Prose Preview**: Live sample rendering of dialogue and actions with real-time `{{user}}` and `{{char}}` macro replacement.
- **Top Quick Blueprint Generator**:
  - Insert 3-part structured archetypes (*Fantasy Adventurer*, *Modern Noir*, *Sci-Fi Android*, *Slice of Life*).
  - Select roleplay tone (*Immersive & Literary*, *Witty & Casual*, *Dark & Dramatic*, *Playful & NSFW*).
  - Trigger "Draft from Scenario" to generate a complete card from a brief prompt, or "AI Rewrite Card" to polish all narrative fields coherently.

### Chat, swiping, steer and chapters

Send messages with Enter; use Shift+Enter for a newline. Asterisks denote actions/narration and double quotes denote spoken dialogue. Attach images with the paperclip button when using vision-capable models.

- **Response Swiping (`[ < 1/3 > ]`)**:
  - The latest assistant bubble features a pinned obsidian glass toolbar.
  - Click `<` or `>` or press **`Alt + ArrowLeft`** / **`Alt + ArrowRight`** to navigate alternative responses seamlessly.
  - Deleting when multiple swipes exist removes only the active swipe; deleting a single swipe removes the turn.
  - Starting a new chat or restoring a greeting automatically loads the primary greeting and all alternate greetings into the opening turn's swipes.
- **Continue (`Play` icon)**:
  - Prompts the model to pick up directly from where it stopped, streaming new tokens seamlessly into the active swipe in real time.
- **Steer / Guided Re-roll (`Compass` icon)**:
  - Opens a popover with quick prompt chips (*"Describe surroundings & atmosphere"*, *"More playful & teasing"*, *"More assertive & direct"*, *"Advance the action & plot"*, *"Focus on internal emotion"*) or custom prompt input to steer the next alternate swipe without breaking narrative context.
- **Smart Scroll Lock**:
  - Scrolling up by more than 80px pauses sticky auto-scroll during active generation so you can read without disruption.
  - A floating **"Jump to latest ↓"** pill indicates incoming unread tokens/messages and re-engages sticky scrolling when clicked.
- **Chapters & Continuity**:
  - Chapters organize conversation transcripts into separate story arcs, but **memory continuity is shared across a character's chapters**. Each character has a single unified brain.
- **Lorebook**:
  - Entries trigger dynamically when their keywords appear within the recent message window.

### Real-time token overview and diagnostics

Pinned to the bottom of the chat window is the **Token Overview Bar**:

- **Real-Time Token Badges**: Displays active subconscious memory tokens, session summary tokens, active lorebook tokens, and fitted chat history tokens.
- **Context Headroom Gauge**: A gradient meter (normal, warning, critical) showing current total input tokens relative to the model's context window and generation reserve.
- **Auto-Learn Progress**: Shows the active learning cadence (`X/8 replies until auto-synthesis`) and brain revision count.
- **Interactive Diagnostics Drawer**: Clicking the bar expands a detailed HUD:
  - **Context & Budgets Tab**: Visual stacked breakdown bar (System, Memory, Lore, Chat, Headroom, Reserve) and precise numerical metrics.
  - **Memory Bank Tab**: Complete listing of all stored memories with category tags, confidence ratings, token weights, and prompt inclusion status.

### Brain and learning

The Brain separates authored character context, manually entered user information and observations learned from conversation. New brains do not invent shared experiences or user traits.

- **Brain Active** controls use of the brain in chat. Automatic learning requires both Brain Active and **Auto-Learn**.
- Auto-Learn initializes new characters, then updates after every eight completed nonempty replies per character, following two idle seconds. The counter survives reloads; successful manual conversation synthesis also resets it. Edits wait for the next batch or manual synthesis. Foreground chat and generation take priority; pending work resumes when idle.
- Learning processes changed sessions chronologically in bounded chunks with rolling summaries, including later developments. Edited or removed source material invalidates affected evidence.
- **Synthesize Brain** manually analyzes saved conversations and retries failed learning. Offline operation, cancellation and malformed responses preserve the last valid brain.
- **Refresh Authored Backstory** refreshes character-derived context without clearing learned conversation history. Reset is a separate explicit action.
- **Data & Prompt Preview** uses the same full system-prompt builder as chat, with the current character, persona and session context.

Memory statuses have distinct meanings:

| Status | Meaning |
| --- | --- |
| Established | Supported or explicitly authored information, subject to confidence and relevance selection. |
| Tentative | An uncertain impression, labeled as uncertain when included in prompts. |
| Superseded | An older claim replaced by a correction; excluded from active memory context. |
| Needs review | Legacy or invalidated information retained for inspection, not presented as established fact. |

Review evidence before confirming a memory. Editing or confirming an entry makes it manually authored; automatic synthesis preserves manual entries. Deletion records an exclusion to prevent immediate automatic recreation. Low confidence stays low, and the prompt selects a bounded set of relevant memories rather than injecting the entire bank.

## Storage, media, migration and privacy

Application data is persisted in browser LocalStorage through [storageService.js](src/services/storageService.js), while large binary assets (chat attachments and custom avatars) are stored in browser IndexedDB via [imageStorage.js](src/services/imageStorage.js).

| Storage Target | Key / Database | Contents |
| --- | --- | --- |
| LocalStorage | `loreforge_characters_v1` | Character cards and alternate greetings |
| LocalStorage | `loreforge_sessions_v1` | Sessions, turns, and swipe histories |
| LocalStorage | `loreforge_settings_v1` | Server, sampler, and generation settings |
| LocalStorage | `loreforge_user_persona_v1` | Selected user persona |
| LocalStorage | `loreforge_lorebook_v1` | Lorebook entries |
| LocalStorage | `loreforge_character_draft_v1` | Character editor drafts |
| LocalStorage | `loreforge_brains_by_char_v3` | Active per-character brains |
| IndexedDB | `loreforge_media_db` | Base64 chat images and drag-and-drop avatar files |

Selection IDs and deleted preset IDs also live in LocalStorage; the storage service is the authoritative key inventory.

IndexedDB offloading protects the 5MB LocalStorage quota from being exhausted. Pointers (`idb:img_*` and `idb:avatar_*`) are written only after IndexedDB commits successfully, and images are automatically hydrated on startup. Deleting messages, clearing sessions, or deleting characters automatically purges the associated media from IndexedDB.

Migration preserves original `loreforge_brains_by_char_v2` and `loreforge_brain_v1` values for recovery. Unsupported legacy entries remain available under **needs review**. Saved conversations can provide evidence for revalidation when LM Studio is available. Legacy imports are normalized through the same brain service; migration does not grant unsupported claims established status.

Inference is local by default, and the app has no remote persistence service. Remote avatar URLs can still make external browser requests, and changing the server URL changes the destination of inference requests. JSON exports are intentional browser downloads. Native chat requests use `store: false`; this does not promise that the model server has no diagnostic logging.

## Development and verification

Read [AGENTS.md](AGENTS.md) before making changes, then follow its Child DOX Index to the relevant subtree. Desktop behavior is the priority; mobile optimization is not requested.

```sh
npm run lint
node scripts/verify-coherence.mjs
npm run dev
```

The assertion script uses built-in Node assertions, mocked model responses and in-memory storage. It requires no test framework, live model or user data. Lint must have zero errors; recorded warnings and completed verification are tracked in the [change log](docs/CHANGELOG.md).

For affected UI changes, smoke-test generation, rewriting, chat, regeneration, Brain controls, imports and Auto-Learn in an isolated browser context. Test failure, cancellation and stale-response handling without resetting real user data. When LM Studio is available, separately assess voice, emotional change, continuity and user agency over multiple turns. Model quality is not guaranteed by passing deterministic checks.

### Architecture

| Area | Responsibility |
| --- | --- |
| [App.jsx](src/App.jsx) | Application state, persistence callbacks, foreground inference, swipe dispatch, and guarded idle-learning queue |
| [components](src/components/AGENTS.md) | UI and local form state; data and service callbacks supplied by App |
| [TokenOverviewBar.jsx](src/components/TokenOverviewBar.jsx) | Real-time memory, lore, history tokens, context utilization gauge, and diagnostics drawer |
| [CharacterModal.jsx](src/components/CharacterModal.jsx) | 2-column Character Studio, blueprint generator, avatar dropzone, live token meter, and alternate greetings deck |
| [pipelineEngine.js](src/services/pipelineEngine.js) | Structured prompt compilation, token budgeting, backwards history fitting, and model adapters |
| [promptService.js](src/services/promptService.js) | Shared chat/design rules, schemas, templates, macro resolution, and prompt preview |
| [brainService.js](src/services/brainService.js) | Brain normalization, evidence, retrieval, corrections, and source invalidation |
| [lmStudioClient.js](src/services/lmStudioClient.js) | Native streaming transport, fallback SSE, cache fingerprinting, and generation |
| [storageService.js](src/services/storageService.js) | LocalStorage access, migration, swipe serialization, and download helpers |
| [imageStorage.js](src/services/imageStorage.js) | Zero-dependency IndexedDB storage for chat images and avatars with automated cleanup |
| [defaultCharacters.js](src/services/defaultCharacters.js) | Presets and exact-match legacy default upgrades |
| [index.css](src/index.css) | Shared theme, obsidian glassmorphism classes, and design tokens |

Native chat uses `/api/v1/chat` with `system_prompt`, formatted conversation `input` and SSE events for model loading, prompt processing, reasoning, message text and completion statistics. The client retains `/v1/chat/completions` fallback. Structured generation and JSON fallback both pass validation before results are applied. Cancellation must not launch a fallback request.

See the [project map](docs/PROJECT_MAP.md) for entry points, [design decisions](docs/DECISIONS.md) for memory and scheduling contracts, and [change log](docs/CHANGELOG.md) for verification and limitations. Short output budgets, reasoning overhead and model-specific behavior can still produce poor or incomplete replies; inspect settings and the prompt preview when diagnosing them.
