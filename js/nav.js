/* ============================================================
   ASC Nieuwland 3 — Hamburger navigatie
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

  // Hamburger knop
  const btn = document.createElement("button");
  btn.className = "hamburger-btn";
  btn.setAttribute("aria-label", "Menu");
  btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<span class="hamburger-icoon">☰</span>';

  // Backdrop om buiten menu te klikken
  const backdrop = document.createElement("div");
  backdrop.className = "menu-backdrop";

  // Menu panel
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

    if (isActief) {
      a.addEventListener("click", sluitMenu);
    }

    menu.appendChild(a);
  });

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

  document.body.appendChild(btn);
  document.body.appendChild(backdrop);
  document.body.appendChild(menu);
})();
