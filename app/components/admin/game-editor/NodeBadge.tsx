interface NodeBadgeProps {
  type: "start" | "end";
  t: (key: string) => string;
}

export function NodeBadge({ type, t }: NodeBadgeProps) {
  const colors = {
    start: "bg-success/15 text-success",
    end: "bg-[var(--color-error)]/15 text-[var(--color-error)]",
  };

  return (
    <span className={`ml-2 inline-flex px-2 py-0.5 rounded text-xs font-medium ${colors[type]}`}>
      {t(`pages.admin.gameEditor.nodeBadges.${type}`)}
    </span>
  );
}
