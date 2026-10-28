# Ticketeras del fútbol chileno (Liga de Primera 2026) y cómo integrarlas en GaleríaStats

Fecha de la investigación: 28-oct-2026. Fuente principal: WebSearch (el contenedor no puede abrir la mayoría de los sitios). Lo que no tiene fuente dice "sin confirmar".

## 0. Contexto: la temporada 2026

- **Son 16 clubes, no 18.** La Liga de Primera 2026 tiene 30 fechas, del 30-ene al 6-dic-2026. Coquimbo Unido es el campeón vigente (2025).
- **Ascendieron para 2026:** Universidad de Concepción (campeón de Primera B 2025) y Deportes Concepción (ganó la Liguilla: 3-2 a Cobreloa en Calama el 7-dic-2025).
- **Descendieron a Primera B 2026:** Unión Española y Deportes Iquique.
- **La temporada no ha terminado.** Bajan 2 clubes (15.º y 16.º). Al 24-oct-2026 los últimos eran U. de Concepción (23 pts) y Unión La Calera (18 pts). Ningún descenso estaba confirmado a esa fecha.
- **El 2.º ascenso aún no se define.** La fase regular de Primera B termina el 1-nov y el segundo ascenso se juega en la Liguilla de noviembre.

Los 16 clubes y su ticketera:

| Club | Venta de local 2026 | Portal propio |
|---|---|---|
| Colo-Colo | PuntoTicket (además, Registro Facial propio) | no |
| Universidad de Chile | PuntoTicket | no |
| Universidad Católica | PuntoTicket (cruzados.puntoticket.com) | no (marca blanca) |
| O'Higgins | **OHipass** (ohipass.cl) | **sí** |
| Coquimbo Unido | Ticketplus (coquimbo.ticketplus.cl) | no (marca blanca) |
| Audax Italiano | Ticketplus (audaxitaliano.ticketplus.cl / audaxmercato.cl) | no (marca blanca) |
| Palestino | Ticketmaster Chile | no |
| Huachipato | Passline (confianza media) | no |
| Cobresal | Passline | no |
| Everton | **Tienda Everton** (tiendaeverton.cl) | **sí** |
| Ñublense | Passline | no |
| Unión La Calera | Ticketmaster Chile | no |
| Deportes La Serena | Ticketmaster Chile, también presencial en Tienda Granate | no |
| Deportes Limache | Passline | no |
| Universidad de Concepción | Ticketmaster Chile | no |
| Deportes Concepción | Passline | no |

Reglas generales:
- **El partido lo vende el club local.** El hincha visitante compra en la ticketera del local.
- **Excepciones:** finales en sede neutral, la Supercopa y la Copa de la Liga las vende el organizador. Ejemplo: final de Copa de la Liga Coquimbo–O'Higgins, publicada en PuntoTicket y en Ticketplus.
- **Copas internacionales:** usan la misma ticketera del club, pero los abonos no suelen valer y cambian los precios.
- **Requisitos casi universales:** inscripción en el Registro Nacional de Hinchas, entradas nominativas por RUT y cédula al ingresar.

---

## 1. PuntoTicket (Colo-Colo, U. de Chile, U. Católica; también finales y Supercopa)

**Comprobante:**
- Correo de confirmación con número de orden, cantidad de entradas y forma de despacho (según sus T&C y la página de inscripción).
- Si se elige e-ticket, llega un PDF con QR. El QR se valida una sola vez.
- El PDF se vuelve a descargar desde la cuenta, en **"Mis compras"** / "E-tickets".
- Remitente y asunto exactos: **sin confirmar**. Hay que tomarlos de un correo real.

**Datos del e-ticket:**
- La ficha del evento dice "Local vs. Visita", competición y fecha (p. ej. "Liga de Primera Mercado Libre - Fecha 26"), estadio y comuna.
- El PDF debería traer lo mismo, más sector, RUT y precio.
- Formato de fecha en la web: "domingo 25 de octubre", "12 de mayo a las 17:00 hrs".

**Marca blanca:** cruzados.puntoticket.com. El remitente y el formato del correo deberían ser los mismos que en el sitio general (sin confirmar).

**API / afiliados:** no se encontró API pública ni programa de afiliados. Sin confirmar.

**Términos de uso:**
- El sitio es solo para uso personal; el contenido es propiedad de PuntoTicket.
- Prohíben bots para saltarse la fila virtual.
- **No se debe hacer scraping de la cuenta del usuario** ni automatizar logins.
- Leer comprobantes que el propio usuario aporta no choca con estos términos.

**Extra Colo-Colo:**
- Registro Facial de Hincha obligatorio desde 2026, en facialcolocolo.eleventickets.com (Eleven Tickets).
- No da comprobante de compra.

## 2. Ticketplus (Coquimbo Unido, Audax Italiano)

**Comprobante:**
- Según los T&C y la ayuda, el e-ticket se envía al correo registrado en PDF, con un enlace a la cuenta.
- Cada entrada tiene QR y un "código de la entrada" impreso bajo el QR.
- Se puede reimprimir desde ticketplus.cl. Hay app.
- Nombre de la sección "Mis compras": **sin confirmar**.

**Datos del e-ticket:**
- Título del evento con estructura fija: "Coquimbo Unido vs Colo Colo / Liga de Primera Mercado Libre / Fecha 24".
- Es fácil de parsear: separar por " / " da partido, competición y fecha.
- Fecha en la ficha: "domingo 11 de octubre, 15:00 hrs".

**Marcas blancas:** `<club>.ticketplus.cl` (coquimbo, audaxitaliano) y audaxmercato.cl.

**API / afiliados:** Ticketplus ofrece "Full Operation" a productores. No hay API pública para terceros (sin confirmar).

**Términos:** sin cláusula específica revisada.

## 3. Passline (Huachipato, Cobresal, Ñublense, Deportes Limache, Deportes Concepción)

**Comprobante:**
- Los T&C dicen que el usuario recibe un **QR único** en su correo registrado, que sirve como e-ticket.
- También puede llegar por SMS o WhatsApp.
- En la web y la app hay una sección **"Mis e-Tickets"**, y la app permite agregar la entrada a la billetera (wallet).
- Si llega PDF adjunto o solo QR en el cuerpo del correo: **sin confirmar**.

**Datos del e-ticket:**
- Título del evento: "Liga de Primera Mercado Libre Fecha 16 Deportes Concepción vs O'Higgins" o "Ñublense vs Coquimbo Unido - Liga de Primera Mercado Libre".
- **Ojo:** el orden de los campos cambia entre eventos. Las páginas de productora son del tipo passline.com/productora/<id>-<slug>.

**API / afiliados:**
- No se encontró API pública ni afiliados.
- Existen apps de validación ("Lector Passline QR"), pero son para el personal del estadio, no para terceros.

## 4. Ticketmaster Chile (Palestino, Unión La Calera, Deportes La Serena, U. de Concepción)

**Comprobante:**
- Correo con el e-ticket enviado al email de la cuenta. El PDF lleva QR y se valida una sola vez.
- Se descarga desde ticketmaster.cl, en **"Mis entradas"**, eligiendo el evento.
- En "Mis entradas" se puede cambiar el nombre del asistente y volver a bajar el PDF.
- Remitente y asunto: **sin confirmar**.

**Datos del e-ticket:**
- Título: "Club Deportivo Palestino vs Deportes Limache - Liga de Primera Mercado Libre".
- La URL del evento incluye a veces el estadio, como "...-estadio-nicolas-chahuan".

**API / afiliados (la única opción oficial encontrada):**
- **Programa de afiliados vía Impact**, que incluye **Chile** entre sus 25 mercados (FAQ de developer.ticketmaster.com).
- Paga comisión por ventas reales. No paga en preventas ni en las primeras 24 h de una venta general.
- Existe la **Discovery API** (app.ticketmaster.com/discovery/v2) para listar eventos. Que cubra Chile (countryCode=CL) está **sin confirmar**: hay que probarlo con una API key.
- **Ninguna de las dos da acceso a las compras del usuario.**

## 5. OHipass (O'Higgins, portal propio)

- Ecosistema digital lanzado en enero de 2026. Reemplazó a OHIticket.
- Vende entradas (Liga, Copa de la Liga, Libertadores y Sudamericana) y membresías (Socio General y Socio Abonado).
- Soporte: tickets@ohipass.cl (entradas) y socios@ohipass.cl (membresías).
- Abonados en Liga: asiento asignado, ingreso con cédula y **sin entrada individual**. Esos hinchas no tienen comprobante por partido.
- Formato de correo, PDF o QR, historial y proveedor tecnológico: **sin confirmar**.
- API: no se encontró.

## 6. Tienda Everton (Everton, portal propio)

- tiendaeverton.cl vende entradas y abonos.
- Tiene una página de descarga de entradas (`entradas_descargarEntrada.php`), así que el e-ticket probablemente se descarga ahí. Formato del correo **sin confirmar**.
- El club registra asistencia: el "Plan de Fidelidad" da descuento a quien fue 3 o más veces en la temporada. No hay acceso público a ese historial.
- API: no se encontró.

## 7. Registro Nacional de Hinchas, Estadio Seguro y control facial

**Registro Nacional de Hinchas (registrodelhincha.cl):**
- Lo impulsan el Gobierno y la ANFP. El hincha se enrola con fotos de la cédula y una selfie (proveedor biométrico: Veridas).
- Las ticketeras lo consultan al vender, para revisar prohibiciones de ingreso.
- En 2026 es requisito de compra en casi todos los clubes.
- **No se encontró ninguna función para que el hincha vea su historial de asistencia.** Sus T&C solo hablan de verificar identidad y prohibiciones. Sin confirmar que exista.

**Reconocimiento facial:**
- Registro Facial Colo-Colo (Eleven Tickets) en el Monumental.
- Piloto de la U en el Estadio Nacional (2026).
- Ninguno ofrece un historial consultable por el hincha.

**Ley 21.719 (datos personales):** entra plenamente en vigor el 1-dic-2026 y trata la biometría como dato sensible. **GaleríaStats no debe almacenar biometría ni imágenes de cédula.**

---

## 8. Propuesta de integración (priorizada)

### P1. Leer comprobantes que el usuario aporta (captura, PDF o correo pegado o subido). Cubre a los 16 clubes.

Hay que extender el importador actual de PuntoTicket con un **detector de ticketera** y un **parser genérico**:

- **Detectar la ticketera** por dominio o marca en el texto: `puntoticket`, `ticketplus`, `passline`, `ticketmaster.cl`, `ohipass`, `tiendaeverton`.
- **Extraer el partido** con la regex `(?<local>.+?)\s+(?:vs\.?|v/s|-)\s+(?<visita>.+?)(?:\s+[-/]\s+|$)`.
- **Normalizar los nombres a `club_id` con alias.** Ejemplos:
  - "U. Católica", "Universidad Catolica" → universidad-catolica
  - "U. Concepción", "UdeC" → universidad-de-concepcion
  - "D. La Serena", "Club Deportes La Serena" → la-serena
  - "Limache", "Deportes Limache" → deportes-limache
  - "Colo Colo", "Colo-Colo" → colo-colo
  - "OHiggins", "O´Higgins", "Club Deportivo OHiggins" → ohiggins
  - "Conce", "Deportes Concepción" → deportes-concepcion
- **Extraer la competición:** "Liga de Primera (Mercado Libre|Itaú)", "Copa de la Liga", "Copa Chile", "CONMEBOL Libertadores|Sudamericana", "Supercopa". Más la fecha o jornada: `Fecha (\d+)`.
- **Extraer la fecha en español:**
  - `(lunes|martes|...|domingo)?\s*(\d{1,2}) de (enero|...|diciembre)( de (\d{4}))?`, con hora `(\d{1,2}):(\d{2})\s*(hrs)?`.
  - También `dd/mm/yyyy` y `dd-mm-yyyy`.
  - Si falta el año, inferirlo de la fecha del correo o de la temporada.
- **Extraer el estadio** con una lista conocida: Monumental, Nacional, Claro Arena, El Teniente, Sánchez Rumoroso, Bicentenario de La Florida, La Cisterna, Santa Laura, La Pintana, Huachipato-CAP, El Cobre, Sausalito, Nelson Oyarzún, Nicolás Chahuán, La Portada, Lucio Fariña, Elías Figueroa, Ester Roa.
- **Cruzar con el fixture** para validar: local, visita y fecha ±1 día.
- **Deduplicar** por número de orden o código de entrada (Ticketplus imprime el código bajo el QR).
- **No guardar** el QR, el RUT completo ni la imagen de la entrada. Solo los metadatos del partido.

### P2. Enlace "Comprar entradas" por club (fácil y legal)

- En la ficha de cada partido, enlazar a la `url_compra` del club local (está en clubes.json).
- **Para Ticketmaster** (Palestino, La Calera, La Serena, UdeC): envolver el enlace con Impact y así obtener comisión. Requiere registrarse como afiliado.
- **Para el resto:** enlace directo, sin afiliación disponible.

### P3. Reenvío de correos a una dirección de la app (p. ej. `tickets+<uid>@galeriastats.app`)

- Es lo más simple después de P1 y no necesita OAuth.
- Recibir el correo con un webhook de ingreso de mails (SES, Mailgun, Postmark o Cloudflare Email Workers), aplicar el mismo parser de P1 y descartar el adjunto.
- **Seguridad:**
  - Validar que el remitente original sea de un dominio de ticketera conocido.
  - Aceptar solo correos reenviados desde el email verificado del usuario.

### P4. Conexión a Gmail (opcional, solo lectura)

- Scope `gmail.readonly` con búsqueda acotada:
  - `from:(puntoticket.com OR ticketplus.cl OR passline.com OR ticketmaster.cl OR ohipass.cl OR tiendaeverton.cl) newer_than:2y`.
  - El listado de dominios remitentes exactos está **sin confirmar**; primero validarlo con correos reales.
- **Costo:** los scopes restringidos de Gmail exigen verificación de Google y una auditoría de seguridad (CASA) si la app es pública. Conviene dejarlo para después de P1–P3.

### P5. Integración directa o API

- **No existe** ninguna API pública que entregue las compras del hincha en ninguna de las 6 plataformas.
- Lo único oficial es lo de Ticketmaster: afiliados y Discovery API, que sirven para mostrar eventos o precios, no historial.
- Una alianza con un club que tiene portal propio (OHipass o Tienda Everton) podría dar acceso a la asistencia de socios. Requiere un acuerdo comercial y el consentimiento del hincha.

### P6. Otros

- **Abonados sin entrada por partido** (O'Higgins, Deportes Concepción, Audax "Famiglia", Coquimbo): agregar un check-in manual o "marcar asistencia" a partir del fixture del club.
- **Compras presenciales** (Tienda Granate en La Serena, tienda de Limache): foto del ticket físico con OCR (usa el mismo parser de P1).
- **No usar:** scraping con las credenciales del usuario en las ticketeras (choca con sus términos de uso personal y crea riesgo de seguridad), ni datos del Registro Nacional de Hinchas (no hay acceso para el hincha y es dato biométrico sensible).
