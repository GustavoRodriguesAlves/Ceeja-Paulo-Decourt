import {
  clearPortalAuth,
  getPortalSessionEmail,
  isAllowedTestUser,
  PRIMARY_TEST_LOGIN_EMAIL,
  syncRememberedPortalSession
} from "../core/auth.js";
import { fetchPublishedSiteContent } from "../core/site-content.js";

const NOTES_TOKEN =
  "eyJhbGciOiJSUzI1NiIsImtpZCI6IjUzMDcyNGQ0OTE3M2EzZWQ2YjRhMDBhYTYzNDQyMDMwMGQ3MmFlNWIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXpwIjoiNDI0ODk5MjM4NjQ2LTlyb3Y0djIxbjg5MzZ0cnJhdWdybDN2Y2IzY3M1NGlkLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiNDI0ODk5MjM4NjQ2LTlyb3Y0djIxbjg5MzZ0cnJhdWdybDN2Y2IzY3M1NGlkLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTE1Nzg3Mzk5MTg0MDg5MjE5ODc0IiwiZW1haWwiOiJldWd1c3Rhdm9yb2RyaWd1ZXNhbHZlc0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6IkFhVmgyU2MwSHBDeHN4QTYtRExkMmciLCJuYmYiOjE3NzMzNDgxMDUsIm5hbWUiOiJHdXN0YXZvIFJvZHJpZ3VlcyBBbHZlcyIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMMUQtSWoyd2s5SlV4cF9WWFJvMDgyS3pJMER1OXVmQWI2cllsWTVZMEQyeTBqSXc9czk2LWMiLCJnaXZlbl9uYW1lIjoiR3VzdGF2byIsImZhbWlseV9uYW1lIjoiUm9kcmlndWVzIEFsdmVzIiwiaWF0IjoxNzczMzQ4NDA1LCJleHAiOjE3NzMzNTIwMDUsImp0aSI6IjZkMDNkYzc2MGM2Yzc5ZmVmNzNmNTFjNzgxNWNjYzdiNzRmM2VlYzIifQ.ABVzBNz-S6hTeDgACwOyafRzgQltKJd0THkPT1YekGo4ntO44oLdef6NtudsAe4C_NWKKyJqAJb4NSFRO_VS0XqqKx6HtmkbJxOyMBmu46bAIkBAY6EpNi-o1-b3YSNQr3heA3z7PpPrfcGWvkZsdmDEHeGUrgtMEtY22q43Kj5Ge3hCaW49enscGrF0U0TE3TlvlrLBNTNnbeWmmi1evo9DW9n1w75qkbuf8XftbywTKeSEHKO06CraJMZUde4YUHgJsj6zY9Bnb5mv_fRKJzfIjTAWDGCc962QdPlW2ZB8nw8CuN9mEVnZ1WzE2gA9vnw3MHneHLEljAxRhp_Wzg";
const NOTES_BASE_URL =
  "https://script.google.com/macros/s/AKfycbyVf3T34dxhgWYWebvuPE8o2JHQIhzLrIqOfDCK1UvdC_vGz6gLj20A30FS5EwTGZXdxw/exec";
const RA_STORAGE_KEY = "ceeja_prepared_ra";

const rememberedEmail = syncRememberedPortalSession();
const userEmail = getPortalSessionEmail() || rememberedEmail;

if (!userEmail || !isAllowedTestUser(userEmail)) {
  window.location.replace("index.html");
}

const userEmailElement = document.getElementById("userEmail");
const logoutButton = document.getElementById("logoutBtn");
const notasModal = document.getElementById("notasModal");
const popupBlockedMessage = document.getElementById("popupBlockedMessage");
const notasDirectLink = document.getElementById("notasDirectLink");
const launchNotasPopup = document.getElementById("launchNotasPopup");
const closeNotasModalButton = document.getElementById("closeNotasModal");
const raWithUfInput = document.getElementById("raWithUfInput");
const raValidationMessage = document.getElementById("raValidationMessage");
const raPreparedMessage = document.getElementById("raPreparedMessage");
const noticeList = document.getElementById("noticeList");
const quickLinksList = document.getElementById("quickLinksList");
const portalGallery = document.getElementById("portalGallery");

let portalRefreshTimer = null;
let lastPortalRefreshAt = 0;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDisplayDate = (value) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("pt-BR");
};

if (userEmailElement) {
  userEmailElement.textContent = userEmail || "-";
}

function buildNotasUrl() {
  return `${NOTES_BASE_URL}?usuario=${encodeURIComponent(
    userEmail || PRIMARY_TEST_LOGIN_EMAIL
  )}&ra=&tel=&token=${NOTES_TOKEN}`;
}

function openNotasModal() {
  popupBlockedMessage?.classList.add("hidden");
  raValidationMessage?.classList.add("hidden");
  raPreparedMessage?.classList.add("hidden");
  if (notasDirectLink) {
    notasDirectLink.href = buildNotasUrl();
  }
  if (raWithUfInput) {
    raWithUfInput.value = sessionStorage.getItem(RA_STORAGE_KEY) || "";
  }
  notasModal?.classList.remove("hidden");
  notasModal?.classList.add("flex");
  document.body.style.overflow = "hidden";
  window.setTimeout(() => raWithUfInput?.focus(), 0);
}

function closeNotasModal() {
  notasModal?.classList.add("hidden");
  notasModal?.classList.remove("flex");
  document.body.style.overflow = "";
}

async function openNotasPopup() {
  const raValue = raWithUfInput?.value.trim().toUpperCase();
  if (!raValue) {
    raValidationMessage?.classList.remove("hidden");
    raPreparedMessage?.classList.add("hidden");
    raWithUfInput?.focus();
    return;
  }

  sessionStorage.setItem(RA_STORAGE_KEY, raValue);
  const targetUrl = buildNotasUrl();
  if (notasDirectLink) {
    notasDirectLink.href = targetUrl;
  }

  raValidationMessage?.classList.add("hidden");
  raPreparedMessage?.classList.remove("hidden");

  const popupWidth = Math.min(980, Math.floor(window.screen.availWidth * 0.82));
  const popupHeight = Math.min(760, Math.floor(window.screen.availHeight * 0.82));
  const left = Math.max(0, Math.floor((window.screen.availWidth - popupWidth) / 2));
  const top = Math.max(0, Math.floor((window.screen.availHeight - popupHeight) / 2));
  const features = `popup=yes,width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(raValue);
    } catch (error) {
      console.warn("Não foi possível copiar o RA automaticamente.", error);
    }
  }

  const popupWindow = window.open(targetUrl, "ceejaNotasPopup", features);
  if (!popupWindow) {
    popupBlockedMessage?.classList.remove("hidden");
    return;
  }

  popupWindow.focus();
  closeNotasModal();
}

function renderPortalContent(content) {
  const notices = Array.isArray(content?.notices)
    ? content.notices
        .filter((item) => item.published)
        .sort((a, b) => {
          if (Boolean(a.featured) !== Boolean(b.featured)) {
            return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
          }
          return String(b.date).localeCompare(String(a.date));
        })
    : [];

  const quickLinks = Array.isArray(content?.quickLinks)
    ? content.quickLinks.filter((item) => item.published)
    : [];
  const gallery = Array.isArray(content?.gallery)
    ? content.gallery
        .filter((item) => item.published)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    : [];

  if (noticeList) {
    noticeList.innerHTML = notices.length
      ? notices
          .map(
            (notice) => `
              <article class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded border border-blue-200">${escapeHtml(
                    notice.category || "Aviso"
                  )}</span>
                  <span class="text-xs font-semibold text-gray-500">${escapeHtml(
                    formatDisplayDate(notice.date)
                  )}</span>
                </div>
                <h3 class="mt-3 text-lg font-bold text-[var(--brand-primary)]">${escapeHtml(
                  notice.title || ""
                )}</h3>
                <p class="mt-2 text-gray-600 leading-relaxed text-sm">${escapeHtml(
                  notice.summary || ""
                )}</p>
              </article>
            `
          )
          .join("")
      : '<div class="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded border border-gray-100">Nenhum aviso publicado no momento.</div>';
  }

  if (quickLinksList) {
    quickLinksList.innerHTML = quickLinks.length
      ? quickLinks
          .map(
            (link) => `
              <a class="dashboard-link action-btn flex items-center justify-between group !mb-0" href="${escapeHtml(
                link.url || "#"
              )}" target="_blank" rel="noopener noreferrer">
                <div>
                  <p class="font-bold text-gray-800 text-sm group-hover:text-[var(--brand-primary)] transition-colors">${escapeHtml(
                    link.label || ""
                  )}</p>
                </div>
                <svg class="w-4 h-4 text-gray-400 group-hover:text-[var(--brand-primary)] shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5h5m0 0v5m0-5L10 14"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 9v10h10"></path></svg>
              </a>
            `
          )
          .join("")
      : '<div class="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded border border-gray-100">Nenhum link cadastrado.</div>';
  }

  if (portalGallery) {
    portalGallery.innerHTML = gallery.length
      ? gallery
          .map(
            (item) => `
              <article class="portal-gallery-card">
                <img src="${escapeHtml(item.src || "")}" alt="${escapeHtml(item.alt || item.title || "")}" loading="lazy" />
                <div class="portal-gallery-card-body">
                  <h3 class="portal-gallery-card-title">${escapeHtml(item.title || "Imagem do portal")}</h3>
                  <p class="portal-gallery-card-text">${escapeHtml(item.alt || "Registro visual publicado pela secretaria.")}</p>
                </div>
              </article>
            `
          )
          .join("")
      : '<div class="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded border border-gray-100">Nenhuma imagem publicada no momento.</div>';
  }
}

async function loadPortalContent() {
  try {
    const content = await fetchPublishedSiteContent();
    renderPortalContent(content);
    lastPortalRefreshAt = Date.now();
  } catch (error) {
    console.warn("Falha ao carregar conteúdo do portal.", error);
    if (noticeList) {
      noticeList.innerHTML =
        '<div class="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded border border-gray-100">Não foi possível carregar os avisos agora.</div>';
    }
    if (quickLinksList) {
      quickLinksList.innerHTML =
        '<div class="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded border border-gray-100">Não foi possível carregar os links agora.</div>';
    }
    if (portalGallery) {
      portalGallery.innerHTML =
        '<div class="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded border border-gray-100">Não foi possível carregar a galeria agora.</div>';
    }
  }
}

function refreshPortalContentIfNeeded(force = false) {
  const elapsed = Date.now() - lastPortalRefreshAt;
  if (!force && elapsed < 15000) {
    return;
  }

  loadPortalContent();
}

function startPortalRefreshLoop() {
  if (portalRefreshTimer) {
    window.clearInterval(portalRefreshTimer);
  }

  portalRefreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") {
      refreshPortalContentIfNeeded();
    }
  }, 45000);
}

logoutButton?.addEventListener("click", () => {
  clearPortalAuth();
  window.location.replace("index.html?logout=1");
});

launchNotasPopup?.addEventListener("click", openNotasPopup);
closeNotasModalButton?.addEventListener("click", closeNotasModal);
raWithUfInput?.addEventListener("input", () => {
  raValidationMessage?.classList.add("hidden");
  raPreparedMessage?.classList.add("hidden");
  raWithUfInput.value = raWithUfInput.value.toUpperCase();
});

notasModal?.addEventListener("click", (event) => {
  if (event.target === notasModal) {
    closeNotasModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !notasModal?.classList.contains("hidden")) {
    closeNotasModal();
  }
});

window.addEventListener("focus", () => refreshPortalContentIfNeeded(true));
window.addEventListener("pageshow", () => refreshPortalContentIfNeeded(true));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshPortalContentIfNeeded(true);
  }
});

window.openNotasModal = openNotasModal;

loadPortalContent();
startPortalRefreshLoop();
