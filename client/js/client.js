// =============================================
// AutoWeex — Site Client (partie publique)
// Réutilise API_BASE / api() / FUEL_LABELS / etc.
// définis dans ../js/utils.js (même base de code
// que le panneau admin, chargé avant ce fichier).
// =============================================

const AW_BASE = window.location.pathname.includes('/client/') ? '' : 'client/';

// ---- Favoris (stockés côté navigateur — pas de compte client requis) ----
const AwFav = {
  KEY: 'autoweex_favorites',
  all() { try { return JSON.parse(localStorage.getItem(this.KEY) || '{}'); } catch { return {}; } },
  isFav(id) { return !!this.all()[id]; },
  toggle(car) {
    const map = this.all();
    if (map[car.id]) delete map[car.id];
    else map[car.id] = { id: car.id, brand: car.brand, model: car.model, year: car.year, price: car.price, image: car.image };
    localStorage.setItem(this.KEY, JSON.stringify(map));
    AwFav.updateCount();
    return !!map[car.id];
  },
  count() { return Object.keys(this.all()).length; },
  updateCount() {
    document.querySelectorAll('[data-fav-count]').forEach(el => {
      const n = AwFav.count();
      el.textContent = n;
      el.style.display = n > 0 ? 'flex' : 'none';
    });
  },
};

// ---- Toasts (mêmes conventions visuelles que showToast() de l'admin) ----
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

// ---- Données de démonstration ----
// Utilisées uniquement si l'API (${API_BASE}/cars) n'est pas joignable —
// utile pour prévisualiser le design avant que le backend Laravel ne
// soit démarré/déployé. Dès que l'API répond, ces données ne sont plus utilisées.
const AW_DEMO_CARS = [
  { id: 1, brand: 'Mercedes-Benz', model: 'Classe C 220d', year: 2023, price: 6800000, mileage: 12000, fuel_type: 'diesel', transmission: 'automatique', condition: 'occasion', featured: true, glyph: 'ti-car' },
  { id: 2, brand: 'BMW', model: 'X5 xDrive40i', year: 2022, price: 9200000, mileage: 24000, fuel_type: 'essence', transmission: 'automatique', condition: 'occasion', featured: true, glyph: 'ti-car-suv' },
  { id: 3, brand: 'Range Rover', model: 'Evoque Dynamic', year: 2024, price: 11500000, mileage: 3000, fuel_type: 'diesel', transmission: 'automatique', condition: 'neuve', featured: true, glyph: 'ti-car-suv' },
  { id: 4, brand: 'Audi', model: 'A6 45 TFSI', year: 2021, price: 5600000, mileage: 41000, fuel_type: 'essence', transmission: 'automatique', condition: 'occasion', featured: false, glyph: 'ti-car' },
  { id: 5, brand: 'Volkswagen', model: 'Golf 8 GTI', year: 2023, price: 4300000, mileage: 8000, fuel_type: 'essence', transmission: 'manuelle', condition: 'occasion', featured: false, glyph: 'ti-car' },
  { id: 6, brand: 'Peugeot', model: '3008 GT Line', year: 2024, price: 4950000, mileage: 1500, fuel_type: 'diesel', transmission: 'automatique', condition: 'neuve', featured: false, glyph: 'ti-car-suv' },
];

let AW_CARS_CACHE = null;

async function awFetchCars() {
  if (AW_CARS_CACHE) return AW_CARS_CACHE;
  try {
    // Adaptez ce endpoint à votre route publique réelle si elle diffère
    // (ex: /public/cars). Doit renvoyer les annonces avec statut "approved".
    const res = await fetch(API_BASE + '/cars');
    if (!res.ok) throw new Error('offline');
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.data || json.cars || []);
    if (!list.length) throw new Error('empty');
    AW_CARS_CACHE = list.map(normalizeCar);
  } catch (_) {
    AW_CARS_CACHE = AW_DEMO_CARS.map(normalizeCar);
  }
  return AW_CARS_CACHE;
}

function normalizeCar(c) {
  return {
    id: c.id,
    brand: c.brand?.name || c.brand_name || c.brand || 'Véhicule',
    model: c.model || c.title || '',
    year: c.year || c.model_year || '—',
    price: c.price ?? c.amount ?? 0,
    mileage: c.mileage ?? c.km ?? null,
    fuel_type: c.fuel_type || c.fuel || 'essence',
    transmission: c.transmission || 'manuelle',
    condition: c.condition || 'occasion',
    featured: !!(c.is_featured ?? c.featured),
    description: c.description || '',
    image: c.images?.[0]?.url || c.images?.[0]?.path || c.image || null,
    images: c.images && c.images.length ? c.images.map(im => im.url || im.path || im) : null,
    glyph: c.glyph || 'ti-car',
  };
}

// ---- Rendu d'une carte voiture ----
function awCarCard(car) {
  const isFav = AwFav.isFav(car.id);
  const badge = car.condition === 'neuve'
    ? '<span class="aw-card-badge aw-badge-neuve">Neuve</span>'
    : car.featured ? '<span class="aw-card-badge aw-badge-vedette">Coup de cœur</span>'
    : '<span class="aw-card-badge aw-badge-occasion">Occasion</span>';
  const media = car.image
    ? `<img src="${car.image}" alt="${car.brand} ${car.model}">`
    : `<i class="ti ${car.glyph || 'ti-car'} aw-car-glyph"></i>`;
  return `
    <div class="aw-card aw-reveal">
      <div class="aw-card-media">
        ${media}
        ${badge}
        <button class="aw-fav-heart ${isFav ? 'active' : ''}" data-fav-toggle="${car.id}" aria-label="Ajouter aux favoris">
          <i class="ti ${isFav ? 'ti-heart-filled' : 'ti-heart'}"></i>
        </button>
      </div>
      <div class="aw-card-body">
        <div class="aw-card-title">${car.brand} ${car.model}</div>
        <div class="aw-card-meta">
          <span><i class="ti ti-calendar"></i>${car.year}</span>
          <span><i class="ti ti-gauge"></i>${car.mileage != null ? Number(car.mileage).toLocaleString('fr-DZ') + ' km' : '—'}</span>
          <span><i class="ti ti-manual-gearbox"></i>${(typeof TRANSMISSION_LABELS !== 'undefined' && TRANSMISSION_LABELS[car.transmission]) || car.transmission}</span>
        </div>
        <div class="aw-card-foot">
          <div class="aw-card-price">${Number(car.price).toLocaleString('fr-DZ')} DA<small>${(typeof FUEL_LABELS !== 'undefined' && FUEL_LABELS[car.fuel_type]) || car.fuel_type}</small></div>
          <a href="${AW_BASE}vehicule-detail.html?id=${car.id}" class="aw-card-link">Détails <i class="ti ti-arrow-right"></i></a>
        </div>
      </div>
    </div>`;
}

// Délégation d'événement pour le bouton "favori" (fonctionne pour toute carte injectée dynamiquement)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fav-toggle]');
  if (!btn) return;
  const id = btn.dataset.favToggle;
  awFetchCars().then(cars => {
    const car = cars.find(c => String(c.id) === String(id));
    if (!car) return;
    const nowFav = AwFav.toggle(car);
    btn.classList.toggle('active', nowFav);
    btn.querySelector('i').className = `ti ${nowFav ? 'ti-heart-filled' : 'ti-heart'}`;
    awToast(nowFav ? 'Ajouté à vos favoris' : 'Retiré des favoris', nowFav ? 'success' : 'default');
    if (window.location.pathname.includes('favoris.html') && !nowFav) {
      btn.closest('.aw-card')?.remove();
      renderFavEmptyStateIfNeeded();
    }
  });
});

function renderFavEmptyStateIfNeeded() {
  const grid = document.getElementById('favGrid');
  if (grid && grid.children.length === 0) {
    grid.outerHTML = `<div class="aw-empty"><i class="ti ti-heart-off"></i><h3>Aucun favori pour l'instant</h3><p>Parcourez nos véhicules et cliquez sur le cœur pour les enregistrer ici.</p><br><a href="vehicules.html" class="aw-btn aw-btn-gold">Voir les véhicules</a></div>`;
  }
}

// ---- Navbar : injection + état "scrolled" + menu mobile ----
function awRenderNav(active) {
  const el = document.getElementById('awNav');
  if (!el) return;
  const links = [
    ['index.html', 'Accueil'],
    ['vehicules.html', 'Véhicules'],
    ['a-propos.html', 'À propos'],
    ['favoris.html', 'Favoris'],
  ];
  const linkHtml = (mobile) => links.map(([href, label]) =>
    `<a href="${AW_BASE}${href}" class="${active === href ? 'active' : ''}">${label}</a>`
  ).join('');

  el.innerHTML = `
    <div class="aw-container aw-nav-inner">
      <a href="${AW_BASE}index.html" class="aw-logo">
        <span class="aw-logo-mark"><i class="ti ti-steering-wheel"></i></span>
        <span class="aw-logo-text">Auto<b>Weex</b></span>
      </a>
      <nav class="aw-nav-links">${linkHtml(false)}</nav>
      <div class="aw-nav-actions">
        <a href="${AW_BASE}favoris.html" class="aw-icon-btn" aria-label="Favoris">
          <i class="ti ti-heart"></i>
          <span class="aw-fav-count" data-fav-count style="display:none">0</span>
        </a>
        <a href="${AW_BASE}a-propos.html#contact" class="aw-btn aw-btn-gold" style="padding:9px 18px">Nous contacter</a>
        <button class="aw-menu-btn" id="awMenuBtn" aria-label="Menu"><i class="ti ti-menu-2"></i></button>
      </div>
    </div>
    <div class="aw-mobile-drawer" id="awDrawer">
      <div class="aw-mobile-panel">
        <button class="aw-mobile-close" id="awDrawerClose"><i class="ti ti-x"></i></button>
        ${linkHtml(true)}
        <a href="${AW_BASE}a-propos.html#contact">Nous contacter</a>
        <a href="../login.html" style="color:var(--texte-muted);font-size:13px;margin-top:16px">Accès professionnel</a>
      </div>
    </div>`;

  window.addEventListener('scroll', () => el.classList.toggle('scrolled', window.scrollY > 30), { passive: true });
  document.getElementById('awMenuBtn')?.addEventListener('click', () => document.getElementById('awDrawer').classList.add('open'));
  document.getElementById('awDrawerClose')?.addEventListener('click', () => document.getElementById('awDrawer').classList.remove('open'));
  document.getElementById('awDrawer')?.addEventListener('click', (e) => { if (e.target.id === 'awDrawer') e.target.classList.remove('open'); });
  AwFav.updateCount();
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
          <a href="${AW_BASE}index.html" class="aw-logo"><span class="aw-logo-mark"><i class="ti ti-steering-wheel"></i></span><span class="aw-logo-text">Auto<b>Weex</b></span></a>
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
            <li><a href="${AW_BASE}index.html">Accueil</a></li>
            <li><a href="${AW_BASE}vehicules.html">Véhicules</a></li>
            <li><a href="${AW_BASE}a-propos.html">À propos</a></li>
            <li><a href="${AW_BASE}favoris.html">Favoris</a></li>
          </ul>
        </div>
        <div>
          <h5>Véhicules</h5>
          <ul>
            <li><a href="${AW_BASE}vehicules.html?condition=neuve">Neuves</a></li>
            <li><a href="${AW_BASE}vehicules.html?condition=occasion">Occasion</a></li>
            <li><a href="${AW_BASE}vehicules.html?featured=1">Coups de cœur</a></li>
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
        <span><a href="../login.html">Accès professionnel</a></span>
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
// Ré-observe les éléments ajoutés dynamiquement après un fetch
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
    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      subject: form.subject.value,
      message: form.message.value.trim(),
    };
    try {
      // Adaptez l'endpoint à votre route Laravel réelle (ex: /contact ou /messages)
      const res = await fetch(API_BASE + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      awToast('Message envoyé — nous vous répondrons rapidement.', 'success');
      form.reset();
    } catch (_) {
      awToast("Impossible d'envoyer le message. Appelez-nous directement au +213 555 00 00 00.", 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });
}

// ---- Avis clients (démo — à remplacer par un vrai endpoint d'avis si disponible côté API) ----
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

document.addEventListener('DOMContentLoaded', () => {
  awRenderFooter();
  awInitContactForm();
  awRenderTestimonials();
  AwFav.updateCount();
});
