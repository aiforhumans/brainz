import React, { useState } from 'react'
import {
  X,
  User,
  Brain,
  BookOpen,
  Zap,
  Sparkles,
  MapPin,
  Users,
  Compass,
  Star,
  ExternalLink,
  Tag,
} from 'lucide-react'
import { AvatarImage } from './AvatarImage'
import { replaceMacros } from '../utils/macroUtils.js'
import { estimateTokens } from '../services/pipelineEngine.js'

export function InspectorPanel({
  isOpen,
  onClose,
  character,
  session,
  brain,
  lorebook = [],
  recentMessages = [],
  promptPipeline,
  userPersona,
  onOpenCharacterStudio,
  onOpenBrain,
  onOpenLorebook,
}) {
  const [activeTab, setActiveTab] = useState('overview')

  if (!isOpen || !character) return null

  // Extract memories from brain & prompt pipeline
  const memories = Array.isArray(brain?.memories) ? brain.memories : []
  const establishedMemories = memories.filter((m) => m.status === 'established' || !m.status)
  const selectedMemories = promptPipeline?.selectedMemories || []
  const repliesSinceLearning = brain?.repliesSinceLearning || 0

  // Partner model from brain or userPersona
  const userProfile = brain?.userProfile || {}
  const partnerName = userPersona?.name?.trim() || 'User'
  const partnerBio = userProfile.summary || userPersona?.bio || 'Regular conversation partner'
  const partnerStyle = userProfile.dialogueStyle || userPersona?.dialogueStyle || 'Natural conversation'
  const partnerTraits = Array.isArray(userProfile.personalityTraits) ? userProfile.personalityTraits : []
  const partnerLikes = Array.isArray(userProfile.likes) ? userProfile.likes : []

  // Chapter / Session summaries
  const sessionSummaries = Array.isArray(brain?.sessionSummaries) ? brain.sessionSummaries : []

  // Lore selection: use compiler pipeline's selectedLore or fall back to keyword match
  const recentText = recentMessages
    .slice(-4)
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join(' ')
    .toLowerCase()

  const activeLore = (promptPipeline?.selectedLore && promptPipeline.selectedLore.length > 0)
    ? promptPipeline.selectedLore
    : lorebook.filter((entry) => {
        if (!entry.enabled) return false
        const keys = (entry.key || '').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
        return keys.some((k) => recentText.includes(k))
      })

  // Scene state from active session or brain
  const sceneState = session?.sceneState || brain?.sceneState || {}

  // Context token breakdown from observability pipeline
  const observability = promptPipeline?.observability || {}
  const rawHistory = Array.isArray(recentMessages) ? recentMessages : []

  const memoryTokens = selectedMemories.reduce((acc, m) => acc + estimateTokens(m.content || m.text || ''), 0)
  const loreTokens = observability.loreTokens ?? activeLore.reduce((acc, l) => acc + estimateTokens(l.content || ''), 0)
  const rawHistoryTokens = rawHistory.reduce((acc, m) => acc + estimateTokens(m.content || '') + (m.image ? 250 : 0) + 4, 0)
  const historyTokens = observability.historyTokens ?? rawHistoryTokens
  const totalSystemTokens = observability.estimatedTokens || estimateTokens(promptPipeline?.systemPrompt || '')
  const systemDirectivesTokens = Math.max(0, totalSystemTokens - memoryTokens - loreTokens)
  const totalInputTokens = observability.totalInputTokens ?? (totalSystemTokens + historyTokens)

  const availableContext = observability.availableContext || 7168
  const generationReserve = observability.generationReserve || 1024
  const contextLength = availableContext + generationReserve
  const headroomTokens = Math.max(0, availableContext - totalInputTokens)
  const contextPercentage = Math.min(100, Math.round((totalInputTokens / availableContext) * 100))
  const droppedChatCount = observability.droppedHistoryCount || 0
  const fittedHistoryCount = observability.fittedHistoryCount || rawHistory.length

  // Proportional segment widths for multi-segment token bar
  const systemWidth = Math.max(2, (systemDirectivesTokens / contextLength) * 100)
  const memoryWidth = memoryTokens > 0 ? Math.max(2, (memoryTokens / contextLength) * 100) : 0
  const loreWidth = loreTokens > 0 ? Math.max(2, (loreTokens / contextLength) * 100) : 0
  const historyWidth = Math.max(2, (historyTokens / contextLength) * 100)
  const headroomWidth = Math.max(0, (headroomTokens / contextLength) * 100)

  return (
    <aside className="inspector-panel" aria-label="Context Inspector">
      {/* Header */}
      <div className="inspector-header">
        <div className="inspector-title">
          <Sparkles size={16} className="icon-purple" />
          <span>Workspace Inspector</span>
        </div>
        <button
          type="button"
          className="btn-nav-icon btn-nav-icon--sm"
          onClick={onClose}
          title="Close Inspector"
          aria-label="Close Inspector"
        >
          <X size={15} />
        </button>
      </div>

      {/* Bento Tabs */}
      <div className="inspector-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`inspector-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <User size={13} />
          <span>Overview</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'mind'}
          className={`inspector-tab-btn ${activeTab === 'mind' ? 'active' : ''}`}
          onClick={() => setActiveTab('mind')}
        >
          <Brain size={13} />
          <span>Mind</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'lore'}
          className={`inspector-tab-btn ${activeTab === 'lore' ? 'active' : ''}`}
          onClick={() => setActiveTab('lore')}
        >
          <BookOpen size={13} />
          <span>Lore</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'context'}
          className={`inspector-tab-btn ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          <Zap size={13} />
          <span>Context</span>
        </button>
      </div>

      {/* Body Content */}
      <div className="inspector-body">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* Identity Card */}
            <div className="inspector-card">
              <div className="inspector-card-title">
                <span>Active Persona</span>
                {character.nsfw && <span className="nsfw-badge-sm">18+</span>}
              </div>
              <div className="chat-header-info">
                <div className="chat-header-avatar">
                  <AvatarImage
                    src={character.avatar}
                    alt={character.name}
                    fallbackContent={character.name?.charAt(0)}
                    fallbackStyle={{ background: character.avatarFallbackBg || undefined }}
                    isNsfw={character.nsfw}
                  />
                </div>
                <div className="chat-header-text">
                  <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{character.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {character.tagline || 'Roleplay companion'}
                  </p>
                </div>
              </div>
              {character.personality && (
                <div className="inspector-card-subtext" style={{ fontStyle: 'italic' }}>
                  "{character.personality.slice(0, 140)}..."
                </div>
              )}
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={onOpenCharacterStudio}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ExternalLink size={13} />
                <span>Open in Character Studio</span>
              </button>
            </div>

            {/* Live Scene State Card */}
            <div className="inspector-card">
              <div className="inspector-card-title">
                <span>Scene State Tracking</span>
                <Compass size={13} className="icon-purple" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                  <MapPin size={14} className="icon-muted" />
                  <span style={{ color: 'var(--text-dim)' }}>Location:</span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {sceneState.location || 'Flowing with narrative'}
                  </strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                  <Users size={14} className="icon-muted" />
                  <span style={{ color: 'var(--text-dim)' }}>Present:</span>
                  <strong style={{ color: 'var(--text-main)' }}>
                    {Array.isArray(sceneState.participants) && sceneState.participants.length > 0
                      ? sceneState.participants.join(', ')
                      : `${character.name}, You`}
                  </strong>
                </div>
                {sceneState.unresolvedActions && sceneState.unresolvedActions.length > 0 && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--primary-hover)' }}>Pending:</span> {sceneState.unresolvedActions.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Scenario & World Setting Card */}
            {character.scenario && (
              <div className="inspector-card">
                <div className="inspector-card-title">
                  <span>Scenario & World Setting</span>
                  <Sparkles size={13} className="icon-purple" />
                </div>
                <div className="inspector-scenario-content">
                  {replaceMacros(character.scenario, {
                    userName: userPersona?.name || 'User',
                    charName: character.name,
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: MIND */}
        {activeTab === 'mind' && (
          <>
            {/* Stat Grid */}
            <div className="inspector-stat-grid">
              <div className="inspector-stat-box">
                <div className="inspector-stat-num">{establishedMemories.length}</div>
                <div className="inspector-stat-label">Established Memories</div>
              </div>
              <div className="inspector-stat-box">
                <div className="inspector-stat-num">{selectedMemories.length}</div>
                <div className="inspector-stat-label">Active in Context</div>
              </div>
            </div>

            {/* Auto-Learn Progress Card */}
            <div className="inspector-card">
              <div className="inspector-card-title">
                <span>Autonomous Learning</span>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                  {repliesSinceLearning}/8 turns
                </span>
              </div>
              <div className="inspector-progress-track">
                <div
                  className="inspector-progress-fill"
                  style={{ width: `${Math.min(100, (repliesSinceLearning / 8) * 100)}%` }}
                />
              </div>
              <div className="inspector-card-subtext" style={{ fontSize: '0.74rem', marginTop: '2px' }}>
                {repliesSinceLearning >= 8
                  ? 'Synthesizing new long-term memories in background...'
                  : `${8 - repliesSinceLearning} turn${8 - repliesSinceLearning === 1 ? '' : 's'} remaining until next autonomous memory synthesis.`}
              </div>
            </div>

            {/* Conversation Partner Model (Mindprint) */}
            <div className="inspector-card">
              <div className="inspector-card-title">
                <span>Partner Model: {partnerName}</span>
                <User size={13} className="icon-purple" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
                  {partnerBio}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Dialogue Style:</span> {partnerStyle}
                </div>

                {partnerTraits.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {partnerTraits.map((t, i) => (
                      <span key={i} className="badge badge-subtle" style={{ fontSize: '0.68rem' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {partnerLikes.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                    {partnerLikes.map((like, i) => (
                      <span key={i} className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                        ♥ {like}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Subconscious Memories Bank */}
            <div className="inspector-card">
              <div className="inspector-card-title">
                <span>Subconscious Memories</span>
                <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                  {memories.length} total
                </span>
              </div>

              <div className="inspector-memory-list">
                {memories.length === 0 ? (
                  <div className="inspector-card-subtext">
                    No subconscious memories synthesized yet. Auto-Learn extracts facts, dynamics, and preferences automatically every 8 turns.
                  </div>
                ) : (
                  memories.slice(0, 8).map((m, idx) => {
                    const isSelected = selectedMemories.some((sm) => sm.id === m.id)
                    return (
                      <div
                        key={m.id || idx}
                        className="inspector-memory-item"
                        style={isSelected ? { borderColor: 'rgba(139, 92, 246, 0.35)', background: 'rgba(139, 92, 246, 0.05)' } : {}}
                      >
                        <div className="inspector-memory-header">
                          <span className="badge badge-subtle">{m.category || m.type || 'fact'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isSelected && (
                              <span className="badge badge-active" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                                In Prompt
                              </span>
                            )}
                            <Star size={10} fill="currentColor" className="icon-purple" />
                            <span>{m.confidence ? `${Math.round(m.confidence * 100)}%` : '90%'}</span>
                          </div>
                        </div>
                        <div className="inspector-memory-text">{m.content || m.text}</div>
                      </div>
                    )
                  })
                )}
              </div>

              {sessionSummaries.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div className="inspector-card-title" style={{ marginBottom: '6px' }}>
                    <span>Archived Chapter Summaries</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      {sessionSummaries.length}
                    </span>
                  </div>
                  {sessionSummaries.slice(0, 2).map((s, idx) => (
                    <div key={idx} className="inspector-card-subtext" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>
                      <strong>{s.title || `Chapter ${idx + 1}`}:</strong> {s.summary}
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={onOpenBrain}
                style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
              >
                <ExternalLink size={13} />
                <span>Open Full Mind Studio</span>
              </button>
            </div>
          </>
        )}

        {/* TAB 3: LORE */}
        {activeTab === 'lore' && (
          <>
            <div className="inspector-stat-grid">
              <div className="inspector-stat-box">
                <div className="inspector-stat-num">{activeLore.length}</div>
                <div className="inspector-stat-label">Active in Scene</div>
              </div>
              <div className="inspector-stat-box">
                <div className="inspector-stat-num">{lorebook.length}</div>
                <div className="inspector-stat-label">Total Lore Entries</div>
              </div>
            </div>

            {/* Active Turn-Triggered Lore */}
            <div className="inspector-card">
              <div className="inspector-card-title">
                <span>Active in Prompt Context</span>
                <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>
                  {activeLore.length} Active
                </span>
              </div>

              {activeLore.length === 0 ? (
                <div className="inspector-card-subtext">
                  0 lore entries matched in the current scene. Mention lore topics or locations in chat to automatically pull them into the AI prompt.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activeLore.map((item) => (
                    <div key={item.id} className="inspector-lore-item">
                      <div className="inspector-lore-header">
                        <span>{item.title || item.key}</span>
                        <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                          {item.key}
                        </span>
                      </div>
                      <div className="inspector-lore-content">{item.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lorebook Library List */}
            <div className="inspector-card">
              <div className="inspector-card-title">
                <span>World Lorebook Library</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  {lorebook.length} registered
                </span>
              </div>

              {lorebook.length === 0 ? (
                <div className="inspector-card-subtext">
                  Your lorebook is empty. Add world setting facts, factions, locations, and lore to enrich your roleplay.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {lorebook.map((entry) => {
                    const isActive = activeLore.some((a) => a.id === entry.id || a.key === entry.key)
                    return (
                      <div
                        key={entry.id}
                        className={`inspector-lore-library-item ${isActive ? 'active' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                            {entry.title || entry.key}
                          </strong>
                          {isActive ? (
                            <span className="inspector-badge-active">
                              <Sparkles size={10} /> Active
                            </span>
                          ) : (
                            <span className="inspector-badge-standby">Standby</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Tag size={11} className="icon-muted" />
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary-hover)' }}>
                            {entry.key}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {entry.content.slice(0, 110)}
                          {entry.content.length > 110 ? '...' : ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={onOpenLorebook}
                style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
              >
                <ExternalLink size={13} />
                <span>Manage World Lorebook</span>
              </button>
            </div>
          </>
        )}

        {/* TAB 4: CONTEXT & TOKENS */}
        {activeTab === 'context' && (
          <div className="inspector-card">
            <div className="inspector-card-title">
              <span>Token Budget Breakdown</span>
              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                ~{totalInputTokens} / {availableContext} In
              </span>
            </div>

            {/* Multi-Segment Token Visualizer */}
            <div className="inspector-token-bar" title={`Total Input: ~${totalInputTokens} tokens (${contextPercentage}%)`}>
              <div
                className="token-bar-seg seg-system"
                style={{ width: `${systemWidth}%` }}
                title={`System & Persona: ~${systemDirectivesTokens} tok`}
              />
              {memoryWidth > 0 && (
                <div
                  className="token-bar-seg seg-memory"
                  style={{ width: `${memoryWidth}%` }}
                  title={`Subconscious Memories: ~${memoryTokens} tok`}
                />
              )}
              {loreWidth > 0 && (
                <div
                  className="token-bar-seg seg-lore"
                  style={{ width: `${loreWidth}%` }}
                  title={`World Lorebook: ~${loreTokens} tok`}
                />
              )}
              <div
                className="token-bar-seg seg-history"
                style={{ width: `${historyWidth}%` }}
                title={`Chat Turns: ~${historyTokens} tok`}
              />
              <div
                className="token-bar-seg seg-headroom"
                style={{ width: `${headroomWidth}%` }}
                title={`Free Headroom: ~${headroomTokens} tok`}
              />
            </div>

            {/* Legend */}
            <div className="inspector-token-legend">
              <div className="token-legend-item">
                <span className="token-legend-dot" style={{ background: '#a855f7' }} />
                <span>System ({systemDirectivesTokens})</span>
              </div>
              <div className="token-legend-item">
                <span className="token-legend-dot" style={{ background: '#06b6d4' }} />
                <span>Memory ({memoryTokens})</span>
              </div>
              <div className="token-legend-item">
                <span className="token-legend-dot" style={{ background: '#10b981' }} />
                <span>Lore ({loreTokens})</span>
              </div>
              <div className="token-legend-item">
                <span className="token-legend-dot" style={{ background: '#f59e0b' }} />
                <span>Chat ({historyTokens})</span>
              </div>
            </div>

            {/* 4 Core Stat Boxes with REAL numbers */}
            <div className="inspector-stat-grid">
              <div className="inspector-stat-box">
                <div className="inspector-stat-num">{systemDirectivesTokens}</div>
                <div className="inspector-stat-label">System Directives</div>
              </div>
              <div className="inspector-stat-box">
                <div className="inspector-stat-num">{memoryTokens}</div>
                <div className="inspector-stat-label">
                  Active Memories ({selectedMemories.length})
                </div>
              </div>
              <div className="inspector-stat-box">
                <div className="inspector-stat-num">{loreTokens}</div>
                <div className="inspector-stat-label">
                  Lorebook Context ({activeLore.length})
                </div>
              </div>
              <div className="inspector-stat-box">
                <div className="inspector-stat-num">{historyTokens}</div>
                <div className="inspector-stat-label">
                  Chat Turns ({fittedHistoryCount})
                </div>
              </div>
            </div>

            {/* Context Limit & Reserve Specs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px', fontSize: '0.74rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Free Input Headroom:</span>
                <strong style={{ color: 'var(--text-main)' }}>~{headroomTokens} tokens</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Output Generation Reserve:</span>
                <strong style={{ color: 'var(--primary-hover)' }}>{generationReserve} tokens</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Total Context Window:</span>
                <strong style={{ color: 'var(--text-main)' }}>{contextLength} tokens</strong>
              </div>
              {droppedChatCount > 0 && (
                <div style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '2px' }}>
                  Notice: {droppedChatCount} older turn{droppedChatCount === 1 ? '' : 's'} windowed to protect model context.
                </div>
              )}
            </div>

            <div className="inspector-card-subtext" style={{ marginTop: '8px' }}>
              All prompt sections are dynamically budgeted by LoreForge to protect output generation and ensure zero context window overflow.
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
