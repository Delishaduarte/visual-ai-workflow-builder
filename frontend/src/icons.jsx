// Minimal line-style icons, replacing emojis across the app.
// All share the same size/stroke conventions for visual consistency.

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function InputIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4" />
      <path d="M15 12H4" />
      <path d="M8 8l-4 4 4 4" />
    </svg>
  );
}

export function PromptIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 4h16v12H8l-4 4V4z" />
      <path d="M8 9h8" />
      <path d="M8 12h5" />
    </svg>
  );
}

export function LLMIcon() {
  return (
    <svg {...iconProps}>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M9 3v4" />
      <path d="M15 3v4" />
      <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
      <path d="M9 17h6" />
    </svg>
  );
}

export function FormatterIcon() {
  return (
    <svg {...iconProps}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

export function OutputIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 4H10a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10" />
      <path d="M9 12h11" />
      <path d="M16 8l4 4-4 4" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.9 4.9l1.4 1.4" />
      <path d="M17.7 17.7l1.4 1.4" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M4.9 19.1l1.4-1.4" />
      <path d="M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...iconProps} width={13} height={13}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...iconProps} width={14} height={14}>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 21h16" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 21V9" />
      <path d="M7 14l5-5 5 5" />
      <path d="M4 3h16" />
    </svg>
  );
}

export function SaveIcon() {
  return (
    <svg {...iconProps}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </svg>
  );
}

export function NewIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg {...iconProps} fill="currentColor" stroke="none">
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}

export function IfIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="6" cy="12" r="2" />
      <path d="M8 12h3" />
      <path d="M11 12c0-4 3-6 6-6" />
      <path d="M11 12c0 4 3 6 6 6" />
      <path d="M17 6l3 0" />
      <path d="M17 18l3 0" />
    </svg>
  );
}