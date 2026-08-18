import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function PromptTemplateNode({ data }) {
  return (
    <div className="node-card" style={{ borderLeft: '4px solid #f59e0b' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#f59e0b', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <span>📝</span>
          <span className="node-title">Prompt Template</span>
        </div>
        <button className="node-delete-btn nodrag" onClick={data.onDelete}>×</button>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">Template</span>
          <textarea
            className="node-textarea nodrag"
            rows={3}
            placeholder="Summarize this: {{input}}"
            value={data.template || ''}
            onChange={(e) => data.onChange({ template: e.target.value })}
            style={{ resize: 'none' }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#f59e0b', width: 10, height: 10 }} />
    </div>
  );
}