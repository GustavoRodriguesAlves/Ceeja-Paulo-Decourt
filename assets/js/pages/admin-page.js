import {
  TEST_LOGIN_EMAIL,
  clearAdminAuth,
  getAdminSessionEmail,
  syncRememberedAdminSession
} from "../core/auth.js";
import {
  clearDraftSiteContent,
  clearGitHubPublishToken,
  fetchPublishedSiteContentMeta,
  fetchPublishedSiteContent,
  getGitHubPublishToken,
  loadEditorSiteContent,
  normalizeSiteContent,
  publishSiteContentToGitHub,
  saveDraftSiteContent,
  setGitHubPublishToken
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
let publishQueue = Promise.resolve();

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

const dashboardNoticeCount = document.getElementById("dashboardNoticeCount");
const dashboardLinkCount = document.getElementById("dashboardLinkCount");
const dashboardGalleryCount = document.getElementById("dashboardGalleryCount");
const dashboardUpdatedAt = document.getElementById("dashboardUpdatedAt");
const adminStatus = document.getElementById("adminStatus");
const githubTokenForm = document.getElementById("githubTokenForm");
const githubTokenInput = document.getElementById("githubTokenInput");
const githubTokenStatus = document.getElementById("githubTokenStatus");
const clearGitHubTokenButton = document.getElementById("clearGitHubTokenButton");
const usePublishedContentButton = document.getElementById("usePublishedContentButton");

const confirmModal = document.getElementById("confirmModal");
const confirmMessage = document.getElementById("confirmMessage");
const cancelConfirmButton = document.getElementById("cancelConfirmButton");
const confirmActionButton = document.getElementById("confirmActionButton");

const clearNoticeFormButton = document.getElementById("clearNoticeForm");
const clearLinkFormButton = document.getElementById("clearLinkForm");
const clearMediaFormButton = document.getElementById("clearMediaForm");
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

function setStatus(message, tone = "info") {
  if (!adminStatus) {
    return;
  }

  const toneClass = {
    info: "text-blue-800 bg-blue-50 border-blue-100",
    success: "text-green-800 bg-green-50 border-green-100",
    warning: "text-yellow-800 bg-yellow-50 border-yellow-100",
    danger: "text-red-800 bg-red-50 border-red-100"
  }[tone] || "text-blue-800 bg-blue-50 border-blue-100";

  adminStatus.className = `status-banner ${toneClass}`;
  adminStatus.textContent = message;
}

function updateGitHubTokenStatus() {
  const hasToken = Boolean(getGitHubPublishToken());
  if (!githubTokenStatus) {
    return;
  }

  githubTokenStatus.textContent = hasToken
    ? "Token conectado. As alterações serão enviadas ao GitHub automaticamente."
    : "Nenhum token conectado. As alterações ficarão apenas neste navegador até você conectar o GitHub.";
  githubTokenStatus.className = hasToken
    ? "text-sm text-green-700"
    : "text-sm text-yellow-700";

  if (clearGitHubTokenButton) {
    clearGitHubTokenButton.disabled = !hasToken;
  }
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

async function publishStateToGitHub(reason) {
  const token = getGitHubPublishToken();
  if (!token) {
    setStatus(
      "Alteração salva apenas neste navegador. Conecte um token fino do GitHub para publicar automaticamente para todos.",
      "warning"
    );
    return;
  }

  publishQueue = publishQueue
    .catch(() => null)
    .then(async () => {
      setStatus("Publicando alterações no GitHub. O deploy do Pages será disparado em seguida.", "info");
      try {
        await publishSiteContentToGitHub(adminState, token, reason);
        setStatus(
          "Alterações publicadas com sucesso. O GitHub Pages pode levar alguns segundos para refletir o novo conteúdo.",
          "success"
        );
      } catch (error) {
        console.error(error);
        setStatus(
          "Não foi possível publicar no GitHub. O rascunho continua salvo localmente. Verifique o token e as permissões de escrita no repositório.",
          "danger"
        );
      }
    });

  return publishQueue;
}

function saveState(localMessage, publishMessage) {
  adminState.updatedAt = new Date().toISOString();
  saveDraftSiteContent(adminState);
  renderAll();
  setStatus(localMessage, getGitHubPublishToken() ? "info" : "warning");
  publishStateToGitHub(publishMessage);
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
        <article class="list-card-horizontal">
          <div class="list-card-horizontal-content">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="chip">${escapeHtml(item.category || "Aviso")}</span>
              <span class="text-xs font-semibold text-gray-500">${escapeHtml(formatDate(item.date))}</span>
              <span class="status-badge ${item.published ? "status-live" : "status-draft"}">${item.published ? "Publicado" : "Oculto"}</span>
            </div>
            <h4 class="text-lg font-bold text-[var(--brand-primary)]">${escapeHtml(item.title || "")}</h4>
            <p class="helper-text mt-1 text-sm">${escapeHtml(item.summary || "")}</p>
          </div>
          <div class="list-card-horizontal-actions flex-col sm:flex-row">
            <button type="button" class="btn-secondary px-4 py-2 text-sm" data-edit-notice="${item.id}">Editar</button>
            <button type="button" class="btn-danger px-4 py-2 text-sm" data-delete-notice="${item.id}">Excluir</button>
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
      openConfirmModal("Esse aviso será removido do painel e do portal dos alunos.", () => {
        adminState.notices = adminState.notices.filter((entry) => entry.id !== button.dataset.deleteNotice);
        saveState(
          "Aviso removido do rascunho local.",
          `Remove notice ${button.dataset.deleteNotice} from site content`
        );
      });
    });
  });
}

function renderLinks() {
  const links = [...adminState.quickLinks];
  if (!links.length) {
    linkItems.innerHTML = '<div class="empty-state">Nenhum link rápido cadastrado.</div>';
    return;
  }

  linkItems.innerHTML = links
    .map(
      (item) => `
        <article class="list-card-horizontal">
          <div class="list-card-horizontal-content">
            <div class="flex items-center gap-2 mb-1">
              <span class="status-badge ${item.published ? "status-live" : "status-draft"}">${item.published ? "Publicado" : "Oculto"}</span>
            </div>
            <h4 class="text-lg font-bold text-[var(--brand-primary)]">${escapeHtml(item.label || "")}</h4>
            <p class="mt-1 break-all text-sm text-gray-500">${escapeHtml(item.url || "")}</p>
          </div>
          <div class="list-card-horizontal-actions flex-col sm:flex-row">
            <button type="button" class="btn-secondary px-4 py-2 text-sm" data-edit-link="${item.id}">Editar</button>
            <button type="button" class="btn-danger px-4 py-2 text-sm" data-delete-link="${item.id}">Excluir</button>
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
      openConfirmModal("Esse link deixará de aparecer para os alunos.", () => {
        adminState.quickLinks = adminState.quickLinks.filter((entry) => entry.id !== button.dataset.deleteLink);
        saveState(
          "Link removido do rascunho local.",
          `Remove quick link ${button.dataset.deleteLink} from site content`
        );
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
        <article class="list-card-horizontal">
          <img src="${escapeHtml(item.src || "")}" alt="${escapeHtml(item.alt || item.title || "")}" class="media-thumb w-24 h-16 object-cover rounded shadow-sm border border-gray-200" loading="lazy" />
          <div class="list-card-horizontal-content">
            <div class="flex items-center gap-2 mb-1">
              <span class="chip text-xs">Posição ${escapeHtml(String(item.order || "-"))}</span>
              <span class="status-badge ${item.published ? "status-live" : "status-draft"} text-xs">${item.published ? "Ativa" : "Oculta"}</span>
            </div>
            <h4 class="text-base font-bold text-[var(--brand-primary)] leading-tight mt-1">${escapeHtml(item.title || "")}</h4>
            <p class="mt-1 text-xs text-gray-500 font-mono">${escapeHtml(item.src || "")}</p>
          </div>
          <div class="list-card-horizontal-actions flex-col">
            <button type="button" class="btn-secondary px-3 py-1.5 text-xs" data-edit-media="${item.id}">Editar</button>
            <button type="button" class="btn-danger px-3 py-1.5 text-xs" data-delete-media="${item.id}">Remover</button>
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
      openConfirmModal("Essa imagem será retirada do carrossel público da home.", () => {
        adminState.gallery = adminState.gallery.filter((entry) => entry.id !== button.dataset.deleteMedia);
        saveState(
          "Imagem removida da galeria local.",
          `Remove gallery item ${button.dataset.deleteMedia} from site content`
        );
      });
    });
  });
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
}

function renderAll() {
  renderNotices();
  renderLinks();
  renderGallery();
  renderDashboard();
}

panelButtons.forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.panel));
});

cancelConfirmButton?.addEventListener("click", closeConfirmModal);
confirmModal?.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirmModal();
  }
});
confirmActionButton?.addEventListener("click", () => {
  if (typeof pendingConfirmation === "function") {
    pendingConfirmation();
  }
  closeConfirmModal();
});

noticeForm?.addEventListener("submit", (event) => {
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
  saveState("Aviso salvo no painel.", `Update notices in site content`);
});

linkForm?.addEventListener("submit", (event) => {
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
  saveState("Link salvo no painel.", `Update quick links in site content`);
});

mediaForm?.addEventListener("submit", (event) => {
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
  saveState("Imagem salva no painel.", `Update gallery in site content`);
});

githubTokenForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const token = githubTokenInput.value.trim();
  if (!token) {
    setStatus("Informe um token do GitHub com permissão de escrita no repositório.", "warning");
    return;
  }

  try {
    setStatus("Validando token e conectando ao GitHub...", "info");
    await fetchPublishedSiteContentMeta(token);
    setGitHubPublishToken(token);
    githubTokenInput.value = "";
    updateGitHubTokenStatus();
    setStatus(
      "Conexão com o GitHub validada. As próximas alterações serão publicadas automaticamente para todos.",
      "success"
    );
  } catch (error) {
    console.error(error);
    setStatus(
      "Não foi possível validar o token. Verifique se ele tem permissão de Contents: write neste repositório.",
      "danger"
    );
  }
});

clearGitHubTokenButton?.addEventListener("click", () => {
  clearGitHubPublishToken();
  updateGitHubTokenStatus();
  setStatus("Token removido da sessão atual. O painel voltou para modo local.", "warning");
});

usePublishedContentButton?.addEventListener("click", async () => {
  openConfirmModal(
    "Isso vai descartar o rascunho salvo neste navegador e recarregar o conteúdo publicado atualmente no GitHub.",
    async () => {
      try {
        clearDraftSiteContent();
        adminState = normalizeSiteContent(await fetchPublishedSiteContent());
        renderAll();
        fillNoticeForm();
        fillLinkForm();
        fillMediaForm();
        setStatus("Conteúdo publicado recarregado com sucesso.", "success");
      } catch (error) {
        console.error(error);
        setStatus("Não foi possível recarregar o conteúdo publicado agora.", "danger");
      }
    }
  );
});

clearNoticeFormButton?.addEventListener("click", () => fillNoticeForm());
clearLinkFormButton?.addEventListener("click", () => fillLinkForm());
clearMediaFormButton?.addEventListener("click", () => fillMediaForm());

logoutAdminButton?.addEventListener("click", () => {
  clearAdminAuth();
  window.location.replace("index.html?home=1");
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && confirmModal?.classList.contains("active")) {
    closeConfirmModal();
  }
});

async function bootstrap() {
  try {
    adminState = normalizeSiteContent(await loadEditorSiteContent());
  } catch (error) {
    console.warn("Falha ao carregar conteúdo base.", error);
    adminState = structuredClone(defaultContent);
  }

  fillNoticeForm();
  fillLinkForm();
  fillMediaForm();
  renderAll();
  showPanel("dashboardPanel");
  updateGitHubTokenStatus();
  setStatus(
    "Painel carregado. Você pode editar o conteúdo e, se conectar o GitHub, as alterações serão publicadas para todos automaticamente.",
    getGitHubPublishToken() ? "success" : "warning"
  );
}

bootstrap();
