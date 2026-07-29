/* ============================================================
   ASC Nieuwland 3 — Wedstrijden JS
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
    if (!r.ok) throw new Error("Opslaan mislukt " + r.status);
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
    if (!r.ok) throw new Error("Bijwerken mislukt " + r.status);
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

function resultaatBadge(eigen, tegenstander) {
  if (eigen === null || tegenstander === null) return "";
  if (eigen > tegenstander)  return '<span class="badge badge-winst">W</span>';
  if (eigen < tegenstander)  return '<span class="badge badge-verlies">V</span>';
  return '<span class="badge badge-gelijk">G</span>';
}

/* ── State ──────────────────────────────────────────────────── */
let alleWedstrijden = [];
let huidigeTab     = "aankomend";
let bewerkWedstrijd = null;

/* ── Render ─────────────────────────────────────────────────── */
function renderWedstrijden() {
  const container = document.getElementById("wedstrijd-lijst");
  if (!container) return;

  const lijst = alleWedstrijden.filter(function (w) {
    return huidigeTab === "aankomend"
      ? w.status === "gepland"
      : w.status === "gespeeld";
  });

  // Sorteer: aankomend oplopend, gespeeld aflopend
  lijst.sort(function (a, b) {
    const da = new Date(a.datum);
    const db = new Date(b.datum);
    return huidigeTab === "aankomend" ? da - db : db - da;
  });

  if (lijst.length === 0) {
    container.innerHTML = `
      <div class="leeg-staat">
        <div class="leeg-icoon">${huidigeTab === "aankomend" ? "📅" : "🏆"}</div>
        <div class="leeg-tekst">${huidigeTab === "aankomend" ? "Geen geplande wedstrijden" : "Geen gespeelde wedstrijden"}</div>
        <div class="leeg-sub">Voeg een wedstrijd toe via de + knop.</div>
      </div>`;
    return;
  }

  container.innerHTML = lijst.map(function (w) {
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
        <div class="wedstrijd-score">${w.score_eigen ?? "–"} – ${w.score_tegenstander ?? "–"}</div>
        ${resultaatBadge(w.score_eigen, w.score_tegenstander)}`;
    } else {
      rechts = `<div class="wedstrijd-tijd">${tijd}</div>`;
    }

    return `
      <div class="glass-kaart wedstrijd-kaart" data-id="${w.id}">
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
        <button class="wedstrijd-bewerk" title="Bewerken" data-id="${w.id}">✏️</button>
      </div>`;
  }).join("");

  // Event listeners
  container.querySelectorAll(".wedstrijd-bewerk").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      openBewerkModal(id);
    });
  });
}

/* ── Laden ──────────────────────────────────────────────────── */
async function laadWedstrijden() {
  const container = document.getElementById("wedstrijd-lijst");
  if (!container) return;

  // Skeleton
  container.innerHTML = Array(3).fill(0).map(function () {
    return '<div class="skeleton skeleton-kaart"></div>';
  }).join("");

  try {
    const data = await supaFetch("wedstrijden", {
      select: "*",
      order:  "datum.asc",
    });
    alleWedstrijden = data || [];
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

/* ── Modal (toevoegen / bewerken) ───────────────────────────── */
function openNieuwModal() {
  bewerkWedstrijd = null;
  vulFormulier(null);
  document.getElementById("modal-titel-tekst").textContent = "Wedstrijd toevoegen";
  document.getElementById("verwijder-btn").style.display = "none";
  openModal();
}

function openBewerkModal(id) {
  bewerkWedstrijd = alleWedstrijden.find(function (w) { return w.id === id; });
  if (!bewerkWedstrijd) return;
  vulFormulier(bewerkWedstrijd);
  document.getElementById("modal-titel-tekst").textContent = "Wedstrijd bewerken";
  document.getElementById("verwijder-btn").style.display = "flex";
  openModal();
}

function vulFormulier(w) {
  document.getElementById("form-tegenstander").value = w ? w.tegenstander || "" : "";
  document.getElementById("form-datum").value = w && w.datum
    ? new Date(w.datum).toISOString().slice(0, 16)
    : "";
  document.getElementById("form-thuis_uit").value = w ? w.thuis_uit || "thuis" : "thuis";
  document.getElementById("form-locatie").value = w ? w.locatie || "" : "";
  document.getElementById("form-status").value = w ? w.status || "gepland" : "gepland";
  document.getElementById("form-score_eigen").value = w && w.score_eigen !== null ? w.score_eigen : "";
  document.getElementById("form-score_tegenstander").value = w && w.score_tegenstander !== null ? w.score_tegenstander : "";
  document.getElementById("form-fout").textContent = "";
}

function openModal() {
  document.getElementById("wedstrijd-modal").classList.add("open");
}

function sluitModal() {
  document.getElementById("wedstrijd-modal").classList.remove("open");
}

async function slaWedstrijdOp() {
  const foutEl = document.getElementById("form-fout");
  foutEl.textContent = "";

  const tegenstander = document.getElementById("form-tegenstander").value.trim();
  const datum        = document.getElementById("form-datum").value;
  const thuis_uit    = document.getElementById("form-thuis_uit").value;
  const locatie      = document.getElementById("form-locatie").value.trim();
  const status       = document.getElementById("form-status").value;
  const score_eigen  = document.getElementById("form-score_eigen").value;
  const score_teg    = document.getElementById("form-score_tegenstander").value;

  if (!tegenstander) { foutEl.textContent = "Vul een tegenstander in."; return; }
  if (!datum)        { foutEl.textContent = "Selecteer een datum en tijd."; return; }

  const payload = {
    tegenstander: tegenstander,
    datum:        new Date(datum).toISOString(),
    thuis_uit:    thuis_uit,
    locatie:      locatie || null,
    status:       status,
    score_eigen:              score_eigen !== "" ? parseInt(score_eigen) : null,
    score_tegenstander:       score_teg !== "" ? parseInt(score_teg) : null,
  };

  const slaBtn = document.getElementById("opslaan-btn");
  slaBtn.textContent = "Opslaan…";
  slaBtn.disabled = true;

  try {
    if (bewerkWedstrijd) {
      await supaPatch("wedstrijden", bewerkWedstrijd.id, payload);
    } else {
      await supaPost("wedstrijden", payload);
    }
    sluitModal();
    await laadWedstrijden();
  } catch (e) {
    foutEl.textContent = "Opslaan mislukt. Probeer opnieuw.";
  } finally {
    slaBtn.textContent = "Opslaan";
    slaBtn.disabled = false;
  }
}

async function verwijderWedstrijd() {
  if (!bewerkWedstrijd) return;
  if (!confirm("Weet je zeker dat je deze wedstrijd wil verwijderen?")) return;

  try {
    await supaDelete("wedstrijden", bewerkWedstrijd.id);
    sluitModal();
    await laadWedstrijden();
  } catch (e) {
    document.getElementById("form-fout").textContent = "Verwijderen mislukt.";
  }
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  // Tab wisselen
  document.querySelectorAll(".tab-switch-item").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-switch-item").forEach(function (b) {
        b.classList.remove("actief");
      });
      btn.classList.add("actief");
      huidigeTab = btn.dataset.tab;
      renderWedstrijden();
    });
  });

  // FAB — nieuw
  const fabBtn = document.getElementById("fab-nieuw");
  if (fabBtn) fabBtn.addEventListener("click", openNieuwModal);

  // Modal sluiten
  const modalOverlay = document.getElementById("wedstrijd-modal");
  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay) sluitModal();
    });
  }

  const sluitBtn = document.getElementById("modal-sluiten");
  if (sluitBtn) sluitBtn.addEventListener("click", sluitModal);

  const opslaanBtn = document.getElementById("opslaan-btn");
  if (opslaanBtn) opslaanBtn.addEventListener("click", slaWedstrijdOp);

  const verwijderBtn = document.getElementById("verwijder-btn");
  if (verwijderBtn) verwijderBtn.addEventListener("click", verwijderWedstrijd);

  laadWedstrijden();
});
