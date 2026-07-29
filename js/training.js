/* ============================================================
   ASC Nieuwland 3 — Training JS
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
    if (!r.ok) throw new Error("Fout " + r.status);
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

function nlWeekdagDatum(datumStr) {
  const d = new Date(datumStr);
  const weekdag = d.toLocaleDateString("nl-NL", { weekday: "long" });
  const datum   = d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  return weekdag.charAt(0).toUpperCase() + weekdag.slice(1) + " " + datum;
}

function aanwezigAantal(aanwezig_namen) {
  if (!aanwezig_namen) return 0;
  if (Array.isArray(aanwezig_namen)) return aanwezig_namen.length;
  // Kommagescheiden string
  return aanwezig_namen.split(",").map(function (s) { return s.trim(); }).filter(Boolean).length;
}

function aanwezigNamen(aanwezig_namen) {
  if (!aanwezig_namen) return [];
  if (Array.isArray(aanwezig_namen)) return aanwezig_namen;
  return aanwezig_namen.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
}

/* ── State ──────────────────────────────────────────────────── */
let alleTrainingen = [];
let bewerkTraining = null;
let uitgeKlapt    = new Set();

/* ── Render ─────────────────────────────────────────────────── */
function renderTrainingen() {
  const container = document.getElementById("training-lijst");
  if (!container) return;

  const gesorteerd = alleTrainingen.slice().sort(function (a, b) {
    return new Date(b.datum) - new Date(a.datum);
  });

  if (gesorteerd.length === 0) {
    container.innerHTML = `
      <div class="leeg-staat">
        <div class="leeg-icoon">🏃</div>
        <div class="leeg-tekst">Geen trainingen gevonden</div>
        <div class="leeg-sub">Voeg een training toe via de + knop.</div>
      </div>`;
    return;
  }

  // Groepeer per week/maand
  let html = "";
  let laasteHeader = "";

  gesorteerd.forEach(function (t) {
    const d = new Date(t.datum);
    const maandJaar = d.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

    if (maandJaar !== laasteHeader) {
      laasteHeader = maandJaar;
      html += `<div class="training-datum-header">${maandJaar}</div>`;
    }

    const weekdagDatum = nlWeekdagDatum(t.datum);
    const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
    const aantalAanwezig = aanwezigAantal(t.aanwezig_namen);
    const namenLijst = aanwezigNamen(t.aanwezig_namen);
    const isUitgeklapt = uitgeKlapt.has(t.id);

    html += `
      <div class="glass-kaart training-kaart" data-id="${t.id}">
        <div class="flex-between">
          <div>
            <div style="font-size:11px;color:var(--inkt-zacht);font-weight:600;margin-bottom:6px">
              🏃 ${weekdagDatum} · ${tijd}
            </div>
            <div class="training-titel">${escapeHtml(t.titel || "Training")}</div>
          </div>
          <button class="btn-icon training-bewerk-btn" title="Bewerken" data-id="${t.id}">✏️</button>
        </div>

        ${t.beschrijving
          ? `<div class="training-beschrijving mt-8">${escapeHtml(t.beschrijving)}</div>`
          : ""}

        <div class="training-aanwezig mt-8">
          <span>👥 Aanwezig:</span>
          <span class="aantal">${aantalAanwezig}</span>
          <span>speler${aantalAanwezig !== 1 ? "s" : ""}</span>
        </div>

        ${namenLijst.length > 0
          ? `<div style="font-size:12px;color:var(--inkt-zacht);margin-top:4px">${namenLijst.map(escapeHtml).join(", ")}</div>`
          : ""}

        ${t.notities
          ? `
            <button class="training-uitklap" data-id="${t.id}">
              📝 Notities ${isUitgeklapt ? "▲" : "▼"}
            </button>
            <div class="training-notities${isUitgeklapt ? " zichtbaar" : ""}" id="notitie-${t.id}">
              ${escapeHtml(t.notities)}
            </div>`
          : ""}
      </div>`;
  });

  container.innerHTML = html;

  // Uitklap-knoppen
  container.querySelectorAll(".training-uitklap").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const notitieEl = document.getElementById("notitie-" + id);
      if (uitgeKlapt.has(id)) {
        uitgeKlapt.delete(id);
        notitieEl.classList.remove("zichtbaar");
        btn.textContent = "📝 Notities ▼";
      } else {
        uitgeKlapt.add(id);
        notitieEl.classList.add("zichtbaar");
        btn.textContent = "📝 Notities ▲";
      }
    });
  });

  // Bewerken knoppen
  container.querySelectorAll(".training-bewerk-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      openBewerkModal(id);
    });
  });
}

/* ── Laden ──────────────────────────────────────────────────── */
async function laadTrainingen() {
  const container = document.getElementById("training-lijst");
  if (!container) return;

  container.innerHTML = Array(3).fill(0).map(function () {
    return '<div class="skeleton skeleton-kaart" style="height:120px;border-radius:22px;margin-bottom:12px"></div>';
  }).join("");

  try {
    const data = await supaFetch("trainingen", { select: "*", order: "datum.desc" });
    alleTrainingen = data || [];
    renderTrainingen();
  } catch (e) {
    container.innerHTML = `
      <div class="leeg-staat">
        <div class="leeg-icoon">⚠️</div>
        <div class="leeg-tekst">Kon trainingen niet laden</div>
        <div class="leeg-sub">Controleer je verbinding en probeer opnieuw.</div>
      </div>`;
  }
}

/* ── Modals ─────────────────────────────────────────────────── */
function openNieuwModal() {
  bewerkTraining = null;
  vulFormulier(null);
  document.getElementById("training-modal-titel").textContent = "Training toevoegen";
  document.getElementById("training-verwijder-btn").style.display = "none";
  document.getElementById("training-modal").classList.add("open");
}

function openBewerkModal(id) {
  bewerkTraining = alleTrainingen.find(function (t) { return t.id === id; });
  if (!bewerkTraining) return;
  vulFormulier(bewerkTraining);
  document.getElementById("training-modal-titel").textContent = "Training bewerken";
  document.getElementById("training-verwijder-btn").style.display = "flex";
  document.getElementById("training-modal").classList.add("open");
}

function vulFormulier(t) {
  document.getElementById("training-form-titel").value = t ? t.titel || "" : "";
  document.getElementById("training-form-datum").value = t && t.datum
    ? new Date(t.datum).toISOString().slice(0, 16)
    : "";
  document.getElementById("training-form-beschrijving").value = t ? t.beschrijving || "" : "";
  document.getElementById("training-form-notities").value     = t ? t.notities || "" : "";

  // Aanwezig namen (komma-gescheiden)
  const namen = aanwezigNamen(t ? t.aanwezig_namen : null);
  document.getElementById("training-form-aanwezig").value = namen.join(", ");

  document.getElementById("training-form-fout").textContent = "";
}

function sluitTrainingModal() {
  document.getElementById("training-modal").classList.remove("open");
}

async function slaTrainingOp() {
  const foutEl = document.getElementById("training-form-fout");
  foutEl.textContent = "";

  const titel  = document.getElementById("training-form-titel").value.trim();
  const datum  = document.getElementById("training-form-datum").value;
  if (!titel)  { foutEl.textContent = "Vul een titel in."; return; }
  if (!datum)  { foutEl.textContent = "Kies een datum en tijd."; return; }

  const aanwezigStr = document.getElementById("training-form-aanwezig").value;
  const aanwezig_namen = aanwezigStr
    ? aanwezigStr.split(",").map(function (s) { return s.trim(); }).filter(Boolean)
    : [];

  const payload = {
    titel:         titel,
    datum:         new Date(datum).toISOString(),
    beschrijving:  document.getElementById("training-form-beschrijving").value.trim() || null,
    notities:      document.getElementById("training-form-notities").value.trim() || null,
    aanwezig_namen: aanwezig_namen,
  };

  const btn = document.getElementById("training-opslaan-btn");
  btn.textContent = "Opslaan…";
  btn.disabled = true;

  try {
    if (bewerkTraining) {
      await supaPatch("trainingen", bewerkTraining.id, payload);
    } else {
      await supaPost("trainingen", payload);
    }
    sluitTrainingModal();
    await laadTrainingen();
  } catch (e) {
    foutEl.textContent = "Opslaan mislukt. Probeer opnieuw.";
  } finally {
    btn.textContent = "Opslaan";
    btn.disabled = false;
  }
}

async function verwijderTraining() {
  if (!bewerkTraining) return;
  if (!confirm("Weet je zeker dat je deze training wil verwijderen?")) return;
  try {
    await supaDelete("trainingen", bewerkTraining.id);
    sluitTrainingModal();
    await laadTrainingen();
  } catch (e) {
    document.getElementById("training-form-fout").textContent = "Verwijderen mislukt.";
  }
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  const fabBtn = document.getElementById("fab-nieuw");
  if (fabBtn) fabBtn.addEventListener("click", openNieuwModal);

  const modal = document.getElementById("training-modal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) sluitTrainingModal();
    });
  }

  const sluitBtn = document.getElementById("training-modal-sluiten");
  if (sluitBtn) sluitBtn.addEventListener("click", sluitTrainingModal);

  const opslaanBtn = document.getElementById("training-opslaan-btn");
  if (opslaanBtn) opslaanBtn.addEventListener("click", slaTrainingOp);

  const verwijderBtn = document.getElementById("training-verwijder-btn");
  if (verwijderBtn) verwijderBtn.addEventListener("click", verwijderTraining);

  laadTrainingen();
});
