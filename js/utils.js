// =============================================
// Car Dealer Admin — Shared Utilities
// =============================================

// Local dev by default — swap for your production API once deployed
// (same pattern as the clinic dashboard: one line to flip environments).
const API_BASE = 'https://autocars-production-7242.up.railway.app/api';
// const API_BASE = 'https://your-production-domain.com/api';

// ---- Auth helpers ----
// Storage is shared across the WHOLE site (admin panel + client site) since
// there is a single unified login for the 3 roles: admin, secretaire, user (client).
const Auth = {
  getToken:  () => localStorage.getItem('aw_token'),
  getUser:   () => JSON.parse(localStorage.getItem('aw_user') || 'null'),
  save: (token, user) => {
    localStorage.setItem('aw_token', token);
    localStorage.setItem('aw_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('aw_token');
    localStorage.removeItem('aw_user');
  },
  isLoggedIn: () => !!localStorage.getItem('aw_token'),

  // Where a given role belongs. Admin/secretaire → panneau d'administration.
  // user (client) → site public (racine du projet, il n'y a plus de
  // sous-dossier /client/).
  homeFor(role) {
    if (role === 'admin' || role === 'secretaire') return 'pages/dashboard.html';
    return 'index.html';
  },

  // Guards an admin-panel page. allowedRoles defaults to admin+secretaire
  // (pages/users.html overrides this to ['admin'] only).
  guardPage: (allowedRoles = ['admin', 'secretaire']) => {
    const isInPages = window.location.pathname.includes('/pages/');
    const loginPath = isInPages ? '../login.html' : 'login.html';
    if (!Auth.isLoggedIn()) { window.location.href = loginPath; return; }
    const user = Auth.getUser();
    if (!allowedRoles.includes(user?.role)) {
      // Connecté mais mauvais rôle pour cette page : renvoyer vers son propre espace.
      window.location.href = isInPages ? `../${Auth.homeFor(user?.role)}` : Auth.homeFor(user?.role);
    }
  },

  // Guards a public site page that requires an account (vehicules.html,
  // vehicule-detail.html, favoris.html, profile.html, a-propos.html…).
  // Only index.html (l'accueil) reste accessible sans connexion — toutes les
  // autres pages du site redirigent vers login.html si le visiteur n'est
  // pas connecté, avec un retour automatique une fois connecté.
  // Any logged-in role can stay (an admin previewing the site is harmless).
  guardClientPage: () => {
    if (!Auth.isLoggedIn()) {
      const ret = encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
      window.location.href = `login.html?redirect=${ret}`;
    }
  },

  redirectIfLoggedIn: () => {
    if (Auth.isLoggedIn()) {
      const user = Auth.getUser();
      const isInPages = window.location.pathname.includes('/pages/');
      const target = Auth.homeFor(user?.role);
      window.location.href = isInPages ? `../${target}` : target;
    }
  },
};


// Shared by api() and apiForm(): figures out the right relative path to
// login.html depending on whether we're in /pages/ (admin) or the root
// (site public — plus de sous-dossier /client/).
function aw401RedirectPath() {
  const p = window.location.pathname;
  if (p.includes('/pages/')) return '../login.html';
  return 'login.html';
}

// ---- API call helper ----
async function api(method, endpoint, data = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  const token = Auth.getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (data)  opts.body = JSON.stringify(data);

  const res = await fetch(API_BASE + endpoint, opts);
  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    Auth.clear();
    window.location.href = aw401RedirectPath();
    return;
  }
  if (!res.ok) {
    const msg = json.message || json.errors
      ? (typeof json.errors === 'object' ? Object.values(json.errors).flat().join(', ') : json.message)
      : 'Erreur serveur';
    throw new Error(msg);
  }
  return json;
}

// ---- Multipart API call helper (car create/update with images) ----
async function apiForm(method, endpoint, formData) {
  const opts = {
    method: 'POST', // Laravel needs POST + _method override for PUT with files
    headers: {
      'Accept': 'application/json',
    },
    body: formData,
  };
  if (method !== 'POST') formData.append('_method', method);
  const token = Auth.getToken();
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + endpoint, opts);
  const json = await res.json().catch(() => ({}));

  if (res.status === 401) {
    Auth.clear();
    window.location.href = aw401RedirectPath();
    return;
  }
  if (!res.ok) {
    const msg = json.message || json.errors
      ? (typeof json.errors === 'object' ? Object.values(json.errors).flat().join(', ') : json.message)
      : 'Erreur serveur';
    throw new Error(msg);
  }
  return json;
}

// ---- Toast notifications ----
function showToast(msg, type = 'default') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  t.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ---- Badge helpers ----
function carStatusBadge(status) {
  const map = {
    pending:  ['badge-yellow', 'carstatus.pending'],
    approved: ['badge-green',  'carstatus.approved'],
    rejected: ['badge-red',    'carstatus.rejected'],
    sold:     ['badge-gray',   'carstatus.sold'],
    expired:  ['badge-red',    'carstatus.expired'],
  };
  const [cls, key] = map[status] || ['badge-gray', null];
  return `<span class="badge ${cls}">${key ? t(key) : status}</span>`;
}

function requestStatusBadge(status) {
  const map = {
    pending:   ['badge-yellow', 'status.pending'],
    contacted: ['badge-blue',   'status.contacted'],
    confirmed: ['badge-green',  'status.confirmed'],
    cancelled: ['badge-red',    'status.cancelled'],
  };
  const [cls, key] = map[status] || ['badge-gray', null];
  return `<span class="badge ${cls}">${key ? t(key) : status}</span>`;
}

function reportStatusBadge(status) {
  const map = {
    pending:  ['badge-yellow', 'status.pending'],
    resolved: ['badge-green',  'report.resolved'],
  };
  const [cls, key] = map[status] || ['badge-gray', null];
  return `<span class="badge ${cls}">${key ? t(key) : status}</span>`;
}

function userStatusBadge(isVerified) {
  return isVerified
    ? `<span class="badge badge-green">${t('user.active')}</span>`
    : `<span class="badge badge-red">${t('user.banned')}</span>`;
}

// ---- Formatting ----
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-DZ', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtPrice(p) {
  if (p == null) return '—';
  return Number(p).toLocaleString('fr-DZ') + ' DA';
}

const FUEL_LABELS = { essence:'Essence', diesel:'Diesel', hybride:'Hybride', electrique:'Électrique', gpl:'GPL' };
const TRANSMISSION_LABELS = { manuelle:'Manuelle', automatique:'Automatique' };
const CONDITION_LABELS = { neuve:'Neuve', occasion:'Occasion', accidentee:'Accidentée' };

// ---- Populate sidebar user info ----
function renderSidebarUser() {
  const user = Auth.getUser();
  if (!user) return;
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const el = document.getElementById('sidebarUser');
  if (el) {
    el.querySelector('.user-avatar').textContent = initials;
    el.querySelector('.user-name').textContent = user.name;
    el.querySelector('.user-role').textContent = user.role;
  }
}

// ---- Logout ----
async function logout() {
  try { await api('POST', '/logout'); } catch (_) {}
  Auth.clear();
  window.location.href = aw401RedirectPath();
}

// ---- Modal helpers ----
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
