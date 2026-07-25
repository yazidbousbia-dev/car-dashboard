// =============================================
// AutoWeex — Thème clair / sombre (dark / light mode)
// =============================================
// - Le site public (pages avec <body class="aw">) est sombre par défaut
//   (identité de marque Noir/Or/Rouge).
// - Le panneau admin (pages/*.html) est clair par défaut.
// Le choix de l'utilisateur est mémorisé dans localStorage et prime
// toujours sur le défaut de la page.

const Theme = {
  KEY: 'aw_theme',

  get() {
    return localStorage.getItem(this.KEY); // null si jamais choisi -> défaut de la page
  },

  set(theme) {
    localStorage.setItem(this.KEY, theme);
    document.body.setAttribute('data-theme', theme);
  },

  toggle() {
    const current = document.body.getAttribute('data-theme') || this.defaultFor();
    this.set(current === 'dark' ? 'light' : 'dark');
  },

  defaultFor() {
    return document.body.classList.contains('aw') ? 'dark' : 'light';
  },

  // À appeler au chargement de chaque page (fait automatiquement plus bas).
  init() {
    const saved = this.get();
    document.body.setAttribute('data-theme', saved || this.defaultFor());
  },
};

// Petit bouton soleil/lune à injecter dans la navbar / sidebar
function themeToggleHTML(extraClass = '') {
  return `<button type="button" class="aw-theme-toggle ${extraClass}" onclick="Theme.toggle()" aria-label="Changer de thème" title="Changer de thème">
    <i class="ti ti-sun"></i><i class="ti ti-moon"></i>
  </button>`;
}

document.addEventListener('DOMContentLoaded', () => Theme.init());
