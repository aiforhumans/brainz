import React, { useState, useMemo } from 'react'
import {
  Brain,
  Layers,
  BookOpen,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Sliders,
  X,
  PieChart,
  HardDrive,
  Cpu,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { estimateTokens } from '../services/pipelineEngine.js'

export function TokenOverviewBar({
  brain,
  character,
  lorebook = [],
  messages = [],
  settings = {},
  userPersona = {},
  onOpenBrain,
  onOpenLorebook,
  promptPipeline = null,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'memories' | 'sections'

  // Calculations for memory bank
  const memoriesList = useMemo(() => brain?.memories || [], [brain?.memories])
  const summariesList = useMemo(() => brain?.sessionSummaries || [], [brain?.sessionSummaries])

  const stats = useMemo(() => {
    // Stored memories
    const totalMemories = memoriesList.length
    const totalMemoryTokens = memoriesList.reduce((acc, m) => acc + estimateTokens(m.text || ''), 0)

    // Active memories in prompt
    const selectedMemories = promptPipeline?.selectedMemories || []
    const selectedMemoryTokens = selectedMemories.reduce((acc, m) => acc + estimateTokens(m.text || ''), 0)
    const selectedMemoryIds = new Set(selectedMemories.map((m) => m.id))

    // Summaries
    const totalSummaries = summariesList.length
    const totalSummaryTokens = summariesList.reduce((acc, s) => acc + estimateTokens(s.text || ''), 0)
    const activeSummariesCount = Math.min(3, summariesList.filter((s) => s.status === 'established').length)

    // Lorebook
    const totalLoreEntries = lorebook.length
    const totalLoreTokens = lorebook.reduce((acc, l) => acc + estimateTokens(l.content || ''), 0)
    const activeLoreCount = promptPipeline?.observability?.selectedLoreCount || 0
    const activeLoreTokens = promptPipeline?.observability?.loreTokens || 0

    // Chat history in session
    const chatMessageCount = messages.length
    const chatTokens = messages.reduce((acc, m) => acc + estimateTokens(m.content || ''), 0)

    // User persona tokens
    const personaTokens = estimateTokens(`${userPersona?.name || ''} ${userPersona?.title || ''} ${userPersona?.bio || ''}`)

    // System prompt & Context budgets
    const contextLength = settings.contextLength || 8192
    const maxTokens = settings.maxTokens || 1024
    const availableContext = Math.max(contextLength - maxTokens, 500)
    const estimatedSystemTokens = promptPipeline?.observability?.estimatedTokens || 0

    // Total prompt input tokens (System prompt + conversation history)
    const totalInputTokens = estimatedSystemTokens + chatTokens
    const contextPercentage = Math.min(100, Math.round((totalInputTokens / availableContext) * 100))
    const headroomTokens = Math.max(0, availableContext - totalInputTokens)

    // Brain stats
    const revision = brain?.revision || 1
    const repliesSinceLearning = brain?.repliesSinceLearning || 0
    const avgConfidence = totalMemories > 0
      ? Math.round((memoriesList.reduce((acc, m) => acc + (m.confidence || 0.8), 0) / totalMemories) * 100)
      : 100

    return {
      totalMemories,
      totalMemoryTokens,
      selectedMemoriesCount: selectedMemories.length,
      selectedMemoryTokens,
      selectedMemoryIds,
      totalSummaries,
      totalSummaryTokens,
      activeSummariesCount,
      totalLoreEntries,
      totalLoreTokens,
      activeLoreCount,
      activeLoreTokens,
      chatMessageCount,
      chatTokens,
      contextLength,
      maxTokens,
      availableContext,
      estimatedSystemTokens,
      totalInputTokens,
      contextPercentage,
      personaTokens,
      headroomTokens,
      revision,
      repliesSinceLearning,
      avgConfidence,
      compiledSections: promptPipeline?.compiledSections || [],
    }
  }, [memoriesList, summariesList, promptPipeline, lorebook, messages, settings, userPersona, brain])

  // Context progress bar color
  const getProgressColorClass = (pct) => {
    if (pct > 90) return 'progress-critical'
    if (pct > 75) return 'progress-warning'
    return 'progress-normal'
  }

  return (
    <div className="token-overview-wrapper">
      {/* Expandable Drawer */}
      {isExpanded && (
        <div className="token-overview-drawer">
          <div className="token-overview-drawer-header">
            <div className="drawer-title-group">
              <PieChart size={16} className="drawer-icon" />
              <div>
                <h4 className="drawer-title">Token & Memory Diagnostics</h4>
                <p className="drawer-subtitle">
                  Active character: {character?.name || 'Unknown'} • Brain v{stats.revision}
                </p>
              </div>
            </div>

            <div className="drawer-header-actions">
              {onOpenBrain && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setIsExpanded(false)
                    onOpenBrain()
                  }}
                  title="Open Brain Data Bank modal"
                >
                  <Brain size={13} />
                  <span>Brain Bank</span>
                </button>
              )}
              {onOpenLorebook && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => {
                    setIsExpanded(false)
                    onOpenLorebook()
                  }}
                  title="Open Lorebook modal"
                >
                  <BookOpen size={13} />
                  <span>Lorebook</span>
                </button>
              )}
              <button
                type="button"
                className="btn-icon-close"
                onClick={() => setIsExpanded(false)}
                title="Close diagnostics"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Tab Strip */}
          <div className="token-drawer-tabs">
            <button
              type="button"
              className={`token-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Cpu size={13} />
              <span>Context & Budgets</span>
            </button>
            <button
              type="button"
              className={`token-tab-btn ${activeTab === 'memories' ? 'active' : ''}`}
              onClick={() => setActiveTab('memories')}
            >
              <Brain size={13} />
              <span>Memory Bank ({stats.totalMemories})</span>
            </button>
            <button
              type="button"
              className={`token-tab-btn ${activeTab === 'sections' ? 'active' : ''}`}
              onClick={() => setActiveTab('sections')}
            >
              <Layers size={13} />
              <span>Prompt Sections ({stats.compiledSections.length})</span>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="token-drawer-body">
            {activeTab === 'overview' && (
              <div className="token-overview-content">
                {/* 4 Diagnostic Metric Cards */}
                <div className="token-metrics-grid">
                  <div className="token-diag-card">
                    <div className="diag-card-header">
                      <Brain size={14} className="diag-icon diag-icon-purple" />
                      <span>Subconscious Memory</span>
                    </div>
                    <div className="diag-card-stat">
                      <span className="stat-number">{stats.totalMemoryTokens}</span>
                      <span className="stat-unit">tokens stored</span>
                    </div>
                    <div className="diag-card-details">
                      <span>{stats.totalMemories} memories in bank</span>
                      <span className="dot-sep">•</span>
                      <span className="highlight-val">{stats.selectedMemoriesCount} in prompt ({stats.selectedMemoryTokens} tok)</span>
                    </div>
                  </div>

                  <div className="token-diag-card">
                    <div className="diag-card-header">
                      <Layers size={14} className="diag-icon diag-icon-gold" />
                      <span>Session Summaries</span>
                    </div>
                    <div className="diag-card-stat">
                      <span className="stat-number">{stats.totalSummaryTokens}</span>
                      <span className="stat-unit">tokens total</span>
                    </div>
                    <div className="diag-card-details">
                      <span>{stats.totalSummaries} archived summaries</span>
                      <span className="dot-sep">•</span>
                      <span className="highlight-val">{stats.activeSummariesCount} active in context</span>
                    </div>
                  </div>

                  <div className="token-diag-card">
                    <div className="diag-card-header">
                      <BookOpen size={14} className="diag-icon diag-icon-cyan" />
                      <span>World Lorebook</span>
                    </div>
                    <div className="diag-card-stat">
                      <span className="stat-number">{stats.activeLoreTokens}</span>
                      <span className="stat-unit">tokens active</span>
                    </div>
                    <div className="diag-card-details">
                      <span>{stats.activeLoreCount} matched in scene</span>
                      <span className="dot-sep">•</span>
                      <span>{stats.totalLoreEntries} total entries ({stats.totalLoreTokens} tok)</span>
                    </div>
                  </div>

                  <div className="token-diag-card">
                    <div className="diag-card-header">
                      <HardDrive size={14} className="diag-icon diag-icon-emerald" />
                      <span>Context Window</span>
                    </div>
                    <div className="diag-card-stat">
                      <span className="stat-number">{stats.totalInputTokens}</span>
                      <span className="stat-unit">/ {stats.availableContext} tok ({stats.contextPercentage}%)</span>
                    </div>
                    <div className="diag-card-details">
                      <span>{stats.headroomTokens} headroom</span>
                      <span className="dot-sep">•</span>
                      <span>{stats.maxTokens} generation reserve</span>
                    </div>
                  </div>
                </div>

                {/* Visual Stacked Context Bar */}
                <div className="context-stacked-section">
                  <div className="context-stacked-header">
                    <span className="section-label">Context Allocation Breakdown</span>
                    <span className="section-sub">
                      Model Context: {stats.contextLength} tokens • Total Input: {stats.totalInputTokens} tokens
                    </span>
                  </div>

                  <div className="context-stacked-bar">
                    {stats.availableContext > 0 && (
                      <>
                        <div
                          className="stack-segment segment-system"
                          style={{
                            width: `${Math.max(2, ((stats.estimatedSystemTokens - stats.selectedMemoryTokens - stats.activeLoreTokens) / stats.contextLength) * 100)}%`,
                          }}
                          title={`System & Persona: ~${Math.max(0, stats.estimatedSystemTokens - stats.selectedMemoryTokens - stats.activeLoreTokens)} tokens`}
                        />
                        <div
                          className="stack-segment segment-memory"
                          style={{
                            width: `${Math.max(1, (stats.selectedMemoryTokens / stats.contextLength) * 100)}%`,
                          }}
                          title={`Subconscious Memories: ${stats.selectedMemoryTokens} tokens`}
                        />
                        <div
                          className="stack-segment segment-lore"
                          style={{
                            width: `${Math.max(1, (stats.activeLoreTokens / stats.contextLength) * 100)}%`,
                          }}
                          title={`World Lore: ${stats.activeLoreTokens} tokens`}
                        />
                        <div
                          className="stack-segment segment-chat"
                          style={{
                            width: `${Math.max(2, (stats.chatTokens / stats.contextLength) * 100)}%`,
                          }}
                          title={`Chat History: ${stats.chatTokens} tokens`}
                        />
                        <div
                          className="stack-segment segment-headroom"
                          style={{
                            width: `${Math.max(0, (stats.headroomTokens / stats.contextLength) * 100)}%`,
                          }}
                          title={`Free Headroom: ${stats.headroomTokens} tokens`}
                        />
                        <div
                          className="stack-segment segment-reserve"
                          style={{
                            width: `${(stats.maxTokens / stats.contextLength) * 100}%`,
                          }}
                          title={`Output Reserve: ${stats.maxTokens} tokens`}
                        />
                      </>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="context-legend">
                    <div className="legend-item">
                      <span className="legend-dot dot-system" />
                      <span>System & Persona ({Math.max(0, stats.estimatedSystemTokens - stats.selectedMemoryTokens - stats.activeLoreTokens)} tok)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-memory" />
                      <span>Subconscious Memories ({stats.selectedMemoryTokens} tok)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-lore" />
                      <span>Active Lore ({stats.activeLoreTokens} tok)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-chat" />
                      <span>Chat Turns ({stats.chatTokens} tok)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot dot-reserve" />
                      <span>Max Output Reserve ({stats.maxTokens} tok)</span>
                    </div>
                  </div>
                </div>

                {/* Subconscious Learning Health Row */}
                <div className="brain-health-strip">
                  <div className="health-badge-item">
                    <Clock size={13} className="health-icon" />
                    <span>Auto-Learn Cadence:</span>
                    <strong>{stats.repliesSinceLearning} / 8 replies until synthesis</strong>
                  </div>
                  <div className="health-badge-item">
                    <ShieldCheck size={13} className="health-icon" />
                    <span>Average Confidence:</span>
                    <strong>{stats.avgConfidence}%</strong>
                  </div>
                  <div className="health-badge-item">
                    <Sparkles size={13} className="health-icon" />
                    <span>Active Brain Revision:</span>
                    <strong>v{stats.revision}</strong>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'memories' && (
              <div className="token-memories-content">
                <div className="memories-content-header">
                  <span>
                    Showing {stats.totalMemories} memory entries for {character?.name || 'Character'} (
                    {stats.totalMemoryTokens} tokens total stored, {stats.selectedMemoriesCount} active in context
                    )
                  </span>
                </div>

                {memoriesList.length > 0 ? (
                  <div className="token-memory-items-list">
                    {memoriesList.map((m) => {
                      const tokens = estimateTokens(m.text || '')
                      const isActive = stats.selectedMemoryIds.has(m.id)
                      const category = m.category || 'preferences'
                      const confPct = Math.round((m.confidence || 0.8) * 100)

                      return (
                        <div
                          key={m.id}
                          className={`token-memory-row ${isActive ? 'active-in-prompt' : ''}`}
                        >
                          <div className="token-memory-meta">
                            <span className={`brain-cat-badge ${category}`}>
                              {category}
                            </span>
                            <span className="token-count-chip">{tokens} tok</span>
                            <span className="confidence-chip">{confPct}% conf</span>
                            {isActive ? (
                              <span className="status-chip active" title="Included in the current prompt context">
                                ● In Prompt
                              </span>
                            ) : (
                              <span className="status-chip stored" title="Stored in bank; included when relevant">
                                Cold Bank
                              </span>
                            )}
                          </div>
                          <div className="token-memory-text">{m.text}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-memories-hint">
                    <Brain size={24} />
                    <p>No subconscious memories formed yet for this character.</p>
                    <p className="subtext">
                      Chat naturally or open the Brain Bank to record key facts and traits.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sections' && (
              <div className="token-sections-content">
                <div className="sections-content-header">
                  <span>
                    Compiled System Prompt Sections ({stats.compiledSections.length} sections, ~
                    {stats.estimatedSystemTokens} tokens)
                  </span>
                </div>

                {stats.compiledSections.length > 0 ? (
                  <div className="token-sections-list">
                    {stats.compiledSections.map((sec, idx) => {
                      const tokens = estimateTokens(sec.content || '')
                      const share = stats.availableContext > 0
                        ? Math.round((tokens / stats.availableContext) * 100)
                        : 0

                      return (
                        <div key={idx} className="token-section-item">
                          <div className="section-item-header">
                            <div className="section-title-wrap">
                              <span className="section-idx">#{idx + 1}</span>
                              <strong className="section-name">{sec.title || 'Untitled Section'}</strong>
                              {sec.priority != null && (
                                <span className="section-prio-badge">Prio {sec.priority}</span>
                              )}
                              {sec.partial && (
                                <span className="section-partial-badge">Trimmed</span>
                              )}
                            </div>
                            <div className="section-tokens-wrap">
                              <span className="section-tokens">{tokens} tok</span>
                              <span className="section-share">({share}% ctx)</span>
                            </div>
                          </div>
                          <div className="section-content-preview">
                            {(sec.content || '').slice(0, 180)}
                            {(sec.content || '').length > 180 ? '...' : ''}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty-memories-hint">
                    <Layers size={24} />
                    <p>No compiled sections available.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Persistent Bottom Status Bar */}
      <div className="token-overview-bar">
        {/* Left Stats Cluster */}
        <div className="token-bar-left">
          {/* Subconscious Memory Pill */}
          <div
            className="token-stat-pill"
            title={`Subconscious Memory Bank\n${stats.totalMemories} memories stored (${stats.totalMemoryTokens} tok)\n${stats.selectedMemoriesCount} active in context (${stats.selectedMemoryTokens} tok)`}
          >
            <Brain size={13} className="token-pill-icon pill-icon-purple" />
            <span className="token-pill-label">Memories:</span>
            <span className="token-pill-value">
              {stats.selectedMemoryTokens > 0 ? (
                <>
                  <strong className="val-active">{stats.selectedMemoryTokens}</strong>
                  <span className="val-dim">/{stats.totalMemoryTokens} tok</span>
                </>
              ) : (
                <span>{stats.totalMemoryTokens} tok</span>
              )}
            </span>
            <span className="token-pill-badge">{stats.totalMemories}</span>
          </div>

          {/* Session Summaries Pill */}
          {stats.totalSummaries > 0 && (
            <div
              className="token-stat-pill"
              title={`Archived Session Summaries\n${stats.totalSummaries} summaries (${stats.totalSummaryTokens} tok)\n${stats.activeSummariesCount} active in prompt context`}
            >
              <Layers size={13} className="token-pill-icon pill-icon-gold" />
              <span className="token-pill-label">Summaries:</span>
              <span className="token-pill-value">{stats.totalSummaryTokens} tok</span>
            </div>
          )}

          {/* Lorebook Pill */}
          {stats.totalLoreEntries > 0 && (
            <div
              className="token-stat-pill"
              title={`World Lorebook\n${stats.totalLoreEntries} total entries (${stats.totalLoreTokens} tok)\n${stats.activeLoreCount} matched in scene (${stats.activeLoreTokens} tok)`}
            >
              <BookOpen size={13} className="token-pill-icon pill-icon-cyan" />
              <span className="token-pill-label">Lore:</span>
              <span className="token-pill-value">{stats.activeLoreTokens} tok</span>
              {stats.activeLoreCount > 0 && (
                <span className="token-pill-badge active">{stats.activeLoreCount} active</span>
              )}
            </div>
          )}

          {/* Chat History Pill */}
          <div
            className="token-stat-pill"
            title={`Conversation History\n${stats.chatMessageCount} messages in session\n~${stats.chatTokens} tokens in message history`}
          >
            <MessageSquare size={13} className="token-pill-icon pill-icon-blue" />
            <span className="token-pill-label">Chat:</span>
            <span className="token-pill-value">{stats.chatTokens} tok</span>
          </div>
        </div>

        {/* Center: Context Progress Bar */}
        <div
          className="token-bar-center"
          title={`Total Prompt Input: ${stats.totalInputTokens} tokens\nAvailable Context: ${stats.availableContext} tokens\nModel Context Window: ${stats.contextLength} tokens\nGeneration Reserve: ${stats.maxTokens} tokens\nRemaining Free Space: ${stats.headroomTokens} tokens`}
        >
          <div className="token-progress-info">
            <span className="progress-label">Context Used:</span>
            <span className="progress-counts">
              {stats.totalInputTokens} / {stats.availableContext} tok ({stats.contextPercentage}%)
            </span>
          </div>
          <div className="token-progress-track">
            <div
              className={`token-progress-fill ${getProgressColorClass(stats.contextPercentage)}`}
              style={{ width: `${Math.max(stats.contextPercentage, 2)}%` }}
            />
          </div>
        </div>

        {/* Right Actions & Expand Toggle */}
        <div className="token-bar-right">
          {/* Brain Cadence Indicator */}
          <div
            className="token-cadence-chip"
            title={`Subconscious Learning\n${stats.repliesSinceLearning}/8 replies completed until auto-synthesis\nBrain Revision: v${stats.revision}`}
          >
            <Zap size={11} />
            <span>Rev {stats.revision}</span>
            <span className="cadence-dot">•</span>
            <span>{stats.repliesSinceLearning}/8</span>
          </div>

          {/* Quick Brain Manager */}
          {onOpenBrain && (
            <button
              type="button"
              className="btn-token-action"
              onClick={onOpenBrain}
              title="Open Brain Data Bank & Mindprint Profile"
            >
              <Sliders size={12} />
              <span>Brain Bank</span>
            </button>
          )}

          {/* Expand Details Toggle */}
          <button
            type="button"
            className={`btn-token-expand ${isExpanded ? 'is-expanded' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Token & Memory Diagnostics' : 'Expand Token & Memory Diagnostics'}
          >
            <span>Diagnostics</span>
            {isExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>
    </div>
  )
}
