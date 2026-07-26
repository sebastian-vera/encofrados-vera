/* ═══════════════════════════════════════════════════════════
   ENCOFRADOS VERA — landing.js
═══════════════════════════════════════════════════════════ */

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
    if (e.isIntersecting) {
      e.target.classList.add('on');
      io.unobserve(e.target);
    }
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

// ── FORMULARIO DE COTIZACIÓN ───────────────────────────────
const btn = document.getElementById('submitBtn');

btn?.addEventListener('click', async () => {
  const el = id => document.getElementById(id);
  const campos = {
    nombre:   el('f-nombre'),
    empresa:  el('f-empresa'),
    email:    el('f-email'),
    telefono: el('f-tel'),
    equipo:   el('f-equipo'),
    obra:     el('f-obra'),
    m2:       el('f-m2'),
    mensaje:  el('f-msg'),
  };

  // Validación básica en cliente
  Object.values(campos).forEach(c => c?.classList.remove('err'));
  const obligatorios = ['nombre', 'email', 'equipo'];
  let falta = false;

  obligatorios.forEach(k => {
    if (!campos[k].value.trim()) { campos[k].classList.add('err'); falta = true; }
  });

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email.value.trim());
  if (!emailOk) { campos.email.classList.add('err'); falta = true; }

  if (falta) {
    const primero = document.querySelector('.err');
    primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    primero?.focus({ preventScroll: true });
    return;
  }

  // Token Turnstile (si está habilitado)
  const tokenInput = document.querySelector('[name="cf-turnstile-response"]');
  const token = tokenInput ? tokenInput.value : '';

  const payload = {
    nombre:   campos.nombre.value.trim(),
    empresa:  campos.empresa.value.trim(),
    email:    campos.email.value.trim(),
    telefono: campos.telefono.value.trim(),
    equipo:   campos.equipo.value,
    obra:     campos.obra.value.trim(),
    m2:       campos.m2.value.trim(),
    mensaje:  campos.mensaje.value.trim(),
    'cf-turnstile-response': token,
  };

  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const res  = await fetch('/cotizar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.ok) {
      Object.values(campos).forEach(c => { if (c) c.value = ''; });
      if (window.turnstile) { try { window.turnstile.reset(); } catch (e) {} }
      openModal();
      if (typeof gtag === 'function') {
        gtag('event', 'generate_lead', { event_category: 'cotizacion', event_label: payload.equipo });
      }
    } else {
      alert(data.message || 'No pudimos enviar tu solicitud. Intenta nuevamente.');
    }
  } catch (err) {
    alert('Error de conexión. Escríbenos a cristian.vera@encofradosvera.cl o al +56 9 7476 4806.');
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
});
