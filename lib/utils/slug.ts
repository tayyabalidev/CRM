export function slugifyWorkspaceName(value: string) {
  const base =
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";

  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 6);

  return `${base}-${suffix}`;
}

export function getInitials(name: string | null | undefined) {
  if (!name?.trim()) {
    return "WF";
  }

  const parts = name.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "WF";
}
