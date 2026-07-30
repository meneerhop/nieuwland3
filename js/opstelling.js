/* ============================================================
   ASC Nieuwland 3 — Opstelling JS
   ============================================================ */

/* ── Formaties & posities ───────────────────────────────────── */
const FORMATIES = {
  "4-3-3": [
    { label: "K",   x: 50, y: 90 },
    { label: "RV",  x: 83, y: 73 },
    { label: "RC",  x: 63, y: 76 },
    { label: "LC",  x: 37, y: 76 },
    { label: "LV",  x: 17, y: 73 },
    { label: "RM",  x: 75, y: 52 },
    { label: "CM",  x: 50, y: 48 },
    { label: "LM",  x: 25, y: 52 },
    { label: "RB",  x: 80, y: 24 },
    { label: "SP",  x: 50, y: 18 },
    { label: "LB",  x: 20, y: 24 },
  ],
  "4-4-2": [
    { label: "K",   x: 50, y: 90 },
    { label: "RV",  x: 83, y: 73 },
    { label: "RC",  x: 63, y: 76 },
    { label: "LC",  x: 37, y: 76 },
    { label: "LV",  x: 17, y: 73 },
    { label: "RM",  x: 83, y: 50 },
    { label: "RCM", x: 60, y: 48 },
    { label: "LCM", x: 40, y: 48 },
    { label: "LM",  x: 17, y: 50 },
    { label: "RS",  x: 63, y: 20 },
    { label: "LS",  x: 37, y: 20 },
  ],
  "4-2-3-1": [
    { label: "K",   x: 50, y: 90 },
    { label: "RV",  x: 83, y: 73 },
    { label: "RC",  x: 63, y: 76 },
    { label: "LC",  x: 37, y: 76 },
    { label: "LV",  x: 17, y: 73 },
    { label: "RDM", x: 63, y: 60 },
    { label: "LDM", x: 37, y: 60 },
    { label: "RB",  x: 80, y: 40 },
    { label: "AM",  x: 50, y: 38 },
    { label: "LB",  x: 20, y: 40 },
    { label: "SP",  x: 50, y: 18 },
  ],
  "3-5-2": [
    { label: "K",   x: 50, y: 90 },
    { label: "RC",  x: 72, y: 76 },
    { label: "CV",  x: 50, y: 80 },
    { label: "LC",  x: 28, y: 76 },
    { label: "RVB", x: 88, y: 55 },
    { label: "RM",  x: 68, y: 50 },
    { label: "CM",  x: 50, y: 46 },
    { label: "LM",  x: 32, y: 50 },
    { label: "LVB", x: 12, y: 55 },
    { label: "RS",  x: 65, y: 20 },
    { label: "LS",  x: 35, y: 20 },
  ],
};

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

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ── State ──────────────────────────────────────────────────── */
let alleWedstrijden     = [];
let alleSpelers         = [];
let huidigeFormatie     = "4-3-3";
let opstellingSpelers   = new Array(11).fill(null); // speler_id per index
let huidigOpstellingId  = null;
let gekozenWedstrijdId  = null;
let huidigePosIndex     = null; // welke positie wordt gekozen

/* ── Veld renderen ──────────────────────────────────────────── */
function renderVeld() {
  const veld = document.getElementById("veld-container");
  if (!veld) return;

  const posities = FORMATIES[huidigeFormatie];

  const cirkelHtml = posities.map(function (pos, i) {
    const speler = opstellingSpelers[i]
      ? alleSpelers.find(function (s) { return s.id === opstellingSpelers[i]; })
      : null;

    const leeg = !speler;
    const inhoud = speler
      ? `<span style="font-size:11px;font-weight:800;line-height:1">${speler.rugnummer || "?"}</span>`
      : `<span style="font-size:20px;line-height:1">+</span>`;

    const naam = speler ? escapeHtml(speler.naam.split(" ")[0]) : pos.label;

    return `
      <div class="speler-positie" style="left:${pos.x}%;top:${pos.y}%" data-index="${i}" title="${naam}">
        <div class="speler-cirkel${leeg ? " leeg" : ""}">${inhoud}</div>
        <div class="speler-positie-naam">${naam}</div>
      </div>`;
  }).join("");

  // SVG veldlijnen
  const svg = `
    <svg class="veld-svg" viewBox="0 0 100 154" preserveAspectRatio="none">
      <g stroke="rgba(255,255,255,0.55)" stroke-width="0.6" fill="none">
        <!-- Buitenlijnen -->
        <rect x="4" y="3" width="92" height="148" rx="1"/>
        <!-- Middenlijn -->
        <line x1="4" y1="77" x2="96" y2="77"/>
        <!-- Middencirkel -->
        <circle cx="50" cy="77" r="13"/>
        <circle cx="50" cy="77" r="0.8" fill="rgba(255,255,255,0.55)"/>
        <!-- Strafschopgebied boven -->
        <rect x="23" y="3" width="54" height="19"/>
        <!-- Klein doelgebied boven -->
        <rect x="36" y="3" width="28" height="8"/>
        <!-- Doel boven -->
        <rect x="42" y="1.5" width="16" height="3" stroke-width="0.8"/>
        <!-- Strafschopgebied onder -->
        <rect x="23" y="132" width="54" height="19"/>
        <!-- Klein doelgebied onder -->
        <rect x="36" y="143" width="28" height="8"/>
        <!-- Doel onder -->
        <rect x="42" y="149.5" width="16" height="3" stroke-width="0.8"/>
        <!-- Strafschopstip boven -->
        <circle cx="50" cy="14" r="0.8" fill="rgba(255,255,255,0.55)"/>
        <!-- Strafschopstip onder -->
        <circle cx="50" cy="140" r="0.8" fill="rgba(255,255,255,0.55)"/>
        <!-- Hoekbogen -->
        <path d="M4,7 A4,4 0 0,1 8,3"/>
        <path d="M92,3 A4,4 0 0,1 96,7"/>
        <path d="M4,147 A4,4 0 0,0 8,151"/>
        <path d="M92,151 A4,4 0 0,0 96,147"/>
      </g>
    </svg>`;

  veld.innerHTML = svg + cirkelHtml;

  // Klik op positie
  veld.querySelectorAll(".speler-positie").forEach(function (el) {
    el.addEventListener("click", function () {
      huidigePosIndex = parseInt(el.dataset.index);
      openSpelerKiezer();
    });
  });
}

/* ── Speler kiezer modal ────────────────────────────────────── */
function openSpelerKiezer() {
  const modal = document.getElementById("speler-kiezer-modal");
  const lijst = document.getElementById("kiezer-spelers-lijst");

  // Huidige selectie
  const huidig = opstellingSpelers[huidigePosIndex];

  // Vrijstaande spelers + optie 'leeg'
  const opties = [{ id: null, naam: "— Leeg laten —", rugnummer: "", positie: "" }].concat(
    alleSpelers.slice().sort(function (a, b) { return (a.rugnummer || 99) - (b.rugnummer || 99); })
  );

  lijst.innerHTML = opties.map(function (s) {
    const actief = s.id === huidig ? " stijl-actief" : "";
    const positieTekst = s.positie ? ` (${s.positie})` : "";
    return `
      <div class="kiezer-optie glass-kaart${actief}" data-speler-id="${s.id === null ? "" : s.id}">
        <span style="font-weight:700">${s.rugnummer ? "#" + s.rugnummer + " " : ""}${escapeHtml(s.naam)}</span>
        <span style="font-size:12px;color:var(--inkt-zacht)">${positieTekst}</span>
      </div>`;
  }).join("");

  lijst.querySelectorAll(".kiezer-optie").forEach(function (el) {
    el.addEventListener("click", function () {
      const id = el.dataset.spelerId === "" ? null : parseInt(el.dataset.spelerId);
      opstellingSpelers[huidigePosIndex] = id;
      sluitSpelerKiezer();
      renderVeld();
    });
  });

  modal.classList.add("open");
}

function sluitSpelerKiezer() {
  document.getElementById("speler-kiezer-modal").classList.remove("open");
}

/* ── Laden ──────────────────────────────────────────────────── */
async function laadWedstrijden() {
  try {
    const nu = new Date().toISOString();
    const data = await supaFetch("wedstrijden", {
      select: "id,datum,tegenstander,status",
      order:  "datum.asc",
    });
    alleWedstrijden = data || [];
    vulWedstrijdSelector();
  } catch (e) {
    console.error("Kon wedstrijden niet laden:", e);
  }
}

function vulWedstrijdSelector() {
  const sel = document.getElementById("wedstrijd-selector");
  if (!sel) return;
  sel.innerHTML = '<option value="">— Kies een wedstrijd —</option>' +
    alleWedstrijden.map(function (w) {
      const d = new Date(w.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
      return `<option value="${w.id}">${d}: ${escapeHtml(w.tegenstander)} (${w.status === "gepland" ? "Gepland" : "Gespeeld"})</option>`;
    }).join("");
}

async function laadSpelers() {
  try {
    const data = await supaFetch("spelers", { select: "*", order: "rugnummer.asc" });
    alleSpelers = data || [];
  } catch (e) {
    console.error("Kon spelers niet laden:", e);
  }
}

async function laadOpstelling(wedstrijdId) {
  if (!wedstrijdId) return;
  try {
    const data = await supaFetch("opstellingen", {
      select: "*",
      wedstrijd_id: "eq." + wedstrijdId,
      limit: "1",
    });
    if (data && data.length > 0) {
      const op = data[0];
      huidigOpstellingId = op.id;
      huidigeFormatie    = op.formatie || "4-3-3";

      // Laad geselecteerde formatiepil
      document.querySelectorAll(".formatie-pill").forEach(function (p) {
        p.classList.toggle("actief", p.dataset.formatie === huidigeFormatie);
      });

      // Herstel spelers
      opstellingSpelers = new Array(11).fill(null);
      if (op.spelers_json && Array.isArray(op.spelers_json)) {
        op.spelers_json.forEach(function (item) {
          if (item.positie_index < 11) {
            opstellingSpelers[item.positie_index] = item.speler_id || null;
          }
        });
      }
    } else {
      huidigOpstellingId = null;
      opstellingSpelers  = new Array(11).fill(null);
    }
    renderVeld();
  } catch (e) {
    console.error("Kon opstelling niet laden:", e);
    renderVeld();
  }
}

async function slaOpstellingOp() {
  const btn = document.getElementById("opslaan-btn");
  if (!gekozenWedstrijdId) {
    alert("Selecteer eerst een wedstrijd.");
    return;
  }
  btn.textContent = "Opslaan…";
  btn.disabled = true;

  const spelers_json = opstellingSpelers.map(function (id, i) {
    return { positie_index: i, speler_id: id };
  });

  const payload = {
    wedstrijd_id: gekozenWedstrijdId,
    formatie:     huidigeFormatie,
    spelers_json: spelers_json,
  };

  try {
    if (huidigOpstellingId) {
      await supaPatch("opstellingen", huidigOpstellingId, payload);
    } else {
      const result = await supaPost("opstellingen", payload);
      if (result && result[0]) huidigOpstellingId = result[0].id;
    }
    btn.textContent = "✓ Opgeslagen!";
    setTimeout(function () { btn.textContent = "Opstelling opslaan"; btn.disabled = false; }, 2000);
  } catch (e) {
    alert("Opslaan mislukt. Probeer opnieuw.");
    btn.textContent = "Opstelling opslaan";
    btn.disabled = false;
  }
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", async function () {
  // Laad data
  await Promise.all([laadWedstrijden(), laadSpelers()]);
  renderVeld();

  // Wedstrijd selector
  const wSel = document.getElementById("wedstrijd-selector");
  if (wSel) {
    wSel.addEventListener("change", function () {
      gekozenWedstrijdId = wSel.value ? parseInt(wSel.value) : null;
      laadOpstelling(gekozenWedstrijdId);
    });
  }

  // Formatie pills
  document.querySelectorAll(".formatie-pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      document.querySelectorAll(".formatie-pill").forEach(function (p) {
        p.classList.remove("actief");
      });
      pill.classList.add("actief");
      huidigeFormatie    = pill.dataset.formatie;
      opstellingSpelers  = new Array(11).fill(null);
      renderVeld();
    });
  });

  // Opslaan
  const opslaanBtn = document.getElementById("opslaan-btn");
  if (opslaanBtn) opslaanBtn.addEventListener("click", slaOpstellingOp);

  // Speler kiezer sluiten
  const kiezerModal = document.getElementById("speler-kiezer-modal");
  if (kiezerModal) {
    kiezerModal.addEventListener("click", function (e) {
      if (e.target === kiezerModal) sluitSpelerKiezer();
    });
  }
  const kiezerSluiten = document.getElementById("kiezer-sluiten");
  if (kiezerSluiten) kiezerSluiten.addEventListener("click", sluitSpelerKiezer);
});
