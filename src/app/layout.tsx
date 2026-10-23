import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "./actions.ts";
import { currentUser } from "@/lib/auth.ts";
import "./globals.css";

export const metadata: Metadata = {
  title: "GaleríaStats · ¿Eres cábala o yeta?",
  description:
    "Tu carnet de hincha del fútbol chileno. Marca los partidos a los que fuiste al estadio y descubre si eres cábala o yeta.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="es-CL">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              <span className="brand-mark" aria-hidden>
                GS
              </span>
              GaleríaStats
            </Link>
            <nav className="nav" aria-label="Principal">
              {user && <Link href="/partidos">Marcar partidos</Link>}
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
                  <Link href="/registro" className="btn">
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
            Resultados históricos: <Link href="/datos">worldfootball.net vía yorobot/cache.wfb.txt</Link>, con
            chequeos de calidad propios. GaleríaStats no está afiliado a la ANFP ni a ningún club.
          </div>
        </footer>
      </body>
    </html>
  );
}
