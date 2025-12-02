interface StatusBadgeProps {
  status: string;
  t: (key: string) => string;
}

export function StatusBadge({ status, t }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    draft: "badge-warning",
    pending: "badge-primary",
    active: "badge-info",
    completed: "badge-success",
  };

  return (
    // <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[status] || colors.draft}`}>
    <span className={`badge ${colors[status] || colors.draft}`}>
      {t(`common.status.${status}`)}
    </span>
  );
}
