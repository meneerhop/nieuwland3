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
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
  }).then(function (r) {
    if (!r.ok) throw new Error("Netwerkfout " + r.status);
    return r.json();
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const raw = sessionStorage.getItem("nieuwland3_wedstrijd");

  if (!raw) {
    location.href = "wedstrijden.html";
    return;
  }

  const w = JSON.parse(raw);
  const d = new Date(w.datum);

  const dagLang = d.toLocaleDateString("nl-NL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
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

  // ── Opstelling ───────────────────────────────────────────────
  const opstellingSectie = document.getElementById("opstelling-sectie");
  if (!opstellingSectie) return;

  // Alleen Supabase wedstrijden hebben een integer id
  if (!w.id || typeof w.id !== "number") {
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
      supaFetch("spelers", { select: "id,naam,rugnummer,positie", order: "rugnummer.asc" }),
    ]);

    const op = opData && opData[0];
    const spelers = spelersData || [];

    if (!op) {
      // Geen opstelling gevonden — knop om samen te stellen
      opstellingSectie.innerHTML = `
        <button class="glass-kaart klikbaar" id="stel-op-btn" style="display:flex;align-items:center;gap:14px;padding:18px 20px;text-decoration:none;width:100%;text-align:left;border:none;cursor:pointer">
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

    // Opstelling gevonden — toon spelerlijst per positie
    const FORMATIES = {
      "4-3-3":   ["DM","RB","CV","CV","LB","CM","CVM","CM","RVA","SP","LVA"],
      "4-4-2":   ["DM","RB","CV","CV","LB","RVA","CM","CVM","LVA","SP","SP"],
      "3-4-1-2": ["DM","CV","CV","CV","RB","CM","CVM","LB","CAM","SP","SP"],
    };
    const posLabels = FORMATIES[op.formatie] || FORMATIES["4-3-3"];

    const spelerMap = {};
    spelers.forEach(function (s) { spelerMap[s.id] = s; });

    const spelerRijen = (op.spelers_json || [])
      .filter(function (item) { return item.speler_id; })
      .map(function (item) {
        const s = spelerMap[item.speler_id];
        if (!s) return "";
        const pos = posLabels[item.positie_index] || "–";
        return `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 20px;border-bottom:1px solid var(--lijn)">
            <div style="width:32px;height:32px;border-radius:50%;background:var(--groen);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0">${s.rugnummer || "?"}</div>
            <div style="flex:1;font-size:15px;font-weight:600;color:var(--inkt)">${escapeHtml(s.naam)}</div>
            <span style="font-size:12px;color:var(--inkt-zacht);font-weight:600">${escapeHtml(pos)}</span>
          </div>`;
      }).join("");

    opstellingSectie.innerHTML = `
      <div class="glass-kaart" style="overflow:hidden">
        <div style="padding:14px 20px;border-bottom:1px solid var(--lijn);display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700;font-size:15px;color:var(--inkt)">Opstelling · ${escapeHtml(op.formatie || "")}</div>
          <button id="wijzig-op-btn" class="btn btn-glas" style="font-size:12px;padding:6px 12px">Wijzigen</button>
        </div>
        ${spelerRijen || '<div style="padding:16px 20px;color:var(--inkt-zacht);font-size:14px">Nog geen spelers ingevuld</div>'}
      </div>`;

    document.getElementById("wijzig-op-btn").addEventListener("click", function () {
      sessionStorage.setItem("nieuwland3_opstelling_wedstrijd_id", String(w.id));
      location.href = "opstelling.html";
    });

  } catch (e) {
    opstellingSectie.innerHTML = `
      <div class="glass-kaart" style="padding:16px 20px;color:var(--inkt-zacht);font-size:14px">
        Opstelling kon niet worden geladen.
      </div>`;
  }
});
