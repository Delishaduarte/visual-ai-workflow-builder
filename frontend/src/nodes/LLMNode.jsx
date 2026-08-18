import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function LLMNode({ data }) {
  return (
    <div className="node-card" style={{ borderLeft: '4px solid #6366f1' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#6366f1', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <span>🤖</span>
          <span className="node-title">LLM Engine</span>
        </div>
        <button className="node-delete-btn nodrag" onClick={data.onDelete}>×</button>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">Provider</span>
          <select
            className="node-select nodrag"
            value={data.provider || 'openai'}
            onChange={(e) => data.onChange({ provider: e.target.value })}
          >
            <option value="openai">OpenAI</option>
            <option value="groq">Groq</option>
            <option value="gemini">Google Gemini</option>
          </select>
        </div>
        <div className="node-field">
          <span className="node-label">Model</span>
          <input
            type="text"
            className="node-input nodrag"
            placeholder="gpt-4o-mini"
            value={data.model || 'gpt-4o-mini'}
            onChange={(e) => data.onChange({ model: e.target.value })}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#6366f1', width: 10, height: 10 }} />
    </div>
  );
}