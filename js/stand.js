/* ============================================================
   ASC Nieuwland 3 — Stand JS
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

function isEigenTeam(team) {
  return team && team.toLowerCase().includes("nieuwland 3");
}

/* ── State ──────────────────────────────────────────────────── */
let alleRijen   = [];
let bewerkRij   = null;

/* ── Render ─────────────────────────────────────────────────── */
function renderStand() {
  const container = document.getElementById("stand-tabel-wrapper");
  if (!container) return;

  const gesorteerd = alleRijen.slice().sort(function (a, b) {
    if (b.punten !== a.punten) return b.punten - a.punten;
    // Gelijk aantal punten: doelsaldo
    const dsA = (a.goals_voor || 0) - (a.goals_tegen || 0);
    const dsB = (b.goals_voor || 0) - (b.goals_tegen || 0);
    if (dsB !== dsA) return dsB - dsA;
    return (b.goals_voor || 0) - (a.goals_voor || 0);
  });

  if (gesorteerd.length === 0) {
    container.innerHTML = `
      <div class="leeg-staat">
        <div class="leeg-icoon">📊</div>
        <div class="leeg-tekst">Stand nog niet beschikbaar</div>
        <div class="leeg-sub">Voeg teams toe via de + knop.</div>
      </div>`;
    return;
  }

  const rijen = gesorteerd.map(function (r, i) {
    const eigen = isEigenTeam(r.team);
    const ds    = (r.goals_voor || 0) - (r.goals_tegen || 0);
    const dsStr = ds > 0 ? "+" + ds : String(ds);

    return `
      <tr class="${eigen ? "eigen-team" : ""}">
        <td>${i + 1}</td>
        <td>${escapeHtml(r.team)}</td>
        <td>${r.gespeeld || 0}</td>
        <td>${r.gewonnen || 0}</td>
        <td>${r.gelijk || 0}</td>
        <td>${r.verloren || 0}</td>
        <td>${r.goals_voor || 0}</td>
        <td>${r.goals_tegen || 0}</td>
        <td>${dsStr}</td>
        <td class="punten-cel">${r.punten || 0}</td>
        <td><button class="stand-bewerk-btn" title="Bewerken" data-id="${r.id}">✏️</button></td>
      </tr>`;
  }).join("");

  container.innerHTML = `
    <table class="stand-tabel">
      <thead>
        <tr>
          <th>#</th>
          <th>Team</th>
          <th title="Gespeeld">G</th>
          <th title="Gewonnen">W</th>
          <th title="Gelijk">G</th>
          <th title="Verloren">V</th>
          <th title="Goals voor">DV</th>
          <th title="Goals tegen">DT</th>
          <th title="Doelsaldo">DS</th>
          <th title="Punten">Ptn</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rijen}</tbody>
    </table>`;

  container.querySelectorAll(".stand-bewerk-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      openBewerkModal(id);
    });
  });
}

/* ── Laden ──────────────────────────────────────────────────── */
async function laadStand() {
  const container = document.getElementById("stand-tabel-wrapper");
  if (!container) return;

  container.innerHTML = `<div style="padding:20px">
    ${Array(8).fill(0).map(function () {
      return '<div class="skeleton skeleton-rij" style="margin-bottom:10px"></div>';
    }).join("")}
  </div>`;

  try {
    const data = await supaFetch("stand", { select: "*" });
    alleRijen = data || [];
    renderStand();
  } catch (e) {
    container.innerHTML = `
      <div class="leeg-staat">
        <div class="leeg-icoon">⚠️</div>
        <div class="leeg-tekst">Kon stand niet laden</div>
        <div class="leeg-sub">Controleer je verbinding en probeer opnieuw.</div>
      </div>`;
  }
}

/* ── Modals ─────────────────────────────────────────────────── */
function openNieuwModal() {
  bewerkRij = null;
  vulFormulier(null);
  document.getElementById("stand-modal-titel").textContent = "Team toevoegen";
  document.getElementById("stand-verwijder-btn").style.display = "none";
  document.getElementById("stand-modal").classList.add("open");
}

function openBewerkModal(id) {
  bewerkRij = alleRijen.find(function (r) { return r.id === id; });
  if (!bewerkRij) return;
  vulFormulier(bewerkRij);
  document.getElementById("stand-modal-titel").textContent = "Stand bewerken";
  document.getElementById("stand-verwijder-btn").style.display = "flex";
  document.getElementById("stand-modal").classList.add("open");
}

function vulFormulier(r) {
  document.getElementById("stand-form-team").value        = r ? r.team || "" : "";
  document.getElementById("stand-form-gespeeld").value    = r ? r.gespeeld || 0 : 0;
  document.getElementById("stand-form-gewonnen").value    = r ? r.gewonnen || 0 : 0;
  document.getElementById("stand-form-gelijk").value      = r ? r.gelijk || 0 : 0;
  document.getElementById("stand-form-verloren").value    = r ? r.verloren || 0 : 0;
  document.getElementById("stand-form-goals_voor").value  = r ? r.goals_voor || 0 : 0;
  document.getElementById("stand-form-goals_tegen").value = r ? r.goals_tegen || 0 : 0;
  document.getElementById("stand-form-punten").value      = r ? r.punten || 0 : 0;
  document.getElementById("stand-form-fout").textContent  = "";
}

function sluitStandModal() {
  document.getElementById("stand-modal").classList.remove("open");
}

function berekenPunten() {
  const w = parseInt(document.getElementById("stand-form-gewonnen").value) || 0;
  const g = parseInt(document.getElementById("stand-form-gelijk").value) || 0;
  document.getElementById("stand-form-punten").value = w * 3 + g;
}

async function slaStandOp() {
  const foutEl = document.getElementById("stand-form-fout");
  foutEl.textContent = "";

  const team = document.getElementById("stand-form-team").value.trim();
  if (!team) { foutEl.textContent = "Vul een teamnaam in."; return; }

  const payload = {
    team:         team,
    gespeeld:     parseInt(document.getElementById("stand-form-gespeeld").value) || 0,
    gewonnen:     parseInt(document.getElementById("stand-form-gewonnen").value) || 0,
    gelijk:       parseInt(document.getElementById("stand-form-gelijk").value) || 0,
    verloren:     parseInt(document.getElementById("stand-form-verloren").value) || 0,
    goals_voor:   parseInt(document.getElementById("stand-form-goals_voor").value) || 0,
    goals_tegen:  parseInt(document.getElementById("stand-form-goals_tegen").value) || 0,
    punten:       parseInt(document.getElementById("stand-form-punten").value) || 0,
  };

  const btn = document.getElementById("stand-opslaan-btn");
  btn.textContent = "Opslaan…";
  btn.disabled = true;

  try {
    if (bewerkRij) {
      await supaPatch("stand", bewerkRij.id, payload);
    } else {
      await supaPost("stand", payload);
    }
    sluitStandModal();
    await laadStand();
  } catch (e) {
    foutEl.textContent = "Opslaan mislukt. Probeer opnieuw.";
  } finally {
    btn.textContent = "Opslaan";
    btn.disabled = false;
  }
}

async function verwijderRij() {
  if (!bewerkRij) return;
  if (!confirm(`Weet je zeker dat je ${bewerkRij.team} wil verwijderen uit de stand?`)) return;
  try {
    await supaDelete("stand", bewerkRij.id);
    sluitStandModal();
    await laadStand();
  } catch (e) {
    document.getElementById("stand-form-fout").textContent = "Verwijderen mislukt.";
  }
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  const fabBtn = document.getElementById("fab-nieuw");
  if (fabBtn) fabBtn.addEventListener("click", openNieuwModal);

  const modal = document.getElementById("stand-modal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) sluitStandModal();
    });
  }

  const sluitBtn = document.getElementById("stand-modal-sluiten");
  if (sluitBtn) sluitBtn.addEventListener("click", sluitStandModal);

  const opslaanBtn = document.getElementById("stand-opslaan-btn");
  if (opslaanBtn) opslaanBtn.addEventListener("click", slaStandOp);

  const verwijderBtn = document.getElementById("stand-verwijder-btn");
  if (verwijderBtn) verwijderBtn.addEventListener("click", verwijderRij);

  // Auto-bereken punten bij wijzigen W/G
  ["stand-form-gewonnen", "stand-form-gelijk"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", berekenPunten);
  });

  laadStand();
});
