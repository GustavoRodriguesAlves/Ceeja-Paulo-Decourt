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
import { fetchPublishedSiteContent } from "../core/site-content.js";

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
  window.location.replace("portal.html");
}

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const loginModal = document.getElementById("loginModal");
const adminLoginModal = document.getElementById("adminLoginModal");
const loginForm = document.getElementById("loginForm");
const adminLoginForm = document.getElementById("adminLoginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const adminLoginEmail = document.getElementById("adminLoginEmail");
const adminLoginPassword = document.getElementById("adminLoginPassword");
const loginError = document.getElementById("loginError");
const adminLoginError = document.getElementById("adminLoginError");
const keepConnectedCheckbox = document.getElementById("keepConnected");
const keepAdminConnectedCheckbox = document.getElementById("keepAdminConnected");
const homepageHighlightTitle = document.getElementById("homepageHighlightTitle");
const homepageHighlightText = document.getElementById("homepageHighlightText");
const carouselTrack = document.getElementById("carouselTrack");
const carouselIndicators = document.getElementById("carouselIndicators");
const photoModal = document.getElementById("photoModal");
const modalImage = document.getElementById("modalImage");
const closePhotoModalButton = document.getElementById("closePhotoModalBtn");
const closeLoginModalButton = document.getElementById("closeLoginModal");
const closeAdminLoginModalButton = document.getElementById("closeAdminLoginModal");

const openLoginButtons = [
  document.getElementById("openLoginBtn"),
  document.getElementById("openLoginMobileBtn"),
  document.getElementById("openLoginHero"),
  document.getElementById("openLoginContact")
];
const openAdminLoginButton = document.getElementById("openAdminLoginBtn");

let currentSlide = 0;
let slideInterval = null;

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

  loginError?.classList.add("hidden");
  loginModal?.classList.add("active");
  document.body.style.overflow = "hidden";
  setTimeout(() => loginEmail?.focus(), 80);
}

function closeLogin() {
  loginModal?.classList.remove("active");
  document.body.style.overflow = "";
}

function openAdminLogin() {
  const rememberedEmail = getRememberedAdminEmail();
  if (rememberedEmail) {
    redirectToAdmin(rememberedEmail);
    return;
  }

  adminLoginError?.classList.add("hidden");
  adminLoginModal?.classList.add("active");
  document.body.style.overflow = "hidden";
  setTimeout(() => adminLoginEmail?.focus(), 80);
}

function closeAdminLogin() {
  adminLoginModal?.classList.remove("active");
  document.body.style.overflow = "";
}

function openPhotoModal(src, alt) {
  if (!modalImage || !photoModal) {
    return;
  }
  modalImage.src = src;
  modalImage.alt = alt;
  photoModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePhotoModal() {
  photoModal?.classList.remove("active");
  document.body.style.overflow = "";
}

function showSlide(index) {
  const slides = [...document.querySelectorAll(".carousel-slide")];
  const dots = [...document.querySelectorAll(".indicator-dot")];
  if (!slides.length) {
    return;
  }

  currentSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("active", slideIndex === currentSlide);
  });
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex === currentSlide);
  });
}

function resetSlideTimer() {
  if (slideInterval) {
    window.clearInterval(slideInterval);
  }

  const totalSlides = document.querySelectorAll(".carousel-slide").length;
  if (totalSlides <= 1) {
    slideInterval = null;
    return;
  }

  slideInterval = window.setInterval(() => {
    showSlide(currentSlide + 1);
  }, 4000);
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
  const homepage = content?.homepage || {};
  const gallery = Array.isArray(content?.gallery)
    ? content.gallery
        .filter((item) => item.published !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    : [];

  if (homepageHighlightTitle && homepage.highlightTitle) {
    const safeTitle = escapeHtml(homepage.highlightTitle);
    homepageHighlightTitle.innerHTML = safeTitle.replace(
      /propósito e clareza/i,
      '<span class="text-[var(--brand-accent)]">propósito e clareza</span>'
    );
  }

  if (homepageHighlightText && homepage.highlightText) {
    homepageHighlightText.textContent = homepage.highlightText;
  }

  if (carouselTrack && carouselIndicators) {
    if (!gallery.length) {
      carouselTrack.innerHTML = `
        <div class="carousel-slide active">
          <div class="flex h-full items-center justify-center bg-slate-100 text-center text-sm text-slate-500">
            Nenhuma imagem foi publicada para a galeria.
          </div>
        </div>
      `;
      carouselIndicators.innerHTML = "";
      resetSlideTimer();
      return;
    }

    carouselTrack.innerHTML = gallery
      .map(
        (item, index) => `
          <div class="carousel-slide ${index === 0 ? "active" : ""}">
            <img
              src="${escapeHtml(item.src || "")}"
              alt="${escapeHtml(item.alt || item.title || "")}"
              class="carousel-img"
              loading="${index === 0 ? "eager" : "lazy"}"
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
            type="button"
            class="indicator-dot ${index === 0 ? "active" : ""}"
            onclick="goToSlide(${index})"
            aria-label="${escapeHtml(item.title || `Slide ${index + 1}`)}"
          ></button>
        `
      )
      .join("");

    currentSlide = 0;
    showSlide(0);
    resetSlideTimer();
  }
}

async function loadHomepageContent() {
  try {
    const content = await fetchPublishedSiteContent();
    applyHomepageContent(content);
  } catch (error) {
    console.warn("Falha ao carregar conteúdo estruturado da home.", error);
    applyHomepageContent({ gallery: [], homepage: {} });
  }
}

mobileMenuBtn?.addEventListener("click", () => {
  mobileMenu?.classList.toggle("hidden");
});

openLoginButtons.forEach((button) => {
  button?.addEventListener("click", openLogin);
});

openAdminLoginButton?.addEventListener("click", openAdminLogin);
closeLoginModalButton?.addEventListener("click", closeLogin);
closeAdminLoginModalButton?.addEventListener("click", closeAdminLogin);
closePhotoModalButton?.addEventListener("click", closePhotoModal);

loginModal?.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    closeLogin();
  }
});

adminLoginModal?.addEventListener("click", (event) => {
  if (event.target === adminLoginModal) {
    closeAdminLogin();
  }
});

photoModal?.addEventListener("click", (event) => {
  if (event.target === photoModal) {
    closePhotoModal();
  }
});

loginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = loginEmail.value.trim().toLowerCase();
  const password = loginPassword.value;

  if (!isValidTestCredential(email, password)) {
    loginError?.classList.remove("hidden");
    return;
  }

  if (keepConnectedCheckbox?.checked) {
    rememberPortal(email);
  } else {
    forgetPortal();
  }

  redirectToPortal(email);
});

adminLoginForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = adminLoginEmail.value.trim().toLowerCase();
  const password = adminLoginPassword.value;

  if (!isValidTestCredential(email, password)) {
    adminLoginError?.classList.remove("hidden");
    return;
  }

  if (keepAdminConnectedCheckbox?.checked) {
    rememberAdmin(email);
  } else {
    forgetAdmin();
  }

  redirectToAdmin(email);
});

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  closeLogin();
  closeAdminLogin();
  closePhotoModal();
});

if (adminRequested) {
  window.setTimeout(openAdminLogin, 120);
}

window.openPhotoModal = openPhotoModal;
window.prevSlide = prevSlide;
window.nextSlide = nextSlide;
window.goToSlide = goToSlide;

loadHomepageContent();
