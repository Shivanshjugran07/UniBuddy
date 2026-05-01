/**
 * UniBuddy Theme Manager — Dark / Light Mode
 * Blue + Orange + White (Light) | Blue + Orange + Black (Dark)
 */

(function () {
  const STORAGE_KEY = "ub_theme";

  const DARK_VARS = `
    --bg: #000000;
    --card: #0a0d1a;
    --border: #1a2040;
    --text: #f1f5f9;
    --muted: #8a9ab5;
    --indigo: #2563eb;
    --indigo-dark: #1d4ed8;
    --indigo-light: rgba(37,99,235,0.18);
    --orange: #f97316;
    --orange-light: rgba(249,115,22,0.18);
    --sidebar: #000000;
  `;

  const LIGHT_VARS = `
    --bg: #ffffff;
    --card: #f8faff;
    --border: #dde6f5;
    --text: #0f172a;
    --muted: #5a6a85;
    --indigo: #2563eb;
    --indigo-dark: #1d4ed8;
    --indigo-light: #e8f0fe;
    --orange: #f97316;
    --orange-light: #fff3e8;
    --sidebar: #0c1229;
  `;

  const styleTag = document.createElement("style");
  styleTag.id = "ub-theme-style";
  styleTag.textContent = `
    :root {
      --indigo: #2563eb;
      --indigo-dark: #1d4ed8;
      --orange: #f97316;
    }
    body.dark-mode { ${DARK_VARS} }
    body.light-mode { ${LIGHT_VARS} }

    *, *::before, *::after {
      transition: background-color 0.25s ease, border-color 0.25s ease, color 0.2s ease !important;
    }

    /* Blue+Orange gradient button */
    .btn-primary, .btn-main {
      background: linear-gradient(135deg, #2563eb, #f97316) !important;
      box-shadow: 0 4px 20px rgba(37,99,235,0.3) !important;
    }
    .btn-primary:hover:not(:disabled), .btn-main:hover:not(:disabled) {
      background: linear-gradient(135deg, #1d4ed8, #ea6d00) !important;
      box-shadow: 0 8px 28px rgba(37,99,235,0.45) !important;
      transform: translateY(-2px);
    }

    /* Active nav: blue */
    .nav-item.active {
      color: #2563eb !important;
      border-left-color: #2563eb !important;
      background: rgba(37,99,235,0.1) !important;
    }
    .nav-item:hover { color: #f97316 !important; }
    .mob-nav-item.active {
      color: #2563eb !important;
      border-top-color: #2563eb !important;
      background: rgba(37,99,235,0.08) !important;
    }

    /* Tab active */
    .tab-btn.active {
      background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
      color: #fff !important;
      box-shadow: 0 4px 14px rgba(37,99,235,0.35) !important;
    }

    /* Role btn active */
    .role-btn.active {
      border-color: #2563eb !important;
      background: rgba(37,99,235,0.12) !important;
    }
    .role-btn.active .role-label { color: #60a5fa !important; }

    /* Focus */
    input:focus {
      border-color: #2563eb !important;
      box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
    }

    /* Misc accents */
    .stat-icon.indigo, .fi-blue { background: rgba(37,99,235,0.12) !important; }
    .stat-icon.amber, .fi-amber { background: rgba(249,115,22,0.15) !important; }
    .list-price, .btn-link { color: #2563eb !important; }

    /* Theme toggle button */
    .theme-toggle {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; margin: 8px 12px;
      border: 1px solid rgba(255,255,255,0.1); border-radius: 10px;
      background: rgba(255,255,255,0.05); color: #9ca3af;
      font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 700;
      cursor: pointer; width: calc(100% - 24px);
      transition: background 0.2s !important; letter-spacing: 0.3px;
    }
    .theme-toggle:hover { background: rgba(255,255,255,0.1); color: #fff; }
    .theme-toggle .toggle-icon { font-size: 16px; }
    .theme-toggle .toggle-track {
      margin-left: auto; width: 36px; height: 20px;
      border-radius: 10px; background: #374151; position: relative; flex-shrink: 0;
      transition: background 0.3s ease !important;
    }
    .theme-toggle .toggle-thumb {
      position: absolute; top: 3px; left: 3px;
      width: 14px; height: 14px; border-radius: 50%; background: #9ca3af;
      transition: transform 0.3s ease, background 0.3s ease !important;
    }
    body.light-mode .theme-toggle .toggle-track { background: #2563eb; }
    body.light-mode .theme-toggle .toggle-thumb { transform: translateX(16px); background: #fff; }

    /* Dark mode fixes */
    body.dark-mode input, body.dark-mode select, body.dark-mode textarea {
      background: #050810 !important; border-color: #1a2040 !important; color: #f1f5f9 !important;
    }
    body.dark-mode input:focus, body.dark-mode select:focus { border-color: #2563eb !important; }
    body.dark-mode .profile-bar { background: #1a2040 !important; }
    body.dark-mode table th { background: #050810 !important; }
    body.dark-mode tr:hover td { background: rgba(37,99,235,0.06) !important; }

    /* Light mode: sidebar stays dark */
    body.light-mode .sidebar, body.light-mode .portal-sidebar { background: #0c1229 !important; }
    body.light-mode .mob-topbar, body.light-mode .mob-bottom-nav { background: #0c1229 !important; }
  `;
  document.head.appendChild(styleTag);

  function applyTheme(theme) {
    document.body.classList.remove("dark-mode", "light-mode");
    document.body.classList.add(theme === "dark" ? "dark-mode" : "light-mode");
    localStorage.setItem(STORAGE_KEY, theme);
    document.querySelectorAll(".theme-toggle .toggle-icon").forEach(el => {
      el.textContent = theme === "dark" ? "🌙" : "☀️";
    });
    document.querySelectorAll(".theme-toggle .toggle-label").forEach(el => {
      el.textContent = theme === "dark" ? "Dark Mode" : "Light Mode";
    });
  }

  function getTheme() { return localStorage.getItem(STORAGE_KEY) || "light"; }
  function toggleTheme() { applyTheme(getTheme() === "dark" ? "light" : "dark"); }

  applyTheme(getTheme());

  window.UBTheme = { toggle: toggleTheme, apply: applyTheme, get: getTheme };

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(getTheme());

    const target =
      document.querySelector(".sidebar-bottom") ||
      document.querySelector(".sb-bottom") ||
      document.querySelector(".portal-sidebar");

    if (target) {
      const btn = document.createElement("button");
      btn.className = "theme-toggle";
      btn.onclick = toggleTheme;
      btn.innerHTML = `
        <span class="toggle-icon">${getTheme() === "dark" ? "🌙" : "☀️"}</span>
        <span class="toggle-label">${getTheme() === "dark" ? "Dark Mode" : "Light Mode"}</span>
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
      `;
      const userMini = target.querySelector(".user-mini");
      if (userMini) target.insertBefore(btn, userMini);
      else target.prepend(btn);
    }

    const adminHdr = document.querySelector(".hdr");
    if (adminHdr && !document.querySelector(".sidebar")) {
      const btn = document.createElement("button");
      btn.style.cssText = "padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#9ca3af;font-size:13px;cursor:pointer;font-family:Nunito,sans-serif;font-weight:700;";
      btn.innerHTML = getTheme() === "dark" ? "☀️ Light" : "🌙 Dark";
      btn.onclick = function() {
        toggleTheme();
        btn.innerHTML = getTheme() === "dark" ? "☀️ Light" : "🌙 Dark";
      };
      adminHdr.appendChild(btn);
    }
  });
})();