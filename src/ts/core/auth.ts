import type { TestAccount } from "../../../assets/js/types/core";

export const TEST_ACCOUNTS: TestAccount[] = [
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

export function getPortalSessionEmail(): string | null {
  return sessionStorage.getItem(AUTH_STORAGE_KEY);
}

export function getRememberedPortalEmail(): string | null {
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function syncRememberedPortalSession(): string | null {
  const rememberedEmail = getRememberedPortalEmail();
  if (rememberedEmail && !getPortalSessionEmail()) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, rememberedEmail);
  }

  return rememberedEmail;
}

export function rememberPortal(email: string): void {
  localStorage.setItem(AUTH_STORAGE_KEY, email);
}

export function forgetPortal(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function setPortalSession(email: string): void {
  sessionStorage.setItem(AUTH_STORAGE_KEY, email);
}

export function clearPortalAuth(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getAdminSessionEmail(): string | null {
  return sessionStorage.getItem(ADMIN_SESSION_KEY);
}

export function getRememberedAdminEmail(): string | null {
  return localStorage.getItem(ADMIN_REMEMBER_KEY);
}

export function syncRememberedAdminSession(): string | null {
  const rememberedEmail = getRememberedAdminEmail();
  if (rememberedEmail && !getAdminSessionEmail()) {
    sessionStorage.setItem(ADMIN_SESSION_KEY, rememberedEmail);
  }

  return rememberedEmail;
}

export function setAdminSession(email: string): void {
  sessionStorage.setItem(ADMIN_SESSION_KEY, email);
}

export function rememberAdmin(email: string): void {
  localStorage.setItem(ADMIN_REMEMBER_KEY, email);
}

export function forgetAdmin(): void {
  localStorage.removeItem(ADMIN_REMEMBER_KEY);
}

export function clearAdminAuth(): void {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_REMEMBER_KEY);
}

export function isValidTestCredential(email: string, password: string): boolean {
  return TEST_ACCOUNTS.some(
    (account) => account.email === email && account.password === password
  );
}

export function isAllowedTestUser(email: string): boolean {
  return TEST_ACCOUNTS.some((account) => account.email === email);
}

export function isAllowedAdminUser(email: string): boolean {
  return email === ADMIN_TEST_EMAIL;
}
