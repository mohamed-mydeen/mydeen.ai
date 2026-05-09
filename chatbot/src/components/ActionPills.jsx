const PILLS = [
  { icon: "auto_awesome",   label: "Explain" },
  { icon: "edit_note",      label: "Notes" },
  { icon: "quiz",           label: "Exam Mode" },
  { icon: "picture_as_pdf", label: "PDF" },
];

export default function ActionPills({ onPillClick }) {
  return (
    <div className="action-pills" role="group" aria-label="Quick actions">
      {PILLS.map((pill) => (
        <button
          key={pill.label}
          id={`pill-${pill.label.toLowerCase().replace(/\s+/g, "-")}`}
          className="action-pill"
          onClick={() => onPillClick?.(pill.label)}
          aria-label={pill.label}
        >
          <span className="material-symbols-outlined">{pill.icon}</span>
          {pill.label}
        </button>
      ))}
    </div>
  );
}
