import React, { useRef, useEffect, useState } from 'react'
import {
  RotateCcw,
  Download,
  Trash2,
  Flame,
  ArrowDown,
  Edit3,
  SlidersHorizontal,
  Plus,
  Sparkles,
  BookOpen,
  ChevronDown,
  Check,
} from 'lucide-react'
import { MessageItem } from './MessageItem'
import { ChatInput } from './ChatInput'
import { AvatarImage } from './AvatarImage'

export function ChatArea({
  character,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onClearSession,
  onRestoreGreeting,
  onDeleteSession,
  onEditCharacter,
  onExportChat,
  messages,
  input,
  setInput,
  onSendMessage,
  onStopGeneration,
  onContinueGeneration,
  onRegenerate,
  onSelectSwipe,
  onDeleteSwipe,
  onEditMessage,
  onDeleteMessage,
  isStreaming,
  streamingStatus,
  userPersona,
  attachedImage,
  setAttachedImage,
  hasVisionSupport,
  inspectorOpen = false,
  onToggleInspector,
}) {
  const messagesEndRef = useRef(null)
  const containerRef = useRef(null)
  const chapterDropdownRef = useRef(null)
  const [isScrolledUp, setIsScrolledUp] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showChapterDropdown, setShowChapterDropdown] = useState(false)

  // Track user scroll position: if scrolled up >80px from bottom, pause auto-scroll
  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom > 80) {
      setIsScrolledUp(true)
    } else {
      setIsScrolledUp(false)
      setUnreadCount(0)
    }
  }

  // Auto-scroll to bottom on new messages or stream chunks unless user scrolled up
  useEffect(() => {
    if (!isScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' })
    } else if (isStreaming) {
      setUnreadCount((prev) => prev + 1)
    }
  }, [messages, isStreaming, isScrolledUp])

  const handleJumpToBottom = () => {
    setIsScrolledUp(false)
    setUnreadCount(0)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Close chapter dropdown on outside click
  useEffect(() => {
    if (!showChapterDropdown) return
    const handleClickOutside = (e) => {
      if (chapterDropdownRef.current && !chapterDropdownRef.current.contains(e.target)) {
        setShowChapterDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showChapterDropdown])

  const characterSessions = sessions[character.id] || []
  const currentSession = characterSessions.find((s) => s.id === activeSessionId) || characterSessions[0]

  // Find index of the latest assistant message for swiping and regeneration
  const lastAssistantIndex = messages.findLastIndex((m) => m.role === 'assistant')

  return (
    <main className="chat-area" aria-label={`Chat with ${character.name}`}>
      {/* Unified Context Header */}
      <div className="chat-header-unified">
        {/* Left: Character Identity & Chapter Dropdown Group */}
        <div className="chat-header-left-group">
          <div className="chat-header-identity">
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
              <div className="chat-header-title-row">
                <h2 className="chat-header-title">{character.name}</h2>
                {character.nsfw && (
                  <span className="nsfw-badge-header">
                    <Flame size={10} fill="currentColor" /> 18+
                  </span>
                )}
                {character.category && (
                  <span className="character-category-tag">{character.category}</span>
                )}
              </div>
              <p className="chat-header-tagline">{character.tagline || 'Roleplay companion'}</p>
            </div>
          </div>

          <div className="chat-header-divider" />

          {/* Unified Chapter Dropdown */}
          <div className="chapter-dropdown-wrapper" ref={chapterDropdownRef}>
            <button
              type="button"
              className={`chapter-dropdown-btn ${showChapterDropdown ? 'active' : ''}`}
              onClick={() => setShowChapterDropdown(!showChapterDropdown)}
              title="Switch chapter or session actions"
              aria-expanded={showChapterDropdown}
            >
              <BookOpen size={14} className="chapter-dropdown-icon" />
              <span className="chapter-dropdown-title">
                {currentSession?.title || 'Chapter 1'}
              </span>
              <ChevronDown size={13} className={`chapter-dropdown-arrow ${showChapterDropdown ? 'open' : ''}`} />
            </button>

            {showChapterDropdown && (
              <div className="chapter-dropdown-menu">
                <div className="chapter-dropdown-header">
                  <span className="chapter-menu-heading">Chapters</span>
                  <button
                    type="button"
                    className="btn-chapter-add"
                    onClick={() => {
                      setShowChapterDropdown(false)
                      onNewSession()
                    }}
                    title="Start a new chapter"
                  >
                    <Plus size={12} />
                    <span>New</span>
                  </button>
                </div>

                <div className="chapter-dropdown-list">
                  {characterSessions.map((sess, idx) => {
                    const isActive = sess.id === activeSessionId
                    return (
                      <button
                        key={sess.id}
                        type="button"
                        className={`chapter-dropdown-item ${isActive ? 'active' : ''}`}
                        onClick={() => {
                          setShowChapterDropdown(false)
                          onSelectSession(sess.id)
                        }}
                      >
                        <span className="chapter-item-name">{sess.title || `Chapter ${idx + 1}`}</span>
                        {isActive && <Check size={13} className="chapter-item-check" />}
                      </button>
                    )
                  })}
                </div>

                <div className="chapter-dropdown-divider" />

                <div className="chapter-dropdown-actions">
                  {character.greeting && onRestoreGreeting && (
                    <button
                      type="button"
                      className="chapter-action-item"
                      onClick={() => {
                        setShowChapterDropdown(false)
                        onRestoreGreeting()
                      }}
                    >
                      <RotateCcw size={13} />
                      <span>Restore Greeting</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="chapter-action-item"
                    onClick={() => {
                      setShowChapterDropdown(false)
                      onExportChat?.()
                    }}
                  >
                    <Download size={13} />
                    <span>Export Transcript (.md)</span>
                  </button>

                  <button
                    type="button"
                    className="chapter-action-item"
                    onClick={() => {
                      setShowChapterDropdown(false)
                      onClearSession?.()
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Clear Turn History</span>
                  </button>

                  {characterSessions.length > 1 && (
                    <button
                      type="button"
                      className="chapter-action-item danger"
                      onClick={() => {
                        setShowChapterDropdown(false)
                        onDeleteSession?.(activeSessionId)
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Delete Chapter</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Group: Edit Character & Toggle Inspector */}
        <div className="chat-header-actions-group">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onEditCharacter}
            title="Edit character profile in Character Studio"
          >
            <Edit3 size={13} />
            <span>Edit</span>
          </button>

          <button
            type="button"
            className={`btn-inspector-toggle ${inspectorOpen ? 'active' : ''}`}
            onClick={onToggleInspector}
            title={inspectorOpen ? 'Close Inspector (Ctrl+I)' : 'Open Inspector (Ctrl+I)'}
            aria-label="Toggle Inspector"
          >
            <SlidersHorizontal size={14} />
            <span>Inspector</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Container */}
      <div className="messages-container has-floating-dock" ref={containerRef} onScroll={handleScroll}>
        <div className="messages-stream">
          {/* Message Thread */}
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <MessageItem
                key={msg.id || index}
                message={msg}
                character={character}
                userPersona={userPersona}
                isLastAssistant={index === lastAssistantIndex && !isStreaming}
                isStreaming={isStreaming && index === messages.length - 1 && msg.role === 'assistant'}
                onRegenerate={onRegenerate}
                onContinue={onContinueGeneration}
                onSelectSwipe={onSelectSwipe}
                onDeleteSwipe={onDeleteSwipe}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
              />
            ))
          ) : (
            <div className="empty-chat-state">
              <div className="empty-chat-icon">
                <Sparkles size={32} />
              </div>
              <h3>Chat Session Cleared</h3>
              <p className="empty-chat-description">
                All messages in this session have been cleared. Type below to start fresh, or restore {character.name}&apos;s opening greeting.
              </p>
              {character.greeting && onRestoreGreeting && (
                <button
                  type="button"
                  className="btn-secondary btn-restore-greeting"
                  onClick={onRestoreGreeting}
                >
                  <RotateCcw size={14} />
                  <span>Restore Opening Greeting</span>
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Floating Jump to Latest Button */}
        {isScrolledUp && (
          <button
            type="button"
            className="jump-to-bottom-btn"
            onClick={handleJumpToBottom}
            title="Jump to latest message"
          >
            <ArrowDown size={14} />
            <span>Jump to latest</span>
            {unreadCount > 0 && <span className="jump-unread-badge">{unreadCount}</span>}
          </button>
        )}
      </div>

      {/* Floating Omni-Dock (Pure, Streamlined Input Island) */}
      <div className="chat-floating-dock-wrap">
        <ChatInput
          input={input}
          setInput={setInput}
          attachedImage={attachedImage}
          setAttachedImage={setAttachedImage}
          hasVisionSupport={hasVisionSupport}
          onSend={onSendMessage}
          onStop={onStopGeneration}
          isStreaming={isStreaming}
          streamingStatus={streamingStatus}
        />
      </div>
    </main>
  )
}
