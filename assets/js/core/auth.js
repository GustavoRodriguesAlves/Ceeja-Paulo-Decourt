// @ts-check

/** @typedef {import("../types/core").TestAccount} TestAccount */

/** @type {TestAccount[]} */
export const TEST_ACCOUNTS = [
  {
    email: "chief@gmail.com",
    password: "123"
  },
  {
    email: "gabriel@gmail.com",
    password: "123"
  }
];

export const PRIMARY_TEST_LOGIN_EMAIL = TEST_ACCOUNTS[0].email;
export const ADMIN_TEST_EMAIL = PRIMARY_TEST_LOGIN_EMAIL;
export const AUTH_STORAGE_KEY = "ceeja_portal_auth";
export const ADMIN_SESSION_KEY = "ceeja_admin_auth";
export const ADMIN_REMEMBER_KEY = "ceeja_admin_auth_remembered";
export const SITE_CONTENT_STORAGE_KEY = "ceeja_site_content_draft";

/**
 * @returns {string | null}
 */
export function getPortalSessionEmail() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY);
}

/**
 * @returns {string | null}
 */
export function getRememberedPortalEmail() {
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

/**
 * @returns {string | null}
 */
export function syncRememberedPortalSession() {
  const rememberedEmail = getRememberedPortalEmail();
  if (rememberedEmail && !getPortalSessionEmail()) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, rememberedEmail);
  }

  return rememberedEmail;
}

/**
 * @param {string} email
 * @returns {void}
 */
export function rememberPortal(email) {
  localStorage.setItem(AUTH_STORAGE_KEY, email);
}

/**
 * @returns {void}
 */
export function forgetPortal() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * @param {string} email
 * @returns {void}
 */
export function setPortalSession(email) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, email);
}

/**
 * @returns {void}
 */
export function clearPortalAuth() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

/**
 * @returns {string | null}
 */
export function getAdminSessionEmail() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY);
}

/**
 * @returns {string | null}
 */
export function getRememberedAdminEmail() {
  return localStorage.getItem(ADMIN_REMEMBER_KEY);
}

/**
 * @returns {string | null}
 */
export function syncRememberedAdminSession() {
  const rememberedEmail = getRememberedAdminEmail();
  if (rememberedEmail && !getAdminSessionEmail()) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, rememberedEmail);
  }

  return rememberedEmail;
}

/**
 * @param {string} email
 * @returns {void}
 */
export function setAdminSession(email) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, email);
}

/**
 * @param {string} email
 * @returns {void}
 */
export function rememberAdmin(email) {
  localStorage.setItem(ADMIN_REMEMBER_KEY, email);
}

/**
 * @returns {void}
 */
export function forgetAdmin() {
  localStorage.removeItem(ADMIN_REMEMBER_KEY);
}

/**
 * @returns {void}
 */
export function clearAdminAuth() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_REMEMBER_KEY);
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {boolean}
 */
export function isValidTestCredential(email, password) {
  return TEST_ACCOUNTS.some(
    (account) => account.email === email && account.password === password
  );
}

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isAllowedTestUser(email) {
  return TEST_ACCOUNTS.some((account) => account.email === email);
}

/**
 * @param {string} email
 * @returns {boolean}
 */
export function isAllowedAdminUser(email) {
  return email === ADMIN_TEST_EMAIL;
}
