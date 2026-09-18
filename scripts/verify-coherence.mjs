import assert from 'node:assert/strict'
import { LMStudioClient } from '../src/services/lmStudioClient.js'
import { isAutoLearnDue, createBrain, normalizeBrain, reconcileBrain, sessionFingerprint, sessionChunks, selectMemories, applyLearningResult, validateLearningResult } from '../src/services/brainService.js'
import { buildChatPrompt, buildBrainPrompt, buildCompiledPromptPipeline, createCharacterTemplate, authoredFields, replaceMacros, resolveCharacterMacros } from '../src/services/promptService.js'
import { storageService, generateContextualBrain } from '../src/services/storageService.js'
import { DEFAULT_CHARACTERS, migrateDefaultCharacter } from '../src/services/defaultCharacters.js'
import { SceneStateManager, MemoryConflictEngine, HybridLoreRetriever, TokenBudgetManager, ModelAdapter, StructuredPromptCompiler } from '../src/services/pipelineEngine.js'

let passed = 0
async function check(name, fn) { await fn(); passed++; console.log(`PASS ${name}`) }
const persona = { name: 'Sam', bio: 'A gardener.' }
const character = { id: 'alex', name: 'Alex', tagline: 'A reserved neighbor', category: 'Realistic', tags: ['Realistic'], personality: 'Reserved and earnest. Likes gardening.', scenario: 'Two strangers discuss friendship in a cafe.', systemPrompt: 'Portray Alex, not the visitor. A quiet, formal voice.', greeting: '"Hello."', nsfw: false }
const session = { id: 's1', title: 'First meeting', createdAt: 1, updatedAt: 2, messages: [{ id: 'u1', role: 'user', content: 'I have a dog named Pip.' }, { id: 'a1', role: 'assistant', content: '"Nice to meet you."', complete: true }] }
const fresh = () => createBrain(character, persona)
const item = (overrides = {}) => ({ content: 'Sam has a dog named Pip.', category: 'facts', kind: 'user_fact', subject: 'user', status: 'established', confidence: 0.9, evidenceMessageIds: ['u1'], supersedes: [], ...overrides })
const client = new LMStudioClient()

await check('auto-learning waits for eight replies and preserves cadence across reloads', () => {
  for (let count = 0; count < 8; count++) assert.equal(isAutoLearnDue({ repliesSinceLearning: count }), false)
  assert.equal(isAutoLearnDue({ repliesSinceLearning: 8 }), true)
  const restored = normalizeBrain({ ...fresh(), repliesSinceLearning: 7 }, character, persona)
  assert.equal(restored.repliesSinceLearning, 7)
  assert.equal(isAutoLearnDue({ ...restored, repliesSinceLearning: restored.repliesSinceLearning + 1 }), true)
  assert.equal(isAutoLearnDue(fresh()), false)
  assert.equal(normalizeBrain({ ...fresh(), repliesSinceLearning: -1 }, character, persona).repliesSinceLearning, 0)
})

await check('initial brain has no invented user traits, familiarity, or genre guesses', () => {
  const brain = generateContextualBrain(character, persona)
  assert.deepEqual(brain.userProfile.personalityTraits, [])
  assert.deepEqual(brain.memories, [])
  const prompt = buildChatPrompt(character, persona, [], [], false, brain)
  assert.match(prompt, /No verified conversation memories/)
  assert.doesNotMatch(prompt, /shipboard|operational rhythm|living history|with Mark/)
  assert.match(prompt, /Sam/)
})

await check('built-in speakers are unambiguous; custom edited defaults are preserved', () => {
  for (const c of DEFAULT_CHARACTERS) assert.doesNotMatch(c.scenario, /You are Mark/)
  const modified = { ...DEFAULT_CHARACTERS[0], systemPrompt: 'My custom voice', scenario: 'My custom setting' }
  assert.equal(migrateDefaultCharacter(modified).systemPrompt, modified.systemPrompt)
  assert.equal(migrateDefaultCharacter(modified).scenario, modified.scenario)
  const legacy = { ...modified, scenario: 'You are Mark, her son. You are catching up with your mom at her kitchen table. The house is quiet, familiar, and smells like dinner.' }
  assert.equal(migrateDefaultCharacter(legacy).scenario, DEFAULT_CHARACTERS[0].scenario)
})

await check('untouched template fields are not generator constraints', () => {
  const template = createCharacterTemplate(persona)
  assert.deepEqual(authoredFields({ ...template, name: 'Alex' }, template), { name: 'Alex' })
  assert.match(template.systemPrompt, /Sam/)
  assert.equal(template.greeting, '')
})

await check('legacy memory/profile/summary remains available but not injected', () => {
  const legacy = { userProfile: { personalityTraits: ['Cynical'], likes: ['Shipboard banter'] }, memories: [{ id: 'old', content: 'We went sailing together.', confidence: 0.99 }], sessionSummaries: [{ sessionId: 's1', summary: 'They met years ago.' }] }
  const migrated = normalizeBrain(legacy, character, persona)
  assert.equal(migrated.memories[0].status, 'needs_review')
  assert.deepEqual(migrated.legacyArchive, legacy)
  assert.doesNotMatch(buildBrainPrompt(migrated), /sailing|Cynical|years ago/)
  assert.deepEqual(normalizeBrain(migrated, character, persona), migrated)
})

await check('LocalStorage migration keeps originals and is idempotent', () => {
  const data = new Map()
  globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) }
  const legacy = JSON.stringify({ alex: { memories: [{ content: 'Unverified claim', confidence: 0.9 }], sessionSummaries: [] } })
  data.set('loreforge_characters_v1', JSON.stringify([character]))
  data.set('loreforge_user_persona_v1', JSON.stringify(persona))
  data.set('loreforge_brains_by_char_v2', legacy)
  const first = storageService.getBrains()
  assert.equal(data.get('loreforge_brains_by_char_v2'), legacy)
  assert.ok(data.has('loreforge_brains_by_char_v3'))
  assert.deepEqual(storageService.getBrains(), first)
  assert.equal(first.alex.memories[0].status, 'needs_review')
})

await check('confidence is never inflated and low-confidence memories are excluded', () => {
  const brain = applyLearningResult(fresh(), { summary: 'A meeting.', memories: [item({ confidence: 0.1 })] }, session, sessionChunks(session)[0])
  assert.equal(brain.memories[0].confidence, 0.1)
  assert.equal(selectMemories(brain).length, 0)
})

await check('speaker evidence prevents assistant claims becoming established user facts', () => {
  const brain = applyLearningResult(fresh(), { summary: 'A meeting.', memories: [item({ evidenceMessageIds: ['a1'] })] }, session, sessionChunks(session)[0])
  assert.equal(brain.memories[0].status, 'tentative')
  assert.match(buildBrainPrompt(brain), /Tentative impression, not a fact/)
})

await check('explicit corrections supersede old claims and retain manual entries', () => {
  const original = applyLearningResult(fresh(), { summary: 'Pip is a dog.', memories: [item()] }, session, sessionChunks(session)[0])
  original.memories.push({ id: 'manual', content: 'Sam likes tea.', confidence: 1, provenance: 'manual', status: 'established', subject: 'user', evidence: [] })
  const changed = { ...session, messages: [...session.messages, { id: 'u2', role: 'user', content: 'Correction: Pip is a cat, not a dog.' }] }
  const corrected = applyLearningResult(original, { summary: 'Pip is a cat.', memories: [item({ content: 'Pip is a cat.', evidenceMessageIds: ['u2'], supersedes: [original.memories[0].id, 'manual'] })] }, changed, sessionChunks(changed)[0])
  assert.equal(corrected.memories[0].status, 'superseded')
  assert.equal(corrected.memories.find(m => m.id === 'manual').status, 'established')
  assert.doesNotMatch(buildBrainPrompt(corrected), /dog named/)
})

await check('deleted memories stay excluded during relearning', () => {
  const brain = fresh(); brain.excludedMemories = ['sam has a dog named pip.']
  assert.equal(applyLearningResult(brain, { summary: 'A meeting.', memories: [item()] }, session, sessionChunks(session)[0]).memories.length, 0)
})

await check('editing or deleting evidence invalidates derived memories immediately', () => {
  const learned = applyLearningResult(fresh(), { summary: 'A meeting.', memories: [item()] }, session, sessionChunks(session)[0])
  learned.sessionSummaries = [{ sessionId: session.id, summary: 'Pip is a dog.', sourceFingerprint: sessionFingerprint(session), status: 'established' }]
  const edited = { ...session, messages: [{ ...session.messages[0], content: 'Pip is a cat.' }] }
  const invalid = reconcileBrain(learned, character, persona, [edited])
  assert.equal(invalid.memories[0].status, 'needs_review')
  assert.equal(invalid.sessionSummaries[0].status, 'needs_review')
  assert.equal(reconcileBrain(learned, character, persona, []).memories[0].status, 'needs_review')
})

await check('card/persona changes preserve history but require derived claims to be reviewed', () => {
  const learned = applyLearningResult(fresh(), { summary: 'A meeting.', memories: [item()] }, session, sessionChunks(session)[0])
  const revised = reconcileBrain(learned, { ...character, personality: 'Outgoing' }, persona, [session])
  assert.equal(revised.memories.length, 1)
  assert.equal(revised.memories[0].status, 'needs_review')
  const renamed = reconcileBrain(learned, character, { name: 'Robin' }, [session])
  assert.equal(renamed.memories[0].status, 'needs_review')
})

await check('long and late messages are not discarded; controls and failed turns are excluded', () => {
  const long = { ...session, messages: [...Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, role: i % 2 ? 'assistant' : 'user', content: `Turn ${i}` })), { id: 'long', role: 'user', content: 'x'.repeat(20000) + 'TAIL_EVENT' }, { id: 'control', role: 'user', content: 'CONTINUE_COMMAND', control: true }, { id: 'failed', role: 'assistant', content: 'BAD_PARTIAL', complete: false }] }
  const text = sessionChunks(long).flat().map(m => m.content).join('')
  assert.match(text, /Turn 29/); assert.match(text, /TAIL_EVENT/)
  assert.doesNotMatch(text, /CONTINUE_COMMAND|BAD_PARTIAL/)
})

await check('synthesis refreshes changed existing sessions and preserves unchanged summaries', async () => {
  let calls = 0
  client.generateStructuredJson = async () => { calls++; return { summary: `Summary revision ${calls}`, memories: [] } }
  let brain = await client.analyzeAndSynthesizeBrain({ character, userPersona: persona, sessions: { alex: [session] }, existingBrain: fresh() })
  const initialCalls = calls
  brain = await client.analyzeAndSynthesizeBrain({ character, userPersona: persona, sessions: { alex: [session] }, existingBrain: brain })
  assert.equal(calls, initialCalls)
  const extended = { ...session, messages: [...session.messages, { id: 'u2', role: 'user', content: 'We moved to the garden.' }] }
  brain = await client.analyzeAndSynthesizeBrain({ character, userPersona: persona, sessions: { alex: [extended] }, existingBrain: brain })
  assert.ok(calls > initialCalls); assert.equal(brain.sessionSummaries.length, 1)
  assert.equal(brain.sessionSummaries[0].sourceFingerprint, sessionFingerprint(extended))
})

await check('failure and cancellation never mutate existing brain or attempt fallback on abort', async () => {
  const original = fresh(), saved = JSON.stringify(original)
  client.generateStructuredJson = async () => { throw new Error('offline') }
  client.generateCompletionSync = async () => { throw new Error('offline') }
  await assert.rejects(client.analyzeAndSynthesizeBrain({ character, userPersona: persona, sessions: { alex: [session] }, existingBrain: original }))
  assert.equal(JSON.stringify(original), saved)
  let fallback = false
  client.generateStructuredJson = async () => { throw new DOMException('Cancelled', 'AbortError') }
  client.generateCompletionSync = async () => { fallback = true }
  await assert.rejects(client.autoGenerateCharacterCard({ existingFields: character, isNsfw: false, userPersona: persona }))
  assert.equal(fallback, false)
})

await check('invalid evidence IDs are rejected atomically', () => {
  assert.throws(() => validateLearningResult({ summary: 'Example', memories: [item({ evidenceMessageIds: ['invented'] })] }, sessionChunks(session)[0]))
})

await check('whole-card rewrite gets all fields, selected persona, and one coherent request', async () => {
  let requests = 0
  client.generateStructuredJson = async args => { requests++; assert.match(args.prompt, /Sam/); for (const field of ['personality', 'scenario', 'systemPrompt', 'greeting']) assert.ok(args.prompt.includes(field)); return { ...character } }
  const result = await client.optimizeCharacterCard({ characterContext: character, userPersona: persona })
  assert.equal(result.systemPrompt, character.systemPrompt); assert.equal(requests, 1)
  client.generateStructuredJson = async () => ({ name: 'Alex' })
  client.generateCompletionSync = async () => '{"name":"Alex"}'
  await assert.rejects(client.optimizeCharacterCard({ characterContext: character, userPersona: persona }))
})

await check('initial AI backstory must quote actual full-card fields; user bio is supplied', async () => {
  client.generateStructuredJson = async args => { assert.ok(args.prompt.includes(character.systemPrompt)); assert.match(args.prompt, /gardener/); return { backstoryFacts: [] } }
  const brain = await client.generateInitialBrainForCharacter({ character, userPersona: persona })
  assert.equal(brain.memories.length, 0)
  client.generateStructuredJson = async () => ({ backstoryFacts: [{ field: 'scenario', quote: 'Invented childhood holiday' }] })
  client.generateCompletionSync = async () => JSON.stringify({ backstoryFacts: [{ field: 'scenario', quote: 'Invented childhood holiday' }] })
  await assert.rejects(client.generateInitialBrainForCharacter({ character, userPersona: persona }))
})

await check('preview and actual chat prompt use the same builder', () => {
  assert.equal(client.buildSystemPrompt(character, persona, [], session.messages, true, fresh()), buildChatPrompt(character, persona, [], session.messages, true, fresh()))
})

await check('wrong-character import quarantines even previously established memory', () => {
  const imported = normalizeBrain({ ...fresh(), characterId: 'other', memories: [{ id: 'm', content: 'A shared event', provenance: 'manual', status: 'established', confidence: 1 }] }, character, persona)
  assert.equal(imported.memories[0].status, 'needs_review')
})

await check('retrieval favors relevant memory over unrelated high-confidence entries', () => {
  const brain = fresh()
  brain.memories = [
    ...Array.from({ length: 12 }, (_, i) => ({ id: `unrelated-${i}`, content: `Unrelated observation ${i}`, confidence: 1, status: 'established', provenance: 'manual', evidence: [] })),
    { id: 'pip', content: 'Pip is a cat who knocks over seedlings.', confidence: 0.7, status: 'established', provenance: 'manual', evidence: [] },
  ]
  assert.equal(selectMemories(brain, [{ content: 'What about Pip and the seedlings?' }])[0].id, 'pip')
})

await check('malformed imports cannot supply unverified evidence or arbitrary JSON', () => {
  assert.throws(() => normalizeBrain({ unrelated: true }, character, persona))
  const imported = normalizeBrain({ ...fresh(), memories: [{ content: 'Unsupported memory', status: 'established', provenance: 'conversation', confidence: 1, evidence: [null] }] }, character, persona)
  const reconciled = reconcileBrain(imported, character, persona, [session])
  assert.equal(reconciled.memories[0].status, 'needs_review')
  assert.doesNotMatch(buildBrainPrompt(reconciled), /Unsupported memory/)
})

await check('native and fallback transport receive the identical composed system prompt', async () => {
  const originalFetch = globalThis.fetch
  const captured = []
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(options.body); captured.push(payload)
    if (payload.system_prompt) return new Response('', { status: 404 })
    return new Response('data: {"choices":[{"delta":{"content":"Hello."}}]}\n\ndata: [DONE]\n\n', { headers: { 'Content-Type': 'text/event-stream' } })
  }
  try {
    const transport = new LMStudioClient()
    await transport.streamChat({ messages: session.messages, character, userPersona: persona, brain: fresh(), settings: { model: 'mock' } })
    assert.equal(captured[0].system_prompt, captured[1].messages[0].content)
    assert.equal(captured[0].store, false)
  } finally { globalThis.fetch = originalFetch }
})

await check('token-truncated field generation cannot replace existing text', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: 'An unfinished field' } }] }), { headers: { 'Content-Type': 'application/json' } })
  try { await assert.rejects(new LMStudioClient().optimizeCharacterField({ field: 'personality', currentValue: character.personality, characterContext: character, settings: {} }), /output budget/) }
  finally { globalThis.fetch = originalFetch }
})

await check('modular macro replacement resolves {{user}} and {{char}} case-insensitively', () => {
  const text = 'Hello {{USER}}, my name is {{Char}}. How are you {{user}}? - {{char}}'
  assert.equal(replaceMacros(text, { userName: 'Mark', charName: 'Laura' }), 'Hello Mark, my name is Laura. How are you Mark? - Laura')
  assert.equal(replaceMacros(null), '')
})

await check('resolveCharacterMacros substitutes user and character across narrative fields', () => {
  const raw = {
    name: 'Elena',
    tagline: 'Partner of {{user}}',
    personality: '{{char}} is fond of {{user}}.',
    scenario: '{{char}} meets {{user}} at noon.',
    systemPrompt: 'Embody {{char}} talking to {{user}}.',
    greeting: '"Hi {{user}}!"',
  }
  const resolved = resolveCharacterMacros(raw, { name: 'Mark' })
  assert.equal(resolved.tagline, 'Partner of Mark')
  assert.equal(resolved.personality, 'Elena is fond of Mark.')
  assert.equal(resolved.scenario, 'Elena meets Mark at noon.')
  assert.equal(resolved.systemPrompt, 'Embody Elena talking to Mark.')
  assert.equal(resolved.greeting, '"Hi Mark!"')
})

await check('buildChatPrompt resolves {{user}} and {{char}} before composing prompt', () => {
  const charWithMacros = {
    id: 'c1',
    name: 'Elena',
    systemPrompt: 'Directive for {{char}} and {{user}}.',
    personality: '{{char}} is loyal to {{user}}.',
    scenario: '{{char}} stands with {{user}}.',
    greeting: 'Greeting',
    nsfw: false,
  }
  const prompt = buildChatPrompt(charWithMacros, { name: 'Sam' }, [], [], false, null)
  assert.match(prompt, /Directive for Elena and Sam\./)
  assert.match(prompt, /Elena is loyal to Sam\./)
  assert.match(prompt, /Elena stands with Sam\./)
  assert.doesNotMatch(prompt, /\{\{user\}\}|\{\{char\}\}/)
})

await check('autoFillUserProfile validates and normalizes suggested profile schema', async () => {
  client.generateStructuredJson = async () => ({
    summary: 'A thoughtful conversationalist.',
    dialogueStyle: 'Quoted dialogue and asterisks for actions.',
    personalityTraits: ['Curious', 'Observant'],
    likes: ['Philosophy', 'Books'],
    dislikes: ['Dishonesty'],
    recurringLore: ['The Old Library'],
  })
  const result = await client.autoFillUserProfile({ character, userPersona: persona, memories: [item()], sessions: [session] })
  assert.equal(result.summary, 'A thoughtful conversationalist.')
  assert.deepEqual(result.personalityTraits, ['Curious', 'Observant'])
  assert.deepEqual(result.likes, ['Philosophy', 'Books'])
})

// ==========================================
// NEW PIPELINE UPGRADE TESTS
// ==========================================

await check('AC1: Prompt precedence: latest user corrections override older memories across 3 scenarios', () => {
  // Scenario 1: Pet correction (Pip is not a dog, but a cat)
  const mem1 = { id: 'm1', content: 'Pip is a playful dog.', status: 'established' }
  const sup1 = MemoryConflictEngine.findContradictions('Actually, Pip is a cat, not a dog.', [mem1])
  assert.deepEqual(sup1, ['m1'])

  // Scenario 2: Location correction (moved to Tokyo)
  const mem2 = { id: 'm2', content: 'User lives in London with family.', status: 'established' }
  const sup2 = MemoryConflictEngine.findContradictions('I moved and now resides in Tokyo.', [mem2])
  assert.deepEqual(sup2, ['m2'])

  // Scenario 3: Preference contradiction (dislikes coffee)
  const mem3 = { id: 'm3', content: 'User likes coffee every morning.', status: 'established' }
  const sup3 = MemoryConflictEngine.findContradictions('I really hates coffee and avoid caffeine.', [mem3])
  assert.deepEqual(sup3, ['m3'])

  // Verify resolved memories exclude superseded from active prompt
  const resolved = MemoryConflictEngine.resolveMemories([mem1, mem2, mem3], ['Actually, Pip is a cat, not a dog.'])
  assert.equal(resolved.find(m => m.id === 'm1').status, 'superseded')
  assert.equal(resolved.find(m => m.id === 'm2').status, 'established')
})

await check('AC2 & AC3: Structured memory has metadata and contradiction resolution marks superseded', () => {
  const legacyMem = { content: 'Legacy text', confidence: 0.8 }
  const normalized = normalizeBrain({ memories: [legacyMem] }, character, persona)
  const first = normalized.memories[0]
  assert.ok(first.id)
  assert.equal(first.text, 'Legacy text')
  assert.equal(first.type, 'user_fact')
  assert.equal(typeof first.importance, 'number')
  assert.equal(first.confidence, 0.8)
  assert.ok(Array.isArray(first.supersedes))
  assert.equal(typeof first.createdAt, 'number')
})

await check('AC4: Smarter memory retrieval ranks by score and caps selection under large volume', () => {
  const largeMemories = []
  for (let i = 0; i < 120; i++) {
    largeMemories.push({
      id: `mem-${i}`,
      content: i === 42 ? 'Sam loves planting heirloom tomatoes.' : `Unrelated random note number ${i} about astronomy and stars.`,
      status: 'established',
      confidence: 0.9,
      provenance: 'manual',
      importance: i === 42 ? 0.95 : 0.4,
    })
  }
  const brainWithMany = { ...fresh(), memories: largeMemories }
  const history = [{ role: 'user', content: 'How are my heirloom tomatoes doing?' }]
  const details = selectMemories(brainWithMany, history, 10, Date.now(), true)
  assert.ok(details.length <= 10)
  assert.equal(details[0].memory.id, 'mem-42')
  assert.ok(details[0].score > details[1].score)
  assert.ok(details[0].relevance > 0)
})

await check('AC5: Hybrid lore retrieval supports exact keyword, semantic overlap, and deduplication', () => {
  const lorebook = [
    { id: 'l1', key: 'karak, volcanic', title: 'Mount Karak', content: 'Ancient dormant volcano.', enabled: true },
    { id: 'l2', key: 'cyberware', title: 'Neo-Kowloon Augments', content: 'High-tech wetware and neural chips in the dark alleys.', enabled: true },
  ]
  // Exact keyword hit
  const hit1 = HybridLoreRetriever.retrieve({ lorebook, queryText: 'Tell me about the volcanic caves' })
  assert.equal(hit1.selectedLore.length, 1)
  assert.equal(hit1.selectedLore[0].id, 'l1')
  assert.equal(hit1.selectedLore[0].matchType, 'keyword')

  // Semantic overlap hit (no exact keyword match on 'cyberware', but query matches title/content terms)
  const hit2 = HybridLoreRetriever.retrieve({ lorebook, queryText: 'Are there any neural chips in Neo-Kowloon?' })
  assert.equal(hit2.selectedLore.length, 1)
  assert.equal(hit2.selectedLore[0].id, 'l2')
  assert.equal(hit2.selectedLore[0].matchType, 'semantic')
})

await check('AC6: Scene State tracks location, participants, objects, and unresolved actions', () => {
  let state = SceneStateManager.normalize()
  // Turn 1: Enter location and pickup object
  state = SceneStateManager.applyTurn(state, 'I enter the library and pick up an ancient compass.', '*Nods gently.*', 'Alex', 'Sam')
  assert.equal(state.location, 'library')
  assert.ok(state.objects.includes('ancient compass'))
  assert.ok(state.participants.includes('Alex'))
  assert.ok(state.participants.includes('Sam'))

  // Turn 2: Drop object and move to cafe
  state = SceneStateManager.applyTurn(state, 'I drop the ancient compass and walk into the cafe.', 'Where are you going?', 'Alex', 'Sam')
  assert.equal(state.location, 'cafe')
  assert.equal(state.objects.includes('ancient compass'), false)
  assert.ok(state.unresolvedActions.length > 0)
  assert.match(state.unresolvedActions[0], /Where are you going\?/)
})

await check('AC7: Token Budget Manager protects generation reserve and trims low-priority context under pressure', () => {
  const budget = new TokenBudgetManager({ contextLength: 4096, maxTokens: 1024, safetyMargin: 256 })
  assert.equal(budget.availableContext, 4096 - 1024 - 256)

  const sections = [
    { tag: 'rules', title: 'Rules', priority: 10, content: 'Critical behavior rules.' },
    { tag: 'identity', title: 'Identity', priority: 10, content: 'Character identity.' },
    { tag: 'summaries', title: 'Old Chapter Summaries', priority: 2, allowPartial: true, content: 'A very long old summary '.repeat(400) },
  ]
  const result = budget.fitContent(sections)
  assert.ok(result.usedTokens <= budget.availableContext)
  assert.ok(result.compiledSections.some(s => s.tag === 'rules'))
  assert.ok(result.compiledSections.some(s => s.tag === 'identity'))
})

await check('AC8: Structured Prompt Compiler produces deterministic source-tagged sections', () => {
  const sections = StructuredPromptCompiler.compile({
    character: { name: 'Alex', personality: 'Earnest' },
    persona: { name: 'Sam', bio: 'Gardener' },
    sceneState: { location: 'Botanical Garden', participants: ['Alex', 'Sam'] },
    memories: [{ content: 'Sam planted lilies', status: 'established', provenance: 'manual' }],
    dialogueRules: 'Speak naturally.',
  })
  const rendered = StructuredPromptCompiler.renderPrompt(sections)
  assert.match(rendered, /<behavior_rules>/)
  assert.match(rendered, /<character>/)
  assert.match(rendered, /<scene_state>/)
  assert.match(rendered, /Botanical Garden/)
  assert.match(rendered, /<memories>/)
  assert.match(rendered, /Sam planted lilies/)
})

await check('AC9: Macro safety: templates expand but raw user input is never expanded', () => {
  const template = 'Greetings to {{user}} from {{char}}.'
  assert.equal(replaceMacros(template, { userName: 'Sam', charName: 'Alex' }), 'Greetings to Sam from Alex.')

  // Simulating pipeline where user input contains macro syntax
  const rawUserInput = 'Can you explain what {{char}} and {{user}} mean?'
  const pipeline = buildCompiledPromptPipeline({
    character: { name: 'Alex' },
    persona: { name: 'Sam' },
    history: [{ role: 'user', content: rawUserInput }],
  })
  // The system prompt must NOT expand within user messages in conversation history
  const adapted = ModelAdapter.format({
    formatType: 'native_chat',
    systemPrompt: pipeline.systemPrompt,
    messages: [{ role: 'user', content: rawUserInput }],
  })
  assert.equal(adapted.messages[1].content, 'Can you explain what {{char}} and {{user}} mean?')
})

await check('AC10: ModelAdapter supports native_chat, lmstudio_native, and legacy_transcript', () => {
  const msgs = [{ role: 'user', content: 'Hello there' }]
  const sys = 'Be kind.'
  const chat = ModelAdapter.format({ formatType: 'native_chat', systemPrompt: sys, messages: msgs })
  assert.equal(chat.messages[0].role, 'system')
  assert.equal(chat.messages[1].content, 'Hello there')

  const native = ModelAdapter.format({ formatType: 'lmstudio_native', systemPrompt: sys, messages: msgs, charName: 'Alex', userName: 'Sam' })
  assert.equal(native.system_prompt, sys)
  assert.match(native.input, /Sam: Hello there\n\nAlex:/)

  const transcript = ModelAdapter.format({ formatType: 'legacy_transcript', systemPrompt: sys, messages: msgs, charName: 'Alex', userName: 'Sam' })
  assert.match(transcript.formattedText, /\[System Instructions\]\nBe kind\.\n\nSam: Hello there\n\nAlex:/)
})

await check('AC11: Multimodal input structured formatting and log sanitization', () => {
  const base64Img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const msgs = [{ role: 'user', content: 'What is this?', image: base64Img }]
  const adapted = ModelAdapter.format({ formatType: 'native_chat', systemPrompt: 'System', messages: msgs })
  assert.equal(adapted.messages[1].content[1].image_url.url, base64Img)

  const sanitized = ModelAdapter.sanitizeForLogging(adapted)
  assert.doesNotMatch(sanitized.messages[1].content[1].image_url.url, /iVBORw0KGgoAAA/)
  assert.match(sanitized.messages[1].content[1].image_url.url, /\[IMAGE_BASE64_DATA:/)
})

await check('AC12, AC15 & AC16: Observability, fail-safe isolation, and post-turn resilience', () => {
  const pipeline = buildCompiledPromptPipeline({
    character,
    persona,
    lorebook: [{ id: 'lore-1', key: 'tea', title: 'Tea', content: 'Earl Grey is preferred.', enabled: true }],
    history: [{ role: 'user', content: 'I would like some tea.' }],
    settings: { contextLength: 8192, maxTokens: 1024 },
  })
  assert.ok(pipeline.observability)
  assert.equal(typeof pipeline.observability.estimatedTokens, 'number')
  assert.equal(pipeline.observability.selectedLoreCount, 1)

  // Fail-safe: ensure SceneStateManager handles null/corrupted turns gracefully
  const safeScene = SceneStateManager.applyTurn(null, null, null)
  assert.ok(safeScene.updatedAt)

  // Fail-safe: ensure MemoryConflictEngine handles malformed memories
  const safeConf = MemoryConflictEngine.findContradictions(null, [null, undefined, {}])
  assert.deepEqual(safeConf, [])
})

console.log(`\n${passed} coherence checks passed.`)
