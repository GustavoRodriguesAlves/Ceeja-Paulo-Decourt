import { clearPortalAuth, forgetPortal, getRememberedPortalEmail, isValidTestCredential, rememberPortal, setPortalSession } from "../core/auth.js";
import { clearSupabaseAdminSession, ensureSupabasePanelAccess, getSupabaseAdminSession, signInSupabaseAdmin, syncRememberedSupabaseAdminSession } from "../core/supabase.js";
const urlParams = new URLSearchParams(window.location.search);
const logoutRequested = urlParams.get("logout") === "1";
const adminRequested = urlParams.get("admin") === "1";
let activeModal = null;
let lastFocusedTrigger = null;
let currentSlide = 0;
let slideInterval = null;
if (logoutRequested) {
    clearPortalAuth();
}
function getElement(id) {
    const element = document.getElementById(id);
    return element instanceof HTMLElement ? element : null;
}
function getButton(id) {
    const element = getElement(id);
    return element instanceof HTMLButtonElement ? element : null;
}
function getForm(id) {
    const element = getElement(id);
    return element instanceof HTMLFormElement ? element : null;
}
function getInput(id) {
    const element = getElement(id);
    return element instanceof HTMLInputElement ? element : null;
}
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
const openLoginButtons = [
    getButton("openLoginBtn"),
    getButton("openLoginMobileBtn"),
    getButton("openLoginHero"),
    getButton("openLoginContact")
];
const openAdminLoginButton = getButton("openAdminLoginBtn");
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
        title: "Ãrea de convivÃªncia",
        src: "assets/images/WhatsApp%20Image%202026-03-04%20at%2020.57.47.jpeg",
        alt: "Ãrea de convivÃªncia escolar",
        order: 5,
        published: true
    }
];
const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const redirectToPortal = (email) => {
    setPortalSession(email);
    window.location.href = "portal.html";
};
const redirectToAdmin = () => {
    window.location.href = "admin.html";
};
function hideMobileMenu() {
    mobileMenu?.classList.add("hidden");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");
    mobileMenu?.setAttribute("aria-hidden", "true");
}
function showModal(modal) {
    if (!modal) {
        return;
    }
    activeModal = modal;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}
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
function closeLogin() {
    hideModal(loginModal);
}
async function openAdminLogin() {
    const rememberedSession = getSupabaseAdminSession() || syncRememberedSupabaseAdminSession();
    if (rememberedSession) {
        try {
            await ensureSupabasePanelAccess();
            redirectToAdmin();
            return;
        }
        catch {
            clearSupabaseAdminSession();
        }
    }
    if (adminLoginError) {
        adminLoginError.textContent = "As credenciais fornecidas não conferem nos registros.";
    }
    adminLoginError?.classList.add("hidden");
    adminLoginForm?.reset();
    showModal(adminLoginModal);
    window.setTimeout(() => adminLoginEmail?.focus(), 80);
}
function closeAdminLogin() {
    hideModal(adminLoginModal);
}
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
function closePhotoModal() {
    hideModal(photoModal);
}
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
function getFocusableElements(container) {
    if (!container) {
        return [];
    }
    return Array.from(container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null);
}
function applyHomepageContent() {
    const gallery = DEFAULT_GALLERY;
    if (!carouselTrack || !carouselIndicators) {
        return;
    }
    carouselTrack.innerHTML = gallery
        .map((item, index) => `
          <div class="carousel-slide ${index === 0 ? "active" : ""}">
            <img
              src="${escapeHtml(item.src || "")}"
              alt="${escapeHtml(item.alt || item.title || "")}"
              class="carousel-img"
              loading="${index === 0 ? "eager" : "lazy"}"
              data-carousel-image="true"
            >
          </div>
        `)
        .join("");
    carouselIndicators.innerHTML = gallery
        .map((item, index) => `
          <button
            type="button"
            class="indicator-dot ${index === 0 ? "active" : ""}"
            data-slide-index="${index}"
            aria-label="${escapeHtml(item.title || `Slide ${index + 1}`)}"
          ></button>
        `)
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
            goToSlide(Number(button.dataset.slideIndex || "0"));
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
    void openAdminLogin();
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
    }
    else {
        forgetPortal();
    }
    redirectToPortal(email);
});
adminLoginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = adminLoginEmail?.value.trim().toLowerCase() || "";
    const password = adminLoginPassword?.value || "";
    if (!email || !password) {
        if (adminLoginError) {
            adminLoginError.textContent = "Informe o e-mail e a senha para continuar.";
        }
        adminLoginError?.classList.remove("hidden");
        return;
    }
    const submitButton = adminLoginForm.querySelector('button[type="submit"]');
    submitButton?.setAttribute("disabled", "true");
    void (async () => {
        try {
            await signInSupabaseAdmin(email, password, Boolean(keepAdminConnectedCheckbox?.checked));
            await ensureSupabasePanelAccess();
            redirectToAdmin();
        }
        catch (error) {
            clearSupabaseAdminSession();
            if (adminLoginError) {
                adminLoginError.textContent =
                    error instanceof Error && error.message.includes("não está autorizado")
                        ? "Este e-mail não está autorizado a entrar no painel."
                        : "Credenciais inválidas ou conta sem acesso ao painel.";
            }
            adminLoginError?.classList.remove("hidden");
        }
        finally {
            submitButton?.removeAttribute("disabled");
        }
    })();
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
    }
    else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
    }
});
if (adminRequested) {
    window.setTimeout(() => {
        void openAdminLogin();
    }, 120);
}
applyHomepageContent();
