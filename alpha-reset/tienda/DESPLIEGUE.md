# ALPHA RESET — Tienda con descarga automática tras el pago

## Cómo funciona
1. El cliente pulsa **Buy now** en `/book` → el servidor crea una sesión de **Stripe Checkout** ($29.99).
2. Paga en la página de Stripe (tarjeta, Apple Pay, Google Pay, Link).
3. Stripe le devuelve a `/thanks?session_id=...` → el servidor comprueba con Stripe que está pagado y **la descarga del PDF empieza sola** (y hay botón por si no).
4. El enlace de descarga va firmado y caduca a los 30 días. El PDF está en `private/`, **nunca es accesible por URL directa**.
5. Cada venta se apunta en `private/orders.jsonl` (email, importe, enlace) para reenviarlo si alguien lo pierde.

## Paso 1 — Stripe (10 min)
1. Crea cuenta en stripe.com y activa pagos (datos fiscales + cuenta bancaria).
2. **Developers → API keys** → copia la *Secret key* (`sk_test_...` para pruebas, `sk_live_...` para vender).
3. **Developers → Webhooks → Add endpoint**: URL `https://TUDOMINIO/webhook`, evento `checkout.session.completed` → copia el *Signing secret* (`whsec_...`). (Opcional pero recomendado.)
4. En **Settings → Emails** activa "Successful payments" para que Stripe mande el recibo automáticamente.
5. En **Settings → Public details** pon el nombre que saldrá en la tarjeta: `AR PRESS`.

## Paso 1b — Píxel de Meta + Conversions API (10 min)
1. Events Manager → crea el píxel (o usa el que tengas) → copia el **Pixel ID**.
2. Pega el código base del píxel en el `<head>` de `public/index.html`, `public/quiz.html`, `public/book.html` y `views/thanks.html` (hay un comentario `<!-- Meta Pixel -->` marcando el sitio).
3. Events Manager → tu píxel → **Settings → Conversions API → Generate access token** → cópialo en `META_CAPI_TOKEN` del `.env`, y el ID en `META_PIXEL_ID`.
4. Para probar: Events Manager → **Test events** → copia el código en `META_TEST_EVENT_CODE`, haz un quiz y una compra de prueba y verás llegar `Lead`, `InitiateCheckout` y `Purchase` marcados como "Server + Browser" (deduplicados). Luego borra el código de test.

5. **Consentimiento de cookies (UK/UE):** en el código base del píxel, justo después del loader y **antes** de `fbq('init', ...)`, añade `fbq('consent', 'revoke');`. `public/consent.js` (ya enlazado en todas las páginas) llama a `fbq('consent', 'grant')` cuando el visitante acepta el aviso; hasta entonces el píxel no dispara nada. Los visitantes que ya aceptaron no vuelven a ver el aviso.

Qué envía el servidor: **Lead** (quiz y checklist, con email hasheado), **InitiateCheckout** (botón de compra) y **Purchase** (desde el webhook de Stripe, aunque el cliente cierre la pestaña). Para que el Purchase llegue, el webhook del Paso 1 tiene que estar configurado.

## Paso 2 — Dominio
En Cloudflare, registro **A** del dominio → IP del servidor Hetzner. Si dejas la nube naranja (proxy), pon SSL/TLS en **Full**.

## Paso 3 — Subir al servidor (Hetzner)
```bash
# en el servidor, con Docker instalado
git clone <tu repo>  # o sube la carpeta app/ por SFTP
cd app
cp .env.example .env && nano .env      # pega STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SITE_URL, DOWNLOAD_SECRET
nano Caddyfile                          # cambia spelloraguides.com por tu dominio
docker compose up -d --build
```
Caddy saca el certificado SSL solo. Listo: `https://TUDOMINIO`.

Para generar el `DOWNLOAD_SECRET`: `openssl rand -hex 32`

## Probar antes de vender
Con `sk_test_...` en `.env`, compra con la tarjeta de prueba **4242 4242 4242 4242**, cualquier fecha futura, cualquier CVC. Debe llevarte a `/thanks` y descargar el PDF. Luego cambia a `sk_live_...` y reinicia: `docker compose restart shop`.

## Mantenimiento
- Cambiar el PDF: sustituye `private/ALPHA_RESET_Premium_Edition.pdf` (no hace falta reiniciar).
- Cambiar precios: `PRICE_BOOK` / `PRICE_SCRIPTS` en `.env` → `docker compose restart shop`.
- Reenviar un enlace a un cliente: busca su email en `private/orders.jsonl` y mándale el campo `link`.
- Logs: `docker compose logs -f shop`.
- Códigos descuento: créalos en Stripe (Products → Coupons); el checkout ya tiene el campo activado.

## Sin Docker (alternativa)
```bash
npm install && cp .env.example .env && npm start   # escucha en :3000
```
y pon Nginx/Caddy delante como proxy a `localhost:3000`.
