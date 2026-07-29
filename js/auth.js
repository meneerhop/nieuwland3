/* ============================================================
   ASC Nieuwland 3 — Authentication helpers
   ============================================================ */

const AUTH_KEY = "nieuwland3_pin";

/** Controleer of de gebruiker is ingelogd */
function isIngelogd() {
  return localStorage.getItem(AUTH_KEY) === SITE_PIN;
}

/** Stuur door naar login als niet ingelogd. Roep aan op elke beveiligde pagina. */
function controleerAuth() {
  if (!isIngelogd()) {
    location.href = "login.html";
  }
}

/** Log de gebruiker uit en stuur naar login */
function logUit() {
  localStorage.removeItem(AUTH_KEY);
  location.href = "login.html";
}
