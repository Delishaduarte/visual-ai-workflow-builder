import React from 'react';
import { Handle, Position } from '@xyflow/react';

export default function FormatterNode({ data }) {
  return (
    <div className="node-card" style={{ borderLeft: '4px solid #ec4899' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#ec4899', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <span>⚡</span>
          <span className="node-title">Formatter</span>
        </div>
        <button className="node-delete-btn nodrag" onClick={data.onDelete}>×</button>
      </div>
      <div className="node-body">
        <div className="node-field">
          <span className="node-label">Format Type</span>
          <select
            className="node-select nodrag"
            value={data.formatType || 'text'}
            onChange={(e) => data.onChange({ formatType: e.target.value })}
          >
            <option value="text">Plain Text</option>
            <option value="json">JSON Object</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#ec4899', width: 10, height: 10 }} />
    </div>
  );
}