# Encofrados Vera — Landing Page

Landing page de **Encofrados Vera** — arriendo y venta de moldajes y encofrados en Chile.
Stack: Node.js + Express + EJS + Resend + Cloudflare Turnstile.
Misma estructura que el proyecto VRM Rental.

---

## 1. Instalación local

```bash
npm install
cp .env.example .env      # y completa las variables
npm run dev               # nodemon en http://localhost:3000
```

Para producción: `npm start`

---

## 2. Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NODE_ENV` | sí | `production` en Railway. Activa la validación de Turnstile y el forzado de HTTPS. |
| `PORT` | no | Railway la inyecta sola. Por defecto 3000. |
| `RESEND_API_KEY` | sí | API key de Resend. Sin ella la app **igual levanta**, pero el formulario responde con error controlado. |
| `QUOTE_RECIPIENTS` | no | Destinatarios separados por coma. Si va vacía se usan los de `app.js`. |
| `TURNSTILE_SITE_KEY` | no | Si está vacía, el widget CAPTCHA no se renderiza. |
| `TURNSTILE_SECRET` | no | Requerida si usas Turnstile en producción. |
| `GA_MEASUREMENT_ID` | no | Si está vacía, no se carga Google Analytics. |

---

## 3. Destinatarios de cotización

Definidos al inicio de `app.js` (constante `DESTINATARIOS`) y sobrescribibles con `QUOTE_RECIPIENTS`:

```
eric.zamora@encofradosvera.cl
cristian.vera@encofradosvera.cl
sebastian.vera@mvmontajes.cl
tomas.moreno@mvmontajes.cl
fernando.vera@mvmontajes.cl
william@mj-geruest.cl          ← VERIFICAR: dominio inferido
```

---

## 4. Dominio y redirecciones

El sitio usa **apex sin www**: `https://encofradosvera.cl`

- `www.encofradosvera.cl` → 301 → `encofradosvera.cl` (middleware en `app.js`)
- HTTP → HTTPS en producción (vía `x-forwarded-proto`)
- Canonical, sitemap, robots y Open Graph apuntan todos al apex

En el DNS necesitas **ambos** registros apuntando a Railway (apex y www), para que el
middleware pueda recibir la petición de www y redirigirla.

---

## 5. Deploy en Railway

1. Sube el repo a GitHub (el `.gitignore` ya excluye `node_modules` y `.env`).
2. En Railway: **New Project → Deploy from GitHub repo**.
3. Railway detecta Node automáticamente y corre `npm start`. El `Procfile` está incluido por si acaso.
4. En **Variables**, carga las de la tabla del punto 2.
5. En **Settings → Networking → Custom Domain**, agrega `encofradosvera.cl` y `www.encofradosvera.cl`.
6. Configura el DNS con los registros que te entregue Railway.

> No hardcodees el puerto: `app.js` ya lee `process.env.PORT`.

---

## 6. Resend

Para que salgan los correos hay que **verificar el dominio** `encofradosvera.cl` en Resend
(registros SPF/DKIM en el DNS). El remitente configurado es:

```
Encofrados Vera <cotizaciones@encofradosvera.cl>
```

Mientras el dominio no esté verificado, Resend rechaza los envíos.

---

## 7. Imágenes

| Archivo | Qué es |
|---|---|
| `public/images/logo-vera.png` | Logo original (fondo transparente, texto negro) |
| `public/images/logo-vera-blanco.png` | Versión para fondos oscuros — es la que usa el nav y el footer |
| `public/images/favicon.png` | Isotipo recortado, 512×512 |
| `public/images/og-image.jpg` | Preview para WhatsApp/LinkedIn, 1200×630 |
| `public/images/productos/*.jpg` | 14 fotos de sistemas, 1200×800 |
| `public/images/equipo/eric-zamora.jpg` | **Placeholder** — reemplazar por la foto real (cuadrada, mín. 600×600) |

**Sobre las fotos de productos:** son imágenes con licencia libre (Wikimedia Commons, CC BY-SA / CC0),
no material de catálogo de PERI, Doka, Ulma ni otras marcas. Publicar fotos de catálogo ajeno en un
sitio comercial expone a reclamos de derechos de autor. Reemplázalas por fotos propias de obra
cuando las tengas — basta con sobrescribir los archivos manteniendo el mismo nombre.

---

## 8. Para editar contenido

| Qué | Dónde |
|---|---|
| Textos, secciones, productos | `views/landing.ejs` |
| Colores, tipografía, layout | `public/css/landing.css` (variables CSS al inicio) |
| Lista del selector de cotización | `SISTEMAS_VALIDOS` en `app.js` (alimenta la vista **y** la validación del backend) |
| Destinatarios del correo | `DESTINATARIOS` en `app.js` o variable `QUOTE_RECIPIENTS` |
| Plantilla del correo | Función del `POST /cotizar` en `app.js` |

Color de marca: `--red: #ee0117` (extraído del logo).

---

## 9. Pendientes antes de publicar

- [ ] Foto real de Eric Zamora
- [ ] Verificar el correo de William (dominio `mj-geruest.cl` fue inferido)
- [ ] Verificar dominio en Resend
- [ ] Crear las claves de Turnstile y cargarlas
- [ ] Reemplazar fotos de productos por registro fotográfico propio
- [ ] Enlaces reales de LinkedIn e Instagram en el footer
- [ ] Confirmar direcciones de las bodegas en la sección Cobertura
