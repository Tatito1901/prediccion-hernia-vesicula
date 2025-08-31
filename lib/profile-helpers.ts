export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

export function formatRole(role?: string | null): string {
  if (!role) return "Sin rol";
  const r = role.toLowerCase();
  if (r === "admin") return "Administrador";
  if (r === "doctor") return "Doctor";
  if (r === "asistente") return "Asistente";
  return role;
}
