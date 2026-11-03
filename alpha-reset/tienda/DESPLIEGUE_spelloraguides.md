# Subir ALPHA RESET a spelloraguides.com

Lo que ya está hecho en el código: el dominio y el email `hello@spelloraguides.com` están puestos en el libro, los bonus, la web, el `Caddyfile` y el `.env.example`. Esta guía es lo que tienes que hacer tú, en orden. Tiempo total: 30–40 minutos.

Necesitas: el VPS (IP y acceso `ssh root@IP`), la cuenta de Cloudflare con el dominio, y la cuenta de Stripe.

## 1. Cloudflare — DNS (3 min)

Cloudflare → `spelloraguides.com` → **DNS → Records**:

| Type | Name | Content | Proxy status |
|---|---|---|---|
| A | `@` | IP del VPS | **DNS only** (nube gris) |
| A | `www` | IP del VPS | **DNS only** (nube gris) |

- Si ya hay registros `A`, `AAAA` o `CNAME` para `@` o `www` (por ejemplo de Cloudflare Pages o de otra web), **bórralos**: solo puede haber uno.
- Nube gris por ahora: Caddy necesita que el puerto 80 llegue directo al servidor para pedir el certificado SSL. Cuando la web ya cargue en https, puedes poner la nube naranja (paso 7).

## 2. VPS — Docker y puertos (5 min)

```bash
ssh root@IP_DEL_VPS
curl -fsSL https://get.docker.com | sh          # instala Docker + docker compose (Ubuntu/Debian)
ufw allow OpenSSH && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable
```

Si el VPS es de Hetzner y tiene un **Firewall** en el panel, abre ahí también 80 y 443 (TCP, entrada).

## 3. Subir la tienda (2 min)

Desde tu PC, en PowerShell:

```powershell
cd "C:\Users\javig\brain\Alpha Reset\tienda"
.\deploy.ps1 root@IP_DEL_VPS
```

El script empaqueta `tienda/` (sin `node_modules` ni tu `.env`), lo sube a `/opt/alpha-reset/tienda`, y hace `docker compose up -d --build`. Para volver a desplegar tras cualquier cambio, el mismo comando.

> Si Windows dice que no encuentra `ssh`, `scp` o `tar`: Configuración → Aplicaciones → Características opcionales → "Cliente OpenSSH" (tar viene con Windows 10/11).

## 4. Stripe (10 min)

1. **Developers → API keys** → copia la *Secret key*. Empieza con `sk_test_...` para probar.
2. **Developers → Webhooks → Add endpoint**:
   - URL: `https://spelloraguides.com/webhook`
   - Evento: `checkout.session.completed`
   - Copia el *Signing secret* (`whsec_...`).
3. **Settings → Public details** → nombre en el extracto: `AR PRESS`.
4. **Settings → Emails** → activa "Successful payments" (Stripe manda el recibo).

## 5. El `.env` en el servidor (3 min)

```bash
ssh root@IP_DEL_VPS
cd /opt/alpha-reset/tienda
openssl rand -hex 32        # copia el resultado para DOWNLOAD_SECRET
nano .env
```

Rellena:

```
STRIPE_SECRET_KEY=sk_test_...        (luego sk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=https://spelloraguides.com
DOWNLOAD_SECRET=<el hex de openssl>   ← no lo cambies nunca después de vender
PRICE_BOOK=2999
PRICE_SCRIPTS=1700
```

Guarda y reinicia: `docker compose restart shop`. Comprueba que arranca: `docker compose logs -f shop` (debe decir `ALPHA RESET shop → https://spelloraguides.com`). Caddy pide el certificado solo; en 1–2 minutos `https://spelloraguides.com` carga.

## 6. Compra de prueba (5 min)

Con `sk_test_...` en el `.env`:

1. Abre `https://spelloraguides.com/quiz`, haz el quiz, pulsa comprar.
2. Tarjeta `4242 4242 4242 4242`, fecha futura, cualquier CVC.
3. Tiene que llevarte a `/thanks` y empezar la descarga sola. Con el Scripts Pack marcado, la descarga es un ZIP.
4. En Stripe → Webhooks → tu endpoint → debe aparecer el evento con respuesta `200`.
5. En el servidor: `cat private/orders.jsonl` → ahí está la venta con el enlace de descarga (sirve para reenviarlo).

Cuando todo funcione: cambia `STRIPE_SECRET_KEY` a `sk_live_...`, crea el webhook también en modo live (misma URL, nuevo `whsec_`), y `docker compose restart shop`.

## 7. Cloudflare — después de que haya SSL (opcional, 2 min)

Cuando `https://spelloraguides.com` ya cargue:

- DNS → pon los dos registros A en **Proxied** (nube naranja): oculta la IP del servidor y filtra bots.
- **SSL/TLS → Overview → Full (strict)**. Con "Flexible" la web entra en bucle de redirecciones.
- **SSL/TLS → Edge Certificates → Always Use HTTPS: On**.

## 8. Email `hello@spelloraguides.com` (5 min, gratis)

Cloudflare → `spelloraguides.com` → **Email → Email Routing** → Enable → *Custom addresses* → `hello@spelloraguides.com` → destino: tu Gmail. Cloudflare añade los registros MX solos. Con eso **recibes**. Para **enviar** desde esa dirección (la secuencia de emails y las respuestas), usa el remitente verificado de tu herramienta de email (MailerLite / Brevo verifican el dominio con 2 registros DNS que te dan ellos).

## 9. Píxel de Meta

Igual que en `DESPLIEGUE.md`, paso 1b (incluye el `fbq('consent','revoke')` para el aviso de cookies). Después, `.\deploy.ps1 root@IP_DEL_VPS` otra vez.

## Mantenimiento

| Quiero… | Hago… |
|---|---|
| Cambiar texto de la web o el PDF | Edito en mi PC → `.\deploy.ps1 root@IP_DEL_VPS` |
| Ver ventas / leads | `ssh root@IP_DEL_VPS "cat /opt/alpha-reset/tienda/private/orders.jsonl"` (o `leads.jsonl`) |
| Reenviar una descarga | Busco el email en `orders.jsonl` y le mando el campo `link` |
| Ver errores | `ssh root@IP_DEL_VPS "cd /opt/alpha-reset/tienda && docker compose logs --tail 100 shop"` |
| Cambiar precios | `PRICE_BOOK` / `PRICE_SCRIPTS` en `.env` → `docker compose restart shop` |

**Ojo:** `private/orders.jsonl` y `leads.jsonl` viven en el servidor y `deploy.ps1` no los toca. Haz copia de vez en cuando: `scp root@IP_DEL_VPS:/opt/alpha-reset/tienda/private/*.jsonl .`
