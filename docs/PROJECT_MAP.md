# LoreForge project map

- `src/App.jsx`: persistent state, chat orchestration, guarded idle-learning queue, foreground cancellation, profile/card saves.
- `src/services/promptService.js`: shared character/chat rules, template and JSON schemas, memory injection and full prompt preview.
- `src/services/pipelineEngine.js`: SceneStateManager, TokenBudgetManager, MemoryConflictEngine, HybridLoreRetriever, ModelAdapter, and StructuredPromptCompiler.
- `src/services/brainService.js`: v3 normalization, provenance/status, evidence fingerprints, invalidation, retrieval and chronological transcript chunks.
- `src/services/lmStudioClient.js`: local model transport, validated generation, coherent card rewrite, backstory extraction and rolling synthesis.
- `src/services/storageService.js`: LocalStorage and non-destructive migration; v1/v2 brain originals are retained.
- `src/services/defaultCharacters.js`: current presets and exact-match migration of unchanged legacy fields.
- `src/components/CharacterModal.jsx`: editor/generator UI with current-persona templates and guarded generation results.
- `src/components/BrainModal.jsx`: memory review, manual user profile, status controls and exact prompt preview.
- `src/index.css`: shared obsidian theme and Brain layout.

Verification: `npm run lint`, `node scripts/verify-coherence.mjs`, `npm run dev` at `http://localhost:5173/`. Do not run a production build unless requested. Browser smoke tests use an isolated browser context and mocked endpoints for deterministic failures/races, then separate local-model probes for response quality.
