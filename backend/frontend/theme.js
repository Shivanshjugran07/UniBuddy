/**
 * UniBuddy Theme Manager — Dark / Light Mode
 * Include this script in every HTML page.
 * Usage: just include <script src="theme.js"></script>
 */

(function () {
  const STORAGE_KEY = "ub_theme";

  /* ── CSS variable overrides for DARK mode ─────────────────────────────── */
  const DARK_VARS = `
    --bg: #0c0e1a;
    --card: #13162a;
    --border: #1e2240;
    --text: #f1f5f9;
    --muted: #64748b;
    --indigo-light: rgba(99,102,241,0.15);
  `;

  /* ── CSS variable overrides for LIGHT mode ────────────────────────────── */
  const LIGHT_VARS = `
    --bg: #f8fafc;
    --card: #ffffff;
    --border: #e2e8f0;
    --text: #0f172a;
    --muted: #64748b;
    --indigo-light: #eef2ff;
  `;

  /* ── Inject a <style> tag that overrides :root when body.dark ─────────── */
  const styleTag = document.createElement("style");
  styleTag.id = "ub-theme-style";
  styleTag.textContent = `
    body.dark-mode {
      ${DARK_VARS}
    }
    body.light-mode {
      ${LIGHT_VARS}
    }

    /* Smooth transition for all color changes */
    *, *::before, *::after {
      transition: background-color 0.25s ease, border-color 0.25s ease, color 0.2s ease !important;
    }

    /* ── Toggle button styles ── */
    .theme-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      margin: 8px 12px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      background: rgba(255,255,255,0.05);
      color: #9ca3af;
      font-family: 'Nunito', sans-serif;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      width: calc(100% - 24px);
      transition: background 0.2s !important;
      letter-spacing: 0.3px;
    }
    .theme-toggle:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .theme-toggle .toggle-icon {
      font-size: 16px;
      transition: transform 0.4s ease !important;
    }
    .theme-toggle .toggle-track {
      margin-left: auto;
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: #374151;
      position: relative;
      transition: background 0.3s ease !important;
      flex-shrink: 0;
    }
    .theme-toggle .toggle-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #9ca3af;
      transition: transform 0.3s ease, background 0.3s ease !important;
    }
    body.light-mode .theme-toggle .toggle-track {
      background: #6366f1;
    }
    body.light-mode .theme-toggle .toggle-thumb {
      transform: translateX(16px);
      background: #fff;
    }

    /* ── Dark mode: fix card backgrounds, inputs etc. ── */
    body.dark-mode input,
    body.dark-mode select,
    body.dark-mode textarea {
      background: #0c0e1a !important;
      border-color: #1e2240 !important;
      color: #f1f5f9 !important;
    }
    body.dark-mode input:focus,
    body.dark-mode select:focus,
    body.dark-mode textarea:focus {
      border-color: #6366f1 !important;
    }
    body.dark-mode .profile-bar {
      background: #1e2240 !important;
    }
    body.dark-mode table th {
      background: #0c0e1a !important;
    }
    body.dark-mode tr:hover td {
      background: rgba(99,102,241,0.06) !important;
    }

    /* ── Light mode on dark-by-default pages (admin, login) ── */
    body.light-mode .sidebar,
    body.light-mode .portal-sidebar {
      background: #1e1b4b !important;
    }
  `;
  document.head.appendChild(styleTag);

  /* ── Apply saved theme immediately (before paint) ─────────────────────── */
  function applyTheme(theme) {
    document.body.classList.remove("dark-mode", "light-mode");
    document.body.classList.add(theme === "dark" ? "dark-mode" : "light-mode");
    localStorage.setItem(STORAGE_KEY, theme);

    // Update any toggle buttons on the page
    document.querySelectorAll(".theme-toggle .toggle-icon").forEach(el => {
      el.textContent = theme === "dark" ? "🌙" : "☀️";
    });
    document.querySelectorAll(".theme-toggle .toggle-label").forEach(el => {
      el.textContent = theme === "dark" ? "Dark Mode" : "Light Mode";
    });
  }

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || "light";
  }

  function toggleTheme() {
    const current = getTheme();
    applyTheme(current === "dark" ? "light" : "dark");
  }

  /* Apply on load */
  applyTheme(getTheme());

  /* ── Public API ───────────────────────────────────────────────────────── */
  window.UBTheme = { toggle: toggleTheme, apply: applyTheme, get: getTheme };

  /* ── Auto-inject toggle button into .sidebar-bottom or .sb-bottom ─────── */
  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(getTheme()); // re-apply after DOM ready

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

      // Insert BEFORE the user-mini div so it's above the user info
      const userMini = target.querySelector(".user-mini");
      if (userMini) {
        target.insertBefore(btn, userMini);
      } else {
        target.prepend(btn);
      }
    }

    // Also handle pages without a sidebar (login, admin header)
    const adminHdr = document.querySelector(".hdr");
    if (adminHdr && !document.querySelector(".sidebar")) {
      const btn = document.createElement("button");
      btn.onclick = toggleTheme;
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