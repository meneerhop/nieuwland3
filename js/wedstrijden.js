/* ============================================================
   ASC Nieuwland 3 — Wedstrijden JS (Sportlink)
   ============================================================ */

/* ── Helpers ───────────────────────────────────────────────── */
function sportlinkFetch(endpoint, params) {
  const p = Object.assign({ client_id: SPORTLINK_CLIENT_ID }, params || {});
  return fetch("https://data.sportlink.com/" + endpoint + "?" + new URLSearchParams(p))
    .then(function (r) {
      if (!r.ok) throw new Error("Netwerkfout " + r.status);
      return r.json();
    });
}

function supaFetch(pad, params) {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetch(SUPABASE_URL + pad + query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
  }).then(function (r) {
    if (!r.ok) throw new Error("Netwerkfout " + r.status);
    return r.json();
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resultaatBadge(eigen, tegenstander) {
  if (eigen === null || eigen === undefined) return "";
  if (eigen > tegenstander)  return '<span class="badge badge-winst">W</span>';
  if (eigen < tegenstander)  return '<span class="badge badge-verlies">V</span>';
  return '<span class="badge badge-gelijk">G</span>';
}

function isOnsTeam(teamnaam) {
  if (!teamnaam) return false;
  return teamnaam.toLowerCase() === SPORTLINK_TEAM_NAAM.toLowerCase();
}

function maakWedstrijdObject(item, status) {
  // teamnaam = ons team; vergelijk met thuisteam voor thuis/uit
  const thuisIsEigen = (item.thuisteam || "").toLowerCase() === (item.teamnaam || "").toLowerCase();

  // wedstrijddatum is een volledig ISO-datetime string
  const datum = new Date(item.wedstrijddatum).toISOString();

  return {
    datum,
    tegenstander:       thuisIsEigen ? item.uitteam : item.thuisteam,
    thuis_uit:          thuisIsEigen ? "thuis" : "uit",
    locatie:            item.accommodatie || item.locatie || null,
    status,
    score_eigen:        status === "gespeeld" ? Number(thuisIsEigen ? item.thuisdoelpunten : item.uitdoelpunten) : null,
    score_tegenstander: status === "gespeeld" ? Number(thuisIsEigen ? item.uitdoelpunten   : item.thuisdoelpunten) : null,
  };
}

/* ── State ──────────────────────────────────────────────────── */
let alleWedstrijden  = [];
let huidigeTab       = "aankomend";
let gerenderdeLijst  = [];

/* ── Render ─────────────────────────────────────────────────── */
function renderWedstrijden() {
  const container = document.getElementById("wedstrijd-lijst");
  if (!container) return;

  const lijst = alleWedstrijden.filter(function (w) {
    return huidigeTab === "aankomend"
      ? w.status === "gepland"
      : w.status === "gespeeld";
  });

  lijst.sort(function (a, b) {
    const da = new Date(a.datum);
    const db = new Date(b.datum);
    return huidigeTab === "aankomend" ? da - db : db - da;
  });

  gerenderdeLijst = lijst;

  if (lijst.length === 0) {
    container.innerHTML = `
      <div class="leeg-staat">
        <div class="leeg-icoon">${huidigeTab === "aankomend" ? "📅" : "🏆"}</div>
        <div class="leeg-tekst">${huidigeTab === "aankomend" ? "Geen geplande wedstrijden" : "Geen gespeelde wedstrijden"}</div>
      </div>`;
    return;
  }

  container.innerHTML = lijst.map(function (w, i) {
    const d      = new Date(w.datum);
    const dag    = d.getDate();
    const maand  = d.toLocaleDateString("nl-NL", { month: "short" });
    const tijd   = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    const thuisBadge = w.thuis_uit === "thuis"
      ? '<span class="badge badge-groen">Thuis</span>'
      : '<span class="badge badge-grijs">Uit</span>';

    let rechts = "";
    if (w.status === "gespeeld") {
      rechts = `
        <div class="wedstrijd-score">${w.score_eigen} – ${w.score_tegenstander}</div>
        ${resultaatBadge(w.score_eigen, w.score_tegenstander)}`;
    } else {
      rechts = `<div class="wedstrijd-tijd">${tijd}</div>`;
    }

    return `
      <div class="glass-kaart wedstrijd-kaart klikbaar" data-index="${i}" style="cursor:pointer">
        <div class="wedstrijd-datum-blok">
          <div class="wedstrijd-datum-dag">${dag}</div>
          <div class="wedstrijd-datum-mnd">${maand}</div>
        </div>
        <div class="wedstrijd-midden">
          <div class="wedstrijd-teams">${escapeHtml(TEAM_NAAM)} vs ${escapeHtml(w.tegenstander)}</div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            ${thuisBadge}
            ${w.locatie ? `<div class="wedstrijd-locatie">📍 ${escapeHtml(w.locatie)}</div>` : ""}
          </div>
        </div>
        <div class="wedstrijd-rechts">${rechts}</div>
      </div>`;
  }).join("");

  container.querySelectorAll(".wedstrijd-kaart").forEach(function (kaart) {
    kaart.addEventListener("click", function () {
      const w = gerenderdeLijst[parseInt(kaart.dataset.index)];
      sessionStorage.setItem("nieuwland3_wedstrijd", JSON.stringify(w));
      location.href = "wedstrijd.html";
    });
  });
}

/* ── Laden ──────────────────────────────────────────────────── */
async function laadWedstrijden() {
  const container = document.getElementById("wedstrijd-lijst");
  if (!container) return;

  container.innerHTML = Array(3).fill(0).map(function () {
    return '<div class="skeleton skeleton-kaart"></div>';
  }).join("");

  try {
    const [r0, r1, r2] = await Promise.allSettled([
      sportlinkFetch("programma", { aantaldagen: 120, gebruiklokaleteamgegevens: "JA" }),
      sportlinkFetch("uitslagen", { aantaldagen: 120, gebruiklokaleteamgegevens: "JA" }),
      supaFetch("wedstrijden", { select: "*", order: "datum.asc" }),
    ]);

    const programma   = r0.status === "fulfilled" ? r0.value : [];
    const uitslag     = r1.status === "fulfilled" ? r1.value : [];
    const handmatig   = r2.status === "fulfilled" ? r2.value : [];

    const gepland  = (programma || []).filter(function (item) { return isOnsTeam(item.teamnaam); }).map(function (item) { return maakWedstrijdObject(item, "gepland"); });
    const gespeeld = (uitslag   || []).filter(function (item) { return isOnsTeam(item.teamnaam); }).map(function (item) { return maakWedstrijdObject(item, "gespeeld"); });
    alleWedstrijden  = gepland.concat(gespeeld).concat(handmatig || []);
    renderWedstrijden();
  } catch (e) {
    container.innerHTML = `
      <div class="leeg-staat">
        <div class="leeg-icoon">⚠️</div>
        <div class="leeg-tekst">Kon wedstrijden niet laden</div>
        <div class="leeg-sub">Controleer je verbinding en probeer opnieuw.</div>
      </div>`;
  }
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".tab-switch-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-switch-item").forEach(function (b) { b.classList.remove("actief"); });
      btn.classList.add("actief");
      huidigeTab = btn.dataset.tab;
      renderWedstrijden();
    });
  });

  laadWedstrijden();
});
