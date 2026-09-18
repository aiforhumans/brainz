import React, { useState, useMemo } from 'react'
import {
  Copy,
  Check,
  Edit3,
  RotateCw,
  Trash2,
  User,
  Brain,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react'
import { formatRoleplayContent } from '../utils/roleplayFormatter'
import { replaceMacros } from '../utils/macroUtils.js'

export function MessageItem({
  message,
  character,
  userPersona,
  isLastAssistant,
  isStreaming,
  onRegenerate,
  onEditMessage,
  onDeleteMessage,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const [copied, setCopied] = useState(false)

  const isUser = message.role === 'user'
  const senderName = isUser ? (userPersona?.name || 'You') : character.name

  // Auto-expand reasoning while actively thinking, auto-collapse once speech begins unless user toggled
  const isThinkingActive = Boolean(isStreaming && message.reasoningContent && !message.content)
  const [userToggledOpen, setUserToggledOpen] = useState(null)
  const reasoningOpen = userToggledOpen !== null ? userToggledOpen : isThinkingActive

  const formattedTime = useMemo(() => {
    const timestamp = message.createdAt || 0
    if (!timestamp) return ''
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [message.createdAt])

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onEditMessage(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  return (
    <div className={`message-row ${message.role}`}>
      <div className="message-avatar-wrap">
        {isUser ? (
          userPersona?.avatar ? (
            <img src={userPersona.avatar} alt="You" />
          ) : (
            <div className="avatar-fallback-inner avatar-fallback-user">
              <User size={20} />
            </div>
          )
        ) : character.avatar ? (
          <img src={character.avatar} alt={character.name} />
        ) : (
          <div
            className="avatar-fallback-inner"
            style={{ background: character.avatarFallbackBg || undefined }}
          >
            {character.name.charAt(0)}
          </div>
        )}
      </div>

      <div className="message-content-col">
        <div className="message-header">
          <span className="message-sender">
            {senderName}
            {isUser && userPersona?.title && (
              <span className="persona-title-hint">
                • {userPersona.title}
              </span>
            )}
          </span>
          <div className="message-header-right">
            {/* Model Generation Stats Pill */}
            {message.stats && !isUser && (
              <div
                className="message-stats-pill"
                title={`Model: ${message.model || 'LM Studio'}\nTTFT: ${(message.stats.time_to_first_token_seconds || 0).toFixed(3)}s\nOutput: ${message.stats.total_output_tokens || 0} tokens`}
              >
                <Zap size={11} className="stats-icon" />
                <span>{(message.stats.tokens_per_second || 0).toFixed(1)} tok/s</span>
                {message.stats.time_to_first_token_seconds != null && (
                  <>
                    <span className="stats-dot">•</span>
                    <span>{(message.stats.time_to_first_token_seconds * 1000).toFixed(0)}ms</span>
                  </>
                )}
              </div>
            )}
            <span className="message-time">
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Collapsible Reasoning / Inner Thoughts Accordion */}
        {message.reasoningContent && !isUser && (
          <div className={`reasoning-accordion ${isThinkingActive ? 'thinking-active' : ''}`}>
            <button
              type="button"
              className="reasoning-header"
              onClick={() => setUserToggledOpen(!reasoningOpen)}
              aria-expanded={reasoningOpen}
            >
              <div className="reasoning-title-group">
                <Brain size={14} className={isThinkingActive ? 'icon-pulse' : ''} />
                <span>
                  {isThinkingActive ? 'Thinking & Formulating Thoughts...' : 'Thought Process & Inner Monologue'}
                </span>
                {message.stats?.reasoning_output_tokens != null && (
                  <span className="reasoning-badge">{message.stats.reasoning_output_tokens} tok</span>
                )}
              </div>
              <div className="reasoning-toggle">
                {reasoningOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {reasoningOpen && (
              <div className="reasoning-body">
                <div className="reasoning-text">
                  {message.reasoningContent}
                  {isThinkingActive && <span className="streaming-cursor thinking" />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Multimodal Attached Image */}
        {message.image && (
          <div className="message-image-container">
            <img
              src={message.image}
              alt="Scene visual"
              className="message-attached-image"
              onClick={() => {
                const w = window.open('')
                w?.document.write(`<img src="${message.image}" style="max-width:100%;max-height:100vh;display:block;margin:auto;background:#0b0f19;" />`)
              }}
              title="Click to view full image"
            />
          </div>
        )}

        <div className="message-bubble">
          {isEditing ? (
            <div className="inline-edit-box">
              <textarea
                className="inline-edit-textarea"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
              />
              <div className="inline-edit-buttons">
                <button className="btn-secondary" onClick={handleCancelEdit} style={{ padding: '6px 12px' }}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveEdit} style={{ padding: '6px 12px' }}>
                  Save Edit
                </button>
              </div>
            </div>
          ) : (
            <>
              {message.content ? (
                formatRoleplayContent(replaceMacros(message.content, { userName: userPersona?.name, charName: character.name }))
              ) : isThinkingActive ? (
                <div className="thinking-placeholder">
                  <span className="thinking-pulse-dot" />
                  <em>Formulating inner thoughts...</em>
                </div>
              ) : isStreaming ? (
                <span className="streaming-cursor" />
              ) : null}
              {isStreaming && message.content && <span className="streaming-cursor" />}
            </>
          )}
        </div>

        {/* Action Toolbar */}
        {!isEditing && !isStreaming && (
          <div className="message-actions">
            <button className="btn-msg-action" onClick={handleCopy} title="Copy text">
              {copied ? <Check size={12} style={{ color: 'var(--accent-emerald)' }} /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button className="btn-msg-action" onClick={() => setIsEditing(true)} title="Edit message">
              <Edit3 size={12} />
              <span>Edit</span>
            </button>

            {isLastAssistant && (
              <button
                className="btn-msg-action"
                onClick={onRegenerate}
                title="Regenerate alternative response"
              >
                <RotateCw size={12} />
                <span>Reroll</span>
              </button>
            )}

            <button
              className="btn-msg-action delete"
              onClick={() => onDeleteMessage(message.id)}
              title="Delete message"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
