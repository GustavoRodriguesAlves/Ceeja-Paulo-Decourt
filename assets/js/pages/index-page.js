import {
  clearPortalAuth,
  forgetAdmin,
  forgetPortal,
  getRememberedAdminEmail,
  getRememberedPortalEmail,
  isValidTestCredential,
  rememberAdmin,
  rememberPortal,
  setAdminSession,
  setPortalSession
} from "../core/auth.js";
import { loadSiteContent } from "../core/site-content.js";

const urlParams = new URLSearchParams(window.location.search);
const forceHomeView = urlParams.get("home") === "1";
const logoutRequested = urlParams.get("logout") === "1";
const adminRequested = urlParams.get("admin") === "1";

if (logoutRequested) {
  clearPortalAuth();
}

const rememberedPortalEmail = getRememberedPortalEmail();
if (!forceHomeView && !logoutRequested && !adminRequested && rememberedPortalEmail) {
  setPortalSession(rememberedPortalEmail);
  window.location.href = "portal.html";
}

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const loginModal = document.getElementById("loginModal");
const adminLoginModal = document.getElementById("adminLoginModal");
const openLoginButtons = [
  document.getElementById("openLoginBtn"),
  document.getElementById("openLoginMobileBtn"),
  document.getElementById("openLoginHero"),
  document.getElementById("openLoginContact")
];
const openAdminLoginButton = document.getElementById("openAdminLoginBtn");
const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const keepConnectedCheckbox = document.getElementById("keepConnected");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginEmail = document.getElementById("adminLoginEmail");
const adminLoginPassword = document.getElementById("adminLoginPassword");
const adminLoginError = document.getElementById("adminLoginError");
const keepAdminConnectedCheckbox = document.getElementById("keepAdminConnected");
const carouselTrack = document.getElementById("carouselTrack");
const carouselIndicators = document.getElementById("carouselIndicators");
const photoModal = document.getElementById("photoModal");
const modalImage = document.getElementById("modalImage");
const closePhotoModalButton = document.getElementById("closePhotoModalBtn");
const closeLoginModalButton = document.getElementById("closeLoginModal");
const closeAdminLoginModalButton = document.getElementById("closeAdminLoginModal");

let currentSlide = 0;
let slideInterval;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const redirectToPortal = (email) => {
  setPortalSession(email);
  window.location.href = "portal.html";
};

const redirectToAdmin = (email) => {
  setAdminSession(email);
  window.location.href = "admin.html";
};

function openLogin() {
  const rememberedEmail = getRememberedPortalEmail();
  if (rememberedEmail) {
    redirectToPortal(rememberedEmail);
    return;
  }

  loginError.classList.add("hidden");
  loginModal.classList.add("active");
  document.body.style.overflow = "hidden";
  setTimeout(() => loginEmail.focus(), 100);
}

function closeLogin() {
  loginModal.classList.remove("active");
  document.body.style.overflow = "";
}

function openAdminLogin() {
  const rememberedEmail = getRememberedAdminEmail();
  if (rememberedEmail) {
    redirectToAdmin(rememberedEmail);
    return;
  }

  adminLoginError.classList.add("hidden");
  adminLoginModal.classList.add("active");
  document.body.style.overflow = "hidden";
  setTimeout(() => adminLoginEmail.focus(), 100);
}

function closeAdminLogin() {
  adminLoginModal.classList.remove("active");
  document.body.style.overflow = "";
}

function openPhotoModal(src, alt) {
  modalImage.src = src;
  modalImage.alt = alt;
  photoModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePhotoModal() {
  photoModal.classList.remove("active");
  document.body.style.overflow = "";
}

function showSlide(index) {
  const slides = document.querySelectorAll(".carousel-slide");
  const dots = document.querySelectorAll(".indicator-dot");
  if (!slides.length) {
    return;
  }

  slides.forEach((slide) => slide.classList.remove("active"));
  dots.forEach((dot) => dot.classList.remove("active"));
  currentSlide = (index + slides.length) % slides.length;
  slides[currentSlide].classList.add("active");
  dots[currentSlide].classList.add("active");
}

function resetSlideTimer() {
  clearInterval(slideInterval);
  slideInterval = setInterval(nextSlide, 4000);
}

function nextSlide() {
  showSlide(currentSlide + 1);
  resetSlideTimer();
}

function prevSlide() {
  showSlide(currentSlide - 1);
  resetSlideTimer();
}

function goToSlide(index) {
  showSlide(index);
  resetSlideTimer();
}

function applyHomepageContent(content) {
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
        .filter((item) => item.published !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    : [];
  const homepage = content?.homepage || {};



  if (carouselTrack && carouselIndicators) {
    carouselTrack.innerHTML = gallery
      .map(
        (item, index) => `
          <div class="carousel-slide ${index === 0 ? "active" : ""}">
            <img
              src="${escapeHtml(item.src || "")}"
              alt="${escapeHtml(item.alt || item.title || "")}"
              class="carousel-img"
              loading="lazy"
              onclick="openPhotoModal(this.src, this.alt)"
            >
          </div>
        `
      )
      .join("");

    carouselIndicators.innerHTML = gallery
      .map(
        (item, index) => `
          <button
            class="indicator-dot ${index === 0 ? "active" : ""}"
            onclick="goToSlide(${index})"
            aria-label="${escapeHtml(item.title || `Slide ${index + 1}`)}"
          ></button>
        `
      )
      .join("");

    currentSlide = 0;
    if (gallery.length) {
      showSlide(0);
      resetSlideTimer();
    } else {
      clearInterval(slideInterval);
    }
  }}

async function loadHomepageContent() {
  try {
    const content = await loadSiteContent();
    applyHomepageContent(content);
  } catch (error) {
    console.warn("Falha ao carregar conteúdo estruturado da home.", error);
    applyHomepageContent({ notices: [], quickLinks: [], gallery: [], homepage: {} });
  }
}

mobileMenuBtn.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

openLoginButtons.forEach((button) => {
  if (button) {
    button.addEventListener("click", openLogin);
  }
});

if (openAdminLoginButton) {
  openAdminLoginButton.addEventListener("click", openAdminLogin);
}

closeLoginModalButton.addEventListener("click", closeLogin);
loginModal.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    closeLogin();
  }
});

closeAdminLoginModalButton.addEventListener("click", closeAdminLogin);
adminLoginModal.addEventListener("click", (event) => {
  if (event.target === adminLoginModal) {
    closeAdminLogin();
  }
});

closePhotoModalButton.addEventListener("click", closePhotoModal);
photoModal.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    closePhotoModal();
  }
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;

  if (!isValidTestCredential(email, password)) {
    loginError.classList.remove("hidden");
    return;
  }

  if (keepConnectedCheckbox.checked) {
    rememberPortal(email);
  } else {
    forgetPortal();
  }

  redirectToPortal(email);
});

adminLoginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = adminLoginEmail.value.trim().toLowerCase();
  const password = adminLoginPassword.value;

  if (!isValidTestCredential(email, password)) {
    adminLoginError.classList.remove("hidden");
    return;
  }

  if (keepAdminConnectedCheckbox.checked) {
    rememberAdmin(email);
  } else {
    forgetAdmin();
  }

  redirectToAdmin(email);
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLogin();
    closeAdminLogin();
    closePhotoModal();
  }
});

if (adminRequested) {
  setTimeout(openAdminLogin, 120);
}

window.openPhotoModal = openPhotoModal;
window.prevSlide = prevSlide;
window.nextSlide = nextSlide;
window.goToSlide = goToSlide;

loadHomepageContent();
