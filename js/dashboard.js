/* ============================================================
   ASC Nieuwland 3 — Dashboard JS
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

function isOnsTeam(teamnaam) {
  if (!teamnaam) return false;
  return teamnaam.toLowerCase() === SPORTLINK_TEAM_NAAM.toLowerCase();
}

function isEigenTeamStand(naam) {
  if (!naam) return false;
  return naam.toLowerCase() === SPORTLINK_TEAM_NAAM.toLowerCase();
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

/* ── Header datum ──────────────────────────────────────────── */
function laadDatum() {
  const nu      = new Date();
  const weekdag = nu.toLocaleDateString("nl-NL", { weekday: "long" });
  const datum   = nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const el = document.getElementById("dash-datum");
  if (el) el.textContent = weekdag.charAt(0).toUpperCase() + weekdag.slice(1) + ", " + datum;
}

/* ── Seizoensoverzicht: Winst / Gelijk / Verlies ───────────── */
function renderStats(stand, uitslag, supaGespeeld) {
  const container = document.getElementById("snelle-stats");
  if (!container) return;

  // Sportlink gespeelde wedstrijden
  const sportlinkLijst = (uitslag || [])
    .filter(function (item) { return isOnsTeam(item.teamnaam); })
    .map(function (item) { return maakWedstrijdObject(item, "gespeeld"); });

  // Supabase gespeelde wedstrijden met score
  const supaLijst = (supaGespeeld || []).filter(function (w) {
    return w.score_eigen !== null && w.score_eigen !== undefined &&
           w.score_tegenstander !== null && w.score_tegenstander !== undefined;
  });

  // Probeer de stand eigenRij voor Sportlink W/G/V
  const eigenRij = (stand || []).find(function (r) { return isEigenTeamStand(r.teamnaam || r.team); });

  let gewonnen, gelijkgespeeld, verloren;

  if (eigenRij && eigenRij.gewonnen !== undefined) {
    // Sportlink stand heeft de officiële cijfers; voeg Supabase eraan toe
    const supaW = supaLijst.filter(function (w) { return Number(w.score_eigen) > Number(w.score_tegenstander); }).length;
    const supaG = supaLijst.filter(function (w) { return Number(w.score_eigen) === Number(w.score_tegenstander); }).length;
    const supaV = supaLijst.filter(function (w) { return Number(w.score_eigen) < Number(w.score_tegenstander); }).length;
    gewonnen       = (eigenRij.gewonnen       ?? 0) + supaW;
    gelijkgespeeld = (eigenRij.gelijkgespeeld ?? eigenRij.gelijk ?? 0) + supaG;
    verloren       = (eigenRij.verloren       ?? 0) + supaV;
  } else {
    // Fallback: bereken alles uit de lijsten
    const alle = sportlinkLijst.concat(supaLijst);
    gewonnen       = alle.filter(function (w) { return Number(w.score_eigen) > Number(w.score_tegenstander); }).length;
    gelijkgespeeld = alle.filter(function (w) { return Number(w.score_eigen) === Number(w.score_tegenstander); }).length;
    verloren       = alle.filter(function (w) { return Number(w.score_eigen) < Number(w.score_tegenstander); }).length;
  }

  container.innerHTML = `
    <div class="stat-pill">
      <div class="stat-getal stat-winst">${gewonnen}</div>
      <div class="stat-label">Winst</div>
    </div>
    <div class="stat-pill">
      <div class="stat-getal stat-gelijk">${gelijkgespeeld}</div>
      <div class="stat-label">Gelijk</div>
    </div>
    <div class="stat-pill">
      <div class="stat-getal stat-verlies">${verloren}</div>
      <div class="stat-label">Verlies</div>
    </div>`;
}

/* ── Volgende wedstrijd (Sportlink + Supabase) ──────────────── */
function renderVolgendeWedstrijd(programma, supaGepland) {
  const container = document.getElementById("volgende-wedstrijd");
  if (!container) return;

  const nu = new Date();

  // Sportlink gepland
  const sportlinkGepland = (programma || [])
    .filter(function (item) { return isOnsTeam(item.teamnaam); })
    .map(function (item) { return maakWedstrijdObject(item, "gepland"); })
    .filter(function (w) { return new Date(w.datum) >= nu; });

  // Supabase gepland (handmatige wedstrijden)
  const supaOpkomend = (supaGepland || [])
    .filter(function (w) { return new Date(w.datum) >= nu; })
    .map(function (w) {
      return {
        datum:         w.datum,
        tegenstander:  w.tegenstander,
        thuis_uit:     w.thuis_uit || "thuis",
        locatie:       w.locatie || null,
        status:        "gepland",
      };
    });

  const alGepland = sportlinkGepland.concat(supaOpkomend)
    .sort(function (a, b) { return new Date(a.datum) - new Date(b.datum); });

  if (alGepland.length === 0) {
    container.innerHTML = leegState("📅", "Geen geplande wedstrijden", "Er staan geen wedstrijden ingepland.");
    return;
  }

  const w        = alGepland[0];
  const dag      = dagTot(w.datum);
  const datumStr = new Date(w.datum).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
  const tijdStr  = new Date(w.datum).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  container.innerHTML = `
    <a href="wedstrijden.html" class="dash-wedstrijd-link">
      <div class="volgende-wedstrijd">
        <div class="flex-between">
          <div>
            <div class="tegenstander">${escapeHtml(TEAM_NAAM)}<br><span style="color:var(--inkt-zacht);font-weight:500">vs</span> ${escapeHtml(w.tegenstander)}</div>
          </div>
          <div style="text-align:center">
            ${dag > 0
              ? `<div class="countdown">${dag}</div><div class="countdown-label">dag${dag === 1 ? "" : "en"}</div>`
              : dag === 0
              ? `<div class="countdown" style="font-size:22px">Vandaag!</div>`
              : `<div class="countdown" style="font-size:22px">Nu!</div>`}
          </div>
        </div>
        <div class="flex flex-gap-8" style="margin-top:10px;flex-wrap:wrap">
          ${thuisUitBadge(w.thuis_uit)}
          <span class="badge badge-wit">📅 ${datumStr}</span>
          <span class="badge badge-wit">🕐 ${tijdStr}</span>
          ${w.locatie ? `<span class="badge badge-wit">📍 ${escapeHtml(w.locatie)}</span>` : ""}
        </div>
        <div class="dash-link-hint">Alle wedstrijden bekijken →</div>
      </div>
    </a>`;
}

/* ── Laatste uitslag (Sportlink + Supabase) ─────────────────── */
function renderLaatsteUitslag(uitslag, supaGespeeld) {
  const container = document.getElementById("laatste-uitslag");
  if (!container) return;

  const sportlinkGespeeld = (uitslag || [])
    .filter(function (item) { return isOnsTeam(item.teamnaam); })
    .map(function (item) { return maakWedstrijdObject(item, "gespeeld"); });

  const supaMetScore = (supaGespeeld || [])
    .filter(function (w) { return w.score_eigen !== null && w.score_eigen !== undefined; })
    .map(function (w) {
      return {
        datum:              w.datum,
        tegenstander:       w.tegenstander,
        thuis_uit:          w.thuis_uit || "thuis",
        score_eigen:        Number(w.score_eigen),
        score_tegenstander: Number(w.score_tegenstander),
        status:             "gespeeld",
        doelpunten:         w.doelpunten || [],
        kaarten:            w.kaarten || [],
      };
    });

  const alleGespeeld = sportlinkGespeeld.concat(supaMetScore)
    .sort(function (a, b) { return new Date(b.datum) - new Date(a.datum); });

  if (alleGespeeld.length === 0) {
    container.innerHTML = leegState("🏆", "Nog geen uitslagen", "Er zijn nog geen wedstrijden gespeeld.");
    return;
  }

  const w        = alleGespeeld[0];
  const datumStr = new Date(w.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" });

  // Doelpunten samenvatting (alleen bij Supabase wedstrijden)
  let doelpuntenHtml = "";
  if (w.doelpunten && w.doelpunten.length > 0) {
    const doel = w.doelpunten.map(function (d) {
      return escapeHtml(d.speler) + (d.minuut ? " <span style='color:var(--inkt-zacht)'>" + d.minuut + "'</span>" : "");
    }).join(" · ");
    doelpuntenHtml = `<div style="font-size:12px;color:var(--inkt-zacht);margin-top:8px">⚽ ${doel}</div>`;
  }

  // Kaarten samenvatting
  let kaartenHtml = "";
  if (w.kaarten && w.kaarten.length > 0) {
    const kaart = w.kaarten.map(function (k) {
      return (k.type === "rood" ? "🔴" : "🟡") + " " + escapeHtml(k.speler) + (k.minuut ? " <span style='color:var(--inkt-zacht)'>" + k.minuut + "'</span>" : "");
    }).join(" · ");
    kaartenHtml = `<div style="font-size:12px;color:var(--inkt-zacht);margin-top:4px">${kaart}</div>`;
  }

  container.innerHTML = `
    <div style="padding:20px">
      <div class="sectie-label" style="margin:0 0 8px">Laatste uitslag</div>
      <div class="flex-between" style="align-items:flex-start">
        <div>
          <div style="font-size:14px;color:var(--inkt-zacht);margin-bottom:6px">${escapeHtml(TEAM_NAAM)} vs ${escapeHtml(w.tegenstander)}</div>
          <div class="score-groot">${w.score_eigen} – ${w.score_tegenstander}</div>
          ${doelpuntenHtml}${kaartenHtml}
        </div>
        <div class="flex" style="flex-direction:column;align-items:flex-end;gap:8px">
          ${resultaatBadge(w.score_eigen, w.score_tegenstander)}
          ${thuisUitBadge(w.thuis_uit)}
          <span style="font-size:12px;color:var(--inkt-zacht)">${datumStr}</span>
        </div>
      </div>
    </div>`;
}

/* ── Stand positie ──────────────────────────────────────────── */
function renderStandPositie(stand) {
  const container = document.getElementById("stand-positie");
  if (!container) return;

  if (!stand || stand.length === 0) {
    container.innerHTML = leegState("📊", "Stand niet beschikbaar", "");
    return;
  }

  const idx     = stand.findIndex(function (r) { return isEigenTeamStand(r.teamnaam || r.team); });
  const positie = idx === -1 ? "–" : (stand[idx].positie ?? idx + 1);
  const rij     = idx === -1 ? null : stand[idx];

  container.innerHTML = `
    <div class="positie-kaart">
      <div class="positie-getal">#${positie}</div>
      <div class="positie-info">
        <div class="label">Klassering</div>
        <div class="team">${escapeHtml(TEAM_NAAM)}</div>
        ${rij ? `<div style="font-size:13px;color:var(--inkt-zacht);margin-top:4px">
          ${rij.punten ?? 0} ptn · ${rij.wedstrijden ?? rij.gespeeld ?? 0} gespeeld
        </div>` : ""}
      </div>
    </div>`;
}

/* ── Kaartenstatus widget ───────────────────────────────────── */
function renderKaartenStatus(spelers) {
  const container = document.getElementById("kaarten-status");
  if (!container) return;

  const risico = (spelers || [])
    .filter(function (s) { return (s.gele_kaarten || 0) >= 2; })
    .sort(function (a, b) { return (b.gele_kaarten || 0) - (a.gele_kaarten || 0); });

  if (risico.length === 0) {
    container.innerHTML = '<div style="padding:12px 20px;font-size:13px;color:var(--inkt-zacht)">Geen spelers in gevaar voor schorsing</div>';
    return;
  }

  container.innerHTML = risico.map(function (s, i) {
    const kaarten = s.gele_kaarten || 0;
    const kleur   = kaarten >= 3 ? "color:var(--rood)" : "color:#a07000";
    const waarschuwing = kaarten >= 3 ? " ⚠️" : "";
    const rand    = i < risico.length - 1 ? "border-bottom:1px solid var(--lijn)" : "";
    return `<div style="display:flex;align-items:center;gap:12px;padding:11px 20px;${rand}">
      <span class="kaart-icon geel" style="flex-shrink:0;width:14px;height:20px"></span>
      <div style="flex:1;font-size:14px;font-weight:600;color:var(--inkt)">${escapeHtml(s.naam)}${waarschuwing}</div>
      <div style="font-size:16px;font-weight:800;${kleur}">${kaarten}×</div>
    </div>`;
  }).join("");
}

/* ── Seizoensgrafiek ────────────────────────────────────────── */
function renderSeizoensgrafiek(alleGespeeld) {
  const container = document.getElementById("seizoensgrafiek");
  if (!container) return;

  const gesorteerd = (alleGespeeld || []).slice()
    .sort(function (a, b) { return new Date(a.datum) - new Date(b.datum); });

  if (gesorteerd.length === 0) {
    container.style.display = "none";
    const lbl = document.getElementById("seizoensgrafiek-label");
    if (lbl) lbl.style.display = "none";
    return;
  }

  const barW = 14, gap = 5, H = 52, barH = 38;
  const totalW = gesorteerd.length * (barW + gap) - gap;

  const bars = gesorteerd.map(function (w, i) {
    const e = Number(w.score_eigen), t = Number(w.score_tegenstander);
    const kleur = e > t ? "#1a7a3c" : e < t ? "#BD2B0B" : "#999";
    const x = i * (barW + gap);
    const datumStr = new Date(w.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
    const score = w.score_eigen + "–" + w.score_tegenstander;
    return `<rect x="${x}" y="${H - barH}" width="${barW}" height="${barH}" rx="4" fill="${kleur}" opacity="0.82">
      <title>${escapeHtml(w.tegenstander)} ${score} · ${datumStr}</title>
    </rect>`;
  }).join("");

  container.innerHTML = `
    <div style="padding:14px 20px 12px">
      <svg width="${totalW}" height="${H}" viewBox="0 0 ${totalW} ${H}" style="width:100%;max-width:100%;display:block;overflow:visible">
        ${bars}
      </svg>
      <div style="display:flex;gap:14px;margin-top:8px;font-size:10px;color:var(--inkt-zacht);font-weight:700;text-transform:uppercase;letter-spacing:0.4px">
        <span style="display:flex;align-items:center;gap:5px"><span style="width:9px;height:9px;background:#1a7a3c;border-radius:2px;display:inline-block"></span>Winst</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:9px;height:9px;background:#999;border-radius:2px;display:inline-block"></span>Gelijk</span>
        <span style="display:flex;align-items:center;gap:5px"><span style="width:9px;height:9px;background:#BD2B0B;border-radius:2px;display:inline-block"></span>Verlies</span>
      </div>
    </div>`;
}

/* ── Weer widget ────────────────────────────────────────────── */
function weerIcon(code) {
  if (code === 0)        return "☀️";
  if (code <= 3)         return "⛅";
  if (code <= 49)        return "🌫️";
  if (code <= 55)        return "🌦️";
  if (code <= 69)        return "🌧️";
  if (code <= 79)        return "❄️";
  if (code <= 84)        return "🌨️";
  return "⛈️";
}

function weerLabel(code) {
  if (code === 0)        return "Helder";
  if (code <= 3)         return "Bewolkt";
  if (code <= 49)        return "Mistig";
  if (code <= 55)        return "Lichte motregen";
  if (code <= 69)        return "Regen";
  if (code <= 79)        return "Sneeuw";
  if (code <= 84)        return "Sneeuwbui";
  return "Onweer";
}

async function laadWeerWidget(datum) {
  const weerSectie = document.getElementById("weer-sectie");
  const container  = document.getElementById("weer-widget");
  if (!container) return;

  const d       = new Date(datum);
  const nu      = new Date();
  const dagsDif = Math.floor((d - nu) / (1000 * 60 * 60 * 24));

  // Only show weather for matches in the next 10 days
  if (dagsDif < 0 || dagsDif > 10) {
    if (weerSectie) weerSectie.style.display = "none";
    return;
  }

  const datumStr = d.toISOString().split("T")[0];
  const lat = 52.37, lon = 4.90; // Amsterdam

  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum" +
      "&timezone=Europe%2FAmsterdam&start_date=" + datumStr + "&end_date=" + datumStr;
    const data = await fetch(url).then(function (r) { return r.json(); });
    const wc  = data.daily.weathercode[0];
    const hi  = Math.round(data.daily.temperature_2m_max[0]);
    const lo  = Math.round(data.daily.temperature_2m_min[0]);
    const mm  = data.daily.precipitation_sum[0];

    container.innerHTML = `
      <div style="padding:14px 20px;display:flex;align-items:center;gap:14px">
        <div style="font-size:36px;line-height:1">${weerIcon(wc)}</div>
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--inkt)">${weerLabel(wc)}</div>
          <div style="font-size:13px;color:var(--inkt-zacht);margin-top:3px">🌡️ ${lo}–${hi}°C · 💧 ${mm} mm neerslag</div>
        </div>
        <div style="margin-left:auto;font-size:11px;color:var(--inkt-zacht);text-align:right">Wedstrijddag<br>verwachting</div>
      </div>`;
  } catch (e) {
    if (weerSectie) weerSectie.style.display = "none";
  }
}

/* ── Mededelingen ────────────────────────────────────────────── */
async function laadMededelingen() {
  const container = document.getElementById("mededelingen-sectie");
  if (!container) return;

  try {
    const data = await supaFetch("mededelingen", {
      select: "*",
      order: "vastgezet.desc,created_at.desc",
      limit: "10",
    });

    if (!data || data.length === 0) {
      container.innerHTML = '<div style="padding:14px 20px;color:var(--inkt-zacht);font-size:14px">Geen mededelingen</div>';
      return;
    }

    container.innerHTML = data.map(function (m) {
      const dt = new Date(m.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      return `
        <div class="mededeling-item">
          ${m.vastgezet ? '<div class="mededeling-vastgezet">📌 Vastgezet</div>' : ""}
          <div class="mededeling-tekst">${escapeHtml(m.tekst)}</div>
          <div class="mededeling-meta">${m.auteur ? escapeHtml(m.auteur) + " · " : ""}${dt}</div>
        </div>`;
    }).join("");
  } catch (e) {
    container.innerHTML = '<div style="padding:14px 20px;color:var(--inkt-zacht);font-size:14px">Kon mededelingen niet laden</div>';
  }
}

function openMededelingModal() {
  document.getElementById("mededeling-modal").classList.add("open");
  document.getElementById("mededeling-tekst-input").value = "";
  document.getElementById("mededeling-auteur-input").value = "";
  document.getElementById("mededeling-fout").textContent = "";
}

function sluitMededelingModal() {
  document.getElementById("mededeling-modal").classList.remove("open");
}

async function slaaMededelingOp() {
  const tekst = document.getElementById("mededeling-tekst-input").value.trim();
  if (!tekst) { document.getElementById("mededeling-fout").textContent = "Vul een bericht in."; return; }

  const btn = document.getElementById("mededeling-opslaan-btn");
  btn.textContent = "Opslaan…"; btn.disabled = true;

  try {
    await fetch(SUPABASE_URL + "mededelingen", {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        tekst: tekst,
        auteur: document.getElementById("mededeling-auteur-input").value.trim() || null,
      }),
    });
    sluitMededelingModal();
    laadMededelingen();
  } catch (e) {
    document.getElementById("mededeling-fout").textContent = "Opslaan mislukt.";
  } finally {
    btn.textContent = "Plaatsen"; btn.disabled = false;
  }
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

  Promise.allSettled([
    sportlinkFetch("programma", { aantaldagen: 120, gebruiklokaleteamgegevens: "NEE" }),
    sportlinkFetch("uitslagen", { aantaldagen: 120, gebruiklokaleteamgegevens: "NEE" }),
    sportlinkFetch("stand"),
    supaFetch("wedstrijden", { select: "*", order: "datum.asc" }),
    supaFetch("spelers", { select: "id,naam,gele_kaarten", order: "naam.asc" }),
  ]).then(function (results) {
    const programma        = results[0].status === "fulfilled" ? results[0].value : null;
    const uitslag          = results[1].status === "fulfilled" ? results[1].value : null;
    const stand            = results[2].status === "fulfilled" ? results[2].value : null;
    const supaWedstrijden  = results[3].status === "fulfilled" ? results[3].value : [];
    const spelers          = results[4].status === "fulfilled" ? results[4].value : [];

    const supaGepland  = (supaWedstrijden || []).filter(function (w) { return (w.status || "gepland") === "gepland"; });
    const supaGespeeld = (supaWedstrijden || []).filter(function (w) { return w.status === "gespeeld"; });

    // Determine volgende wedstrijd for weather widget
    const nu = new Date();
    const sportlinkGepland = (programma || [])
      .filter(function (i) { return i.teamnaam && i.teamnaam.toLowerCase() === SPORTLINK_TEAM_NAAM.toLowerCase(); })
      .map(function (i) { return maakWedstrijdObject(i, "gepland"); })
      .filter(function (w) { return new Date(w.datum) >= nu; });
    const supaOpkomend = (supaGepland || []).filter(function (w) { return new Date(w.datum) >= nu; });
    const alOpkomend   = sportlinkGepland.concat(supaOpkomend).sort(function (a, b) { return new Date(a.datum) - new Date(b.datum); });
    const volgendeW    = alOpkomend[0] || null;

    if (programma !== null || supaGepland.length > 0) {
      renderVolgendeWedstrijd(programma, supaGepland);
    } else {
      const el = document.getElementById("volgende-wedstrijd");
      if (el) el.innerHTML = foutState("Kon programma niet laden.");
    }

    // Weer voor volgende wedstrijd
    if (volgendeW) {
      laadWeerWidget(volgendeW.datum);
    } else {
      const ws = document.getElementById("weer-sectie");
      if (ws) ws.style.display = "none";
    }

    renderLaatsteUitslag(uitslag, supaGespeeld);
    renderStats(stand, uitslag, supaGespeeld);

    // Seizoensgrafiek: Supabase gespeeld + Sportlink gespeeld
    const sportlinkGespeeld = (uitslag || [])
      .filter(function (i) { return i.teamnaam && i.teamnaam.toLowerCase() === SPORTLINK_TEAM_NAAM.toLowerCase(); })
      .map(function (i) { return maakWedstrijdObject(i, "gespeeld"); });
    const alleGespeeld = sportlinkGespeeld.concat(supaGespeeld.filter(function(w){return w.score_eigen!=null;}));
    renderSeizoensgrafiek(alleGespeeld);

    if (stand !== null) {
      renderStandPositie(stand);
    } else {
      const el = document.getElementById("stand-positie");
      if (el) el.innerHTML = foutState("Kon stand niet laden.");
    }

    // Kaartenstatus
    renderKaartenStatus(spelers);
  });

  laadVolgendeTraining();
  laadMededelingen();

  const medFab = document.getElementById("mededeling-fab");
  if (medFab) medFab.addEventListener("click", openMededelingModal);

  const medOverlay = document.getElementById("mededeling-modal");
  if (medOverlay) medOverlay.addEventListener("click", function (e) { if (e.target === medOverlay) sluitMededelingModal(); });

  const medSluiten = document.getElementById("mededeling-modal-sluiten");
  if (medSluiten) medSluiten.addEventListener("click", sluitMededelingModal);

  const medOpslaan = document.getElementById("mededeling-opslaan-btn");
  if (medOpslaan) medOpslaan.addEventListener("click", slaaMededelingOp);

  const uitlogBtn = document.getElementById("uitlog-btn");
  if (uitlogBtn) uitlogBtn.addEventListener("click", logUit);
});
