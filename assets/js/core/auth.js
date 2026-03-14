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
    return TEST_ACCOUNTS.some((account) => account.email === email && account.password === password);
}
export function isAllowedTestUser(email) {
    return TEST_ACCOUNTS.some((account) => account.email === email);
}
export function isAllowedAdminUser(email) {
    return email === ADMIN_TEST_EMAIL;
}
