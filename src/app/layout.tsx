import type { Metadata } from "next";
import { Barlow, Oswald } from "next/font/google";
import Link from "next/link";
import { logout } from "./actions.ts";
import { currentUser } from "@/lib/auth.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { Ball } from "@/components/Ball.tsx";
import "./globals.css";

const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "GaleríaStats · ¿Eres cábala o yeta?",
  description:
    "Tu carnet de hincha del fútbol chileno. Marca los partidos a los que fuiste al estadio y descubre si eres cábala o yeta.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  // Todo el sitio se tiñe con los colores del club del hincha conectado.
  const team = user ? await getTeam(await getDb(), user.clubId) : null;
  const theme = team ? clubStyle(clubIdentity(team)) : undefined;
  return (
    <html lang="es-CL" className={`${display.variable} ${body.variable}`}>
      <body style={theme as React.CSSProperties}>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              <Ball size={26} />
              GaleríaStats
            </Link>
            <nav className="nav" aria-label="Principal">
              {user && <Link href="/partidos">Marcar partidos</Link>}
              {user && <Link href="/importar">Importar entradas</Link>}
              {user && <Link href="/carnet">Mi carnet</Link>}
              <Link href="/rankings">Rankings</Link>
              <Link href="/clubes">Clubes</Link>
              {user ? (
                <>
                  <Link href="/perfil">@{user.username}</Link>
                  <form action={logout}>
                    <button type="submit">Salir</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/ingresar">Ingresar</Link>
                  <Link href="/registro" className="nav-cta">
                    Crear carnet
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <nav className="footer-links" aria-label="Legal">
              <Link href="/terminos">Términos y Condiciones</Link>
              <Link href="/privacidad">Política de Privacidad</Link>
              {user && <Link href="/perfil#privacidad-datos">Privacidad y datos</Link>}
            </nav>
            Resultados históricos: <Link href="/datos">worldfootball.net vía yorobot/cache.wfb.txt</Link>, con
            chequeos de calidad propios. GaleríaStats no está afiliado a la ANFP ni a ningún club; los colores se usan
            solo como referencia de los hinchas.
          </div>
        </footer>
      </body>
    </html>
  );
}
