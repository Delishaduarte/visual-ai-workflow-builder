import React from 'react';

export default function Sidebar({ onClearCanvas }) {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar">
      <h3 className="sidebar-title">Nodes Palette</h3>
      <p className="sidebar-desc">Drag nodes onto the canvas to construct your AI pipeline.</p>

      <div className="node-palette">
        <div className="dndnode input" onDragStart={(e) => onDragStart(e, 'inputNode')} draggable>
          📥 Input Node
        </div>
        <div className="dndnode prompt" onDragStart={(e) => onDragStart(e, 'promptTemplateNode')} draggable>
          📝 Prompt Template
        </div>
        <div className="dndnode llm" onDragStart={(e) => onDragStart(e, 'llmNode')} draggable>
          🤖 LLM Engine
        </div>
        <div className="dndnode formatter" onDragStart={(e) => onDragStart(e, 'formatterNode')} draggable>
          ⚡ Output Formatter
        </div>
        <div className="dndnode output" onDragStart={(e) => onDragStart(e, 'outputNode')} draggable>
          📤 Output Node
        </div>
      </div>

      <div className="sidebar-actions">
        <button className="clear-btn" onClick={onClearCanvas}>Clear Canvas</button>
      </div>
    </aside>
  );
}