import { Handle, Position } from '@xyflow/react';
import { PromptIcon } from '../icons';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  return '○';
}

export default function PromptTemplateNode({ data }) {
  const statusClass =
    data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';

  return (
    <div className={`node-card node-card--prompt ${statusClass}`} style={{ borderLeft: '4px solid #f59e0b' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#f59e0b', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
          <PromptIcon />
          <span className="node-title">
            Prompt Template
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
          <span className="node-label">Template</span>
          <textarea
            className="node-textarea nodrag"
            rows={3}
            placeholder={'Summarize this: {{customer_text}}'}
            value={data.template || ''}
            onChange={(e) => data.onChange({ template: e.target.value })}
            onBlur={data.onCommit}
            style={{ resize: 'none' }}
          />
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#f59e0b', width: 10, height: 10 }} />
    </div>
  );
}