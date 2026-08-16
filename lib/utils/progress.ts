export function projectProgress(
  manual: number | null | undefined,
  completedTasks: number,
  totalTasks: number,
) {
  if (manual != null) {
    return {
      value: Math.min(100, Math.max(0, Math.round(manual))),
      source: "manual" as const,
    };
  }

  if (totalTasks === 0) {
    return { value: 0, source: "auto" as const };
  }

  return {
    value: Math.round((completedTasks / totalTasks) * 100),
    source: "auto" as const,
  };
}
