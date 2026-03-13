export const TEST_LOGIN_EMAIL = "eugustavorodriguesalves@gmail.com";
export const TEST_LOGIN_PASSWORD = "Gu130106.";
export const AUTH_STORAGE_KEY = "ceeja_portal_auth";
export const ADMIN_SESSION_KEY = "ceeja_admin_auth";
export const ADMIN_REMEMBER_KEY = "ceeja_admin_auth_remembered";
export const SITE_CONTENT_STORAGE_KEY = "ceeja_site_content_draft";

export function getPortalSessionEmail() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY);
}

export function getRememberedPortalEmail() {
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function syncRememberedPortalSession() {
  const rememberedEmail = getRememberedPortalEmail();
  if (rememberedEmail && !getPortalSessionEmail()) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, rememberedEmail);
  }
  return rememberedEmail;
}

export function rememberPortal(email) {
  localStorage.setItem(AUTH_STORAGE_KEY, email);
}

export function forgetPortal() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function setPortalSession(email) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, email);
}

export function clearPortalAuth() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAdminSessionEmail() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY);
}

export function getRememberedAdminEmail() {
  return localStorage.getItem(ADMIN_REMEMBER_KEY);
}

export function syncRememberedAdminSession() {
  const rememberedEmail = getRememberedAdminEmail();
  if (rememberedEmail && !getAdminSessionEmail()) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, rememberedEmail);
  }
  return rememberedEmail;
}

export function setAdminSession(email) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, email);
}

export function rememberAdmin(email) {
  localStorage.setItem(ADMIN_REMEMBER_KEY, email);
}

export function forgetAdmin() {
  localStorage.removeItem(ADMIN_REMEMBER_KEY);
}

export function clearAdminAuth() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_REMEMBER_KEY);
}

export function isValidTestCredential(email, password) {
  return email === TEST_LOGIN_EMAIL && password === TEST_LOGIN_PASSWORD;
}
