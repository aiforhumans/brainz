# DOX framework — LoreForge

## Purpose

LoreForge is a local-first roleplay chat application built with React 19 + Vite 8. Inference uses local LM Studio by default (`http://localhost:1234`), and application data stays in browser LocalStorage. Remote avatar URLs can cause external browser requests; configured server URLs determine where inference requests go.

## Ownership

- Owner: Mark (sole developer)
- Stack: React 19, Vite 8, Vanilla CSS, Lucide-React icons, OXLint
- Runtime dependency: a local LM Studio server on port 1234, with a compatible downloaded model. Native API features depend on server/model support; chat retains an OpenAI-compatible fallback.
- Development runtime: Node `^20.19.0 || >=22.12.0`, as required by the installed Vite 8.
- Root documentation: `README.md` owns setup and user workflows; this file owns project-wide agent contracts. See [project map](docs/PROJECT_MAP.md), [decisions](docs/DECISIONS.md), and [change log](docs/CHANGELOG.md).

## Local Contracts

- **Tech stack is fixed**: React + Vite + Vanilla CSS. Do not add Tailwind, external UI libraries, or new runtime npm packages without explicit approval.
- **Application state and inference scheduling live in `App.jsx`**; child components receive data and service callbacks via props. Existing modal form state stays local; no Context or external state library.
- **Automatic application persistence is LocalStorage** via `storageService.js`. User-triggered JSON downloads are supported exports. Do not add server-side storage or remote persistence; local inference requests remain supported.
- **LM Studio proxy**: The Vite dev server proxies `/lmstudio-proxy` → `http://localhost:1234`. Always use `/lmstudio-proxy` as the default `serverUrl`; never hardcode `localhost:1234` in component code.
- **Linting**: `npm run lint` (OXLint). Fix all lint errors before committing.
- **No test framework exists yet**; do not add one unless instructed.
- **NSFW content**: The app intentionally supports 18+ creative roleplay. Do not add content filters.
- **`node_modules/` and `dist/`** are generated directories; never edit files inside them.

## Work Guidance

- Run `npm run dev` to start the dev server at `http://localhost:5173/`.
- Run `npm run build` only when asked to produce a production bundle.
- Keep components focused: UI-only logic stays in `src/components/`, data/API logic stays in `src/services/`.
- New UI elements must match the obsidian glassmorphism aesthetic defined in `src/index.css`.
- Do not introduce inline styles; use CSS custom properties and class names from `index.css`.
- Icons come from `lucide-react` only.

## Verification

- `npm run lint` — must pass with zero errors
- `node scripts/verify-coherence.mjs` — dependency-free offline assertions for prompt, generation, migration and memory behavior. Run after relevant changes.
- Desktop smoke test: `npm run dev` → open `http://localhost:5173/` → check connection, generation/rewrite, chat/regeneration, Brain controls, imports and Auto-Learn when affected. Use isolated fixtures for destructive reset/import checks.
- Documentation-only changes: check referenced files, commands and Child DOX Index links against the project; no production build is needed.

## User Preferences

- User name: Mark
- App accent color: purple (CSS var `--primary`)
- NSFW mode on by default
- Desktop behavior is the priority; do not add mobile optimization unless requested.

## Child DOX Index

- [`docs/AGENTS.md`](docs/AGENTS.md) — Durable behavior decisions, change log and verification notes.
- [`scripts/AGENTS.md`](scripts/AGENTS.md) — Dependency-free, offline regression checks.
- [`src/AGENTS.md`](src/AGENTS.md) — React application source root: entry points, top-level CSS, and layout shell; owns the child index for components, services, and utils.

---

## DOX Framework Rules (do not edit below this line)

### Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

### Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

### Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

### Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

### Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order: Purpose → Ownership → Local Contracts → Work Guidance → Verification → Child DOX Index

### Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

### Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why
