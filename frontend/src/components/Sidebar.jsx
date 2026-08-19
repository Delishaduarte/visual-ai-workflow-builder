import { useRef } from 'react';
import {
  InputIcon,
  PromptIcon,
  LLMIcon,
  FormatterIcon,
  OutputIcon,
  SunIcon,
  MoonIcon,
  TrashIcon,
  DownloadIcon,
  UploadIcon,
  SaveIcon,
  NewIcon,
} from '../icons';

export default function Sidebar({
  theme,
  onToggleTheme,
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
  const fileInputRef = useRef(null);

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleFileSelected = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    onImportWorkflow(file);
    event.target.value = '';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header-row">
        <h3 className="sidebar-title">Nodes</h3>
        <button className="theme-toggle-btn" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>
      <p className="sidebar-desc">Drag a node onto the canvas to add it.</p>

      <div className="node-palette">
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'inputNode')}>
          <InputIcon /> Input
        </div>
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'promptTemplateNode')}>
          <PromptIcon /> Prompt Template
        </div>
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'llmNode')}>
          <LLMIcon /> LLM
        </div>
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'formatterNode')}>
          <FormatterIcon /> Formatter
        </div>
        <div className="dndnode" draggable onDragStart={(e) => onDragStart(e, 'outputNode')}>
          <OutputIcon /> Output
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

      <button className="sidebar-btn" onClick={onNewWorkflow}><NewIcon /> New Workflow</button>
      <button className="sidebar-btn" onClick={onSaveWorkflow}><SaveIcon /> Save</button>

      <h3 className="sidebar-section-title">Saved Workflows</h3>
      {savedWorkflowNames.length === 0 && (
        <p className="sidebar-desc">No saved workflows yet.</p>
      )}
      {savedWorkflowNames.map((name) => (
        <div key={name} className="saved-workflow-row">
          <span className="saved-workflow-row-name" onClick={() => onLoadWorkflow(name)}>
            {name}
          </span>
          <button className="saved-workflow-delete" onClick={() => onDeleteWorkflow(name)}>
            <TrashIcon />
          </button>
        </div>
      ))}

      <h3 className="sidebar-section-title">JSON File</h3>
      <button className="sidebar-btn" onClick={onExportWorkflow}><DownloadIcon /> Export JSON</button>
      <button className="sidebar-btn" onClick={() => fileInputRef.current.click()}><UploadIcon /> Import JSON</button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden-file-input"
        onChange={handleFileSelected}
      />

      <div style={{ marginTop: 'auto' }}>
        <button className="clear-btn" onClick={onClearCanvas}><TrashIcon /> Clear Canvas</button>
      </div>
    </aside>
  );
}