/* ============================================================
   ASC Nieuwland 3 — Dashboard JS
   Wedstrijden/stand: Sportlink | Training: Supabase
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

function dagTot(datumStr) {
  const nu   = new Date();
  const doel = new Date(datumStr);
  return Math.ceil((doel - nu) / (1000 * 60 * 60 * 24));
}

function resultaatBadge(eigen, tegenstander) {
  if (eigen > tegenstander)  return '<span class="badge badge-winst">W</span>';
  if (eigen < tegenstander)  return '<span class="badge badge-verlies">V</span>';
  return '<span class="badge badge-gelijk">G</span>';
}

function thuisUitBadge(thuis_uit) {
  return thuis_uit === "thuis"
    ? '<span class="badge badge-groen">Thuis</span>'
    : '<span class="badge badge-grijs">Uit</span>';
}

function isEigenTeam(naam) {
  return naam && naam.toLowerCase().includes("nieuwland 3");
}

function maakWedstrijdObject(item, status) {
  const eigenTeamNaam = item.eigenteam || "";
  const thuisIsEigen  = eigenTeamNaam
    ? item.thuisteam === eigenTeamNaam
    : isEigenTeam(item.thuisteam);

  const tijdKort = (item.aanvangstijd || "00:00").substring(0, 5);
  const datum    = new Date(item.datum + "T" + tijdKort + ":00").toISOString();

  return {
    datum,
    tegenstander:       thuisIsEigen ? item.uitteam : item.thuisteam,
    thuis_uit:          thuisIsEigen ? "thuis" : "uit",
    locatie:            item.accommodatie || null,
    status,
    score_eigen:        status === "gespeeld" ? Number(thuisIsEigen ? item.thuisdoelpunten : item.uitdoelpunten) : null,
    score_tegenstander: status === "gespeeld" ? Number(thuisIsEigen ? item.uitdoelpunten   : item.thuisdoelpunten) : null,
  };
}

function leegState(icoon, tekst, sub) {
  return `<div class="leeg-staat"><div class="leeg-icoon">${icoon}</div>
    <div class="leeg-tekst">${tekst}</div>
    <div class="leeg-sub">${sub}</div></div>`;
}

function foutState(tekst) {
  return `<div class="leeg-staat"><div class="leeg-icoon">⚠️</div>
    <div class="leeg-tekst">${tekst}</div>
    <div class="leeg-sub">Controleer je verbinding en probeer opnieuw.</div></div>`;
}

function skeletonStats() {
  return Array(3).fill(0).map(function () {
    return `<div class="stat-pill">
      <div class="skeleton" style="height:32px;width:40px;margin:0 auto 8px"></div>
      <div class="skeleton" style="height:10px;width:60px;margin:0 auto"></div>
    </div>`;
  }).join("");
}

/* ── Header datum ──────────────────────────────────────────── */
function laadDatum() {
  const nu      = new Date();
  const weekdag = nu.toLocaleDateString("nl-NL", { weekday: "long" });
  const datum   = nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const el = document.getElementById("dash-datum");
  if (el) el.textContent = weekdag.charAt(0).toUpperCase() + weekdag.slice(1) + ", " + datum;
}

/* ── Renders ─────────────────────────────────────────────────── */
function renderVolgendeWedstrijd(programma) {
  const container = document.getElementById("volgende-wedstrijd");
  if (!container) return;

  const nu = new Date();
  const gesorteerd = (programma || [])
    .map(function (item) { return maakWedstrijdObject(item, "gepland"); })
    .filter(function (w) { return new Date(w.datum) >= nu; })
    .sort(function (a, b) { return new Date(a.datum) - new Date(b.datum); });

  if (gesorteerd.length === 0) {
    container.innerHTML = leegState("📅", "Geen geplande wedstrijden", "Er staan geen wedstrijden ingepland.");
    return;
  }

  const w        = gesorteerd[0];
  const dag      = dagTot(w.datum);
  const datumStr = new Date(w.datum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  const tijdStr  = new Date(w.datum).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  container.innerHTML = `
    <div class="volgende-wedstrijd">
      <div class="flex-between">
        <div>
          <div class="sectie-label" style="margin:0 0 4px">Volgende wedstrijd</div>
          <div class="tegenstander">${TEAM_NAAM}<br>vs ${escapeHtml(w.tegenstander)}</div>
        </div>
        <div style="text-align:center">
          ${dag > 0
            ? `<div class="countdown">${dag}</div><div class="countdown-label">dag${dag === 1 ? "" : "en"}</div>`
            : dag === 0
            ? `<div class="countdown" style="font-size:22px">Vandaag!</div>`
            : `<div class="countdown" style="font-size:22px">Nu!</div>`}
        </div>
      </div>
      <div class="flex flex-gap-8" style="margin-top:8px;flex-wrap:wrap">
        ${thuisUitBadge(w.thuis_uit)}
        <span class="badge badge-wit">📅 ${datumStr}</span>
        <span class="badge badge-wit">🕐 ${tijdStr}</span>
        ${w.locatie ? `<span class="badge badge-wit">📍 ${escapeHtml(w.locatie)}</span>` : ""}
      </div>
    </div>`;
}

function renderLaatsteUitslag(uitslag) {
  const container = document.getElementById("laatste-uitslag");
  if (!container) return;

  const gesorteerd = (uitslag || [])
    .map(function (item) { return maakWedstrijdObject(item, "gespeeld"); })
    .sort(function (a, b) { return new Date(b.datum) - new Date(a.datum); });

  if (gesorteerd.length === 0) {
    container.innerHTML = leegState("🏆", "Nog geen uitslagen", "Er zijn nog geen wedstrijden gespeeld.");
    return;
  }

  const w        = gesorteerd[0];
  const datumStr = new Date(w.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });

  container.innerHTML = `
    <div style="padding:20px">
      <div class="sectie-label" style="margin:0 0 8px">Laatste uitslag</div>
      <div class="flex-between" style="align-items:flex-start">
        <div>
          <div style="font-size:14px;color:var(--inkt-zacht);margin-bottom:6px">${escapeHtml(TEAM_NAAM)} vs ${escapeHtml(w.tegenstander)}</div>
          <div class="score-groot">${w.score_eigen} – ${w.score_tegenstander}</div>
        </div>
        <div class="flex" style="flex-direction:column;align-items:flex-end;gap:8px">
          ${resultaatBadge(w.score_eigen, w.score_tegenstander)}
          ${thuisUitBadge(w.thuis_uit)}
          <span style="font-size:12px;color:var(--inkt-zacht)">${datumStr}</span>
        </div>
      </div>
    </div>`;
}

function renderStats(stand, uitslag) {
  const container = document.getElementById("snelle-stats");
  if (!container) return;

  // Gebruik ons team-rij uit de stand voor de snelle stats
  const eigenRij = (stand || []).find(function (r) {
    return isEigenTeam(r.teamnaam || r.team);
  });

  let doelpunten, gespeeld, gewonnen;

  if (eigenRij) {
    doelpunten = eigenRij.doelpunten_voor ?? eigenRij.goals_voor ?? 0;
    gespeeld   = eigenRij.wedstrijden    ?? eigenRij.gespeeld    ?? 0;
    gewonnen   = eigenRij.gewonnen       ?? 0;
  } else {
    // Fallback: bereken uit uitslag-lijst
    const lijst = (uitslag || []).map(function (item) { return maakWedstrijdObject(item, "gespeeld"); });
    doelpunten  = lijst.reduce(function (sum, w) { return sum + (w.score_eigen || 0); }, 0);
    gespeeld    = lijst.length;
    gewonnen    = lijst.filter(function (w) { return w.score_eigen > w.score_tegenstander; }).length;
  }

  container.innerHTML = `
    <div class="stat-pill">
      <div class="stat-getal">${doelpunten}</div>
      <div class="stat-label">Doelpunten</div>
    </div>
    <div class="stat-pill">
      <div class="stat-getal">${gespeeld}</div>
      <div class="stat-label">Gespeeld</div>
    </div>
    <div class="stat-pill">
      <div class="stat-getal">${gewonnen}</div>
      <div class="stat-label">Gewonnen</div>
    </div>`;
}

function renderStandPositie(stand) {
  const container = document.getElementById("stand-positie");
  if (!container) return;

  if (!stand || stand.length === 0) {
    container.innerHTML = leegState("📊", "Stand niet beschikbaar", "");
    return;
  }

  const idx     = stand.findIndex(function (r) { return isEigenTeam(r.teamnaam || r.team); });
  const positie = idx === -1 ? "–" : (stand[idx].positie ?? idx + 1);
  const rij     = idx === -1 ? null : stand[idx];

  container.innerHTML = `
    <div class="positie-kaart">
      <div class="positie-getal">#${positie}</div>
      <div class="positie-info">
        <div class="label">Klassering</div>
        <div class="team">${TEAM_NAAM}</div>
        ${rij ? `<div style="font-size:13px;color:var(--inkt-zacht);margin-top:4px">
          ${rij.punten ?? 0} ptn · ${rij.wedstrijden ?? rij.gespeeld ?? 0} gespeeld
        </div>` : ""}
      </div>
    </div>`;
}

/* ── Volgende training (Supabase) ───────────────────────────── */
async function laadVolgendeTraining() {
  const container = document.getElementById("volgende-training");
  if (!container) return;

  try {
    const nu   = new Date().toISOString();
    const data = await supaFetch("trainingen", {
      select: "*",
      datum:  "gte." + nu,
      order:  "datum.asc",
      limit:  "1",
    });

    if (!data || data.length === 0) {
      container.innerHTML = `<div style="padding:16px 20px;color:var(--inkt-zacht);font-size:14px">Geen training gepland</div>`;
      return;
    }

    const t        = data[0];
    const datumStr = new Date(t.datum).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
    const tijdStr  = new Date(t.datum).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

    container.innerHTML = `
      <div style="padding:16px 20px">
        <div class="sectie-label" style="margin:0 0 6px">Volgende training</div>
        <div style="font-size:16px;font-weight:700;color:var(--inkt)">${escapeHtml(t.titel || "Training")}</div>
        <div style="font-size:13px;color:var(--inkt-zacht);margin-top:4px">
          🏃 ${datumStr} om ${tijdStr}
        </div>
        ${t.beschrijving ? `<div style="font-size:13px;color:var(--inkt-zacht);margin-top:6px">${escapeHtml(t.beschrijving)}</div>` : ""}
      </div>`;
  } catch (e) {
    container.innerHTML = foutState("Kon training niet laden.");
  }
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  laadDatum();

  // Haal alle Sportlink-data in één keer parallel op
  Promise.allSettled([
    sportlinkFetch("programma", { aantaldagen: 120, gebruiklokaleteamgegevens: "JA" }),
    sportlinkFetch("uitslagen", { aantaldagen: 120, gebruiklokaleteamgegevens: "JA" }),
    sportlinkFetch("stand"),
  ]).then(function (results) {
    const programma = results[0].status === "fulfilled" ? results[0].value : null;
    const uitslag   = results[1].status === "fulfilled" ? results[1].value : null;
    const stand     = results[2].status === "fulfilled" ? results[2].value : null;

    if (programma !== null) {
      renderVolgendeWedstrijd(programma);
    } else {
      const el = document.getElementById("volgende-wedstrijd");
      if (el) el.innerHTML = foutState("Kon programma niet laden.");
    }

    if (uitslag !== null) {
      renderLaatsteUitslag(uitslag);
    } else {
      const el = document.getElementById("laatste-uitslag");
      if (el) el.innerHTML = foutState("Kon uitslag niet laden.");
    }

    renderStats(stand, uitslag);

    if (stand !== null) {
      renderStandPositie(stand);
    } else {
      const el = document.getElementById("stand-positie");
      if (el) el.innerHTML = foutState("Kon stand niet laden.");
    }
  });

  laadVolgendeTraining();

  const uitlogBtn = document.getElementById("uitlog-btn");
  if (uitlogBtn) uitlogBtn.addEventListener("click", logUit);
});
