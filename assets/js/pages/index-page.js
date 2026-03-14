import {
  isAllowedAdminUser,
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
const urlParams = new URLSearchParams(window.location.search);
const logoutRequested = urlParams.get("logout") === "1";
const adminRequested = urlParams.get("admin") === "1";
let activeModal = null;
let lastFocusedTrigger = null;

if (logoutRequested) {
  clearPortalAuth();
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
const carouselTrack = document.getElementById("carouselTrack");
const carouselIndicators = document.getElementById("carouselIndicators");
const carouselPrevButton = document.getElementById("carouselPrevBtn");
const carouselNextButton = document.getElementById("carouselNextBtn");
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

const DEFAULT_GALLERY = [
  {
    id: "default-media-001",
    title: "Fachada do CEEJA",
    src: "assets/images/DSC06864.JPG",
    alt: "Fachada do CEEJA Paulo Decourt",
    order: 1,
    published: true
  },
  {
    id: "default-media-002",
    title: "Equipe escolar e atendimento",
    src: "assets/images/WhatsApp%20Image%202026-02-26%20at%2013.04.05.jpeg",
    alt: "Equipe escolar e atendimento",
    order: 2,
    published: true
  },
  {
    id: "default-media-003",
    title: "Ambiente de estudo",
    src: "assets/images/WhatsApp%20Image%202026-02-26%20at%2013.04.04.jpeg",
    alt: "Ambiente de estudo e salas",
    order: 3,
    published: true
  },
  {
    id: "default-media-004",
    title: "Infraestrutura interna",
    src: "assets/images/WhatsApp%20Image%202026-02-27%20at%2013.16.21.jpeg",
    alt: "Infraestrutura interna",
    order: 4,
    published: true
  },
  {
    id: "default-media-005",
    title: "Área de convivência",
    src: "assets/images/WhatsApp%20Image%202026-03-04%20at%2020.57.47.jpeg",
    alt: "Área de convivência escolar",
    order: 5,
    published: true
  }
];

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
  loginForm?.reset();
  loginModal?.classList.add("active");
  loginModal?.setAttribute("aria-hidden", "false");
  activeModal = loginModal;
  document.body.style.overflow = "hidden";
  setTimeout(() => loginEmail?.focus(), 80);
}

function closeLogin() {
  loginModal?.classList.remove("active");
  loginModal?.setAttribute("aria-hidden", "true");
  if (activeModal === loginModal) {
    activeModal = null;
  }
  document.body.style.overflow = "";
  lastFocusedTrigger?.focus();
}

function openAdminLogin() {
  const rememberedEmail = getRememberedAdminEmail();
  if (rememberedEmail && isAllowedAdminUser(rememberedEmail)) {
    redirectToAdmin(rememberedEmail);
    return;
  }

  if (adminLoginError) {
    adminLoginError.textContent = "As credenciais fornecidas não conferem nos registros.";
  }
  adminLoginError?.classList.add("hidden");
  adminLoginForm?.reset();
  adminLoginModal?.classList.add("active");
  adminLoginModal?.setAttribute("aria-hidden", "false");
  activeModal = adminLoginModal;
  document.body.style.overflow = "hidden";
  setTimeout(() => adminLoginEmail?.focus(), 80);
}

function closeAdminLogin() {
  adminLoginModal?.classList.remove("active");
  adminLoginModal?.setAttribute("aria-hidden", "true");
  if (activeModal === adminLoginModal) {
    activeModal = null;
  }
  document.body.style.overflow = "";
  lastFocusedTrigger?.focus();
}

function openPhotoModal(src, alt) {
  if (!modalImage || !photoModal) {
    return;
  }
  lastFocusedTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalImage.src = src;
  modalImage.alt = alt;
  photoModal.classList.add("active");
  photoModal?.setAttribute("aria-hidden", "false");
  activeModal = photoModal;
  document.body.style.overflow = "hidden";
}

function closePhotoModal() {
  photoModal?.classList.remove("active");
  photoModal?.setAttribute("aria-hidden", "true");
  if (activeModal === photoModal) {
    activeModal = null;
  }
  document.body.style.overflow = "";
  lastFocusedTrigger?.focus();
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

function applyHomepageContent() {
  const gallery = DEFAULT_GALLERY;

  if (carouselTrack && carouselIndicators) {
    carouselTrack.innerHTML = gallery
      .map(
        (item, index) => `
          <div class="carousel-slide ${index === 0 ? "active" : ""}">
            <img
              src="${escapeHtml(item.src || "")}"
              alt="${escapeHtml(item.alt || item.title || "")}"
              class="carousel-img"
              loading="${index === 0 ? "eager" : "lazy"}"
              data-carousel-image="true"
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
            data-slide-index="${index}"
            aria-label="${escapeHtml(item.title || `Slide ${index + 1}`)}"
          ></button>
        `
      )
      .join("");

    currentSlide = 0;
    showSlide(0);
    resetSlideTimer();

    carouselTrack.querySelectorAll("[data-carousel-image]").forEach((image) => {
      image.addEventListener("click", (event) => {
        lastFocusedTrigger = event.currentTarget;
        openPhotoModal(event.currentTarget.src, event.currentTarget.alt);
      });
    });

    carouselIndicators.querySelectorAll("[data-slide-index]").forEach((button) => {
      button.addEventListener("click", () => {
        goToSlide(Number(button.dataset.slideIndex));
      });
    });
  }
}

mobileMenuBtn?.addEventListener("click", () => {
  const isHidden = mobileMenu?.classList.toggle("hidden");
  const expanded = !isHidden;
  mobileMenuBtn.setAttribute("aria-expanded", String(expanded));
  mobileMenu?.setAttribute("aria-hidden", String(!expanded));
});

openLoginButtons.forEach((button) => {
  button?.addEventListener("click", (event) => {
    lastFocusedTrigger = event.currentTarget;
    mobileMenu?.classList.add("hidden");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");
    mobileMenu?.setAttribute("aria-hidden", "true");
    openLogin();
  });
});

openAdminLoginButton?.addEventListener("click", (event) => {
  lastFocusedTrigger = event.currentTarget;
  openAdminLogin();
});
closeLoginModalButton?.addEventListener("click", closeLogin);
closeAdminLoginModalButton?.addEventListener("click", closeAdminLogin);
closePhotoModalButton?.addEventListener("click", closePhotoModal);
carouselPrevButton?.addEventListener("click", prevSlide);
carouselNextButton?.addEventListener("click", nextSlide);

[...document.querySelectorAll("#mobileMenu a")].forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenu?.classList.add("hidden");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");
    mobileMenu?.setAttribute("aria-hidden", "true");
  });
});

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

  if (!isAllowedAdminUser(email)) {
    adminLoginError.textContent = "Este acesso é restrito ao perfil administrativo autorizado.";
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
  if (event.key === "Escape") {
    closeLogin();
    closeAdminLogin();
    closePhotoModal();
    return;
  }

  if (event.key !== "Tab" || !activeModal) {
    return;
  }

  const focusableElements = [...activeModal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => element.offsetParent !== null);

  if (!focusableElements.length) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
});

if (adminRequested) {
  window.setTimeout(openAdminLogin, 120);
}

applyHomepageContent();
