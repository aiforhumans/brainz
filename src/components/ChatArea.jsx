import React, { useRef, useEffect } from 'react'
import {
  MessageSquarePlus,
  RotateCcw,
  Download,
  Trash2,
  Edit,
  Sparkles,
  Layers,
  Flame,
} from 'lucide-react'
import { MessageItem } from './MessageItem'
import { ChatInput } from './ChatInput'
import { TokenOverviewBar } from './TokenOverviewBar'

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
  onEditMessage,
  onDeleteMessage,
  isStreaming,
  streamingStatus,
  userPersona,
  attachedImage,
  setAttachedImage,
  hasVisionSupport,
  brain,
  lorebook,
  settings,
  onOpenBrain,
  onOpenLorebook,
  promptPipeline,
}) {
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom on new messages or stream chunks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const characterSessions = sessions[character.id] || []

  // Find index of last assistant message for reroll
  const lastAssistantIndex = messages.map((m) => m.role).lastIndexOf('assistant')

  return (
    <main className="chat-view">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {character.avatar ? (
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
          <div className="chat-header-text">
            <h2>
              {character.name}
              {character.nsfw && (
                <span className="nsfw-badge-header">
                  <Flame size={10} fill="currentColor" /> 18+ NSFW
                </span>
              )}
              {character.category && (
                <span className="character-category-tag">{character.category}</span>
              )}
            </h2>
            <p>{character.tagline || 'Roleplay companion'}</p>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onNewSession}
            title="Start a new chat session with this character"
          >
            <MessageSquarePlus size={14} />
            <span>New Chat</span>
          </button>

          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onClearSession}
            title="Clear all messages in the current chat session"
          >
            <RotateCcw size={14} />
            <span>Clear Chat</span>
          </button>

          <button
            className="btn-nav-icon"
            onClick={onExportChat}
            title="Export chat transcript as Markdown"
            aria-label="Export chat"
          >
            <Download size={16} />
          </button>

          <button
            className="btn-nav-icon"
            onClick={onEditCharacter}
            title="Edit character profile & prompt"
            aria-label="Edit character"
          >
            <Edit size={16} />
          </button>

          {characterSessions.length > 1 && (
            <button
              className="btn-nav-icon"
              onClick={() => onDeleteSession(activeSessionId)}
              title="Delete current session"
              aria-label="Delete session"
            >
              <Trash2 size={16} className="icon-danger" />
            </button>
          )}
        </div>
      </div>

      {/* Session Pills Bar */}
      {characterSessions.length > 1 && (
        <div className="session-bar">
          <span className="session-bar-label">
            <Layers size={12} /> Sessions:
          </span>
          {characterSessions.map((sess, idx) => (
            <button
              key={sess.id}
              className={`session-tab ${sess.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(sess.id)}
            >
              {sess.title || `Story ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Messages Scroll Container */}
      <div className="messages-container">
        {/* Scenario Banner */}
        {character.scenario && (
          <div className="scenario-banner">
            <div className="scenario-title">
              <Sparkles size={14} />
              <span>Current Scenario & Setting</span>
            </div>
            <div className="scenario-text">{character.scenario}</div>
          </div>
        )}

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

      {/* Input Box */}
      <ChatInput
        input={input}
        setInput={setInput}
        attachedImage={attachedImage}
        setAttachedImage={setAttachedImage}
        hasVisionSupport={hasVisionSupport}
        onSend={onSendMessage}
        onStop={onStopGeneration}
        onContinue={onContinueGeneration}
        isStreaming={isStreaming}
        streamingStatus={streamingStatus}
        hasMessages={messages.length > 0}
      />

      {/* Memory & Context Token Overview Bar */}
      <TokenOverviewBar
        brain={brain}
        character={character}
        lorebook={lorebook}
        messages={messages}
        settings={settings}
        userPersona={userPersona}
        onOpenBrain={onOpenBrain}
        onOpenLorebook={onOpenLorebook}
        promptPipeline={promptPipeline}
      />
    </main>
  )
}
