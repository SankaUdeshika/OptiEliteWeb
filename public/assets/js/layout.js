// OptiElite shared layout: sidebar open/close + fills the signed-in user
(function () {
  var sidebar = document.getElementById("sidebar");
  var overlay = document.getElementById("overlay");
  var menuBtn = document.getElementById("menu-toggle");
  if (!sidebar || !overlay) return;

  window.openSidebar = function () {
    sidebar.classList.add("open");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  };
  window.closeSidebar = function () {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  };

  if (menuBtn) {
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      sidebar.classList.contains("open") ? window.closeSidebar() : window.openSidebar();
    });
  }
  overlay.addEventListener("click", window.closeSidebar);
  overlay.addEventListener(
    "touchend",
    function (e) { e.preventDefault(); window.closeSidebar(); },
    { passive: false }
  );
  sidebar.querySelectorAll(".nav-item").forEach(function (item) {
    item.addEventListener("click", function () {
      if (window.innerWidth < 992) window.closeSidebar();
    });
  });

  // signed-in user (name, initial, branch). Keeps the defaults if the call fails.
  fetch("/user/getUserDetails")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (u) {
      if (!u) return;
      var name = ((u.fname || "") + " " + (u.lname || "")).trim() || u.username || "";
      if (!name) return;
      var initial = name.charAt(0).toUpperCase();
      var set = function (sel, text) {
        document.querySelectorAll(sel).forEach(function (el) { el.textContent = text; });
      };
      set(".sidebar-user-name", name);
      set(".sidebar-user-avatar, .topbar-avatar", initial);
      if (u.location_name) set(".sidebar-user-role", u.location_name);
    })
    .catch(function () {});
})();