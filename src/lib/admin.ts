/**
 * Administradores: cuentas cuyo correo está en la variable de entorno ADMIN_EMAILS (separados por coma).
 * Un administrador es también un hincha normal; además ve el panel /admin y las páginas de los clubes
 * que todavía no están habilitados en el MVP.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: { email: string } | null | undefined): boolean {
  return !!user && adminEmails().includes(user.email.trim().toLowerCase());
}
