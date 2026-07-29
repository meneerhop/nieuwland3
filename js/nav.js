/* ============================================================
   ASC Nieuwland 3 — Bottom Tab Bar Navigation
   Injecteert de floating tab bar in de body
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

  // Bepaal huidig bestand uit URL
  const huidig = location.pathname.split("/").pop() || "index.html";

  const nav = document.createElement("nav");
  nav.className = "tab-bar";
  nav.setAttribute("role", "navigation");
  nav.setAttribute("aria-label", "Hoofdnavigatie");

  tabs.forEach(function (tab) {
    const isActief = huidig === tab.bestand ||
      (huidig === "" && tab.bestand === "index.html");

    const a = document.createElement("a");
    a.href = tab.bestand;
    a.className = "tab-item" + (isActief ? " actief" : "");
    a.setAttribute("aria-current", isActief ? "page" : "false");
    a.innerHTML =
      '<span class="tab-icon" aria-hidden="true">' + tab.icoon + "</span>" +
      '<span class="tab-label">' + tab.label + "</span>";

    // Scale terug bij aanraking
    a.addEventListener("touchstart", function () {
      a.style.transition = "transform 0.1s ease";
    }, { passive: true });

    nav.appendChild(a);
  });

  document.body.appendChild(nav);
})();
