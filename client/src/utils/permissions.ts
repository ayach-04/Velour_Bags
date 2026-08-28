const roleLabels: Record<string, string> = {
  admin: 'Permissions complètes',
}

export function roleLabel(role?: string): string {
  if (!role) return 'Permissions complètes'
  if (roleLabels[role]) return roleLabels[role]
  return role.charAt(0).toUpperCase() + role.slice(1)
}
