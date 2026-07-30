/* ============================================================
   ASC Nieuwland 3 — Wedstrijd detail JS
   ============================================================ */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resultaatLabel(eigen, teg) {
  if (eigen > teg)  return { tekst: "Gewonnen", klasse: "badge-winst" };
  if (eigen < teg)  return { tekst: "Verloren", klasse: "badge-verlies" };
  return { tekst: "Gelijk", klasse: "badge-gelijk" };
}

function supaFetch(pad, params) {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  return fetch(SUPABASE_URL + pad + query, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
  }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
}

function supaUpsert(pad, body) {
  return fetch(SUPABASE_URL + pad, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  }).then(function (r) { if (!r.ok) throw new Error(r.status); });
}

function supaPatch(pad, filter, body) {
  return fetch(SUPABASE_URL + pad + "?" + filter, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  }).then(function (r) { if (!r.ok) throw new Error(r.status); });
}

document.addEventListener("DOMContentLoaded", async function () {
  const raw = sessionStorage.getItem("nieuwland3_wedstrijd");
  if (!raw) { location.href = "wedstrijden.html"; return; }

  const w = JSON.parse(raw);
  const d = new Date(w.datum);

  const dagLang = d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const tijdStr = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const thuisBadge = w.thuis_uit === "thuis"
    ? '<span class="badge badge-groen">Thuis</span>'
    : '<span class="badge badge-grijs">Uit</span>';

  // ── Header ──────────────────────────────────────────────────
  const headerEl = document.getElementById("wedstrijd-header");

  if (w.status === "gespeeld") {
    const res = resultaatLabel(w.score_eigen, w.score_tegenstander);
    headerEl.innerHTML = `
      <div style="font-size:13px;color:var(--inkt-zacht);margin-bottom:8px">${dagLang}</div>
      <div style="font-size:17px;font-weight:700;color:var(--inkt);margin-bottom:16px">
        ${escapeHtml(TEAM_NAAM)} vs ${escapeHtml(w.tegenstander)}
      </div>
      <div class="score-groot" style="font-size:52px;line-height:1;margin-bottom:14px">
        ${w.score_eigen} – ${w.score_tegenstander}
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <span class="badge ${res.klasse}" style="font-size:14px;padding:6px 16px">${res.tekst}</span>
        ${thuisBadge}
      </div>`;
  } else {
    headerEl.innerHTML = `
      <div style="font-size:13px;color:var(--inkt-zacht);margin-bottom:8px">${dagLang}</div>
      <div style="font-size:17px;font-weight:700;color:var(--inkt);margin-bottom:16px">
        ${escapeHtml(TEAM_NAAM)} vs ${escapeHtml(w.tegenstander)}
      </div>
      <div style="font-size:42px;font-weight:800;color:var(--groen);letter-spacing:-1px;margin-bottom:14px">
        ${tijdStr}
      </div>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        ${thuisBadge}
        <span class="badge badge-wit">Aanvang</span>
      </div>`;
  }

  // ── Details ──────────────────────────────────────────────────
  const detailsEl = document.getElementById("wedstrijd-details");
  const rijen = [];

  rijen.push(`
    <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--lijn)">
      <span style="font-size:20px">📅</span>
      <div>
        <div style="font-size:11px;color:var(--inkt-zacht);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Datum & tijd</div>
        <div style="font-size:15px;font-weight:600;color:var(--inkt)">${dagLang} om ${tijdStr}</div>
      </div>
    </div>`);

  rijen.push(`
    <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--lijn)">
      <span style="font-size:20px">${w.thuis_uit === "thuis" ? "🏠" : "✈️"}</span>
      <div>
        <div style="font-size:11px;color:var(--inkt-zacht);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Thuis / Uit</div>
        <div style="font-size:15px;font-weight:600;color:var(--inkt)">${w.thuis_uit === "thuis" ? "Thuiswedstrijd" : "Uitwedstrijd"}</div>
      </div>
    </div>`);

  if (w.locatie) {
    rijen.push(`
      <div style="display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--lijn)">
        <span style="font-size:20px">📍</span>
        <div>
          <div style="font-size:11px;color:var(--inkt-zacht);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Locatie</div>
          <div style="font-size:15px;font-weight:600;color:var(--inkt)">${escapeHtml(w.locatie)}</div>
        </div>
      </div>`);
  }

  rijen.push(`
    <div style="display:flex;align-items:center;gap:12px;padding:14px 20px">
      <span style="font-size:20px">⚽</span>
      <div>
        <div style="font-size:11px;color:var(--inkt-zacht);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">Tegenstander</div>
        <div style="font-size:15px;font-weight:600;color:var(--inkt)">${escapeHtml(w.tegenstander)}</div>
      </div>
    </div>`);

  detailsEl.innerHTML = rijen.join("");

  // Only Supabase matches (integer id) have extra features
  const heeftId = w.id && typeof w.id === "number";

  // ── Verslag ──────────────────────────────────────────────────
  const verslagSectie = document.getElementById("verslag-sectie");
  if (verslagSectie) {
    if (!heeftId) {
      verslagSectie.innerHTML = "";
      document.getElementById("verslag-label").style.display = "none";
    } else {
      renderVerslag(w);
    }
  }

  // ── Beschikbaarheid ──────────────────────────────────────────
  const beschikbaarheidSectie = document.getElementById("beschikbaarheid-sectie");
  if (beschikbaarheidSectie) {
    if (!heeftId) {
      beschikbaarheidSectie.innerHTML = "";
      document.getElementById("beschikbaarheid-label").style.display = "none";
    } else {
      laadBeschikbaarheid(w.id);
    }
  }

  // ── Opstelling ───────────────────────────────────────────────
  const opstellingSectie = document.getElementById("opstelling-sectie");
  if (!opstellingSectie) return;

  if (!heeftId) {
    opstellingSectie.innerHTML = `
      <a href="opstelling.html" class="glass-kaart klikbaar" style="display:flex;align-items:center;gap:14px;padding:18px 20px;text-decoration:none">
        <span style="font-size:28px">📋</span>
        <div>
          <div style="font-weight:700;font-size:15px;color:var(--inkt)">Opstelling samenstellen</div>
          <div style="font-size:12px;color:var(--inkt-zacht)">Formatie & spelerposities</div>
        </div>
        <span style="margin-left:auto;color:var(--inkt-zacht);font-size:18px">›</span>
      </a>`;
    return;
  }

  try {
    const [opData, spelersData] = await Promise.all([
      supaFetch("opstellingen", { select: "*", wedstrijd_id: "eq." + w.id, limit: "1" }),
      supaFetch("spelers", { select: "id,naam,rugnummer", order: "rugnummer.asc" }),
    ]);

    const op = opData && opData[0];
    const spelers = spelersData || [];

    if (!op) {
      opstellingSectie.innerHTML = `
        <button class="glass-kaart klikbaar" id="stel-op-btn" style="display:flex;align-items:center;gap:14px;padding:18px 20px;width:100%;text-align:left;border:none;cursor:pointer">
          <span style="font-size:28px">📋</span>
          <div>
            <div style="font-weight:700;font-size:15px;color:var(--inkt)">Opstelling samenstellen</div>
            <div style="font-size:12px;color:var(--inkt-zacht)">Nog geen opstelling ingevuld</div>
          </div>
          <span style="margin-left:auto;color:var(--inkt-zacht);font-size:18px">›</span>
        </button>`;
      document.getElementById("stel-op-btn").addEventListener("click", function () {
        sessionStorage.setItem("nieuwland3_opstelling_wedstrijd_id", String(w.id));
        location.href = "opstelling.html";
      });
      return;
    }

    const FORMATIE_LABELS = {
      "4-3-3":   ["DM","RB","CV","CV","LB","CM","CVM","CM","RVA","SP","LVA"],
      "4-4-2":   ["DM","RB","CV","CV","LB","RVA","CM","CVM","LVA","SP","SP"],
      "3-4-1-2": ["DM","CV","CV","CV","RB","CM","CVM","LB","CAM","SP","SP"],
    };
    const posLabels = FORMATIE_LABELS[op.formatie] || FORMATIE_LABELS["4-3-3"];
    const spelerMap = {};
    spelers.forEach(function (s) { spelerMap[s.id] = s; });

    const basisRijen = (op.spelers_json || [])
      .filter(function (item) { return item.speler_id && item.positie_index < 11; })
      .map(function (item) {
        const s = spelerMap[item.speler_id];
        if (!s) return "";
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 20px;border-bottom:1px solid var(--lijn)">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--blauw);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">${s.rugnummer || "?"}</div>
          <div style="flex:1;font-size:15px;font-weight:600;color:var(--inkt)">${escapeHtml(s.naam)}</div>
          <span style="font-size:12px;color:var(--inkt-zacht);font-weight:600">${escapeHtml(posLabels[item.positie_index] || "–")}</span>
        </div>`;
      }).join("");

    const bankRijen = (op.spelers_json || [])
      .filter(function (item) { return item.speler_id && item.positie_index >= 11; })
      .map(function (item) {
        const s = spelerMap[item.speler_id];
        if (!s) return "";
        return `<div style="display:flex;align-items:center;gap:12px;padding:8px 20px;border-bottom:1px solid var(--lijn)">
          <div style="width:28px;height:28px;border-radius:50%;background:var(--inkt-zacht);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0">${s.rugnummer || "?"}</div>
          <div style="flex:1;font-size:14px;font-weight:600;color:var(--inkt-zacht)">${escapeHtml(s.naam)}</div>
          <span style="font-size:11px;color:var(--inkt-fijn);font-weight:600">Bank</span>
        </div>`;
      }).join("");

    opstellingSectie.innerHTML = `
      <div class="glass-kaart" style="overflow:hidden">
        <div style="padding:14px 20px;border-bottom:1px solid var(--lijn);display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;font-size:15px;color:var(--inkt)">Opstelling · ${escapeHtml(op.formatie || "")}</div>
          <button id="wijzig-op-btn" class="btn btn-glas" style="font-size:12px;padding:6px 12px">Wijzigen</button>
        </div>
        ${basisRijen || '<div style="padding:16px 20px;color:var(--inkt-zacht);font-size:14px">Nog geen spelers ingevuld</div>'}
        ${bankRijen ? `<div style="padding:8px 20px 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--inkt-zacht);background:rgba(10,15,26,0.04);border-top:1px solid var(--lijn)">Wisselspelers</div>${bankRijen}` : ""}
      </div>`;

    document.getElementById("wijzig-op-btn").addEventListener("click", function () {
      sessionStorage.setItem("nieuwland3_opstelling_wedstrijd_id", String(w.id));
      location.href = "opstelling.html";
    });

  } catch (e) {
    opstellingSectie.innerHTML = `<div class="glass-kaart" style="padding:16px 20px;color:var(--inkt-zacht);font-size:14px">Opstelling kon niet worden geladen.</div>`;
  }
});

// ── Verslag ────────────────────────────────────────────────────
function renderVerslag(w) {
  const el = document.getElementById("verslag-sectie");
  if (!el) return;

  const huidigVerslag = w.verslag || "";

  el.innerHTML = `
    <div class="glass-kaart" style="overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--lijn);display:flex;align-items:center;justify-content:space-between">
        <div style="font-weight:700;font-size:15px;color:var(--inkt)">Wedstrijdverslag</div>
        <button id="verslag-bewerk-btn" class="btn btn-glas" style="font-size:12px;padding:6px 12px">
          ${huidigVerslag ? "Bewerken" : "Toevoegen"}
        </button>
      </div>
      <div id="verslag-inhoud">
        ${huidigVerslag
          ? `<div class="verslag-tekst">${escapeHtml(huidigVerslag)}</div>`
          : `<div style="padding:14px 20px;font-size:14px;color:var(--inkt-zacht)">Nog geen verslag toegevoegd</div>`}
      </div>
      <div id="verslag-edit" style="display:none;padding:12px 20px;border-top:1px solid var(--lijn)">
        <textarea id="verslag-textarea" class="formulier-textarea" style="min-height:120px" placeholder="Schrijf hier het verslag…">${escapeHtml(huidigVerslag)}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button id="verslag-opslaan-btn" class="btn btn-primair" style="flex:1;font-size:14px;padding:10px">Opslaan</button>
          <button id="verslag-annuleer-btn" class="btn btn-glas" style="font-size:14px;padding:10px">Annuleer</button>
        </div>
      </div>
    </div>`;

  document.getElementById("verslag-bewerk-btn").addEventListener("click", function () {
    document.getElementById("verslag-edit").style.display = "block";
    document.getElementById("verslag-inhoud").style.display = "none";
    document.getElementById("verslag-bewerk-btn").style.display = "none";
  });

  document.getElementById("verslag-annuleer-btn").addEventListener("click", function () {
    document.getElementById("verslag-edit").style.display = "none";
    document.getElementById("verslag-inhoud").style.display = "block";
    document.getElementById("verslag-bewerk-btn").style.display = "";
  });

  document.getElementById("verslag-opslaan-btn").addEventListener("click", async function () {
    const btn = document.getElementById("verslag-opslaan-btn");
    const tekst = document.getElementById("verslag-textarea").value.trim();
    btn.textContent = "Opslaan…"; btn.disabled = true;
    try {
      await supaPatch("wedstrijden", "id=eq." + w.id, { verslag: tekst || null });
      w.verslag = tekst || null;
      sessionStorage.setItem("nieuwland3_wedstrijd", JSON.stringify(w));
      renderVerslag(w);
    } catch (e) {
      alert("Opslaan mislukt.");
      btn.textContent = "Opslaan"; btn.disabled = false;
    }
  });
}

// ── Beschikbaarheid ────────────────────────────────────────────
async function laadBeschikbaarheid(wedstrijdId) {
  const el = document.getElementById("beschikbaarheid-sectie");
  if (!el) return;

  el.innerHTML = '<div class="skeleton skeleton-kaart" style="min-height:80px;margin:0;border-radius:22px"></div>';

  try {
    const [spelersData, beschData] = await Promise.all([
      supaFetch("spelers", { select: "id,naam,rugnummer,status", order: "rugnummer.asc" }),
      supaFetch("beschikbaarheid", { select: "*", wedstrijd_id: "eq." + wedstrijdId }),
    ]);

    const spelers = (spelersData || []).filter(function (s) {
      return !s.status || s.status === "beschikbaar";
    });
    const beschMap = {};
    (beschData || []).forEach(function (b) { beschMap[b.speler_id] = b.beschikbaar; });

    const beschikbaar = spelers.filter(function (s) { return beschMap[s.id] === true; });
    const aantalJa = beschikbaar.length;

    el.innerHTML = `
      <div class="glass-kaart" style="overflow:hidden">
        <div style="padding:14px 20px;border-bottom:1px solid var(--lijn);display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;font-size:15px;color:var(--inkt)">Beschikbaarheid</div>
          <span class="badge badge-blauw">${aantalJa} / ${spelers.length}</span>
        </div>
        <div id="beschikbaar-lijst">
          ${spelers.map(function (s) {
            const staat = beschMap[s.id];
            return `<div class="beschikbaar-item" data-speler="${s.id}">
              <div>
                <div class="beschikbaar-naam">${escapeHtml(s.naam)}</div>
                ${s.rugnummer ? `<div class="beschikbaar-sub">#${s.rugnummer}</div>` : ""}
              </div>
              <div class="beschikbaar-btns">
                <button class="beschikbaar-btn ja${staat === true ? " actief" : ""}" title="Beschikbaar">✓</button>
                <button class="beschikbaar-btn nee${staat === false ? " actief" : ""}" title="Niet beschikbaar">✗</button>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`;

    el.querySelectorAll(".beschikbaar-item").forEach(function (item) {
      const spelerId = parseInt(item.dataset.speler);
      item.querySelectorAll(".beschikbaar-btn").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          const isJa = btn.classList.contains("ja");
          const huidig = btn.classList.contains("actief");
          const nieuwStatus = huidig ? null : isJa;

          // Optimistic UI
          item.querySelector(".beschikbaar-btn.ja").classList.toggle("actief", nieuwStatus === true);
          item.querySelector(".beschikbaar-btn.nee").classList.toggle("actief", nieuwStatus === false);
          beschMap[spelerId] = nieuwStatus;

          // Update count
          const jaTotaal = Object.values(beschMap).filter(function (v) { return v === true; }).length;
          const badge = el.querySelector(".badge-blauw");
          if (badge) badge.textContent = jaTotaal + " / " + spelers.length;

          if (nieuwStatus === null) {
            // DELETE record
            try {
              await fetch(SUPABASE_URL + "beschikbaarheid?wedstrijd_id=eq." + wedstrijdId + "&speler_id=eq." + spelerId, {
                method: "DELETE",
                headers: { apikey: SUPABASE_ANON_KEY, Authorization: "Bearer " + SUPABASE_ANON_KEY },
              });
            } catch (e) {}
          } else {
            try {
              await supaUpsert("beschikbaarheid", {
                wedstrijd_id: wedstrijdId,
                speler_id: spelerId,
                beschikbaar: nieuwStatus,
              });
            } catch (e) {}
          }
        });
      });
    });

  } catch (e) {
    el.innerHTML = '<div class="glass-kaart" style="padding:16px 20px;color:var(--inkt-zacht);font-size:14px">Beschikbaarheid kon niet worden geladen.</div>';
  }
}
