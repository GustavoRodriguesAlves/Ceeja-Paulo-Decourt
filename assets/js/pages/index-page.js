// @ts-check

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

/** @typedef {import("../types/core").GalleryItem} GalleryItem */

const urlParams = new URLSearchParams(window.location.search);
const logoutRequested = urlParams.get("logout") === "1";
const adminRequested = urlParams.get("admin") === "1";

/** @type {HTMLElement | null} */
let activeModal = null;
/** @type {HTMLElement | null} */
let lastFocusedTrigger = null;
let currentSlide = 0;
/** @type {number | null} */
let slideInterval = null;

if (logoutRequested) {
  clearPortalAuth();
}

/**
 * @param {string} id
 * @returns {HTMLElement | null}
 */
function getElement(id) {
  const element = document.getElementById(id);
  return element instanceof HTMLElement ? element : null;
}

/**
 * @param {string} id
 * @returns {HTMLButtonElement | null}
 */
function getButton(id) {
  const element = getElement(id);
  return element instanceof HTMLButtonElement ? element : null;
}

/**
 * @param {string} id
 * @returns {HTMLFormElement | null}
 */
function getForm(id) {
  const element = getElement(id);
  return element instanceof HTMLFormElement ? element : null;
}

/**
 * @param {string} id
 * @returns {HTMLInputElement | null}
 */
function getInput(id) {
  const element = getElement(id);
  return element instanceof HTMLInputElement ? element : null;
}

/**
 * @param {string} id
 * @returns {HTMLImageElement | null}
 */
function getImage(id) {
  const element = getElement(id);
  return element instanceof HTMLImageElement ? element : null;
}

const mobileMenuBtn = getButton("mobileMenuBtn");
const mobileMenu = getElement("mobileMenu");
const loginModal = getElement("loginModal");
const adminLoginModal = getElement("adminLoginModal");
const loginForm = getForm("loginForm");
const adminLoginForm = getForm("adminLoginForm");
const loginEmail = getInput("loginEmail");
const loginPassword = getInput("loginPassword");
const adminLoginEmail = getInput("adminLoginEmail");
const adminLoginPassword = getInput("adminLoginPassword");
const loginError = getElement("loginError");
const adminLoginError = getElement("adminLoginError");
const keepConnectedCheckbox = getInput("keepConnected");
const keepAdminConnectedCheckbox = getInput("keepAdminConnected");
const carouselTrack = getElement("carouselTrack");
const carouselIndicators = getElement("carouselIndicators");
const carouselPrevButton = getButton("carouselPrevBtn");
const carouselNextButton = getButton("carouselNextBtn");
const photoModal = getElement("photoModal");
const modalImage = getImage("modalImage");
const closePhotoModalButton = getButton("closePhotoModalBtn");
const closeLoginModalButton = getButton("closeLoginModal");
const closeAdminLoginModalButton = getButton("closeAdminLoginModal");

/** @type {(HTMLButtonElement | null)[]} */
const openLoginButtons = [
  getButton("openLoginBtn"),
  getButton("openLoginMobileBtn"),
  getButton("openLoginHero"),
  getButton("openLoginContact")
];
const openAdminLoginButton = getButton("openAdminLoginBtn");

/** @type {GalleryItem[]} */
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

/**
 * @param {string | number | null | undefined} [value=""]
 * @returns {string}
 */
const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * @param {string} email
 * @returns {void}
 */
const redirectToPortal = (email) => {
  setPortalSession(email);
  window.location.href = "portal.html";
};

/**
 * @param {string} email
 * @returns {void}
 */
const redirectToAdmin = (email) => {
  setAdminSession(email);
  window.location.href = "admin.html";
};

/**
 * @returns {void}
 */
function hideMobileMenu() {
  mobileMenu?.classList.add("hidden");
  mobileMenuBtn?.setAttribute("aria-expanded", "false");
  mobileMenu?.setAttribute("aria-hidden", "true");
}

/**
 * @param {HTMLElement | null} modal
 * @returns {void}
 */
function showModal(modal) {
  if (!modal) {
    return;
  }

  activeModal = modal;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

/**
 * @param {HTMLElement | null} modal
 * @returns {void}
 */
function hideModal(modal) {
  if (!modal) {
    return;
  }

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  if (activeModal === modal) {
    activeModal = null;
    document.body.style.overflow = "";
    lastFocusedTrigger?.focus();
  }
}

/**
 * @returns {void}
 */
function openLogin() {
  const rememberedEmail = getRememberedPortalEmail();
  if (rememberedEmail) {
    redirectToPortal(rememberedEmail);
    return;
  }

  loginError?.classList.add("hidden");
  loginForm?.reset();
  showModal(loginModal);
  window.setTimeout(() => loginEmail?.focus(), 80);
}

/**
 * @returns {void}
 */
function closeLogin() {
  hideModal(loginModal);
}

/**
 * @returns {void}
 */
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
  showModal(adminLoginModal);
  window.setTimeout(() => adminLoginEmail?.focus(), 80);
}

/**
 * @returns {void}
 */
function closeAdminLogin() {
  hideModal(adminLoginModal);
}

/**
 * @param {string} src
 * @param {string} alt
 * @returns {void}
 */
function openPhotoModal(src, alt) {
  if (!modalImage || !photoModal) {
    return;
  }

  lastFocusedTrigger =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  modalImage.src = src;
  modalImage.alt = alt;
  showModal(photoModal);
}

/**
 * @returns {void}
 */
function closePhotoModal() {
  hideModal(photoModal);
}

/**
 * @param {number} index
 * @returns {void}
 */
function showSlide(index) {
  const slides = Array.from(document.querySelectorAll(".carousel-slide"));
  const dots = Array.from(document.querySelectorAll(".indicator-dot"));
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

/**
 * @returns {void}
 */
function resetSlideTimer() {
  if (slideInterval !== null) {
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

/**
 * @returns {void}
 */
function nextSlide() {
  showSlide(currentSlide + 1);
  resetSlideTimer();
}

/**
 * @returns {void}
 */
function prevSlide() {
  showSlide(currentSlide - 1);
  resetSlideTimer();
}

/**
 * @param {number} index
 * @returns {void}
 */
function goToSlide(index) {
  showSlide(index);
  resetSlideTimer();
}

/**
 * @param {HTMLElement | null} container
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return /** @type {HTMLElement[]} */ (
    Array.from(
      container.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    )
  ).filter((element) => element.offsetParent !== null);
}

/**
 * @returns {void}
 */
function applyHomepageContent() {
  const gallery = DEFAULT_GALLERY;

  if (!carouselTrack || !carouselIndicators) {
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

  Array.from(carouselTrack.querySelectorAll("[data-carousel-image]")).forEach((image) => {
    image.addEventListener("click", (event) => {
      const currentTarget = event.currentTarget;
      if (!(currentTarget instanceof HTMLImageElement)) {
        return;
      }

      lastFocusedTrigger = currentTarget;
      openPhotoModal(currentTarget.src, currentTarget.alt);
    });
  });

  Array.from(carouselIndicators.querySelectorAll("[data-slide-index]")).forEach((button) => {
    button.addEventListener("click", () => {
      const slideButton = /** @type {HTMLButtonElement} */ (button);
      goToSlide(Number(slideButton.dataset.slideIndex || "0"));
    });
  });
}

mobileMenuBtn?.addEventListener("click", () => {
  const isHidden = mobileMenu?.classList.toggle("hidden");
  const expanded = !isHidden;
  mobileMenuBtn.setAttribute("aria-expanded", String(expanded));
  mobileMenu?.setAttribute("aria-hidden", String(!expanded));
});

openLoginButtons.forEach((button) => {
  button?.addEventListener("click", (event) => {
    const currentTarget = event.currentTarget;
    lastFocusedTrigger = currentTarget instanceof HTMLElement ? currentTarget : null;
    hideMobileMenu();
    openLogin();
  });
});

openAdminLoginButton?.addEventListener("click", (event) => {
  const currentTarget = event.currentTarget;
  lastFocusedTrigger = currentTarget instanceof HTMLElement ? currentTarget : null;
  openAdminLogin();
});

closeLoginModalButton?.addEventListener("click", closeLogin);
closeAdminLoginModalButton?.addEventListener("click", closeAdminLogin);
closePhotoModalButton?.addEventListener("click", closePhotoModal);
carouselPrevButton?.addEventListener("click", prevSlide);
carouselNextButton?.addEventListener("click", nextSlide);

Array.from(document.querySelectorAll("#mobileMenu a")).forEach((link) => {
  link.addEventListener("click", () => {
    hideMobileMenu();
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
  const email = loginEmail?.value.trim().toLowerCase() || "";
  const password = loginPassword?.value || "";

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
  const email = adminLoginEmail?.value.trim().toLowerCase() || "";
  const password = adminLoginPassword?.value || "";

  if (!isValidTestCredential(email, password)) {
    adminLoginError?.classList.remove("hidden");
    return;
  }

  if (!isAllowedAdminUser(email)) {
    if (adminLoginError) {
      adminLoginError.textContent =
        "Este acesso é restrito ao perfil administrativo autorizado.";
    }
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

  const focusableElements = getFocusableElements(activeModal);
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
