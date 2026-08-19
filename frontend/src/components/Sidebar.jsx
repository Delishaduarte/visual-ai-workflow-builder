import { useRef } from 'react';

// Sidebar now handles: node palette (unchanged), workflow name,
// New/Save/Load/Delete, Export/Import, and Clear Canvas.
export default function Sidebar({
  workflowName,
  onWorkflowNameChange,
  onNewWorkflow,
  onSaveWorkflow,
  onExportWorkflow,
  onImportWorkflow,
  savedWorkflowNames,
  onLoadWorkflow,
  onDeleteWorkflow,
  onClearCanvas,
}) {
  // A hidden native file input, triggered programmatically by our
  // visible "Import JSON" button — this is a common pattern since
  // <input type="file"> can't be styled well directly.
  const fileInputRef = useRef(null);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleFileSelected = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    onImportWorkflow(file);
    // Reset the input so selecting the SAME file again still fires onChange.
    event.target.value = '';
  };

  return (
    <aside className="sidebar">
      <h3 className="sidebar-title">Nodes</h3>
      <p className="sidebar-desc">Drag a node onto the canvas to add it.</p>

      <div className="node-palette">
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'inputNode')}>
          📥 Input
        </div>
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'promptTemplateNode')}>
          📝 Prompt Template
        </div>
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'llmNode')}>
          🤖 LLM
        </div>
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'formatterNode')}>
          ⚡ Formatter
        </div>
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'outputNode')}>
          📤 Output
        </div>
      </div>

      <h3 className="sidebar-section-title">Workflow</h3>
      <input
        type="text"
        className="workflow-name-input"
        placeholder="Untitled Workflow"
        value={workflowName}
        onChange={(e) => onWorkflowNameChange(e.target.value)}
      />

      <button className="sidebar-btn" onClick={onNewWorkflow}>🆕 New Workflow</button>
      <button className="sidebar-btn" onClick={onSaveWorkflow}>💾 Save</button>

      <h3 className="sidebar-section-title">Saved Workflows</h3>
      {savedWorkflowNames.length === 0 && (
        <p className="sidebar-desc">No saved workflows yet.</p>
      )}
      {savedWorkflowNames.map((name) => (
        <div key={name} className="saved-workflow-row">
          <span className="saved-workflow-row-name" onClick={() => onLoadWorkflow(name)}>
            {name}
          </span>
          <button className="saved-workflow-delete" onClick={() => onDeleteWorkflow(name)}>×</button>
        </div>
      ))}

      <h3 className="sidebar-section-title">JSON File</h3>
      <button className="sidebar-btn" onClick={onExportWorkflow}>⬇ Export JSON</button>
      <button className="sidebar-btn" onClick={() => fileInputRef.current.click()}>⬆ Import JSON</button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden-file-input"
        onChange={handleFileSelected}
      />

      <div style={{ marginTop: 'auto' }}>
        <button className="clear-btn" onClick={onClearCanvas}>Clear Canvas</button>
      </div>
    </aside>
  );
}