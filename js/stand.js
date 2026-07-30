/* ============================================================
   ASC Nieuwland 3 — Stand JS (Sportlink)
   ============================================================ */

/* ── Helpers ───────────────────────────────────────────────── */
function sportlinkFetch(endpoint, params) {
  const p = Object.assign({ client_id: SPORTLINK_CLIENT_ID }, params || {});
  return fetch("https://data.sportlink.com/" + endpoint + "?" + new URLSearchParams(p))
    .then(function (r) {
      if (!r.ok) throw new Error("Fout " + r.status);
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

function isEigenTeam(team) {
  return team && team.toLowerCase().includes("nieuwland 3");
}

/* ── State ──────────────────────────────────────────────────── */
let alleRijen = [];

/* ── Render ─────────────────────────────────────────────────── */
function renderStand() {
  const container = document.getElementById("stand-tabel-wrapper");
  if (!container) return;

  if (alleRijen.length === 0) {
    container.innerHTML = `
      <div class="leeg-staat">
        <div class="leeg-icoon">📊</div>
        <div class="leeg-tekst">Stand nog niet beschikbaar</div>
      </div>`;
    return;
  }

  const rijen = alleRijen.map(function (r, i) {
    const teamnaam  = r.teamnaam  || r.team  || "";
    const eigen     = isEigenTeam(teamnaam);
    const doelVoor  = r.doelpunten_voor  ?? r.goals_voor  ?? 0;
    const doelTegen = r.doelpunten_tegen ?? r.goals_tegen ?? 0;
    const ds        = doelVoor - doelTegen;
    const dsStr     = ds > 0 ? "+" + ds : String(ds);
    const gespeeld  = r.wedstrijden ?? r.gespeeld ?? 0;

    return `
      <tr class="${eigen ? "eigen-team" : ""}">
        <td>${r.positie ?? (i + 1)}</td>
        <td>${escapeHtml(teamnaam)}</td>
        <td>${gespeeld}</td>
        <td>${r.gewonnen ?? 0}</td>
        <td>${r.gelijk ?? 0}</td>
        <td>${r.verloren ?? 0}</td>
        <td>${doelVoor}</td>
        <td>${doelTegen}</td>
        <td>${dsStr}</td>
        <td class="punten-cel">${r.punten ?? 0}</td>
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
        </tr>
      </thead>
      <tbody>${rijen}</tbody>
    </table>`;
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
    const data = await sportlinkFetch("stand");
    console.log("Sportlink stand:", data);
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

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", function () {
  laadStand();
});
