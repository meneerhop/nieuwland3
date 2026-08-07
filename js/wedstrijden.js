/* ============================================================
   ASC Nieuwland 3 — Wedstrijden JS
   ============================================================ */

/* ── Helpers ───────────────────────────────────────────────── */
function sportlinkFetch(endpoint, params) {
  const p = Object.assign({ client_id: SPORTLINK_CLIENT_ID, token: SPORTLINK_TOKEN }, params || {});
  return fetch("https://data.sportlink.com/" + endpoint + "?" + new URLSearchParams(p))
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
}

function supaFetch(pad, params) {
  const q = params ? "?" + new URLSearchParams(params) : "";
  return fetch(SUPABASE_URL + pad + q, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
  }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
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
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function resultaatBadge(e, t) {
  if (e === null || e === undefined) return "";
  if (e > t) return '<span class="badge badge-winst">W</span>';
  if (e < t) return '<span class="badge badge-verlies">V</span>';
  return '<span class="badge badge-gelijk">G</span>';
}

function isOnsTeam(t) { return t ? t.toLowerCase() === SPORTLINK_TEAM_NAAM.toLowerCase() : false; }

function maakWedstrijdObject(item, status) {
  const thuis = (item.thuisteam || "").toLowerCase() === (item.teamnaam || "").toLowerCase();
  return {
    datum:              new Date(item.wedstrijddatum).toISOString(),
    tegenstander:       thuis ? item.uitteam : item.thuisteam,
    thuis_uit:          thuis ? "thuis" : "uit",
    locatie:            item.accommodatie || item.locatie || null,
    status,
    score_eigen:        status === "gespeeld" ? Number(thuis ? item.thuisdoelpunten : item.uitdoelpunten) : null,
    score_tegenstander: status === "gespeeld" ? Number(thuis ? item.uitdoelpunten   : item.thuisdoelpunten) : null,
  };
}

function getStatus(w) {
  if (w.status) return w.status;
  if (w.score_eigen !== null && w.score_eigen !== undefined) return "gespeeld";
  return "gepland";
}

function vindSpeler(naam) {
  if (!naam) return null;
  const lc = naam.trim().toLowerCase();
  return alleBeschikbareSpelers.find(function (s) { return s.naam.trim().toLowerCase() === lc; }) || null;
}

function getPKlasse(positie) {
  if (!positie) return "";
  const h = positie.split("/")[0].trim().toUpperCase();
  if (h === "DM" || h === "GK")       return "pos-GK";
  if (["RB","LB","CV"].includes(h))    return "pos-DEF";
  if (["CVM","CM","CAM"].includes(h))  return "pos-MID";
  if (["LVA","RVA","SP"].includes(h))  return "pos-AAN";
  return "";
}

/* ── State ──────────────────────────────────────────────────── */
let alleWedstrijden        = [];
let alleBeschikbareSpelers = [];
let huidigeTab             = "aankomend";
let gerenderdeLijst        = [];
let huidigeBewerking       = null;
let huidigeEvents          = []; // { type, speler, minuut, assist? }
let huidigEventType        = null;
let huidigPendingDoel      = null; // two-step: goal scorer → assist picker

/* ── Event icon helpers ─────────────────────────────────────── */
function eventIconHtml(type) {
  if (type === "doel")     return '<div class="ev-badge ev-doel">⚽</div>';
  if (type === "geel")     return '<div class="ev-badge ev-geel"><span class="kaart-icon geel"></span></div>';
  if (type === "rood")     return '<div class="ev-badge ev-rood"><span class="kaart-icon rood"></span></div>';
  if (type === "blessure") return '<div class="ev-badge ev-blessure">🩹</div>';
  return "";
}

function eventTypeTitel(type) {
  if (type === "doel")     return "⚽  Doelpuntenmaker";
  if (type === "geel")     return "Gele kaart";
  if (type === "rood")     return "Rode kaart";
  if (type === "blessure") return "🩹  Blessure";
  return "Speler kiezen";
}

/* ── Speler picker ──────────────────────────────────────────── */
function openSpelerPicker(type) {
  huidigEventType   = type;
  huidigPendingDoel = null;
  document.getElementById("speler-picker-titel").textContent = eventTypeTitel(type);
  document.getElementById("speler-picker-minuut").value = "";
  document.getElementById("speler-picker-zoek").value   = "";
  const minRij = document.querySelector(".picker-minuut-rij");
  if (minRij) minRij.style.display = "";
  renderSpelerPickerLijst("");
  document.getElementById("speler-picker-modal").classList.add("open");
  setTimeout(function () { document.getElementById("speler-picker-minuut").focus(); }, 320);
}

function sluitSpelerPicker() {
  if (huidigPendingDoel !== null) {
    // Picker dismissed during assist step → save goal with no assist
    huidigeEvents.push({ type: "doel", speler: huidigPendingDoel.speler, minuut: huidigPendingDoel.minuut, assist: null });
    huidigPendingDoel = null;
    const minRij = document.querySelector(".picker-minuut-rij");
    if (minRij) minRij.style.display = "";
    renderEventTimeline();
  }
  document.getElementById("speler-picker-modal").classList.remove("open");
  huidigEventType = null;
}

function kiesSpeler(naam) {
  const minuut = parseInt(document.getElementById("speler-picker-minuut").value) || null;

  if (huidigEventType === "doel" && huidigPendingDoel === null) {
    // Step 1: goal scorer picked → now ask for assist
    huidigPendingDoel = { speler: naam, minuut: minuut };
    document.getElementById("speler-picker-titel").textContent = "🅰  Assist (optioneel)";
    const minRij = document.querySelector(".picker-minuut-rij");
    if (minRij) minRij.style.display = "none";
    document.getElementById("speler-picker-zoek").value = "";
    renderSpelerPickerLijst("");
    return; // keep picker open for assist
  }

  if (huidigPendingDoel !== null) {
    // Step 2: assist picker
    huidigeEvents.push({
      type:   "doel",
      speler: huidigPendingDoel.speler,
      minuut: huidigPendingDoel.minuut,
      assist: naam || null,
    });
    huidigPendingDoel = null;
    const minRij = document.querySelector(".picker-minuut-rij");
    if (minRij) minRij.style.display = "";
  } else {
    huidigeEvents.push({ type: huidigEventType, speler: naam, minuut: minuut });
  }

  renderEventTimeline();
  document.getElementById("speler-picker-modal").classList.remove("open");
  huidigEventType = null;
}

function renderSpelerPickerLijst(zoek) {
  const container = document.getElementById("speler-picker-lijst");
  let lijst = alleBeschikbareSpelers.slice();
  if (zoek) {
    const lc = zoek.toLowerCase();
    lijst = lijst.filter(function (s) {
      return s.naam.toLowerCase().includes(lc) ||
             (s.positie || "").toLowerCase().includes(lc) ||
             String(s.rugnummer || "").includes(lc);
    });
  }
  lijst.sort(function (a, b) { return (a.rugnummer || 99) - (b.rugnummer || 99); });

  container.innerHTML = `
    <div class="picker-speler-item picker-leeg" data-naam="">
      <div class="picker-speler-cirkel" style="opacity:0.4">–</div>
      <div class="picker-speler-info">
        <div class="picker-speler-naam" style="color:var(--inkt-zacht)">Geen / onbekend</div>
      </div>
    </div>
    ${lijst.map(function (s) { return `
      <div class="picker-speler-item" data-naam="${escapeHtml(s.naam)}">
        <div class="picker-speler-cirkel ${getPKlasse(s.positie)}">${s.rugnummer || "?"}</div>
        <div class="picker-speler-info">
          <div class="picker-speler-naam">${escapeHtml(s.naam)}</div>
          <div class="picker-speler-sub">${escapeHtml(s.positie || "")}</div>
        </div>
        <div class="picker-speler-stats">
          <span>⚽ ${s.goals || 0}</span>
          <span style="margin-left:4px">🅰 ${s.assists || 0}</span>
          <span style="margin-left:4px">🟨 ${s.gele_kaarten || 0}</span>
        </div>
      </div>`; }).join("") ||
    '<div style="padding:24px;text-align:center;color:var(--inkt-zacht);font-size:14px">Geen spelers gevonden</div>'}`;

  container.querySelectorAll(".picker-speler-item").forEach(function (item) {
    item.addEventListener("click", function () { kiesSpeler(item.dataset.naam); });
  });
}

/* ── Render wedstrijden lijst ───────────────────────────────── */
function renderWedstrijden() {
  const container = document.getElementById("wedstrijd-lijst");
  if (!container) return;

  const lijst = alleWedstrijden.filter(function (w) {
    const s = getStatus(w);
    return huidigeTab === "aankomend" ? s === "gepland" : s === "gespeeld";
  }).sort(function (a, b) {
    return huidigeTab === "aankomend"
      ? new Date(a.datum) - new Date(b.datum)
      : new Date(b.datum) - new Date(a.datum);
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
    const d          = new Date(w.datum);
    const isHandmatig = !!w.id;
    const status     = getStatus(w);

    const thuisBadge = w.thuis_uit === "thuis"
      ? '<span class="badge badge-groen">Thuis</span>'
      : '<span class="badge badge-grijs">Uit</span>';

    let rechts = status === "gespeeld" && w.score_eigen !== null && w.score_eigen !== undefined
      ? `<div class="wedstrijd-score">${w.score_eigen} – ${w.score_tegenstander}</div>
         ${resultaatBadge(Number(w.score_eigen), Number(w.score_tegenstander))}`
      : `<div class="wedstrijd-tijd">${d.toLocaleTimeString("nl-NL",{hour:"2-digit",minute:"2-digit"})}</div>`;

    // Compact event preview
    const allev = []
      .concat((w.doelpunten || []).map(function(e){ return {type:"doel",   speler:e.speler, minuut:e.minuut}; }))
      .concat((w.kaarten    || []).map(function(e){ return {type:e.type,   speler:e.speler, minuut:e.minuut}; }))
      .concat((w.blessures  || []).map(function(e){ return {type:"blessure",speler:e.speler,minuut:e.minuut}; }))
      .sort(function(a,b){ return (a.minuut||999)-(b.minuut||999); });

    const extraInfo = isHandmatig && allev.length
      ? `<div class="wedstrijd-events-preview">${allev.slice(0,4).map(function(e){
          const icon = e.type==="doel"?"⚽":e.type==="geel"?"🟡":e.type==="rood"?"🔴":"🩹";
          return `<span>${icon} ${escapeHtml((e.speler||"").split(" ")[0])}${e.minuut?" "+e.minuut+"'":""}</span>`;
        }).join(" · ")}</div>` : "";

    return `
      <div class="glass-kaart wedstrijd-kaart${isHandmatig ? " wedstrijd-handmatig" : ""}" data-index="${i}">
        <div class="wedstrijd-datum-blok">
          <div class="wedstrijd-datum-dag">${d.getDate()}</div>
          <div class="wedstrijd-datum-mnd">${d.toLocaleDateString("nl-NL",{month:"short"})}</div>
        </div>
        <div class="wedstrijd-midden">
          <div class="wedstrijd-teams">${escapeHtml(TEAM_NAAM)} vs ${escapeHtml(w.tegenstander)}</div>
          <div style="display:flex;gap:5px;margin-top:5px;flex-wrap:wrap;align-items:center">
            ${thuisBadge}
            ${w.locatie ? `<span class="badge badge-grijs">📍 ${escapeHtml(w.locatie)}</span>` : ""}
          </div>
          ${extraInfo}
        </div>
        <div class="wedstrijd-rechts">
          ${rechts}
          ${isHandmatig ? `<button class="wedstrijd-bewerk bewerk-btn" data-index="${i}">✏️</button>` : ""}
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
      openUitslagModal(gerenderdeLijst[parseInt(btn.dataset.index)]);
    });
  });
}

/* ── Uitslag modal: timeline ────────────────────────────────── */
function renderEventTimeline() {
  const container = document.getElementById("events-timeline");
  if (!container) return;

  if (huidigeEvents.length === 0) {
    container.innerHTML = '<div class="events-leeg">Gebruik de knoppen hieronder om events toe te voegen</div>';
    return;
  }

  const metIdx = huidigeEvents.map(function (ev, i) {
    return { type: ev.type, speler: ev.speler, minuut: ev.minuut, assist: ev.assist || null, origIdx: i };
  }).sort(function (a, b) { return (a.minuut || 999) - (b.minuut || 999); });

  container.innerHTML = metIdx.map(function (ev) {
    const assistHtml = ev.type === "doel" && ev.assist
      ? `<div class="ev-assist">🅰 ${escapeHtml(ev.assist)}</div>`
      : "";
    return `
      <div class="ev-rij">
        ${eventIconHtml(ev.type)}
        <div class="ev-namen">
          <div class="ev-naam">${escapeHtml(ev.speler || "Onbekend")}</div>
          ${assistHtml}
        </div>
        ${ev.minuut ? `<div class="ev-min">${ev.minuut}'</div>` : ""}
        <button class="ev-del" data-idx="${ev.origIdx}">×</button>
      </div>`;
  }).join("");

  container.querySelectorAll(".ev-del").forEach(function (btn) {
    btn.addEventListener("click", function () {
      huidigeEvents.splice(parseInt(btn.dataset.idx), 1);
      renderEventTimeline();
    });
  });
}

function openUitslagModal(w) {
  huidigeBewerking = w;
  document.getElementById("uitslag-modal-titel").textContent = w.tegenstander || "Uitslag";
  document.getElementById("uitslag-tegenstander-label").textContent = w.tegenstander || "Tegenstander";
  document.getElementById("uitslag-score-eigen").value       = w.score_eigen        != null ? w.score_eigen        : "";
  document.getElementById("uitslag-score-tegenstander").value = w.score_tegenstander != null ? w.score_tegenstander : "";
  document.getElementById("uitslag-fout").textContent        = "";

  huidigeEvents = [];
  (w.doelpunten || []).forEach(function (d) { huidigeEvents.push({ type: "doel",     speler: d.speler, minuut: d.minuut, assist: d.assist || null }); });
  (w.kaarten    || []).forEach(function (k) { huidigeEvents.push({ type: k.type,     speler: k.speler, minuut: k.minuut }); });
  (w.blessures  || []).forEach(function (b) { huidigeEvents.push({ type: "blessure", speler: b.speler, minuut: b.minuut }); });

  renderEventTimeline();
  document.getElementById("uitslag-modal").classList.add("open");
}

function sluitUitslagModal() {
  document.getElementById("uitslag-modal").classList.remove("open");
  huidigeBewerking = null;
}

/* ── Speler stats diff ──────────────────────────────────────── */
async function werkSpelerStatsbij(oudeDoelpunten, nieuweDoelpunten, oudeKaarten, nieuweKaarten) {
  const diff = {};
  function voegToe(naam, veld, delta) {
    const s = vindSpeler(naam); if (!s) return;
    if (!diff[s.id]) diff[s.id] = { speler: s, goals: 0, assists: 0, gele_kaarten: 0, rode_kaarten: 0 };
    diff[s.id][veld] += delta;
  }
  (oudeDoelpunten  || []).forEach(function (d) { voegToe(d.speler, "goals", -1); if (d.assist) voegToe(d.assist, "assists", -1); });
  (nieuweDoelpunten|| []).forEach(function (d) { voegToe(d.speler, "goals", +1); if (d.assist) voegToe(d.assist, "assists", +1); });
  (oudeKaarten     || []).forEach(function (k) { voegToe(k.speler, k.type==="rood"?"rode_kaarten":"gele_kaarten", -1); });
  (nieuweKaarten   || []).forEach(function (k) { voegToe(k.speler, k.type==="rood"?"rode_kaarten":"gele_kaarten", +1); });

  const patches = Object.values(diff)
    .filter(function (d) { return d.goals||d.assists||d.gele_kaarten||d.rode_kaarten; })
    .map(function (d) {
      const s = d.speler, body = {};
      if (d.goals)        body.goals        = Math.max(0, (s.goals||0)        + d.goals);
      if (d.assists)      body.assists      = Math.max(0, (s.assists||0)      + d.assists);
      if (d.gele_kaarten) body.gele_kaarten = Math.max(0, (s.gele_kaarten||0) + d.gele_kaarten);
      if (d.rode_kaarten) body.rode_kaarten = Math.max(0, (s.rode_kaarten||0) + d.rode_kaarten);
      return supaPatch("spelers", s.id, body);
    });

  await Promise.allSettled(patches);

  Object.values(diff).forEach(function (d) {
    const s = alleBeschikbareSpelers.find(function (sp) { return sp.id === d.speler.id; });
    if (!s) return;
    if (d.goals)        s.goals        = Math.max(0, (s.goals||0)        + d.goals);
    if (d.assists)      s.assists      = Math.max(0, (s.assists||0)      + d.assists);
    if (d.gele_kaarten) s.gele_kaarten = Math.max(0, (s.gele_kaarten||0) + d.gele_kaarten);
    if (d.rode_kaarten) s.rode_kaarten = Math.max(0, (s.rode_kaarten||0) + d.rode_kaarten);
  });
}

/* ── Uitslag opslaan ────────────────────────────────────────── */
async function slaatUitslagOp() {
  if (!huidigeBewerking?.id) return;

  const scoreEigen = parseInt(document.getElementById("uitslag-score-eigen").value);
  const scoreTegen = parseInt(document.getElementById("uitslag-score-tegenstander").value);
  if (isNaN(scoreEigen) || isNaN(scoreTegen) || scoreEigen < 0 || scoreTegen < 0) {
    document.getElementById("uitslag-fout").textContent = "Vul een geldige score in.";
    return;
  }

  const doelpunten = huidigeEvents.filter(function(e){return e.type==="doel";})
    .map(function(e){return {speler:e.speler, minuut:e.minuut, assist: e.assist || null};});
  const kaarten = huidigeEvents.filter(function(e){return e.type==="geel"||e.type==="rood";})
    .map(function(e){return {speler:e.speler, minuut:e.minuut, type:e.type};});
  const blessures = huidigeEvents.filter(function(e){return e.type==="blessure";})
    .map(function(e){return {speler:e.speler, minuut:e.minuut};});

  const btn = document.getElementById("uitslag-opslaan-btn");
  btn.textContent = "Opslaan…"; btn.disabled = true;
  document.getElementById("uitslag-fout").textContent = "";

  try {
    const r = await supaPatch("wedstrijden", huidigeBewerking.id, {
      status:             "gespeeld",
      score_eigen:        scoreEigen,
      score_tegenstander: scoreTegen,
      doelpunten:         doelpunten.length ? doelpunten : null,
      kaarten:            kaarten.length    ? kaarten    : null,
      blessures:          blessures.length  ? blessures  : null,
    });
    if (!r.ok) throw new Error(r.status);

    await werkSpelerStatsbij(
      huidigeBewerking.doelpunten || [],
      doelpunten,
      huidigeBewerking.kaarten    || [],
      kaarten
    );

    sluitUitslagModal();
    laadWedstrijden();
  } catch (e) {
    document.getElementById("uitslag-fout").textContent = "Opslaan mislukt. Probeer opnieuw.";
  } finally {
    btn.textContent = "Opslaan"; btn.disabled = false;
  }
}

/* ── Laden ──────────────────────────────────────────────────── */
async function laadWedstrijden() {
  const container = document.getElementById("wedstrijd-lijst");
  if (!container) return;
  container.innerHTML = '<div class="skeleton skeleton-kaart"></div>'.repeat(3);

  try {
    const [r0, r1, r2] = await Promise.allSettled([
      sportlinkFetch("programma", { aantaldagen: 120, gebruiklokaleteamgegevens: "JA" }),
      sportlinkFetch("uitslagen",  { aantaldagen: 120, gebruiklokaleteamgegevens: "JA" }),
      supaFetch("wedstrijden", { select: "*", order: "datum.asc" }),
    ]);
    const gepland  = (r0.value||[]).filter(function(i){return isOnsTeam(i.teamnaam);}).map(function(i){return maakWedstrijdObject(i,"gepland");});
    const gespeeld = (r1.value||[]).filter(function(i){return isOnsTeam(i.teamnaam);}).map(function(i){return maakWedstrijdObject(i,"gespeeld");});
    alleWedstrijden = gepland.concat(gespeeld).concat(r2.value||[]);
    renderWedstrijden();
  } catch (e) {
    container.innerHTML = `<div class="leeg-staat"><div class="leeg-icoon">⚠️</div><div class="leeg-tekst">Kon wedstrijden niet laden</div></div>`;
  }
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  // Tabs
  document.querySelectorAll(".tab-switch-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-switch-item").forEach(function (b) { b.classList.remove("actief"); });
      btn.classList.add("actief");
      huidigeTab = btn.dataset.tab;
      renderWedstrijden();
    });
  });

  // Uitslag modal
  document.getElementById("uitslag-modal-sluiten").addEventListener("click", sluitUitslagModal);
  document.getElementById("uitslag-modal").addEventListener("click", function (e) { if (e.target===this) sluitUitslagModal(); });
  document.getElementById("uitslag-opslaan-btn").addEventListener("click", slaatUitslagOp);

  // Action buttons (⚽ 🟡 🔴 🩹)
  document.querySelectorAll(".event-actie-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { openSpelerPicker(btn.dataset.type); });
  });

  // Speler picker
  document.getElementById("speler-picker-sluiten").addEventListener("click", sluitSpelerPicker);
  document.getElementById("speler-picker-modal").addEventListener("click", function (e) { if (e.target===this) sluitSpelerPicker(); });
  document.getElementById("speler-picker-zoek").addEventListener("input", function () {
    renderSpelerPickerLijst(this.value.trim());
  });

  // Laad spelers (inclusief assists) voor picker, dan wedstrijden
  supaFetch("spelers", { select: "id,naam,rugnummer,positie,goals,assists,gele_kaarten,rode_kaarten", order: "rugnummer.asc" })
    .then(function (d) { alleBeschikbareSpelers = d || []; })
    .catch(function () {})
    .finally(laadWedstrijden);
});
