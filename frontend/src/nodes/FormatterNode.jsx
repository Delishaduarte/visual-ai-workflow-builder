import { Handle, Position } from '@xyflow/react';
import { FormatterIcon } from '../icons';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  return '○';
}

export default function FormatterNode({ data }) {
  const statusClass =
    data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';

  return (
    <div className={`node-card node-card--formatter ${statusClass}`} style={{ borderLeft: '4px solid #ec4899' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#ec4899', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <FormatterIcon />
          <span className="node-title">
            Formatter
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
          <span className="node-label">Format Type</span>
          <select
            className="node-select nodrag"
            value={data.formatType || 'text'}
            onChange={(e) => data.onChange({ formatType: e.target.value })}
            onBlur={data.onCommit}
          >
            <option value="text">Text</option>
            <option value="json">JSON</option>
            <option value="structured">Structured</option>
          </select>
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#ec4899', width: 10, height: 10 }} />
    </div>
  );
}