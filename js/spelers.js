/* ============================================================
   ASC Nieuwland 3 — Spelers JS
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

function supaPost(pad, body) {
  return fetch(SUPABASE_URL + pad, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  }).then(function (r) {
    if (!r.ok) throw new Error("Opslaan mislukt");
    return r.json();
  });
}

function supaPatch(pad, id, body) {
  return fetch(SUPABASE_URL + pad + "?id=eq." + id, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  }).then(function (r) {
    if (!r.ok) throw new Error("Bijwerken mislukt");
    return r.json();
  });
}

function supaDelete(pad, id) {
  return fetch(SUPABASE_URL + pad + "?id=eq." + id, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
  }).then(function (r) {
    if (!r.ok) throw new Error("Verwijderen mislukt");
    return true;
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

function positieKlasse(positie) {
  if (!positie) return "badge-grijs";
  const hoofd = positie.split("/")[0].trim().toUpperCase();
  if (hoofd === "DM") return "pos-GK";
  if (["RB","LB","CV"].includes(hoofd)) return "pos-DEF";
  if (["CVM","CM","CAM"].includes(hoofd)) return "pos-MID";
  if (["LVA","RVA","SP"].includes(hoofd)) return "pos-AAN";
  // Legacy
  if (hoofd === "GK")  return "pos-GK";
  if (hoofd === "DEF") return "pos-DEF";
  if (hoofd === "MID") return "pos-MID";
  if (hoofd === "AAN") return "pos-AAN";
  return "badge-grijs";
}

function positieBadge(positie) {
  return `<span class="speler-positie-badge ${positieKlasse(positie)}">${escapeHtml(positie || "–")}</span>`;
}

function fotoHtml(speler, groot) {
  const maat = groot ? 72 : 52;
  const klasse = groot ? "speler-detail-foto" : "speler-foto";
  if (speler.foto_url) {
    return `<img src="${escapeHtml(speler.foto_url)}" alt="${escapeHtml(speler.naam)}" class="${klasse}" width="${maat}" height="${maat}">`;
  }
  const hoofd = (speler.positie || "").split("/")[0].trim().toUpperCase();
  const emoji = (hoofd === "DM" || hoofd === "GK") ? "🧤" : "⚽";
  return `<div class="${groot ? "speler-detail-foto" : "speler-foto-placeholder"}" style="${groot ? "display:flex;align-items:center;justify-content:center;background:var(--groen-zacht);border-radius:50%;font-size:32px" : ""}">${emoji}</div>`;
}

function statusBadge(status) {
  if (!status || status === "beschikbaar") return "";
  if (status === "geblesseerd") return '<span class="badge badge-geblesseerd">🩹 Geblesseerd</span>';
  if (status === "afwezig")     return '<span class="badge badge-afwezig">Afwezig</span>';
  return `<span class="badge badge-grijs">${escapeHtml(status)}</span>`;
}

/* ── State ──────────────────────────────────────────────────── */
let alleSpelers       = [];
let huidigSpeler      = null;
let bewerkSpeler      = null;
let zoekterm          = "";
let gekozenFotoBestand = null;

/* ── Foto upload ────────────────────────────────────────────── */
async function uploadFoto(bestand, naam) {
  const ext = bestand.name.split(".").pop() || "png";
  const bestandsnaam = naam.replace(/\s+/g, "_") + "_" + Date.now() + "." + ext;
  const resp = await fetch(
    SUPABASE_PROJECT_URL + "/storage/v1/object/spelersfotos/" + bestandsnaam,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: "Bearer " + SUPABASE_ANON_KEY,
        "Content-Type": bestand.type || "image/png",
        "x-upsert": "true",
      },
      body: bestand,
    }
  );
  if (!resp.ok) {
    const err = await resp.json().catch(function () { return {}; });
    throw new Error(err.message || "Upload mislukt");
  }
  return SUPABASE_PROJECT_URL + "/storage/v1/object/public/spelersfotos/" + bestandsnaam;
}

/* ── Top scorers ────────────────────────────────────────────── */
function renderTopScorers() {
  const el = document.getElementById("top-scorers");
  if (!el) return;

  const metDoelpunten = alleSpelers.filter(function (s) { return (s.goals || 0) > 0; })
    .sort(function (a, b) { return (b.goals || 0) - (a.goals || 0); })
    .slice(0, 5);

  if (metDoelpunten.length === 0) {
    el.innerHTML = '<div style="padding:12px 20px;font-size:13px;color:var(--inkt-zacht)">Nog geen doelpunten geregistreerd</div>';
    return;
  }

  const medals = ["🥇","🥈","🥉","4.","5."];
  el.innerHTML = metDoelpunten.map(function (s, i) {
    return `<div class="top-scorer-item">
      <div class="top-scorer-rang">${medals[i]}</div>
      <div class="top-scorer-naam">${escapeHtml(s.naam.split(" ")[0])}${s.aanvoerder ? ' <span style="font-weight:900;color:var(--blauw)">C</span>' : ""}</div>
      <div>
        <div class="top-scorer-getal">${s.goals}</div>
        <div class="top-scorer-label">doelp.</div>
      </div>
    </div>`;
  }).join("");
}

/* ── Render ─────────────────────────────────────────────────── */
function renderSpelers() {
  const container = document.getElementById("spelers-grid");
  if (!container) return;

  let lijst = alleSpelers.slice();

  if (zoekterm) {
    lijst = lijst.filter(function (s) {
      return s.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
             (s.positie || "").toLowerCase().includes(zoekterm.toLowerCase());
    });
  }

  // Sorteer op rugnummer
  lijst.sort(function (a, b) { return (a.rugnummer || 99) - (b.rugnummer || 99); });

  if (lijst.length === 0) {
    container.innerHTML = `
      <div class="leeg-staat" style="grid-column:1/-1">
        <div class="leeg-icoon">👥</div>
        <div class="leeg-tekst">Geen spelers gevonden</div>
        <div class="leeg-sub">Voeg spelers toe via de + knop.</div>
      </div>`;
    return;
  }

  container.innerHTML = lijst.map(function (s) {
    const isDimmed = s.status === "geblesseerd" || s.status === "afwezig";
    return `
      <div class="glass-kaart speler-kaart klikbaar" data-id="${s.id}" style="${isDimmed ? "opacity:0.60" : ""}">
        <div>
          <div class="speler-rugnummer">${s.rugnummer || ""}</div>
          ${fotoHtml(s, false)}
          <div class="speler-naam">${escapeHtml(s.naam)}${s.aanvoerder ? ' <span style="font-weight:900;color:var(--blauw);font-size:13px">C</span>' : ""}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
            ${positieBadge(s.positie)}
            ${statusBadge(s.status)}
          </div>
        </div>
        <div class="speler-stats">
          <span class="speler-stat">⚽ ${s.goals || 0}</span>
          <span class="speler-stat">🅰️ ${s.assists || 0}</span>
          <span class="speler-stat">🟨 ${s.gele_kaarten || 0}</span>
        </div>
      </div>`;
  }).join("");

  container.querySelectorAll(".speler-kaart").forEach(function (kaart) {
    kaart.addEventListener("click", function () {
      const id = parseInt(kaart.dataset.id);
      openDetail(id);
    });
  });
}

/* ── Detail Modal ───────────────────────────────────────────── */
function openDetail(id) {
  huidigSpeler = alleSpelers.find(function (s) { return s.id === id; });
  if (!huidigSpeler) return;
  const s = huidigSpeler;

  document.getElementById("detail-inhoud").innerHTML = `
    <div class="speler-detail">
      ${fotoHtml(s, true)}
      <div>
        <div class="speler-detail-naam">${escapeHtml(s.naam)}${s.aanvoerder ? ' <span style="font-weight:900;color:var(--blauw)">C</span>' : ""}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          ${positieBadge(s.positie)}
          ${statusBadge(s.status)}
          ${s.aanvoerder ? '<span class="badge badge-aanvoerder">Aanvoerder</span>' : ""}
        </div>
        ${s.rugnummer ? `<div style="font-size:13px;color:var(--inkt-zacht);margin-top:6px">Rugnummer #${s.rugnummer}</div>` : ""}
        ${s.geboortedatum ? `<div style="font-size:13px;color:var(--inkt-zacht);margin-top:4px">🎂 ${new Date(s.geboortedatum + "T00:00:00").toLocaleDateString("nl-NL",{day:"numeric",month:"long",year:"numeric"})}</div>` : ""}
        ${s.telefoon ? `<div style="font-size:13px;color:var(--inkt-zacht);margin-top:4px">📱 <a href="tel:${escapeHtml(s.telefoon)}" style="color:var(--blauw);font-weight:600">${escapeHtml(s.telefoon)}</a></div>` : ""}
        ${s.knvb_nummer ? `<div style="font-size:13px;color:var(--inkt-zacht);margin-top:4px">🪪 KNVB: <span style="font-weight:700;color:var(--inkt)">${escapeHtml(s.knvb_nummer)}</span></div>` : ""}
      </div>
    </div>
    <div class="speler-stats-grid">
      <div class="speler-stat-kaart"><div class="getal">${s.wedstrijden_gespeeld || 0}</div><div class="label">Gespeeld</div></div>
      <div class="speler-stat-kaart"><div class="getal">${s.goals || 0}</div><div class="label">Doelpunten</div></div>
      <div class="speler-stat-kaart"><div class="getal">${s.assists || 0}</div><div class="label">Assists</div></div>
      <div class="speler-stat-kaart"><div class="getal">${s.gele_kaarten || 0}</div><div class="label">Gele kaarten</div></div>
      <div class="speler-stat-kaart"><div class="getal">${s.rode_kaarten || 0}</div><div class="label">Rode kaarten</div></div>
      <div class="speler-stat-kaart"><div class="getal">${s.goals && s.wedstrijden_gespeeld ? (s.goals / s.wedstrijden_gespeeld).toFixed(1) : "–"}</div><div class="label">P/wedstrijd</div></div>
    </div>
    ${s.biografie ? `
      <div class="sectie-label">Biografie</div>
      <div style="font-size:14px;color:var(--inkt);line-height:1.6">${escapeHtml(s.biografie)}</div>
    ` : ""}
    <div style="margin-top:20px">
      <button class="btn btn-glas w-full" id="detail-bewerk-btn">✏️ Bewerken</button>
    </div>`;

  document.getElementById("detail-bewerk-btn").addEventListener("click", function () {
    sluitDetailModal();
    openBewerkModal(s.id);
  });

  document.getElementById("speler-detail-modal").classList.add("open");
}

function sluitDetailModal() {
  document.getElementById("speler-detail-modal").classList.remove("open");
}

/* ── Form Modal ─────────────────────────────────────────────── */
function openNieuwModal() {
  bewerkSpeler = null;
  vulFormulier(null);
  document.getElementById("form-modal-titel").textContent = "Speler toevoegen";
  document.getElementById("form-verwijder-btn").style.display = "none";
  document.getElementById("speler-form-modal").classList.add("open");
}

function openBewerkModal(id) {
  bewerkSpeler = alleSpelers.find(function (s) { return s.id === id; });
  if (!bewerkSpeler) return;
  vulFormulier(bewerkSpeler);
  document.getElementById("form-modal-titel").textContent = "Speler bewerken";
  document.getElementById("form-verwijder-btn").style.display = "flex";
  document.getElementById("speler-form-modal").classList.add("open");
}

function vulFormulier(s) {
  document.getElementById("form-naam").value               = s ? s.naam || "" : "";
  document.getElementById("form-rugnummer").value          = s ? s.rugnummer || "" : "";
  document.getElementById("form-positie").value            = s ? s.positie || "" : "";
  document.getElementById("form-foto_url").value           = s && !s.foto_url?.startsWith("http") ? s.foto_url || "" : s && s.foto_url?.startsWith("http") ? s.foto_url : "";
  document.getElementById("form-goals").value              = s ? s.goals || 0 : 0;
  document.getElementById("form-assists").value            = s ? s.assists || 0 : 0;
  document.getElementById("form-gele_kaarten").value       = s ? s.gele_kaarten || 0 : 0;
  document.getElementById("form-rode_kaarten").value       = s ? s.rode_kaarten || 0 : 0;
  document.getElementById("form-wedstrijden_gespeeld").value = s ? s.wedstrijden_gespeeld || 0 : 0;
  document.getElementById("form-biografie").value          = s ? s.biografie || "" : "";
  document.getElementById("form-geboortedatum").value      = s ? s.geboortedatum || "" : "";
  document.getElementById("form-telefoon").value           = s ? s.telefoon || "" : "";
  document.getElementById("form-knvb_nummer").value        = s ? s.knvb_nummer || "" : "";
  const aanv = document.getElementById("form-aanvoerder");
  if (aanv) aanv.checked = s ? !!s.aanvoerder : false;
  const stat = document.getElementById("form-status");
  if (stat) stat.value = s ? (s.status || "beschikbaar") : "beschikbaar";
  document.getElementById("form-speler-fout").textContent  = "";

  gekozenFotoBestand = null;
  document.getElementById("form-foto-bestand").value = "";
  const previewWrap = document.getElementById("foto-preview-wrap");
  const previewImg  = document.getElementById("foto-preview");
  if (s && s.foto_url) {
    previewImg.src = s.foto_url;
    previewWrap.style.display = "flex";
    document.getElementById("form-foto_url").value = s.foto_url;
  } else {
    previewWrap.style.display = "none";
    previewImg.src = "";
  }
}

function sluitFormModal() {
  document.getElementById("speler-form-modal").classList.remove("open");
}

async function slaSpelerOp() {
  const foutEl = document.getElementById("form-speler-fout");
  foutEl.textContent = "";

  const naam = document.getElementById("form-naam").value.trim();
  if (!naam) { foutEl.textContent = "Vul een naam in."; return; }

  const aanvEl = document.getElementById("form-aanvoerder");
  const statEl = document.getElementById("form-status");

  const btn = document.getElementById("form-opslaan-btn");
  btn.textContent = "Opslaan…";
  btn.disabled = true;

  try {
    let fotoUrl = document.getElementById("form-foto_url").value.trim() || null;
    if (gekozenFotoBestand) {
      btn.textContent = "Foto uploaden…";
      fotoUrl = await uploadFoto(gekozenFotoBestand, naam);
    }

    const payload = {
      naam:                 naam,
      rugnummer:            parseInt(document.getElementById("form-rugnummer").value) || null,
      positie:              document.getElementById("form-positie").value.trim() || null,
      foto_url:             fotoUrl,
      goals:                parseInt(document.getElementById("form-goals").value) || 0,
      assists:              parseInt(document.getElementById("form-assists").value) || 0,
      gele_kaarten:         parseInt(document.getElementById("form-gele_kaarten").value) || 0,
      rode_kaarten:         parseInt(document.getElementById("form-rode_kaarten").value) || 0,
      wedstrijden_gespeeld: parseInt(document.getElementById("form-wedstrijden_gespeeld").value) || 0,
      biografie:            document.getElementById("form-biografie").value.trim() || null,
      aanvoerder:           aanvEl ? aanvEl.checked : false,
      status:               statEl ? statEl.value : "beschikbaar",
      geboortedatum:        document.getElementById("form-geboortedatum").value || null,
      telefoon:             document.getElementById("form-telefoon").value.trim() || null,
      knvb_nummer:          document.getElementById("form-knvb_nummer").value.trim().toUpperCase() || null,
    };

    btn.textContent = "Opslaan…";
    if (bewerkSpeler) {
      await supaPatch("spelers", bewerkSpeler.id, payload);
    } else {
      await supaPost("spelers", payload);
    }
    sluitFormModal();
    await laadSpelers();
  } catch (e) {
    foutEl.textContent = e.message && e.message.includes("does not exist")
      ? "Voeg eerst de ontbrekende kolommen toe in Supabase."
      : "Opslaan mislukt. Probeer opnieuw.";
  } finally {
    btn.textContent = "Opslaan";
    btn.disabled = false;
  }
}

async function verwijderSpeler() {
  if (!bewerkSpeler) return;
  if (!confirm(`Weet je zeker dat je ${bewerkSpeler.naam} wil verwijderen?`)) return;
  try {
    await supaDelete("spelers", bewerkSpeler.id);
    sluitFormModal();
    await laadSpelers();
  } catch (e) {
    document.getElementById("form-speler-fout").textContent = "Verwijderen mislukt.";
  }
}

/* ── Laden ──────────────────────────────────────────────────── */
async function laadSpelers() {
  const container = document.getElementById("spelers-grid");
  if (!container) return;

  container.innerHTML = Array(6).fill(0).map(function () {
    return '<div class="skeleton skeleton-kaart" style="min-height:140px;border-radius:22px"></div>';
  }).join("");

  try {
    const data = await supaFetch("spelers", { select: "*", order: "rugnummer.asc" });
    alleSpelers = data || [];
    renderSpelers();
    renderTopScorers();
  } catch (e) {
    container.innerHTML = `
      <div class="leeg-staat" style="grid-column:1/-1">
        <div class="leeg-icoon">⚠️</div>
        <div class="leeg-tekst">Kon spelers niet laden</div>
        <div class="leeg-sub">Controleer je verbinding en probeer opnieuw.</div>
      </div>`;
  }
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  // Zoeken
  const zoekInput = document.getElementById("zoek-input");
  if (zoekInput) {
    zoekInput.addEventListener("input", function () {
      zoekterm = zoekInput.value;
      renderSpelers();
    });
  }

  // FAB
  const fabBtn = document.getElementById("fab-nieuw");
  if (fabBtn) fabBtn.addEventListener("click", openNieuwModal);

  // Detail modal
  const detailOverlay = document.getElementById("speler-detail-modal");
  if (detailOverlay) {
    detailOverlay.addEventListener("click", function (e) {
      if (e.target === detailOverlay) sluitDetailModal();
    });
  }
  const detailSluiten = document.getElementById("detail-modal-sluiten");
  if (detailSluiten) detailSluiten.addEventListener("click", sluitDetailModal);

  // Form modal
  const formOverlay = document.getElementById("speler-form-modal");
  if (formOverlay) {
    formOverlay.addEventListener("click", function (e) {
      if (e.target === formOverlay) sluitFormModal();
    });
  }
  const formSluiten = document.getElementById("form-modal-sluiten");
  if (formSluiten) formSluiten.addEventListener("click", sluitFormModal);

  const opslaanBtn = document.getElementById("form-opslaan-btn");
  if (opslaanBtn) opslaanBtn.addEventListener("click", slaSpelerOp);

  const verwijderBtn = document.getElementById("form-verwijder-btn");
  if (verwijderBtn) verwijderBtn.addEventListener("click", verwijderSpeler);

  const fotoBestandInput = document.getElementById("form-foto-bestand");
  if (fotoBestandInput) {
    fotoBestandInput.addEventListener("change", function () {
      const bestand = fotoBestandInput.files[0];
      if (!bestand) return;
      gekozenFotoBestand = bestand;
      const reader = new FileReader();
      reader.onload = function (e) {
        const previewImg  = document.getElementById("foto-preview");
        const previewWrap = document.getElementById("foto-preview-wrap");
        previewImg.src = e.target.result;
        previewWrap.style.display = "flex";
        document.getElementById("form-foto_url").value = "";
      };
      reader.readAsDataURL(bestand);
    });
  }

  const fotoVerwijderBtn = document.getElementById("foto-verwijder-btn");
  if (fotoVerwijderBtn) {
    fotoVerwijderBtn.addEventListener("click", function () {
      gekozenFotoBestand = null;
      document.getElementById("foto-preview-wrap").style.display = "none";
      document.getElementById("foto-preview").src = "";
      document.getElementById("form-foto_url").value = "";
      document.getElementById("form-foto-bestand").value = "";
    });
  }

  laadSpelers();
});
