import { useEffect } from 'react';
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';

function statusIcon(status) {
  if (status === 'success') return '✓';
  if (status === 'running') return '●';
  if (status === 'error') return '✕';
  if (status === 'skipped') return '—';
  return '○';
}

export default function MergeNode({ id, data }) {
  const updateNodeInternals = useUpdateNodeInternals();
  const statusClass =
    data.runStatus === 'running' ? 'is-running' : data.runStatus === 'error' ? 'is-error' : '';

  // App.jsx computes this: highest connected dot number + 1 (always one spare).
  const dotCount = data.dotCount || 1;

  // When the number of dots changes, tell React Flow to re-measure the
  // handles, otherwise edges attach to the wrong spot.
  useEffect(() => {
    updateNodeInternals(id);
  }, [dotCount, id, updateNodeInternals]);

  const dots = Array.from({ length: dotCount }, (_, i) => i + 1);

  return (
    <div className={`node-card node-card--merge ${statusClass}`} style={{ borderLeft: '4px solid #a855f7' }}>
      <div className="node-header">
        <div className="node-title-group">
          <span className="node-title">
            Merge
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
          <span className="node-label">Combine as</span>
          <select
            className="node-select nodrag"
            value={data.mode || 'newline'}
            onChange={(e) => data.onChange({ mode: e.target.value })}
            onBlur={data.onCommit}
          >
            <option value="newline">Lines (one per row)</option>
            <option value="space">Text (joined with space)</option>
            <option value="json">List (JSON)</option>
          </select>
        </div>

        {/* One row per input dot. Each dot sits on the left edge of its row. */}
        <div className="merge-inputs">
          {dots.map((n) => (
            <div key={n} className="merge-input-row">
              <Handle
                type="target"
                position={Position.Left}
                id={`in-${n}`}
                style={{ background: '#a855f7', width: 10, height: 10, top: '50%' }}
              />
              <span className="merge-input-label">Input {n}</span>
            </div>
          ))}
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: '#a855f7', width: 10, height: 10 }} />
    </div>
  );
}