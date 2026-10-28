import Link from "next/link";
import { CONTROLLER, MIN_AGE, PRIVACY_VERSION } from "@/lib/legal.ts";
import { LegalHeader } from "@/components/legal/LegalHeader.tsx";

export const metadata = {
  title: "Política de Privacidad · GaleríaStats",
  description: "Cómo GaleríaStats trata tus datos personales, conforme a la Ley 19.628 reformada por la Ley 21.719.",
};

export default function PrivacyPage() {
  return (
    <article className="card legal">
      <LegalHeader
        title="Política de Privacidad"
        version={PRIVACY_VERSION}
        other={{ href: "/terminos", label: "Términos y Condiciones" }}
      />

      <p style={{ marginTop: 20 }}>
        En GaleríaStats (el “servicio”) cuidamos tus datos personales. Esta política explica, en simple, qué datos
        tratamos, para qué, por cuánto tiempo, con quién se comparten y cómo puedes ejercer tus derechos. Se rige por la
        Ley N° 19.628 sobre Protección de la Vida Privada, con las modificaciones de la Ley N° 21.719, que rigen
        plenamente desde el 1 de diciembre de 2026.
      </p>

      <h2>1. Quién es responsable de tus datos</h2>
      <p>
        El responsable del tratamiento es <strong>{CONTROLLER.name}</strong>, RUT {CONTROLLER.rut}, con domicilio en{" "}
        {CONTROLLER.address}. Para cualquier consulta sobre tus datos o para ejercer tus derechos escribe a{" "}
        <strong>{CONTROLLER.email}</strong>.
      </p>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>
          <strong>Nombre de usuario</strong>: lo eliges tú y es visible para otros solo si haces público tu carnet.
        </li>
        <li>
          <strong>Correo electrónico</strong>: para identificar tu cuenta y responder tus solicitudes. No es público.
        </li>
        <li>
          <strong>Contraseña</strong>: nunca la guardamos tal cual; guardamos solo un resumen cifrado (hash con scrypt y
          sal aleatoria) que no permite recuperarla.
        </li>
        <li>
          <strong>Club del que eres hincha</strong>.
        </li>
        <li>
          <strong>Partidos marcados</strong>: los partidos a los que dices haber ido, si fuiste a la galería de tu club o
          en “modo infiltrado”, y la fecha en que los marcaste.
        </li>
        <li>
          <strong>Preferencia de perfil público</strong>: si quieres que tu carnet aparezca en los rankings y en tu página
          pública (/hincha/tu-usuario). Por defecto es privado.
        </li>
        <li>
          <strong>Registros de consentimiento</strong>: qué aceptaste (Términos, Privacidad, declaración de edad,
          perfil público), la versión y la fecha, para poder demostrar que lo autorizaste.
        </li>
        <li>
          <strong>Cookie de sesión</strong>: un identificador aleatorio que te mantiene conectado (ver sección 10).
        </li>
        <li>
          <strong>Registros técnicos</strong>: como cualquier sitio web, nuestro proveedor de alojamiento registra por un
          período breve datos técnicos de las visitas (dirección IP, navegador, página solicitada) para operar y
          proteger el servicio.
        </li>
      </ul>
      <p>
        No pedimos tu nombre real, RUT, teléfono, ubicación ni datos sensibles. Por favor no los incluyas en tu nombre de
        usuario.
      </p>

      <h3>Comprobantes de entradas (“Importar entradas”)</h3>
      <p>
        Si usas la función de importar entradas, la captura, el PDF o el correo que eliges se lee <strong>en tu propio
        dispositivo</strong> (en tu navegador) y el archivo nunca se sube. Solo se envía al servidor el texto leído, para
        buscar fechas y rivales que coincidan con partidos de tu club; ese texto <strong>no se almacena</strong> y se
        descarta al terminar la búsqueda. Lo único que se guarda son los partidos que tú confirmas marcar.
      </p>

      <h2>3. Para qué usamos tus datos</h2>
      <ul>
        <li>Crear y mantener tu cuenta y tu sesión.</li>
        <li>Calcular tu carnet de hincha: Mufómetro, clásicos, finales, rachas y demás estadísticas.</li>
        <li>Mostrar tu carnet en los rankings y en tu perfil público, solo si lo autorizaste.</li>
        <li>Responder tus solicitudes y comunicarte cambios relevantes del servicio o de estas condiciones.</li>
        <li>Mantener la seguridad del servicio y prevenir abusos.</li>
      </ul>
      <p>
        No vendemos tus datos, no los usamos para publicidad y no hacemos perfiles comerciales. El Mufómetro es un
        cálculo automático y lúdico (porcentaje de puntos obtenidos en los partidos que marcaste): no produce efectos
        jurídicos ni te afecta de manera significativa.
      </p>

      <h2>4. Base de licitud</h2>
      <ul>
        <li>
          <strong>Ejecución del servicio</strong> que solicitas al aceptar los Términos y Condiciones: usuario, correo,
          contraseña, club, partidos marcados, cookie de sesión y registros técnicos son necesarios para prestarlo.
        </li>
        <li>
          <strong>Tu consentimiento</strong>, libre, informado, específico e inequívoco: solo para mostrar tu carnet
          públicamente, que es opcional. Puedes retirarlo en cualquier momento (sección 8). Al registrarte confirmas que
          leíste esta política; esa confirmación es un acuse de información, no el fundamento del tratamiento.
        </li>
        <li>
          <strong>Cumplimiento de obligaciones legales</strong>: poder demostrar tus consentimientos mientras tu cuenta
          exista y responder a requerimientos de autoridades competentes.
        </li>
      </ul>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <ul>
        <li>
          Tus datos de cuenta, partidos marcados y registros de consentimiento se guardan mientras tu cuenta exista.
        </li>
        <li>
          Si eliminas tu cuenta, se borran de inmediato de la base de datos: usuario, correo, contraseña cifrada,
          partidos marcados, consentimientos y sesiones. Las copias de respaldo del proveedor de base de datos pueden
          conservarlos hasta [plazo de respaldos, p. ej. 7] días, tras lo cual se sobrescriben.
        </li>
        <li>Las sesiones vencen a los 30 días o cuando cierras sesión.</li>
        <li>El texto de los comprobantes de entradas no se guarda.</li>
        <li>Los registros técnicos del proveedor de alojamiento se conservan por períodos breves según su política.</li>
      </ul>

      <h2>6. Con quién se comparten</h2>
      <p>
        No compartimos tus datos con terceros con fines propios de ellos. Usamos proveedores de alojamiento y base de
        datos (encargados): [proveedores a completar según el despliegue; p. ej. Vercel Inc. para el alojamiento y
        Neon Inc. para la base de datos, o el proveedor que aloje la aplicación si se despliega de otra forma].
      </p>
      <p>
        Solo tratan los datos para prestarnos el servicio. Si haces público tu carnet, cualquier persona podrá ver tu
        nombre de usuario, tu club y tus estadísticas de hincha (nunca tu correo).
      </p>

      <h3>Transferencia internacional</h3>
      <p>
        Los servidores de estos proveedores pueden estar <strong>fuera de Chile</strong> (por ejemplo, en Estados Unidos
        u otros países), en [región de alojamiento a completar]. La transferencia es necesaria para prestar el servicio
        que solicitaste y se hace con proveedores que ofrecen garantías contractuales de protección de datos
        [fundamento y garantías a confirmar por un abogado según la Ley 21.719].
      </p>

      <h2>7. Tus derechos</h2>
      <p>Respecto de tus datos personales tienes derecho a:</p>
      <ul>
        <li>
          <strong>Acceso</strong>: saber qué datos tenemos y obtener una copia.
        </li>
        <li>
          <strong>Rectificación</strong>: corregir datos inexactos o incompletos.
        </li>
        <li>
          <strong>Supresión</strong>: pedir que borremos tus datos.
        </li>
        <li>
          <strong>Oposición</strong>: oponerte a un tratamiento determinado.
        </li>
        <li>
          <strong>Portabilidad</strong>: recibir tus datos en un formato estructurado y de uso común.
        </li>
        <li>
          <strong>Bloqueo</strong>: pedir la suspensión temporal del tratamiento mientras se resuelve una solicitud tuya.
        </li>
      </ul>
      <h3>Cómo ejercerlos</h3>
      <ul>
        <li>
          Desde <Link href="/perfil#privacidad-datos">tu perfil → Privacidad y datos</Link>: descargar tus datos en JSON
          (acceso y portabilidad), cambiar tu club y tu preferencia de perfil público (rectificación y oposición),
          desmarcar partidos, cerrar todas tus sesiones y eliminar tu cuenta (supresión).
        </li>
        <li>
          Por correo a <strong>{CONTROLLER.email}</strong>, desde el correo registrado en tu cuenta, indicando tu nombre
          de usuario y qué derecho quieres ejercer (por ejemplo, rectificar tu correo o pedir el bloqueo).
        </li>
      </ul>
      <p>
        Es gratuito. Responderemos dentro del plazo legal (30 días corridos, prorrogable por una vez por igual período
        si es necesario, informándote el motivo).
      </p>

      <h2>8. Retirar tu consentimiento</h2>
      <p>
        Puedes retirar en cualquier momento tu consentimiento para el perfil público desmarcando la opción en tu perfil;
        el cambio queda registrado y tu carnet deja de aparecer en los rankings de inmediato. Como la aceptación de esta
        política es necesaria para mantener la cuenta, retirarla equivale a eliminar tu cuenta. Retirar el consentimiento
        no afecta la licitud del tratamiento previo.
      </p>

      <h2>9. Menores de edad</h2>
      <p>
        Para crear una cuenta debes tener <strong>{MIN_AGE} años o más</strong> y lo declaras al registrarte. No tratamos
        conscientemente datos de menores de {MIN_AGE} años; si un padre, madre o tutor detecta que un menor de esa edad
        creó una cuenta, puede escribirnos y la eliminaremos.
      </p>

      <h2>10. Cookies</h2>
      <p>
        Usamos <strong>una sola cookie</strong>, <code>galeria_session</code>, estrictamente necesaria para mantener tu
        sesión iniciada. Es <em>httpOnly</em> (no la puede leer código de terceros), dura hasta 30 días y se borra al
        salir. No usamos cookies de rastreo, analítica ni publicidad, y las tipografías se sirven desde nuestro propio
        dominio.
      </p>

      <h2>11. Seguridad</h2>
      <p>
        Aplicamos medidas razonables: contraseñas cifradas con scrypt, conexiones cifradas (HTTPS), cookie de sesión
        protegida y acceso restringido a la base de datos. Ningún sistema es infalible; si ocurre una vulneración de
        seguridad que afecte tus datos, la informaremos a la autoridad y, cuando corresponda, a ti, según exige la ley.
      </p>

      <h2>12. Cambios a esta política</h2>
      <p>
        Si cambiamos esta política publicaremos la nueva versión con su fecha. Si el cambio es relevante, te pediremos
        aceptarla de nuevo la próxima vez que ingreses, antes de seguir usando tu cuenta; si no estás de acuerdo podrás
        descargar tus datos y eliminar tu cuenta.
      </p>

      <h2>13. Reclamos</h2>
      <p>
        Si consideras que no respetamos tus derechos, escríbenos primero a {CONTROLLER.email}. Si no respondemos dentro
        del plazo o no estás conforme con la respuesta, puedes reclamar ante la{" "}
        <strong>Agencia de Protección de Datos Personales</strong> de Chile.
      </p>
    </article>
  );
}
