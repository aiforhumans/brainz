import React, { useState } from 'react'
import { X, Save, RefreshCw, CheckCircle, AlertCircle, Sliders, Flame } from 'lucide-react'

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  models,
  onRefreshHealth,
  connectionStatus,
}) {
  const [formData, setFormData] = useState({ ...settings })
  const [testResult, setTestResult] = useState(null)
  const [isTesting, setIsTesting] = useState(false)

  React.useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings })
      setTestResult(null)
    }
  }, [isOpen, settings])

  if (!isOpen) return null

  const handleTestConnection = async () => {
    setIsTesting(true)
    setTestResult(null)
    const result = await onRefreshHealth()
    setIsTesting(false)
    setTestResult(result)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSaveSettings(formData)
    onClose()
  }

  const applyPreset = (preset) => {
    setFormData((prev) => ({
      ...prev,
      ...preset,
    }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} style={{ color: 'var(--primary-hover)' }} />
            <h3>LM Studio & Generation Settings</h3>
          </div>
          <button className="btn-nav-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            {/* Server Connection Group */}
            <div className="form-group">
              <label className="form-label">
                <span>LM Studio Server URL</span>
                <span className="form-sublabel">Default proxy avoids browser CORS</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="form-input"
                  value={formData.useProxy ? formData.serverUrl : formData.directUrl}
                  onChange={(e) => {
                    const val = e.target.value
                    if (formData.useProxy) {
                      setFormData({ ...formData, serverUrl: val })
                    } else {
                      setFormData({ ...formData, directUrl: val })
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  style={{ whiteSpace: 'nowrap', padding: '0 16px' }}
                >
                  <RefreshCw
                    size={14}
                    style={{
                      transform: isTesting ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.4s ease',
                    }}
                  />
                  <span>Test Ping</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.useProxy}
                    onChange={(e) => setFormData({ ...formData, useProxy: e.target.checked })}
                  />
                  <span>Use Vite Dev Proxy (recommended for local development)</span>
                </label>
              </div>

              {testResult ? (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: testResult.connected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${testResult.connected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: testResult.connected ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {testResult.connected ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>
                    {testResult.connected
                      ? `Connected to LM Studio successfully (${testResult.latencyMs}ms latency).`
                      : `Connection failed: ${testResult.error}`}
                  </span>
                </div>
              ) : connectionStatus ? (
                <div
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: connectionStatus.connected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${connectionStatus.connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                    color: connectionStatus.connected ? '#6ee7b7' : '#fca5a5',
                  }}
                >
                  {connectionStatus.connected ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  <span>
                    {connectionStatus.connected
                      ? `LM Studio Status: Connected (${connectionStatus.latencyMs}ms latency)`
                      : `LM Studio Status: ${connectionStatus.error || 'Offline / Disconnected'}`}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Model Selection */}
            <div className="form-group">
              <label className="form-label">
                <span>Active Model</span>
                <span className="form-sublabel">Loaded or available in LM Studio</span>
              </label>
              <select
                className="form-select"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              >
                {models.length > 0 ? (
                  models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.quantization ? `[${m.quantization}]` : ''} {m.isLoaded ? '(Loaded)' : ''}
                    </option>
                  ))
                ) : (
                  <option value={formData.model}>{formData.model || 'Auto / Default'}</option>
                )}
              </select>
            </div>

            {/* Global NSFW / Uncensored Roleplay Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: formData.nsfwMode
                  ? 'linear-gradient(135deg, rgba(225, 29, 72, 0.15), rgba(159, 18, 57, 0.08))'
                  : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${formData.nsfwMode ? 'rgba(225, 29, 72, 0.35)' : 'var(--border-subtle)'}`,
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Flame size={20} style={{ color: formData.nsfwMode ? '#f43f5e' : 'var(--text-dim)' }} />
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: formData.nsfwMode ? '#fff' : 'var(--text-subtle)' }}>
                    🔞 Global NSFW / Uncensored Roleplay Mode
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Directs local models to permit mature themes, passionate romance, intimate scenes, and zero refusal lecturing.
                  </div>
                </div>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(formData.nsfwMode)}
                  onChange={(e) => setFormData({ ...formData, nsfwMode: e.target.checked })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    inset: 0,
                    backgroundColor: formData.nsfwMode ? '#e11d48' : 'rgba(255, 255, 255, 0.15)',
                    transition: '0.2s',
                    borderRadius: '24px',
                    boxShadow: formData.nsfwMode ? '0 0 12px rgba(225, 29, 72, 0.5)' : 'none',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '18px',
                      width: '18px',
                      left: formData.nsfwMode ? '22px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.2s',
                      borderRadius: '50%',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* Roleplay Presets */}
            <div className="form-group">
              <label className="form-label">
                <span>Roleplay Sampler Presets</span>
                <span className="form-sublabel">Optimized for local uncensored models</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => applyPreset({ temperature: 0.72, topP: 0.90, minP: 0.06, repeatPenalty: 1.10, maxTokens: 800 })}
                  style={{ fontSize: '0.75rem', padding: '7px 8px', textAlign: 'left', border: '1px solid rgba(168, 85, 247, 0.4)' }}
                >
                  💬 <strong>Realistic 1-on-1</strong> (0.72 / 0.06)
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => applyPreset({ temperature: 0.85, topP: 0.95, minP: 0.08, repeatPenalty: 1.12, maxTokens: 1200 })}
                  style={{ fontSize: '0.75rem', padding: '7px 8px', textAlign: 'left' }}
                >
                  🎭 <strong>Novelist</strong> (0.85 / 0.08)
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => applyPreset({ temperature: 0.65, topP: 0.88, minP: 0.05, repeatPenalty: 1.08, maxTokens: 900 })}
                  style={{ fontSize: '0.75rem', padding: '7px 8px', textAlign: 'left' }}
                >
                  ⚔️ <strong>Tactical RPG</strong> (0.65 / 0.05)
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => applyPreset({ temperature: 0.95, topP: 0.96, minP: 0.10, repeatPenalty: 1.14, maxTokens: 1400, nsfwMode: true })}
                  style={{ fontSize: '0.75rem', padding: '7px 8px', textAlign: 'left' }}
                >
                  🔥 <strong>Passionate RP</strong> (0.95 / 0.10)
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => applyPreset({ temperature: 1.05, topP: 0.98, minP: 0.12, repeatPenalty: 1.16, maxTokens: 1600 })}
                  style={{ fontSize: '0.75rem', padding: '7px 8px', textAlign: 'left' }}
                >
                  ⚡ <strong>Wild Stream</strong> (1.05 / 0.12)
                </button>
              </div>
            </div>

            {/* Pro Roleplay Samplers: Min P & Repeat Penalty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <div className="form-label">
                  <span>Min P: {formData.minP ?? 0.08}</span>
                  <span className="form-sublabel">Dynamic confidence cutoff (modern standard)</span>
                </div>
                <input
                  type="range"
                  className="form-slider"
                  min="0.0"
                  max="0.25"
                  step="0.01"
                  value={formData.minP ?? 0.08}
                  onChange={(e) => setFormData({ ...formData, minP: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <div className="form-label">
                  <span>Repeat Penalty: {formData.repeatPenalty ?? 1.12}</span>
                  <span className="form-sublabel">Prevents dialogue loops & catchphrases</span>
                </div>
                <input
                  type="range"
                  className="form-slider"
                  min="1.0"
                  max="1.30"
                  step="0.01"
                  value={formData.repeatPenalty ?? 1.12}
                  onChange={(e) => setFormData({ ...formData, repeatPenalty: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            {/* Temperature & Top P Sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <div className="form-label">
                  <span>Temperature: {formData.temperature}</span>
                  <span className="form-sublabel">Creativity & variation</span>
                </div>
                <input
                  type="range"
                  className="form-slider"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <div className="form-label">
                  <span>Top P (Nucleus): {formData.topP}</span>
                  <span className="form-sublabel">Cumulative token probability</span>
                </div>
                <input
                  type="range"
                  className="form-slider"
                  min="0.1"
                  max="1.0"
                  step="0.02"
                  value={formData.topP}
                  onChange={(e) => setFormData({ ...formData, topP: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            {/* Reasoning & Thought Process Control */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">
                  <span>Reasoning Effort</span>
                  <span className="form-sublabel">For thinking models (R1, QwQ, Gemma)</span>
                </label>
                <select
                  className="form-select"
                  value={formData.reasoning || 'auto'}
                  onChange={(e) => setFormData({ ...formData, reasoning: e.target.value })}
                >
                  <option value="auto">Auto / Model Default</option>
                  <option value="on">On (Full Thinking)</option>
                  <option value="high">High Effort</option>
                  <option value="medium">Medium Effort</option>
                  <option value="low">Low Effort</option>
                  <option value="off">Off (Direct Output)</option>
                </select>
              </div>

              <div className="form-group">
                <div className="form-label">
                  <span>Max Tokens: {formData.maxTokens}</span>
                  <span className="form-sublabel">Response length ceiling</span>
                </div>
                <input
                  type="range"
                  className="form-slider"
                  min="128"
                  max="3072"
                  step="64"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value, 10) })}
                />
              </div>
            </div>

            {/* Model Lifecycle & VRAM Allocation Configuration */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>
                ⚡ Hardware & VRAM Lifecycle Configuration
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <span>Default Context Length</span>
                    <span className="form-sublabel">When loading models into VRAM</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.contextLength || 8192}
                    onChange={(e) => setFormData({ ...formData, contextLength: parseInt(e.target.value, 10) })}
                  >
                    <option value={4096}>4,096 tokens (Low VRAM / 4K)</option>
                    <option value={8192}>8,192 tokens (Standard / 8K)</option>
                    <option value={16384}>16,384 tokens (High / 16K)</option>
                    <option value={32768}>32,768 tokens (Extended / 32K)</option>
                    <option value={65536}>65,536 tokens (Ultra / 64K)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    <span>Idle TTL Auto-Evict</span>
                    <span className="form-sublabel">Free GPU memory when inactive</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.ttl || 0}
                    onChange={(e) => setFormData({ ...formData, ttl: parseInt(e.target.value, 10) })}
                  >
                    <option value={0}>Disabled (Keep in VRAM)</option>
                    <option value={600}>10 minutes</option>
                    <option value={1800}>30 minutes</option>
                    <option value={3600}>1 hour</option>
                  </select>
                </div>
              </div>

              <label style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.flashAttention ?? true}
                  onChange={(e) => setFormData({ ...formData, flashAttention: e.target.checked })}
                />
                <span>Enable Flash Attention for memory optimization (llama.cpp engine)</span>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Save size={14} />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
