import { clearDraftSiteContent, clearGitHubPublishToken, createPortalImagePath, fetchPublishedSiteContent, fetchPublishedSiteContentMeta, getGitHubPublishToken, isAllowedPortalImageFileName, listPortalImageLibrary, readDraftSiteContent, loadEditorSiteContent, normalizePortalImageLibraryEntries, normalizeSiteContent, publishSiteContentToGitHub, saveDraftSiteContent, setGitHubPublishToken, uploadPortalImageToGitHub } from "../core/site-content.js";
import { clearSupabaseAdminSession, ensureSupabasePanelAccess, fetchPanelAllowlist, fetchSupabaseEditorSiteContent, getSupabaseAdminSession, getSupabasePublicConfig, manageSupabasePanelUser, signInSupabaseAdmin, syncPanelAllowlist, syncRememberedSupabaseAdminSession, syncSupabaseNotices, syncSupabaseQuickLinks } from "../core/supabase.js";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function mustElement(id) {
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
function mustForm(id) {
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
function mustInput(id) {
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
function mustSelect(id) {
    const element = mustElement(id);
    if (!(element instanceof HTMLSelectElement)) {
        throw new Error(`Seleção obrigatória inválida: #${id}`);
    }
    return element;
}
function mustTextArea(id) {
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
function mustButton(id) {
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
function mustImage(id) {
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
function queryButton(root, selector) {
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
let currentPanelAccess = null;
let panelAllowlist = [];
let isSavingOwnerAccess = false;
const panelButtons = Array.from(document.querySelectorAll("[data-panel]"));
const panels = Array.from(document.querySelectorAll(".content-panel"));
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
const supabaseAuthForm = mustForm("supabaseAuthForm");
const supabaseEmailInput = mustInput("supabaseEmailInput");
const supabasePasswordInput = mustInput("supabasePasswordInput");
const supabaseRememberSession = mustInput("supabaseRememberSession");
const supabaseAuthStatus = mustElement("supabaseAuthStatus");
const clearSupabaseSessionButton = mustButton("clearSupabaseSessionButton");
const githubTokenForm = mustForm("githubTokenForm");
const githubTokenInput = mustInput("githubTokenInput");
const githubTokenStatus = mustElement("githubTokenStatus");
const clearGitHubTokenButton = mustButton("clearGitHubTokenButton");
const usePublishedContentButton = mustButton("usePublishedContentButton");
const confirmModal = mustElement("confirmModal");
const confirmModalCard = confirmModal.querySelector(".modal-card");
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
const connectSupabaseButton = queryButton(supabaseAuthForm, 'button[type="submit"]');
const connectGitHubButton = queryButton(githubTokenForm, 'button[type="submit"]');
const publishLockedControls = [
    saveNoticeButton,
    saveLinkButton,
    saveMediaButton,
    saveOwnerAccessButton,
    connectSupabaseButton,
    clearSupabaseSessionButton,
    connectGitHubButton,
    clearGitHubTokenButton,
    usePublishedContentButton,
    confirmActionButton,
    refreshImageLibraryButton
].filter((control) => control instanceof HTMLButtonElement);
/**
 * @param {string | number | null | undefined} [value=""]
 * @returns {string}
 */
const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
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
/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
const formatDateTime = (value) => {
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
const cloneContent = (content) => structuredClone(normalizeSiteContent(content));
/**
 * @param {Partial<SiteContent> | SiteContent | null | undefined} content
 * @returns {string}
 */
const contentFingerprint = (content) => JSON.stringify(normalizeSiteContent(content));
function isPublishedSnapshotInSync() {
    return contentFingerprint(adminState) === contentFingerprint(publishedSnapshot);
}
/**
 * @param {HTMLElement | null} container
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container) {
    if (!container) {
        return [];
    }
    return Array.from(container.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");
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
        }
        else if (isPublishedSnapshotInSync()) {
            state = "synced";
        }
        else if (hasToken) {
            state = "pending";
        }
        else {
            state = "local";
        }
    }
    const config = {
        synced: { text: "Publicado no site", className: "sync-indicator sync-indicator-success" },
        local: { text: "Salvo só neste computador", className: "sync-indicator sync-indicator-warning" },
        pending: { text: "Pronto para publicar", className: "sync-indicator sync-indicator-warning" },
        publishing: { text: "Publicando no site...", className: "sync-indicator sync-indicator-info" },
        offline: { text: "Site público indisponível", className: "sync-indicator sync-indicator-danger" }
    }[state] || { text: "Sincronizando", className: "sync-indicator sync-indicator-info" };
    adminSyncIndicator.textContent = config.text;
    adminSyncIndicator.className = config.className;
    adminSyncIndicator.title =
        state === "synced"
            ? `Conteúdo já publicado no site. Última publicação conhecida: ${formatDateTime(publishedSnapshot.updatedAt)}`
            : state === "publishing"
                ? "O painel está enviando as alterações para o repositório e atualizando o site."
                : state === "pending"
                    ? `Existe um rascunho diferente do site público. Última versão publicada conhecida: ${formatDateTime(publishedSnapshot.updatedAt)}`
                    : state === "local"
                        ? "Existe conteúdo salvo apenas neste computador."
                        : state === "offline"
                            ? "O painel não conseguiu consultar a versão publicada do site agora."
                            : "O painel está verificando o estado da publicação.";
}
/**
 * @param {string} message
 * @param {StatusTone} [tone="info"]
 * @param {string} [syncState=""]
 * @returns {void}
 */
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
/**
 * @param {unknown} error
 * @returns {string}
 */
function buildPublishErrorMessage(error) {
    if (!error) {
        return "Não foi possível publicar agora. O conteúdo continua salvo só neste computador.";
    }
    const publishError = error;
    if (publishError.status === 401 || publishError.status === 403) {
        return "O GitHub recusou a publicação. Verifique se o token ainda é válido e se possui permissão Contents: write.";
    }
    if (publishError.status === 404) {
        return "O GitHub não encontrou o repositório ou o arquivo de conteúdo. Verifique o acesso da conta e do token.";
    }
    if (publishError.status === 409) {
        return "Outra alteração chegou antes desta publicação. O conteúdo continua salvo neste computador. Tente publicar novamente em alguns segundos.";
    }
    if (publishError.status === 422) {
        return "O GitHub recusou esta publicação por validação ou excesso de tentativas seguidas. Aguarde alguns segundos e tente novamente.";
    }
    if (publishError.status === 503) {
        return "O GitHub ficou indisponível no momento da publicação. Tente novamente em instantes.";
    }
    return "Não foi possível publicar agora. O conteúdo continua salvo só neste computador. Verifique o token e as permissões de escrita no repositório.";
}
/**
 * @param {unknown} error
 * @returns {string}
 */
function buildLibraryRefreshErrorMessage(error) {
    if (!error) {
        return "Não foi possível atualizar a biblioteca de imagens agora.";
    }
    const repositoryError = error;
    if (repositoryError.status === 401 || repositoryError.status === 403) {
        return "A biblioteca de imagens não pôde ser atualizada porque o GitHub recusou o token. Verifique se ele ainda é válido e se tem acesso ao repositório.";
    }
    if (repositoryError.status === 404) {
        return "A biblioteca de imagens não pôde ser atualizada porque a pasta de imagens ou o repositório não foi encontrado no GitHub.";
    }
    if (repositoryError.status === 409 || repositoryError.status === 422) {
        return "A biblioteca de imagens encontrou um conflito temporário ao consultar o GitHub. Tente novamente em alguns segundos.";
    }
    if (repositoryError.status === 429) {
        return "O GitHub limitou temporariamente as consultas da biblioteca de imagens. Aguarde um pouco e tente novamente.";
    }
    if (repositoryError.status === 503) {
        return "O GitHub estava indisponível no momento da atualização da biblioteca de imagens. Tente novamente em instantes.";
    }
    return "Não foi possível atualizar a biblioteca de imagens agora. Verifique a conexão, o token e o acesso ao repositório.";
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
function isSupabaseConfigured() {
    return getSupabasePublicConfig().enabled;
}
function isSupabaseConnected() {
    return Boolean(getSupabaseAdminSession());
}
function isOwnerPanelUser() {
    return currentPanelAccess?.role === "owner";
}
function updateOwnerAccessVisibility() {
    const canManageAccess = isOwnerPanelUser();
    ownerAccessNavButton.hidden = !canManageAccess;
    if (!canManageAccess && document.querySelector("#ownerAccessPanel.active")) {
        showPanel("dashboardPanel");
    }
}
function dedupePanelAllowlist(entries) {
    const deduped = new Map();
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
function setOwnerAccessBusy(nextState) {
    isSavingOwnerAccess = nextState;
    ownerAccessEmail.disabled = nextState;
    ownerAccessPassword.disabled = nextState;
    ownerAccessRole.disabled = nextState;
    ownerAccessActive.disabled = nextState;
    clearOwnerAccessFormButton.disabled = nextState;
    if (saveOwnerAccessButton) {
        saveOwnerAccessButton.disabled = nextState;
        saveOwnerAccessButton.textContent = nextState ? "Salvando..." : "Salvar acesso";
    }
}
function updateSupabaseAuthStatus() {
    const configured = isSupabaseConfigured();
    const session = getSupabaseAdminSession();
    if (!configured) {
        supabaseAuthStatus.textContent =
            "Supabase ainda não está habilitado neste projeto. O painel continuará usando apenas o fluxo legado.";
        supabaseAuthStatus.className = "mt-4 text-sm text-yellow-700";
        clearSupabaseSessionButton.disabled = true;
        return;
    }
    if (session) {
        const scopeLabel = isOwnerPanelUser()
            ? "Você também pode gerenciar os e-mails permitidos do painel."
            : "Avisos e links rápidos já podem ser salvos no banco.";
        supabaseAuthStatus.textContent =
            `Sessão do Supabase conectada como ${session.email}. ${scopeLabel}`;
        supabaseAuthStatus.className = "mt-4 text-sm text-green-700";
        supabaseEmailInput.value = session.email;
        supabasePasswordInput.value = "";
        clearSupabaseSessionButton.disabled = isPublishing;
        return;
    }
    supabaseAuthStatus.textContent =
        "Supabase configurado, mas ainda sem uma sessão administrativa conectada neste painel.";
    supabaseAuthStatus.className = "mt-4 text-sm text-yellow-700";
    clearSupabaseSessionButton.disabled = true;
}
function buildSupabasePublishErrorMessage(error, sectionLabel) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("não está autorizado")) {
        return "Este e-mail foi autenticado no Supabase, mas ainda não está liberado para usar o painel.";
    }
    if (message.includes("Invalid login credentials")) {
        return `Não foi possível autenticar o Supabase para salvar ${sectionLabel}. Verifique e-mail e senha da conta administrativa.`;
    }
    if (message.includes("JWT") || message.includes("refresh")) {
        return `A sessão do Supabase expirou ao salvar ${sectionLabel}. Conecte novamente a conta administrativa e tente outra vez.`;
    }
    if (message.includes("new row violates row-level security") || message.includes("permission denied")) {
        return `O Supabase recusou a gravação de ${sectionLabel}. Verifique se as políticas de escrita para usuários autenticados já foram aplicadas.`;
    }
    return `Não foi possível salvar ${sectionLabel} no Supabase agora. O rascunho continua salvo neste navegador.`;
}
/**
 * @param {boolean} nextState
 * @returns {void}
 */
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
/**
 * @param {string} panelId
 * @returns {void}
 */
function showPanel(panelId) {
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
function jumpToPanel(panelId) {
    showPanel(panelId);
    window.scrollTo({ top: 0, behavior: "smooth" });
}
/**
 * @param {KeyboardEvent} event
 * @returns {void}
 */
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
/**
 * @param {string} message
 * @param {ConfirmHandler} onConfirm
 * @returns {void}
 */
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
/**
 * @param {File} file
 * @returns {void}
 */
function setMediaPreviewFromFile(file) {
    revokeMediaPreviewObjectUrl();
    mediaPreviewObjectUrl = URL.createObjectURL(file);
    setMediaPreview(mediaPreviewObjectUrl, `Arquivo selecionado: ${file.name}`, mediaAlt.value.trim() || mediaTitle.value.trim());
}
function buildGalleryLibraryEntries() {
    return normalizePortalImageLibraryEntries(adminState.gallery.map((item) => ({
        path: item.src,
        name: item.title || item.src.split("/").pop() || "imagem",
        previewSrc: item.src,
        source: "gallery"
    })));
}
/**
 * @param {PortalImageLibraryEntry[]} [repositoryEntries=[]]
 * @returns {void}
 */
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
/**
 * @param {PortalImageLibraryEntry | undefined} entry
 * @returns {void}
 */
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
/**
 * @param {{ silent?: boolean }} [options={}]
 * @returns {Promise<void>}
 */
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
    }
    catch (error) {
        console.error(error);
        mergeImageLibraryEntries([]);
        renderImageLibrary();
        if (!silent) {
            setStatus(buildLibraryRefreshErrorMessage(error), "warning");
        }
    }
}
/**
 * @param {string} reason
 * @returns {Promise<void>}
 */
async function publishStateToGitHub(reason) {
    const token = getGitHubPublishToken();
    if (!token) {
        setStatus("Alteração salva só neste computador. Conecte o GitHub para enviar isso ao site público.", "warning", "local");
        return;
    }
    publishQueue = publishQueue
        .catch(() => null)
        .then(async () => {
        setPublishingState(true);
        setStatus("Publicando alterações no GitHub. O deploy do Pages será disparado em seguida.", "info", "publishing");
        try {
            await publishSiteContentToGitHub(adminState, token, reason);
            publishedSnapshot = cloneContent(adminState);
            setStatus("Alterações publicadas com sucesso. O site público pode levar alguns segundos para mostrar a nova versão.", "success", "synced");
        }
        catch (error) {
            console.error(error);
            setStatus(buildPublishErrorMessage(error), "danger", "pending");
        }
        finally {
            setPublishingState(false);
        }
    });
    return publishQueue;
}
/**
 * @param {string} localMessage
 * @param {string} publishMessage
 * @returns {void}
 */
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
async function saveNoticesToPrimaryStore(localMessage) {
    adminState.updatedAt = new Date().toISOString();
    saveDraftSiteContent(adminState);
    renderAll();
    if (!isSupabaseConfigured()) {
        setStatus(`${localMessage} O Supabase ainda não está habilitado neste projeto.`, "warning", "local");
        return;
    }
    if (!isSupabaseConnected()) {
        setStatus(`${localMessage} Conecte o Supabase para publicar os avisos no portal.`, "warning", "local");
        return;
    }
    try {
        setPublishingState(true);
        setStatus("Salvando avisos no Supabase...", "info", "publishing");
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
        setStatus("Avisos salvos no Supabase com sucesso.", "success", "synced");
    }
    catch (error) {
        console.error(error);
        setStatus(buildSupabasePublishErrorMessage(error, "os avisos"), "danger", "local");
    }
    finally {
        setPublishingState(false);
    }
}
async function saveQuickLinksToPrimaryStore(localMessage) {
    adminState.updatedAt = new Date().toISOString();
    saveDraftSiteContent(adminState);
    renderAll();
    if (!isSupabaseConfigured()) {
        setStatus(`${localMessage} O Supabase ainda não está habilitado neste projeto.`, "warning", "local");
        return;
    }
    if (!isSupabaseConnected()) {
        setStatus(`${localMessage} Conecte o Supabase para publicar os links rápidos no portal.`, "warning", "local");
        return;
    }
    try {
        setPublishingState(true);
        setStatus("Salvando links rápidos no Supabase...", "info", "publishing");
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
        setStatus("Links rápidos salvos no Supabase com sucesso.", "success", "synced");
    }
    catch (error) {
        console.error(error);
        setStatus(buildSupabasePublishErrorMessage(error, "os links rápidos"), "danger", "local");
    }
    finally {
        setPublishingState(false);
    }
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
            const uploadResult = await uploadPortalImageToGitHub(selectedFile, token, generatedPath, `Upload portal image ${mediaTitle.value.trim() || selectedFile.name}`);
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
        }
        else {
            adminState.gallery.push(payload);
        }
        selectedLibraryImagePath = payload.src;
        adminState.updatedAt = new Date().toISOString();
        saveDraftSiteContent(adminState);
        renderAll();
        if (!token) {
            setStatus("Imagem salva só neste computador. Conecte o GitHub para publicá-la no portal.", "warning", "local");
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
        setStatus(uploadSucceeded
            ? "Imagem enviada e galeria publicada com sucesso."
            : "Imagem da biblioteca aplicada e galeria publicada com sucesso.", "success", "synced");
    }
    catch (error) {
        console.error(error);
        if (uploadSucceeded) {
            setStatus("A imagem foi enviada ao repositório, mas a galeria ainda não foi publicada no site. Salve novamente para concluir.", "danger", "pending");
        }
        else {
            setStatus(buildPublishErrorMessage(error), "danger", token ? "pending" : "local");
        }
    }
    finally {
        setPublishingState(false);
    }
}
/**
 * @param {NoticeItem | null} [item=null]
 * @returns {void}
 */
function fillNoticeForm(item = null) {
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
function fillLinkForm(item = null) {
    linkId.value = item?.id || "";
    linkLabel.value = item?.label || "";
    linkUrl.value = item?.url || "";
    linkPublished.checked = item?.published !== false;
}
/**
 * @param {GalleryItem | null} [item=null]
 * @returns {void}
 */
function fillMediaForm(item = null) {
    revokeMediaPreviewObjectUrl();
    mediaId.value = item?.id || "";
    mediaTitle.value = item?.title || "";
    mediaPath.value = item?.src || "";
    mediaAlt.value = item?.alt || "";
    mediaOrder.value = String(item?.order || adminState.gallery.length + 1);
    mediaPublished.checked = item?.published !== false;
    if (mediaFile) {
        mediaFile.value = "";
    }
    selectedLibraryImagePath = item?.src || "";
    if (item?.src) {
        const entry = imageLibraryEntries.find((libraryItem) => libraryItem.path === item.src);
        setMediaPreview(item.src, `Imagem escolhida: ${entry?.name || item.title || item.src}`, item.alt || item.title);
    }
    else {
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
        .map((item) => `
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
      `)
        .join("");
    Array.from(noticeItems.querySelectorAll("[data-edit-notice]")).forEach((button) => {
        button.addEventListener("click", () => {
            const item = adminState.notices.find((entry) => entry.id === button.dataset.editNotice);
            fillNoticeForm(item || null);
            jumpToPanel("noticesPanel");
        });
    });
    Array.from(noticeItems.querySelectorAll("[data-delete-notice]")).forEach((button) => {
        button.addEventListener("click", () => {
            openConfirmModal("Esse aviso será removido do painel e do portal dos alunos.", async () => {
                adminState.notices = adminState.notices.filter((entry) => entry.id !== button.dataset.deleteNotice);
                await saveNoticesToPrimaryStore("Aviso removido do painel.");
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
        .map((item) => `
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
      `)
        .join("");
    Array.from(linkItems.querySelectorAll("[data-edit-link]")).forEach((button) => {
        button.addEventListener("click", () => {
            const item = adminState.quickLinks.find((entry) => entry.id === button.dataset.editLink);
            fillLinkForm(item || null);
            jumpToPanel("linksPanel");
        });
    });
    Array.from(linkItems.querySelectorAll("[data-delete-link]")).forEach((button) => {
        button.addEventListener("click", () => {
            openConfirmModal("Esse link deixará de aparecer para os alunos.", async () => {
                adminState.quickLinks = adminState.quickLinks.filter((entry) => entry.id !== button.dataset.deleteLink);
                await saveQuickLinksToPrimaryStore("Link removido do painel.");
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
        .map((item) => `
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
      `)
        .join("");
    Array.from(mediaItems.querySelectorAll("[data-edit-media]")).forEach((button) => {
        button.addEventListener("click", () => {
            const item = adminState.gallery.find((entry) => entry.id === button.dataset.editMedia);
            fillMediaForm(item || null);
            jumpToPanel("mediaPanel");
        });
    });
    Array.from(mediaItems.querySelectorAll("[data-delete-media]")).forEach((button) => {
        button.addEventListener("click", () => {
            openConfirmModal("Essa imagem será retirada da galeria pública do portal.", () => {
                adminState.gallery = adminState.gallery.filter((entry) => entry.id !== button.dataset.deleteMedia);
                saveState("Imagem removida da galeria local.", `Remove gallery item ${button.dataset.deleteMedia} from site content`);
            });
        });
    });
}
function fillOwnerAccessForm(item = null) {
    ownerAccessId.value = item?.id || "";
    ownerAccessEmail.value = item?.email || "";
    ownerAccessPassword.value = "";
    ownerAccessRole.value = item?.role || "editor";
    ownerAccessActive.checked = item?.active !== false;
}
function renderOwnerAccessList() {
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
    Array.from(ownerAccessItems.querySelectorAll("[data-edit-owner-access]")).forEach((button) => {
        button.addEventListener("click", () => {
            const item = panelAllowlist.find((entry) => entry.id === button.dataset.editOwnerAccess);
            fillOwnerAccessForm(item || null);
            jumpToPanel("ownerAccessPanel");
        });
    });
    Array.from(ownerAccessItems.querySelectorAll("[data-delete-owner-access]")).forEach((button) => {
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
function renderDashboard() {
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
function renderAll() {
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
    }
    finally {
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
    }
    else {
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
    }
    else {
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
    if (currentPanelAccess &&
        email === currentPanelAccess.email &&
        (role !== "owner" || !active)) {
        setStatus("O dono atual do painel não pode remover o próprio acesso por aqui.", "warning");
        setOwnerAccessBusy(false);
        return;
    }
    try {
        setPublishingState(true);
        setStatus("Salvando acesso do painel no Supabase...", "info");
        const savedEntry = await manageSupabasePanelUser({
            id: ownerAccessId.value || undefined,
            email,
            password: password || undefined,
            role,
            active
        });
        const existingIndex = panelAllowlist.findIndex((item) => item.id === savedEntry.id || item.email.trim().toLowerCase() === savedEntry.email.trim().toLowerCase());
        if (existingIndex >= 0) {
            panelAllowlist[existingIndex] = savedEntry;
        }
        else {
            panelAllowlist.unshift(savedEntry);
        }
        panelAllowlist = dedupePanelAllowlist(panelAllowlist);
        currentPanelAccess =
            panelAllowlist.find((entry) => entry.email === currentPanelAccess?.email) || currentPanelAccess;
        updateOwnerAccessVisibility();
        updateSupabaseAuthStatus();
        renderOwnerAccessList();
        fillOwnerAccessForm();
        setStatus("Acesso do painel salvo com sucesso. E-mail, senha e permissão já foram registrados.", "success");
    }
    catch (error) {
        console.error(error);
        setStatus(error instanceof Error
            ? error.message
            : "Não foi possível atualizar os e-mails permitidos do painel agora.", "danger");
    }
    finally {
        setPublishingState(false);
        setOwnerAccessBusy(false);
    }
});
supabaseAuthForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isPublishing) {
        return;
    }
    const email = supabaseEmailInput.value.trim().toLowerCase();
    const password = supabasePasswordInput.value;
    if (!email || !password) {
        setStatus("Informe o e-mail e a senha da conta administrativa do Supabase.", "warning");
        return;
    }
    try {
        setPublishingState(true);
        setStatus("Conectando a conta administrativa ao Supabase...", "info");
        await signInSupabaseAdmin(email, password, supabaseRememberSession.checked);
        currentPanelAccess = await ensureSupabasePanelAccess();
        panelAllowlist = isOwnerPanelUser() ? await fetchPanelAllowlist() : [];
        updateOwnerAccessVisibility();
        updateSupabaseAuthStatus();
        const localDraft = readDraftSiteContent();
        if (localDraft) {
            adminState = cloneContent(localDraft);
            renderAll();
        }
        setStatus("Conta do Supabase conectada. A partir de agora, avisos e links rápidos podem ser publicados direto no banco.", "success", isPublishedSnapshotInSync() ? "synced" : "local");
    }
    catch (error) {
        console.error(error);
        currentPanelAccess = null;
        panelAllowlist = [];
        updateOwnerAccessVisibility();
        setStatus(buildSupabasePublishErrorMessage(error, "a conexão editorial"), "danger");
    }
    finally {
        setPublishingState(false);
    }
});
clearSupabaseSessionButton?.addEventListener("click", () => {
    clearSupabaseAdminSession();
    currentPanelAccess = null;
    panelAllowlist = [];
    updateOwnerAccessVisibility();
    updateSupabaseAuthStatus();
    setStatus("Sessão administrativa do Supabase removida deste navegador.", "warning", "local");
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
        setStatus("Conexão com o GitHub validada. As próximas alterações poderão ser enviadas direto para o site.", "success", "synced");
    }
    catch (error) {
        console.error(error);
        setStatus("Não foi possível validar o token. Verifique se ele tem permissão de Contents: write neste repositório.", "danger");
    }
});
clearGitHubTokenButton?.addEventListener("click", () => {
    clearGitHubPublishToken();
    updateGitHubTokenStatus();
    refreshImageLibrary({ silent: true });
    setStatus("Token removido da sessão atual. O painel voltou para modo local.", "warning", "local");
});
usePublishedContentButton?.addEventListener("click", async () => {
    openConfirmModal("Isso vai descartar o rascunho salvo neste navegador e recarregar o conteúdo publicado atualmente no GitHub.", async () => {
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
        }
        catch (error) {
            console.error(error);
            setStatus("Não foi possível recarregar o conteúdo publicado agora.", "danger");
        }
    });
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.warn("Falha ao carregar conteúdo publicado.", error);
    }
    if (localDraft) {
        draftOrPublishedContent = localDraft;
    }
    else if (isSupabaseConfigured() && isSupabaseConnected()) {
        try {
            draftOrPublishedContent = await fetchSupabaseEditorSiteContent();
        }
        catch (error) {
            console.warn("Falha ao carregar conteúdo editorial do Supabase.", error);
        }
    }
    if (!draftOrPublishedContent) {
        try {
            draftOrPublishedContent = await loadEditorSiteContent();
        }
        catch (error) {
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
    updateSupabaseAuthStatus();
    updateGitHubTokenStatus();
    await refreshImageLibrary({ silent: true });
    if (!publishedContent) {
        setStatus("Painel carregado com conteúdo salvo neste computador, mas a versão publicada do site não pôde ser consultada agora.", "warning", "offline");
        return;
    }
    if (isPublishedSnapshotInSync()) {
        setStatus(`Painel carregado. O conteúdo abaixo já está igual ao que foi publicado no site em ${formatDateTime(publishedSnapshot.updatedAt)}.`, getGitHubPublishToken() ? "success" : "info", "synced");
        return;
    }
    setStatus(getGitHubPublishToken()
        ? `Existe um rascunho salvo neste computador diferente do site publicado. Última versão pública conhecida: ${formatDateTime(publishedSnapshot.updatedAt)}.`
        : "Existe um rascunho salvo só neste computador. Conecte o GitHub para publicar essa versão no site.", "warning", getGitHubPublishToken() ? "pending" : "local");
}
bootstrap();
