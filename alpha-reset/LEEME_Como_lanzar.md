# ALPHA RESET — Paquete de lanzamiento

## Qué hay en esta carpeta

| Archivo | Qué es |
|---|---|
| `ALPHA_RESET_Premium_Edition.pdf` | El libro (59 págs, 6×9", edición premium). Es el producto que vendes. |
| `ADS_Alpha_Reset_4_Ads.md` | 4 anuncios en inglés (texto, titular, guion de vídeo, creatividad) + plan de test de 7 días. |
| `tienda/` | La web completa + servidor de pago (Stripe Checkout) + descarga automática del PDF tras pagar. **Lee `tienda/DESPLIEGUE.md`.** |
| `tienda/public/index.html` | Landing con funnel: dolor → agitación → 7 errores → mini-quiz → el cambio → contenido → para quién es → CTA. Todo lleva a `/book`. |
| `tienda/public/quiz.html` | **Quiz de entrada (destino de los anuncios):** 9 preguntas → resultado SIN puerta de email → la propia página de resultado es una mini página de venta (plan de 30 días personalizado, precio, order bump, botón de compra). Email opcional al final. |
| `tienda/public/book.html` | Página de venta: qué incluye, muestra interior, precio $29.99, garantía, FAQ, botón Buy now (abre Stripe). |
| `tienda/views/thanks.html` | Página de gracias: verifica el pago y descarga el PDF sola. |
| `tienda/private/` | Los PDFs (no accesibles por URL) y los registros de ventas y leads. |
| `bonus/` | Scripts Pack (60 mensajes), Protocolo 2 a.m., checklist gratis (lead magnet). |
| `capturas/` | Capturas de la web en escritorio y móvil, incl. el flujo del quiz. |
| `EMAILS_Secuencia_Leads.md` | 6 emails (día 0–7) para los leads del quiz/checklist que no compran. |

## Embudo v2 — qué se ha añadido (y por qué)

| Elemento | Dónde | Por qué convierte |
|---|---|---|
| Barra de confianza (1.000+ hombres, Stripe, entrega instantánea, garantía) | Landing y venta, bajo el menú | Primer segundo: credibilidad + seguridad |
| Bloque "quién está detrás" (coaching presencial, 1.000+ hombres) | Landing y venta | Diferencia de los ebooks de $3; autoridad real |
| Stack de oferta con valor ($47 + bonus = $64 → $29.99) | Página de venta | Anclaje de precio; la competencia top vende a $47 |
| Bonus real: **Protocolo 2 a.m.** (incluido) | PDF en `bonus/` | Ataca el momento exacto en que rompen el no-contact |
| **Order bump**: Scripts Pack 60 mensajes +$17 | Caja de compra (checkbox) | Sube el ticket medio ~30-40% sin tocar la conversión |
| **Upsell de un clic post-compra**: Scripts Pack $17 (solo a quien no lo cogió en la caja) | Página de gracias (Sí/No) | Segunda oportunidad de subir el ticket; 100% automático, sin tu tiempo |
| Tabla comparativa (ebook $3 vs ALPHA RESET vs coaching $150/h) | Página de venta | Posiciona el precio como barato y serio a la vez |
| Iconos de pago + "256-bit by Stripe" + garantía con sello | Caja de compra | Confianza en el punto de dolor: meter la tarjeta |
| **Captura de email**: checklist gratis (inline + popup de salida) | Landing | Recuperas al 95% que no compra: retargeting + emails |
| Precio de lanzamiento $29.99 tachando $47 | Toda la web | Urgencia honesta (tú decides cuándo subirlo) |

Los emails se guardan en `tienda/private/leads.jsonl`; las ventas en `tienda/private/orders.jsonl`. Expórtalos a Meta como audiencia personalizada cada semana.

**Pendiente tuyo:** cuando tengas 3-5 testimonios reales de compradores, métele una sección — es lo único que falta en la página de venta y no lo he inventado a propósito.

## Funnel (cómo fluye el tráfico)

**Tráfico de anuncios (frío):** Anuncio → `/quiz` (9 preguntas → resultado = mini venta con botón de compra) → Stripe → `/thanks` (descarga + upsell). Enlace secundario a `/book?p=perfil` para el que quiere ver más.

Por qué así: el 30–50% de los que terminan un quiz abandonan en la puerta del email (ConvertFlow), y poner el email después del resultado convierte más a compra. Con 9 preguntas (máximo de conversión en los datos de plataforma: 9–12) y sin puerta, el que llega al resultado ya está caliente y compra ahí mismo. Los que completan sin comprar quedan en `quiz.jsonl` (perfil + respuestas, sin email) para que veas qué perfiles abundan.

**Tráfico directo / retargeting:** `/` (landing con botón al quiz y captura de email) → `/book` (venta + order bump) → Stripe Checkout → `/thanks` (descarga automática + upsell Scripts Pack si no lo cogió)

## Antes de subirlo

1. **Stripe**: clave secreta + webhook en `tienda/.env` (guía paso a paso en `tienda/DESPLIEGUE.md`).
2. **Dominio**: en `tienda/Caddyfile` y en `SITE_URL` del `.env`. Registro A en Cloudflare → IP del Hetzner.
3. **Píxel de Meta**: pégalo en el `<head>` de `public/index.html`, `public/book.html` y `views/thanks.html` (hay un comentario marcando el sitio). Los eventos InitiateCheckout y Purchase ya están disparados.

Opcional: cambia `hello@spelloraguides.com` por tu email. Las páginas de Términos / Privacidad / Reembolsos ya existen en `tienda/public/legal.html` (enlazadas desde todos los footers): **rellena los corchetes** `[LEGAL NAME]`, `[ADDRESS]`, `[COUNTRY]`, `[VAT/TAX ID]`.

## Subirlo

En el servidor Hetzner: copia la carpeta `tienda/`, rellena `.env`, `docker compose up -d --build`. Caddy saca el SSL solo. Detalle completo en `tienda/DESPLIEGUE.md`.

## Presupuesto y plan de anuncios

**Números del producto:** ticket medio ≈ $35 (29,99 + ~30% que añaden el Scripts Pack) − comisión Stripe ≈ **$33 de margen por venta**. Objetivo: coste por compra (CPA) **< $20**. Por encima de $33 pierdes dinero; entre $20 y $33 ganas poco pero construyes lista.

**Fase 1 — Test (2 semanas, ~$700):**
- 1 campaña, **2 conjuntos** (A: destino `/quiz` · B: destino `/`), hombres 22–45, US/UK/CA/AU, segmentación amplia.
- Los 4 anuncios en cada conjunto. **$25/día por conjunto = $50/día.**
- Días 1–5: no toques nada. Día 5: mata los 2 anuncios peores de cada conjunto (CTR < 1% o CPA > $35). Día 10: decide quiz vs landing por CPA y pasa el 100% al ganador.
- Lo normal es perder dinero en esta fase (esperable: 300–400 clics, 8–12 ventas, −$300). Estás comprando datos, no ventas.

**Fase 2 — Escalar (desde la semana 3):**
- Si el CPA se mantiene < $20 durante 3 días: sube el presupuesto un 20% cada 3 días. Nunca dobles de golpe; Meta reinicia el aprendizaje.
- Techo razonable sin más creatividades: $100–150/día. Para pasar de ahí necesitas 2–3 vídeos nuevos del ángulo ganador cada semana.
- Retargeting desde el día 3: audiencia de visitantes de `/book` sin compra + leads → Anuncio 2, $10/día. Es el conjunto más rentable que tendrás.

**Costes fijos:** dominio ~$10/año · Hetzner ya lo tienes · email marketing gratis hasta 1.000 contactos (MailerLite/Brevo) · Stripe 2,9% + 0,30.

**Mínimo absoluto para saber si funciona: $500. Recomendado: $1.000 para dos semanas limpias.** Si con $1.000 no bajas de $35 de CPA, el problema es el anuncio o la oferta, no el presupuesto — cambia creatividades antes de meter más dinero.

Métricas de corte por anuncio en `ADS_Alpha_Reset_4_Ads.md`.

## Notas de cumplimiento (importante para que Meta no te tumbe la cuenta)

- No prometas "ella volverá" ni "garantizado": el copy ya está escrito sobre *él* (cuerpo, mente, probabilidades).
- No inventes testimonios ni reseñas. Cuando tengas compradores reales, pide 3–5 frases y mételas en `book.html`.
- La garantía es "do the work" (30 días + scorecard), no "si no vuelve te devuelvo el dinero".

## Editar el libro

El fuente es `book/book.html`; se regenera con `python3 book/build.py` (usa Chrome headless + Playwright). Si cambias texto, vuelve a generar y sustituye el PDF.

## v3 — Revisión de lanzamiento (3 nov 2026)

Cambios hechos y por qué:

- **Libro.** Precios en € → $ y kilos → lbs (vendes en US/UK/CA/AU). Portadilla (pág. 2): el pie "Alpha Reset Press · Premium Edition" salía sin estilo porque el CSS `.tp .pub` no aplicaba; ahora va centrado abajo. La firma "— Alpha Reset" que quedaba sola en la pág. 47 es ahora una página de cierre que replica la dedicatoria. `book-source/build.py` acepta la variable `CHROME` con la ruta del navegador (Windows: `set CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe`).
- **Quiz.** El resultado ya no dice "Recovery odds: 72%" ni "Comparing with 1,000+ cases": era un número inventado sobre la decisión de otra persona, justo lo que prohíben tus notas de cumplimiento y las políticas de Meta. Ahora es un **Reset score /100** sobre él, con el mismo motor de puntuación.
- **Precios.** Fuera el "Regular price $47" tachado y el "sold separately for $27": son precios de referencia que nunca han existido (problema con FTC, CMA y la directiva de precios de la UE). Ahora: "Launch price · rises to $47 after launch" y "Comparable programs sell for $47 and up". **Si dejas esa frase, sube el precio de verdad.**
- **Bug.** Tras un checkout fallido, el total del botón dejaba de actualizarse al marcar el Scripts Pack (`quiz.html` y `book.html`).
- **Legal.** `tienda/public/legal.html` con Términos, Privacidad y Reembolsos; los enlaces del footer ya apuntan ahí. Bajo el botón de compra hay un consentimiento a la entrega inmediata del contenido digital (en UE/UK, sin él el cliente conserva 14 días de desistimiento).
- **Cookies.** `tienda/public/consent.js` muestra un aviso y solo activa el píxel de Meta cuando el visitante acepta (UK PECR / UE). Cómo pegar el píxel: `tienda/DESPLIEGUE.md`, paso 1b. Los eventos de la Conversions API siguen saliendo del servidor; si quieres ser estricto en UE/UK, condiciona también `capi.send` al consentimiento.

Pendiente tuyo (no lo puedo hacer yo):

- **Nombre y foto del coach** en "Who's behind this": ahora es un "we" anónimo con avatar A·R. Es lo que más convierte de toda esta lista.
- **3–5 testimonios reales**, con permiso, de tus clientes presenciales.
- Rellenar `legal.html`, pegar el píxel, Stripe en modo live.
