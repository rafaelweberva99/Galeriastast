# Discrepancias del segundo verificador (28-oct-2026)

Todo se verificó con WebSearch. WebFetch no pudo abrir cdcobresal.cl, huachipatofc.cl, es.wikipedia.org ni footballkitarchive.com (el host no resuelve en este contenedor).

## Composición de Primera 2026: confirmada
- **16 clubes**, igual que la lista del primer agente.
- **Coquimbo Unido** fue campeón 2025: ganó 2-0 a La Calera el 2-nov-2025 (Radio Agricultura, ESPN).
- **Unión Española** descendió el 30-nov-2025 y **Deportes Iquique** el 6-dic-2025. La ANFP rechazó los reclamos de ambos para anular el descenso (En Cancha, 30-dic-2025).
- **Ascendieron** U. de Concepción y Deportes Concepción.
- **Cobreloa (final de la Liguilla) y Copiapó:** no los verifiqué de forma independiente.

## Cambios por club
| Club | Cambio | Motivo |
|---|---|---|
| U. Católica | URL `cruzados.puntoticket.com` → `www.puntoticket.com/evento/universidad-catolica-...` | No encontré ninguna página en ese subdominio. Todas las fichas 2026 (Liga, Copa de la Liga, Libertadores) están en www.puntoticket.com. Matiz sobre Libertadores vs Boca: las entradas cedidas por abonados se vendieron solo a socios. |
| Audax Italiano | URL `audaxitaliano.ticketplus.cl` → `ticketplus.cl/companies/audax` | No encontré ese subdominio. La página "Audax - Venta Oficial de Entradas" y la tienda "Audax Mercato" están en ticketplus.cl, lo que confirma que audaxmercato.cl es la tienda del club en Ticketplus. |
| Huachipato | Confianza media → alta | Encontré fichas de Passline en 2026: Copa de la Liga vs Colo-Colo (junio 2026) y Liga vs UC y vs U. de Chile, con RNH obligatorio. La nota de Prensafutbol sobre el "2 de noviembre" es de 2025 (el 2-nov-2025 cayó domingo), así que no sirve para 2026. |
| Cobresal | Fuente actualizada | La fuente del primer agente (cdcobresal, feb-2025) era de la temporada 2025. Para 2026, Prensafutbol confirma Passline en el partido vs U. de Chile (mayo de 2026). |
| Ñublense | URL → `passline.com/sitio/nublense` | Es el micrositio del club en Passline. Hay fichas de las fechas 3, 5, 13, 15, 16, 19 y 21 de 2026. |
| Deportes Concepción | URL → `passline.com/productora/7243918-deportes-concepcion-sadp` | Es la productora confirmada en Passline. |
| Everton | URL → `tiendaeverton.cl/entradas_partidos.php` | Confirmado por el tuit del club (jul-2026). Los abonados asignan su entrada en `abonados_asignarEntrada.php`. |
| La Serena | La venta presencial en Tienda Granate queda "sin confirmar" | Ticketmaster está confirmado. Las fichas dicen "solo online" y que los abonados hacen canje en Ticketmaster. |

Sin cambios (confirmados): Colo-Colo y U. de Chile (PuntoTicket), O'Higgins (OHipass), Coquimbo (coquimbo.ticketplus.cl), Palestino, La Calera y UdeC (Ticketmaster) y Limache (Passline, productora Limachinos SADP).

## Comprobantes: correcciones importantes
- **Ticketmaster Chile:** el primer agente afirmaba "PDF con QR". En 2026, Ticketmaster Chile entrega entradas en la **app Quentro con QR dinámico** (se renueva cada 15–20 s) en conciertos como BTS y Ed Sheeran. No confirmé si en fútbol entrega PDF o usa Quentro. Por eso `pdf`/`qr_app` quedaron en `null`, y el parser no debería contar con un PDF.
- **Ticketplus:** su app tiene una billetera con **QR dinámico** antifraude, que funciona sin conexión. No encontré una fuente oficial del envío de PDF por correo, así que `pdf` quedó en `null`.
- **PuntoTicket:** su FAQ confirma un correo de confirmación con N° de orden, cantidad de entradas y forma de despacho, y que el e-ticket "llega directamente a tu correo". El nombre "Mis compras" sigue sin confirmar.
- **Passline:** la sección se llama "Mis eTickets" según una guía de terceros. Un soporte de Passline (en portugués) dice que los QR se reenvían al correo y se ven en la web y la app al iniciar sesión.
- **Afiliados de Ticketmaster vía Impact:** confirmado. El FAQ de developer.ticketmaster.com incluye a Chile entre sus 25 mercados, y hay que inscribirse en la campaña Impact de cada país. Ninguna ticketera ofrece una API con las compras del usuario.

## Registro de asistencia
- **Registro Nacional de Hinchas:** no encontré ninguna función para que el hincha vea su historial. Funciona solo para enrolar y verificar identidad (biometría) y prohibiciones. Supera el millón de inscritos.
- **Registro Facial de Colo-Colo:** lo opera Imply ElevenTickets (facialcolocolo.eleventickets.com), es obligatorio desde 2026 y usa 136 torniquetes. Tampoco encontré un historial de ingresos visible para el hincha.
- **U. de Chile:** confirmé las pruebas de reconocimiento facial en el Estadio Nacional (Redgol). No encontré historial para el hincha.
- **Conclusión:** ningún sistema permite hoy que el hincha vea los partidos a los que entró.

## Deportes Limache (limache.json)
- **Apodo, hinchas y alias:** "Tomateros" (apodo), "limachinos" (hinchas) y "Tomate Mecánico" (alias).
- **Colores:** rojo y negro.
- **Camiseta titular:** roja con detalles negros. **Hay un conflicto:** Football Kit Archive cataloga la titular 2026 como "Striped Navy/Red/White". Hay que revisarlo con una foto oficial.
- **Estadio 2026:** Lucio Fariña Fernández (Quillota). Su recinto en Limache, el Gustavo Ocaranza, no se usa en Primera.
- **Ciudad:** Limache.
