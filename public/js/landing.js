/* ═══════════════════════════════════════════════════════════
   ENCOFRADOS VERA — landing.js
═══════════════════════════════════════════════════════════ */

/* ⚠️ VERIFICA ESTO: ruta del backend que recibe la cotización.
   Debe coincidir con el app.post('...') de tu app.js.            */
const ENDPOINT = '/cotizar';

// ── NAV: menú móvil ────────────────────────────────────────
function tmenu() {
  const nl = document.getElementById('nl');
  const hb = document.querySelector('.hb');
  nl.classList.toggle('op');
  hb.classList.toggle('op');
}
document.querySelectorAll('#nl a').forEach(a => {
  a.addEventListener('click', () => {
    document.getElementById('nl').classList.remove('op');
    document.querySelector('.hb').classList.remove('op');
  });
});

// ── NAV: sombra al hacer scroll ────────────────────────────
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('sc', window.scrollY > 30);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ── REVEAL al hacer scroll ─────────────────────────────────
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('[data-r]').forEach(el => io.observe(el));

// ── MODAL ──────────────────────────────────────────────────
const modal = document.getElementById('mo');
function openModal()  { modal.classList.add('on'); }
function closeModal() { modal.classList.remove('on'); }
document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ══════════════════════════════════════════════════════════
//  CONSENTIMIENTO DE COOKIES  (Ley 21.719 · Consent Mode v2)
//  Analytics queda denegado por defecto (ver <head>) y solo se
//  concede si el usuario acepta en el banner.
// ══════════════════════════════════════════════════════════
const CK_KEY = 'ev_cookie_consent';

function ckUpdate(estado) {
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      analytics_storage: estado === 'granted' ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
  }
}
function ckHideBanner() { document.getElementById('ckbanner')?.classList.remove('on'); }
function ckShowBanner() { document.getElementById('ckbanner')?.classList.add('on'); }

function aceptarCookies() {
  try { localStorage.setItem(CK_KEY, 'granted'); } catch (e) {}
  ckUpdate('granted');
  ckHideBanner();
}
function rechazarCookies() {
  try { localStorage.setItem(CK_KEY, 'denied'); } catch (e) {}
  ckUpdate('denied');
  ckHideBanner();
}
function abrirCookies() { ckShowBanner(); }

(function initCookies() {
  let estado = null;
  try { estado = localStorage.getItem(CK_KEY); } catch (e) {}
  if (estado === 'granted') { ckUpdate('granted'); ckHideBanner(); }
  else if (estado === 'denied') { ckUpdate('denied'); ckHideBanner(); }
  else { ckShowBanner(); }   // sin decisión previa → mostrar banner
})();

// ══════════════════════════════════════════════════════════
//  VALIDACIONES
// ══════════════════════════════════════════════════════════
function validaEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
}
// Teléfono chileno: acepta +56, espacios y guiones. Exige 8–9 dígitos útiles.
function validaTelefono(v) {
  const d = (v || '').replace(/\D/g, '').replace(/^56/, '');
  return /^\d{8,9}$/.test(d);
}
// RUT chileno con dígito verificador (módulo 11)
function limpiaRut(v) { return (v || '').replace(/[^0-9kK]/g, '').toUpperCase(); }
function validaRut(v) {
  const c = limpiaRut(v);
  if (c.length < 2) return false;
  const cuerpo = c.slice(0, -1), dv = c.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  let suma = 0, mul = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (suma % 11);
  const dvEsp = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dv === dvEsp;
}
function formateaRut(v) {
  const c = limpiaRut(v);
  if (c.length < 2) return c;
  const cuerpo = c.slice(0, -1), dv = c.slice(-1);
  let out = '', cnt = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    out = cuerpo[i] + out; cnt++;
    if (cnt === 3 && i !== 0) { out = '.' + out; cnt = 0; }
  }
  return out + '-' + dv;
}

// Mensajes de error por campo
const MSG = {
  'f-nombre': 'Ingresa tu nombre.',
  'f-rut':    'RUT inválido. Revisa el dígito verificador.',
  'f-email':  'Email inválido. Ej: nombre@empresa.cl',
  'f-tel':    'Teléfono inválido. Ej: +56 9 1234 5678',
  'f-equipo': 'Selecciona el sistema que necesitas.',
};

function errSlot(id) { return document.getElementById('err-' + id.replace('f-', '')); }
function setErr(id, msg) {
  document.getElementById(id)?.classList.add('err');
  const slot = errSlot(id);
  if (slot) { slot.textContent = msg; slot.classList.add('on'); }
}
function clearErr(id) {
  document.getElementById(id)?.classList.remove('err');
  const slot = errSlot(id);
  if (slot) { slot.textContent = ''; slot.classList.remove('on'); }
}

// Valida un campo. exigirLleno=false => si está vacío no reclama (útil en blur).
function validaCampo(id, { exigirLleno = true } = {}) {
  const campo = document.getElementById(id);
  if (!campo) return true;
  const val = campo.value.trim();

  if (!val) {
    if (exigirLleno) { setErr(id, MSG[id] || 'Campo obligatorio.'); return false; }
    clearErr(id); return true;
  }
  let ok = true;
  if (id === 'f-rut')   ok = validaRut(val);
  if (id === 'f-email') ok = validaEmail(val);
  if (id === 'f-tel')   ok = validaTelefono(val);

  if (!ok) { setErr(id, MSG[id]); return false; }
  clearErr(id);
  return true;
}

// ── VALIDACIÓN EN TIEMPO REAL ──────────────────────────────
// Al salir del campo (blur): si tiene contenido y está mal, avisa al instante.
['f-rut', 'f-email', 'f-tel'].forEach(id => {
  const campo = document.getElementById(id);
  if (!campo) return;
  campo.addEventListener('blur', () => {
    if (id === 'f-rut' && campo.value.trim()) campo.value = formateaRut(campo.value);
    validaCampo(id, { exigirLleno: false });   // no reclama si está vacío
  });
  campo.addEventListener('input', () => clearErr(id)); // al reescribir, limpia
});
['f-nombre', 'f-equipo'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => clearErr(id));
});

// Consentimiento: limpia su error al marcarlo
const consent = document.getElementById('f-consent');
consent?.addEventListener('change', () => {
  if (consent.checked) {
    document.querySelector('.fconsent')?.classList.remove('err');
    const s = document.getElementById('err-consent');
    if (s) { s.textContent = ''; s.classList.remove('on'); }
  }
});

// ── ENVÍO DEL FORMULARIO ───────────────────────────────────
const btn = document.getElementById('submitBtn');

btn?.addEventListener('click', async () => {
  const el = id => document.getElementById(id);
  const resumen = el('form-error');
  const errores = [];

  if (!validaCampo('f-nombre')) errores.push('Falta tu nombre.');
  if (!validaCampo('f-rut'))
    errores.push(el('f-rut').value.trim() ? 'El RUT no es válido.' : 'Falta el RUT.');
  if (!validaCampo('f-email'))
    errores.push(el('f-email').value.trim() ? 'El email no es válido.' : 'Falta el email.');
  if (!validaCampo('f-tel'))
    errores.push(el('f-tel').value.trim() ? 'El teléfono no es válido.' : 'Falta el teléfono.');
  if (!validaCampo('f-equipo')) errores.push('Falta seleccionar el sistema.');

  // Consentimiento (Ley 21.719)
  if (!consent || !consent.checked) {
    document.querySelector('.fconsent')?.classList.add('err');
    const s = document.getElementById('err-consent');
    if (s) { s.textContent = 'Debes aceptar la Política de Privacidad para continuar.'; s.classList.add('on'); }
    errores.push('Debes aceptar la Política de Privacidad.');
  }

  if (errores.length) {
    if (resumen) {
      resumen.innerHTML = '<strong>Revisa estos campos:</strong><ul>' +
        errores.map(e => '<li>' + e + '</li>').join('') + '</ul>';
      resumen.classList.add('on');
    }
    const primero = document.querySelector('.cof .err');
    primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    primero?.focus?.({ preventScroll: true });
    return;
  }
  if (resumen) { resumen.classList.remove('on'); resumen.innerHTML = ''; }

  // Token Turnstile (si está habilitado)
  const tokenInput = document.querySelector('[name="cf-turnstile-response"]');
  const token = tokenInput ? tokenInput.value : '';

  const payload = {
    nombre:   el('f-nombre').value.trim(),
    rut:      formateaRut(el('f-rut').value),
    email:    el('f-email').value.trim(),
    telefono: el('f-tel').value.trim(),
    empresa:  el('f-empresa').value.trim(),
    equipo:   el('f-equipo').value.trim(),
    obra:     el('f-obra').value.trim(),
    m2:       el('f-m2').value.trim(),
    mensaje:  el('f-msg').value.trim(),
    consentimiento: true,
    'cf-turnstile-response': token,
  };

  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok !== false) {
      openModal();
      document.querySelectorAll('.cof input, .cof select, .cof textarea').forEach(c => {
        if (c.type === 'checkbox') c.checked = false; else c.value = '';
      });
      if (window.turnstile) { try { window.turnstile.reset(); } catch (e) {} }
    } else {
      alert(data.message || 'No pudimos enviar tu solicitud. Intenta nuevamente en unos minutos.');
    }
  } catch (err) {
    alert('Error de conexión. Escríbenos a cristian.vera@encofradosvera.cl o al +56 9 7476 4806.');
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
});
