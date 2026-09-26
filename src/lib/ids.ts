export const DEFAULT_FAMILY_ID = "alvarez";

export const MEMBER_COLORS = ["#0f766e", "#b45309", "#2563eb", "#7c2d12", "#9333ea", "#be123c", "#0369a1"];

export function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function slugId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
