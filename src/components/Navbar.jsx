import {
  Sparkles,
  Cpu,
  BookOpen,
  User,
  Settings as SettingsIcon,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  Eye,
  Zap,
  PowerOff,
  Loader2,
  Brain,
} from 'lucide-react'

export function Navbar({
  connectionStatus,
  onRefreshHealth,
  models,
  selectedModel,
  onSelectModel,
  onOpenSettings,
  onOpenPersona,
  onOpenLorebook,
  onOpenBrain,
  brainMemoriesCount = 0,
  isBrainSynthesizing = false,
  brainEnabled = true,
  userPersona,
  sidebarCollapsed,
  onToggleSidebar,
  onLoadModel,
  onUnloadModel,
  isModelLoading,
}) {
  const activeModel = models.find((m) => m.id === selectedModel || m.key === selectedModel)
  const isLoaded = Boolean(activeModel?.isLoaded)
  const hasVision = Boolean(activeModel?.capabilities?.vision)

  return (
    <header className="navbar">
      <div className="brand-section">
        <button
          className="btn-nav-icon"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label="Toggle Sidebar"
        >
          {sidebarCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        <div className="brand-logo">
          <Sparkles size={20} />
        </div>

        <div className="brand-titles">
          <span className="brand-title">LoreForge</span>
          <span className="brand-badge">LM Studio Roleplay</span>
        </div>
      </div>

      <div className="nav-actions">
        {/* Model Selector & Lifecycle Hub */}
        <div className="nav-model-cluster">
          <div className="model-selector-wrap">
            <Cpu size={14} className="model-selector-icon" />
            <select
              value={selectedModel}
              onChange={(e) => onSelectModel(e.target.value)}
              aria-label="Select Model"
              className="model-selector-select"
            >
              {models.length > 0 ? (
                models.map((m) => (
                  <option key={m.id} value={m.id} className="model-selector-option">
                    {m.name} {m.quantization ? `(${m.quantization})` : ''} {m.isLoaded ? '● Loaded' : ''}
                  </option>
                ))
              ) : (
                <option value={selectedModel} className="model-selector-option">
                  {selectedModel || 'No models detected'}
                </option>
              )}
            </select>
          </div>

          {/* Model Vision Capability Badge */}
          {hasVision && (
            <span
              className="badge-pill-vision"
              title="Vision Capable: This model can inspect and react to image attachments!"
            >
              <Eye size={12} />
              <span>Vision</span>
            </span>
          )}

          {/* Model VRAM Lifecycle Action (Load / Eject) */}
          {activeModel && (
            <div className="vram-action-wrap">
              {isModelLoading ? (
                <button
                  type="button"
                  className="btn-vram-action loading"
                  disabled
                  title="Processing model lifecycle request..."
                >
                  <Loader2 size={12} className="spin-fast" />
                  <span>Processing...</span>
                </button>
              ) : isLoaded ? (
                <button
                  type="button"
                  className="btn-vram-action eject"
                  onClick={() => onUnloadModel?.(activeModel.loadedInstanceId || activeModel.id)}
                  title={`Model active in VRAM (${activeModel.loadedContextLength ? Math.round(activeModel.loadedContextLength / 1024) + 'k ctx' : 'Loaded'}). Click to eject and free GPU memory.`}
                >
                  <PowerOff size={11} />
                  <span>Eject VRAM</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-vram-action load"
                  onClick={() => onLoadModel?.(activeModel.key || activeModel.id)}
                  title="Load this model into GPU VRAM with configured context length"
                >
                  <Zap size={11} />
                  <span>Load VRAM</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Server Connection Status */}
        <div
          className="connection-badge"
          onClick={onRefreshHealth}
          title={
            connectionStatus.connected
              ? `Connected to LM Studio (${connectionStatus.latencyMs}ms). Click to refresh.`
              : `Disconnected: ${connectionStatus.error || 'Server unreachable'}. Click to retry.`
          }
        >
          <span className={`status-dot ${connectionStatus.connected ? 'online' : 'offline'}`} />
          <span>
            {connectionStatus.connected
              ? `LM Studio (${connectionStatus.latencyMs}ms)`
              : 'Offline'}
          </span>
          <RefreshCw
            size={12}
            className={`connection-refresh-icon ${connectionStatus.isChecking ? 'checking' : ''}`}
          />
        </div>

        {/* Neural Brain / Memory Data Bank Trigger */}
        <button
          className={`btn-nav-brain ${isBrainSynthesizing ? 'synthesizing' : ''} ${!brainEnabled ? 'disabled' : ''}`}
          onClick={onOpenBrain}
          title={
            isBrainSynthesizing
              ? 'Brain is currently analyzing chats...'
              : `AI Brain Data Bank (${brainMemoriesCount} memories stored)`
          }
          aria-label="Open Brain Data Bank"
        >
          <Brain size={16} className="brain-nav-icon" />
          <span className="brain-nav-label">Brain</span>
          <span className="brain-nav-badge">{brainMemoriesCount}</span>
        </button>

        {/* Lorebook Trigger */}
        <button
          className="btn-nav-icon"
          onClick={onOpenLorebook}
          title="World Lore & Lorebook Memory"
          aria-label="Open Lorebook"
        >
          <BookOpen size={18} />
        </button>

        {/* User Persona Trigger */}
        <button
          className="btn-nav-icon"
          onClick={onOpenPersona}
          title={`User Persona: ${userPersona?.name || 'Alex'}`}
          aria-label="Open User Persona"
        >
          <User size={18} />
        </button>

        {/* Settings Trigger */}
        <button
          className="btn-nav-icon"
          onClick={onOpenSettings}
          title="LM Studio & Model Settings"
          aria-label="Open Settings"
        >
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  )
}

