import { Handle, Position } from '@xyflow/react';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  if (status === 'skipped') return '—';
  return '○';
}

// Model placeholders shown per provider, just to hint at a real value —
// typing your own model name always overrides these.
const MODEL_HINTS = {
  gemini: 'gemini-3.6-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-5',
  openrouter: 'openai/gpt-4o-mini',
};

export default function LLMNode({ data }) {
  const statusClass =
    data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';
  const provider = data.provider || 'gemini';

  return (
    <div className={`node-card node-card--llm ${statusClass}`} style={{ borderLeft: '4px solid #6366f1' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#6366f1', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <span className="node-title">
            LLM
            {data.runStatus && (
              <span className={`node-status-badge ${data.runStatus}`}>{statusIcon(data.runStatus)}</span>
            )}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="node-delete-btn nodrag" onClick={data.onDuplicate} title="Duplicate">⧉</button>
          <button className="node-delete-btn nodrag" onClick={data.onDelete} title="Delete">×</button>
        </div>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">Provider</span>
          <select
            className="node-select nodrag"
            value={provider}
            onChange={(e) => data.onChange({ provider: e.target.value })}
            onBlur={data.onCommit}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div className="node-field">
          <span className="node-label">API Key (not stored)</span>
          <input
            type="password"
            className="node-input nodrag"
            placeholder="Paste your API key"
            autoComplete="off"
            value={data.apiKey || ''}
            onChange={(e) => data.onChange({ apiKey: e.target.value })}
            onBlur={data.onCommit}
          />
        </div>

        <div className="node-field">
          <span className="node-label">Model</span>
          <input
            type="text"
            className="node-input nodrag"
            placeholder={MODEL_HINTS[provider]}
            value={data.model || ''}
            onChange={(e) => data.onChange({ model: e.target.value })}
            onBlur={data.onCommit}
          />
        </div>
        <div className="node-field">
          <span className="node-label">Temperature</span>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            className="node-input nodrag"
            placeholder="0.7"
            value={data.temperature ?? ''}
            onChange={(e) => data.onChange({ temperature: e.target.value })}
            onBlur={data.onCommit}
          />
        </div>
        <div className="node-field">
          <span className="node-label">Max Tokens</span>
          <input
            type="number"
            className="node-input nodrag"
            placeholder="2000"
            value={data.maxTokens ?? ''}
            onChange={(e) => data.onChange({ maxTokens: e.target.value })}
            onBlur={data.onCommit}
          />
        </div>
                <div className="node-field">
          <span className="node-label">System Prompt</span>
          <textarea
            className="node-textarea nodrag"
            rows={2}
            placeholder="You are a helpful assistant..."
            value={data.systemPrompt || ''}
            onChange={(e) => data.onChange({ systemPrompt: e.target.value })}
            onBlur={data.onCommit}
            style={{ resize: 'none' }}
          />
        </div>
      </div>
      {data.tokenUsage && (
        <div className="node-token-usage">
          Tokens used: {data.tokenUsage.totalTokens}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: '#6366f1', width: 10, height: 10 }} />
    </div>
  );
}