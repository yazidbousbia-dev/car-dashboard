// Injects sidebar + topbar into .layout element
// Call: initLayout('cars') — pass active page key
function initLayout(activePage, pageTitle) {
  Auth.guardPage(); // admin + secretaire (pages/users.html overrides with ['admin'] only)

  const user = Auth.getUser();
  const isSecretaire = user?.role === 'secretaire';

  const nav = [
    { key:'dashboard', icon:'ti-dashboard',       label:t('admin.nav.dashboard') },
    { key:'cars',       icon:'ti-car',             label:t('admin.nav.cars') },
    { key:'requests',   icon:'ti-clipboard-list',  label:t('admin.nav.requests') },
    { key:'brands',     icon:'ti-tag',             label:t('admin.nav.brands') },
    { key:'users',      icon:'ti-users-group',     label:t('admin.nav.users') },
    { key:'reports',    icon:'ti-flag',            label:t('admin.nav.reports') },
    { key:'profile',    icon:'ti-user-circle',     label:t('admin.nav.profile') },
  ].filter(n => !(isSecretaire && n.key === 'users')); // la gestion des comptes reste admin-only

  const navHTML = nav.map(n => `
    <div class="nav-item ${activePage === n.key ? 'active' : ''}" onclick="navigate('${n.key}')">
      <i class="ti ${n.icon}"></i>
      <span>${n.label}</span>
    </div>
  `).join('');

  const initials = (user?.name || 'A').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const layout = document.querySelector('.layout');
  layout.innerHTML = `
    <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon"><i class="ti ti-car"></i></div>
        <div>
          <div class="logo-text">${t('admin.brand')}</div>
          <div class="logo-sub">${t('admin.brandSub')}</div>
        </div>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-label">Navigation</div>
        ${navHTML}
      </nav>
      <div class="sidebar-footer">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <div style="flex:1">${langSwitcherHTML()}</div>
          ${themeToggleHTML()}
        </div>
        <div class="user-chip" id="sidebarUser" onclick="navigate('profile')" style="cursor:pointer">
          <div class="user-avatar">${initials}</div>
          <div>
            <div class="user-name">${user?.name || ''}</div>
            <div class="user-role">${user?.role || ''}</div>
          </div>
        </div>
        <div class="nav-item" onclick="window.open('../index.html', '_blank')">
          <i class="ti ti-external-link"></i><span>${t('nav.viewSite')}</span>
        </div>
        <div class="nav-item" onclick="logout()" style="margin-top:4px">
          <i class="ti ti-logout"></i><span>${t('nav.logout')}</span>
        </div>
      </div>
    </aside>
    <div class="main" id="mainArea">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <button class="btn btn-ghost btn-sm menu-btn" id="menuBtn" onclick="toggleSidebar()">
            <i class="ti ti-menu-2"></i>
          </button>
          <span class="topbar-title" id="pageTitle">${pageTitle || ''}</span>
        </div>
        <div class="topbar-actions" id="topbarActions"></div>
      </header>
      <div class="page-content" id="pageContent"></div>
    </div>
  `;

  layout.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay').classList.remove('open');
    });
  });
}

function navigate(page) {
  window.location.href = `${page}.html`;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
