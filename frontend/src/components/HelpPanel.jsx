const NODE_GUIDE = [
  { name: 'Input', desc: 'Start of a workflow. Type a value and give it a name so later nodes can refer to it.' },
  { name: 'Prompt Template', desc: 'Writes a prompt for the AI, using {{name}} to pull in values from Input nodes, or {{input}} for whatever the previous node produced.' },
  { name: 'LLM', desc: 'Sends the prompt to an AI provider and gets a reply. Needs your own API key, entered in the node.' },
  { name: 'Formatter', desc: 'Wraps the result in a chosen format: plain text, JSON, or structured.' },
  { name: 'IF Condition', desc: 'Splits the workflow into two paths, True or False, based on a check you set.' },
  { name: 'Merge', desc: 'Combines two or more inputs into one value before passing it on. Connect wires to numbered dots to control the order.' },
  { name: 'HTTP Request', desc: 'Calls a website or API directly and returns what it sends back.' },
  { name: 'Code', desc: 'Runs a small custom Python snippet for anything the other nodes can\'t do.' },
  { name: 'Output', desc: 'Shows the final result of the workflow.' },
];

export default function HelpPanel({ onClose }) {
  return (
    <div className="help-panel">
      <div className="inspect-panel-header">
        <span className="inspect-panel-title">Node Guide</span>
        <button className="inspect-close-btn" onClick={onClose} title="Close">×</button>
      </div>
      {NODE_GUIDE.map((item) => (
        <div key={item.name} className="help-item">
          <p className="help-item-name">{item.name}</p>
          <p className="help-item-desc">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}