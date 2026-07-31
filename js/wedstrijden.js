/* ============================================================
   ASC Nieuwland 3 — Wedstrijden JS
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

function supaPatch(pad, id, body) {
  return fetch(SUPABASE_URL + pad + "?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
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
  const thuisIsEigen = (item.thuisteam || "").toLowerCase() === (item.teamnaam || "").toLowerCase();
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

function getWedstrijdStatus(w) {
  if (w.status) return w.status;
  if (w.score_eigen !== null && w.score_eigen !== undefined) return "gespeeld";
  return "gepland";
}

/* ── State ──────────────────────────────────────────────────── */
let alleWedstrijden        = [];
let alleBeschikbareSpelers = [];
let huidigeTab             = "aankomend";
let gerenderdeLijst        = [];
let huidigeBewerking       = null;

/* ── Spelers datalist ───────────────────────────────────────── */
function bouwSpelersDatalist() {
  let dl = document.getElementById("spelers-datalist");
  if (!dl) {
    dl = document.createElement("datalist");
    dl.id = "spelers-datalist";
    document.body.appendChild(dl);
  }
  dl.innerHTML = alleBeschikbareSpelers
    .slice()
    .sort(function (a, b) { return (a.rugnummer || 99) - (b.rugnummer || 99); })
    .map(function (s) {
      return `<option value="${escapeHtml(s.naam)}">${s.rugnummer ? "#" + s.rugnummer + " · " : ""}${escapeHtml(s.positie || "")}</option>`;
    }).join("");
}

function vindSpeler(naam) {
  if (!naam) return null;
  const lc = naam.trim().toLowerCase();
  return alleBeschikbareSpelers.find(function (s) { return s.naam.trim().toLowerCase() === lc; }) || null;
}

/* ── Render ─────────────────────────────────────────────────── */
function renderWedstrijden() {
  const container = document.getElementById("wedstrijd-lijst");
  if (!container) return;

  const lijst = alleWedstrijden.filter(function (w) {
    const status = getWedstrijdStatus(w);
    return huidigeTab === "aankomend"
      ? status === "gepland"
      : status === "gespeeld";
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
    const d    = new Date(w.datum);
    const dag  = d.getDate();
    const maand = d.toLocaleDateString("nl-NL", { month: "short" });
    const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    const isHandmatig = !!w.id;

    const thuisBadge = w.thuis_uit === "thuis"
      ? '<span class="badge badge-groen">Thuis</span>'
      : '<span class="badge badge-grijs">Uit</span>';

    let rechts = "";
    if (getWedstrijdStatus(w) === "gespeeld" && w.score_eigen !== null && w.score_eigen !== undefined) {
      rechts = `
        <div class="wedstrijd-score">${w.score_eigen} – ${w.score_tegenstander}</div>
        ${resultaatBadge(Number(w.score_eigen), Number(w.score_tegenstander))}`;
    } else {
      rechts = `<div class="wedstrijd-tijd">${tijd}</div>`;
    }

    let extraInfo = "";
    if (isHandmatig && w.doelpunten && w.doelpunten.length > 0) {
      const doelTekst = w.doelpunten.map(function (d) {
        return escapeHtml(d.speler) + (d.minuut ? " " + d.minuut + "'" : "");
      }).join(" · ");
      extraInfo += `<div class="wedstrijd-extra">⚽ ${doelTekst}</div>`;
    }
    if (isHandmatig && w.kaarten && w.kaarten.length > 0) {
      const kaartTekst = w.kaarten.map(function (k) {
        return (k.type === "rood" ? "🔴" : "🟡") + " " + escapeHtml(k.speler) + (k.minuut ? " " + k.minuut + "'" : "");
      }).join(" · ");
      extraInfo += `<div class="wedstrijd-extra">${kaartTekst}</div>`;
    }

    const bewerkBtn = isHandmatig
      ? `<button class="wedstrijd-bewerk bewerk-btn" data-index="${i}" title="Uitslag invoeren">✏️</button>`
      : "";

    return `
      <div class="glass-kaart wedstrijd-kaart${isHandmatig ? " wedstrijd-handmatig" : ""}" data-index="${i}">
        <div class="wedstrijd-datum-blok">
          <div class="wedstrijd-datum-dag">${dag}</div>
          <div class="wedstrijd-datum-mnd">${maand}</div>
        </div>
        <div class="wedstrijd-midden">
          <div class="wedstrijd-teams">${escapeHtml(TEAM_NAAM)} vs ${escapeHtml(w.tegenstander)}</div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            ${thuisBadge}
            ${isHandmatig ? '<span class="badge badge-geel">Handmatig</span>' : ""}
            ${w.locatie ? `<div class="wedstrijd-locatie">📍 ${escapeHtml(w.locatie)}</div>` : ""}
          </div>
          ${extraInfo}
        </div>
        <div class="wedstrijd-rechts">
          ${rechts}
          ${bewerkBtn}
        </div>
      </div>`;
  }).join("");

  container.querySelectorAll(".wedstrijd-kaart").forEach(function (kaart) {
    kaart.addEventListener("click", function (e) {
      if (e.target.closest(".bewerk-btn")) return;
      const w = gerenderdeLijst[parseInt(kaart.dataset.index)];
      sessionStorage.setItem("nieuwland3_wedstrijd", JSON.stringify(w));
      location.href = "wedstrijd.html";
    });
  });

  container.querySelectorAll(".bewerk-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const w = gerenderdeLijst[parseInt(btn.dataset.index)];
      openUitslagModal(w);
    });
  });
}

/* ── Uitslag modal ──────────────────────────────────────────── */
function openUitslagModal(w) {
  huidigeBewerking = w;

  document.getElementById("uitslag-modal-titel").textContent = "Uitslag — " + (w.tegenstander || "");
  document.getElementById("uitslag-tegenstander-label").textContent = w.tegenstander || "Tegenstander";

  const scoreE = document.getElementById("uitslag-score-eigen");
  const scoreT = document.getElementById("uitslag-score-tegenstander");
  scoreE.value = (w.score_eigen !== null && w.score_eigen !== undefined) ? w.score_eigen : "";
  scoreT.value = (w.score_tegenstander !== null && w.score_tegenstander !== undefined) ? w.score_tegenstander : "";

  document.getElementById("uitslag-fout").textContent = "";

  const doelLijst = document.getElementById("doelpunten-lijst");
  doelLijst.innerHTML = "";
  (w.doelpunten || []).forEach(function (d) { voegDoelpuntRij(d.speler, d.minuut); });

  const kaartLijst = document.getElementById("kaarten-lijst");
  kaartLijst.innerHTML = "";
  (w.kaarten || []).forEach(function (k) { voegKaartRij(k.speler, k.minuut, k.type); });

  document.getElementById("uitslag-modal").classList.add("open");
}

function sluitUitslagModal() {
  document.getElementById("uitslag-modal").classList.remove("open");
  huidigeBewerking = null;
}

function voegDoelpuntRij(speler, minuut) {
  const rij = document.createElement("div");
  rij.className = "event-rij";
  rij.innerHTML = `
    <input type="text" class="formulier-input doel-speler" placeholder="Speler kiezen…"
      list="spelers-datalist" value="${escapeHtml(speler || "")}" autocomplete="off" style="flex:1;min-width:0">
    <input type="number" class="formulier-input doel-minuut" placeholder="Min" min="1" max="120"
      value="${minuut || ""}" style="width:68px;text-align:center">
    <button class="btn-verwijder-rij" title="Verwijderen">✕</button>
  `;
  rij.querySelector(".btn-verwijder-rij").addEventListener("click", function () { rij.remove(); });
  document.getElementById("doelpunten-lijst").appendChild(rij);
  rij.querySelector(".doel-speler").focus();
}

function voegKaartRij(speler, minuut, type) {
  const rij = document.createElement("div");
  rij.className = "event-rij";
  rij.innerHTML = `
    <input type="text" class="formulier-input kaart-speler" placeholder="Speler kiezen…"
      list="spelers-datalist" value="${escapeHtml(speler || "")}" autocomplete="off" style="flex:1;min-width:0">
    <input type="number" class="formulier-input kaart-minuut" placeholder="Min" min="1" max="120"
      value="${minuut || ""}" style="width:68px;text-align:center">
    <select class="formulier-select kaart-type" style="width:100px;padding-right:28px">
      <option value="geel" ${(type || "geel") === "geel" ? "selected" : ""}>🟡 Geel</option>
      <option value="rood" ${type === "rood" ? "selected" : ""}>🔴 Rood</option>
    </select>
    <button class="btn-verwijder-rij" title="Verwijderen">✕</button>
  `;
  rij.querySelector(".btn-verwijder-rij").addEventListener("click", function () { rij.remove(); });
  document.getElementById("kaarten-lijst").appendChild(rij);
  rij.querySelector(".kaart-speler").focus();
}

/* ── Speler stats bijwerken ─────────────────────────────────── */
async function werkSpelerStatsbij(oudeDoelpunten, nieuweDoelpunten, oudeKaarten, nieuweKaarten) {
  const diff = {};

  function voegToe(naam, veld, delta) {
    const s = vindSpeler(naam);
    if (!s) return;
    if (!diff[s.id]) diff[s.id] = { speler: s, goals: 0, gele_kaarten: 0, rode_kaarten: 0 };
    diff[s.id][veld] += delta;
  }

  // Doelpunten: trek oud af, tel nieuw op
  (oudeDoelpunten || []).forEach(function (d) { voegToe(d.speler, "goals", -1); });
  (nieuweDoelpunten || []).forEach(function (d) { voegToe(d.speler, "goals", +1); });

  // Kaarten: trek oud af, tel nieuw op
  (oudeKaarten || []).forEach(function (k) {
    voegToe(k.speler, k.type === "rood" ? "rode_kaarten" : "gele_kaarten", -1);
  });
  (nieuweKaarten || []).forEach(function (k) {
    voegToe(k.speler, k.type === "rood" ? "rode_kaarten" : "gele_kaarten", +1);
  });

  // Stuur alleen patches voor spelers waarbij iets gewijzigd is
  const patches = Object.values(diff)
    .filter(function (d) { return d.goals !== 0 || d.gele_kaarten !== 0 || d.rode_kaarten !== 0; })
    .map(function (d) {
      const s = d.speler;
      const body = {};
      if (d.goals !== 0)        body.goals        = Math.max(0, (s.goals        || 0) + d.goals);
      if (d.gele_kaarten !== 0) body.gele_kaarten = Math.max(0, (s.gele_kaarten || 0) + d.gele_kaarten);
      if (d.rode_kaarten !== 0) body.rode_kaarten = Math.max(0, (s.rode_kaarten || 0) + d.rode_kaarten);
      return supaPatch("spelers", s.id, body);
    });

  await Promise.allSettled(patches);

  // Lokale kopie bijwerken zodat herhaald opslaan klopt
  Object.values(diff).forEach(function (d) {
    const s = alleBeschikbareSpelers.find(function (sp) { return sp.id === d.speler.id; });
    if (!s) return;
    if (d.goals !== 0)        s.goals        = Math.max(0, (s.goals        || 0) + d.goals);
    if (d.gele_kaarten !== 0) s.gele_kaarten = Math.max(0, (s.gele_kaarten || 0) + d.gele_kaarten);
    if (d.rode_kaarten !== 0) s.rode_kaarten = Math.max(0, (s.rode_kaarten || 0) + d.rode_kaarten);
  });
}

/* ── Uitslag opslaan ────────────────────────────────────────── */
async function slaatUitslagOp() {
  if (!huidigeBewerking || !huidigeBewerking.id) return;

  const scoreEigen = parseInt(document.getElementById("uitslag-score-eigen").value);
  const scoreTegen = parseInt(document.getElementById("uitslag-score-tegenstander").value);

  if (isNaN(scoreEigen) || isNaN(scoreTegen) || scoreEigen < 0 || scoreTegen < 0) {
    document.getElementById("uitslag-fout").textContent = "Vul een geldige score in (bijv. 2 – 1).";
    return;
  }

  // Verzamel nieuwe doelpunten
  const doelpunten = [];
  document.querySelectorAll("#doelpunten-lijst .event-rij").forEach(function (rij) {
    const speler = rij.querySelector(".doel-speler").value.trim();
    const minuut = parseInt(rij.querySelector(".doel-minuut").value);
    if (speler) doelpunten.push({ speler: speler, minuut: isNaN(minuut) ? null : minuut });
  });

  // Verzamel nieuwe kaarten
  const kaarten = [];
  document.querySelectorAll("#kaarten-lijst .event-rij").forEach(function (rij) {
    const speler = rij.querySelector(".kaart-speler").value.trim();
    const minuut = parseInt(rij.querySelector(".kaart-minuut").value);
    const type   = rij.querySelector(".kaart-type").value;
    if (speler) kaarten.push({ speler: speler, minuut: isNaN(minuut) ? null : minuut, type: type });
  });

  const btn = document.getElementById("uitslag-opslaan-btn");
  btn.textContent = "Opslaan…"; btn.disabled = true;
  document.getElementById("uitslag-fout").textContent = "";

  try {
    // 1. Sla uitslag op in wedstrijden tabel
    const r = await supaPatch("wedstrijden", huidigeBewerking.id, {
      status:             "gespeeld",
      score_eigen:        scoreEigen,
      score_tegenstander: scoreTegen,
      doelpunten:         doelpunten.length ? doelpunten : null,
      kaarten:            kaarten.length ? kaarten : null,
    });

    if (!r.ok) throw new Error("HTTP " + r.status);

    // 2. Update spelersstatistieken (diff oud vs nieuw)
    await werkSpelerStatsbij(
      huidigeBewerking.doelpunten || [],
      doelpunten,
      huidigeBewerking.kaarten || [],
      kaarten
    );

    sluitUitslagModal();
    laadWedstrijden();
  } catch (e) {
    document.getElementById("uitslag-fout").textContent = "Opslaan mislukt. Probeer opnieuw.";
  } finally {
    btn.textContent = "Uitslag opslaan"; btn.disabled = false;
  }
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
      sportlinkFetch("uitslagen",  { aantaldagen: 120, gebruiklokaleteamgegevens: "JA" }),
      supaFetch("wedstrijden", { select: "*", order: "datum.asc" }),
    ]);

    const programma = r0.status === "fulfilled" ? r0.value : [];
    const uitslag   = r1.status === "fulfilled" ? r1.value : [];
    const handmatig = r2.status === "fulfilled" ? r2.value : [];

    const gepland  = (programma || []).filter(function (item) { return isOnsTeam(item.teamnaam); }).map(function (item) { return maakWedstrijdObject(item, "gepland"); });
    const gespeeld = (uitslag   || []).filter(function (item) { return isOnsTeam(item.teamnaam); }).map(function (item) { return maakWedstrijdObject(item, "gespeeld"); });

    alleWedstrijden = gepland.concat(gespeeld).concat(handmatig || []);
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
  // Tab switcher
  document.querySelectorAll(".tab-switch-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-switch-item").forEach(function (b) { b.classList.remove("actief"); });
      btn.classList.add("actief");
      huidigeTab = btn.dataset.tab;
      renderWedstrijden();
    });
  });

  // Uitslag modal events
  document.getElementById("uitslag-modal-sluiten").addEventListener("click", sluitUitslagModal);
  document.getElementById("uitslag-modal").addEventListener("click", function (e) {
    if (e.target === this) sluitUitslagModal();
  });
  document.getElementById("uitslag-opslaan-btn").addEventListener("click", slaatUitslagOp);
  document.getElementById("voeg-doel-toe").addEventListener("click", function () { voegDoelpuntRij("", ""); });
  document.getElementById("voeg-kaart-toe").addEventListener("click", function () { voegKaartRij("", "", "geel"); });

  // Laad spelers voor autocomplete, daarna wedstrijden
  supaFetch("spelers", { select: "id,naam,rugnummer,positie,goals,gele_kaarten,rode_kaarten", order: "rugnummer.asc" })
    .then(function (data) {
      alleBeschikbareSpelers = data || [];
      bouwSpelersDatalist();
    })
    .catch(function () {})
    .finally(function () {
      laadWedstrijden();
    });
});
