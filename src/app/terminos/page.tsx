import Link from "next/link";
import { CONTROLLER, MIN_AGE, TERMS_VERSION } from "@/lib/legal.ts";
import { LegalHeader } from "@/components/legal/LegalHeader.tsx";

export const metadata = {
  title: "Términos y Condiciones · GaleríaStats",
  description: "Condiciones de uso del carnet de hincha GaleríaStats.",
};

export default function TermsPage() {
  return (
    <article className="card legal">
      <LegalHeader
        title="Términos y Condiciones"
        version={TERMS_VERSION}
        other={{ href: "/privacidad", label: "Política de Privacidad" }}
      />

      <p style={{ marginTop: 20 }}>
        Estos términos regulan el uso de GaleríaStats (el “servicio”), un carnet de hincha del fútbol chileno ofrecido
        por <strong>{CONTROLLER.name}</strong> (contacto: {CONTROLLER.email}). Al crear una cuenta declaras haberlos
        leído y aceptado. Si no estás de acuerdo, no uses el servicio.
      </p>

      <h2>1. El servicio</h2>
      <p>
        GaleríaStats te permite marcar los partidos a los que fuiste al estadio y ver estadísticas sobre ellos (como el
        Mufómetro, clásicos, finales y rankings). El servicio es <strong>gratuito</strong>, sin publicidad ni pagos. Es
        un proyecto con fines de entretenimiento y puede cambiar, interrumpirse o terminar en cualquier momento; en ese
        caso intentaremos avisarte con anticipación y darte la opción de descargar tus datos.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes tener {MIN_AGE} años o más para crear una cuenta.</li>
        <li>Entrega un correo que te pertenezca y mantén tu contraseña en reserva. Eres responsable del uso de tu cuenta.</li>
        <li>Cada persona puede tener una sola cuenta personal e intransferible.</li>
      </ul>

      <h2>3. Nombre de usuario</h2>
      <p>
        Tu nombre de usuario puede verse públicamente si haces público tu carnet. No puede: suplantar a otra persona, club
        o institución; contener tu nombre real completo, RUT u otros datos de contacto; ni ser ofensivo, discriminatorio,
        violento o contrario a la ley. Podemos pedirte que lo cambies o suspender la cuenta si no cumple estas reglas.
      </p>

      <h2>4. Uso aceptable</h2>
      <p>Te comprometes a no:</p>
      <ul>
        <li>Usar el servicio para fines ilegales o para promover la violencia en los estadios.</li>
        <li>Intentar acceder a cuentas ajenas o a partes no públicas del sistema, ni vulnerar su seguridad.</li>
        <li>Sobrecargar el servicio, automatizar registros o extraer datos masivamente (scraping) sin autorización.</li>
        <li>Crear cuentas falsas o marcar partidos de forma fraudulenta para manipular los rankings.</li>
      </ul>

      <h2>5. Datos deportivos</h2>
      <p>
        Los resultados, goles y demás datos deportivos provienen de fuentes públicas y se revisan con chequeos propios
        (ver <Link href="/datos">Datos</Link>), pero <strong>no garantizamos que sean exactos, completos ni
        actualizados</strong>. Las estadísticas, incluido el Mufómetro, son lúdicas y no tienen valor oficial. Si
        encuentras un error, avísanos.
      </p>

      <h2>6. Sin afiliación</h2>
      <p>
        GaleríaStats es independiente: <strong>no está afiliado, patrocinado ni respaldado por la ANFP</strong>, ni por
        ningún club, estadio o ticketera. Los nombres y colores de los clubes se usan solo como referencia para los
        hinchas y pertenecen a sus titulares. Los enlaces a ticketeras son informativos; cualquier compra es entre tú y
        ellas.
      </p>

      <h2>7. Contenido y propiedad</h2>
      <ul>
        <li>
          Los datos que ingresas (tus partidos marcados y tu preferencia de club) son tuyos. Nos autorizas a usarlos solo
          para prestar el servicio, incluyendo mostrarlos en rankings y en tu perfil público si así lo eliges.
        </li>
        <li>
          El diseño, el código y las marcas propias de GaleríaStats nos pertenecen o los usamos con licencia. Los datos
          deportivos de terceros mantienen sus licencias de origen.
        </li>
      </ul>

      <h2>8. Suspensión y cierre de cuenta</h2>
      <ul>
        <li>
          Puedes cerrar tu cuenta cuando quieras desde <Link href="/perfil#eliminar-cuenta">tu perfil</Link>; se
          eliminan tus datos según la <Link href="/privacidad">Política de Privacidad</Link>.
        </li>
        <li>
          Podemos suspender o eliminar cuentas que infrinjan estos términos, informándote el motivo cuando sea posible.
          Ante infracciones graves (por ejemplo, ataques al servicio) podemos actuar de inmediato.
        </li>
      </ul>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        El servicio se entrega “tal como está”, sin garantías de disponibilidad continua ni de exactitud de los datos. En
        la medida que la ley lo permita, no respondemos por daños indirectos derivados del uso o de la imposibilidad de
        usar el servicio, ni por decisiones que tomes basándote en sus estadísticas. Nada de esto limita los derechos
        irrenunciables que te reconozca la ley chilena.
      </p>

      <h2>10. Cambios a estos términos</h2>
      <p>
        Podemos actualizar estos términos. Publicaremos la nueva versión con su fecha y, si el cambio es relevante, te
        pediremos aceptarla al ingresar antes de seguir usando tu cuenta. Si no la aceptas, puedes descargar tus datos y
        eliminar tu cuenta.
      </p>

      <h2>11. Ley aplicable y contacto</h2>
      <p>
        Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia se someterá a los
        tribunales competentes de Chile, sin perjuicio de los derechos que te correspondan como usuario. Para dudas o
        reclamos escribe a <strong>{CONTROLLER.email}</strong>.
      </p>
    </article>
  );
}
