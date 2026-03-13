import {
  TEST_LOGIN_EMAIL,
  clearAdminAuth,
  getAdminSessionEmail,
  syncRememberedAdminSession
} from "../core/auth.js";
import {
  clearDraftSiteContent,
  loadSiteContent,
  normalizeSiteContent,
  saveDraftSiteContent
} from "../core/site-content.js";

const rememberedAdminEmail = syncRememberedAdminSession();
const adminEmail = getAdminSessionEmail() || rememberedAdminEmail;

if (!adminEmail || adminEmail !== TEST_LOGIN_EMAIL) {
  window.location.replace("index.html?admin=1");
}

const defaultContent = {
  updatedAt: new Date().toISOString(),
  notices: [],
  quickLinks: [],
  gallery: [],
  homepage: { highlightTitle: "", highlightText: "" }
};

let adminState = structuredClone(defaultContent);
let pendingConfirmation = null;

const panelButtons = [...document.querySelectorAll("[data-panel]")];
const panels = [...document.querySelectorAll(".content-panel")];

const noticeForm = document.getElementById("noticeForm");
const noticeItems = document.getElementById("noticeItems");
const noticeId = document.getElementById("noticeId");
const noticeTitle = document.getElementById("noticeTitle");
const noticeSummary = document.getElementById("noticeSummary");
const noticeCategory = document.getElementById("noticeCategory");
const noticeDate = document.getElementById("noticeDate");
const noticeFeatured = document.getElementById("noticeFeatured");
const noticePublished = document.getElementById("noticePublished");

const linkForm = document.getElementById("linkForm");
const linkItems = document.getElementById("linkItems");
const linkId = document.getElementById("linkId");
const linkLabel = document.getElementById("linkLabel");
const linkUrl = document.getElementById("linkUrl");
const linkPublished = document.getElementById("linkPublished");

const mediaForm = document.getElementById("mediaForm");
const mediaItems = document.getElementById("mediaItems");
const mediaId = document.getElementById("mediaId");
const mediaTitle = document.getElementById("mediaTitle");
const mediaPath = document.getElementById("mediaPath");
const mediaAlt = document.getElementById("mediaAlt");
const mediaOrder = document.getElementById("mediaOrder");
const mediaPublished = document.getElementById("mediaPublished");

const homepageForm = document.getElementById("homepageForm");
const homepageTitle = document.getElementById("homepageTitle");
const homepageText = document.getElementById("homepageText");
const homepagePreviewTitle = document.getElementById("homepagePreviewTitle");
const homepagePreviewText = document.getElementById("homepagePreviewText");

const dashboardNoticeCount = document.getElementById("dashboardNoticeCount");
const dashboardLinkCount = document.getElementById("dashboardLinkCount");
const dashboardGalleryCount = document.getElementById("dashboardGalleryCount");
const dashboardUpdatedAt = document.getElementById("dashboardUpdatedAt");
const publishNoticeCount = document.getElementById("publishNoticeCount");
const publishLinkCount = document.getElementById("publishLinkCount");
const publishGalleryCount = document.getElementById("publishGalleryCount");
const publishHomepageState = document.getElementById("publishHomepageState");
const jsonPreview = document.getElementById("jsonPreview");
const adminStatus = document.getElementById("adminStatus");

const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const cancelConfirmButton = document.getElementById("cancelConfirmButton");
const confirmActionButton = document.getElementById("confirmActionButton");

const clearNoticeFormButton = document.getElementById("clearNoticeForm");
const clearLinkFormButton = document.getElementById("clearLinkForm");
const clearMediaFormButton = document.getElementById("clearMediaForm");
const downloadJsonButton = document.getElementById("downloadJsonButton");
const copyJsonButton = document.getElementById("copyJsonButton");
const importJsonInput = document.getElementById("importJsonInput");
const resetDraftButton = document.getElementById("resetDraftButton");
const logoutAdminButton = document.getElementById("logoutAdminButton");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDate = (value) => {
  if (!value) {
    return "-";
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("pt-BR");
};

function setStatus(message) {
  adminStatus.textContent = message;
}

function showPanel(panelId) {
  panels.forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
  panelButtons.forEach((button) => button.classList.toggle("active", button.dataset.panel === panelId));
}

function openConfirmModal(message, onConfirm) {
  pendingConfirmation = onConfirm;
  confirmMessage.textContent = message;
  confirmModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeConfirmModal() {
  pendingConfirmation = null;
  confirmModal.classList.remove("active");
  document.body.style.overflow = "";
}

function saveState(message) {
  adminState.updatedAt = new Date().toISOString();
  saveDraftSiteContent(adminState);
  renderAll();
  if (message) {
    setStatus(message);
  }
}

function fillNoticeForm(item = null) {
  noticeId.value = item?.id || "";
  noticeTitle.value = item?.title || "";
  noticeSummary.value = item?.summary || "";
  noticeCategory.value = item?.category || "";
  noticeDate.value = item?.date || "";
  noticeFeatured.checked = Boolean(item?.featured);
  noticePublished.checked = item?.published !== false;
}

function fillLinkForm(item = null) {
  linkId.value = item?.id || "";
  linkLabel.value = item?.label || "";
  linkUrl.value = item?.url || "";
  linkPublished.checked = item?.published !== false;
}

function fillMediaForm(item = null) {
  mediaId.value = item?.id || "";
  mediaTitle.value = item?.title || "";
  mediaPath.value = item?.src || "";
  mediaAlt.value = item?.alt || "";
  mediaOrder.value = item?.order || adminState.gallery.length + 1;
  mediaPublished.checked = item?.published !== false;
}

function renderNotices() {
  const notices = [...adminState.notices].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) {
      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    }
    return String(b.date).localeCompare(String(a.date));
  });

  if (!notices.length) {
    noticeItems.innerHTML = '<div class="empty-state">Nenhum aviso cadastrado ainda.</div>';
    return;
  }

  noticeItems.innerHTML = notices
    .map(
      (item) => `
        <article class="list-card">
          <div class="flex flex-wrap items-center gap-3">
            <span class="chip">${escapeHtml(item.category || "Aviso")}</span>
            <span class="text-xs text-slate-500">${escapeHtml(formatDate(item.date))}</span>
            <span class="status-badge ${item.published ? "status-live" : "status-draft"}">${item.published ? "Publicado" : "Rascunho"}</span>
          </div>
          <h4 class="mt-4 text-xl font-bold text-[var(--brand-primary)]">${escapeHtml(item.title || "")}</h4>
          <p class="helper-text mt-3">${escapeHtml(item.summary || "")}</p>
          <div class="mt-5 flex flex-wrap gap-3">
            <button type="button" class="btn-secondary" data-edit-notice="${item.id}">Editar</button>
            <button type="button" class="btn-danger" data-delete-notice="${item.id}">Excluir</button>
          </div>
        </article>
      `
    )
    .join("");

  noticeItems.querySelectorAll("[data-edit-notice]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = adminState.notices.find((entry) => entry.id === button.dataset.editNotice);
      fillNoticeForm(item);
      showPanel("noticesPanel");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  noticeItems.querySelectorAll("[data-delete-notice]").forEach((button) => {
    button.addEventListener("click", () => {
      openConfirmModal("Esse aviso serÃ¡ removido do rascunho atual da home.", () => {
        adminState.notices = adminState.notices.filter((entry) => entry.id !== button.dataset.deleteNotice);
        saveState("Aviso removido do rascunho local.");
      });
    });
  });
}

function renderLinks() {
  const links = [...adminState.quickLinks];
  if (!links.length) {
    linkItems.innerHTML = '<div class="empty-state">Nenhum link rÃ¡pido cadastrado.</div>';
    return;
  }

  linkItems.innerHTML = links
    .map(
      (item) => `
        <article class="list-card">
          <div class="flex flex-wrap items-center gap-3">
            <span class="status-badge ${item.published ? "status-live" : "status-draft"}">${item.published ? "Publicado" : "Oculto"}</span>
          </div>
          <h4 class="mt-4 text-xl font-bold text-[var(--brand-primary)]">${escapeHtml(item.label || "")}</h4>
          <p class="mt-3 break-all text-sm text-[var(--text-muted)]">${escapeHtml(item.url || "")}</p>
          <div class="mt-5 flex flex-wrap gap-3">
            <button type="button" class="btn-secondary" data-edit-link="${item.id}">Editar</button>
            <button type="button" class="btn-danger" data-delete-link="${item.id}">Excluir</button>
          </div>
        </article>
      `
    )
    .join("");

  linkItems.querySelectorAll("[data-edit-link]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = adminState.quickLinks.find((entry) => entry.id === button.dataset.editLink);
      fillLinkForm(item);
      showPanel("linksPanel");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  linkItems.querySelectorAll("[data-delete-link]").forEach((button) => {
    button.addEventListener("click", () => {
      openConfirmModal("Esse link deixarÃ¡ de aparecer na home do site.", () => {
        adminState.quickLinks = adminState.quickLinks.filter((entry) => entry.id !== button.dataset.deleteLink);
        saveState("Link removido do rascunho local.");
      });
    });
  });
}

function renderGallery() {
  const gallery = [...adminState.gallery].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  if (!gallery.length) {
    mediaItems.innerHTML = '<div class="empty-state">Nenhuma imagem cadastrada para a galeria.</div>';
    return;
  }

  mediaItems.innerHTML = gallery
    .map(
      (item) => `
        <article class="list-card">
          <div class="flex flex-col gap-4 md:flex-row md:items-start">
            <img src="${escapeHtml(item.src || "")}" alt="${escapeHtml(item.alt || item.title || "")}" class="media-thumb" loading="lazy" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-3">
                <span class="chip">Imagem ${escapeHtml(String(item.order || "-"))}</span>
                <span class="status-badge ${item.published ? "status-live" : "status-draft"}">${item.published ? "Na home" : "Oculta"}</span>
              </div>
              <h4 class="mt-4 text-xl font-bold text-[var(--brand-primary)]">${escapeHtml(item.title || "")}</h4>
              <p class="mt-2 text-sm text-[var(--text-muted)]"><strong>Caminho:</strong> ${escapeHtml(item.src || "")}</p>
              <p class="mt-1 text-sm text-[var(--text-muted)]"><strong>Texto alternativo:</strong> ${escapeHtml(item.alt || "")}</p>
              <div class="mt-5 flex flex-wrap gap-3">
                <button type="button" class="btn-secondary" data-edit-media="${item.id}">Editar</button>
                <button type="button" class="btn-danger" data-delete-media="${item.id}">Excluir</button>
              </div>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  mediaItems.querySelectorAll("[data-edit-media]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = adminState.gallery.find((entry) => entry.id === button.dataset.editMedia);
      fillMediaForm(item);
      showPanel("mediaPanel");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  mediaItems.querySelectorAll("[data-delete-media]").forEach((button) => {
    button.addEventListener("click", () => {
      openConfirmModal("Essa imagem serÃ¡ retirada da galeria configurada para a home.", () => {
        adminState.gallery = adminState.gallery.filter((entry) => entry.id !== button.dataset.deleteMedia);
        saveState("Imagem removida da galeria local.");
      });
    });
  });
}

function renderHomepagePreview() {
  homepageTitle.value = adminState.homepage.highlightTitle || "";
  homepageText.value = adminState.homepage.highlightText || "";
  homepagePreviewTitle.textContent = adminState.homepage.highlightTitle || "Sem destaque configurado.";
  homepagePreviewText.textContent =
    adminState.homepage.highlightText || "Cadastre o texto principal para visualizar a prÃ©via.";
}

function renderDashboard() {
  const publishedNotices = adminState.notices.filter((item) => item.published).length;
  const publishedLinks = adminState.quickLinks.filter((item) => item.published).length;
  const publishedGallery = adminState.gallery.filter((item) => item.published).length;

  dashboardNoticeCount.textContent = publishedNotices;
  dashboardLinkCount.textContent = publishedLinks;
  dashboardGalleryCount.textContent = publishedGallery;
  dashboardUpdatedAt.textContent = adminState.updatedAt
    ? new Date(adminState.updatedAt).toLocaleString("pt-BR")
    : "-";
  publishNoticeCount.textContent = publishedNotices;
  publishLinkCount.textContent = publishedLinks;
  publishGalleryCount.textContent = publishedGallery;
  publishHomepageState.textContent =
    adminState.homepage.highlightTitle || "TÃ­tulo principal ainda nÃ£o preenchido.";
  jsonPreview.textContent = JSON.stringify(adminState, null, 2);
}

function renderAll() {
  renderNotices();
  renderLinks();
  renderGallery();
  renderHomepagePreview();
  renderDashboard();
}

panelButtons.forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.panel));
});

cancelConfirmButton.addEventListener("click", closeConfirmModal);
confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirmModal();
  }
});
confirmActionButton.addEventListener("click", () => {
  if (typeof pendingConfirmation === "function") {
    pendingConfirmation();
  }
  closeConfirmModal();
});

noticeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = {
    id: noticeId.value || `notice-${Date.now()}`,
    title: noticeTitle.value.trim(),
    summary: noticeSummary.value.trim(),
    category: noticeCategory.value.trim(),
    date: noticeDate.value,
    featured: noticeFeatured.checked,
    published: noticePublished.checked
  };
  const existingIndex = adminState.notices.findIndex((item) => item.id === payload.id);
  if (existingIndex >= 0) {
    adminState.notices[existingIndex] = payload;
  } else {
    adminState.notices.unshift(payload);
  }
  fillNoticeForm();
  saveState("Aviso salvo no rascunho local.");
});

linkForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = {
    id: linkId.value || `link-${Date.now()}`,
    label: linkLabel.value.trim(),
    url: linkUrl.value.trim(),
    published: linkPublished.checked
  };
  const existingIndex = adminState.quickLinks.findIndex((item) => item.id === payload.id);
  if (existingIndex >= 0) {
    adminState.quickLinks[existingIndex] = payload;
  } else {
    adminState.quickLinks.unshift(payload);
  }
  fillLinkForm();
  saveState("Link rÃ¡pido salvo no rascunho local.");
});

mediaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = {
    id: mediaId.value || `media-${Date.now()}`,
    title: mediaTitle.value.trim(),
    src: mediaPath.value.trim(),
    alt: mediaAlt.value.trim(),
    order: Number(mediaOrder.value) || adminState.gallery.length + 1,
    published: mediaPublished.checked
  };
  const existingIndex = adminState.gallery.findIndex((item) => item.id === payload.id);
  if (existingIndex >= 0) {
    adminState.gallery[existingIndex] = payload;
  } else {
    adminState.gallery.push(payload);
  }
  fillMediaForm();
  saveState("Imagem salva na galeria local.");
});

homepageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  adminState.homepage.highlightTitle = homepageTitle.value.trim();
  adminState.homepage.highlightText = homepageText.value.trim();
  saveState("Texto principal da home atualizado.");
});

clearNoticeFormButton.addEventListener("click", () => fillNoticeForm());
clearLinkFormButton.addEventListener("click", () => fillLinkForm());
clearMediaFormButton.addEventListener("click", () => fillMediaForm());

downloadJsonButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(adminState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "site-content.json";
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus("Arquivo JSON baixado. Ele jÃ¡ pode substituir data/site-content.json no projeto.");
});

copyJsonButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(adminState, null, 2));
    setStatus("JSON copiado para a Ã¡rea de transferÃªncia.");
  } catch (error) {
    setStatus("NÃ£o foi possÃ­vel copiar automaticamente. Use o bloco de JSON para copiar manualmente.");
  }
});

importJsonInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    adminState = normalizeSiteContent(JSON.parse(await file.text()));
    saveState("Arquivo importado para o rascunho local.");
  } catch (error) {
    console.warn("Falha ao importar JSON.", error);
    setStatus("O arquivo informado nÃ£o pÃ´de ser importado.");
  } finally {
    event.target.value = "";
  }
});

resetDraftButton.addEventListener("click", () => {
  openConfirmModal("O rascunho salvo neste navegador serÃ¡ descartado e a base pÃºblica serÃ¡ restaurada.", async () => {
    clearDraftSiteContent();
    await bootstrap();
    setStatus("Base restaurada a partir do conteÃºdo pÃºblico do projeto.");
  });
});

logoutAdminButton.addEventListener("click", () => {
  clearAdminAuth();
  window.location.href = "index.html?home=1";
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && confirmModal.classList.contains("active")) {
    closeConfirmModal();
  }
});

async function bootstrap() {
  try {
    adminState = await loadSiteContent();
  } catch (error) {
    console.warn("Falha ao carregar conteÃºdo base.", error);
    adminState = structuredClone(defaultContent);
  }

  adminState = normalizeSiteContent(adminState);
  fillNoticeForm();
  fillLinkForm();
  fillMediaForm();
  renderAll();
  showPanel("dashboardPanel");
  setStatus("Painel carregado. As alteraÃ§Ãµes feitas aqui ficam visÃ­veis na home deste navegador.");
}

bootstrap();
