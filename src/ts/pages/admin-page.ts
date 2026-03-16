import {
  clearDraftSiteContent,
  createPortalImagePath,
  fetchPublishedSiteContent,
  isAllowedPortalImageFileName,
  readDraftSiteContent,
  loadEditorSiteContent,
  normalizePortalImageLibraryEntries,
  normalizeSiteContent,
  saveDraftSiteContent,
} from "../core/site-content.js";
import {
  clearSupabaseAdminSession,
  ensureSupabasePanelAccess,
  extractSupabaseStoragePath,
  fetchPanelAllowlist,
  fetchSupabaseEditorSiteContent,
  getSupabaseAdminSession,
  getSupabasePublicConfig,
  listSupabasePortalImageLibrary,
  manageSupabasePanelUser,
  type PanelAccessEntry,
  resolvePublicImageUrl,
  syncPanelAllowlist,
  syncRememberedSupabaseAdminSession,
  syncSupabaseGallery,
  syncSupabaseNotices,
  syncSupabaseQuickLinks,
  uploadPortalImageToSupabase
} from "../core/supabase.js";
import type {
  GalleryItem,
  NoticeItem,
  PortalImageLibraryEntry,
  QuickLinkItem,
  SiteContent
} from "../../../assets/js/types/core";

type StatusTone = "info" | "success" | "warning" | "danger";
type ConfirmHandler = () => void | Promise<void>;
type SyncState = "" | "synced" | "local" | "pending" | "publishing" | "offline";
type RefreshImageLibraryOptions = {
  silent?: boolean;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function mustElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Elemento obrigatório não encontrado: #${id}`);
  }

  return element;
}

/**
 * @param {string} id
 * @returns {HTMLFormElement}
 */
function mustForm(id: string): HTMLFormElement {
  const element = mustElement(id);
  if (!(element instanceof HTMLFormElement)) {
    throw new Error(`Formulário obrigatório inválido: #${id}`);
  }

  return element;
}

/**
 * @param {string} id
 * @returns {HTMLInputElement}
 */
function mustInput(id: string): HTMLInputElement {
  const element = mustElement(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`Campo obrigatório inválido: #${id}`);
  }

  return element;
}

/**
 * @param {string} id
 * @returns {HTMLTextAreaElement}
 */
function mustSelect(id: string): HTMLSelectElement {
  const element = mustElement(id);
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Seleção obrigatória inválida: #${id}`);
  }

  return element;
}

function mustTextArea(id: string): HTMLTextAreaElement {
  const element = mustElement(id);
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error(`Área de texto obrigatória inválida: #${id}`);
  }

  return element;
}

/**
 * @param {string} id
 * @returns {HTMLButtonElement}
 */
function mustButton(id: string): HTMLButtonElement {
  const element = mustElement(id);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Botão obrigatório inválido: #${id}`);
  }

  return element;
}

/**
 * @param {string} id
 * @returns {HTMLImageElement}
 */
function mustImage(id: string): HTMLImageElement {
  const element = mustElement(id);
  if (!(element instanceof HTMLImageElement)) {
    throw new Error(`Imagem obrigatória inválida: #${id}`);
  }

  return element;
}

/**
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLButtonElement | null}
 */
function queryButton(root: ParentNode, selector: string): HTMLButtonElement | null {
  const element = root.querySelector(selector);
  return element instanceof HTMLButtonElement ? element : null;
}

syncRememberedSupabaseAdminSession();

if (!getSupabaseAdminSession()) {
  window.location.replace("index.html?admin=1");
}

const defaultContent = {
  updatedAt: new Date().toISOString(),
  notices: [],
  quickLinks: [],
  gallery: []
} satisfies SiteContent;

let adminState: SiteContent = structuredClone(defaultContent);
let publishedSnapshot: SiteContent = structuredClone(defaultContent);
let pendingConfirmation: ConfirmHandler | null = null;
let isPublishing = false;
let lastFocusedElement: HTMLElement | null = null;
let selectedLibraryImagePath = "";
let imageLibraryEntries: PortalImageLibraryEntry[] = [];
let mediaPreviewObjectUrl = "";
let currentPanelAccess: PanelAccessEntry | null = null;
let panelAllowlist: PanelAccessEntry[] = [];
let isSavingOwnerAccess = false;

const panelButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-panel]"));
const panels = Array.from(document.querySelectorAll<HTMLElement>(".content-panel"));

const noticeForm = mustForm("noticeForm");
const noticeItems = mustElement("noticeItems");
const noticeId = mustInput("noticeId");
const noticeTitle = mustInput("noticeTitle");
const noticeSummary = mustTextArea("noticeSummary");
const noticeCategory = mustInput("noticeCategory");
const noticeDate = mustInput("noticeDate");
const noticeFeatured = mustInput("noticeFeatured");
const noticePublished = mustInput("noticePublished");

const linkForm = mustForm("linkForm");
const linkItems = mustElement("linkItems");
const linkId = mustInput("linkId");
const linkLabel = mustInput("linkLabel");
const linkUrl = mustInput("linkUrl");
const linkPublished = mustInput("linkPublished");

const mediaForm = mustForm("mediaForm");
const mediaItems = mustElement("mediaItems");
const mediaId = mustInput("mediaId");
const mediaTitle = mustInput("mediaTitle");
const mediaPath = mustInput("mediaPath");
const mediaAlt = mustInput("mediaAlt");
const mediaOrder = mustInput("mediaOrder");
const mediaPublished = mustInput("mediaPublished");
const mediaFile = mustInput("mediaFile");
const mediaPreviewImage = mustImage("mediaPreviewImage");
const mediaPreviewEmpty = mustElement("mediaPreviewEmpty");
const mediaPreviewLabel = mustElement("mediaPreviewLabel");
const imageLibrary = mustElement("imageLibrary");
const refreshImageLibraryButton = mustButton("refreshImageLibraryButton");

const dashboardNoticeCount = mustElement("dashboardNoticeCount");
const dashboardLinkCount = mustElement("dashboardLinkCount");
const dashboardGalleryCount = mustElement("dashboardGalleryCount");
const dashboardUpdatedAt = mustElement("dashboardUpdatedAt");
const adminStatus = mustElement("adminStatus");
const adminStatusMessage = mustElement("adminStatusMessage");
const adminSyncIndicator = mustElement("adminSyncIndicator");

const confirmModal = mustElement("confirmModal");
const confirmModalCard = confirmModal.querySelector<HTMLElement>(".modal-card");
const confirmMessage = mustElement("confirmMessage");
const cancelConfirmButton = mustButton("cancelConfirmButton");
const confirmActionButton = mustButton("confirmActionButton");

const clearNoticeFormButton = mustButton("clearNoticeForm");
const clearLinkFormButton = mustButton("clearLinkForm");
const clearMediaFormButton = mustButton("clearMediaForm");
const logoutAdminButton = mustButton("logoutAdminButton");
const goToNoticesButton = mustButton("goToNoticesButton");
const goToMediaButton = mustButton("goToMediaButton");
const ownerAccessNavButton = mustButton("ownerAccessNavButton");
const ownerAccessForm = mustForm("ownerAccessForm");
const ownerAccessItems = mustElement("ownerAccessItems");
const ownerAccessId = mustInput("ownerAccessId");
const ownerAccessEmail = mustInput("ownerAccessEmail");
const ownerAccessPassword = mustInput("ownerAccessPassword");
const ownerAccessRole = mustSelect("ownerAccessRole");
const ownerAccessActive = mustInput("ownerAccessActive");
const clearOwnerAccessFormButton = mustButton("clearOwnerAccessForm");

const saveNoticeButton = queryButton(noticeForm, 'button[type="submit"]');
const saveLinkButton = queryButton(linkForm, 'button[type="submit"]');
const saveMediaButton = queryButton(mediaForm, 'button[type="submit"]');
const saveOwnerAccessButton = queryButton(ownerAccessForm, 'button[type="submit"]');

const publishLockedControls = [
  saveNoticeButton,
  saveLinkButton,
  saveMediaButton,
  saveOwnerAccessButton,
  confirmActionButton,
  refreshImageLibraryButton
].filter((control): control is HTMLButtonElement => control instanceof HTMLButtonElement);

/**
 * @param {string | number | null | undefined} [value=""]
 * @returns {string}
 */
const escapeHtml = (value: string | number | null | undefined = ""): string =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
const formatDate = (value: string | null | undefined): string => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("pt-BR");
};

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
const formatDateTime = (value: string | null | undefined): string => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("pt-BR");
};

/**
 * @param {Partial<SiteContent> | SiteContent | null | undefined} content
 * @returns {SiteContent}
 */
const cloneContent = (
  content: Partial<SiteContent> | SiteContent | null | undefined
): SiteContent => structuredClone(normalizeSiteContent(content));
/**
 * @param {Partial<SiteContent> | SiteContent | null | undefined} content
 * @returns {string}
 */
const contentFingerprint = (
  content: Partial<SiteContent> | SiteContent | null | undefined
): string => JSON.stringify(normalizeSiteContent(content));

function isPublishedSnapshotInSync(): boolean {
  return contentFingerprint(adminState) === contentFingerprint(publishedSnapshot);
}

/**
 * @param {HTMLElement | null} container
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(
    (element) =>
      !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true"
  );
}

function updateSyncIndicator(forcedState: SyncState = ""): void {
  if (!adminSyncIndicator) {
    return;
  }

  const canPublish = isSupabaseConfigured() && isSupabaseConnected();
  let state = forcedState;

  if (!state) {
    if (isPublishing) {
      state = "publishing";
    } else if (isPublishedSnapshotInSync()) {
      state = "synced";
    } else if (canPublish) {
      state = "pending";
    } else {
      state = "local";
    }
  }

  const config = {
    synced: { text: "No ar", className: "sync-indicator sync-indicator-success" },
    local: { text: "Rascunho local", className: "sync-indicator sync-indicator-warning" },
    pending: { text: "Aguardando envio", className: "sync-indicator sync-indicator-warning" },
    publishing: { text: "Salvando...", className: "sync-indicator sync-indicator-info" },
    offline: { text: "Sem resposta do site", className: "sync-indicator sync-indicator-danger" }
  }[state] || { text: "Verificando", className: "sync-indicator sync-indicator-info" };

  adminSyncIndicator.textContent = config.text;
  adminSyncIndicator.className = config.className;
  adminSyncIndicator.title =
    state === "synced"
      ? `Conteúdo já publicado no site. Última publicação conhecida: ${formatDateTime(publishedSnapshot.updatedAt)}`
      : state === "publishing"
        ? "O painel está salvando as alterações."
        : state === "pending"
          ? `Existe um rascunho diferente do que está no site. Última versão conhecida: ${formatDateTime(publishedSnapshot.updatedAt)}`
          : state === "local"
            ? "Existe conteúdo salvo apenas neste computador."
            : state === "offline"
              ? "O painel não conseguiu consultar a versão pública do site agora."
              : "O painel está verificando o estado do conteúdo.";
}

/**
 * @param {string} message
 * @param {StatusTone} [tone="info"]
 * @param {string} [syncState=""]
 * @returns {void}
 */
function setStatus(
  message: string,
  tone: StatusTone = "info",
  syncState: SyncState = ""
): void {
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

/**
 * @param {unknown} error
 * @returns {string}
 */
function buildPublishErrorMessage(error: unknown): string {
  if (!error) {
    return "Não foi possível publicar agora. O conteúdo continua salvo só neste computador.";
  }

  const publishError = error as { status?: number };

  if (publishError.status === 401 || publishError.status === 403) {
    return "O painel perdeu a autenticação. Entre novamente para continuar salvando.";
  }

  if (publishError.status === 404) {
    return "Não foi possível encontrar um dos recursos necessários para salvar este conteúdo.";
  }

  if (publishError.status === 409) {
    return "Outra alteração chegou antes desta publicação. O conteúdo continua salvo neste computador. Tente publicar novamente em alguns segundos.";
  }

  if (publishError.status === 422) {
    return "Não foi possível salvar esse conteúdo. Revise os dados e tente novamente.";
  }

  if (publishError.status === 503) {
    return "O serviço de conteúdo ficou indisponível no momento do salvamento. Tente novamente em instantes.";
  }

  return "Não foi possível salvar agora. O conteúdo continua salvo só neste computador.";
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function buildLibraryRefreshErrorMessage(error: unknown): string {
  if (!error) {
    return "Não foi possível atualizar a biblioteca de imagens agora.";
  }

  const repositoryError = error as { status?: number };

  if (repositoryError.status === 401 || repositoryError.status === 403) {
    return "A biblioteca de imagens não pôde ser atualizada porque a sessão atual expirou. Entre novamente no painel.";
  }

  if (repositoryError.status === 404) {
    return "A biblioteca de imagens não pôde ser atualizada porque a pasta de mídia não foi encontrada.";
  }

  if (repositoryError.status === 409 || repositoryError.status === 422) {
    return "A biblioteca de imagens encontrou um conflito temporário. Tente novamente em alguns segundos.";
  }

  if (repositoryError.status === 429) {
    return "A biblioteca de imagens foi consultada muitas vezes em sequência. Aguarde um pouco e tente novamente.";
  }

  if (repositoryError.status === 503) {
    return "O serviço de imagens ficou indisponível no momento da atualização. Tente novamente em instantes.";
  }

  return "Não foi possível atualizar a biblioteca de imagens agora.";
}

function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig().enabled;
}

function isSupabaseConnected(): boolean {
  return Boolean(getSupabaseAdminSession());
}

function isOwnerPanelUser(): boolean {
  return currentPanelAccess?.role === "owner";
}

function updateOwnerAccessVisibility(): void {
  const canManageAccess = isOwnerPanelUser();
  ownerAccessNavButton.hidden = !canManageAccess;

  if (!canManageAccess && document.querySelector<HTMLElement>("#ownerAccessPanel.active")) {
    showPanel("dashboardPanel");
  }
}

function dedupePanelAllowlist(entries: PanelAccessEntry[]): PanelAccessEntry[] {
  const deduped = new Map<string, PanelAccessEntry>();

  [...entries]
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt || left.createdAt || "") || 0;
      const rightTime = Date.parse(right.updatedAt || right.createdAt || "") || 0;
      return rightTime - leftTime;
    })
    .forEach((entry) => {
      const key = entry.email.trim().toLowerCase();
      if (!deduped.has(key)) {
        deduped.set(key, entry);
      }
    });

  return [...deduped.values()].sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === "owner" ? -1 : 1;
    }

    return left.email.localeCompare(right.email);
  });
}

function setOwnerAccessBusy(nextState: boolean): void {
  isSavingOwnerAccess = nextState;
  ownerAccessEmail.disabled = nextState;
  ownerAccessPassword.disabled = nextState;
  ownerAccessRole.disabled = nextState;
  ownerAccessActive.disabled = nextState;
  clearOwnerAccessFormButton.disabled = nextState;

  if (saveOwnerAccessButton) {
    saveOwnerAccessButton.disabled = nextState;
    saveOwnerAccessButton.textContent = nextState ? "Salvando..." : "Salvar";
  }
}

function buildSupabasePublishErrorMessage(error: unknown, sectionLabel: string): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("não está autorizado")) {
    return "Este e-mail ainda não está liberado para usar o painel.";
  }

  if (message.includes("Invalid login credentials")) {
    return `Não foi possível confirmar a conta que está usando o painel para salvar ${sectionLabel}. Verifique e-mail e senha.`;
  }

  if (message.includes("JWT") || message.includes("refresh")) {
    return `A sessão do painel expirou ao salvar ${sectionLabel}. Entre novamente e tente outra vez.`;
  }

  if (message.includes("new row violates row-level security") || message.includes("permission denied")) {
    return `O painel não conseguiu salvar ${sectionLabel} por falta de permissão.`;
  }

  return `Não foi possível salvar ${sectionLabel} agora. O rascunho continua salvo neste navegador.`;
}

/**
 * @param {boolean} nextState
 * @returns {void}
 */
function setPublishingState(nextState: boolean): void {
  isPublishing = nextState;
  publishLockedControls.forEach((control) => {
    control.disabled = nextState;
  });
  if (mediaFile) {
    mediaFile.disabled = nextState;
  }
  updateSyncIndicator(nextState ? "publishing" : "");
}

/**
 * @param {string} panelId
 * @returns {void}
 */
function showPanel(panelId: string): void {
  const safePanelId = panelId === "ownerAccessPanel" && !isOwnerPanelUser()
    ? "dashboardPanel"
    : panelId;

  panels.forEach((panel) => {
    const isActive = panel.id === safePanelId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });

  panelButtons.forEach((button) => {
    const isActive = button.dataset.panel === safePanelId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

/**
 * @param {string} panelId
 * @returns {void}
 */
function jumpToPanel(panelId: string): void {
  showPanel(panelId);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function handleConfirmModalKeydown(event: KeyboardEvent): void {
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

/**
 * @param {string} message
 * @param {ConfirmHandler} onConfirm
 * @returns {void}
 */
function openConfirmModal(message: string, onConfirm: ConfirmHandler): void {
  pendingConfirmation = onConfirm;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  confirmMessage.textContent = message;
  confirmModal.classList.add("active");
  confirmModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", handleConfirmModalKeydown);
  (cancelConfirmButton || confirmActionButton || confirmModalCard)?.focus();
}

function closeConfirmModal(): void {
  pendingConfirmation = null;
  confirmModal.classList.remove("active");
  confirmModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  window.removeEventListener("keydown", handleConfirmModalKeydown);
  lastFocusedElement?.focus?.();
  lastFocusedElement = null;
}

function revokeMediaPreviewObjectUrl(): void {
  if (mediaPreviewObjectUrl) {
    URL.revokeObjectURL(mediaPreviewObjectUrl);
    mediaPreviewObjectUrl = "";
  }
}

function setMediaPreview(src = "", label = "", alt = ""): void {
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

/**
 * @param {File} file
 * @returns {void}
 */
function setMediaPreviewFromFile(file: File): void {
  revokeMediaPreviewObjectUrl();
  mediaPreviewObjectUrl = URL.createObjectURL(file);
  setMediaPreview(mediaPreviewObjectUrl, `Arquivo selecionado: ${file.name}`, mediaAlt.value.trim() || mediaTitle.value.trim());
}

function buildGalleryLibraryEntries(): PortalImageLibraryEntry[] {
  return normalizePortalImageLibraryEntries(
    adminState.gallery.map((item) => ({
      path: extractSupabaseStoragePath(item.src),
      name: item.title || extractSupabaseStoragePath(item.src).split("/").pop() || "imagem",
      previewSrc: item.src,
      source: "gallery" as const
    }))
  );
}

/**
 * @param {PortalImageLibraryEntry[]} [repositoryEntries=[]]
 * @returns {void}
 */
function mergeImageLibraryEntries(repositoryEntries: PortalImageLibraryEntry[] = []): void {
  imageLibraryEntries = normalizePortalImageLibraryEntries([
    ...buildGalleryLibraryEntries(),
    ...repositoryEntries
  ]);
}

function renderImageLibrary(): void {
  if (!imageLibrary) {
    return;
  }

  if (!imageLibraryEntries.length) {
    imageLibrary.innerHTML = '<div class="empty-state">Nenhuma imagem disponível ainda. Envie a primeira imagem para começar a biblioteca.</div>';
    return;
  }

  const activeGalleryPaths = new Set(adminState.gallery.map((item) => extractSupabaseStoragePath(item.src)));

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

/**
 * @param {PortalImageLibraryEntry | undefined} entry
 * @returns {void}
 */
function selectLibraryImage(entry: PortalImageLibraryEntry | undefined): void {
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

/**
 * @param {{ silent?: boolean }} [options={}]
 * @returns {Promise<void>}
 */
async function refreshImageLibrary(
  options: RefreshImageLibraryOptions = {}
): Promise<void> {
  const { silent = false } = options;

  try {
    const repositoryEntries = isSupabaseConfigured() && isSupabaseConnected()
      ? await listSupabasePortalImageLibrary()
      : [];
    mergeImageLibraryEntries(repositoryEntries);
    renderImageLibrary();
    if (!silent && repositoryEntries.length) {
      setStatus("Biblioteca de imagens atualizada com sucesso.", "success");
    }
  } catch (error) {
    console.error(error);
    mergeImageLibraryEntries([]);
    renderImageLibrary();
    if (!silent) {
      setStatus(buildLibraryRefreshErrorMessage(error), "warning");
    }
  }
}

async function saveNoticesToPrimaryStore(localMessage: string): Promise<void> {
  adminState.updatedAt = new Date().toISOString();
  saveDraftSiteContent(adminState);
  renderAll();

  if (!isSupabaseConfigured()) {
    setStatus(`${localMessage} O serviço de conteúdo ainda não está habilitado neste projeto.`, "warning", "local");
    return;
  }

  if (!isSupabaseConnected()) {
    setStatus(`${localMessage} Entre novamente no painel para publicar os avisos.`, "warning", "local");
    return;
  }

  try {
    setPublishingState(true);
    setStatus("Salvando avisos...", "info", "publishing");
    const persistedNotices = await syncSupabaseNotices(adminState.notices);
    adminState.notices = persistedNotices;
    adminState.updatedAt = new Date().toISOString();
    publishedSnapshot = cloneContent({
      ...publishedSnapshot,
      updatedAt: adminState.updatedAt,
      notices: persistedNotices
    });
    saveDraftSiteContent(adminState);
    renderAll();
    setStatus("Avisos salvos com sucesso.", "success", "synced");
  } catch (error) {
    console.error(error);
    setStatus(buildSupabasePublishErrorMessage(error, "os avisos"), "danger", "local");
  } finally {
    setPublishingState(false);
  }
}

async function saveQuickLinksToPrimaryStore(localMessage: string): Promise<void> {
  adminState.updatedAt = new Date().toISOString();
  saveDraftSiteContent(adminState);
  renderAll();

  if (!isSupabaseConfigured()) {
    setStatus(`${localMessage} O serviço de conteúdo ainda não está habilitado neste projeto.`, "warning", "local");
    return;
  }

  if (!isSupabaseConnected()) {
    setStatus(`${localMessage} Entre novamente no painel para publicar os links.`, "warning", "local");
    return;
  }

  try {
    setPublishingState(true);
    setStatus("Salvando links...", "info", "publishing");
    const persistedLinks = await syncSupabaseQuickLinks(adminState.quickLinks);
    adminState.quickLinks = persistedLinks;
    adminState.updatedAt = new Date().toISOString();
    publishedSnapshot = cloneContent({
      ...publishedSnapshot,
      updatedAt: adminState.updatedAt,
      quickLinks: persistedLinks
    });
    saveDraftSiteContent(adminState);
    renderAll();
    setStatus("Links salvos com sucesso.", "success", "synced");
  } catch (error) {
    console.error(error);
    setStatus(buildSupabasePublishErrorMessage(error, "os links rápidos"), "danger", "local");
  } finally {
    setPublishingState(false);
  }
}

async function saveMediaWithCurrentGallery(localMessage: string): Promise<void> {
  adminState.updatedAt = new Date().toISOString();
  saveDraftSiteContent(adminState);
  renderAll();

  if (!isSupabaseConfigured()) {
    setStatus(`${localMessage} O serviço de conteúdo ainda não está habilitado neste projeto.`, "warning", "local");
    return;
  }

  if (!isSupabaseConnected()) {
    setStatus(`${localMessage} Entre novamente no painel para publicar a galeria.`, "warning", "local");
    return;
  }

  try {
    setPublishingState(true);
    setStatus("Salvando galeria...", "info", "publishing");
    const persistedGallery = await syncSupabaseGallery(adminState.gallery);
    adminState.gallery = persistedGallery;
    adminState.updatedAt = new Date().toISOString();
    saveDraftSiteContent(adminState);
    publishedSnapshot = cloneContent({
      ...publishedSnapshot,
      updatedAt: adminState.updatedAt,
      gallery: persistedGallery
    });
    renderAll();
    await refreshImageLibrary({ silent: true });
    setStatus(`${localMessage} A galeria do portal foi atualizada com sucesso.`, "success", "synced");
  } catch (error) {
    console.error(error);
    setStatus(buildPublishErrorMessage(error), "danger", isSupabaseConnected() ? "pending" : "local");
  } finally {
    setPublishingState(false);
  }
}

async function saveMediaWithUpload(): Promise<void> {
  const selectedFile = mediaFile?.files?.[0] || null;
  const selectedPath = mediaPath.value.trim();

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

    if (!isSupabaseConfigured()) {
      setStatus("O serviço de conteúdo ainda não está habilitado neste projeto.", "warning", "local");
      return;
    }

    if (!isSupabaseConnected()) {
      setStatus("Entre novamente no painel antes de enviar uma nova imagem.", "warning", "local");
      return;
    }
  }

  let uploadedImagePath = selectedPath;
  let uploadSucceeded = false;

  try {
    if (selectedFile) {
      setPublishingState(true);
      setStatus("Enviando imagem...", "info", "publishing");
      const generatedPath = createPortalImagePath(mediaTitle.value.trim(), selectedFile.name);
      const uploadResult = await uploadPortalImageToSupabase(selectedFile, generatedPath);
      uploadedImagePath = uploadResult.path;
      uploadSucceeded = true;
      mediaPath.value = uploadedImagePath;
      mergeImageLibraryEntries([
        ...imageLibraryEntries,
        {
          path: uploadedImagePath,
          name: uploadedImagePath.split("/").pop() || selectedFile.name,
          previewSrc: uploadResult.publicUrl,
          source: "repository"
        }
      ]);
      renderImageLibrary();
      setStatus("Imagem enviada. Atualizando a galeria publicada...", "info", "publishing");
    }

    const payload = {
      id: mediaId.value || `media-${Date.now()}`,
      title: mediaTitle.value.trim(),
      src: resolvePublicImageUrl(uploadedImagePath),
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

    selectedLibraryImagePath = extractSupabaseStoragePath(payload.src);
    adminState.updatedAt = new Date().toISOString();
    saveDraftSiteContent(adminState);
    renderAll();

    if (!isSupabaseConfigured()) {
      setStatus("Imagem salva só neste computador. O serviço de conteúdo ainda não está habilitado neste projeto.", "warning", "local");
      fillMediaForm();
      return;
    }

    if (!isSupabaseConnected()) {
      setStatus("Imagem salva só neste computador. Entre novamente no painel para publicá-la no portal.", "warning", "local");
      fillMediaForm();
      return;
    }

    if (!isPublishing) {
      setPublishingState(true);
      setStatus("Salvando galeria...", "info", "publishing");
    }

    const persistedGallery = await syncSupabaseGallery(adminState.gallery);
    adminState.gallery = persistedGallery;
    adminState.updatedAt = new Date().toISOString();
    saveDraftSiteContent(adminState);
    publishedSnapshot = cloneContent({
      ...publishedSnapshot,
      updatedAt: adminState.updatedAt,
      gallery: persistedGallery
    });
    fillMediaForm();
    await refreshImageLibrary({ silent: true });
    renderAll();
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
        "A imagem foi enviada, mas a galeria ainda não foi atualizada no site. Salve novamente para concluir.",
        "danger",
        "pending"
      );
    } else {
      setStatus(buildPublishErrorMessage(error), "danger", isSupabaseConnected() ? "pending" : "local");
    }
  } finally {
    setPublishingState(false);
  }
}

/**
 * @param {NoticeItem | null} [item=null]
 * @returns {void}
 */
function fillNoticeForm(item: NoticeItem | null = null): void {
  noticeId.value = item?.id || "";
  noticeTitle.value = item?.title || "";
  noticeSummary.value = item?.summary || "";
  noticeCategory.value = item?.category || "";
  noticeDate.value = item?.date || "";
  noticeFeatured.checked = Boolean(item?.featured);
  noticePublished.checked = item?.published !== false;
}

/**
 * @param {QuickLinkItem | null} [item=null]
 * @returns {void}
 */
function fillLinkForm(item: QuickLinkItem | null = null): void {
  linkId.value = item?.id || "";
  linkLabel.value = item?.label || "";
  linkUrl.value = item?.url || "";
  linkPublished.checked = item?.published !== false;
}

/**
 * @param {GalleryItem | null} [item=null]
 * @returns {void}
 */
function fillMediaForm(item: GalleryItem | null = null): void {
  revokeMediaPreviewObjectUrl();
  mediaId.value = item?.id || "";
  mediaTitle.value = item?.title || "";
  mediaPath.value = item?.src ? extractSupabaseStoragePath(item.src) : "";
  mediaAlt.value = item?.alt || "";
  mediaOrder.value = String(item?.order || adminState.gallery.length + 1);
  mediaPublished.checked = item?.published !== false;
  if (mediaFile) {
    mediaFile.value = "";
  }

  selectedLibraryImagePath = item?.src ? extractSupabaseStoragePath(item.src) : "";
  if (item?.src) {
    const itemPath = extractSupabaseStoragePath(item.src);
    const entry = imageLibraryEntries.find((libraryItem) => libraryItem.path === itemPath);
    setMediaPreview(item.src, `Imagem escolhida: ${entry?.name || item.title || item.src}`, item.alt || item.title);
  } else {
    setMediaPreview("", "Selecione uma imagem da biblioteca ou envie um arquivo do computador.");
  }

  renderImageLibrary();
}

function renderNotices(): void {
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

  Array.from(noticeItems.querySelectorAll<HTMLButtonElement>("[data-edit-notice]")).forEach((button) => {
    button.addEventListener("click", () => {
      const item = adminState.notices.find((entry) => entry.id === button.dataset.editNotice);
      fillNoticeForm(item || null);
      jumpToPanel("noticesPanel");
    });
  });

  Array.from(noticeItems.querySelectorAll<HTMLButtonElement>("[data-delete-notice]")).forEach((button) => {
    button.addEventListener("click", () => {
      openConfirmModal("Esse aviso será removido do painel e do portal dos alunos.", async () => {
        adminState.notices = adminState.notices.filter((entry) => entry.id !== button.dataset.deleteNotice);
        await saveNoticesToPrimaryStore("Aviso removido do painel.");
      });
    });
  });
}

function renderLinks(): void {
  const links = [...adminState.quickLinks];
  if (!links.length) {
    linkItems.innerHTML = '<div class="empty-state">Nenhum link publicado ainda.</div>';
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

  Array.from(linkItems.querySelectorAll<HTMLButtonElement>("[data-edit-link]")).forEach((button) => {
    button.addEventListener("click", () => {
      const item = adminState.quickLinks.find((entry) => entry.id === button.dataset.editLink);
      fillLinkForm(item || null);
      jumpToPanel("linksPanel");
    });
  });

  Array.from(linkItems.querySelectorAll<HTMLButtonElement>("[data-delete-link]")).forEach((button) => {
    button.addEventListener("click", () => {
      openConfirmModal("Esse link deixará de aparecer para os alunos.", async () => {
        adminState.quickLinks = adminState.quickLinks.filter((entry) => entry.id !== button.dataset.deleteLink);
        await saveQuickLinksToPrimaryStore("Link removido do painel.");
      });
    });
  });
}

function renderGallery(): void {
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

  Array.from(mediaItems.querySelectorAll<HTMLButtonElement>("[data-edit-media]")).forEach((button) => {
    button.addEventListener("click", () => {
      const item = adminState.gallery.find((entry) => entry.id === button.dataset.editMedia);
      fillMediaForm(item || null);
      jumpToPanel("mediaPanel");
    });
  });

  Array.from(mediaItems.querySelectorAll<HTMLButtonElement>("[data-delete-media]")).forEach((button) => {
    button.addEventListener("click", () => {
      openConfirmModal("Essa imagem será retirada da galeria pública do portal.", async () => {
        adminState.gallery = adminState.gallery.filter((entry) => entry.id !== button.dataset.deleteMedia);
        await saveMediaWithCurrentGallery("Imagem removida da galeria.");
      });
    });
  });
}

function fillOwnerAccessForm(item: PanelAccessEntry | null = null): void {
  ownerAccessId.value = item?.id || "";
  ownerAccessEmail.value = item?.email || "";
  ownerAccessPassword.value = "";
  ownerAccessRole.value = item?.role || "editor";
  ownerAccessActive.checked = item?.active !== false;
}

function renderOwnerAccessList(): void {
  panelAllowlist = dedupePanelAllowlist(panelAllowlist);

  if (!isOwnerPanelUser()) {
    ownerAccessItems.innerHTML =
      '<div class="empty-state">Somente o dono do painel pode visualizar esta área.</div>';
    return;
  }

  if (!panelAllowlist.length) {
    ownerAccessItems.innerHTML =
      '<div class="empty-state">Nenhum e-mail autorizado foi cadastrado ainda.</div>';
    return;
  }

  ownerAccessItems.innerHTML = panelAllowlist
    .map((entry) => {
      const isCurrentUser = entry.email === currentPanelAccess?.email;
      return `
        <article class="list-card-horizontal">
          <div class="list-card-horizontal-content">
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span class="chip">${escapeHtml(entry.role === "owner" ? "Dono" : "Secretaria")}</span>
              <span class="status-badge ${entry.active ? "status-live" : "status-draft"}">${entry.active ? "Ativo" : "Bloqueado"}</span>
              ${isCurrentUser ? '<span class="status-badge status-live">Você</span>' : ""}
            </div>
            <h4 class="text-lg font-bold text-[var(--brand-primary)]">${escapeHtml(entry.email)}</h4>
            <p class="helper-text mt-1 text-sm">Atualizado em ${escapeHtml(formatDateTime(entry.updatedAt))}</p>
          </div>
          <div class="list-card-horizontal-actions flex-col sm:flex-row">
            <button type="button" class="btn-secondary px-4 py-2 text-sm" data-edit-owner-access="${entry.id}">Editar</button>
            <button type="button" class="btn-danger px-4 py-2 text-sm" data-delete-owner-access="${entry.id}" ${isCurrentUser ? "disabled" : ""}>Excluir</button>
          </div>
        </article>
      `;
    })
    .join("");

  Array.from(ownerAccessItems.querySelectorAll<HTMLButtonElement>("[data-edit-owner-access]")).forEach((button) => {
    button.addEventListener("click", () => {
      const item = panelAllowlist.find((entry) => entry.id === button.dataset.editOwnerAccess);
      fillOwnerAccessForm(item || null);
      jumpToPanel("ownerAccessPanel");
    });
  });

  Array.from(ownerAccessItems.querySelectorAll<HTMLButtonElement>("[data-delete-owner-access]")).forEach((button) => {
    button.addEventListener("click", () => {
      const item = panelAllowlist.find((entry) => entry.id === button.dataset.deleteOwnerAccess);
      if (!item || item.email === currentPanelAccess?.email) {
        return;
      }

      openConfirmModal(`O e-mail ${item.email} perderá o acesso ao painel.`, async () => {
        panelAllowlist = panelAllowlist.filter((entry) => entry.id !== item.id);
        panelAllowlist = dedupePanelAllowlist(await syncPanelAllowlist(panelAllowlist));
        renderOwnerAccessList();
        fillOwnerAccessForm();
        setStatus("Lista de e-mails permitidos atualizada com sucesso.", "success");
      });
    });
  });
}

function renderDashboard(): void {
  const publishedNotices = adminState.notices.filter((item) => item.published).length;
  const publishedLinks = adminState.quickLinks.filter((item) => item.published).length;
  const publishedGallery = adminState.gallery.filter((item) => item.published).length;

  dashboardNoticeCount.textContent = String(publishedNotices);
  dashboardLinkCount.textContent = String(publishedLinks);
  dashboardGalleryCount.textContent = String(publishedGallery);
  dashboardUpdatedAt.textContent = adminState.updatedAt
    ? new Date(adminState.updatedAt).toLocaleString("pt-BR")
    : "-";
}

function renderAll(): void {
  renderNotices();
  renderLinks();
  renderGallery();
  renderOwnerAccessList();
  renderDashboard();
  renderImageLibrary();
  updateSyncIndicator();
}

panelButtons.forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.panel || "dashboardPanel"));
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

noticeForm?.addEventListener("submit", async (event) => {
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
  await saveNoticesToPrimaryStore("Aviso salvo no painel.");
});

linkForm?.addEventListener("submit", async (event) => {
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
  await saveQuickLinksToPrimaryStore("Link salvo no painel.");
});

mediaForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isPublishing) {
    return;
  }
  await saveMediaWithUpload();
});

ownerAccessForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isPublishing || isSavingOwnerAccess || !isOwnerPanelUser()) {
    return;
  }

  setOwnerAccessBusy(true);

  const email = ownerAccessEmail.value.trim().toLowerCase();
  const password = ownerAccessPassword.value.trim();
  if (!email) {
    setStatus("Informe o e-mail que deve ser autorizado a entrar no painel.", "warning");
    setOwnerAccessBusy(false);
    return;
  }

  if (!ownerAccessId.value && !password) {
    setStatus("Defina uma senha para o novo acesso antes de salvar.", "warning");
    setOwnerAccessBusy(false);
    return;
  }

  const role = ownerAccessRole.value === "owner" ? "owner" : "editor";
  const active = ownerAccessActive.checked;

  if (
    currentPanelAccess &&
    email === currentPanelAccess.email &&
    (role !== "owner" || !active)
  ) {
    setStatus("O dono atual do painel não pode remover o próprio acesso por aqui.", "warning");
    setOwnerAccessBusy(false);
    return;
  }

  try {
    setPublishingState(true);
    setStatus("Salvando acesso do painel...", "info");
    const savedEntry = await manageSupabasePanelUser({
      id: ownerAccessId.value || undefined,
      email,
      password: password || undefined,
      role,
      active
    });

    const existingIndex = panelAllowlist.findIndex(
      (item) =>
        item.id === savedEntry.id || item.email.trim().toLowerCase() === savedEntry.email.trim().toLowerCase()
    );
    if (existingIndex >= 0) {
      panelAllowlist[existingIndex] = savedEntry;
    } else {
      panelAllowlist.unshift(savedEntry);
    }
    panelAllowlist = dedupePanelAllowlist(panelAllowlist);

    currentPanelAccess =
      panelAllowlist.find((entry) => entry.email === currentPanelAccess?.email) || currentPanelAccess;
    updateOwnerAccessVisibility();
    renderOwnerAccessList();
    fillOwnerAccessForm();
    setStatus("Acesso do painel salvo com sucesso. E-mail, senha e permissão já foram registrados.", "success");
  } catch (error) {
    console.error(error);
    setStatus(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar os e-mails permitidos do painel agora.",
      "danger"
    );
  } finally {
    setPublishingState(false);
    setOwnerAccessBusy(false);
  }
});

clearNoticeFormButton?.addEventListener("click", () => fillNoticeForm());
clearLinkFormButton?.addEventListener("click", () => fillLinkForm());
clearMediaFormButton?.addEventListener("click", () => fillMediaForm());
clearOwnerAccessFormButton?.addEventListener("click", () => fillOwnerAccessForm());

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
  clearSupabaseAdminSession();
  window.location.replace("index.html?home=1");
});

async function bootstrap() {
  try {
    currentPanelAccess = await ensureSupabasePanelAccess();
    panelAllowlist = isOwnerPanelUser() ? await fetchPanelAllowlist() : [];
  } catch (error) {
    console.error(error);
    clearSupabaseAdminSession();
    window.location.replace("index.html?admin=1");
    return;
  }

  updateOwnerAccessVisibility();

  let publishedContent = null;
  let draftOrPublishedContent = null;
  const localDraft = readDraftSiteContent();

  try {
    publishedContent = await fetchPublishedSiteContent();
  } catch (error) {
    console.warn("Falha ao carregar conteúdo publicado.", error);
  }

  if (localDraft) {
    draftOrPublishedContent = localDraft;
  } else if (isSupabaseConfigured() && isSupabaseConnected()) {
    try {
      draftOrPublishedContent = await fetchSupabaseEditorSiteContent();
    } catch (error) {
      console.warn("Falha ao carregar conteúdo editorial do Supabase.", error);
    }
  }

  if (!draftOrPublishedContent) {
    try {
      draftOrPublishedContent = await loadEditorSiteContent();
    } catch (error) {
      console.warn("Falha ao carregar conteúdo base do editor.", error);
    }
  }

  publishedSnapshot = cloneContent(publishedContent || defaultContent);
  adminState = cloneContent(draftOrPublishedContent || publishedContent || defaultContent);

  fillNoticeForm();
  fillLinkForm();
  fillMediaForm();
  fillOwnerAccessForm();
  renderAll();
  showPanel("dashboardPanel");
  await refreshImageLibrary({ silent: true });

  if (!publishedContent) {
    setStatus(
      "Painel carregado com conteúdo salvo neste computador, mas a versão publicada do site não pôde ser consultada agora.",
      "warning",
      "offline"
    );
    return;
  }

  if (isPublishedSnapshotInSync()) {
    setStatus(
      `Painel carregado. O conteúdo abaixo já está igual ao que foi publicado no site em ${formatDateTime(publishedSnapshot.updatedAt)}.`,
      isSupabaseConnected() ? "success" : "info",
      "synced"
    );
    return;
  }

  setStatus(
    isSupabaseConnected()
      ? `Existe um rascunho salvo neste computador diferente do site publicado. Última versão pública conhecida: ${formatDateTime(publishedSnapshot.updatedAt)}.`
      : "Existe um rascunho salvo só neste computador. Entre novamente no painel para publicar essa versão no site.",
    "warning",
    isSupabaseConnected() ? "pending" : "local"
  );
}

bootstrap();
