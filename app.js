require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const path      = require('path');
const { Resend } = require('resend');

const app = express();

// Resend se inicializa solo si hay API key, para que la app no
// caiga al levantar (útil en desarrollo y en el primer deploy).
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
if (!resend) console.warn('⚠️  RESEND_API_KEY no definida: el formulario no enviará correos.');

app.set('trust proxy', 1);

// ══════════════════════════════════════════════════════════
//  DESTINATARIOS DE COTIZACIÓN
//  Se pueden sobrescribir con la variable de entorno
//  QUOTE_RECIPIENTS (separados por coma) sin tocar el código.
// ══════════════════════════════════════════════════════════
const DESTINATARIOS = (process.env.QUOTE_RECIPIENTS || [
  'eric.zamora@encofradosvera.cl',
  'cristian.vera@encofradosvera.cl',
  'sebastian.vera@mvmontajes.cl',
  'tomas.moreno@mvmontajes.cl',
  'fernando.vera@mvmontajes.cl',
  'william@mj-geruest.cl',
].join(',')).split(',').map(s => s.trim()).filter(Boolean);

// Redirigir www → apex (encofradosvera.cl)
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  if (host === 'www.encofradosvera.cl' || host === 'www.encofradosvera.cl:3000') {
    return res.redirect(301, 'https://encofradosvera.cl' + req.url);
  }
  next();
});

// Forzar HTTPS en producción
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, 'https://' + req.headers.host + req.url);
  }
  next();
});

// ── ROBOTS.TXT explícito ──────────────────────────────────
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nAllow: /\n\nSitemap: https://encofradosvera.cl/sitemap.xml');
});

const PORT = process.env.PORT || 3000;

// ── VIEW ENGINE ──────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── STATIC FILES ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── BODY PARSERS ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── HELMET ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'", "'unsafe-eval'"],
      styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:       ["'self'", "https://fonts.gstatic.com"],
      scriptSrc:     ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://www.googletagmanager.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      frameSrc:      ["'self'", "https://challenges.cloudflare.com", "https://www.google.com", "https://maps.google.com"],
      imgSrc:        ["'self'", "data:", "https:"],
      connectSrc:    ["'self'", "https://challenges.cloudflare.com", "https://*.cloudflare.com", "https://www.google-analytics.com"],
    }
  }
}));

// ── RATE LIMIT ───────────────────────────────────────────
const quoteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Demasiados intentos. Intenta en 15 minutos.' }
});

// ── HELPER: verificar Turnstile ───────────────────────────
// Turnstile solo se aplica si hay secret configurado.
// const TURNSTILE_ACTIVO = Boolean(process.env.TURNSTILE_SECRET);
// const TURNSTILE_ACTIVO = Boolean(process.env.TURNSTILE_SECRET);
const TURNSTILE_ACTIVO = Boolean(process.env.TURNSTILE_SECRET);
if (!TURNSTILE_ACTIVO) console.warn('⚠️  TURNSTILE_SECRET no definida: el formulario queda sin CAPTCHA (protegido solo por rate limit).');

async function verifyTurnstile(token, ip) {
  try {
    const body = new URLSearchParams();
    body.append('secret',   process.env.TURNSTILE_SECRET);
    body.append('response', token);
    body.append('remoteip', ip);

    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
    const data = await resp.json();
    return data.success === true;
  } catch (err) {
    console.error('[Turnstile error]', err.message);
    return false;
  }
}

// ── CATÁLOGO (usado en la vista y en la validación) ───────
const SISTEMAS_VALIDOS = [
  'Moldaje de muro modular (marco de acero)',
  'Moldaje de muro liviano / manoportable',
  'Moldaje de losa (vigas H20 + puntales)',
  'Mesas de encofrado / mesas voladoras',
  'Moldaje de columnas y pilares',
  'Moldaje circular y geometrías especiales',
  'Moldaje de fundaciones y radieres',
  'Sistema trepante / autotrepante',
  'Puntales y torres de carga',
  'Andamio multidireccional',
  'Andamio de fachada',
  'Plataformas y consolas de seguridad',
  'Escaleras y accesos de obra',
  'Vigas H20 y tableros fenólicos',
  'Accesorios y fijaciones',
  'Asesoría técnica / plano de despiece',
  'Múltiples sistemas'
];

// ── ROUTES ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.render('landing', {
    title:            'Encofrados Vera | Arriendo y Venta de Moldajes y Encofrados en Chile',
    description:      'Arriendo y venta de moldajes y encofrados para muros, losas, columnas y obra civil. Compatibles con los principales sistemas del mercado chileno. Asesoría en terreno y cobertura nacional.',
    year:             new Date().getFullYear(),
    sistemas:         SISTEMAS_VALIDOS,
    turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || ''
  });
});

// ── POST cotización ───────────────────────────────────────
app.post('/cotizar', quoteLimiter, async (req, res) => {
  const { nombre, rut, empresa, email, telefono, equipo, obra, m2, mensaje, consentimiento } = req.body;
  const turnstileToken = req.body['cf-turnstile-response'];

  // Verificar CAPTCHA solo en producción Y si Turnstile está configurado.
  // Sin TURNSTILE_SECRET el chequeo se omite (si no, Cloudflare rechazaría todo).
  if (process.env.NODE_ENV === 'production' && TURNSTILE_ACTIVO) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const captchaOk = await verifyTurnstile(turnstileToken, ip);
    if (!captchaOk) {
      return res.status(400).json({ ok: false, message: 'Verificación de seguridad fallida. Intenta nuevamente.' });
    }
  }

  // Validar campos requeridos
  if (!nombre || !email || !telefono || !equipo) {
    return res.status(400).json({ ok: false, message: 'Faltan campos requeridos.' });
  }
  // Consentimiento obligatorio (Ley 21.719)
  if (consentimiento !== true) {
    return res.status(400).json({ ok: false, message: 'Debes aceptar la Política de Privacidad para enviar tu solicitud.' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ ok: false, message: 'Email inválido.' });
  }
  // Teléfono: exactamente 9 dígitos comenzando por 9 (sin +, sin +56, sin espacios).
  const telRegex = /^9\d{8}$/;
  if (!telRegex.test(String(telefono).trim())) {
    return res.status(400).json({ ok: false, message: 'Teléfono inválido. Debe tener 9 dígitos y comenzar con 9.' });
  }
  if (!SISTEMAS_VALIDOS.includes(equipo)) {
    return res.status(400).json({ ok: false, message: 'Sistema no válido.' });
  }

  if (!resend) {
    console.error('[Email error] RESEND_API_KEY no configurada.');
    return res.status(500).json({
      ok: false,
      message: 'El envío no está disponible por ahora. Escríbenos a cristian.vera@encofradosvera.cl'
    });
  }

  // Sanitizar salida al HTML del correo
  const esc = (s) => String(s || '').replace(/[<>&"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', '"':'&quot;' }[c]));

  try {
    const fechaHora = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

    const fila = (label, valor, destacado = false) => `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:12px 0;font-weight:700;color:#374151;width:150px;vertical-align:top">${label}</td>
        <td style="padding:12px 0;color:#111827;white-space:pre-wrap">${destacado
          ? `<strong style="color:#ee0117;font-size:15px">${valor}</strong>`
          : valor}</td>
      </tr>`;

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb">
        <div style="background:#ee0117;padding:28px 32px">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">Nueva Cotización</h1>
          <p style="margin:6px 0 0;color:#fff;opacity:.85;font-size:14px">Encofrados Vera — ${fechaHora}</p>
        </div>
        <div style="padding:32px">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            ${fila('Nombre', esc(nombre))}
            ${fila('RUT', esc(rut) || '—')}
            ${fila('Empresa', esc(empresa) || '—')}
            ${fila('Email', `<a href="mailto:${esc(email)}" style="color:#ee0117">${esc(email)}</a>`)}
            ${fila('Teléfono', esc(telefono) || '—')}
            ${fila('Sistema requerido', esc(equipo), true)}
            ${fila('Obra / Ubicación', esc(obra) || '—')}
            ${fila('m² aprox. de moldaje', esc(m2) || '—')}
            ${fila('Consentimiento', '✔ Aceptó la Política de Privacidad (Ley 21.719)<br><span style="color:#6b7280;font-size:12px">Registrado el ' + fechaHora + ' (hora de Santiago)</span>')}
            ${fila('Mensaje', esc(mensaje) || '—')}
          </table>
        </div>
        <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">Enviado desde encofradosvera.cl · ${fechaHora}</p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from:    'Encofrados Vera <cotizaciones@encofradosvera.cl>',
      to:      DESTINATARIOS,
      replyTo: email,
      subject: `Cotización: ${equipo} — ${nombre}${empresa ? ' / ' + empresa : ''}`,
      html:    htmlBody,
    });

    return res.json({ ok: true, message: '¡Cotización enviada! Te contactaremos pronto.' });

  } catch (err) {
    console.error('[Email error]', err.message);
    return res.status(500).json({
      ok: false,
      message: 'Error al enviar. Contáctanos al +56 9 7476 4806'
    });
  }
});

app.get('/privacidad', (req, res) => {
  res.render('privacidad', { year: new Date().getFullYear() });
});


// 404
app.use((req, res) => res.redirect('/'));

// ── START ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Encofrados Vera corriendo en http://localhost:${PORT}`);
});
