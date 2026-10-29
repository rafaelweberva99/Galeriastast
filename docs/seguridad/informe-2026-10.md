# Informe de seguridad: GaluchaStats

Fecha: 29-10-2026 · Repositorio: `/home/user/galeriastast` (rama `claude/historico-1995`)

> Aviso: mientras trabajaba, alguien hizo un commit con parte de mis cambios a medio hacer (`b418e56 WIP: endurecimiento de seguridad (agente en curso, sin publicar)`). Yo no hice ningún commit. El resto de los cambios quedó sin commitear en el árbol de trabajo: `next.config.ts`, `src/app/hincha/[username]/page.tsx`, `src/app/hincha/[username]/tarjeta/route.tsx`, `src/lib/client/ticketReader.ts`, `src/lib/repo/users.ts` y el archivo nuevo `tests/security.test.ts`. Para revisar todo junto: `git diff 20b4f1c`.

No modifiqué `src/app/terminos/*`, `src/app/privacidad/*` ni `src/lib/legal.ts`.

## Resultado de la validación

| Prueba | Resultado |
|---|---|
| `npx tsc --noEmit` | sin errores |
| `npx vitest run` | **99/99** (eran 80; se agregaron 19 en `tests/security.test.ts`, contra SQLite y PGlite) |
| `npm run build` | OK |
| E2E con Playwright (copia de `final.db`, `next start -p 3480`) | Funcionaron el registro, la cookie (HttpOnly, SameSite=Lax, path=/), el login fallido con mensaje genérico, el login, marcar un partido, importar una **imagen (OCR con Tesseract)**, un **PDF (pdf.js)** y un **xlsx**, confirmar la importación, el carnet (3 partidos) y la imagen para compartir (200, `image/png`). `/perfil/datos` sin sesión responde 401. Tras 5 fallos la cuenta queda bloqueada, aunque después se escriba la clave correcta. **No hubo violaciones de CSP ni errores en la consola del navegador.** |

## Hallazgos por severidad

### Crítico
No encontré ninguno. Todas las consultas SQL usan parámetros, no hay secretos en el repositorio ni en su historial (`.env*` está en `.gitignore` y solo se versiona `.env.example`), y todas las acciones revisan la sesión.

### Alto
1. **No había freno a la fuerza bruta en el login ni en el registro** (`src/app/actions.ts:90` y `:63` en la versión anterior). **Corregido.**
   - El módulo nuevo `src/lib/repo/throttle.ts` guarda los intentos en la tabla `login_attempts`. Como vive en la base de datos, funciona aunque Vercel levante varias instancias, sin Redis.
   - Las claves son la cuenta (lo que se escribe en "usuario o correo", en minúsculas) y la IP (`x-real-ip`, o si no `x-forwarded-for`). Se guardan como **hash SHA-256**, así que la tabla no contiene correos ni IPs en claro (minimización de datos personales).
   - Límites por cuenta: 5 fallos y luego un bloqueo de 1 min que se duplica con cada fallo nuevo, hasta 15 min. Una hora sin fallos borra el contador, y un login correcto también.
   - Límites por IP: 30 fallos y luego un bloqueo de 5 min que se duplica, hasta 60 min. El margen es amplio porque mucha gente comparte IP (wifi del estadio, 4G).
   - Registro: hasta 10 intentos por IP y por hora; después, un bloqueo de 30 min que se duplica, hasta 24 h.
   - La contraseña que se pide al eliminar la cuenta también queda frenada.
   - El mensaje es siempre genérico ("Usuario o contraseña incorrectos" o "Demasiados intentos… espera N minutos"), exista o no la cuenta. El contador sube de forma atómica (`INSERT … ON CONFLICT DO UPDATE … RETURNING`), así que no hay carreras, y las filas con más de un día se borran solas.
   - La tabla se agregó a `src/lib/db/schema.ts` con `CREATE TABLE IF NOT EXISTS`. La base de producción la crea sola en el siguiente arranque (`migratePg`), igual que la copia SQLite del E2E.
2. **Faltaban las cabeceras de seguridad.** **Corregido en `next.config.ts`.**
   - Se agregaron CSP, HSTS (2 años, includeSubDomains), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (cámara, micrófono, ubicación, pagos y USB bloqueados), `Cross-Origin-Opener-Policy: same-origin` y `poweredByHeader: false`.
   - La CSP permite `'wasm-unsafe-eval'` y `worker-src blob:` para Tesseract, y `data:`/`blob:` en las imágenes. Agrega `'unsafe-eval'` solo en desarrollo.
   - pdf.js ahora se abre con `isEvalSupported: false` (`src/lib/client/ticketReader.ts`) para no chocar con la CSP.
3. **Hashing de contraseñas por debajo de lo recomendado y ejecutado de forma síncrona** (`src/lib/repo/users.ts:27` antes: `scryptSync` con N=2^14, r=8, p=1). **Corregido.**
   - Ahora usa scrypt **asíncrono** con N=2^14, r=8, p=5 (16 MiB, unos 0,2 s), que es uno de los perfiles de OWASP.
   - El hash guarda sus propios parámetros (`scrypt$N,r,p$sal$hash`). Los hashes antiguos siguen funcionando y se recalculan solos en el siguiente login correcto.
   - Los parámetros de un hash se acotan, para que un hash manipulado no pueda pedir memoria o CPU sin límite. La contraseña tiene un máximo de 256 caracteres.
   - El hash se calcula fuera de la transacción del registro, para no bloquear la base mientras tanto.
4. **Se podía saber si una cuenta existe midiendo el tiempo de respuesta del login** (`users.ts:74` antes: si el usuario no existía, no se calculaba scrypt). **Corregido:** ahora se verifica contra un hash de relleno.

### Medio
5. **Los tokens de sesión se guardaban en claro en la tabla `sessions`** (`users.ts:107` antes). Una filtración de la base, por ejemplo de un respaldo, habría permitido entrar como cualquier hincha. **Corregido:** solo se guarda el SHA-256 del token.
   - Al hacer login se invalida el token que hubiera en el navegador (rotación) y se borran las sesiones vencidas del hincha.
   - **Efecto del deploy:** las sesiones abiertas hoy dejan de valer, así que todos tendrán que volver a ingresar una vez.
6. **Administración basada en un correo que nadie verifica** (`src/lib/admin.ts:13`). Si `ADMIN_EMAILS` incluye un correo que todavía no está registrado, cualquiera puede registrarse con ese correo y entrar a `/admin`. El daño es limitado: el panel muestra solo cifras agregadas y los clubes ocultos del MVP. **No lo cambié; ver las acciones del dueño.**
7. **SVG de la camiseta insertado con `dangerouslySetInnerHTML`** (`src/components/Jersey.tsx:8` y `src/lib/clubTheme.ts:214` antes). Hoy los datos que entran ahí no los controla el usuario: colores del catálogo y números fijos. Aun así quedó endurecido:
   - solo pasan colores hexadecimales o `rgb()`; cualquier otro valor se reemplaza por un color por defecto;
   - el número del pecho solo puede ser de 1 a 4 dígitos;
   - el nombre del club se escapa (`& < > " '`);
   - el tamaño se acota.

   Hay un test con una carga XSS. Los nombres de usuario en la imagen para compartir (Satori) y en las páginas siempre se muestran como texto escapado.

### Bajo
8. **Faltaban topes de largo en las entradas.**
   - Ahora: correo de hasta 254 caracteres, contraseña de hasta 256, club de hasta 64, `matchId` de hasta 200.
   - La importación confirmada acepta hasta 1000 ids únicos por envío; antes no tenía límite.
   - `getUserByUsername` rechaza nombres de más de 40 caracteres y el token de sesión de más de 100.
   - Las vistas previas de importación ya tenían topes (2 MB / 1 MB de texto, 2000 filas), y Next limita el cuerpo de las server actions a 1 MB.
9. **`decodeURIComponent` sin protección en `/hincha/[username]` y en su `/tarjeta`.** Un `%` suelto (por ejemplo `/hincha/%25E0`) provocaba un error 500. **Corregido** con `safeDecode`: ahora responde 404.
10. **El registro revela si un usuario o correo ya existe** ("El usuario o el correo ya están registrados"). Sin verificación de correo es difícil evitarlo sin empeorar la experiencia. Queda mitigado con el límite de registros por IP.
11. **La imagen pública del carnet se cachea 10 minutos** (`tarjeta/route.tsx:26`, `public, max-age=600`). Si un hincha pasa su carnet a privado, el CDN puede seguir sirviendo la imagen hasta 10 minutos. Lo considero aceptable; si se quiere, se puede bajar a 60 s.
12. **La CSP usa `'unsafe-inline'` en `script-src`,** porque Next.js inyecta scripts en línea para hidratar. Como todas las páginas ya son dinámicas, a futuro se podría pasar a una CSP con nonce mediante middleware. No lo hice ahora porque el OCR carga scripts y workers dinámicos y eso requiere probarse con calma. React escapa todo el texto, y el único HTML crudo (la camiseta) ya está saneado.
13. **Bloqueo de cuentas como forma de molestar:** un atacante podría bloquear la cuenta de alguien fallando a propósito. Por eso el bloqueo por cuenta llega como máximo a 15 min. Además, el contador va por lo que se escribe: entrar con el correo o con el usuario son contadores separados.
14. **Dependencias** (`npm audit --omit=dev`):
    - `fflate` 0.8.2 tenía un bucle infinito con ZIP64 malformado, que afectaba al lector de xlsx en el navegador. **Lo actualicé a 0.8.3.**
    - `postcss` (dentro de `next`) solo se usa al compilar nuestro propio CSS, así que no se puede explotar en producción. Corregirlo exige Next 16, que es un cambio mayor.
    - `zod` <4.6.6 tiene un agotamiento de memoria con colecciones gigantes. No validamos arreglos y el cuerpo está limitado a 1 MB. Corregirlo exige zod 4, que también es un cambio mayor.
    - Quedan 3 avisos, ninguno explotable en este uso.

### Revisado y sin problemas
- **CSRF:** las server actions de Next comparan `Origin` con `Host` y no hay `serverActions.allowedOrigins` configurado (no está abierto de más). La cookie además es `SameSite=Lax`.
- **Cookie de sesión:** HttpOnly, `Secure` en producción, SameSite=Lax, `path=/`, vence a los 30 días. El logout borra la sesión en la base y "cerrar todas las sesiones" también funciona.
- **Autorización e IDOR:**
  - todas las acciones usan `requireUser()` y el `user.id` de la sesión, nunca un id que venga del formulario;
  - `setAttendance` exige que el partido sea del club del hincha y que ya se haya jugado;
  - `removeAttendance` filtra por `user_id` (hay test);
  - `/perfil/datos` solo devuelve los datos de quien tiene la sesión;
  - la imagen de un carnet privado solo la ve su dueño;
  - `/admin` responde `notFound()` a quien no es administrador.
- **Inyección SQL:** todo usa parámetros `?`. Las interpolaciones que hay solo arman listas de `?`, constantes del código o el campo de `quality.ts:170`, que está en una lista cerrada (`CORRECTABLE`) y viene de un CSV del repositorio.
- **Redirecciones abiertas:** ningún `redirect()` usa datos del usuario.
- **Fugas de errores:** en producción Next solo muestra un `digest`. Las respuestas de error no incluyen trazas.
- **Privacidad:**
  - no toqué el consentimiento, la exportación ni la eliminación de la cuenta;
  - al eliminar la cuenta se borran las sesiones en cascada;
  - la exportación sigue sin incluir el hash de la contraseña ni los tokens;
  - la tabla de intentos no guarda datos personales en claro y se purga sola en 24 h.

## Pendiente (requiere un servicio externo o una decisión)
- **Verificación de correo y recuperación de contraseña:** ambas necesitan enviar correos. Para el administrador, mientras tanto, ver el punto 6.
- **CSP con nonce:** ver el punto 12.

## Acciones del dueño en Vercel y Neon
1. **ADMIN_EMAILS (Vercel → Settings → Environment Variables):** confirmar que cada correo de la lista **ya tiene una cuenta registrada por ti** antes de compartir el sitio. Si no, regístrala tú primero o quita el correo de la lista.
2. **Avisar del deploy:** después de publicar, todos tendrán que volver a ingresar una vez (las sesiones ahora se guardan como hash).
3. **Firewall de Vercel (gratis, Vercel → Firewall):** activar el **Attack Challenge Mode** si hay un ataque, y crear una regla de *rate limit* para las peticiones POST a `/ingresar` y `/registro` (por ejemplo, 20 por minuto por IP). Es una segunda capa sobre el freno en la base.
4. **Neon:**
   - usar la URL *pooled* con `sslmode=require` (ya está así por la integración);
   - la lista de IPs permitidas de Neon (IP Allow) es de pago y las IPs de Vercel cambian, así que no conviene; basta con no exponer la URL;
   - **rotar la contraseña de la base** (Neon → Roles → Reset password, y luego actualizar `DATABASE_URL` en Vercel) si alguna vez se compartió por chat, captura o correo.
5. **Vercel → Settings → Deployment Protection:** dejar protegidos los *preview deployments* (Vercel Authentication), para que las ramas de prueba no queden públicas con la base de producción.
6. Revisar que `NEXT_PUBLIC_SITE_URL` (si existe) apunte a `https://galeriastast.vercel.app`.

## Archivos tocados
- `next.config.ts`: cabeceras de seguridad, CSP y `poweredByHeader`.
- `src/lib/db/schema.ts`: tabla `login_attempts` en ambos dialectos.
- `src/lib/repo/throttle.ts` (nuevo): freno a la fuerza bruta.
- `src/lib/repo/users.ts`: scrypt asíncrono con parámetros, rehash, hash de relleno, sesiones con hash, `safeDecode` y topes de largo.
- `src/lib/repo/account.ts`: verificación asíncrona; el hash se calcula fuera de la transacción.
- `src/lib/auth.ts`: rotación de sesión al ingresar y `clientIp()`.
- `src/app/actions.ts`: freno en el login, el registro y la eliminación de la cuenta; topes de entrada; tope de ids importados.
- `src/lib/clubTheme.ts`: SVG de la camiseta saneado.
- `src/app/hincha/[username]/page.tsx` y `tarjeta/route.tsx`: `safeDecode`.
- `src/lib/client/ticketReader.ts`: pdf.js sin eval.
- `package.json` y `package-lock.json`: fflate 0.8.3.
- `tests/security.test.ts` (nuevo): 19 tests.
