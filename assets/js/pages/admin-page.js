import {
  clearAdminAuth,
  getAdminSessionEmail,
  isAllowedAdminUser,
  syncRememberedAdminSession
} from "../core/auth.js";
import {
  clearDraftSiteContent,
  clearGitHubPublishToken,
  createPortalImagePath,
  fetchPublishedSiteContent,
  fetchPublishedSiteContentMeta,
  getGitHubPublishToken,
  isAllowedPortalImageFileName,
  listPortalImageLibrary,
  loadEditorSiteContent,
  normalizePortalImageLibraryEntries,
  normalizeSiteContent,
  publishSiteContentToGitHub,
  saveDraftSiteContent,
  setGitHubPublishToken,
  uploadPortalImageToGitHub
} from "../core/site-content.js";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const rememberedAdminEmail = syncRememberedAdminSession();
const adminEmail = getAdminSessionEmail() || rememberedAdminEmail;

if (!adminEmail || !isAllowedAdminUser(adminEmail)) {
  window.location.replace("index.html?admin=1");
}

const defaultContent = {
  updatedAt: new Date().toISOString(),
  notices: [],
  quickLinks: [],
  gallery: []
};

let adminState = structuredClone(defaultContent);
let publishedSnapshot = structuredClone(defaultContent);
let pendingConfirmation = null;
let publishQueue = Promise.resolve();
let isPublishing = false;
let lastFocusedElement = null;
let selectedLibraryImagePath = "";
let imageLibraryEntries = [];
let mediaPreviewObjectUrl = "";

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
const mediaFile = document.getElementById("mediaFile");
const mediaPreviewImage = document.getElementById("mediaPreviewImage");
const mediaPreviewEmpty = document.getElementById("mediaPreviewEmpty");
const mediaPreviewLabel = document.getElementById("mediaPreviewLabel");
const imageLibrary = document.getElementById("imageLibrary");
const refreshImageLibraryButton = document.getElementById("refreshImageLibraryButton");

const dashboardNoticeCount = document.getElementById("dashboardNoticeCount");
const dashboardLinkCount = document.getElementById("dashboardLinkCount");
const dashboardGalleryCount = document.getElementById("dashboardGalleryCount");
const dashboardUpdatedAt = document.getElementById("dashboardUpdatedAt");
const adminStatus = document.getElementById("adminStatus");
const adminStatusMessage = document.getElementById("adminStatusMessage");
const adminSyncIndicator = document.getElementById("adminSyncIndicator");
const githubTokenForm = document.getElementById("githubTokenForm");
const githubTokenInput = document.getElementById("githubTokenInput");
const githubTokenStatus = document.getElementById("githubTokenStatus");
const clearGitHubTokenButton = document.getElementById("clearGitHubTokenButton");
const usePublishedContentButton = document.getElementById("usePublishedContentButton");

const confirmModal = document.getElementById("confirmModal");
const confirmModalCard = confirmModal?.querySelector(".modal-card") || null;
const confirmMessage = document.getElementById("confirmMessage");
const cancelConfirmButton = document.getElementById("cancelConfirmButton");
const confirmActionButton = document.getElementById("confirmActionButton");

const clearNoticeFormButton = document.getElementById("clearNoticeForm");
const clearLinkFormButton = document.getElementById("clearLinkForm");
const clearMediaFormButton = document.getElementById("clearMediaForm");
const logoutAdminButton = document.getElementById("logoutAdminButton");
const goToNoticesButton = document.getElementById("goToNoticesButton");
const goToMediaButton = document.getElementById("goToMediaButton");

const saveNoticeButton = noticeForm?.querySelector('button[type="submit"]') || null;
const saveLinkButton = linkForm?.querySelector('button[type="submit"]') || null;
const saveMediaButton = mediaForm?.querySelector('button[type="submit"]') || null;
const connectGitHubButton = githubTokenForm?.querySelector('button[type="submit"]') || null;

const publishLockedControls = [
  saveNoticeButton,
  saveLinkButton,
  saveMediaButton,
  connectGitHubButton,
  clearGitHubTokenButton,
  usePublishedContentButton,
  confirmActionButton,
  refreshImageLibraryButton
].filter(Boolean);

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

const cloneContent = (content) => structuredClone(normalizeSiteContent(content));
const contentFingerprint = (content) => JSON.stringify(normalizeSiteContent(content));

function isPublishedSnapshotInSync() {
  return contentFingerprint(adminState) === contentFingerprint(publishedSnapshot);
}

function getFocusableElements(container) {
  if (!container) {
    return [];
  }

  return [...container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
}

function updateSyncIndicator(forcedState = "") {
  if (!adminSyncIndicator) {
    return;
  }

  const hasToken = Boolean(getGitHubPublishToken());
  let state = forcedState;

  if (!state) {
    if (isPublishing) {
      state = "publishing";
    } else if (isPublishedSnapshotInSync()) {
      state = "synced";
    } else if (hasToken) {
      state = "pending";
    } else {
      state = "local";
    }
  }

  const config = {
    synced: { text: "Conteúdo sincronizado", className: "sync-indicator sync-indicator-success" },
    local: { text: "Rascunho local", className: "sync-indicator sync-indicator-warning" },
    pending: { text: "Pendência de publicação", className: "sync-indicator sync-indicator-warning" },
    publishing: { text: "Publicando...", className: "sync-indicator sync-indicator-info" },
    offline: { text: "Conteúdo base indisponível", className: "sync-indicator sync-indicator-danger" }
  }[state] || { text: "Sincronizando", className: "sync-indicator sync-indicator-info" };

  adminSyncIndicator.textContent = config.text;
  adminSyncIndicator.className = config.className;
}

function setStatus(message, tone = "info", syncState = "") {
  if (!adminStatus || !adminStatusMessage) {
    return;
  }

  const toneClass = {
    info: "text-blue-800 bg-blue-50 border-blue-100",
    success: "text-green-800 bg-green-50 border-green-100",
    warning: "text-yellow-800 bg-yellow-50 border-yellow-100",
    danger: "text-red-800 bg-red-50 border-red-100"
  }[tone] || "text-blue-800 bg-blue-50 border-blue-100";

  adminStatus.className = `status-banner ${toneClass}`;
  adminStatusMessage.textContent = message;
  updateSyncIndicator(syncState);
}

function buildPublishErrorMessage(error) {
  if (!error) {
    return "Não foi possível publicar no GitHub. O rascunho continua salvo localmente.";
  }

  if (error.status === 401 || error.status === 403) {
    return "O GitHub recusou a publicação. Verifique se o token ainda é válido e se possui permissão Contents: write.";
  }

  if (error.status === 404) {
    return "O GitHub não encontrou o repositório ou o arquivo de conteúdo. Verifique o acesso da conta e do token.";
  }

  if (error.status === 409) {
    return "Houve conflito ao atualizar o arquivo no GitHub. O painel tentou novamente, mas outra alteração chegou antes. Tente publicar de novo em alguns segundos.";
  }

  if (error.status === 422) {
    return "O GitHub recusou a publicação por validação ou excesso de requisições em sequência. Aguarde alguns segundos e tente novamente.";
  }

  if (error.status === 503) {
    return "O GitHub estava temporariamente indisponível no momento da publicação. Tente novamente em alguns instantes.";
  }

  return "Não foi possível publicar no GitHub. O rascunho continua salvo localmente. Verifique o token e as permissões de escrita no repositório.";
}

function updateGitHubTokenStatus() {
  const savedToken = getGitHubPublishToken();
  const hasToken = Boolean(savedToken);

  if (!githubTokenStatus) {
    return;
  }

  githubTokenStatus.textContent = hasToken
    ? "Token conectado. As alterações serão enviadas ao GitHub automaticamente."
    : "Nenhum token conectado. As alterações ficarão apenas neste navegador até você conectar o GitHub.";
  githubTokenStatus.className = hasToken ? "text-sm text-green-700" : "text-sm text-yellow-700";

  if (clearGitHubTokenButton) {
    clearGitHubTokenButton.disabled = !hasToken || isPublishing;
  }

  if (githubTokenInput) {
    githubTokenInput.value = savedToken;
  }

  updateSyncIndicator();
}

function setPublishingState(nextState) {
  isPublishing = nextState;
  publishLockedControls.forEach((control) => {
    control.disabled = nextState;
  });
  if (mediaFile) {
    mediaFile.disabled = nextState;
  }
  updateSyncIndicator(nextState ? "publishing" : "");
}

function showPanel(panelId) {
  panels.forEach((panel) => {
    const isActive = panel.id === panelId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  panelButtons.forEach((button) => {
    const isActive = button.dataset.panel === panelId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function jumpToPanel(panelId) {
  showPanel(panelId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleConfirmModalKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeConfirmModal();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const focusable = getFocusableElements(confirmModalCard);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openConfirmModal(message, onConfirm) {
  pendingConfirmation = onConfirm;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  confirmMessage.textContent = message;
  confirmModal.classList.add("active");
  confirmModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", handleConfirmModalKeydown);
  (cancelConfirmButton || confirmActionButton || confirmModalCard)?.focus();
}

function closeConfirmModal() {
  pendingConfirmation = null;
  confirmModal.classList.remove("active");
  confirmModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  window.removeEventListener("keydown", handleConfirmModalKeydown);
  lastFocusedElement?.focus?.();
  lastFocusedElement = null;
}

function revokeMediaPreviewObjectUrl() {
  if (mediaPreviewObjectUrl) {
    URL.revokeObjectURL(mediaPreviewObjectUrl);
    mediaPreviewObjectUrl = "";
  }
}

function setMediaPreview(src = "", label = "", alt = "") {
  if (!mediaPreviewImage || !mediaPreviewEmpty || !mediaPreviewLabel) {
    return;
  }

  if (!src) {
    mediaPreviewImage.hidden = true;
    mediaPreviewImage.removeAttribute("src");
    mediaPreviewImage.alt = "";
    mediaPreviewEmpty.hidden = false;
    mediaPreviewLabel.textContent = label || "Selecione uma imagem da biblioteca ou envie um arquivo do computador.";
    return;
  }

  mediaPreviewImage.src = src;
  mediaPreviewImage.alt = alt || label || "Pré-visualização da imagem";
  mediaPreviewImage.hidden = false;
  mediaPreviewEmpty.hidden = true;
  mediaPreviewLabel.textContent = label || "Imagem pronta para publicação.";
}

function setMediaPreviewFromFile(file) {
  revokeMediaPreviewObjectUrl();
  mediaPreviewObjectUrl = URL.createObjectURL(file);
  setMediaPreview(mediaPreviewObjectUrl, `Arquivo selecionado: ${file.name}`, mediaAlt.value.trim() || mediaTitle.value.trim());
}

function buildGalleryLibraryEntries() {
  return normalizePortalImageLibraryEntries(
    adminState.gallery.map((item) => ({
      path: item.src,
      name: item.title || item.src.split("/").pop() || "imagem",
      previewSrc: item.src,
      source: "gallery"
    }))
  );
}

function mergeImageLibraryEntries(repositoryEntries = []) {
  imageLibraryEntries = normalizePortalImageLibraryEntries([
    ...buildGalleryLibraryEntries(),
    ...repositoryEntries
  ]);
}

function renderImageLibrary() {
  if (!imageLibrary) {
    return;
  }

  if (!imageLibraryEntries.length) {
    imageLibrary.innerHTML = '<div class="empty-state">Nenhuma imagem disponível ainda. Conecte o GitHub para carregar o repositório ou envie a primeira imagem.</div>';
    return;
  }

  const activeGalleryPaths = new Set(adminState.gallery.map((item) => item.src));

  imageLibrary.innerHTML = imageLibraryEntries
    .map((item) => {
      const selected = item.path === selectedLibraryImagePath;
      const isInGallery = activeGalleryPaths.has(item.path);
      return `
        <article class="image-library-card ${selected ? "is-selected" : ""}">
          <img class="image-library-thumb" src="${escapeHtml(item.previewSrc || item.path)}" alt="${escapeHtml(item.name)}" loading="lazy" />
          <div class="image-library-body">
            <p class="image-library-name">${escapeHtml(item.name)}</p>
            <p class="image-library-path">${escapeHtml(item.path)}</p>
            <div class="image-library-actions">
              <span class="image-library-badge">${isInGallery ? "Na galeria" : "Disponível"}</span>
              <button type="button" class="btn-secondary text-xs px-3 py-1.5" data-use-library-image="${escapeHtml(item.path)}">Usar</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  imageLibrary.querySelectorAll("[data-use-library-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const path = button.getAttribute("data-use-library-image") || "";
      const entry = imageLibraryEntries.find((item) => item.path === path);
      selectLibraryImage(entry);
    });
  });
}

function selectLibraryImage(entry) {
  if (!entry) {
    return;
  }

  revokeMediaPreviewObjectUrl();
  selectedLibraryImagePath = entry.path;
  if (mediaFile) {
    mediaFile.value = "";
  }
  mediaPath.value = entry.path;
  if (!mediaTitle.value.trim()) {
    mediaTitle.value = entry.name.replace(/\.[^.]+$/, "");
  }
  setMediaPreview(entry.previewSrc || entry.path, `Imagem escolhida: ${entry.name}`, mediaAlt.value.trim() || entry.name);
  renderImageLibrary();
}

async function refreshImageLibrary(options = {}) {
  const { silent = false } = options;
  const token = getGitHubPublishToken();

  try {
    const repositoryEntries = token ? await listPortalImageLibrary(token) : [];
    mergeImageLibraryEntries(repositoryEntries);
    renderImageLibrary();
    if (!silent && token) {
      setStatus("Biblioteca de imagens atualizada a partir do repositório.", "success");
    }
  } catch (error) {
    console.error(error);
    mergeImageLibraryEntries([]);
    renderImageLibrary();
    if (!silent) {
      setStatus("Não foi possível atualizar a biblioteca do repositório agora.", "warning");
    }
  }
}

async function publishStateToGitHub(reason) {
  const token = getGitHubPublishToken();
  if (!token) {
    setStatus(
      "Alteração salva apenas neste navegador. Conecte um token fino do GitHub para publicar automaticamente para todos.",
      "warning",
      "local"
    );
    return false;
  }

  publishQueue = publishQueue
    .catch(() => null)
    .then(async () => {
      setPublishingState(true);
      setStatus("Publicando alterações no GitHub. O deploy do Pages será disparado em seguida.", "info", "publishing");

      try {
        await publishSiteContentToGitHub(adminState, token, reason);
        publishedSnapshot = cloneContent(adminState);
        setStatus(
          "Alterações publicadas com sucesso. O GitHub Pages pode levar alguns segundos para refletir o novo conteúdo.",
          "success",
          "synced"
        );
        return true;
      } catch (error) {
        console.error(error);
        setStatus(buildPublishErrorMessage(error), "danger", "pending");
        return false;
      } finally {
        setPublishingState(false);
      }
    });

  return publishQueue;
}

function saveState(localMessage, publishMessage) {
  adminState.updatedAt = new Date().toISOString();
  saveDraftSiteContent(adminState);
  renderAll();

  if (!getGitHubPublishToken()) {
    setStatus(`${localMessage} O conteúdo segue salvo localmente neste navegador.`, "warning", "local");
    return;
  }

  setStatus(`${localMessage} Enviando atualização para o GitHub...`, "info", "publishing");
  publishStateToGitHub(publishMessage);
}

async function saveMediaWithUpload() {
  const selectedFile = mediaFile?.files?.[0] || null;
  const selectedPath = mediaPath.value.trim();
  const token = getGitHubPublishToken();

  if (!selectedFile && !selectedPath) {
    setStatus("Escolha uma imagem existente ou envie um arquivo do computador antes de salvar.", "warning");
    return;
  }

  if (selectedFile) {
    if (!isAllowedPortalImageFileName(selectedFile.name)) {
      setStatus("Formato de imagem não suportado. Use JPG, JPEG, PNG ou WEBP.", "warning");
      return;
    }

    if (selectedFile.size > MAX_IMAGE_SIZE_BYTES) {
      setStatus("A imagem excede o limite de 5 MB. Reduza o arquivo antes de enviar.", "warning");
      return;
    }

    if (!token) {
      setStatus("Conecte um token do GitHub antes de enviar uma nova imagem do computador.", "warning", "local");
      return;
    }
  }

  let uploadedImagePath = selectedPath;
  let uploadSucceeded = false;

  try {
    if (selectedFile) {
      setPublishingState(true);
      setStatus("Enviando imagem para o repositório do GitHub...", "info", "publishing");
      const generatedPath = createPortalImagePath(mediaTitle.value.trim(), selectedFile.name);
      const uploadResult = await uploadPortalImageToGitHub(
        selectedFile,
        token,
        generatedPath,
        `Upload portal image ${mediaTitle.value.trim() || selectedFile.name}`
      );
      uploadedImagePath = uploadResult.path;
      uploadSucceeded = true;
      mediaPath.value = uploadedImagePath;
      mergeImageLibraryEntries([
        ...imageLibraryEntries,
        {
          path: uploadedImagePath,
          name: uploadedImagePath.split("/").pop() || selectedFile.name,
          previewSrc: uploadedImagePath,
          source: "repository"
        }
      ]);
      renderImageLibrary();
      setStatus("Imagem enviada. Atualizando a galeria publicada...", "info", "publishing");
    }

    const payload = {
      id: mediaId.value || `media-${Date.now()}`,
      title: mediaTitle.value.trim(),
      src: uploadedImagePath,
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

    selectedLibraryImagePath = payload.src;
    adminState.updatedAt = new Date().toISOString();
    saveDraftSiteContent(adminState);
    renderAll();

    if (!token) {
      setStatus("Imagem salva apenas no rascunho local deste navegador.", "warning", "local");
      fillMediaForm();
      return;
    }

    if (!isPublishing) {
      setPublishingState(true);
      setStatus("Publicando atualização da galeria no GitHub...", "info", "publishing");
    }

    await publishSiteContentToGitHub(adminState, token, "Update gallery in site content");
    publishedSnapshot = cloneContent(adminState);
    fillMediaForm();
    await refreshImageLibrary({ silent: true });
    setStatus(
      uploadSucceeded
        ? "Imagem enviada e galeria publicada com sucesso."
        : "Imagem da biblioteca aplicada e galeria publicada com sucesso.",
      "success",
      "synced"
    );
  } catch (error) {
    console.error(error);
    if (uploadSucceeded) {
      setStatus(
        "A imagem foi enviada ao repositório, mas a atualização da galeria falhou. Tente salvar novamente para concluir a publicação.",
        "danger",
        "pending"
      );
    } else {
      setStatus(buildPublishErrorMessage(error), "danger", token ? "pending" : "local");
    }
  } finally {
    setPublishingState(false);
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
  revokeMediaPreviewObjectUrl();
  mediaId.value = item?.id || "";
  mediaTitle.value = item?.title || "";
  mediaPath.value = item?.src || "";
  mediaAlt.value = item?.alt || "";
  mediaOrder.value = item?.order || adminState.gallery.length + 1;
  mediaPublished.checked = item?.published !== false;
  if (mediaFile) {
    mediaFile.value = "";
  }

  selectedLibraryImagePath = item?.src || "";
  if (item?.src) {
    const entry = imageLibraryEntries.find((libraryItem) => libraryItem.path === item.src);
    setMediaPreview(item.src, `Imagem escolhida: ${entry?.name || item.title || item.src}`, item.alt || item.title);
  } else {
    setMediaPreview("", "Selecione uma imagem da biblioteca ou envie um arquivo do computador.");
  }

  renderImageLibrary();
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
      jumpToPanel("noticesPanel");
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
      jumpToPanel("linksPanel");
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
    mediaItems.innerHTML = '<div class="empty-state">Nenhuma imagem cadastrada para o portal.</div>';
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
      jumpToPanel("mediaPanel");
    });
  });

  mediaItems.querySelectorAll("[data-delete-media]").forEach((button) => {
    button.addEventListener("click", () => {
      openConfirmModal("Essa imagem será retirada da galeria pública do portal.", () => {
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
  renderImageLibrary();
  updateSyncIndicator();
}

panelButtons.forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.panel));
});

goToNoticesButton?.addEventListener("click", () => jumpToPanel("noticesPanel"));
goToMediaButton?.addEventListener("click", () => jumpToPanel("mediaPanel"));
refreshImageLibraryButton?.addEventListener("click", () => refreshImageLibrary());

cancelConfirmButton?.addEventListener("click", closeConfirmModal);
confirmModal?.addEventListener("click", (event) => {
  if (event.target === confirmModal) {
    closeConfirmModal();
  }
});

confirmActionButton?.addEventListener("click", async () => {
  if (typeof pendingConfirmation !== "function") {
    closeConfirmModal();
    return;
  }

  confirmActionButton.disabled = true;
  try {
    await pendingConfirmation();
  } finally {
    confirmActionButton.disabled = false;
    closeConfirmModal();
  }
});

noticeForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isPublishing) {
    return;
  }

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
  saveState("Aviso salvo no painel.", "Update notices in site content");
});

linkForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isPublishing) {
    return;
  }

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
  saveState("Link salvo no painel.", "Update quick links in site content");
});

mediaForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isPublishing) {
    return;
  }
  await saveMediaWithUpload();
});

githubTokenForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isPublishing) {
    return;
  }

  const token = githubTokenInput.value.trim();
  if (!token) {
    setStatus("Informe um token do GitHub com permissão de escrita no repositório.", "warning");
    return;
  }

  try {
    setStatus("Validando token e conectando ao GitHub...", "info");
    await fetchPublishedSiteContentMeta(token);
    setGitHubPublishToken(token);
    updateGitHubTokenStatus();
    await refreshImageLibrary({ silent: true });

    if (!isPublishedSnapshotInSync()) {
      setStatus("Token validado. Publicando o rascunho atual para sincronizar o site.", "info", "publishing");
      await publishStateToGitHub("Publish current site content after GitHub token connect");
      return;
    }

    setStatus(
      "Conexão com o GitHub validada. As próximas alterações serão publicadas automaticamente para todos.",
      "success",
      "synced"
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
  refreshImageLibrary({ silent: true });
  setStatus("Token removido da sessão atual. O painel voltou para modo local.", "warning", "local");
});

usePublishedContentButton?.addEventListener("click", async () => {
  openConfirmModal(
    "Isso vai descartar o rascunho salvo neste navegador e recarregar o conteúdo publicado atualmente no GitHub.",
    async () => {
      try {
        clearDraftSiteContent();
        const publishedContent = normalizeSiteContent(await fetchPublishedSiteContent());
        adminState = cloneContent(publishedContent);
        publishedSnapshot = cloneContent(publishedContent);
        renderAll();
        fillNoticeForm();
        fillLinkForm();
        fillMediaForm();
        await refreshImageLibrary({ silent: true });
        setStatus("Conteúdo publicado recarregado com sucesso.", "success", "synced");
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

mediaFile?.addEventListener("change", () => {
  const selectedFile = mediaFile.files?.[0];
  selectedLibraryImagePath = "";
  mediaPath.value = "";
  renderImageLibrary();

  if (!selectedFile) {
    revokeMediaPreviewObjectUrl();
    setMediaPreview("", "Selecione uma imagem da biblioteca ou envie um arquivo do computador.");
    return;
  }

  setMediaPreviewFromFile(selectedFile);
});

mediaTitle?.addEventListener("input", () => {
  if (!mediaPreviewImage?.hidden) {
    mediaPreviewImage.alt = mediaAlt.value.trim() || mediaTitle.value.trim() || "Pré-visualização da imagem";
  }
});

mediaAlt?.addEventListener("input", () => {
  if (!mediaPreviewImage?.hidden) {
    mediaPreviewImage.alt = mediaAlt.value.trim() || mediaTitle.value.trim() || "Pré-visualização da imagem";
  }
});

logoutAdminButton?.addEventListener("click", () => {
  clearAdminAuth();
  window.location.replace("index.html?home=1");
});

async function bootstrap() {
  let publishedContent = null;
  let draftOrPublishedContent = null;

  try {
    publishedContent = await fetchPublishedSiteContent();
  } catch (error) {
    console.warn("Falha ao carregar conteúdo publicado.", error);
  }

  try {
    draftOrPublishedContent = await loadEditorSiteContent();
  } catch (error) {
    console.warn("Falha ao carregar conteúdo base do editor.", error);
  }

  publishedSnapshot = cloneContent(publishedContent || defaultContent);
  adminState = cloneContent(draftOrPublishedContent || publishedContent || defaultContent);

  fillNoticeForm();
  fillLinkForm();
  fillMediaForm();
  renderAll();
  showPanel("dashboardPanel");
  updateGitHubTokenStatus();
  await refreshImageLibrary({ silent: true });

  if (!publishedContent) {
    setStatus(
      "Painel carregado com rascunho local. O conteúdo publicado não pôde ser consultado agora.",
      "warning",
      "offline"
    );
    return;
  }

  if (isPublishedSnapshotInSync()) {
    setStatus(
      "Painel carregado. O conteúdo local está alinhado com o que já foi publicado.",
      getGitHubPublishToken() ? "success" : "info",
      "synced"
    );
    return;
  }

  setStatus(
    getGitHubPublishToken()
      ? "Painel carregado com alterações locais pendentes de publicação."
      : "Painel carregado com rascunho local. Conecte o GitHub para publicar para todos.",
    "warning",
    getGitHubPublishToken() ? "pending" : "local"
  );
}

bootstrap();
