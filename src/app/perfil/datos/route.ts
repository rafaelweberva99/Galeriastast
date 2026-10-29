import { currentUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { exportUserData } from "@/lib/repo/account.ts";

export const dynamic = "force-dynamic";

/**
 * Descargar mis datos (derecho de acceso y portabilidad): JSON con perfil, partidos marcados y
 * consentimientos. Sin hash de contraseña ni tokens de sesión. Funciona aunque haya documentos
 * pendientes de aceptar, para que el hincha pueda ejercer sus derechos igual.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Debes ingresar para descargar tus datos." }, { status: 401 });
  const data = await exportUserData(await getDb(), user.id);
  const day = data.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="galuchastats-${user.username}-${day}.json"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
