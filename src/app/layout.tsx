import type { Metadata, Viewport } from "next";
import { Barlow, Oswald } from "next/font/google";
import Link from "next/link";
import { logout } from "./actions.ts";
import { currentUser, mustAcceptLegal } from "@/lib/auth.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { CONTACT_EMAIL } from "@/lib/legal.ts";
import { isAdmin } from "@/lib/admin.ts";
import { siteUrl } from "@/lib/site.ts";
import { Ball } from "@/components/Ball.tsx";
import { SiteNav, type NavItem } from "@/components/SiteNav.tsx";
import { OnboardingBanner } from "@/components/OnboardingBanner.tsx";
import { countMarked } from "@/lib/repo/onboarding.ts";
import { SectionTabs } from "@/components/SectionTabs.tsx";
import { ModeBar } from "@/components/ModeBar.tsx";
import { BackBar } from "@/components/BackBar.tsx";
import "./globals.css";

const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "GaluchaStats · ¿Eres cábala o yeta?",
  // Al guardarla en la pantalla de inicio del iPhone: nombre corto y modo app.
  appleWebApp: { capable: true, title: "GaluchaStats", statusBarStyle: "black" },
  description:
    "Tu Galería de hincha del fútbol chileno. Marca los partidos a los que fuiste al estadio y descubre si eres cábala o yeta.",
};

export const viewport: Viewport = { themeColor: "#0c110e" };

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  // Todo el sitio se tiñe con los colores del club del hincha conectado.
  const team = user ? await getTeam(await getDb(), user.clubId) : null;
  const theme = team ? clubStyle(clubIdentity(team)) : undefined;
  // Con condiciones pendientes, el menú solo ofrece lo que se puede usar (todo lo demás lleva a /aceptar).
  const pendingLegal = user ? await mustAcceptLegal(user.id) : false;
  const full = !!user && !pendingLegal;
  // Sin ningún partido marcado el carnet está vacío: se le recuerda cargar partidos.
  const needsMatches = full && (await countMarked(await getDb(), user.id)) === 0;
  // Menú corto: lo esencial arriba; las secciones hermanas se eligen en la barra de pestañas de debajo (SectionTabs).
  const navItems: NavItem[] = [
    ...(full
      ? [
          { href: "/carnet", label: "Mi Galería" },
          { href: "/partidos", label: "Partidos", also: ["/importar"] },
        ]
      : []),
    ...(full && isAdmin(user) ? [{ href: "/admin", label: "Admin" }] : []),
    { href: "/rankings", label: "Comunidad", also: ["/estadisticas", "/clubes"] },
    ...(user
      ? [pendingLegal ? { href: "/aceptar", label: `@${user.username}` } : { href: "/perfil", label: `@${user.username}` }]
      : [
          { href: "/ingresar", label: "Ingresar" },
          { href: "/registro", label: "Crear mi Galería", cta: true },
        ]),
  ];
  // Menú dentro de la sección de la Selección: sus propios accesos.
  const selItems: NavItem[] = [
    { href: "/seleccion", label: "La Roja" },
    ...(full ? [{ href: "/seleccion/partidos", label: "Partidos" }] : []),
    { href: "/clubes/seleccion-chilena", label: "Historial", also: ["/estadisticas/seleccion-chilena"] },
    ...(user
      ? [pendingLegal ? { href: "/aceptar", label: `@${user.username}` } : { href: "/perfil", label: `@${user.username}` }]
      : [
          { href: "/ingresar", label: "Ingresar" },
          { href: "/registro", label: "Crear mi Galería", cta: true },
        ]),
  ];
  return (
    <html lang="es-CL" className={`${display.variable} ${body.variable}`}>
      <body style={theme as React.CSSProperties}>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="brand">
              <Ball size={26} />
              GaluchaStats
            </Link>
            <SiteNav items={navItems} selItems={selItems}>
              {user && (
                <form action={logout}>
                  <button type="submit">Salir</button>
                </form>
              )}
            </SiteNav>
          </div>
        </header>
        <ModeBar ligaHref={full ? "/carnet" : "/"} />
        <SectionTabs loggedIn={full} />
        {needsMatches && <OnboardingBanner />}
        <BackBar />
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            <nav className="footer-links" aria-label="Legal">
              <Link href="/terminos">Términos y Condiciones</Link>
              <Link href="/privacidad">Política de Privacidad</Link>
              {user && <Link href="/perfil#privacidad-datos">Privacidad y datos</Link>}
            </nav>
            <p className="footer-contact">
              ¿Ideas para que GaluchaStats siga creciendo? Escríbenos a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            Resultados históricos: <Link href="/datos">worldfootball.net vía yorobot/cache.wfb.txt</Link>, con
            chequeos de calidad propios. GaluchaStats no está afiliado a la ANFP ni a ningún club; los colores se usan
            solo como referencia de los hinchas.
          </div>
        </footer>
      </body>
    </html>
  );
}
