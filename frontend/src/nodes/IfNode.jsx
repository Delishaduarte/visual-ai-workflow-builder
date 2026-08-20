import { Handle, Position } from '@xyflow/react';
import { IfIcon } from '../icons';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  if (status === 'skipped') return '—';
  return '○';
}

export default function IfNode({ data }) {
  const statusClass =
    data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';
  const showCompareValue = data.operator !== 'not_empty';

  return (
    <div className={`node-card node-card--if ${statusClass}`} style={{ borderLeft: '4px solid #eab308' }}>
      <Handle type="target" position={Position.Left} style={{ background: '#eab308', width: 10, height: 10 }} />
      <div className="node-header">
        <div className="node-title-group">
            <IfIcon />
          <span className="node-title">
            IF
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
          <span className="node-label">Condition</span>
          <select
            className="node-select nodrag"
            value={data.operator || 'not_empty'}
            onChange={(e) => data.onChange({ operator: e.target.value })}
            onBlur={data.onCommit}
          >
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="not_empty">Is not empty</option>
          </select>
        </div>
        {showCompareValue && (
          <div className="node-field">
            <span className="node-label">Compare Value</span>
            <input
              type="text"
              className="node-input nodrag"
              placeholder="text to compare"
              value={data.compareValue || ''}
              onChange={(e) => data.onChange({ compareValue: e.target.value })}
              onBlur={data.onCommit}
            />
          </div>
        )}
      </div>
      <div style={{ position: 'relative', height: '56px', padding: '4px 0' }}>
        <span style={{ position: 'absolute', right: 26, top: 10, fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>True</span>
        <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ background: '#16a34a', width: 12, height: 12, top: 16 }}
        />
        <span style={{ position: 'absolute', right: 24, top: 38, fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>False</span>
        <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ background: '#ef4444', width: 12, height: 12, top: 44 }}
        />
        </div>
    </div>
  );
}