import React, { useState } from 'react'
import {
  Brain,
  Sparkles,
  Cpu,
  Layers,
  Plus,
  Trash2,
  Edit3,
  Save,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  X,
  Search,
  Sliders,
  Database,
  MessageSquare,
  Clock,
  Tag,
  RotateCcw,
} from 'lucide-react'

export function BrainModal({
  isOpen,
  onClose,
  brain,
  character,
  userPersona,
  promptPreview,
  onResetBrain,
  characters: _characters = [],
  onSaveBrain,
  onSynthesizeBrain,
  onAutoFillProfile,
  isSynthesizing = false,
  synthesisProgress = '',
  isAiOnline = false,
}) {
  const [activeTab, setActiveTab] = useState(brain?.memories?.length ? 'memories' : 'mindprint') // 'mindprint' | 'memories' | 'diagnostics'
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Editing state for memories
  const [editingMemoryId, setEditingMemoryId] = useState(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingCategory, setEditingCategory] = useState('preferences')
  const [editingConfidence, setEditingConfidence] = useState(0.9)

  // New memory form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMemoryCategory, setNewMemoryCategory] = useState('preferences')
  const [newMemoryContent, setNewMemoryContent] = useState('')
  const [newMemoryConfidence, setNewMemoryConfidence] = useState(0.92)

  // Mindprint profile editing form state
  const [profileSummary, setProfileSummary] = useState(brain?.userProfile?.summary || '')
  const [profileStyle, setProfileStyle] = useState(brain?.userProfile?.dialogueStyle || '')
  const [traitsList, setTraitsList] = useState(brain?.userProfile?.personalityTraits || [])
  const [newTraitInput, setNewTraitInput] = useState('')
  const [likesList, setLikesList] = useState(brain?.userProfile?.likes || [])
  const [newLikeInput, setNewLikeInput] = useState('')
  const [dislikesList, setDislikesList] = useState(brain?.userProfile?.dislikes || [])
  const [newDislikeInput, setNewDislikeInput] = useState('')
  const [recurringLoreList, setRecurringLoreList] = useState(brain?.userProfile?.recurringLore || [])
  const [newLoreInput, setNewLoreInput] = useState('')
  const [profileSavedNotice, setProfileSavedNotice] = useState(false)
  const [isAutoFillingProfile, setIsAutoFillingProfile] = useState(false)
  const [autoFillError, setAutoFillError] = useState(null)
  const [profileAutoFilledNotice, setProfileAutoFilledNotice] = useState(false)

  const handleAutoFill = async () => {
    if (!onAutoFillProfile || isAutoFillingProfile) return
    setIsAutoFillingProfile(true)
    setAutoFillError(null)
    try {
      const suggested = await onAutoFillProfile()
      if (suggested) {
        if (suggested.summary) setProfileSummary(suggested.summary)
        if (suggested.dialogueStyle) setProfileStyle(suggested.dialogueStyle)
        if (Array.isArray(suggested.personalityTraits)) setTraitsList(suggested.personalityTraits)
        if (Array.isArray(suggested.likes)) setLikesList(suggested.likes)
        if (Array.isArray(suggested.dislikes)) setDislikesList(suggested.dislikes)
        if (Array.isArray(suggested.recurringLore)) setRecurringLoreList(suggested.recurringLore)
        setProfileAutoFilledNotice(true)
        setTimeout(() => setProfileAutoFilledNotice(false), 4500)
      }
    } catch (err) {
      console.error('Failed to auto-fill user profile:', err)
      setAutoFillError(err.message || 'Failed to auto-fill profile from conversation memories.')
    } finally {
      setIsAutoFillingProfile(false)
    }
  }

  // Sync state when brain prop updates
  React.useEffect(() => {
    if (brain) {
      setProfileSummary(brain.userProfile?.summary || '')
      setProfileStyle(brain.userProfile?.dialogueStyle || '')
      setTraitsList(brain.userProfile?.personalityTraits || [])
      setLikesList(brain.userProfile?.likes || [])
      setDislikesList(brain.userProfile?.dislikes || [])
      setRecurringLoreList(brain.userProfile?.recurringLore || [])
    }
  }, [brain])

  if (!isOpen) return null

  // Calculations for Telemetry
  const totalMemories = brain?.memories?.length || 0
  const totalSessions = brain?.sessionSummaries?.length || 0
  const establishedMemories = (brain?.memories || []).filter(m => m.status === 'established')
  const avgConfidence = establishedMemories.length ? Math.round(establishedMemories.reduce((sum, m) => sum + (m.confidence ?? 0), 0) / establishedMemories.length * 100) : 0

  const filteredMemories = (brain?.memories || []).filter((m) => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        m.content?.toLowerCase().includes(q) ||
        m.category?.toLowerCase().includes(q) ||
        m.source?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Handlers for Profile
  const handleSaveProfile = () => {
    const updated = {
      ...brain,
      userProfile: {
        ...brain.userProfile,
        source: 'manual',
        status: 'established',
        summary: profileSummary.trim(),
        dialogueStyle: profileStyle.trim(),
        personalityTraits: traitsList,
        likes: likesList,
        dislikes: dislikesList,
        recurringLore: recurringLoreList,
      },
    }
    onSaveBrain(updated)
    setProfileSavedNotice(true)
    setTimeout(() => setProfileSavedNotice(false), 2500)
  }

  const handleAddTag = (type) => {
    if (type === 'trait' && newTraitInput.trim()) {
      if (!traitsList.includes(newTraitInput.trim())) {
        setTraitsList([...traitsList, newTraitInput.trim()])
      }
      setNewTraitInput('')
    } else if (type === 'like' && newLikeInput.trim()) {
      if (!likesList.includes(newLikeInput.trim())) {
        setLikesList([...likesList, newLikeInput.trim()])
      }
      setNewLikeInput('')
    } else if (type === 'dislike' && newDislikeInput.trim()) {
      if (!dislikesList.includes(newDislikeInput.trim())) {
        setDislikesList([...dislikesList, newDislikeInput.trim()])
      }
      setNewDislikeInput('')
    } else if (type === 'lore' && newLoreInput.trim()) {
      if (!recurringLoreList.includes(newLoreInput.trim())) {
        setRecurringLoreList([...recurringLoreList, newLoreInput.trim()])
      }
      setNewLoreInput('')
    }
  }

  const handleRemoveTag = (type, tagToRemove) => {
    if (type === 'trait') setTraitsList(traitsList.filter((t) => t !== tagToRemove))
    if (type === 'like') setLikesList(likesList.filter((t) => t !== tagToRemove))
    if (type === 'dislike') setDislikesList(dislikesList.filter((t) => t !== tagToRemove))
    if (type === 'lore') setRecurringLoreList(recurringLoreList.filter((t) => t !== tagToRemove))
  }

  // Handlers for Memories
  const handleAddMemorySubmit = (e) => {
    e.preventDefault()
    if (!newMemoryContent.trim()) return

    const newMemory = {
      id: `mem-${Date.now()}`,
      category: newMemoryCategory,
      content: newMemoryContent.trim(),
      confidence: Number(newMemoryConfidence),
      source: 'User Manual Entry',
      provenance: 'manual',
      status: 'established',
      evidence: [],
      subject: 'user',
      kind: 'user_fact',
      createdAt: Date.now(),
    }

    const updated = {
      ...brain,
      memories: [newMemory, ...(brain.memories || [])],
    }
    onSaveBrain(updated)
    setNewMemoryContent('')
    setShowAddForm(false)
  }

  const handleDeleteMemory = (id) => {
    const updated = {
      ...brain,
      memories: (brain.memories || []).filter((m) => m.id !== id),
    }
    onSaveBrain(updated)
  }

  const startEditMemory = (m) => {
    setEditingMemoryId(m.id)
    setEditingContent(m.content)
    setEditingCategory(m.category || 'preferences')
    setEditingConfidence(m.confidence ?? 0)
  }

  const saveEditMemory = () => {
    const updated = {
      ...brain,
      memories: (brain.memories || []).map((m) =>
        m.id === editingMemoryId
          ? {
              ...m,
              content: editingContent.trim(),
              status: 'established',
              provenance: 'manual',
              source: 'User Manual Entry',
              evidence: [],
              category: editingCategory,
              confidence: Number(editingConfidence),
              updatedAt: Date.now(),
            }
          : m
      ),
    }
    onSaveBrain(updated)
    setEditingMemoryId(null)
  }

  // Handlers for Brain Toggles
  const handleToggleBrainEnabled = () => {
    onSaveBrain({
      ...brain,
      enabled: !brain.enabled,
    }, character?.id, { preservePending: true })
  }

  const handleToggleAutoLearn = () => {
    onSaveBrain({
      ...brain,
      autoLearn: !brain.autoLearn,
    }, character?.id, { preservePending: true })
  }

  // JSON Export / Import
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(brain, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `loreforge_brain_backup_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  const handleImportJson = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result)
        if (parsed && typeof parsed === 'object') {
          onSaveBrain(parsed)
          alert('Brain data bank successfully restored!')
        }
      } catch (err) {
        alert('Invalid JSON file format: ' + err.message)
      }
    }
    reader.readAsText(file)
  }


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content brain-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header brain-modal-header">
          <div className="brain-title-cluster">
            <div className="brain-icon-orb pulsing">
              <Brain size={24} className="brain-neural-svg" />
            </div>
            <div>
              <div className="brain-title-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>AI Brain Data Bank</h3>
                <span className="badge badge-purple" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px' }}>
                  {character?.avatar && (
                    <img src={character.avatar} alt="" style={{ width: '15px', height: '15px', borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <span>{character?.name ? `${character.name}'s Mind` : 'Active Character Mind'}</span>
                </span>
                {brain.enabled ? (
                  <span className="badge badge-active" style={{ fontSize: '0.7rem', color: '#10b981' }}>
                    ● Online
                  </span>
                ) : (
                  <span className="badge badge-muted" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                    ○ Offline
                  </span>
                )}
              </div>
              <p className="brain-subtitle">
                Dedicated subconscious memory bank for <strong>{character?.name || 'this character'}</strong> — storing verified memories and past sessions with {userPersona?.name || 'you'}.
              </p>
            </div>
          </div>

          <div className="brain-header-actions">
            <button
              className="btn btn-primary brain-synthesis-btn"
              onClick={() => onSynthesizeBrain(character?.id)}
              disabled={isSynthesizing}
              title="Run AI model analysis across all conversations to synthesize new insights"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw size={15} className="spin-slow" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Synthesize Brain</span>
                </>
              )}
            </button>
            <button className="btn-nav-icon" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Telemetry & Controls Ribbon */}
        <div className="brain-telemetry-ribbon">
          <div className="brain-stat-box">
            <span className="brain-stat-label">Stored Entries</span>
            <span className="brain-stat-value">{totalMemories}</span>
          </div>
          <div className="brain-stat-box">
            <span className="brain-stat-label">Session Summaries</span>
            <span className="brain-stat-value">{totalSessions}</span>
          </div>
          <div className="brain-stat-box">
            <span className="brain-stat-label">Established Confidence</span>
            <span className="brain-stat-value">{avgConfidence}%</span>
          </div>
          <div className="brain-stat-box">
            <span className="brain-stat-label">Last Synthesized</span>
            <span className="brain-stat-value" style={{ fontSize: '0.85rem' }}>
              {brain?.lastAnalyzedTimestamp
                ? new Date(brain.lastAnalyzedTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Initial'}
            </span>
          </div>

          <div className="brain-toggles-cluster">
            <label className="brain-toggle-label" title="When active, the Brain injects learned preferences into character prompts">
              <input
                type="checkbox"
                checked={brain?.enabled !== false}
                onChange={handleToggleBrainEnabled}
              />
              <span>Brain Active</span>
            </label>
            <label className="brain-toggle-label" title="Initialize new characters, then learn after every 8 completed replies when idle; foreground requests take priority">
              <input
                type="checkbox"
                checked={brain?.autoLearn !== false}
                onChange={handleToggleAutoLearn}
              />
              <span>Auto-Learn</span>
            </label>
          </div>
        </div>

        {/* Status bar if synthesizing */}
        {synthesisProgress && (
          <div className="brain-synthesis-progress-bar">
            <RefreshCw size={14} className={isSynthesizing ? 'spin-slow' : undefined} />
            <span>{synthesisProgress || 'Analyzing user conversation patterns across all chats with local AI...'}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="brain-tabs-header">
          <button
            className={`brain-tab-btn ${activeTab === 'mindprint' ? 'active' : ''}`}
            onClick={() => setActiveTab('mindprint')}
          >
            <Cpu size={15} />
            <span>Mindprint Profile</span>
          </button>
          <button
            className={`brain-tab-btn ${activeTab === 'memories' ? 'active' : ''}`}
            onClick={() => setActiveTab('memories')}
          >
            <Layers size={15} />
            <span>Memory Bank ({totalMemories})</span>
          </button>
          <button
            className={`brain-tab-btn ${activeTab === 'diagnostics' ? 'active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            <Sliders size={15} />
            <span>Data &amp; Prompt Preview</span>
          </button>
          <button
            className={`brain-tab-btn ${activeTab === 'sessions' ? 'active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            <MessageSquare size={15} />
            <span>Session History ({totalSessions})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body brain-modal-body" style={{ overflowY: 'auto' }}>
          {/* TAB 1: MINDPRINT PROFILE */}
          {activeTab === 'mindprint' && (
            <div className="brain-tab-content">
              <div className="brain-section-intro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <h4>User information (manually specified)</h4>
                  <p>
                    This profile contains your manually specified information for this character. Evidence-based observations appear in the Memory Bank. Character traits stay in the character card.
                  </p>
                </div>
                {onAutoFillProfile && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleAutoFill}
                    disabled={isAutoFillingProfile || !isAiOnline}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 12px', whiteSpace: 'nowrap' }}
                    title="Synthesize user profile, habits, and traits from conversation memory using local AI"
                  >
                    {isAutoFillingProfile ? (
                      <>
                        <RefreshCw size={14} className="spin-slow" />
                        <span>Analyzing Memory...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Auto-Fill Profile with AI</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {profileAutoFilledNotice && (
                <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: '0.82rem', marginBottom: '12px' }}>
                  ✓ Profile drafted from conversation memories! Review the fields below and click &quot;Save Mindprint Profile&quot; when satisfied.
                </div>
              )}

              {autoFillError && (
                <div style={{ padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.82rem', marginBottom: '12px' }}>
                  {autoFillError}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>User Roleplay Summary</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1-2 descriptive sentences</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={profileSummary}
                  onChange={(e) => setProfileSummary(e.target.value)}
                  placeholder="e.g. An evocative roleplayer who enjoys vivid descriptions, emotional engagement, and textured banter."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dialogue & Formatting Habits</label>
                <input
                  className="form-input"
                  value={profileStyle}
                  onChange={(e) => setProfileStyle(e.target.value)}
                  placeholder="e.g. Uses descriptive sensory actions in *asterisks* and spoken dialogue in &quot;quotes&quot;."
                />
              </div>

              {/* Tag Grids: Personality, Likes, Dislikes, Canon Lore */}
              <div className="brain-tag-section-grid">
                {/* Personality Traits */}
                <div className="brain-tag-card">
                  <div className="brain-tag-card-header">
                    <span className="brain-tag-title">Personality Traits</span>
                    <span className="badge badge-purple">{traitsList.length}</span>
                  </div>
                  <div className="brain-tag-input-row">
                    <input
                      className="form-input form-input-sm"
                      placeholder="Add trait (e.g. Imaginative)..."
                      value={newTraitInput}
                      onChange={(e) => setNewTraitInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('trait'))}
                    />
                    <button className="btn btn-sm btn-secondary" onClick={() => handleAddTag('trait')}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="brain-tags-wrap">
                    {traitsList.map((trait, idx) => (
                      <span key={idx} className="brain-tag-pill trait">
                        {trait}
                        <button onClick={() => handleRemoveTag('trait', trait)} aria-label="Remove tag">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {traitsList.length === 0 && <span className="brain-empty-tags">No traits registered yet.</span>}
                  </div>
                </div>

                {/* Narrative Likes & Preferences */}
                <div className="brain-tag-card">
                  <div className="brain-tag-card-header">
                    <span className="brain-tag-title">User Likes & Preferences</span>
                    <span className="badge badge-emerald">{likesList.length}</span>
                  </div>
                  <div className="brain-tag-input-row">
                    <input
                      className="form-input form-input-sm"
                      placeholder="Add like (e.g. High-stakes combat)..."
                      value={newLikeInput}
                      onChange={(e) => setNewLikeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('like'))}
                    />
                    <button className="btn btn-sm btn-secondary" onClick={() => handleAddTag('like')}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="brain-tags-wrap">
                    {likesList.map((like, idx) => (
                      <span key={idx} className="brain-tag-pill like">
                        {like}
                        <button onClick={() => handleRemoveTag('like', like)} aria-label="Remove tag">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {likesList.length === 0 && <span className="brain-empty-tags">No preferences recorded yet.</span>}
                  </div>
                </div>

                {/* Dislikes & Tropes to Avoid */}
                <div className="brain-tag-card">
                  <div className="brain-tag-card-header">
                    <span className="brain-tag-title">Dislikes & Annoyances</span>
                    <span className="badge badge-rose">{dislikesList.length}</span>
                  </div>
                  <div className="brain-tag-input-row">
                    <input
                      className="form-input form-input-sm"
                      placeholder="Add dislike (e.g. Out-of-character breaks)..."
                      value={newDislikeInput}
                      onChange={(e) => setNewDislikeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('dislike'))}
                    />
                    <button className="btn btn-sm btn-secondary" onClick={() => handleAddTag('dislike')}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="brain-tags-wrap">
                    {dislikesList.map((dislike, idx) => (
                      <span key={idx} className="brain-tag-pill dislike">
                        {dislike}
                        <button onClick={() => handleRemoveTag('dislike', dislike)} aria-label="Remove tag">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {dislikesList.length === 0 && <span className="brain-empty-tags">No dislikes registered.</span>}
                  </div>
                </div>

                {/* Recurring Canon & World Lore */}
                <div className="brain-tag-card">
                  <div className="brain-tag-card-header">
                    <span className="brain-tag-title">Recurring Canon & World Lore</span>
                    <span className="badge badge-amber">{recurringLoreList.length}</span>
                  </div>
                  <div className="brain-tag-input-row">
                    <input
                      className="form-input form-input-sm"
                      placeholder="Add recurring element (e.g. Iron Syndicate)..."
                      value={newLoreInput}
                      onChange={(e) => setNewLoreInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('lore'))}
                    />
                    <button className="btn btn-sm btn-secondary" onClick={() => handleAddTag('lore')}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="brain-tags-wrap">
                    {recurringLoreList.map((item, idx) => (
                      <span key={idx} className="brain-tag-pill lore">
                        {item}
                        <button onClick={() => handleRemoveTag('lore', item)} aria-label="Remove tag">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                    {recurringLoreList.length === 0 && <span className="brain-empty-tags">No recurring lore items.</span>}
                  </div>
                </div>
              </div>

              {/* Save & Reset Profile Buttons */}
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={handleSaveProfile}>
                  <Save size={16} />
                  <span>Save Mindprint Profile</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
                    borderColor: 'rgba(168, 85, 247, 0.4)',
                    color: '#c084fc',
                  }}
                  onClick={() => onSynthesizeBrain(character?.id, { fromScenario: true })}
                  disabled={isSynthesizing}
                  title={
                    isAiOnline
                      ? `Auto-generate ${character?.name || ''}'s Mindprint context using active LM Studio model`
                      : `Auto-generate ${character?.name || ''}'s Mindprint context from scenario (instant generator)`
                  }
                >
                  <Sparkles size={15} className={isSynthesizing ? 'spin-animation' : ''} />
                  <span>{isSynthesizing ? 'Synthesizing...' : 'Refresh Authored Backstory'}</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}
                  onClick={() => {
                    const charName = character?.name || 'this character'
                    if (
                      window.confirm(
                        `Reset ${charName}'s Mindprint profile & memories back to clean scenario defaults for ${charName}?`
                      )
                    ) {
                      onResetBrain()
                    }
                  }}
                  title="Reset this character's mind to a clean slate"
                >
                  <RotateCcw size={15} />
                  <span>Reset {character?.name || ''}'s Mind</span>
                </button>

                {profileSavedNotice && (
                  <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} /> Saved to Local Storage!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MEMORY BANK EXPLORER */}
          {activeTab === 'memories' && (
            <div className="brain-tab-content">
              <p className="brain-memory-evidence">Established: {brain?.memories?.filter(m => m.status === 'established').length || 0} · Tentative: {brain?.memories?.filter(m => m.status === 'tentative').length || 0} · Needs review: {brain?.memories?.filter(m => m.status === 'needs_review').length || 0}. Old entries are preserved; review them before confirming.</p>
              {/* Controls bar: search, category filter, and add button */}
              <div className="brain-memory-controls">
                <div className="brain-search-wrap">
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    className="form-input brain-search-input"
                    placeholder="Search memories by keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button className="btn-clear-search" onClick={() => setSearchQuery('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="brain-filter-pills">
                  {['all', 'preferences', 'behavior', 'style', 'lore'].map((cat) => (
                    <button
                      key={cat}
                      className={`brain-filter-btn ${filterCategory === cat ? 'active' : ''}`}
                      onClick={() => setFilterCategory(cat)}
                    >
                      {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>

                <button
                  className="btn btn-secondary brain-add-memory-btn"
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  <Plus size={15} />
                  <span>{showAddForm ? 'Cancel' : 'Add Memory'}</span>
                </button>
              </div>

              {/* Expandable Add Memory Form */}
              {showAddForm && (
                <form onSubmit={handleAddMemorySubmit} className="brain-add-memory-form">
                  <div className="brain-form-title">
                    <Database size={16} />
                    <span>Encode New Memory into Data Bank</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="form-input"
                        value={newMemoryCategory}
                        onChange={(e) => setNewMemoryCategory(e.target.value)}
                      >
                        <option value="preferences">Preferences (Tropes & Desires)</option>
                        <option value="behavior">Behavior (Habits & Reactions)</option>
                        <option value="style">Writing Style (Formatting & Cadence)</option>
                        <option value="lore">World Lore (Recurring Canon Facts)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Confidence Score ({Math.round(newMemoryConfidence * 100)}%)</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        className="range-input"
                        value={newMemoryConfidence}
                        onChange={(e) => setNewMemoryConfidence(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Observation / Fact</label>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      required
                      placeholder="e.g. Always appreciates visceral sound descriptions and physical environmental impacts during combat scenes."
                      value={newMemoryContent}
                      onChange={(e) => setNewMemoryContent(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Save size={14} />
                      <span>Store Memory</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Memories List */}
              <div className="brain-memories-list">
                {filteredMemories.length === 0 ? (
                  <div className="brain-empty-state">
                    <Brain size={36} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                    <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>No memories match your search.</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Click "Synthesize Brain" to extract memories from your chats or add one manually above.
                    </p>
                  </div>
                ) : (
                  filteredMemories.map((m) => {
                    const isEditing = editingMemoryId === m.id
                    const confPct = Math.round((m.confidence ?? 0) * 100)

                    return (
                      <div key={m.id} className={`brain-memory-card ${m.category}`}>
                        {isEditing ? (
                          <div className="brain-memory-edit-wrap">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                              <select
                                className="form-input form-input-sm"
                                value={editingCategory}
                                onChange={(e) => setEditingCategory(e.target.value)}
                              >
                                <option value="preferences">Preferences</option>
                                <option value="behavior">Behavior</option>
                                <option value="style">Style</option>
                                <option value="lore">World Lore</option>
                              </select>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Confidence:</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step="0.01"
                                  className="range-input"
                                  value={editingConfidence}
                                  onChange={(e) => setEditingConfidence(parseFloat(e.target.value))}
                                />
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                  {Math.round(editingConfidence * 100)}%
                                </span>
                              </div>
                            </div>
                            <textarea
                              className="form-textarea"
                              rows={2}
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '8px' }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => setEditingMemoryId(null)}>
                                Cancel
                              </button>
                              <button className="btn btn-sm btn-primary" onClick={saveEditMemory}>
                                <Save size={12} /> Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="brain-memory-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className={`brain-cat-badge ${m.category}`}>
                                  {m.category?.toUpperCase() || 'PREFERENCE'}
                                </span>
                                <span className="brain-memory-source">{m.source || 'Cross-Chat'}</span>
                              </div>
                              <div className="brain-confidence-bar-wrap" title={`Confidence: ${confPct}%`}>
                                <div className="brain-confidence-bar">
                                  <div
                                    className="brain-confidence-fill"
                                    style={{ width: `${confPct}%` }}
                                  />
                                </div>
                                <span className="brain-confidence-text">{confPct}%</span>
                              </div>
                            </div>

                            <span className="badge badge-purple">{(m.status || 'needs_review').replaceAll('_', ' ')}</span>
                            <p className="brain-memory-text">{m.content}</p>
                            <p className="brain-memory-evidence">{m.source || m.provenance || 'Unverified source'} · {m.evidence?.length || 0} evidence references</p>
                            {m.status === 'needs_review' && <button className="btn btn-sm btn-secondary" onClick={() => onSaveBrain({ ...brain, memories: brain.memories.map(item => item.id === m.id ? { ...item, status: 'established', provenance: 'manual', source: 'User Manual Entry', evidence: [], confidence: 1 } : item) })}>Confirm as authored fact</button>}

                            <div className="brain-memory-footer">
                              <span className="brain-memory-date">
                                {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Initial'}
                              </span>
                              <div className="brain-card-actions">
                                <button
                                  className="btn-card-action"
                                  onClick={() => startEditMemory(m)}
                                  title="Edit memory"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  className="btn-card-action delete"
                                  onClick={() => handleDeleteMemory(m.id)}
                                  title="Delete memory"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS & PROMPT PREVIEW */}
          {activeTab === 'diagnostics' && (
            <div className="brain-tab-content">
              <div className="brain-section-intro">
                <h4>Dynamic System Prompt Inspection</h4>
                <p>
                  This is the complete system prompt for the current character, persona, chapter, and settings. Entries needing review and superseded claims are excluded; tentative impressions are labeled.
                </p>
              </div>

              {/* Scene State Telemetry Card */}
              {brain?.sceneState && (
                <div className="brain-management-card" style={{ marginBottom: '16px', background: 'rgba(139, 92, 246, 0.06)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                  <h5 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-hover)' }}>
                    <Cpu size={15} />
                    <span>Active Transient Scene State (Overrides Static Scenario)</span>
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.8rem' }}>
                    <div><strong>Location:</strong> {brain.sceneState.location || '(Unspecified / Follows Scenario)'}</div>
                    <div><strong>Time/Lighting:</strong> {brain.sceneState.time || '(Current Scene Time)'}</div>
                    <div><strong>Active Participants:</strong> {brain.sceneState.participants?.length ? brain.sceneState.participants.join(', ') : '(None)'}</div>
                    <div><strong>Present Objects:</strong> {brain.sceneState.objects?.length ? brain.sceneState.objects.join(', ') : '(None)'}</div>
                  </div>
                  {brain.sceneState.unresolvedActions?.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#f59e0b' }}>
                      <strong>Pending Action / Open Thread:</strong> {brain.sceneState.unresolvedActions.join('; ')}
                    </div>
                  )}
                </div>
              )}

              <div className="brain-prompt-preview-container">
                <pre className="brain-prompt-preview">{promptPreview}</pre>
              </div>

              <div className="brain-management-card" style={{ marginTop: '20px' }}>
                <h5 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Database size={16} style={{ color: 'var(--primary-hover)' }} />
                  <span>Data Bank Backup & Migration</span>
                </h5>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>
                  Your Brain Data Bank is stored 100% locally in your browser storage. You can export a JSON backup or import one on another device.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button className="btn btn-secondary" onClick={handleExportJson}>
                    <Download size={15} />
                    <span>Export Brain (.json)</span>
                  </button>

                  <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
                    <Upload size={15} />
                    <span>Import Brain (.json)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJson}
                      style={{ display: 'none' }}
                    />
                  </label>

                  <button
                    className="btn btn-secondary"
                    style={{ color: '#ef4444' }}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all learned memories?')) {
                        onSaveBrain({
                          ...brain,
                          memories: [],
                        })
                      }
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Clear All Memories</span>
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}
                    onClick={() => {
                      const charName = character?.name || 'this character'
                      if (
                        window.confirm(
                          `Reset ${charName}'s Brain & Mind back to clean defaults (clearing all learned history, memories, and session summaries for ${charName})?`
                        )
                      ) {
                        onResetBrain()
                      }
                    }}
                  >
                    <RotateCcw size={15} />
                    <span>Reset {character?.name || ''}'s Mind to Clean Defaults</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SESSION HISTORY */}
          {activeTab === 'sessions' && (
            <div className="brain-tab-content">
              <div className="brain-section-intro">
                <h4>Session History</h4>
                <p>Only current, verified summaries enter chat. Changed or removed source conversations require review.</p>
                <p>
                  Summaries of past conversations stored by the brain after synthesis. These are injected into the prompt so characters know what you've talked about before.
                </p>
              </div>

              {(!brain?.sessionSummaries || brain.sessionSummaries.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ margin: 0 }}>No session summaries yet.</p>
                  <p style={{ margin: '6px 0 0', fontSize: '0.82rem' }}>Run <strong>Synthesize Brain</strong> after a chat to generate them.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[...(brain.sessionSummaries || [])]
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                    .map((session) => (
                      <div key={session.sessionId} className="brain-management-card" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <MessageSquare size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                              <strong style={{ fontSize: '0.92rem' }}>{session.title || 'Chat Session'}</strong>
                              {session.charName && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-elevated)', padding: '1px 7px', borderRadius: '10px' }}>
                                  {session.charName}
                                </span>
                              )}
                            </div>
                            {session.timestamp && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                <Clock size={11} />
                                <span>{new Date(session.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                              </div>
                            )}
                            <p style={{ margin: '0 0 8px', fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--text-primary)' }}>
                              {session.summary}
                              <span className="badge badge-purple">{(session.status || 'needs_review').replaceAll('_', ' ')}</span>
                            </p>
                            {Array.isArray(session.keyTopics) && session.keyTopics.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {session.keyTopics.map((topic, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      display: 'inline-flex', alignItems: 'center', gap: '3px',
                                      fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px',
                                      background: 'rgba(139,92,246,0.12)', color: 'var(--primary)',
                                      border: '1px solid rgba(139,92,246,0.2)',
                                    }}
                                  >
                                    <Tag size={9} />
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn-nav-icon"
                            style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }}
                            title="Delete this session summary"
                            onClick={() => {
                              const updated = {
                                ...brain,
                                sessionSummaries: brain.sessionSummaries.filter(s => s.sessionId !== session.sessionId),
                              }
                              onSaveBrain(updated)
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {brain?.sessionSummaries?.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ color: '#ef4444', fontSize: '0.82rem' }}
                    onClick={() => {
                      if (window.confirm('Clear all session summaries from the brain?')) {
                        onSaveBrain({ ...brain, sessionSummaries: [] })
                      }
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Clear All Session Summaries</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
