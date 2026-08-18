// Uses the browser's built-in HTML5 drag-and-drop API.
// When dragging starts, we stash which node type was picked up
// inside the drag event itself, so the canvas can read it on drop.
export default function Sidebar({ onClearCanvas }) {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
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

      <div style={{ marginTop: 'auto' }}>
        <button className="clear-btn" onClick={onClearCanvas}>Clear Canvas</button>
      </div>
    </aside>
  );
}