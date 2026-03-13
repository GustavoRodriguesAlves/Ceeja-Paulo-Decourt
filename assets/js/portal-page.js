import {
  AUTH_STORAGE_KEY,
  TEST_LOGIN_EMAIL,
  clearPortalAuth,
  getPortalSessionEmail,
  syncRememberedPortalSession
} from "./auth.js";

const NOTES_TOKEN =
  "eyJhbGciOiJSUzI1NiIsImtpZCI6IjUzMDcyNGQ0OTE3M2EzZWQ2YjRhMDBhYTYzNDQyMDMwMGQ3MmFlNWIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJhY2NvdW50cy5nb29nbGUuY29tIiwiYXpwIjoiNDI0ODk5MjM4NjQ2LTlyb3Y0djIxbjg5MzZ0cnJhdWdybDN2Y2IzY3M1NGlkLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiYXVkIjoiNDI0ODk5MjM4NjQ2LTlyb3Y0djIxbjg5MzZ0cnJhdWdybDN2Y2IzY3M1NGlkLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwic3ViIjoiMTE1Nzg3Mzk5MTg0MDg5MjE5ODc0IiwiZW1haWwiOiJldWd1c3Rhdm9yb2RyaWd1ZXNhbHZlc0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXRfaGFzaCI6IkFhVmgyU2MwSHBDeHN4QTYtRExkMmciLCJuYmYiOjE3NzMzNDgxMDUsIm5hbWUiOiJHdXN0YXZvIFJvZHJpZ3VlcyBBbHZlcyIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NMMUQtSWoyd2s5SlV4cF9WWFJvMDgyS3pJMER1OXVmQWI2cllsWTVZMEQyeTBqSXc9czk2LWMiLCJnaXZlbl9uYW1lIjoiR3VzdGF2byIsImZhbWlseV9uYW1lIjoiUm9kcmlndWVzIEFsdmVzIiwiaWF0IjoxNzczMzQ4NDA1LCJleHAiOjE3NzMzNTIwMDUsImp0aSI6IjZkMDNkYzc2MGM2Yzc5ZmVmNzNmNTFjNzgxNWNjYzdiNzRmM2VlYzIifQ.ABVzBNz-S6hTeDgACwOyafRzgQltKJd0THkPT1YekGo4ntO44oLdef6NtudsAe4C_NWKKyJqAJb4NSFRO_VS0XqqKx6HtmkbJxOyMBmu46bAIkBAY6EpNi-o1-b3YSNQr3heA3z7PpPrfcGWvkZsdmDEHeGUrgtMEtY22q43Kj5Ge3hCaW49enscGrF0U0TE3TlvlrLBNTNnbeWmmi1evo9DW9n1w75qkbuf8XftbywTKeSEHKO06CraJMZUde4YUHgJsj6zY9Bnb5mv_fRKJzfIjTAWDGCc962QdPlW2ZB8nw8CuN9mEVnZ1WzE2gA9vnw3MHneHLEljAxRhp_Wzg";
const RA_STORAGE_KEY = "ceeja_prepared_ra";
const NOTES_BASE_URL =
  "https://script.google.com/macros/s/AKfycbyVf3T34dxhgWYWebvuPE8o2JHQIhzLrIqOfDCK1UvdC_vGz6gLj20A30FS5EwTGZXdxw/exec";

const rememberedEmail = syncRememberedPortalSession();
const userEmail = getPortalSessionEmail() || rememberedEmail;

if (!userEmail || userEmail !== TEST_LOGIN_EMAIL) {
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

userEmailElement.textContent = userEmail;

function buildNotasUrl() {
  return `${NOTES_BASE_URL}?usuario=${encodeURIComponent(
    userEmail || TEST_LOGIN_EMAIL
  )}&ra=&tel=&token=${NOTES_TOKEN}`;
}

function openNotasModal() {
  popupBlockedMessage.classList.add("hidden");
  raValidationMessage.classList.add("hidden");
  raPreparedMessage.classList.add("hidden");
  notasDirectLink.href = buildNotasUrl();
  raWithUfInput.value = sessionStorage.getItem(RA_STORAGE_KEY) || "";
  notasModal.classList.remove("hidden");
  notasModal.classList.add("flex");
  document.body.style.overflow = "hidden";
  setTimeout(() => raWithUfInput.focus(), 0);
}

function closeNotasModal() {
  notasModal.classList.add("hidden");
  notasModal.classList.remove("flex");
  document.body.style.overflow = "";
}

async function openNotasPopup() {
  const raValue = raWithUfInput.value.trim().toUpperCase();
  if (!raValue) {
    raValidationMessage.classList.remove("hidden");
    raPreparedMessage.classList.add("hidden");
    raWithUfInput.focus();
    return;
  }

  sessionStorage.setItem(RA_STORAGE_KEY, raValue);
  const targetUrl = buildNotasUrl();
  notasDirectLink.href = targetUrl;
  raValidationMessage.classList.add("hidden");
  raPreparedMessage.classList.remove("hidden");

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
    popupBlockedMessage.classList.remove("hidden");
    return;
  }

  popupWindow.focus();
  closeNotasModal();
}

logoutButton.addEventListener("click", () => {
  clearPortalAuth();
  window.location.replace("index.html?logout=1");
});

launchNotasPopup.addEventListener("click", openNotasPopup);
closeNotasModalButton.addEventListener("click", closeNotasModal);
raWithUfInput.addEventListener("input", () => {
  raValidationMessage.classList.add("hidden");
  raPreparedMessage.classList.add("hidden");
  raWithUfInput.value = raWithUfInput.value.toUpperCase();
});
notasModal.addEventListener("click", (event) => {
  if (event.target === notasModal) {
    closeNotasModal();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !notasModal.classList.contains("hidden")) {
    closeNotasModal();
  }
});

window.openNotasModal = openNotasModal;
