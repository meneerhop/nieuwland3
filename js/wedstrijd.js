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

document.addEventListener("DOMContentLoaded", function () {
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
});
