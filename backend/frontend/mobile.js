/* UniBuddy — Mobile JS v2.0 — Bottom Nav */
(function () {
  const STUDENT_NAV = [
    { href: "dashboard.html",  icon: "🏠",  label: "Home" },
    { href: "books.html",      icon: "📚",  label: "Books" },
    { href: "mentors.html",    icon: "🧑‍🏫", label: "Mentors" },
    { href: "quiz.html",       icon: "📝",  label: "Quiz" },
    { href: "profile.html",    icon: "👤",  label: "Profile" },
  ];
  const MENTOR_NAV = [
    { href: "mentor-dashboard.html",           icon: "🏠",  label: "Home" },
    { href: "mentor-dashboard.html", sec:"students", icon: "👥", label: "Students" },
    { href: "mentor-dashboard.html", sec:"chats",    icon: "💬", label: "Chats" },
    { href: "mentor-dashboard.html", sec:"content",  icon: "📚", label: "Content" },
    { href: "profile.html",          icon: "👤",  label: "Profile" },
  ];

  document.addEventListener("DOMContentLoaded", function () {
    if (window.innerWidth > 768) return;

    const currentPage = location.pathname.split("/").pop() || "dashboard.html";
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isMentor = user.role === "mentor";
    const navItems = isMentor ? MENTOR_NAV : STUDENT_NAV;
    const main = document.querySelector(".main");

    // ── TOP HEADER ──────────────────────────────────────
    if (main) {
      const tb = document.createElement("div");
      tb.className = "mob-topbar";
      const avatarContent = user.avatar
        ? '<img src="' + user.avatar + '">'
        : (user.name || "U")[0].toUpperCase();
      tb.innerHTML =
        '<div class="mob-topbar-logo">Uni<span>Buddy</span></div>' +
        '<div class="mob-topbar-right">' +
        '<div class="mob-user-av">' + avatarContent + '</div>' +
        '<button class="mob-logout-btn" onclick="localStorage.clear();location.href=\'login.html\'">⏻</button>' +
        '</div>';
      main.prepend(tb);
    }

    // ── BOTTOM NAV ──────────────────────────────────────
    const nav = document.createElement("nav");
    nav.className = "mob-bottom-nav";

    navItems.forEach(function(item) {
      const a = document.createElement("a");
      const isActive = currentPage === item.href.split("#")[0];
      a.className = "mob-nav-item" + (isActive ? " active" : "");
      a.href = item.sec ? "#" : item.href;
      a.innerHTML = '<span class="mob-nav-icon">' + item.icon + '</span><span>' + item.label + '</span>';

      if (item.sec) {
        a.addEventListener("click", function(e) {
          e.preventDefault();
          if (currentPage === "mentor-dashboard.html") {
            if (typeof showSec === "function") showSec(item.sec);
          } else {
            location.href = item.href + "?sec=" + item.sec;
          }
          nav.querySelectorAll(".mob-nav-item").forEach(function(n){ n.classList.remove("active"); });
          a.classList.add("active");
        });
      }
      nav.appendChild(a);
    });

    document.body.appendChild(nav);
  });
})();