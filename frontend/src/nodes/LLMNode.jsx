import { Handle, Position } from '@xyflow/react';
import { LLMIcon } from '../icons';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  return '○';
}

export default function LLMNode({ data }) {
  const statusClass =
    data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';

  return (
    <div className={`node-card node-card--llm ${statusClass}`} style={{ borderLeft: '4px solid #6366f1' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#6366f1', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <LLMIcon />
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
            value={data.provider || 'openai'}
            onChange={(e) => data.onChange({ provider: e.target.value })}
            onBlur={data.onCommit}
          >
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
        <div className="node-field">
          <span className="node-label">Model</span>
          <input
            type="text"
            className="node-input nodrag"
            placeholder="gpt-4o-mini"
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
      <Handle type="source" position={Position.Right} style={{ background: '#6366f1', width: 10, height: 10 }} />
    </div>
  );
}