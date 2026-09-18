// Brain data transformations. Persistence and request scheduling belong to App/storageService.
export const AUTO_LEARN_REPLY_INTERVAL = 8
export const isAutoLearnDue = brain => (brain?.repliesSinceLearning || 0) >= AUTO_LEARN_REPLY_INTERVAL
export const BRAIN_VERSION = 3
export const MEMORY_STATUSES = ['established', 'tentative', 'superseded', 'needs_review']
export const emptyUserProfile = () => ({ summary: '', personalityTraits: [], dialogueStyle: '', likes: [], dislikes: [], recurringLore: [], source: 'manual', status: 'established' })

export function fingerprint(value) {
  const text = JSON.stringify(value)
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return (hash >>> 0).toString(16)
}

export function cardContext(character = {}) {
  return Object.fromEntries(['name', 'tagline', 'category', 'tags', 'personality', 'scenario', 'systemPrompt', 'greeting'].map(key => [key, character[key] || '']))
}

export function eligibleMessages(session) {
  return (session.messages || []).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim() && !m.control && !m.failed && m.complete !== false && !/^\*\[(?:Error:|Connection error:)/.test(m.content))
}

export const messageFingerprint = m => fingerprint([m.role, m.content, m.image || null])
export const messageKey = (m, index) => m.id || `legacy-${index}-${messageFingerprint(m)}`
export const sessionFingerprint = session => fingerprint(eligibleMessages(session).map((m, i) => [messageKey(m, i), messageFingerprint(m)]))
export const learningFingerprint = sessions => fingerprint(sessions.map(s => [s.id, sessionFingerprint(s)]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))

export function createBrain(character = {}, persona = null) {
  const context = cardContext(character)
  return {
    schemaVersion: BRAIN_VERSION, characterId: character.id || '', revision: 0,
    enabled: true, autoLearn: true, repliesSinceLearning: 0, lastAnalyzedTimestamp: null,
    characterContext: context, cardFingerprint: fingerprint(context), personaFingerprint: fingerprint(persona),
    userProfile: emptyUserProfile(), memories: [], sessionSummaries: [], excludedMemories: [],
  }
}

const confidence = value => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
export const memorySignature = memory => String(memory.content || '').trim().toLowerCase().replace(/\s+/g, ' ')

export function normalizeBrain(input, character = {}, persona = null) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Brain must be a JSON object.')
  if (!['memories', 'sessionSummaries', 'userProfile', 'characterContext'].some(key => key in input)) throw new Error('This JSON does not contain a compatible brain backup.')
  for (const key of ['memories', 'sessionSummaries']) {
    if (input[key] !== undefined && !Array.isArray(input[key])) throw new Error(`Brain ${key} must be an array.`)
  }
  const base = createBrain(character, persona)
  const legacy = input.schemaVersion !== BRAIN_VERSION
  const wrongOwner = Boolean(input.characterId && input.characterId !== character.id)
  const profile = input.userProfile || {}
  const memories = (input.memories || []).filter(m => m && typeof m.content === 'string').map((m, i) => {
    const manual = m.provenance === 'manual' || m.source === 'User Manual Entry'
    const status = wrongOwner ? 'needs_review' : legacy ? (manual ? 'established' : 'needs_review') : MEMORY_STATUSES.includes(m.status) ? m.status : 'needs_review'
    const importance = Number.isFinite(m.importance) ? Math.min(1, Math.max(0, m.importance)) : 0.6
    const type = m.type || m.kind || 'user_fact'
    const createdAt = Number.isFinite(m.createdAt) ? m.createdAt : 0
    const updatedAt = Number.isFinite(m.updatedAt) ? m.updatedAt : createdAt
    return {
      ...m,
      id: String(m.id || `legacy-${i}-${fingerprint(m.content)}`),
      content: m.content || m.text || '',
      text: m.text || m.content || '',
      type,
      importance,
      status,
      confidence: confidence(m.confidence),
      provenance: manual ? 'manual' : legacy ? 'legacy' : m.provenance || 'legacy',
      evidence: Array.isArray(m.evidence) ? m.evidence.filter(e => e && typeof e === 'object') : [],
      subject: m.subject || 'relationship',
      kind: m.kind || type || 'impression',
      source: typeof m.source === 'string' ? m.source : 'Unverified source',
      category: typeof m.category === 'string' ? m.category : 'context',
      createdAt,
      updatedAt: m.updatedAt || createdAt,
      supersedes: Array.isArray(m.supersedes) ? m.supersedes : [],
    }
  })
  // Legacy profiles mixed character traits and user observations. Preserve each field for review.
  if (legacy) {
    for (const [key, value] of Object.entries(profile)) {
      if (!value || (Array.isArray(value) && !value.length)) continue
      const content = `Legacy ${key}: ${Array.isArray(value) ? value.join('; ') : String(value)}`
      memories.push({
        id: `legacy-profile-${key}`,
        content,
        text: content,
        type: 'impression',
        importance: 0.6,
        category: 'context',
        status: 'needs_review',
        confidence: 0,
        provenance: 'legacy',
        evidence: [],
        subject: 'user',
        kind: 'impression',
        source: 'Legacy profile (unverified)',
        createdAt: 0,
        updatedAt: 0,
        supersedes: [],
      })
    }
  }
  const normalizedProfile = { ...emptyUserProfile(), ...(!legacy ? profile : {}) }
  for (const key of ['personalityTraits', 'likes', 'dislikes', 'recurringLore']) normalizedProfile[key] = Array.isArray(normalizedProfile[key]) ? normalizedProfile[key].filter(v => typeof v === 'string') : []
  for (const key of ['summary', 'dialogueStyle']) normalizedProfile[key] = typeof normalizedProfile[key] === 'string' ? normalizedProfile[key] : ''
  if (wrongOwner) normalizedProfile.status = 'needs_review'
  return {
    ...base, ...input, schemaVersion: BRAIN_VERSION, characterId: character.id || '',
    revision: Number.isFinite(input.revision) ? input.revision : 0,
    enabled: input.enabled !== false, autoLearn: input.autoLearn !== false,
    repliesSinceLearning: !wrongOwner && Number.isSafeInteger(input.repliesSinceLearning) && input.repliesSinceLearning >= 0 ? input.repliesSinceLearning : 0,
    characterContext: base.characterContext, userProfile: normalizedProfile, memories,
    sessionSummaries: (input.sessionSummaries || []).filter(s => s && typeof s.summary === 'string').map(s => ({ ...s, status: legacy || wrongOwner ? 'needs_review' : s.status || 'established' })),
    excludedMemories: Array.isArray(input.excludedMemories) ? input.excludedMemories : [],
    ...(legacy ? { legacyArchive: input, cardFingerprint: base.cardFingerprint, personaFingerprint: base.personaFingerprint } : {}),
  }
}

export function reconcileBrain(input, character, persona, sessions = []) {
  const brain = normalizeBrain(input || createBrain(character, persona), character, persona)
  const cardChanged = brain.cardFingerprint !== fingerprint(cardContext(character))
  const personaChanged = brain.personaFingerprint !== fingerprint(persona)
  const sources = new Map(sessions.map(s => [s.id, new Map(eligibleMessages(s).map((m, i) => [messageKey(m, i), messageFingerprint(m)]))]))
  return {
    ...brain, characterContext: cardContext(character), cardFingerprint: fingerprint(cardContext(character)), personaFingerprint: fingerprint(persona),
    userProfile: personaChanged ? { ...brain.userProfile, status: 'needs_review' } : brain.userProfile,
    memories: brain.memories.map(m => {
      if (m.status === 'superseded') return m
      const invalidEvidence = m.provenance === 'conversation' && (!m.evidence.length || m.evidence.some(e => sources.get(e.sessionId)?.get(e.messageId) !== e.fingerprint))
      const invalidBackstory = m.provenance === 'card' && (!m.evidence.length || m.evidence.some(e => e.cardFingerprint !== fingerprint(cardContext(character)) || typeof e.quote !== 'string' || !e.quote || typeof character[e.field] !== 'string' || !character[e.field].includes(e.quote)))
      return invalidEvidence || invalidBackstory || ((cardChanged || personaChanged) && m.provenance !== 'manual') || (personaChanged && m.subject === 'user')
        ? { ...m, status: 'needs_review' } : m
    }),
    sessionSummaries: brain.sessionSummaries.map(s => {
      const session = sessions.find(item => item.id === s.sessionId)
      return !session || cardChanged || personaChanged || s.sourceFingerprint !== sessionFingerprint(session) ? { ...s, status: 'needs_review' } : s
    }),
  }
}

export function selectMemories(brain, history = [], limit = 10, now = Date.now(), returnDetails = false) {
  const active = (brain?.memories || []).filter(m => ['established', 'tentative'].includes(m.status) && m.confidence >= 0.6 && (m.content || m.text) && (m.provenance === 'manual' || (['conversation', 'card'].includes(m.provenance) && m.evidence?.length)))
  // Fast path: skip scoring when all eligible memories fit within the limit
  if (active.length <= limit && !returnDetails) return active
  const words = new Set(history.slice(-4).map(m => m.content || '').join(' ').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
  const scored = active
    .map(m => {
      const text = m.content || m.text || ''
      const overlap = new Set(text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
      const relevance = [...overlap].filter(word => words.has(word)).length
      const ageDays = Math.max(0, now - (m.updatedAt || m.createdAt || 0)) / 86400000
      const recencyBoost = 1 / (1 + ageDays)
      const importance = Number.isFinite(m.importance) ? m.importance : 0.6
      // Enhanced scoring formula: keyword relevance + confidence + importance + recency
      const score = (relevance * 3.5) + (m.confidence * 1.5) + (importance * 2.0) + recencyBoost
      return { memory: m, score, relevance, importance, recencyBoost }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return returnDetails ? scored : scored.map(item => item.memory)
}

// Chunk complete transcripts without discarding late turns or the tail of long messages.
// Larger chunks reduce LLM call count; most sessions under 15 messages become single-chunk.
export function sessionChunks(session, maxChars = 10000) {
  const chunks = []
  let chunk = [], size = 0
  for (const [index, message] of eligibleMessages(session).entries()) {
    for (let offset = 0; offset < message.content.length; offset += maxChars) {
      const content = message.content.slice(offset, offset + maxChars)
      if (chunk.length && (size + content.length > maxChars || chunk.length >= 20)) { chunks.push(chunk); chunk = []; size = 0 }
      chunk.push({ id: messageKey(message, index), role: message.role, content, fingerprint: messageFingerprint(message) })
      size += content.length
    }
  }
  if (chunk.length) chunks.push(chunk)
  return chunks
}

export function validateLearningResult(result, chunk) {
  if (!result || typeof result.summary !== 'string' || !result.summary.trim() || !Array.isArray(result.memories)) throw new Error('Memory analysis returned an incomplete result; existing data was preserved.')
  const ids = new Set(chunk.map(m => m.id))
  for (const m of result.memories) {
    if (!m || typeof m.content !== 'string' || !m.content.trim() || !['established', 'tentative'].includes(m.status) || !['user', 'character', 'relationship'].includes(m.subject) || !['user_fact', 'character_fact', 'scene_event', 'preference', 'impression'].includes(m.kind) || !['preferences', 'behavior', 'style', 'context', 'lore', 'facts'].includes(m.category) || !Number.isFinite(m.confidence) || m.confidence < 0 || m.confidence > 1 || !Array.isArray(m.evidenceMessageIds) || !m.evidenceMessageIds.length || m.evidenceMessageIds.some(id => !ids.has(id)) || !Array.isArray(m.supersedes) || m.supersedes.some(id => typeof id !== 'string')) throw new Error('Memory analysis returned invalid evidence or fields; existing data was preserved.')
  }
  return result
}

export function applyLearningResult(brain, result, session, chunk, now = Date.now()) {
  validateLearningResult(result, chunk)
  let memories = [...brain.memories]
  for (const item of result.memories) {
    if (brain.excludedMemories.includes(memorySignature(item))) continue
    const evidence = item.evidenceMessageIds.map(id => { const m = chunk.find(entry => entry.id === id); return { sessionId: session.id, messageId: id, fingerprint: m.fingerprint, role: m.role } })
    // Character dialogue alone cannot establish a fact about the user's private life.
    const supportedUserFact = item.subject !== 'user' || evidence.some(e => e.role === 'user')
    const status = item.kind === 'impression' || !supportedUserFact ? 'tentative' : item.status
    const replacement = { ...item, id: `learned-${fingerprint([session.id, item.content, evidence])}`, status, provenance: 'conversation', evidence, createdAt: now, updatedAt: now, source: `Conversation: ${session.title || session.id}` }
    delete replacement.evidenceMessageIds
    delete replacement.supersedes
    const duplicate = memories.find(m => memorySignature(m) === memorySignature(item))
    if (duplicate?.provenance === 'manual' || duplicate?.status === 'superseded') continue
    if (duplicate) replacement.id = duplicate.id
    const canCorrect = status === 'established' && evidence.some(e => e.role === 'user')
    memories = memories.map(m => m.id === duplicate?.id ? replacement : canCorrect && item.supersedes.includes(m.id) && m.provenance !== 'manual' ? { ...m, status: 'superseded', supersededBy: replacement.id } : m)
    if (!duplicate) memories.push(replacement)
  }
  return { ...brain, memories }
}
