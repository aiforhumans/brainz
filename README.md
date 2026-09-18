# LoreForge

A local-first roleplay chat application for desktop browsers, built with React 19, Vite 8, Vanilla CSS and LM Studio. The interface uses an obsidian glass theme with purple accents.

## Features

- Streaming character chat, model-provided reasoning when available, and generation telemetry.
- Character creation, JSON import/export, drafts, AI generation, individual field polish and coherent full-card rewriting.
- Selected user personas, keyword-triggered lorebook entries, and multiple chapters per character.
- Evidence-based character memory with review controls, automatic learning and an actual system-prompt preview.
- Message editing, regeneration, continuation, copying and deletion; image attachments for compatible vision models.
- Sampling presets, reasoning/output settings, and model loading/unloading controls where supported by LM Studio.
- Mature creative roleplay support, enabled by default. Character voice and scene context guide responses; permission for mature themes is not an instruction to escalate.

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

### Characters and personas

Choose a built-in character (Laura or Esther), import a card, or create your own. Set your roleplay name and background in User Persona before generating a new character.

Use **Generate Character Card** for a concept, **AI Rewrite Card** to rewrite personality, scenario, greeting and system directives together, or the individual field tools to polish one field with the surrounding card as context. Untouched template text is not treated as a creative constraint. Invalid, incomplete or stale model results leave existing fields intact and display an error.

The opening scenario and emotional style establish the starting conditions. Conversation can change the location, mood and circumstances while authored character facts remain authoritative. Custom names and established relationships are preserved; selecting a different persona does not indiscriminately rename people inside a card. Built-in migrations update only exact unchanged default text.

### Chat, chapters and lore

Send with Enter; use Shift+Enter for a newline. Asterisks mark actions and double quotes mark spoken dialogue. Attach images only when the selected model supports vision. The reasoning accordion displays reasoning supplied by the model when available.

Chapters separate chat transcripts, but **memory continuity is shared across a character's chapters**. They are not isolated alternate timelines. Each character has its own brain.

Lorebook entries activate when their keywords appear in the latest four messages. Use them for explicit world facts and setting rules. Message editing, regeneration and deletion also affect the evidence used by learning.

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

## Storage, migration and privacy

Application data is persisted in this browser's LocalStorage through [storageService.js](src/services/storageService.js). Different browser profiles or origins have separate data. Clearing browser site data removes that storage; export important cards and brains before doing so.

| Key | Contents |
| --- | --- |
| `loreforge_characters_v1` | Character cards |
| `loreforge_sessions_v1` | Sessions grouped by character ID |
| `loreforge_settings_v1` | Server and generation settings |
| `loreforge_user_persona_v1` | Selected user persona |
| `loreforge_lorebook_v1` | Lorebook entries |
| `loreforge_character_draft_v1` | Character editor draft |
| `loreforge_brains_by_char_v3` | Active per-character brains |

Selection IDs and deleted preset IDs also live in LocalStorage; the storage service is the authoritative key inventory.

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
| [App.jsx](src/App.jsx) | Application state, persistence callbacks, foreground inference and guarded idle-learning queue |
| [components](src/components/AGENTS.md) | UI and local form state; data and service callbacks supplied by App |
| [promptService.js](src/services/promptService.js) | Shared chat/design rules, schemas, templates and prompt preview |
| [brainService.js](src/services/brainService.js) | Brain normalization, evidence, retrieval, corrections and source invalidation |
| [lmStudioClient.js](src/services/lmStudioClient.js) | Native streaming transport, compatible fallback, generation and synthesis |
| [storageService.js](src/services/storageService.js) | LocalStorage access, migration and existing download helpers |
| [defaultCharacters.js](src/services/defaultCharacters.js) | Presets and exact-match legacy default upgrades |
| [index.css](src/index.css) | Shared theme, classes and design tokens |

Native chat uses `/api/v1/chat` with `system_prompt`, formatted conversation `input` and SSE events for model loading, prompt processing, reasoning, message text and completion statistics. The client retains `/v1/chat/completions` fallback. Structured generation and JSON fallback both pass validation before results are applied. Cancellation must not launch a fallback request.

See the [project map](docs/PROJECT_MAP.md) for entry points, [design decisions](docs/DECISIONS.md) for memory and scheduling contracts, and [change log](docs/CHANGELOG.md) for verification and limitations. Short output budgets, reasoning overhead and model-specific behavior can still produce poor or incomplete replies; inspect settings and the prompt preview when diagnosing them.
