/**
 * UniBuddy — Notifications System v1.0
 * Include on every page: <script src="notifications.js"></script>
 * Features:
 *  - Bell icon in sidebar with unread count badge
 *  - Real-time-like notifications via localStorage + polling
 *  - Triggers: book buy, mentor request, partner connect
 *  - Dropdown panel with mark-as-read
 */

(function () {
  const STORAGE_KEY = "ub_notifications";
  const READ_KEY    = "ub_notif_read_ts";

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getNotifs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  }
  function saveNotifs(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr.slice(0, 50))); // keep last 50
  }
  function getReadTs() {
    return parseInt(localStorage.getItem(READ_KEY) || "0", 10);
  }

  // PUBLIC: push a notification from anywhere in the app
  window.UBNotif = {
    push: function (type, title, body, link) {
      var notifs = getNotifs();
      notifs.unshift({
        id: Date.now() + Math.random(),
        type: type,       // "book" | "mentor" | "partner" | "offer"
        title: title,
        body: body,
        link: link || null,
        ts: Date.now()
      });
      saveNotifs(notifs);
      renderBell();
    },
    markAllRead: function () {
      localStorage.setItem(READ_KEY, Date.now().toString());
      renderBell();
    }
  };

  // ── Emoji map ───────────────────────────────────────────────────────────────
  var icons = { book: "📚", mentor: "🧑‍🏫", partner: "🤝", offer: "💰", default: "🔔" };

  // ── Time formatter ──────────────────────────────────────────────────────────
  function timeAgo(ts) {
    var d = Date.now() - ts;
    if (d < 60000) return "just now";
    if (d < 3600000) return Math.floor(d / 60000) + "m ago";
    if (d < 86400000) return Math.floor(d / 3600000) + "h ago";
    return Math.floor(d / 86400000) + "d ago";
  }

  // ── Render bell badge ───────────────────────────────────────────────────────
  function renderBell() {
    var btn = document.getElementById("ub-bell-btn");
    if (!btn) return;
    var notifs   = getNotifs();
    var readTs   = getReadTs();
    var unread   = notifs.filter(function (n) { return n.ts > readTs; }).length;
    var badge    = btn.querySelector(".ub-bell-badge");
    if (badge) badge.textContent = unread > 9 ? "9+" : unread;
    if (badge) badge.style.display = unread > 0 ? "flex" : "none";
  }

  // ── Render dropdown panel ───────────────────────────────────────────────────
  function renderPanel() {
    var panel  = document.getElementById("ub-notif-panel");
    if (!panel) return;
    var notifs = getNotifs();
    var readTs = getReadTs();

    if (notifs.length === 0) {
      panel.innerHTML =
        '<div style="text-align:center;padding:32px 16px;color:rgba(255,255,255,0.4);">' +
        '<div style="font-size:32px;margin-bottom:8px;">🔔</div>' +
        '<div style="font-size:13px;">No notifications yet</div>' +
        '</div>';
      return;
    }

    panel.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,0.08);">' +
      '<span style="font-family:Outfit,sans-serif;font-size:14px;font-weight:700;color:#fff;">Notifications</span>' +
      '<button onclick="UBNotif.markAllRead();renderUBPanel();" style="background:none;border:none;color:rgba(37,99,235,0.9);font-size:12px;cursor:pointer;font-family:Nunito,sans-serif;font-weight:700;">Mark all read</button>' +
      '</div>' +
      '<div style="max-height:340px;overflow-y:auto;">' +
      notifs.map(function (n) {
        var isNew = n.ts > readTs;
        var ic    = icons[n.type] || icons.default;
        return '<div style="display:flex;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.05);' +
          (isNew ? 'background:rgba(37,99,235,0.1);' : '') +
          (n.link ? 'cursor:pointer;" onclick="location.href=\'' + n.link + '\'"' : '"') + '>' +
          '<div style="width:34px;height:34px;border-radius:10px;background:rgba(37,99,235,0.15);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">' + ic + '</div>' +
          '<div style="flex:1;min-width:0;">' +
          '<div style="font-family:Outfit,sans-serif;font-size:13px;font-weight:700;color:#f1f5f9;margin-bottom:2px;' + (isNew ? 'color:#fff;' : '') + '">' + n.title + '</div>' +
          '<div style="font-size:12px;color:rgba(255,255,255,0.45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + n.body + '</div>' +
          '<div style="font-size:11px;color:rgba(255,255,255,0.25);margin-top:3px;">' + timeAgo(n.ts) + (isNew ? ' <span style="color:#2563eb;font-weight:700;">● new</span>' : '') + '</div>' +
          '</div></div>';
      }).join("") +
      '</div>';
  }

  // Expose for inline onclick
  window.renderUBPanel = renderPanel;

  // ── Inject bell button into sidebar ────────────────────────────────────────
  function injectBell() {
    var sideBottom = document.querySelector(".sidebar-bottom") ||
                     document.querySelector(".sb-bottom");
    if (!sideBottom || document.getElementById("ub-bell-btn")) return;

    // Bell button wrapper
    var wrapper = document.createElement("div");
    wrapper.style.cssText = "position:relative;margin:0 12px 8px;";

    var btn = document.createElement("button");
    btn.id = "ub-bell-btn";
    btn.style.cssText = "width:100%;display:flex;align-items:center;gap:10px;padding:10px 14px;" +
      "border:1px solid rgba(255,255,255,0.08);border-radius:10px;" +
      "background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.55);" +
      "font-family:Nunito,sans-serif;font-size:13px;font-weight:700;cursor:pointer;" +
      "transition:background 0.2s;position:relative;";
    btn.innerHTML =
      '<span style="font-size:18px;">🔔</span>' +
      '<span>Notifications</span>' +
      '<span class="ub-bell-badge" style="display:none;position:absolute;top:6px;right:10px;' +
      'background:#ef4444;color:#fff;border-radius:20px;padding:1px 6px;font-size:10px;font-weight:700;min-width:18px;text-align:center;align-items:center;justify-content:center;">0</span>';

    btn.addEventListener("mouseenter", function () { btn.style.background = "rgba(255,255,255,0.09)"; });
    btn.addEventListener("mouseleave", function () {
      if (!document.getElementById("ub-notif-panel")) btn.style.background = "rgba(255,255,255,0.04)";
    });

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var existing = document.getElementById("ub-notif-panel");
      if (existing) { existing.remove(); return; }

      // Create panel
      var panel = document.createElement("div");
      panel.id = "ub-notif-panel";
      panel.style.cssText =
        "position:fixed;bottom:80px;left:256px;width:320px;" +
        "background:#0a0d1a;border:1px solid rgba(37,99,235,0.2);" +
        "border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.6);" +
        "z-index:9999;overflow:hidden;animation:ubPanelIn 0.2s ease;";

      // inject animation
      if (!document.getElementById("ub-panel-style")) {
        var st = document.createElement("style");
        st.id = "ub-panel-style";
        st.textContent = "@keyframes ubPanelIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}";
        document.head.appendChild(st);
      }

      document.body.appendChild(panel);
      renderPanel();
      UBNotif.markAllRead();

      // close on outside click
      setTimeout(function () {
        document.addEventListener("click", function closer(ev) {
          if (!panel.contains(ev.target) && ev.target !== btn) {
            panel.remove();
            document.removeEventListener("click", closer);
          }
        });
      }, 50);
    });

    wrapper.appendChild(btn);
    sideBottom.insertBefore(wrapper, sideBottom.firstChild);
    renderBell();
  }

  // ── Mobile: inject bell icon in topbar ─────────────────────────────────────
  function injectMobileBell() {
    var topbar = document.querySelector(".mob-topbar-right");
    if (!topbar || document.getElementById("ub-mob-bell")) return;
    var btn = document.createElement("button");
    btn.id = "ub-mob-bell";
    btn.style.cssText = "background:rgba(255,255,255,0.08);border:none;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:18px;position:relative;color:#fff;";
    btn.textContent = "🔔";
    var badge = document.createElement("span");
    badge.className = "ub-bell-badge";
    badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:20px;padding:0 5px;font-size:9px;font-weight:700;display:none;min-width:16px;text-align:center;";
    btn.appendChild(badge);
    btn.addEventListener("click", function () {
      // toggle simple alert on mobile
      var notifs = getNotifs();
      if (!notifs.length) { alert("No notifications yet!"); return; }
      var readTs = getReadTs();
      var msgs = notifs.slice(0, 5).map(function (n) {
        return (n.ts > readTs ? "● " : "  ") + n.title + ": " + n.body;
      }).join("\n");
      alert("🔔 Notifications:\n\n" + msgs);
      UBNotif.markAllRead();
    });
    topbar.insertBefore(btn, topbar.firstChild);
  }

  // ── Auto-demo notifications (first visit) ──────────────────────────────────
  function maybeDemo() {
    if (localStorage.getItem("ub_notif_demo")) return;
    localStorage.setItem("ub_notif_demo", "1");
    setTimeout(function () {
      UBNotif.push("mentor", "New Mentor Request", "A mentor accepted your connection request!", "mentors.html");
    }, 1500);
    setTimeout(function () {
      UBNotif.push("book", "Book Interest", "Someone contacted you about your listed book", "my_books.html");
    }, 3000);
  }

  // ── Poll for sidebar & init ─────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    injectBell();
    injectMobileBell();
    maybeDemo();
    // Re-render badge every 10s (catches cross-tab pushes via localStorage)
    setInterval(function () {
      renderBell();
      var mob = document.getElementById("ub-mob-bell");
      if (mob) {
        var readTs = getReadTs();
        var unread = getNotifs().filter(function (n) { return n.ts > readTs; }).length;
        var b = mob.querySelector(".ub-bell-badge");
        if (b) { b.textContent = unread > 9 ? "9+" : unread; b.style.display = unread > 0 ? "inline-block" : "none"; }
      }
    }, 10000);
  });
})();