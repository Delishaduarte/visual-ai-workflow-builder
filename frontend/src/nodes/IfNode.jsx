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
  const checkType = data.checkType || 'not_empty';

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
          <span className="node-label">Check type</span>
          <select
            className="node-select nodrag"
            value={checkType}
            onChange={(e) => data.onChange({ checkType: e.target.value })}
            onBlur={data.onCommit}
          >
            <option value="condition">Condition</option>
            <option value="contains">Contains</option>
            <option value="not_empty">Is Not Empty</option>
          </select>
        </div>

        {checkType === 'condition' && (
          <div className="node-field">
            <span className="node-label">Condition</span>
            <input
              type="text"
              className="node-input nodrag"
              placeholder='value >= 100'
              value={data.conditionExpression || ''}
              onChange={(e) => data.onChange({ conditionExpression: e.target.value })}
              onBlur={data.onCommit}
            />
            <span className="node-hint">ⓘ <code>value</code> means the output from the previous node.</span>
          </div>
        )}

        {checkType === 'contains' && (
          <div className="node-field">
            <span className="node-label">Contains</span>
            <input
              type="text"
              className="node-input nodrag"
              placeholder="invoice"
              value={data.compareValue || ''}
              onChange={(e) => data.onChange({ compareValue: e.target.value })}
              onBlur={data.onCommit}
            />
            <span className="node-hint">ⓘ Checks whether the previous node's output contains this text.</span>
          </div>
        )}

        {checkType === 'not_empty' && (
          <span className="node-hint">ⓘ Checks whether the previous node produced a value.</span>
        )}
      </div>

      <div className="if-outputs">
        <div className="if-output-row">
          <span className="if-output-label if-output-true">TRUE</span>
          <Handle type="source" position={Position.Right} id="true" className="if-handle if-handle-true" />
        </div>
        <div className="if-output-row">
          <span className="if-output-label if-output-false">FALSE</span>
          <Handle type="source" position={Position.Right} id="false" className="if-handle if-handle-false" />
        </div>
      </div>
    </div>
  );
}