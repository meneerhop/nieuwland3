/* ============================================================
   ASC Nieuwland 3 — Hamburger navigatie + dark mode
   ============================================================ */

(function () {
  const tabs = [
    { bestand: "index.html",       icoon: "🏠", label: "Dashboard"  },
    { bestand: "wedstrijden.html", icoon: "⚽", label: "Wedstrijden"},
    { bestand: "spelers.html",     icoon: "👥", label: "Spelers"    },
    { bestand: "opstelling.html",  icoon: "📋", label: "Opstelling" },
    { bestand: "training.html",    icoon: "🏃", label: "Training"   },
    { bestand: "stand.html",       icoon: "📊", label: "Stand"      },
  ];

  const huidig = location.pathname.split("/").pop() || "index.html";

  // ── Dark mode ──────────────────────────────────────────────
  function isDonker() { return localStorage.getItem("nieuwland3_donker") === "1"; }

  function pasDonkerToe(donker) {
    document.body.classList.toggle("donker", donker);
    const themeEl = document.querySelector('meta[name="theme-color"]');
    if (themeEl) themeEl.content = donker ? "#0c1420" : (themeEl.dataset.licht || "#002E5F");
    localStorage.setItem("nieuwland3_donker", donker ? "1" : "0");
  }

  // Apply immediately (before render) to prevent flash
  if (isDonker()) document.body.classList.add("donker");

  // ── Hamburger knop ─────────────────────────────────────────
  const btn = document.createElement("button");
  btn.className = "hamburger-btn";
  btn.setAttribute("aria-label", "Menu");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<span class="hamburger-icoon">☰</span>';

  const backdrop = document.createElement("div");
  backdrop.className = "menu-backdrop";

  const menu = document.createElement("nav");
  menu.className = "hamburger-menu";
  menu.setAttribute("aria-label", "Hoofdnavigatie");

  tabs.forEach(function (tab) {
    const isActief = huidig === tab.bestand ||
      (huidig === "" && tab.bestand === "index.html");

    const a = document.createElement("a");
    a.href = tab.bestand;
    a.className = "menu-item" + (isActief ? " actief" : "");
    a.setAttribute("aria-current", isActief ? "page" : "false");
    a.innerHTML =
      '<span class="menu-icoon">' + tab.icoon + "</span>" +
      '<span class="menu-label">' + tab.label + "</span>" +
      (isActief ? '<span class="menu-actief-stip"></span>' : "");

    if (isActief) a.addEventListener("click", sluitMenu);
    menu.appendChild(a);
  });

  // Dark mode toggle
  const donkerRij = document.createElement("button");
  donkerRij.className = "menu-item";
  donkerRij.style.cssText = "width:100%;text-align:left;border:none;background:none;border-top:1px solid var(--lijn);cursor:pointer";
  function updateDonkerRij() {
    donkerRij.innerHTML =
      '<span class="menu-icoon">' + (isDonker() ? "☀️" : "🌙") + "</span>" +
      '<span class="menu-label">' + (isDonker() ? "Lichte modus" : "Donkere modus") + "</span>";
  }
  updateDonkerRij();
  donkerRij.addEventListener("click", function () {
    pasDonkerToe(!isDonker());
    updateDonkerRij();
    sluitMenu();
  });
  menu.appendChild(donkerRij);

  function openMenu() {
    menu.classList.add("open");
    backdrop.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    btn.querySelector(".hamburger-icoon").textContent = "✕";
  }

  function sluitMenu() {
    menu.classList.remove("open");
    backdrop.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    btn.querySelector(".hamburger-icoon").textContent = "☰";
  }

  btn.addEventListener("click", function () {
    menu.classList.contains("open") ? sluitMenu() : openMenu();
  });

  backdrop.addEventListener("click", sluitMenu);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") sluitMenu();
  });

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(function () {});
  }

  document.body.appendChild(btn);
  document.body.appendChild(backdrop);
  document.body.appendChild(menu);
})();
