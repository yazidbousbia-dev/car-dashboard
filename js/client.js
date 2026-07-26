// =============================================
// AutoWeex — Site Client (partie publique)
// Réutilise API_BASE / api() / Auth / FUEL_LABELS / etc.
// définis dans js/utils.js (même base de code que
// le panneau admin, chargé avant ce fichier).
// =============================================

// Le site public est désormais entièrement à la racine du projet
// (plus de sous-dossier /client/), donc plus besoin de préfixe de chemin.

// ---- Toasts ----
function awToast(msg, type = 'default') {
  let wrap = document.querySelector('.aw-toast-wrap');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'aw-toast-wrap'; document.body.appendChild(wrap); }
  const t = document.createElement('div');
  t.className = `aw-toast ${type}`;
  const icon = type === 'success' ? 'ti-circle-check' : type === 'error' ? 'ti-alert-circle' : 'ti-info-circle';
  t.innerHTML = `<i class="ti ${icon}"></i><span>${msg}</span>`;
  wrap.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3200);
}

function awLoginRedirectUrl() {
  const here = window.location.pathname.split('/').pop() + window.location.search;
  return `login.html?redirect=${encodeURIComponent(here)}`;
}

// =============================================
// Voitures — toujours depuis l'API (aucune donnée statique)
// =============================================
let AW_CARS_CACHE = null;

async function awFetchCars(force = false) {
  if (AW_CARS_CACHE && !force) return AW_CARS_CACHE;
  // Route publique du backend Laravel : ne renvoie que les annonces approuvées.
  const json = await api('GET', '/public/cars');
  const list = Array.isArray(json) ? json : (json.data || json.cars || []);
  AW_CARS_CACHE = list.map(normalizeCar);
  return AW_CARS_CACHE;
}

async function awFetchCar(id) {
  const c = await api('GET', `/public/cars/${id}`);
  return normalizeCar(c.car || c);
}

function normalizeCar(c) {
  const images = (c.images && c.images.length) ? c.images.map(im => im.image_url || im) : null;
  return {
    id: c.id,
    brand: c.brand?.name || 'Véhicule',
    model: c.model || '',
    year: c.year,
    price: c.price,
    mileage: c.mileage,
    fuel_type: c.fuel_type,
    transmission: c.transmission,
    condition: c.condition,
    color: c.color,
    wilaya: c.wilaya,
    city: c.city,
    doors: c.doors,
    description: c.description || '',
    featured: !!c.is_featured,
    image: c.primary_image?.image_url || (images ? images[0] : null),
    images,
    glyph: 'ti-car',
  };
}

function awCarsGridError(container, err, retryFn) {
  container.innerHTML = `
    <div class="aw-empty" style="grid-column:1/-1">
      <i class="ti ti-plug-connected-x"></i>
      <h3>Impossible de charger les véhicules</h3>
      <p>${err?.message || "Vérifiez la connexion au serveur et réessayez."}</p>
      <br><button class="aw-btn aw-btn-outline" id="awRetryBtn"><i class="ti ti-refresh"></i> Réessayer</button>
    </div>`;
  document.getElementById('awRetryBtn')?.addEventListener('click', retryFn);
}

// =============================================
// Favoris — synchronisés au compte (nécessite d'être connecté)
// =============================================
let AW_FAVORITES_CACHE = null; // tableau de voitures (normalizeCar) favorites de l'utilisateur connecté
let AW_FAV_IDS = null;         // Set d'ids, dérivé du cache ci-dessus

async function awLoadFavorites(force = false) {
  if (!Auth.isLoggedIn()) { AW_FAVORITES_CACHE = []; AW_FAV_IDS = new Set(); return AW_FAVORITES_CACHE; }
  if (AW_FAVORITES_CACHE && !force) return AW_FAVORITES_CACHE;
  try {
    const json = await api('GET', '/favorites');
    const list = Array.isArray(json) ? json : (json.data || json.favorites || []);
    AW_FAVORITES_CACHE = list.map(f => normalizeCar(f.car || f));
  } catch (_) {
    AW_FAVORITES_CACHE = [];
  }
  AW_FAV_IDS = new Set(AW_FAVORITES_CACHE.map(c => c.id));
  return AW_FAVORITES_CACHE;
}

async function awLoadFavoriteIds(force = false) {
  await awLoadFavorites(force);
  return AW_FAV_IDS;
}

function awIsFav(carId) {
  return !!(AW_FAV_IDS && AW_FAV_IDS.has(Number(carId)));
}

async function awToggleFavorite(carId) {
  if (!Auth.isLoggedIn()) {
    awToast('Connectez-vous pour ajouter ce véhicule à vos favoris.', 'default');
    setTimeout(() => window.location.href = awLoginRedirectUrl(), 900);
    return null;
  }
  const id = Number(carId);
  const wasFav = awIsFav(id);
  try {
    const res = await api('POST', `/favorites/${id}/toggle`);
    const nowFav = res?.favorited ?? !wasFav;
    if (!nowFav) {
      AW_FAV_IDS.delete(id);
      AW_FAVORITES_CACHE = (AW_FAVORITES_CACHE || []).filter(c => c.id !== id);
    } else {
      AW_FAV_IDS.add(id);
      const known = (AW_CARS_CACHE || []).find(c => c.id === id);
      if (known) AW_FAVORITES_CACHE = [...(AW_FAVORITES_CACHE || []), known];
    }
    updateFavCountBadge();
    return nowFav;
  } catch (e) {
    awToast(e.message || "Impossible de mettre à jour vos favoris.", 'error');
    return null;
  }
}

function updateFavCountBadge() {
  document.querySelectorAll('[data-fav-count]').forEach(el => {
    const n = AW_FAV_IDS ? AW_FAV_IDS.size : 0;
    el.textContent = n;
    el.style.display = n > 0 ? 'flex' : 'none';
  });
}

// ---- Rendu d'une carte voiture ----
function awCarCard(car) {
  const isFav = awIsFav(car.id);
  const badge = car.condition === 'neuve'
    ? '<span class="aw-card-badge aw-badge-neuve">Neuve</span>'
    : car.featured ? '<span class="aw-card-badge aw-badge-vedette">Coup de cœur</span>'
    : '<span class="aw-card-badge aw-badge-occasion">Occasion</span>';
  const media = car.image
    ? `<img src="${car.image}" alt="${car.brand} ${car.model}">`
    : `<i class="ti ${car.glyph || 'ti-car'} aw-car-glyph"></i>`;
  return `
    <div class="aw-card aw-reveal">
      <div class="aw-card-media" style="cursor:pointer" onclick="if(!event.target.closest('.aw-fav-heart')) window.location.href='vehicule-detail.html?id=${car.id}'">
        ${media}
        ${badge}
        <button class="aw-fav-heart ${isFav ? 'active' : ''}" data-fav-toggle="${car.id}" aria-label="Ajouter aux favoris">
          <i class="ti ${isFav ? 'ti-heart-filled' : 'ti-heart'}"></i>
        </button>
      </div>
      <div class="aw-card-body">
        <div class="aw-card-title">${car.brand} ${car.model}</div>
        <div class="aw-card-meta">
          <span><i class="ti ti-calendar"></i>${car.year ?? '—'}</span>
          <span><i class="ti ti-gauge"></i>${car.mileage != null ? Number(car.mileage).toLocaleString('fr-DZ') + ' km' : '—'}</span>
          <span><i class="ti ti-manual-gearbox"></i>${(typeof TRANSMISSION_LABELS !== 'undefined' && TRANSMISSION_LABELS[car.transmission]) || car.transmission || '—'}</span>
        </div>
        <div class="aw-card-foot">
          <div class="aw-card-price">${Number(car.price || 0).toLocaleString('fr-DZ')} DA<small>${(typeof FUEL_LABELS !== 'undefined' && FUEL_LABELS[car.fuel_type]) || car.fuel_type || ''}</small></div>
          <a href="vehicule-detail.html?id=${car.id}" class="aw-card-link">${t('common.details')} <i class="ti ti-arrow-right"></i></a>
        </div>
      </div>
    </div>`;
}

// Délégation d'événement pour le bouton "favori" (fonctionne pour toute carte injectée dynamiquement)
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-fav-toggle]');
  if (!btn) return;
  btn.disabled = true;
  const nowFav = await awToggleFavorite(btn.dataset.favToggle);
  btn.disabled = false;
  if (nowFav === null) return; // pas connecté, ou erreur déjà signalée
  btn.classList.toggle('active', nowFav);
  btn.querySelector('i').className = `ti ${nowFav ? 'ti-heart-filled' : 'ti-heart'}`;
  awToast(nowFav ? 'Ajouté à vos favoris' : 'Retiré des favoris', nowFav ? 'success' : 'default');
  if (window.location.pathname.includes('favoris.html') && !nowFav) {
    const card = btn.closest('.aw-card');
    card?.remove();
    const grid = document.getElementById('favGrid');
    if (grid && grid.children.length === 0) {
      grid.outerHTML = `<div class="aw-empty"><i class="ti ti-heart-off"></i><h3>Aucun favori pour l'instant</h3><p>Parcourez nos véhicules et cliquez sur le cœur pour les enregistrer ici.</p><br><a href="vehicules.html" class="aw-btn aw-btn-gold">Voir les véhicules</a></div>`;
    }
  }
});

// =============================================
// Demandes d'achat
// =============================================
async function awSubmitPurchaseRequest(carId, { phone, message } = {}) {
  if (!Auth.isLoggedIn()) {
    awToast("Connectez-vous pour envoyer une demande d'achat.", 'default');
    setTimeout(() => window.location.href = awLoginRedirectUrl(), 900);
    return false;
  }
  try {
    await api('POST', `/cars/${Number(carId)}/request`, { phone: phone || null, message: message || null });
    awToast('Demande envoyée — notre équipe vous contactera rapidement.', 'success');
    return true;
  } catch (e) {
    awToast(e.message || "Impossible d'envoyer la demande.", 'error');
    return false;
  }
}

// =============================================
// Navbar : injection + compte + menu mobile
// =============================================
function awRenderNav(active) {
  const el = document.getElementById('awNav');
  if (!el) return;
  const links = [
    ['index.html', t('nav.home')],
    ['vehicules.html', t('nav.cars')],
    ['a-propos.html', t('nav.about')],
    ['favoris.html', t('nav.favorites')],
  ];
  const linkHtml = () => links.map(([href, label]) =>
    `<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`
  ).join('');

  const user = Auth.getUser();
  const loggedIn = Auth.isLoggedIn();
  const accountHtml = loggedIn
    ? `<a href="profile.html" class="aw-icon-btn" aria-label="${t('nav.account')}" title="${user?.name || t('nav.account')}"><i class="ti ti-user-circle"></i></a>`
    : `<a href="login.html" class="aw-icon-btn" aria-label="${t('nav.login')}"><i class="ti ti-login"></i></a>`;
  const dashboardLink = (user?.role === 'admin' || user?.role === 'secretaire')
    ? `<a href="pages/dashboard.html" class="aw-btn aw-btn-outline" style="padding:9px 16px">${t('nav.dashboard')}</a>`
    : '';

  el.innerHTML = `
    <div class="aw-container aw-nav-inner">
      <a href="index.html" class="aw-logo">
        <span class="aw-logo-mark"><i class="ti ti-steering-wheel"></i></span>
        <span class="aw-logo-text">Auto<b>Weex</b></span>
      </a>
      <nav class="aw-nav-links">${linkHtml()}</nav>
      <div class="aw-nav-actions">
        <a href="favoris.html" class="aw-icon-btn" aria-label="Favoris">
          <i class="ti ti-heart"></i>
          <span class="aw-fav-count" data-fav-count style="display:none">0</span>
        </a>
        ${accountHtml}
        ${dashboardLink}
        <a href="a-propos.html#contact" class="aw-btn aw-btn-gold" style="padding:9px 18px">${t('nav.contact')}</a>
        ${langSwitcherHTML()}
        ${themeToggleHTML()}
        <button class="aw-menu-btn" id="awMenuBtn" aria-label="Menu"><i class="ti ti-menu-2"></i></button>
      </div>
    </div>
    <div class="aw-mobile-drawer" id="awDrawer">
      <div class="aw-mobile-panel">
        <button class="aw-mobile-close" id="awDrawerClose"><i class="ti ti-x"></i></button>
        ${linkHtml()}
        <a href="a-propos.html#contact">${t('nav.contact')}</a>
        ${loggedIn
          ? `<a href="profile.html">${t('nav.account')}</a><a href="#" onclick="logout();return false;">${t('nav.logout')}</a>`
          : `<a href="login.html">${t('nav.login')}</a><a href="register.html">${t('nav.register')}</a>`}
        ${dashboardLink ? `<a href="pages/dashboard.html">${t('nav.dashboard')}</a>` : ''}
        ${langSwitcherHTML('aw-lang-switch-mobile')}
        <div style="margin-top:10px">${themeToggleHTML()}</div>
      </div>
    </div>`;

  window.addEventListener('scroll', () => el.classList.toggle('scrolled', window.scrollY > 30), { passive: true });
  let awScrollY = 0;
  function awLockScroll() {
    awScrollY = window.scrollY;
    document.body.style.top = `-${awScrollY}px`;
    document.body.classList.add('aw-no-scroll');
  }
  function awUnlockScroll() {
    document.body.classList.remove('aw-no-scroll');
    document.body.style.top = '';
    window.scrollTo(0, awScrollY);
  }
  document.getElementById('awMenuBtn')?.addEventListener('click', () => {
    document.getElementById('awDrawer').classList.add('open');
    awLockScroll();
  });
  document.getElementById('awDrawerClose')?.addEventListener('click', () => {
    document.getElementById('awDrawer').classList.remove('open');
    awUnlockScroll();
  });
  document.getElementById('awDrawer')?.addEventListener('click', (e) => {
    if (e.target.id === 'awDrawer') {
      e.target.classList.remove('open');
      awUnlockScroll();
    }
  });

  awLoadFavoriteIds().then(updateFavCountBadge);
}

// ---- Footer ----
function awRenderFooter() {
  const el = document.getElementById('awFooter');
  if (!el) return;
  const y = new Date().getFullYear();
  el.innerHTML = `
    <div class="aw-container">
      <div class="aw-footer-grid">
        <div>
          <a href="index.html" class="aw-logo"><span class="aw-logo-mark"><i class="ti ti-steering-wheel"></i></span><span class="aw-logo-text">Auto<b>Weex</b></span></a>
          <p class="desc">Concessionnaire automobile de confiance. Véhicules neufs et d'occasion sélectionnés, inspectés et garantis, pour rouler l'esprit tranquille.</p>
          <div class="aw-social">
            <a href="#" class="aw-icon-btn" aria-label="Facebook"><i class="ti ti-brand-facebook"></i></a>
            <a href="#" class="aw-icon-btn" aria-label="Instagram"><i class="ti ti-brand-instagram"></i></a>
            <a href="#" class="aw-icon-btn" aria-label="WhatsApp"><i class="ti ti-brand-whatsapp"></i></a>
          </div>
        </div>
        <div>
          <h5>Navigation</h5>
          <ul>
            <li><a href="index.html">${t('nav.home')}</a></li>
            <li><a href="vehicules.html">${t('nav.cars')}</a></li>
            <li><a href="a-propos.html">${t('nav.about')}</a></li>
            <li><a href="favoris.html">${t('nav.favorites')}</a></li>
          </ul>
        </div>
        <div>
          <h5>${t('nav.account')}</h5>
          <ul>
            ${Auth.isLoggedIn()
              ? `<li><a href="profile.html">${t('nav.account')}</a></li><li><a href="#" onclick="logout();return false;">${t('nav.logout')}</a></li>`
              : `<li><a href="login.html">${t('nav.login')}</a></li><li><a href="register.html">${t('nav.register')}</a></li>`}
          </ul>
        </div>
        <div>
          <h5>Contact</h5>
          <ul>
            <li><a href="tel:+213555000000"><i class="ti ti-phone" style="margin-inline-end:6px;color:var(--or)"></i>+213 555 00 00 00</a></li>
            <li><a href="mailto:contact@autoweex.dz"><i class="ti ti-mail" style="margin-inline-end:6px;color:var(--or)"></i>contact@autoweex.dz</a></li>
            <li><span style="font-size:13px;color:var(--texte-sub)"><i class="ti ti-map-pin" style="margin-inline-end:6px;color:var(--or)"></i>Route Nationale, Taher, Jijel</span></li>
          </ul>
        </div>
      </div>
      <div class="aw-footer-bottom">
        <span>© ${y} AutoWeex. Tous droits réservés.</span>
        <span><a href="login.html">Accès professionnel</a></span>
      </div>
    </div>`;
}

// ---- Reveal on scroll ----
function awInitReveal() {
  const items = document.querySelectorAll('.aw-reveal');
  if (!('IntersectionObserver' in window)) { items.forEach(i => i.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
  }, { threshold: .12 });
  items.forEach(i => io.observe(i));
}
function awObserveNew(container) {
  if (!('IntersectionObserver' in window)) { container.querySelectorAll('.aw-reveal').forEach(i => i.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); } });
  }, { threshold: .1 });
  container.querySelectorAll('.aw-reveal').forEach(i => io.observe(i));
}

// ---- Formulaire de contact / message ----
function awInitContactForm() {
  const form = document.getElementById('awContactForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader-2"></i> Envoi en cours…';
    try {
      await api('POST', '/messages', {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        subject: form.subject.value,
        message: form.message.value.trim(),
      });
      awToast('Message envoyé — nous vous répondrons rapidement.', 'success');
      form.reset();
    } catch (err) {
      awToast(err.message || "Impossible d'envoyer le message. Appelez-nous directement au +213 555 00 00 00.", 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}

// ---- Avis clients (démo statique volontairement conservée : pas de module "avis" côté API pour l'instant) ----
const AW_TESTIMONIALS = [
  { name: 'Sofiane B.', role: 'Propriétaire — BMW X5', rating: 5, msg: "Achat sans stress, la voiture correspondait exactement à l'annonce. L'équipe a été transparente du début à la fin." },
  { name: 'Amina K.', role: 'Propriétaire — Golf GTI', rating: 5, msg: "Très bon accueil et un vrai suivi après-vente. Je recommande AutoWeex à tous mes proches." },
  { name: 'Youssef T.', role: 'Propriétaire — Range Rover Evoque', rating: 4, msg: "Large choix de véhicules et un processus d'achat rapide. Le financement a été bien expliqué." },
];
function awRenderTestimonials() {
  const el = document.getElementById('awTestimonials');
  if (!el) return;
  el.innerHTML = AW_TESTIMONIALS.map(t => `
    <div class="aw-testi aw-reveal">
      <div class="quote-mark">"</div>
      <div class="stars">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
      <p class="msg">${t.msg}</p>
      <div class="aw-testi-author">
        <div class="aw-testi-avatar">${t.name.split(' ').map(w => w[0]).join('').slice(0,2)}</div>
        <div><b>${t.name}</b><span>${t.role}</span></div>
      </div>
    </div>`).join('');
}

// ---- Badge de statut pour "Mes demandes" (équivalent thème client de requestStatusBadge()) ----
function awReqStatusBadge(status) {
  const map = {
    pending:   { key: 'status.pending',   icon: 'ti-clock' },
    contacted: { key: 'status.contacted', icon: 'ti-phone' },
    confirmed: { key: 'status.confirmed', icon: 'ti-circle-check' },
    cancelled: { key: 'status.cancelled', icon: 'ti-circle-x' },
  };
  const s = map[status] || { key: null, icon: 'ti-info-circle' };
  return `<span class="aw-status aw-status-${status}"><i class="ti ${s.icon}"></i> ${s.key ? t(s.key) : status}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
  awRenderFooter();
  awInitContactForm();
  awRenderTestimonials();
});
