/* ============================================================
   ASC Nieuwland 3 — Dashboard JS
   ============================================================ */

/* ── Helpers ───────────────────────────────────────────────── */
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

function nlDatum(datumStr) {
  const d = new Date(datumStr);
  return d.toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function dagTot(datumStr) {
  const nu    = new Date();
  const doel  = new Date(datumStr);
  const diff  = Math.ceil((doel - nu) / (1000 * 60 * 60 * 24));
  return diff;
}

function resultaatBadge(eigen, tegenstander) {
  if (eigen > tegenstander)  return '<span class="badge badge-winst">W</span>';
  if (eigen < tegenstander)  return '<span class="badge badge-verlies">V</span>';
  return '<span class="badge badge-gelijk">G</span>';
}

function thuis_uit_badge(thuis_uit) {
  return thuis_uit === "thuis"
    ? '<span class="badge badge-groen">Thuis</span>'
    : '<span class="badge badge-grijs">Uit</span>';
}

/* ── Header datum ──────────────────────────────────────────── */
function laadDatum() {
  const nu = new Date();
  const weekdag = nu.toLocaleDateString("nl-NL", { weekday: "long" });
  const datum   = nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const el = document.getElementById("dash-datum");
  if (el) {
    el.textContent = weekdag.charAt(0).toUpperCase() + weekdag.slice(1) + ", " + datum;
  }
}

/* ── Volgende wedstrijd ─────────────────────────────────────── */
async function laadVolgendeWedstrijd() {
  const container = document.getElementById("volgende-wedstrijd");
  if (!container) return;

  try {
    const nu = new Date().toISOString();
    const data = await supaFetch("wedstrijden", {
      select: "*",
      status: "eq.gepland",
      datum:  "gte." + nu,
      order:  "datum.asc",
      limit:  "1",
    });

    if (!data || data.length === 0) {
      container.innerHTML = leegState("📅", "Geen geplande wedstrijden", "Er staan geen wedstrijden ingepland.");
      return;
    }

    const w   = data[0];
    const dag = dagTot(w.datum);
    const datumStr = new Date(w.datum).toLocaleDateString("nl-NL", {
      weekday: "short", day: "numeric", month: "short",
    });
    const tijdStr = new Date(w.datum).toLocaleTimeString("nl-NL", {
      hour: "2-digit", minute: "2-digit",
    });

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
          ${thuis_uit_badge(w.thuis_uit)}
          <span class="badge badge-wit">📅 ${datumStr}</span>
          <span class="badge badge-wit">🕐 ${tijdStr}</span>
          ${w.locatie ? `<span class="badge badge-wit">📍 ${escapeHtml(w.locatie)}</span>` : ""}
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = foutState("Kon wedstrijd niet laden.");
  }
}

/* ── Laatste uitslag ─────────────────────────────────────────── */
async function laadLaatsteUitslag() {
  const container = document.getElementById("laatste-uitslag");
  if (!container) return;

  try {
    const data = await supaFetch("wedstrijden", {
      select: "*",
      status: "eq.gespeeld",
      order:  "datum.desc",
      limit:  "1",
    });

    if (!data || data.length === 0) {
      container.innerHTML = leegState("🏆", "Nog geen uitslagen", "Er zijn nog geen wedstrijden gespeeld.");
      return;
    }

    const w = data[0];
    const datumStr = new Date(w.datum).toLocaleDateString("nl-NL", {
      day: "numeric", month: "long",
    });

    container.innerHTML = `
      <div style="padding:20px">
        <div class="sectie-label" style="margin:0 0 8px">Laatste uitslag</div>
        <div class="flex-between" style="align-items:flex-start">
          <div>
            <div style="font-size:14px;color:var(--inkt-zacht);margin-bottom:6px">${escapeHtml(TEAM_NAAM)} vs ${escapeHtml(w.tegenstander)}</div>
            <div class="score-groot">${w.score_eigen ?? "–"} – ${w.score_tegenstander ?? "–"}</div>
          </div>
          <div class="flex" style="flex-direction:column;align-items:flex-end;gap:8px">
            ${resultaatBadge(w.score_eigen, w.score_tegenstander)}
            ${thuis_uit_badge(w.thuis_uit)}
            <span style="font-size:12px;color:var(--inkt-zacht)">${datumStr}</span>
          </div>
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = foutState("Kon uitslag niet laden.");
  }
}

/* ── Snelle stats ───────────────────────────────────────────── */
async function laadStats() {
  const container = document.getElementById("snelle-stats");
  if (!container) return;

  // Toon skeleton
  container.innerHTML = skeletonStats();

  try {
    const data = await supaFetch("wedstrijden", {
      select: "score_eigen,score_tegenstander,status",
    });

    const gespeeld = (data || []).filter(w => w.status === "gespeeld");
    const gewonnen = gespeeld.filter(w => w.score_eigen > w.score_tegenstander).length;
    const doelpunten = gespeeld.reduce(function (sum, w) {
      return sum + (w.score_eigen || 0);
    }, 0);

    container.innerHTML = `
      <div class="stat-pill">
        <div class="stat-getal">${doelpunten}</div>
        <div class="stat-label">Doelpunten</div>
      </div>
      <div class="stat-pill">
        <div class="stat-getal">${gespeeld.length}</div>
        <div class="stat-label">Gespeeld</div>
      </div>
      <div class="stat-pill">
        <div class="stat-getal">${gewonnen}</div>
        <div class="stat-label">Gewonnen</div>
      </div>`;
  } catch (e) {
    container.innerHTML = `
      <div class="stat-pill"><div class="stat-getal">–</div><div class="stat-label">Doelpunten</div></div>
      <div class="stat-pill"><div class="stat-getal">–</div><div class="stat-label">Gespeeld</div></div>
      <div class="stat-pill"><div class="stat-getal">–</div><div class="stat-label">Gewonnen</div></div>`;
  }
}

/* ── Stand positie ──────────────────────────────────────────── */
async function laadStandPositie() {
  const container = document.getElementById("stand-positie");
  if (!container) return;

  try {
    const data = await supaFetch("stand", {
      select: "*",
      order:  "punten.desc",
    });

    if (!data || data.length === 0) {
      container.innerHTML = leegState("📊", "Stand niet beschikbaar", "");
      return;
    }

    const idx = data.findIndex(function (r) {
      return r.team && r.team.toLowerCase().includes("nieuwland 3");
    });

    const positie = idx === -1 ? "–" : idx + 1;
    const rij = idx === -1 ? null : data[idx];

    container.innerHTML = `
      <div class="positie-kaart">
        <div class="positie-getal">#${positie}</div>
        <div class="positie-info">
          <div class="label">Klassering</div>
          <div class="team">${TEAM_NAAM}</div>
          ${rij ? `<div style="font-size:13px;color:var(--inkt-zacht);margin-top:4px">
            ${rij.punten} ptn · ${rij.gespeeld} gespeeld
          </div>` : ""}
        </div>
      </div>`;
  } catch (e) {
    container.innerHTML = foutState("Kon stand niet laden.");
  }
}

/* ── Volgende training ──────────────────────────────────────── */
async function laadVolgendeTraining() {
  const container = document.getElementById("volgende-training");
  if (!container) return;

  try {
    const nu = new Date().toISOString();
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

    const t = data[0];
    const datumStr = new Date(t.datum).toLocaleDateString("nl-NL", {
      weekday: "long", day: "numeric", month: "long",
    });
    const tijdStr = new Date(t.datum).toLocaleTimeString("nl-NL", {
      hour: "2-digit", minute: "2-digit",
    });

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

/* ── Hulpfuncties ───────────────────────────────────────────── */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  laadDatum();
  laadVolgendeWedstrijd();
  laadLaatsteUitslag();
  laadStats();
  laadStandPositie();
  laadVolgendeTraining();

  // Uitlogknop
  const uitlogBtn = document.getElementById("uitlog-btn");
  if (uitlogBtn) {
    uitlogBtn.addEventListener("click", logUit);
  }
});
