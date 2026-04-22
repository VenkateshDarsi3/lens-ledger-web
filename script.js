const STORAGE_KEY = "lens-ledger-dashboard";

const PACKAGE_DELIVERABLES = {
  Silver: ["Wedding Teaser", "Wedding Trailer", "Full-Length Videos"],
  Gold: ["Wedding Teaser", "Wedding Trailer", "Full-Length Videos", "Pre-Wedding Photoshoot"],
  Platinum: ["Wedding Teaser", "Exclusive Individual Event Trailers", "Highlight Reels", "Pre-Wedding Photoshoot"]
};

const DELIVERABLE_TYPES = [
  "Wedding Teaser",
  "Wedding Trailer",
  "Full-Length Videos",
  "Photos",
  "Exclusive Individual Event Trailers",
  "Highlight Reels",
  "Pre-Wedding Photoshoot",
  "Custom"
];

const DELIVERABLE_STATUSES = ["Pending", "In Progress", "Review", "Delivered"];
const LEAD_STATUSES = ["Enquiry", "Follow-up", "Confirmed", "Completed", "Closed"];
const EDITOR_STATUSES = ["Pending", "Editing", "Review", "Delivered", "Paid"];
const EDITOR_CURRENCIES = ["USD", "INR"];
const TEAM_PAYMENT_STATUSES = ["Pending", "Completed"];
const TEAM_DATA_SHARED_STATUSES = ["Not Shared", "Shared"];
const PER_EVENT_TEAM_MESSAGE = "Assigned per event";
const INACTIVITY_LIMIT_MS = 3 * 60 * 1000;
const INACTIVITY_EVENTS = ["click", "keydown", "mousemove", "touchstart", "scroll"];

const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

const leadForm = document.querySelector("#leadForm");
const weddingForm = document.querySelector("#weddingForm");
const shootShareForm = document.querySelector("#shootShareForm");
const editorForm = document.querySelector("#editorForm");
const eventTypeSelect = document.querySelector("#eventTypeSelect");
const customEventTypeField = document.querySelector("#customEventTypeField");
const leadStatusSelect = document.querySelector("#leadStatusSelect");
const leadTeamSection = document.querySelector("#leadTeamSection");

const leadSubmitButton = document.querySelector("#leadSubmitButton");
const weddingSubmitButton = document.querySelector("#weddingSubmitButton");
const shootShareSubmitButton = document.querySelector("#shootShareSubmitButton");
const editorSubmitButton = document.querySelector("#editorSubmitButton");
const leadCancelEditButton = document.querySelector("#leadCancelEdit");
const weddingCancelEditButton = document.querySelector("#weddingCancelEdit");
const shootShareCancelEditButton = document.querySelector("#shootShareCancelEdit");
const editorCancelEditButton = document.querySelector("#editorCancelEdit");

const addLeadTeamMemberButton = document.querySelector("#addLeadTeamMember");
const addWeddingEventButton = document.querySelector("#addWeddingEvent");
const addEditorDeliverableButton = document.querySelector("#addEditorDeliverable");
const loadPackageDeliverablesButton = document.querySelector("#loadPackageDeliverables");
const exportCalendarButton = document.querySelector("#exportCalendarButton");

const hasPreWeddingCheckbox = document.querySelector("#hasPreWedding");
const preWeddingDateField = document.querySelector("#preWeddingDateField");
const leadAvailabilityAlert = document.querySelector("#leadAvailabilityAlert");
const weddingAvailabilityAlert = document.querySelector("#weddingAvailabilityAlert");
const shootShareAvailabilityAlert = document.querySelector("#shootShareAvailabilityAlert");

const leadTeamList = document.querySelector("#leadTeamList");
const weddingEventList = document.querySelector("#weddingEventList");
const editorDeliverableList = document.querySelector("#editorDeliverableList");

const leadList = document.querySelector("#leadList");
const weddingPlansList = document.querySelector("#weddingPlansList");
const shootShareList = document.querySelector("#shootShareList");
const scheduleList = document.querySelector("#scheduleList");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarMonthLabel = document.querySelector("#calendarMonthLabel");
const editorList = document.querySelector("#editorList");
const bankAccountsList = document.querySelector("#bankAccountsList");

const pipelineEmptyState = document.querySelector("#pipelineEmptyState");
const weddingPlansEmptyState = document.querySelector("#weddingPlansEmptyState");
const shootShareEmptyState = document.querySelector("#shootShareEmptyState");
const scheduleEmptyState = document.querySelector("#scheduleEmptyState");
const editorEmptyState = document.querySelector("#editorEmptyState");

const statusFilter = document.querySelector("#statusFilter");
const calendarPrevButton = document.querySelector("#calendarPrevButton");
const calendarNextButton = document.querySelector("#calendarNextButton");
const overviewMonthInput = document.querySelector("#overviewMonthInput");
const addBankAccountButton = document.querySelector("#addBankAccountButton");
const globalSearchInput = document.querySelector("#globalSearchInput");
const globalSearchResults = document.querySelector("#globalSearchResults");
const globalSearchEmptyState = document.querySelector("#globalSearchEmptyState");

const leadCardTemplate = document.querySelector("#leadCardTemplate");
const scheduleCardTemplate = document.querySelector("#scheduleCardTemplate");
const weddingEventTemplate = document.querySelector("#weddingEventTemplate");
const teamMemberTemplate = document.querySelector("#teamMemberTemplate");
const bankAccountTemplate = document.querySelector("#bankAccountTemplate");
const editorDeliverableTemplate = document.querySelector("#editorDeliverableTemplate");

const totalEnquiries = document.querySelector("#totalEnquiries");
const totalConfirmed = document.querySelector("#totalConfirmed");
const totalRevenue = document.querySelector("#totalRevenue");
const totalProfit = document.querySelector("#totalProfit");
const editorDue = document.querySelector("#editorDue");
const teamDue = document.querySelector("#teamDue");
const totalBankBalance = document.querySelector("#totalBankBalance");
const monthlySpendTotal = document.querySelector("#monthlySpendTotal");
const monthlySpendBreakdown = document.querySelector("#monthlySpendBreakdown");
const teamDueBreakdown = document.querySelector("#teamDueBreakdown");
const overviewEnquiryReport = document.querySelector("#overviewEnquiryReport");
const overviewConfirmedReport = document.querySelector("#overviewConfirmedReport");
const overviewRevenueReport = document.querySelector("#overviewRevenueReport");
const overviewEditorDueReport = document.querySelector("#overviewEditorDueReport");
const overviewTeamDueReport = document.querySelector("#overviewTeamDueReport");
const overviewProfitReport = document.querySelector("#overviewProfitReport");
const overviewMonthCaption = document.querySelector("#overviewMonthCaption");
const balanceAfterSpend = document.querySelector("#balanceAfterSpend");
const brandHeroSlidesContainer = document.querySelector("#brandHeroSlides");
const publicShell = document.querySelector("#publicShell");
const appShell = document.querySelector("#appShell");
const authShell = document.querySelector("#authShell");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector("#authTitle");
const authSubtitle = document.querySelector("#authSubtitle");
const authMessage = document.querySelector("#authMessage");
const authModeToggle = document.querySelector("#authModeToggle");
const authSubmitButton = document.querySelector("#authSubmitButton");
const logoutButton = document.querySelector("#logoutButton");
const accountEmail = document.querySelector("#accountEmail");
const syncStatus = document.querySelector("#syncStatus");
const authCloseButton = document.querySelector("#authCloseButton");
const authBackdrop = document.querySelector("#authBackdrop");
const openAuthButtons = document.querySelectorAll(".open-auth-button");
const authEmailField = document.querySelector("#authEmailField");
const authPasswordField = document.querySelector("#authPasswordField");
const authConfirmField = document.querySelector("#authConfirmField");
const authEmailInput = authForm.elements.email;
const authPasswordInput = authForm.elements.password;
const authConfirmInput = authForm.elements.confirmPassword;
let brandHeroIntervalId = null;
let brandHeroSignature = "";
let authMode = "login";
let currentUser = null;
let saveTimerId = null;
let pendingSavePromise = Promise.resolve();
let inactivityTimerId = null;

const initialState = {
  leads: [],
  weddingPlans: [],
  shootShareJobs: [],
  editorJobs: [],
  bankAccounts: []
};

let state = createEmptyState();
let calendarCursor = startOfMonth(new Date());
let overviewMonthCursor = formatMonthValue(new Date());
const weddingTeamUiState = {
  openPlans: new Set(),
  openEvents: new Set()
};

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

leadForm.addEventListener("submit", handleLeadSubmit);
weddingForm.addEventListener("submit", handleWeddingSubmit);
shootShareForm.addEventListener("submit", handleShootShareSubmit);
editorForm.addEventListener("submit", handleEditorSubmit);
authForm.addEventListener("submit", handleAuthSubmit);
authModeToggle.addEventListener("click", toggleAuthMode);
logoutButton.addEventListener("click", handleLogout);
authCloseButton.addEventListener("click", hideAuthShell);
authBackdrop.addEventListener("click", hideAuthShell);
openAuthButtons.forEach((button) => button.addEventListener("click", () => {
  clearAuthMessage();
  clearResetTokenFromUrl();
  authMode = "login";
  syncAuthMode();
  showAuthShell();
}));

statusFilter?.addEventListener("change", renderLeads);
hasPreWeddingCheckbox.addEventListener("change", syncPreWeddingField);
eventTypeSelect.addEventListener("change", syncCustomEventField);
leadStatusSelect?.addEventListener("change", syncLeadTeamSection);
exportCalendarButton.addEventListener("click", exportCalendar);
addLeadTeamMemberButton.addEventListener("click", () => addTeamMemberRow(leadTeamList));
addWeddingEventButton.addEventListener("click", () => addWeddingEventRow());
addEditorDeliverableButton.addEventListener("click", () => addEditorDeliverableRow());
loadPackageDeliverablesButton.addEventListener("click", () => {
  const packageName = editorForm.elements.editorPackage.value;
  loadPackageDeliverables(packageName, true);
});
addBankAccountButton?.addEventListener("click", () => {
  state.bankAccounts.push(createBankAccount());
  renderOverviewBankAccounts();
  renderStats();
  saveState();
});
globalSearchInput?.addEventListener("input", renderGlobalSearch);
overviewMonthInput?.addEventListener("change", (event) => {
  overviewMonthCursor = event.target.value || formatMonthValue(new Date());
  renderMonthlySpend();
});
leadCancelEditButton.addEventListener("click", resetLeadForm);
weddingCancelEditButton.addEventListener("click", resetWeddingForm);
shootShareCancelEditButton.addEventListener("click", resetShootShareForm);
editorCancelEditButton.addEventListener("click", resetEditorForm);
calendarPrevButton.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() - 1, 1);
  renderCalendarView();
});
calendarNextButton.addEventListener("click", () => {
  calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + 1, 1);
  renderCalendarView();
});

leadForm.elements.eventDate.addEventListener("input", syncLeadAvailability);
leadForm.elements.eventTime.addEventListener("input", syncLeadAvailability);
leadForm.elements.amount.addEventListener("input", syncLeadPaymentFields);
leadForm.elements.advanceGiven.addEventListener("input", syncLeadPaymentFields);
weddingForm.elements.weddingDate.addEventListener("input", () => {
  syncWeddingPaymentFields();
  syncWeddingAvailability();
});
weddingForm.elements.pricePerHour.addEventListener("input", syncWeddingPaymentFields);
weddingForm.elements.expectedHours.addEventListener("input", syncWeddingPaymentFields);
weddingForm.elements.advanceGiven.addEventListener("input", syncWeddingPaymentFields);
shootShareForm.elements.date.addEventListener("input", syncShootShareAvailability);
shootShareForm.elements.time.addEventListener("input", syncShootShareAvailability);
shootShareForm.elements.ratePerHour.addEventListener("input", syncShootSharePaymentFields);
shootShareForm.elements.totalHours.addEventListener("input", syncShootSharePaymentFields);
shootShareForm.elements.paymentReceived.addEventListener("input", syncShootSharePaymentFields);
editorForm.elements.amountDue.addEventListener("input", syncEditorPaymentFields);
editorForm.elements.advancePaid.addEventListener("input", syncEditorPaymentFields);

INACTIVITY_EVENTS.forEach((eventName) => {
  window.addEventListener(eventName, resetInactivityTimer, { passive: true });
});

renderCalendarWeekdays();
initializeBrandHeroSlideshow();
setActiveTab(getRequestedTab());
initializeForms();
renderAll();
syncAuthMode();
initializeApp();

function createEmptyState() {
  return {
    leads: [],
    weddingPlans: [],
    shootShareJobs: [],
    editorJobs: [],
    bankAccounts: []
  };
}

function normalizeAppState(rawState) {
  const safeState = rawState || createEmptyState();
  return {
    leads: (safeState.leads || []).map(normalizeLead),
    weddingPlans: (safeState.weddingPlans || []).map(normalizeWeddingPlan),
    shootShareJobs: (safeState.shootShareJobs || []).map(normalizeShootShareJob),
    editorJobs: (safeState.editorJobs || []).map(normalizeEditorJob),
    bankAccounts: (safeState.bankAccounts || []).map(normalizeBankAccount)
  };
}

function renderCalendarWeekdays() {
  const container = document.querySelector("#calendarWeekdays");
  if (!container) return;
  container.innerHTML = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    .map((day) => `<div>${day}</div>`)
    .join("");
}

function initializeBrandHeroSlideshow() {
  const fallbackSlides = [
    "assets/feature-couple.jpg",
    "assets/hero-wedding.jpg",
    "assets/feature-color.jpg",
    "assets/wall-paper.jpg"
  ];

  const startSlideshow = (slides) => {
    if (!brandHeroSlidesContainer || !slides.length) return;
    const signature = JSON.stringify(slides);
    if (signature === brandHeroSignature) return;

    brandHeroSignature = signature;
    brandHeroSlidesContainer.innerHTML = slides.map((slide, index) => (
      `<div class="brand-hero-slide${index === 0 ? " is-active" : ""}">
        <div class="brand-hero-slide-backdrop" style="background-image: url('${encodeURI(slide.url || slide)}'); background-position: ${escapeHtml(slide.position || "center center")};"></div>
        <img class="brand-hero-slide-image" src="${encodeURI(slide.url || slide)}" alt="" loading="eager" />
      </div>`
    )).join("");

    const brandHeroSlides = brandHeroSlidesContainer.querySelectorAll(".brand-hero-slide");
    if (brandHeroIntervalId) {
      window.clearInterval(brandHeroIntervalId);
      brandHeroIntervalId = null;
    }
    if (brandHeroSlides.length < 2) return;

    let activeIndex = 0;
    brandHeroIntervalId = window.setInterval(() => {
      brandHeroSlides[activeIndex].classList.remove("is-active");
      activeIndex = (activeIndex + 1) % brandHeroSlides.length;
      brandHeroSlides[activeIndex].classList.add("is-active");
    }, 3200);
  };

  const loadSlides = () => {
    fetch("/api/slides", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("slides unavailable")))
      .then((payload) => Array.isArray(payload.slides) && payload.slides.length ? payload.slides : fallbackSlides.map((url) => ({ url })))
      .then(startSlideshow)
      .catch(() => startSlideshow(fallbackSlides.map((url) => ({ url }))));
  };

  loadSlides();
  window.setInterval(loadSlides, 15000);
}

function saveState() {
  if (!currentUser) return;
  queueStateSave();
}

function queueStateSave() {
  if (saveTimerId) {
    window.clearTimeout(saveTimerId);
  }

  setSyncStatus("Saving…");
  saveTimerId = window.setTimeout(() => {
    saveTimerId = null;
    pendingSavePromise = persistState();
  }, 300);
}

async function persistState() {
  try {
    await apiRequest("/api/state", {
      method: "PUT",
      body: JSON.stringify({ state })
    });
    setSyncStatus("Saved");
  } catch (error) {
    console.error(error);
    setSyncStatus("Save failed");
    showAuthMessage("Your session expired. Please sign in again.");
    authMode = "login";
    syncAuthMode();
    currentUser = null;
    accountEmail.textContent = "Not signed in";
    showPublicLanding();
    showAuthShell();
  }
}

function initializeForms() {
  resetLeadForm();
  resetWeddingForm();
  resetShootShareForm();
  resetEditorForm();
  if (overviewMonthInput) {
    overviewMonthInput.value = overviewMonthCursor;
  }
  syncCustomEventField();
  syncLeadTeamSection();
  syncLeadPaymentFields();
  syncLeadAvailability();
  syncWeddingAvailability();
  syncShootShareAvailability();
}

function renderAll() {
  renderLeads();
  renderWeddingPlans();
  renderShootShareJobs();
  renderSchedule();
  renderCalendarView();
  renderEditorJobs();
  renderOverviewBankAccounts();
  renderStats();
  renderGlobalSearch();
}

async function initializeApp() {
  setSyncStatus("Connecting…");

  try {
    const session = await apiRequest("/api/auth/session");
    currentUser = session.user;
    accountEmail.textContent = currentUser.email;
    showAppShell();
    await loadRemoteState();
  } catch {
    showPublicLanding();
    setSyncStatus("Sign in required");
    await initializeResetFlow();
  }
}

function showAppShell() {
  appShell.classList.remove("hidden");
  publicShell.classList.add("hidden");
  hideAuthShell();
  resetInactivityTimer();
}

function showAuthShell() {
  authShell.classList.remove("hidden");
}

function hideAuthShell() {
  authShell.classList.add("hidden");
}

function showPublicLanding() {
  publicShell.classList.remove("hidden");
  appShell.classList.add("hidden");
  hideAuthShell();
  clearInactivityTimer();
}

function showAuthMessage(message) {
  authMessage.textContent = message;
  authMessage.classList.remove("hidden");
}

function clearAuthMessage() {
  authMessage.textContent = "";
  authMessage.classList.add("hidden");
}

function resetInactivityTimer() {
  if (!currentUser) return;
  clearInactivityTimer();
  inactivityTimerId = window.setTimeout(handleInactivityLogout, INACTIVITY_LIMIT_MS);
}

function clearInactivityTimer() {
  if (!inactivityTimerId) return;
  window.clearTimeout(inactivityTimerId);
  inactivityTimerId = null;
}

async function handleInactivityLogout() {
  if (!currentUser) return;
  await handleLogout();
  authMode = "login";
  syncAuthMode();
  showAuthMessage("You were logged out after 3 minutes of inactivity.");
  showAuthShell();
}

function getResetTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("reset") || "";
}

function clearResetTokenFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("reset")) return;
  url.searchParams.delete("reset");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

function setAuthFieldState(field, visible, options = {}) {
  field.classList.toggle("hidden", !visible);
  const input = field.querySelector("input");
  if (!input) return;

  input.required = Boolean(options.required);
  if (options.autocomplete) {
    input.autocomplete = options.autocomplete;
  }
  if (options.placeholder !== undefined) {
    input.placeholder = options.placeholder;
  }
}

function syncAuthMode() {
  const isSignup = authMode === "signup";
  const isReset = authMode === "reset";

  if (isSignup) {
    authTitle.textContent = "Create your dashboard account";
    authSubtitle.textContent = "Use one account for your bookings, weddings, editor tracking, and calendar from anywhere.";
    authSubmitButton.textContent = "Create Account";
    authModeToggle.textContent = "Already have an account? Sign in";
  } else if (isReset) {
    authTitle.textContent = "Create a new password";
    authSubtitle.textContent = "Set a new password for your dashboard account.";
    authSubmitButton.textContent = "Reset Password";
    authModeToggle.textContent = "Back to sign in";
  } else {
    authTitle.textContent = "Sign in to your dashboard";
    authSubtitle.textContent = "Access your photography workflow from anywhere once this app is running on the web.";
    authSubmitButton.textContent = "Sign In";
    authModeToggle.textContent = "Need an account? Create one";
  }

  setAuthFieldState(authEmailField, !isReset, {
    required: !isReset,
    autocomplete: "email"
  });
  setAuthFieldState(authPasswordField, true, {
    required: true,
    autocomplete: isSignup || isReset ? "new-password" : "current-password"
  });
  setAuthFieldState(authConfirmField, isSignup || isReset, {
    required: isSignup || isReset,
    autocomplete: "new-password"
  });
}

function toggleAuthMode() {
  if (authMode === "login") {
    authMode = "signup";
  } else {
    authMode = "login";
    clearResetTokenFromUrl();
  }
  clearAuthMessage();
  syncAuthMode();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthMessage();
  const formData = new FormData(authForm);
  authSubmitButton.disabled = true;
  authSubmitButton.textContent = authMode === "signup"
    ? "Creating…"
    : authMode === "reset"
        ? "Resetting…"
        : "Signing In…";

  try {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if ((authMode === "signup" || authMode === "reset") && password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    if (authMode === "reset") {
      const token = getResetTokenFromUrl();
      if (!token) {
        throw new Error("That reset link is missing or expired.");
      }
      const payload = await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password })
      });
      clearResetTokenFromUrl();
      authMode = "login";
      authForm.reset();
      syncAuthMode();
      showAuthMessage(payload.message || "Your password has been updated. Please sign in.");
      return;
    }

    const payload = await apiRequest(`/api/auth/${authMode}`, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    currentUser = payload.user;
    accountEmail.textContent = currentUser.email;
    authForm.reset();
    clearResetTokenFromUrl();
    showAppShell();
    resetInactivityTimer();
    setSyncStatus("Connected");
    await loadRemoteState();
  } catch (error) {
    showAuthMessage(error.message || "Could not sign in.");
  } finally {
    authSubmitButton.disabled = false;
    syncAuthMode();
  }
}

async function handleLogout() {
  try {
    if (saveTimerId) {
      window.clearTimeout(saveTimerId);
      saveTimerId = null;
      pendingSavePromise = persistState();
    }
    await pendingSavePromise;
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.error(error);
  } finally {
    clearInactivityTimer();
    currentUser = null;
    accountEmail.textContent = "Not signed in";
    state = createEmptyState();
    renderAll();
    showPublicLanding();
    clearAuthMessage();
    setSyncStatus("Signed out");
  }
}

async function initializeResetFlow() {
  const token = getResetTokenFromUrl();
  if (!token) return;

  authMode = "reset";
  syncAuthMode();
  showAuthShell();

  try {
    const payload = await apiRequest(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);
    showAuthMessage(`Reset your password for ${payload.email}.`);
  } catch (error) {
    clearResetTokenFromUrl();
    authMode = "login";
    syncAuthMode();
    showAuthMessage(error.message || "That reset link is invalid or has expired.");
  }
}

async function loadRemoteState() {
  const payload = await apiRequest("/api/state");
  state = normalizeAppState(payload.state);
  renderAll();
  setSyncStatus("Saved");
}

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body,
    credentials: "same-origin",
    cache: "no-store"
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  return payload;
}

function setSyncStatus(message) {
  syncStatus.textContent = message;
}

function setActiveTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tabName);
  });

  window.location.hash = tabName;
}

function getRequestedTab() {
  const requested = window.location.hash.replace("#", "");
  const validTabs = new Set(["overview", "pipeline", "weddings", "shoot-share", "schedule", "calendar", "editor"]);
  return validTabs.has(requested) ? requested : "pipeline";
}

function handleLeadSubmit(event) {
  event.preventDefault();
  const formData = new FormData(leadForm);
  const id = formData.get("leadId") || crypto.randomUUID();
  const entry = {
    id,
    clientName: formData.get("clientName").trim(),
    contact: formData.get("contact").trim(),
    eventType: formData.get("eventType") === "Other"
      ? formData.get("customEventType").trim()
      : formData.get("eventType"),
    serviceType: formData.get("serviceType") || "Photography",
    eventDate: formData.get("eventDate"),
    eventTime: formData.get("eventTime"),
    location: formData.get("location").trim(),
    pricePerHour: Number(formData.get("pricePerHour")) || 0,
    amount: Number(formData.get("amount")) || 0,
    advanceGiven: Number(formData.get("advanceGiven")) || 0,
    pendingAmount: Number(formData.get("pendingAmount")) || 0,
    deliverables: formData.get("deliverables").trim(),
    teamAssignments: readTeamRows(leadTeamList),
    status: formData.get("status") || "Confirmed",
    notes: formData.get("notes").trim(),
    source: "manual"
  };

  upsertById(state.leads, entry);
  saveState();
  resetLeadForm();
  renderAll();
  setActiveTab("pipeline");
}

function handleWeddingSubmit(event) {
  event.preventDefault();
  const formData = new FormData(weddingForm);
  const events = readWeddingEventRows();
  if (!events.length) {
    addWeddingEventRow();
    return;
  }

  const id = formData.get("weddingId") || crypto.randomUUID();
  const existingPlan = state.weddingPlans.find((plan) => plan.id === id);
  const weddingPlan = {
    id,
    clientName: formData.get("clientName").trim(),
    phone: formData.get("phone").trim(),
    weddingDate: formData.get("weddingDate"),
    location: formData.get("location").trim(),
    packageType: formData.get("packageType"),
    deliverables: formData.get("deliverables").trim(),
    pricePerHour: Number(formData.get("pricePerHour")) || 0,
    expectedHours: Number(formData.get("expectedHours")) || 0,
    totalHours: existingPlan ? Number(existingPlan.totalHours) || 0 : 0,
    expectedCrowd: Number(formData.get("expectedCrowd")) || 0,
    liveLink: formData.get("liveLink").trim(),
    advanceGiven: Number(formData.get("advanceGiven")) || 0,
    advanceDate: existingPlan?.advanceDate || "",
    secondPayment: 0,
    secondPaymentDate: "",
    finalPayment: 0,
    finalPaymentDate: "",
    pendingAmount: Number(formData.get("pendingAmount")) || 0,
    isFullyPaid: Number(formData.get("pendingAmount")) <= 0,
    hasPreWedding: hasPreWeddingCheckbox.checked,
    preWeddingDate: hasPreWeddingCheckbox.checked ? formData.get("preWeddingDate") : "",
    reviewNotes: formData.get("reviewNotes").trim(),
    teamAssignments: collectWeddingPlanTeamAssignments({ events }),
    events
  };

  upsertById(state.weddingPlans, weddingPlan);

  const linkedLead = {
    id,
    clientName: weddingPlan.clientName,
    contact: weddingPlan.phone,
    eventType: "Wedding",
    eventDate: weddingPlan.weddingDate,
    eventTime: "",
    location: weddingPlan.location,
    amount: getWeddingCurrentAmount(weddingPlan),
    deliverables: weddingPlan.deliverables,
    teamAssignments: [],
    status: "Confirmed",
    notes: `Package ${weddingPlan.packageType}. Expected hours ${weddingPlan.expectedHours}. ${weddingPlan.reviewNotes || "Wedding plan saved."}`,
    source: "wedding-plan"
  };

  upsertById(state.leads, linkedLead);
  saveState();
  resetWeddingForm();
  renderAll();
  setActiveTab("weddings");
}

function handleEditorSubmit(event) {
  event.preventDefault();
  const formData = new FormData(editorForm);
  const id = formData.get("editorJobId") || crypto.randomUUID();
  const entry = {
    id,
    projectName: formData.get("projectName").trim(),
    editorName: formData.get("editorName").trim(),
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
    amountDue: Number(formData.get("amountDue")) || 0,
    advancePaid: Number(formData.get("advancePaid")) || 0,
    pendingAmount: Number(formData.get("pendingAmount")) || 0,
    currency: EDITOR_CURRENCIES.includes(formData.get("editorCurrency")) ? formData.get("editorCurrency") : "USD",
    editorPackage: formData.get("editorPackage"),
    deliverables: readEditorDeliverables()
  };

  upsertById(state.editorJobs, entry);
  saveState();
  resetEditorForm();
  renderAll();
  setActiveTab("editor");
}

function handleShootShareSubmit(event) {
  event.preventDefault();
  const formData = new FormData(shootShareForm);
  const entry = {
    id: formData.get("shootShareId") || crypto.randomUUID(),
    date: formData.get("date"),
    time: formData.get("time"),
    ratePerHour: Number(formData.get("ratePerHour")) || 0,
    totalHours: Number(formData.get("totalHours")) || 0,
    totalAmount: Number(formData.get("totalAmount")) || 0,
    paymentReceived: Number(formData.get("paymentReceived")) || 0,
    pendingPayment: Number(formData.get("pendingPayment")) || 0,
    location: formData.get("location").trim(),
    forPhotographer: formData.get("forPhotographer").trim()
  };

  upsertById(state.shootShareJobs, entry);
  saveState();
  resetShootShareForm();
  renderAll();
  setActiveTab("shoot-share");
}

function renderLeads() {
  const selectedStatus = statusFilter?.value || "All";
  const searchTerm = "";
  const items = (selectedStatus === "All"
    ? state.leads
    : state.leads.filter((lead) => lead.status === selectedStatus))
    .filter((lead) => isNonWeddingLead(lead))
    .filter((lead) => matchesLeadSearch(lead, searchTerm))
    .slice()
    .sort(compareLeadDates);

  leadList.innerHTML = "";
  pipelineEmptyState.classList.toggle("hidden", items.length > 0);

  items.forEach((lead) => {
    const fragment = leadCardTemplate.content.cloneNode(true);
    const badge = fragment.querySelector(".badge");
    const title = fragment.querySelector(".client-title");
    const meta = fragment.querySelector(".lead-meta");
    const notes = fragment.querySelector(".lead-notes");
    const statusSelect = fragment.querySelector(".status-select");
    const leadActions = fragment.querySelector(".lead-actions");
    const editButton = fragment.querySelector(".edit-button");
    const deleteButton = fragment.querySelector(".delete-button");

    badge.textContent = lead.eventType || "Event";
    badge.classList.add("status-confirmed");
    title.textContent = lead.clientName;
    notes.textContent = lead.notes || "No notes added yet.";
    leadActions.classList.add("hidden");

    meta.innerHTML = [
      createMetaItem("Source", lead.source === "manual" ? "Manual" : "Wedding Planner"),
      createMetaItem("Contact", lead.contact || "Not added"),
      createMetaItem("Event", lead.eventType || "Not added"),
      createMetaItem("Service", lead.serviceType || "Not added"),
      createMetaItem("Date", joinDateTime(lead.eventDate, lead.eventTime)),
      createMetaItem("Location", lead.location || "Not added"),
      createMetaItem("Rate / Hour", lead.pricePerHour ? formatCurrency(lead.pricePerHour) : "Not added"),
      createMetaItem("Amount", formatCurrency(lead.amount)),
      createMetaItem("Advance", formatCurrency(lead.advanceGiven)),
      createMetaItem("Pending", formatCurrency(lead.pendingAmount)),
      createMetaItem("Deliverables", lead.deliverables || "Not added"),
      createMetaItem(
        "Team",
        lead.source === "wedding-plan"
          ? PER_EVENT_TEAM_MESSAGE
          : formatTeamAssignments(lead.teamAssignments)
      )
    ].join("");

    editButton.addEventListener("click", () => populateLeadForm(lead));
    deleteButton.addEventListener("click", () => deleteLead(lead.id));

    leadList.appendChild(fragment);
  });
}

function renderWeddingPlans() {
  const items = state.weddingPlans.slice().sort((left, right) => new Date(left.weddingDate) - new Date(right.weddingDate));
  weddingPlansList.innerHTML = "";
  weddingPlansEmptyState.classList.toggle("hidden", items.length > 0);

  items.forEach((plan) => {
    const fragment = leadCardTemplate.content.cloneNode(true);
    const badge = fragment.querySelector(".badge");
    const title = fragment.querySelector(".client-title");
    const meta = fragment.querySelector(".lead-meta");
    const notes = fragment.querySelector(".lead-notes");
    const statusSelect = fragment.querySelector(".status-select");
    const editButton = fragment.querySelector(".edit-button");
    const deleteButton = fragment.querySelector(".delete-button");

    badge.textContent = plan.packageType;
    badge.classList.add("status-confirmed");
    title.textContent = `${plan.clientName} Wedding`;
    notes.innerHTML = renderWeddingNotes(plan);
    statusSelect.innerHTML = "<option>Saved</option>";
    statusSelect.disabled = true;

    meta.innerHTML = [
      createMetaItem("Wedding Date", formatDate(plan.weddingDate)),
      createMetaItem("Package", plan.packageType),
      createMetaItem("Expected Hours", String(plan.expectedHours || 0)),
      createMetaItem("Expected Total", formatCurrency(getWeddingExpectedAmount(plan))),
      createMetaItem("Actual Hours", String(plan.totalHours || 0)),
      createMetaItem("Actual Total", formatCurrency(getWeddingActualAmount(plan))),
      createMetaItem("Pre-Wedding", plan.hasPreWedding ? formatDate(plan.preWeddingDate) : "No"),
      createMetaItem("Advance", formatCurrency(plan.advanceGiven)),
      createMetaItem("Pending", formatCurrency(plan.pendingAmount)),
      createMetaItem("Payment", getWeddingPaymentStatus(plan)),
      createMetaItem("Team", PER_EVENT_TEAM_MESSAGE)
    ].join("");

    notes.querySelector('[data-role="wedding-payment-toggle"]')?.addEventListener("change", (toggleEvent) => {
      updateWeddingPaymentStatus(plan.id, toggleEvent.target.checked);
    });
    notes.querySelector('[data-role="team-summary-panel"]')?.addEventListener("toggle", (teamPanelEvent) => {
      if (teamPanelEvent.target.open) {
        weddingTeamUiState.openPlans.add(plan.id);
      } else {
        weddingTeamUiState.openPlans.delete(plan.id);
      }
    });
    notes.querySelectorAll('[data-role="event-team-panel"]').forEach((panel) => {
      panel.addEventListener("toggle", (eventPanel) => {
        const eventKey = eventPanel.target.dataset.eventKey;
        if (!eventKey) return;
        if (eventPanel.target.open) {
          weddingTeamUiState.openEvents.add(eventKey);
        } else {
          weddingTeamUiState.openEvents.delete(eventKey);
        }
      });
    });
    notes.querySelector('[data-role="wedding-actual-hours"]')?.addEventListener("change", (hoursEvent) => {
      updateWeddingActualHours(plan.id, Number(hoursEvent.target.value) || 0);
    });
    notes.querySelectorAll('[data-role="event-team-hours"]').forEach((input) => {
      input.addEventListener("change", (teamEvent) => {
        updateWeddingEventTeamAssignment(plan.id, teamEvent.target.dataset.eventId, teamEvent.target.dataset.memberId, {
          hours: parseOptionalNumber(teamEvent.target.value)
        });
      });
    });
    notes.querySelectorAll('[data-role="event-team-payment-status"]').forEach((select) => {
      select.addEventListener("change", (teamEvent) => {
        updateWeddingEventTeamAssignment(plan.id, teamEvent.target.dataset.eventId, teamEvent.target.dataset.memberId, {
          paymentStatus: teamEvent.target.value
        });
      });
    });
    notes.querySelectorAll('[data-role="event-team-data-shared"]').forEach((select) => {
      select.addEventListener("change", (teamEvent) => {
        updateWeddingEventTeamAssignment(plan.id, teamEvent.target.dataset.eventId, teamEvent.target.dataset.memberId, {
          dataSharedStatus: teamEvent.target.value
        });
      });
    });
    editButton.addEventListener("click", () => populateWeddingForm(plan));
    deleteButton.addEventListener("click", () => deleteWeddingPlan(plan.id));

    weddingPlansList.appendChild(fragment);
  });
}

function renderShootShareJobs() {
  const items = state.shootShareJobs.slice().sort((left, right) => new Date(left.date) - new Date(right.date));
  shootShareList.innerHTML = "";
  shootShareEmptyState.classList.toggle("hidden", items.length > 0);

  items.forEach((job) => {
    const fragment = leadCardTemplate.content.cloneNode(true);
    const badge = fragment.querySelector(".badge");
    const title = fragment.querySelector(".client-title");
    const meta = fragment.querySelector(".lead-meta");
    const notes = fragment.querySelector(".lead-notes");
    const statusSelect = fragment.querySelector(".status-select");
    const editButton = fragment.querySelector(".edit-button");
    const deleteButton = fragment.querySelector(".delete-button");

    badge.textContent = "Shoot & Share";
    badge.classList.add("status-follow-up");
    title.textContent = job.forPhotographer;
    notes.textContent = "Hired by another photographer / studio.";
    statusSelect.innerHTML = "<option>Saved</option>";
    statusSelect.disabled = true;

    meta.innerHTML = [
      createMetaItem("Date", joinDateTime(job.date, job.time)),
      createMetaItem("Rate / Hour", formatCurrency(job.ratePerHour)),
      createMetaItem("Hours", String(job.totalHours || 0)),
      createMetaItem("Total", formatCurrency(job.totalAmount)),
      createMetaItem("Received", formatCurrency(job.paymentReceived)),
      createMetaItem("Pending", formatCurrency(job.pendingPayment)),
      createMetaItem("Location", job.location || "Not added"),
      createMetaItem("For", job.forPhotographer || "Not added")
    ].join("");

    editButton.addEventListener("click", () => populateShootShareForm(job));
    deleteButton.addEventListener("click", () => deleteShootShareJob(job.id));

    shootShareList.appendChild(fragment);
  });
}

function renderSchedule() {
  const items = buildScheduleItems();
  const groupedItems = groupScheduleItems(items);
  scheduleList.innerHTML = "";
  scheduleEmptyState.classList.toggle("hidden", groupedItems.length > 0);

  groupedItems.forEach((item) => {
    const fragment = scheduleCardTemplate.content.cloneNode(true);
    fragment.querySelector(".schedule-badge").textContent = item.type;
    fragment.querySelector(".schedule-badge").classList.add(getBadgeClass(item.badgeStatus));
    fragment.querySelector(".schedule-title").textContent = item.title;
    fragment.querySelector(".schedule-date").textContent = item.dateLabel;
    fragment.querySelector(".schedule-grid").innerHTML = item.meta.map((entry) => createMetaItem(entry.label, entry.value)).join("");
    fragment.querySelector(".schedule-notes").innerHTML = item.notes;
    scheduleList.appendChild(fragment);
  });
}

function renderCalendarView() {
  const items = buildCalendarDayMap();
  const firstDay = startOfMonth(calendarCursor);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(firstDay);
  calendarMonthLabel.textContent = monthLabel;
  calendarGrid.innerHTML = "";

  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  for (let index = 0; index < firstWeekday; index += 1) {
    const spacer = document.createElement("div");
    spacer.className = "calendar-day calendar-day-empty";
    calendarGrid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), day);
    const dateKey = toDateKey(date);
    const dayItems = items.get(dateKey) || [];
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (dayItems.length) cell.classList.add("calendar-day-blocked");
    if (dateKey === todayKey) cell.classList.add("calendar-day-today");

    const number = document.createElement("div");
    number.className = "calendar-day-number";
    number.textContent = String(day);
    cell.appendChild(number);

    if (dayItems.length) {
      const count = document.createElement("div");
      count.className = "calendar-day-count";
      count.textContent = `${dayItems.length} event${dayItems.length > 1 ? "s" : ""}`;
      cell.appendChild(count);

      const preview = document.createElement("div");
      preview.className = "calendar-day-preview";
      preview.textContent = dayItems[0].title;
      cell.appendChild(preview);

      const tooltip = document.createElement("div");
      tooltip.className = "calendar-tooltip";
      tooltip.innerHTML = dayItems.map((item) => `<div>${escapeHtml(item.title)}</div>`).join("");
      cell.appendChild(tooltip);
      cell.title = dayItems.map((item) => item.title).join("\n");
    }

    calendarGrid.appendChild(cell);
  }
}

function renderEditorJobs() {
  const items = state.editorJobs.slice().sort((left, right) => new Date(left.dueDate || "2999-12-31") - new Date(right.dueDate || "2999-12-31"));
  editorList.innerHTML = "";
  editorEmptyState.classList.toggle("hidden", items.length > 0);

  items.forEach((job) => {
    const fragment = leadCardTemplate.content.cloneNode(true);
    const badge = fragment.querySelector(".badge");
    const title = fragment.querySelector(".client-title");
    const meta = fragment.querySelector(".lead-meta");
    const notes = fragment.querySelector(".lead-notes");
    const statusSelect = fragment.querySelector(".status-select");
    const editButton = fragment.querySelector(".edit-button");
    const deleteButton = fragment.querySelector(".delete-button");

    badge.textContent = job.status;
    badge.classList.add(getBadgeClass(job.status));
    title.textContent = job.projectName;
    notes.innerHTML = renderEditorDeliverableStatuses(job);
    statusSelect.innerHTML = buildOptions(EDITOR_STATUSES, job.status);

    meta.innerHTML = [
      createMetaItem("Editor", job.editorName),
      createMetaItem("Due", formatDate(job.dueDate)),
      createMetaItem("Total Amount", formatMoney(job.amountDue, job.currency)),
      createMetaItem("Advance Paid", formatMoney(job.advancePaid, job.currency)),
      createMetaItem("Pending Amount", formatMoney(job.pendingAmount, job.currency)),
      createMetaItem("Currency", job.currency || "USD"),
      createMetaItem("Package", job.editorPackage || "Custom"),
      createMetaItem("Pending", String(countPendingDeliverables(job.deliverables)))
    ].join("");

    notes.querySelectorAll('[data-role="deliverable-status"]').forEach((select) => {
      select.addEventListener("change", (statusEvent) => {
        updateEditorDeliverableStatus(job.id, statusEvent.target.dataset.id, statusEvent.target.value);
      });
    });

    statusSelect.addEventListener("change", (statusEvent) => {
      updateEditorStatus(job.id, statusEvent.target.value);
    });
    editButton.addEventListener("click", () => populateEditorForm(job));
    deleteButton.addEventListener("click", () => deleteEditorJob(job.id));

    editorList.appendChild(fragment);
  });
}

function renderStats() {
  const confirmedStatuses = new Set(["Confirmed", "Completed"]);
  const isBookedLead = (lead) => lead.source === "manual" || confirmedStatuses.has(lead.status);
  const leadRevenue = state.leads.reduce((sum, lead) => isBookedLead(lead) ? sum + Number(lead.amount || 0) : sum, 0);
  const shootShareRevenue = state.shootShareJobs.reduce((sum, job) => sum + Number(job.totalAmount || 0), 0);
  const revenue = leadRevenue + shootShareRevenue;
  const editorCostByCurrency = getCurrencyBuckets(state.editorJobs, (job) => Number(job.amountDue || 0));
  const totalUsdEditorCost = Number(editorCostByCurrency.USD || 0);
  const hasNonUsdEditorAmounts = Object.entries(editorCostByCurrency).some(([currency, amount]) => currency !== "USD" && Number(amount) > 0);
  const unpaidEditorJobs = state.editorJobs.filter((job) => job.status !== "Paid" && getEditorPendingAmount(job) > 0);
  const unpaidEditorCostByCurrency = getCurrencyBuckets(unpaidEditorJobs, getEditorPendingAmount);
  const totalTeamCost = state.leads.reduce((sum, lead) => (
    isBookedLead(lead)
      ? sum + getLeadTeamCost(lead)
      : sum
  ), 0);
  const profit = revenue - totalUsdEditorCost - totalTeamCost;

  totalEnquiries.textContent = state.leads.length;
  totalConfirmed.textContent = state.leads.filter(isBookedLead).length;
  totalRevenue.textContent = formatCurrency(revenue);
  totalProfit.textContent = formatCurrency(profit);
  editorDue.textContent = formatMoneyBreakdown(unpaidEditorCostByCurrency);
  teamDue.textContent = formatCurrency(state.leads.reduce((sum, lead) => (
    isBookedLead(lead)
      ? sum + getLeadTeamDue(lead)
      : sum
  ), 0));
  totalBankBalance.textContent = formatCurrency(state.bankAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0));
  renderOverviewDetails({
    isBookedLead,
    leadRevenue,
    shootShareRevenue,
    revenue,
    totalUsdEditorCost,
    editorCostByCurrency,
    totalTeamCost,
    profit,
    hasNonUsdEditorAmounts,
    unpaidEditorJobs
  });
  renderMonthlySpend();
  renderTeamDueBreakdown();
}

function renderOverviewDetails(stats) {
  if (!overviewEnquiryReport) return;

  const bookedLeads = state.leads.filter(stats.isBookedLead);
  const revenueRows = [
    ...bookedLeads.map((lead) => ({
      title: `${lead.clientName || "Client"} - ${lead.eventType || "Event"}`,
      meta: [formatDate(lead.eventDate), lead.source === "wedding-plan" ? "Wedding" : lead.serviceType || "Event"]
        .filter(Boolean)
        .join(" | "),
      amount: formatCurrency(lead.amount)
    })),
    ...state.shootShareJobs.map((job) => ({
      title: job.forPhotographer || "Shoot & Share",
      meta: [formatDate(job.date), job.location || "No location"].filter(Boolean).join(" | "),
      amount: formatCurrency(job.totalAmount)
    }))
  ];

  const editorRows = stats.unpaidEditorJobs.map((job) => ({
    title: `${job.projectName || "Editor Project"} - ${job.editorName || "Editor"}`,
    meta: [formatDate(job.dueDate), job.status || "Pending"].filter(Boolean).join(" | "),
    amount: formatMoney(getEditorPendingAmount(job), job.currency)
  }));

  const teamRows = buildTeamDueByMember().flatMap((member) => (
    member.events.map((event) => ({
      title: `${member.name} - ${event.label}`,
      meta: "Pending team payout",
      amount: formatCurrency(event.amount)
    }))
  ));

  renderOverviewReportList(
    overviewEnquiryReport,
    state.leads.map((lead) => ({
      title: `${lead.clientName || "Client"} - ${lead.eventType || "Event"}`,
      meta: [formatDate(lead.eventDate), lead.contact || lead.location || "No details"].filter(Boolean).join(" | "),
      amount: lead.source === "wedding-plan" ? "Wedding" : "Event"
    })),
    "No enquiries saved yet."
  );

  renderOverviewReportList(
    overviewConfirmedReport,
    bookedLeads.map((lead) => ({
      title: `${lead.clientName || "Client"} - ${lead.eventType || "Event"}`,
      meta: [formatDate(lead.eventDate), lead.location || "No location"].filter(Boolean).join(" | "),
      amount: formatCurrency(lead.amount)
    })),
    "No confirmed events yet."
  );

  renderOverviewReportList(
    overviewRevenueReport,
    [
      ...revenueRows,
      {
        title: "Total Revenue",
        meta: `Events: ${formatCurrency(stats.leadRevenue)} | Shoot & Share: ${formatCurrency(stats.shootShareRevenue)}`,
        amount: formatCurrency(stats.revenue),
        total: true
      }
    ],
    "No revenue added yet."
  );

  renderOverviewReportList(
    overviewEditorDueReport,
    editorRows,
    "No editor payments pending."
  );

  renderOverviewReportList(
    overviewTeamDueReport,
    teamRows,
    "No team payouts pending."
  );

  renderOverviewReportList(
    overviewProfitReport,
    [
      { title: "Revenue", meta: "All booked events and shoot & share jobs", amount: formatCurrency(stats.revenue) },
      { title: "Team Cost", meta: "All event team payout amounts deducted from profit", amount: formatCurrency(stats.totalTeamCost) },
      { title: "USD Editor Cost", meta: "Dollar editor payments deducted from profit", amount: formatCurrency(stats.totalUsdEditorCost) },
      ...(stats.hasNonUsdEditorAmounts ? [{
        title: "Non-USD Editor Cost",
        meta: "Tracked separately because it is not converted into dollars",
        amount: formatMoneyBreakdown(Object.fromEntries(Object.entries(stats.editorCostByCurrency).filter(([currency]) => currency !== "USD")))
      }] : []),
      { title: "Profit", meta: "Revenue - team cost - USD editor cost", amount: formatCurrency(stats.profit), total: true }
    ],
    "No profit details yet."
  );
}

function renderOverviewReportList(container, rows, emptyMessage) {
  if (!container) return;

  if (!rows.length) {
    container.innerHTML = `<p class="overview-team-empty">${escapeHtml(emptyMessage)}</p>`;
    return;
  }

  container.innerHTML = rows.map((row) => `
    <div class="overview-detail-row${row.total ? " overview-detail-row-total" : ""}">
      <div>
        <strong>${escapeHtml(row.title)}</strong>
        <span>${escapeHtml(row.meta || "")}</span>
      </div>
      <b>${escapeHtml(row.amount || "")}</b>
    </div>
  `).join("");
}

function buildScheduleItems() {
  const leadItems = state.leads
    .filter((lead) => lead.eventDate && lead.source === "manual")
    .map((lead) => ({
      sortDate: lead.eventDate,
      type: "Shoot",
      badgeStatus: lead.status,
      title: `${lead.clientName} - ${lead.eventType}`,
      dateLabel: joinDateTime(lead.eventDate, lead.eventTime),
      notes: [lead.notes || "No notes added yet.", buildConflictMessage(lead.id, lead.eventDate, lead.eventTime)]
        .filter(Boolean)
        .map(escapeHtml)
        .join("<br><br>"),
      meta: [
        { label: "Location", value: lead.location || "Not added" },
        { label: "Contact", value: lead.contact || "Not added" },
        { label: "Service", value: lead.serviceType || "Not added" },
        { label: "Rate / Hour", value: lead.pricePerHour ? formatCurrency(lead.pricePerHour) : "Not added" },
        { label: "Amount", value: formatCurrency(lead.amount) },
        { label: "Advance", value: formatCurrency(lead.advanceGiven) },
        { label: "Pending", value: formatCurrency(lead.pendingAmount) },
        { label: "Team Due", value: formatCurrency(sumTeamAssignments(lead.teamAssignments)) },
        {
          label: "Team",
          value: formatTeamAssignments(lead.teamAssignments)
        }
      ]
    }));

  const weddingEventItems = state.weddingPlans.flatMap((plan) => (
    plan.events.map((entry) => ({
      sortDate: entry.eventDate || plan.weddingDate,
      type: "Wedding Event",
      badgeStatus: "Confirmed",
      title: `${plan.clientName} - ${entry.eventName}`,
      dateLabel: joinDateTime(entry.eventDate, entry.eventTime),
      notes: [entry.eventNotes || "No event notes added.", buildConflictMessage([...getWeddingExclusionIds(plan.id), `${plan.id}-${entry.id}`], entry.eventDate, entry.eventTime)]
        .filter(Boolean)
        .map(escapeHtml)
        .join("<br><br>"),
      meta: [
        { label: "Location", value: entry.eventLocation || plan.location || "Not added" },
        { label: "Package", value: plan.packageType || "Not added" },
        { label: "Team Due", value: formatCurrency(sumTeamAssignments(entry.teamAssignments)) },
        { label: "Team", value: formatTeamAssignments(entry.teamAssignments) }
      ]
    }))
  ));

  const shootShareItems = state.shootShareJobs.map((job) => ({
    sortDate: job.date,
    type: "Shoot & Share",
    badgeStatus: "Follow-up",
    title: `Shoot & Share - ${job.forPhotographer}`,
    dateLabel: joinDateTime(job.date, job.time),
    notes: ["Booked by another photographer / studio.", buildConflictMessage(job.id, job.date, job.time)]
      .filter(Boolean)
      .map(escapeHtml)
      .join("<br><br>"),
    meta: [
      { label: "Location", value: job.location || "Not added" },
      { label: "Rate / Hour", value: formatCurrency(job.ratePerHour) },
      { label: "Hours", value: String(job.totalHours || 0) },
      { label: "Total", value: formatCurrency(job.totalAmount) },
      { label: "Received", value: formatCurrency(job.paymentReceived) },
      { label: "Pending", value: formatCurrency(job.pendingPayment) },
      { label: "For", value: job.forPhotographer || "Not added" }
    ]
  }));

  if (state.weddingPlans.some((plan) => plan.hasPreWedding && plan.preWeddingDate)) {
    state.weddingPlans.forEach((plan) => {
      if (!plan.hasPreWedding || !plan.preWeddingDate) return;
      weddingEventItems.push({
        sortDate: plan.preWeddingDate,
        type: "Pre-Wedding",
        badgeStatus: "Confirmed",
        title: `${plan.clientName} - Pre-Wedding Shoot`,
        dateLabel: formatDate(plan.preWeddingDate),
        notes: ["Pre-wedding session scheduled.", buildConflictMessage(getWeddingExclusionIds(plan.id), plan.preWeddingDate, "")]
          .filter(Boolean)
          .map(escapeHtml)
          .join("<br><br>"),
        meta: [
          { label: "Location", value: plan.location || "Not added" },
          { label: "Package", value: plan.packageType || "Not added" },
          { label: "Live Link", value: plan.liveLink ? buildLink(plan.liveLink, "Open live link") : "Not added" },
          { label: "Team", value: PER_EVENT_TEAM_MESSAGE }
        ]
      });
    });
  }

  return [...leadItems, ...weddingEventItems, ...shootShareItems].sort((left, right) => new Date(left.sortDate) - new Date(right.sortDate));
}

function groupScheduleItems(items) {
  const grouped = new Map();

  items.forEach((item) => {
    const key = item.sortDate || "undated";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(item);
  });

  return Array.from(grouped.entries())
    .sort((left, right) => {
      const leftTime = left[0] === "undated" ? Number.POSITIVE_INFINITY : new Date(left[0]).getTime();
      const rightTime = right[0] === "undated" ? Number.POSITIVE_INFINITY : new Date(right[0]).getTime();
      return leftTime - rightTime;
    })
    .map(([dateKey, groupedItems]) => {
      const firstItem = groupedItems[0];
      return {
        type: `${groupedItems.length} ${groupedItems.length === 1 ? "Event" : "Events"}`,
        badgeStatus: firstItem.badgeStatus,
        title: groupedItems.length === 1 ? firstItem.title : `${groupedItems.length} events scheduled`,
        dateLabel: dateKey === "undated" ? "Date not set" : formatDate(dateKey),
        meta: [
          { label: "Entries", value: String(groupedItems.length) },
          { label: "Types", value: Array.from(new Set(groupedItems.map((item) => item.type))).join(", ") }
        ],
        notes: groupedItems.map((item) => `
          <section class="schedule-day-entry">
            <div class="schedule-day-entry-top">
              <div>
                <span class="badge ${getBadgeClass(item.badgeStatus)}">${escapeHtml(item.type)}</span>
                <h4 class="schedule-day-entry-title">${escapeHtml(item.title)}</h4>
              </div>
              <p class="schedule-day-entry-time">${escapeHtml(item.dateLabel)}</p>
            </div>
            <div class="schedule-day-entry-grid">${item.meta.map((entry) => createMetaItem(entry.label, entry.value)).join("")}</div>
            <div class="schedule-day-entry-notes">${item.notes}</div>
          </section>
        `).join("")
      };
    });
}

function buildCalendarDayMap() {
  const items = buildScheduleItems();
  const grouped = new Map();

  items.forEach((item) => {
    const key = item.sortDate;
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push({
      title: item.title,
      type: item.type,
      dateLabel: item.dateLabel
    });
  });

  return grouped;
}

function updateLeadStatus(id, nextStatus) {
  state.leads = state.leads.map((lead) => (lead.id === id ? { ...lead, status: nextStatus } : lead));
  saveState();
  renderAll();
}

function updateEditorStatus(id, nextStatus) {
  state.editorJobs = state.editorJobs.map((job) => (job.id === id ? { ...job, status: nextStatus } : job));
  saveState();
  renderAll();
}

function updateWeddingPaymentStatus(id, isFullyPaid) {
  state.weddingPlans = state.weddingPlans.map((plan) => (
    plan.id === id ? { ...plan, isFullyPaid } : plan
  ));
  saveState();
  renderAll();
}

function updateWeddingActualHours(id, totalHours) {
  state.weddingPlans = state.weddingPlans.map((plan) => {
    if (plan.id !== id) return plan;
    const nextPlan = { ...plan, totalHours };
    const pendingAmount = Math.max(getWeddingActualAmount(nextPlan) - getWeddingTotalReceived(nextPlan), 0);
    return {
      ...nextPlan,
      pendingAmount,
      isFullyPaid: pendingAmount <= 0
    };
  });

  state.leads = state.leads.map((lead) => {
    if (!(lead.source === "wedding-plan" && lead.id === id)) return lead;
    const plan = state.weddingPlans.find((item) => item.id === id);
    return plan ? { ...lead, amount: getWeddingCurrentAmount(plan) } : lead;
  });

  saveState();
  renderAll();
}

function updateEditorDeliverableStatus(jobId, deliverableId, value) {
  state.editorJobs = state.editorJobs.map((job) => {
    if (job.id !== jobId) return job;
    return {
      ...job,
      deliverables: job.deliverables.map((item) => item.id === deliverableId ? { ...item, status: value } : item)
    };
  });
  saveState();
  renderAll();
}

function deleteLead(id) {
  const existing = state.leads.find((lead) => lead.id === id);
  if (existing && existing.source === "wedding-plan") {
    state.weddingPlans = state.weddingPlans.filter((plan) => plan.id !== id);
  }
  state.leads = state.leads.filter((lead) => lead.id !== id);
  saveState();
  renderAll();
}

function deleteWeddingPlan(id) {
  state.weddingPlans = state.weddingPlans.filter((plan) => plan.id !== id);
  state.leads = state.leads.filter((lead) => !(lead.source === "wedding-plan" && lead.id === id));
  saveState();
  renderAll();
}

function deleteEditorJob(id) {
  state.editorJobs = state.editorJobs.filter((job) => job.id !== id);
  saveState();
  renderAll();
}

function deleteShootShareJob(id) {
  state.shootShareJobs = state.shootShareJobs.filter((job) => job.id !== id);
  saveState();
  renderAll();
}

function populateLeadForm(lead) {
  leadForm.elements.leadId.value = lead.id;
  leadForm.elements.clientName.value = lead.clientName || "";
  leadForm.elements.contact.value = lead.contact || "";
  if (isDefaultEventType(lead.eventType)) {
    leadForm.elements.eventType.value = lead.eventType || "Engagement";
    leadForm.elements.customEventType.value = "";
  } else {
    leadForm.elements.eventType.value = "Other";
    leadForm.elements.customEventType.value = lead.eventType || "";
  }
  leadForm.elements.eventDate.value = lead.eventDate || "";
  leadForm.elements.eventTime.value = /^\d{2}:\d{2}$/.test(lead.eventTime || "") ? lead.eventTime : "";
  leadForm.elements.serviceType.value = lead.serviceType || "Photography";
  leadForm.elements.location.value = lead.location || "";
  leadForm.elements.pricePerHour.value = lead.pricePerHour || "";
  leadForm.elements.amount.value = lead.amount || "";
  leadForm.elements.advanceGiven.value = lead.advanceGiven || "";
  leadForm.elements.pendingAmount.value = lead.pendingAmount || "";
  leadForm.elements.deliverables.value = lead.deliverables || "";
  if (leadForm.elements.status) {
    leadForm.elements.status.value = lead.status || "Confirmed";
  }
  leadForm.elements.notes.value = lead.notes || "";
  leadTeamList.innerHTML = "";
  (lead.teamAssignments || []).forEach((assignment) => addTeamMemberRow(leadTeamList, assignment));
  if (!leadTeamList.children.length) addTeamMemberRow(leadTeamList);
  syncCustomEventField();
  syncLeadTeamSection();
  syncLeadPaymentFields();
  syncLeadAvailability();
  leadSubmitButton.textContent = "Update entry";
  leadCancelEditButton.classList.remove("hidden");
  setActiveTab("pipeline");
}

function populateWeddingForm(plan) {
  weddingForm.elements.weddingId.value = plan.id;
  weddingForm.elements.clientName.value = plan.clientName || "";
  weddingForm.elements.phone.value = plan.phone || "";
  weddingForm.elements.weddingDate.value = plan.weddingDate || "";
  weddingForm.elements.location.value = plan.location || "";
  weddingForm.elements.packageType.value = plan.packageType || "Silver";
  weddingForm.elements.deliverables.value = plan.deliverables || "";
  weddingForm.elements.pricePerHour.value = plan.pricePerHour || "";
  weddingForm.elements.expectedHours.value = plan.expectedHours || "";
  weddingForm.elements.totalAmount.value = getWeddingExpectedAmount(plan) || "";
  weddingForm.elements.expectedCrowd.value = plan.expectedCrowd || "";
  weddingForm.elements.liveLink.value = plan.liveLink || "";
  weddingForm.elements.advanceGiven.value = plan.advanceGiven || "";
  weddingForm.elements.pendingAmount.value = plan.pendingAmount || "";
  hasPreWeddingCheckbox.checked = Boolean(plan.hasPreWedding);
  weddingForm.elements.preWeddingDate.value = plan.preWeddingDate || "";
  weddingForm.elements.reviewNotes.value = plan.reviewNotes || "";
  syncWeddingPaymentFields();
  syncPreWeddingField();
  syncWeddingAvailability();

  weddingEventList.innerHTML = "";
  (plan.events || []).forEach((event) => addWeddingEventRow(event));
  if (!weddingEventList.children.length) addWeddingEventRow();

  weddingSubmitButton.textContent = "Update wedding details";
  weddingCancelEditButton.classList.remove("hidden");
  setActiveTab("weddings");
}

function populateEditorForm(job) {
  editorForm.elements.editorJobId.value = job.id;
  editorForm.elements.projectName.value = job.projectName || "";
  editorForm.elements.editorName.value = job.editorName || "";
  editorForm.elements.dueDate.value = job.dueDate || "";
  editorForm.elements.status.value = job.status || "Pending";
  editorForm.elements.amountDue.value = job.amountDue || "";
  editorForm.elements.advancePaid.value = job.advancePaid || "";
  editorForm.elements.pendingAmount.value = job.pendingAmount || "";
  editorForm.elements.editorCurrency.value = job.currency || "USD";
  editorForm.elements.editorPackage.value = job.editorPackage || "";
  editorDeliverableList.innerHTML = "";
  (job.deliverables || []).forEach((item) => addEditorDeliverableRow(item));
  if (!editorDeliverableList.children.length) addEditorDeliverableRow();
  editorSubmitButton.textContent = "Update editor task";
  editorCancelEditButton.classList.remove("hidden");
  syncEditorPaymentFields();
  setActiveTab("editor");
}

function populateShootShareForm(job) {
  shootShareForm.elements.shootShareId.value = job.id;
  shootShareForm.elements.date.value = job.date || "";
  shootShareForm.elements.time.value = /^\d{2}:\d{2}$/.test(job.time || "") ? job.time : "";
  shootShareForm.elements.ratePerHour.value = job.ratePerHour || "";
  shootShareForm.elements.totalHours.value = job.totalHours || "";
  shootShareForm.elements.totalAmount.value = job.totalAmount || "";
  shootShareForm.elements.paymentReceived.value = job.paymentReceived || "";
  shootShareForm.elements.pendingPayment.value = job.pendingPayment || "";
  shootShareForm.elements.location.value = job.location || "";
  shootShareForm.elements.forPhotographer.value = job.forPhotographer || "";
  syncShootSharePaymentFields();
  syncShootShareAvailability();
  shootShareSubmitButton.textContent = "Update shoot & share";
  shootShareCancelEditButton.classList.remove("hidden");
  setActiveTab("shoot-share");
}

function resetLeadForm() {
  leadForm.reset();
  leadForm.elements.leadId.value = "";
  leadTeamList.innerHTML = "";
  addTeamMemberRow(leadTeamList);
  leadForm.elements.eventType.value = "Engagement";
  leadForm.elements.customEventType.value = "";
  leadForm.elements.serviceType.value = "Photography";
  if (leadForm.elements.status) {
    leadForm.elements.status.value = "Confirmed";
  }
  syncCustomEventField();
  syncLeadTeamSection();
  syncLeadPaymentFields();
  syncLeadAvailability();
  leadSubmitButton.textContent = "Save entry";
  leadCancelEditButton.classList.add("hidden");
}

function resetWeddingForm() {
  weddingForm.reset();
  weddingForm.elements.weddingId.value = "";
  weddingForm.elements.totalAmount.value = "";
  weddingEventList.innerHTML = "";
  addWeddingEventRow();
  hasPreWeddingCheckbox.checked = false;
  syncWeddingPaymentFields();
  syncPreWeddingField();
  syncWeddingAvailability();
  weddingSubmitButton.textContent = "Save wedding details";
  weddingCancelEditButton.classList.add("hidden");
}

function resetEditorForm() {
  editorForm.reset();
  editorForm.elements.editorJobId.value = "";
  editorForm.elements.editorCurrency.value = "USD";
  syncEditorPaymentFields();
  editorDeliverableList.innerHTML = "";
  addEditorDeliverableRow();
  editorSubmitButton.textContent = "Add editor task";
  editorCancelEditButton.classList.add("hidden");
}

function resetShootShareForm() {
  shootShareForm.reset();
  shootShareForm.elements.shootShareId.value = "";
  syncShootSharePaymentFields();
  syncShootShareAvailability();
  shootShareSubmitButton.textContent = "Save shoot & share";
  shootShareCancelEditButton.classList.add("hidden");
}

function syncPreWeddingField() {
  preWeddingDateField.classList.toggle("hidden", !hasPreWeddingCheckbox.checked);
  if (!hasPreWeddingCheckbox.checked) {
    weddingForm.elements.preWeddingDate.value = "";
  }
}

function syncCustomEventField() {
  const isOther = eventTypeSelect.value === "Other";
  customEventTypeField.classList.toggle("hidden", !isOther);
  if (!isOther) {
    leadForm.elements.customEventType.value = "";
  }
}

function syncLeadTeamSection() {
  leadTeamSection.classList.remove("hidden");
}

function syncLeadAvailability() {
  const conflicts = findScheduleConflicts({
    date: leadForm.elements.eventDate.value,
    time: leadForm.elements.eventTime.value,
    excludeIds: [leadForm.elements.leadId.value].filter(Boolean)
  });
  renderAvailabilityAlert(leadAvailabilityAlert, conflicts);
}

function syncLeadPaymentFields() {
  const total = Number(leadForm.elements.amount.value) || 0;
  const advance = Number(leadForm.elements.advanceGiven.value) || 0;
  leadForm.elements.pendingAmount.value = String(Math.max(total - advance, 0));
}

function syncWeddingPaymentFields() {
  const total = (Number(weddingForm.elements.pricePerHour.value) || 0) * (Number(weddingForm.elements.expectedHours.value) || 0);
  const advance = Number(weddingForm.elements.advanceGiven.value) || 0;
  weddingForm.elements.totalAmount.value = total ? String(total) : "";
  weddingForm.elements.pendingAmount.value = String(Math.max(total - advance, 0));
}

function syncWeddingAvailability() {
  const weddingId = weddingForm.elements.weddingId.value;
  const conflicts = findScheduleConflicts({
    date: weddingForm.elements.weddingDate.value,
    time: "",
    excludeIds: getWeddingExclusionIds(weddingId)
  });
  renderAvailabilityAlert(weddingAvailabilityAlert, conflicts);
}

function syncShootSharePaymentFields() {
  const total = (Number(shootShareForm.elements.ratePerHour.value) || 0) * (Number(shootShareForm.elements.totalHours.value) || 0);
  const received = Number(shootShareForm.elements.paymentReceived.value) || 0;
  shootShareForm.elements.totalAmount.value = total ? String(total) : "";
  shootShareForm.elements.pendingPayment.value = String(Math.max(total - received, 0));
}

function syncEditorPaymentFields() {
  const total = Number(editorForm.elements.amountDue.value) || 0;
  const advance = Number(editorForm.elements.advancePaid.value) || 0;
  editorForm.elements.pendingAmount.value = String(Math.max(total - advance, 0));
}

function syncShootShareAvailability() {
  const conflicts = findScheduleConflicts({
    date: shootShareForm.elements.date.value,
    time: shootShareForm.elements.time.value,
    excludeIds: [shootShareForm.elements.shootShareId.value].filter(Boolean)
  });
  renderAvailabilityAlert(shootShareAvailabilityAlert, conflicts);
}

function renderAvailabilityAlert(element, conflicts) {
  if (!element) return;
  if (!conflicts.length) {
    element.className = "availability-alert hidden";
    element.textContent = "";
    return;
  }

  const summary = conflicts.length === 1
    ? `Already booked: ${conflicts[0].title}`
    : `Already booked on this slot: ${conflicts.map((item) => item.title).join(", ")}`;
  element.className = "availability-alert";
  element.textContent = summary;
}

function findScheduleConflicts({ date, time, excludeIds = [] }) {
  if (!date) return [];
  const excluded = new Set(excludeIds.filter(Boolean));
  return collectScheduledEntries()
    .filter((item) => !excluded.has(item.id))
    .filter((item) => item.date === date)
    .filter((item) => {
      if (!time || !item.time) return true;
      return item.time === time;
    });
}

function collectScheduledEntries() {
  const leadEntries = state.leads
    .filter((lead) => lead.eventDate)
    .map((lead) => ({
      id: lead.id,
      date: lead.eventDate,
      time: normalizeClockValue(lead.eventTime),
      title: `${lead.clientName} - ${lead.eventType}`
    }));

  const weddingEntries = state.weddingPlans.flatMap((plan) => {
    const items = [{
      id: plan.id,
      date: plan.weddingDate,
      time: "",
      title: `${plan.clientName} Wedding`
    }];

    if (plan.hasPreWedding && plan.preWeddingDate) {
      items.push({
        id: `${plan.id}-prewedding`,
        date: plan.preWeddingDate,
        time: "",
        title: `${plan.clientName} - Pre-Wedding`
      });
    }

    (plan.events || []).forEach((event) => {
      if (!event.eventDate) return;
      items.push({
        id: `${plan.id}-${event.id}`,
        date: event.eventDate,
        time: normalizeClockValue(event.eventTime),
        title: `${plan.clientName} - ${event.eventName}`
      });
    });

    return items;
  });

  const shootShareEntries = state.shootShareJobs
    .filter((job) => job.date)
    .map((job) => ({
      id: job.id,
      date: job.date,
      time: normalizeClockValue(job.time),
      title: `Shoot & Share - ${job.forPhotographer}`
    }));

  return [...leadEntries, ...weddingEntries, ...shootShareEntries];
}

function normalizeClockValue(value) {
  return /^\d{2}:\d{2}$/.test(value || "") ? value : "";
}

function startOfMonth(value) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function toDateKey(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function matchesLeadSearch(lead, searchTerm) {
  if (!searchTerm) return true;
  const haystack = [
    lead.clientName,
    lead.contact,
    lead.eventType,
    lead.serviceType,
    lead.location,
    lead.pricePerHour,
    lead.deliverables,
    lead.notes,
    ...(lead.teamAssignments || []).flatMap((item) => [item.name, item.rate, item.hours, item.amount])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchTerm);
}

function buildGlobalSearchResults(searchTerm) {
  if (!searchTerm) return [];

  const normalizedSearch = searchTerm.toLowerCase();
  const results = [];

  state.leads.filter((lead) => isNonWeddingLead(lead)).forEach((lead) => {
    if (matchesLeadSearch(lead, normalizedSearch)) {
      results.push({
        id: `lead-${lead.id}`,
        tab: "pipeline",
        type: "Event Detail",
        title: `${lead.clientName} - ${lead.eventType}`,
        subtitle: [formatDate(lead.eventDate), lead.location || lead.contact || "No extra details"].filter(Boolean).join(" | ")
      });
    }
  });

  state.weddingPlans.forEach((plan) => {
    const eventNames = (plan.events || []).map((entry) => entry.eventName);
    const teammateNames = (plan.events || []).flatMap((entry) => (entry.teamAssignments || []).map((item) => item.name));
    const haystack = [
      plan.clientName,
      plan.phone,
      plan.location,
      plan.packageType,
      plan.deliverables,
      plan.reviewNotes,
      plan.liveLink,
      plan.weddingDate,
      plan.preWeddingDate,
      ...eventNames,
      ...teammateNames
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (haystack.includes(normalizedSearch)) {
      results.push({
        id: `wedding-${plan.id}`,
        tab: "weddings",
        type: "Wedding Plan",
        title: `${plan.clientName} Wedding`,
        subtitle: [formatDate(plan.weddingDate), plan.location || "No location", eventNames.slice(0, 3).join(", ")].filter(Boolean).join(" | ")
      });
    }
  });

  state.shootShareJobs.forEach((job) => {
    const haystack = [job.forPhotographer, job.location, job.date, job.time]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (haystack.includes(normalizedSearch)) {
      results.push({
        id: `shoot-${job.id}`,
        tab: "shoot-share",
        type: "Shoot & Share",
        title: job.forPhotographer || "Shoot & Share Job",
        subtitle: [formatDate(job.date), job.location || "No location"].filter(Boolean).join(" | ")
      });
    }
  });

  state.editorJobs.forEach((job) => {
    const haystack = [
      job.projectName,
      job.editorName,
      job.dueDate,
      ...(job.deliverables || []).flatMap((item) => [item.type, item.customName, item.status])
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (haystack.includes(normalizedSearch)) {
      results.push({
        id: `editor-${job.id}`,
        tab: "editor",
        type: "Editor Job",
        title: job.projectName || "Editor Job",
        subtitle: [job.editorName || "No editor", formatDate(job.dueDate)].filter(Boolean).join(" | ")
      });
    }
  });

  return results.slice(0, 12);
}

function renderGlobalSearch() {
  if (!globalSearchInput || !globalSearchResults || !globalSearchEmptyState) return;

  const searchTerm = globalSearchInput.value.trim();
  const results = buildGlobalSearchResults(searchTerm);
  const hasSearch = Boolean(searchTerm);

  globalSearchEmptyState.classList.toggle("hidden", hasSearch);
  globalSearchResults.classList.toggle("hidden", !hasSearch);

  if (!hasSearch) {
    globalSearchEmptyState.textContent = "Start typing to search across all records.";
    globalSearchResults.innerHTML = "";
    return;
  }

  if (!results.length) {
    globalSearchEmptyState.classList.remove("hidden");
    globalSearchResults.classList.add("hidden");
    globalSearchEmptyState.textContent = "No matching records found.";
    globalSearchResults.innerHTML = "";
    return;
  }

  globalSearchResults.classList.remove("hidden");
  globalSearchResults.innerHTML = results.map((result) => `
    <button type="button" class="overview-search-result" data-tab="${escapeHtml(result.tab)}">
      <span class="overview-search-result-type">${escapeHtml(result.type)}</span>
      <strong>${escapeHtml(result.title)}</strong>
      <span>${escapeHtml(result.subtitle)}</span>
    </button>
  `).join("");

  globalSearchResults.querySelectorAll(".overview-search-result").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveTab(button.dataset.tab);
    });
  });
}

function buildConflictMessage(excludeIds, date, time) {
  const conflicts = findScheduleConflicts({
    date,
    time,
    excludeIds: Array.isArray(excludeIds) ? excludeIds : [excludeIds]
  });
  if (!conflicts.length) return "";
  const label = conflicts.length === 1 ? "Conflict:" : "Conflicts:";
  return `${label} ${conflicts.map((item) => item.title).join(", ")}`;
}

function getWeddingExclusionIds(weddingId) {
  if (!weddingId) return [];
  const plan = state.weddingPlans.find((item) => item.id === weddingId);
  if (!plan) return [weddingId];
  return [
    weddingId,
    `${weddingId}-prewedding`,
    ...(plan.events || []).map((event) => `${weddingId}-${event.id}`)
  ];
}

function normalizeLead(lead) {
  const amount = Number(lead.amount) || 0;
  const advanceGiven = Number(lead.advanceGiven) || 0;
  return {
    ...lead,
    serviceType: lead.serviceType || "Photography",
    pricePerHour: Number(lead.pricePerHour) || 0,
    amount,
    advanceGiven,
    pendingAmount: Number.isFinite(Number(lead.pendingAmount))
      ? Number(lead.pendingAmount)
      : Math.max(amount - advanceGiven, 0),
    status: lead.status || "Confirmed",
    deliverables: lead.deliverables || "",
    teamAssignments: normalizeTeamAssignments(lead)
  };
}

function isDefaultEventType(value) {
  return ["Engagement", "Birthday", "Maternity", "Corporate", "Portrait", "Other"].includes(value);
}

function isWeddingEventType(value) {
  return String(value || "").trim().toLowerCase() === "wedding";
}

function isNonWeddingLead(lead) {
  return lead.source === "manual" && !isWeddingEventType(lead.eventType);
}

function normalizeWeddingPlan(plan) {
  const inheritedAssignments = normalizeTeamAssignments(plan);
  const pricePerHour = Number(plan.pricePerHour) || 0;
  const expectedHours = Number(plan.expectedHours) || 0;
  const totalHours = Number(plan.totalHours) || 0;
  const advanceGiven = Number(plan.advanceGiven) || 0;
  const currentTotal = (totalHours > 0 ? totalHours : expectedHours) * pricePerHour;
  return {
    ...plan,
    packageType: plan.packageType || "Silver",
    deliverables: plan.deliverables || "",
    pricePerHour,
    expectedHours,
    totalHours,
    expectedCrowd: Number(plan.expectedCrowd) || 0,
    liveLink: plan.liveLink || "",
    advanceGiven,
    advanceDate: plan.advanceDate || "",
    secondPayment: 0,
    secondPaymentDate: plan.secondPaymentDate || "",
    finalPayment: 0,
    finalPaymentDate: plan.finalPaymentDate || "",
    pendingAmount: Math.max(currentTotal - advanceGiven, 0),
    isFullyPaid: Boolean(plan.isFullyPaid) || Math.max(currentTotal - advanceGiven, 0) <= 0,
    hasPreWedding: Boolean(plan.hasPreWedding),
    preWeddingDate: plan.preWeddingDate || "",
    reviewNotes: plan.reviewNotes || "",
    teamAssignments: inheritedAssignments,
    events: Array.isArray(plan.events) ? plan.events.map((event) => normalizeWeddingEvent(event, inheritedAssignments)) : []
  };
}

function normalizeShootShareJob(job) {
  const ratePerHour = Number(job.ratePerHour) || 0;
  const paymentReceived = Number(job.paymentReceived) || 0;
  const pendingPayment = Number(job.pendingPayment) || 0;
  const totalAmount = Number(job.totalAmount) || (paymentReceived + pendingPayment);
  const totalHours = Number(job.totalHours) || (ratePerHour ? totalAmount / ratePerHour : 0);
  return {
    id: job.id || crypto.randomUUID(),
    date: job.date || "",
    time: job.time || "",
    ratePerHour,
    totalHours,
    totalAmount,
    paymentReceived,
    pendingPayment,
    location: job.location || "",
    forPhotographer: job.forPhotographer || ""
  };
}

function normalizeWeddingEvent(event, inheritedAssignments = []) {
  return {
    ...event,
    id: event.id || crypto.randomUUID(),
    eventNotes: event.eventNotes || "",
    teamAssignments: Array.isArray(event.teamAssignments)
      ? normalizeTeamAssignments(event)
      : inheritedAssignments.map((item) => ({ ...item, id: crypto.randomUUID() }))
  };
}

function normalizeEditorJob(job) {
  const amountDue = Number(job.amountDue) || 0;
  const advancePaid = Number(job.advancePaid) || 0;
  const pendingAmount = Number.isFinite(Number(job.pendingAmount))
    ? Number(job.pendingAmount)
    : Math.max(amountDue - advancePaid, 0);
  return {
    ...job,
    amountDue,
    advancePaid,
    pendingAmount,
    currency: EDITOR_CURRENCIES.includes(job.currency) ? job.currency : "USD",
    editorPackage: job.editorPackage || "",
    deliverables: normalizeEditorDeliverables(job)
  };
}

function normalizeEditorDeliverables(job) {
  if (Array.isArray(job.deliverables)) {
    return job.deliverables.map((item) => ({
      id: item.id || crypto.randomUUID(),
      type: item.type || item.name || "Custom",
      customName: item.customName || "",
      status: item.status || (item.done ? "Delivered" : "Pending")
    }));
  }

  if (job.deliverableStatuses) {
    return [
      { id: crypto.randomUUID(), type: "Wedding Teaser", customName: "", status: job.deliverableStatuses.teaser || "Pending" },
      { id: crypto.randomUUID(), type: "Wedding Trailer", customName: "", status: job.deliverableStatuses.trailer || "Pending" },
      { id: crypto.randomUUID(), type: "Full-Length Videos", customName: "", status: job.deliverableStatuses.fullVideos || "Pending" },
      { id: crypto.randomUUID(), type: "Photos", customName: "", status: job.deliverableStatuses.photos || "Pending" }
    ];
  }

  return [];
}

function normalizeBankAccount(account) {
  return {
    id: account.id || crypto.randomUUID(),
    name: account.name || "",
    balance: Number(account.balance) || 0
  };
}

function normalizeTeamAssignments(entity) {
  if (Array.isArray(entity.teamAssignments)) {
    return entity.teamAssignments.map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: item.name || "",
      hours: parseOptionalNumber(item.hours),
      rate: Number(item.rate) || 0,
      amount: parseOptionalNumber(item.amount),
      paid: item.paymentStatus ? item.paymentStatus === "Completed" : Boolean(item.paid),
      paymentStatus: item.paymentStatus || (item.paid ? "Completed" : "Pending"),
      dataSharedStatus: item.dataSharedStatus || (item.dataShared ? "Shared" : "Not Shared")
    }));
  }

  if (entity.teamMembers || entity.teamPayment) {
    const names = String(entity.teamMembers || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (!names.length && !entity.teamPayment) return [];
    const each = Number(entity.teamPayment) || 0;
    return (names.length ? names : ["Team Member"]).map((name) => ({
      id: crypto.randomUUID(),
      name,
      hours: null,
      rate: 0,
      amount: names.length > 1 ? Math.round(each / names.length) : each,
      paid: false,
      paymentStatus: "Pending",
      dataSharedStatus: "Not Shared"
    }));
  }

  return [];
}

function addTeamMemberRow(container, values = {}) {
  const fragment = teamMemberTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".team-member-item");
  const nameInput = item.querySelector('[data-name="memberName"]');
  const rateInput = item.querySelector('[data-name="memberRate"]');
  const paymentStatusSelect = item.querySelector('[data-name="memberPaymentStatus"]');
  const dataSharedSelect = item.querySelector('[data-name="memberDataSharedStatus"]');

  nameInput.value = values.name || "";
  rateInput.value = values.rate || "";
  paymentStatusSelect.value = values.paymentStatus || (values.paid ? "Completed" : "Pending");
  dataSharedSelect.value = values.dataSharedStatus || (values.dataShared ? "Shared" : "Not Shared");

  item.querySelector(".remove-team-button").addEventListener("click", () => {
    item.remove();
    if (!container.children.length) addTeamMemberRow(container);
  });
  container.appendChild(fragment);
}

function readTeamRows(container) {
  return Array.from(container.querySelectorAll(".team-member-item"))
    .map((row) => ({
      id: crypto.randomUUID(),
      name: row.querySelector('[data-name="memberName"]').value.trim(),
      hours: null,
      rate: Number(row.querySelector('[data-name="memberRate"]').value) || 0,
      amount: null,
      paymentStatus: row.querySelector('[data-name="memberPaymentStatus"]').value || "Pending",
      dataSharedStatus: row.querySelector('[data-name="memberDataSharedStatus"]').value || "Not Shared"
    }))
    .map((item) => ({
      ...item,
      paid: item.paymentStatus === "Completed"
    }))
    .filter((item) => item.name || item.rate);
}

function addWeddingEventRow(values = {}) {
  const fragment = weddingEventTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".wedding-event-item");
  const eventTeamList = item.querySelector(".event-team-list");
  item.querySelector('[data-name="eventName"]').value = values.eventName || "";
  item.querySelector('[data-name="eventDate"]').value = values.eventDate || "";
  item.querySelector('[data-name="eventTime"]').value = values.eventTime || "";
  item.querySelector('[data-name="eventLocation"]').value = values.eventLocation || "";
  item.querySelector('[data-name="eventNotes"]').value = values.eventNotes || "";
  (values.teamAssignments || []).forEach((assignment) => addTeamMemberRow(eventTeamList, assignment));
  if (!eventTeamList.children.length) addTeamMemberRow(eventTeamList);
  item.querySelector(".add-event-team-button").addEventListener("click", () => addTeamMemberRow(eventTeamList));
  item.querySelector(".remove-event-button").addEventListener("click", () => {
    item.remove();
    if (!weddingEventList.children.length) addWeddingEventRow();
  });
  weddingEventList.appendChild(fragment);
}

function readWeddingEventRows() {
  return Array.from(weddingEventList.querySelectorAll(".wedding-event-item"))
    .map((row) => ({
      id: crypto.randomUUID(),
      eventName: row.querySelector('[data-name="eventName"]').value.trim(),
      eventDate: row.querySelector('[data-name="eventDate"]').value,
      eventTime: row.querySelector('[data-name="eventTime"]').value.trim(),
      eventLocation: row.querySelector('[data-name="eventLocation"]').value.trim(),
      eventNotes: row.querySelector('[data-name="eventNotes"]').value.trim(),
      teamAssignments: readTeamRows(row.querySelector(".event-team-list"))
    }))
    .filter((item) => item.eventName && item.eventDate);
}

function addEditorDeliverableRow(values = {}) {
  const fragment = editorDeliverableTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".editor-deliverable-item");
  const typeSelect = item.querySelector('[data-name="deliverableType"]');
  const customField = item.querySelector(".custom-deliverable-field");
  const customInput = item.querySelector('[data-name="customDeliverable"]');
  const statusSelect = item.querySelector('[data-name="deliverableStatus"]');

  typeSelect.innerHTML = DELIVERABLE_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("");
  typeSelect.value = values.type || "Wedding Teaser";
  customInput.value = values.customName || "";
  statusSelect.innerHTML = DELIVERABLE_STATUSES.map((status) => `<option value="${status}">${status}</option>`).join("");
  statusSelect.value = values.status || "Pending";
  customField.classList.toggle("hidden", typeSelect.value !== "Custom");

  typeSelect.addEventListener("change", () => {
    customField.classList.toggle("hidden", typeSelect.value !== "Custom");
  });

  item.querySelector(".remove-deliverable-button").addEventListener("click", () => {
    item.remove();
    if (!editorDeliverableList.children.length) addEditorDeliverableRow();
  });

  editorDeliverableList.appendChild(fragment);
}

function readEditorDeliverables() {
  return Array.from(editorDeliverableList.querySelectorAll(".editor-deliverable-item"))
    .map((row) => ({
      id: crypto.randomUUID(),
      type: row.querySelector('[data-name="deliverableType"]').value,
      customName: row.querySelector('[data-name="customDeliverable"]').value.trim(),
      status: row.querySelector('[data-name="deliverableStatus"]').value
    }))
    .filter((item) => item.type !== "Custom" || item.customName);
}

function loadPackageDeliverables(packageName, replaceExisting) {
  if (replaceExisting) editorDeliverableList.innerHTML = "";
  (PACKAGE_DELIVERABLES[packageName] || []).forEach((type) => {
    addEditorDeliverableRow({ type, status: "Pending" });
  });
  if (!editorDeliverableList.children.length) addEditorDeliverableRow();
}

function renderEditorDeliverableStatuses(job) {
  if (!job.deliverables.length) return "No deliverables added yet.";
  return job.deliverables.map((item) => {
    const label = item.type === "Custom" ? item.customName || "Custom Deliverable" : item.type;
    const options = DELIVERABLE_STATUSES
      .map((status) => `<option value="${status}"${status === item.status ? " selected" : ""}>${status}</option>`)
      .join("");
    return `
      <label class="deliverable-status-row">
        <span>${escapeHtml(label)}</span>
        <select data-role="deliverable-status" data-id="${item.id}">
          ${options}
        </select>
      </label>
    `;
  }).join("");
}

function exportCalendar() {
  const items = buildCalendarItems();
  if (!items.length) return;
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lens Ledger//EN",
    ...items.flatMap(buildIcsEvent),
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lens-ledger-schedule.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildCalendarItems() {
  const leadItems = state.leads
    .filter((lead) => lead.eventDate)
    .map((lead) => ({
      uid: lead.id,
      title: `${lead.clientName} - ${lead.eventType}`,
      date: lead.eventDate,
      time: lead.eventTime,
      description: `${lead.notes || ""}\nDeliverables: ${lead.deliverables || "Not added"}\nTeam: ${lead.source === "manual" ? formatTeamAssignments(lead.teamAssignments) : PER_EVENT_TEAM_MESSAGE}`.trim(),
      location: lead.location || ""
    }));

  const weddingItems = state.weddingPlans.flatMap((plan) => {
    const items = [];
    if (plan.hasPreWedding && plan.preWeddingDate) {
      items.push({
        uid: `${plan.id}-prewedding`,
        title: `${plan.clientName} - Pre-Wedding Shoot`,
        date: plan.preWeddingDate,
        time: "",
        description: `Package: ${plan.packageType}\nLive Link: ${plan.liveLink || "Not added"}`.trim(),
        location: plan.location || ""
      });
    }
    (plan.events || []).forEach((entry) => {
      items.push({
        uid: `${plan.id}-${entry.id}`,
        title: `${plan.clientName} - ${entry.eventName}`,
        date: entry.eventDate,
        time: "",
        description: `${entry.eventNotes || ""}\nPackage: ${plan.packageType}\nLive Link: ${plan.liveLink || "Not added"}`.trim(),
        location: entry.eventLocation || plan.location || ""
      });
    });
    return items;
  });

  return [...leadItems, ...weddingItems];
}

function buildIcsEvent(item) {
  const start = buildIcsDate(item.date, item.time);
  const end = buildIcsDate(item.date, addOneHour(item.time));
  return [
    "BEGIN:VEVENT",
    `UID:${item.uid}@lens-ledger`,
    `DTSTAMP:${buildUtcStamp()}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(item.title)}`,
    `DESCRIPTION:${escapeIcs(item.description)}`,
    `LOCATION:${escapeIcs(item.location)}`,
    "END:VEVENT"
  ];
}

function createMetaItem(label, value) {
  return `<div><strong>${label}:</strong><br>${value}</div>`;
}

function buildOptions(options, selected) {
  return options.map((option) => `<option value="${option}"${option === selected ? " selected" : ""}>${option}</option>`).join("");
}

function buildLink(url, label) {
  return `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`;
}

function formatDate(dateString) {
  if (!dateString) return "Not scheduled";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

function formatTime(timeString) {
  if (!timeString) return "Time not set";
  if (!/^\d{2}:\d{2}$/.test(timeString)) return timeString;
  const [hours, minutes] = timeString.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function joinDateTime(dateString, timeString) {
  if (!dateString && !timeString) return "Not scheduled";
  if (dateString && timeString) return `${formatDate(dateString)} | ${formatTime(timeString)}`;
  if (dateString) return formatDate(dateString);
  return formatTime(timeString);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function formatMoney(amount, currency = "USD") {
  const safeCurrency = currency === "INR" ? "INR" : "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: safeCurrency,
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function getCurrencyBuckets(items, amountGetter) {
  return items.reduce((buckets, item) => {
    const amount = Number(amountGetter(item)) || 0;
    if (amount <= 0) return buckets;
    const currency = EDITOR_CURRENCIES.includes(item.currency) ? item.currency : "USD";
    buckets[currency] = (buckets[currency] || 0) + amount;
    return buckets;
  }, {});
}

function formatMoneyBreakdown(buckets) {
  const entries = Object.entries(buckets).filter(([, amount]) => Number(amount) > 0);
  if (!entries.length) return formatCurrency(0);
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(" + ");
}

function renderWeddingNotes(plan) {
  const notes = escapeHtml(plan.reviewNotes || "No review notes added yet.");
  const liveLink = plan.liveLink ? `<br><br><a href="${plan.liveLink}" target="_blank" rel="noreferrer">Open live link</a>` : "";
  const actualHoursControl = `
    <div class="summary-field-row">
      <label>
        Actual Hours
        <input type="number" min="0" step="0.5" data-role="wedding-actual-hours" value="${escapeHtml(String(plan.totalHours || ""))}" placeholder="Enter actual hours" />
      </label>
    </div>
  `;
  const paymentToggle = `
    <div class="summary-checkbox-row">
      <label class="checkbox-field">
        <input type="checkbox" data-role="wedding-payment-toggle"${plan.isFullyPaid ? " checked" : ""} />
        <span>Full payment completed</span>
      </label>
    </div>
  `;
  const teamManager = renderWeddingTeamManager(plan);
  return `${notes}${liveLink}${actualHoursControl}${paymentToggle}${teamManager}`;
}

function getWeddingExpectedAmount(plan) {
  return (Number(plan.pricePerHour) || 0) * (Number(plan.expectedHours) || 0);
}

function getWeddingActualAmount(plan) {
  return (Number(plan.pricePerHour) || 0) * (Number(plan.totalHours) || 0);
}

function getWeddingCurrentAmount(plan) {
  return Number(plan.totalHours) > 0 ? getWeddingActualAmount(plan) : getWeddingExpectedAmount(plan);
}

function getWeddingTotalReceived(plan) {
  return Number(plan.advanceGiven) || 0;
}

function getEditorPendingAmount(job) {
  const amountDue = Number(job.amountDue) || 0;
  const advancePaid = Number(job.advancePaid) || 0;
  const savedPending = Number(job.pendingAmount);
  return Number.isFinite(savedPending) ? savedPending : Math.max(amountDue - advancePaid, 0);
}

function getWeddingPaymentStatus(plan) {
  return plan.isFullyPaid || Number(plan.pendingAmount || 0) <= 0 ? "Fully Paid" : "Pending";
}

function renderPaymentTimelineItem(label, amount, date) {
  return `
    <div class="payment-timeline-item">
      <span>${escapeHtml(label)}</span>
      <strong>${formatCurrency(amount)}</strong>
      <small>${date ? formatDate(date) : "Date not added"}</small>
    </div>
  `;
}

function formatTeamAssignments(assignments) {
  if (!assignments || !assignments.length) return "Not assigned";
  return assignments
    .map((item) => {
      const label = item.name || "Team Member";
      const hasHours = item.hours !== null && item.hours !== undefined && item.hours !== "";
      const hasAmount = item.amount !== null && item.amount !== undefined && item.amount !== "";
      const looksLikePlannedEntry = item.rate && Number(item.hours || 0) === 0 && Number(item.amount || 0) === 0;
      if ((!hasHours && !hasAmount && item.rate) || looksLikePlannedEntry) {
        return `${label} (${formatCurrency(item.rate)}/hr, hours to add after event, ${item.paymentStatus || "Pending"}, ${item.dataSharedStatus || "Not Shared"})`;
      }
      if (!hasHours && hasAmount) {
        return `${label} (${formatCurrency(item.amount)}, ${item.paymentStatus || "Pending"}, ${item.dataSharedStatus || "Not Shared"})`;
      }
      return `${label} (${item.hours || 0}h x ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}, ${item.paymentStatus || "Pending"}, ${item.dataSharedStatus || "Not Shared"})`;
    })
    .join(", ");
}

function sumTeamAssignments(assignments) {
  return (assignments || []).reduce((sum, item) => (item.paymentStatus === "Completed" || item.paid) ? sum : sum + Number(item.amount || 0), 0);
}

function formatMonthValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthLabel(monthValue) {
  if (!monthValue) return "this month";
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return "this month";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function createBankAccount(values = {}) {
  return normalizeBankAccount(values);
}

function renderOverviewBankAccounts() {
  if (!bankAccountsList || !bankAccountTemplate) return;

  if (!state.bankAccounts.length) {
    state.bankAccounts.push(createBankAccount());
  }

  bankAccountsList.innerHTML = "";
  const fragment = document.createDocumentFragment();

  state.bankAccounts.forEach((account) => {
    const node = bankAccountTemplate.content.firstElementChild.cloneNode(true);
    const nameInput = node.querySelector('[data-name="bankName"]');
    const balanceInput = node.querySelector('[data-name="bankBalance"]');
    const removeButton = node.querySelector(".remove-bank-button");

    nameInput.value = account.name || "";
    balanceInput.value = account.balance || "";

    nameInput.addEventListener("change", (event) => {
      updateBankAccount(account.id, { name: event.target.value });
    });

    balanceInput.addEventListener("change", (event) => {
      updateBankAccount(account.id, { balance: Number(event.target.value) || 0 });
    });

    removeButton.addEventListener("click", () => removeBankAccount(account.id));
    fragment.appendChild(node);
  });

  bankAccountsList.appendChild(fragment);
}

function updateBankAccount(accountId, updates) {
  state.bankAccounts = state.bankAccounts.map((account) => (
    account.id === accountId
      ? normalizeBankAccount({ ...account, ...updates })
      : account
  ));
  renderOverviewBankAccounts();
  renderStats();
  saveState();
}

function removeBankAccount(accountId) {
  state.bankAccounts = state.bankAccounts.filter((account) => account.id !== accountId);
  if (!state.bankAccounts.length) {
    state.bankAccounts.push(createBankAccount());
  }
  renderOverviewBankAccounts();
  renderStats();
  saveState();
}

function renderMonthlySpend() {
  if (!monthlySpendTotal || !monthlySpendBreakdown || !balanceAfterSpend) return;

  const selectedMonth = overviewMonthInput?.value || overviewMonthCursor || formatMonthValue(new Date());
  overviewMonthCursor = selectedMonth;

  if (overviewMonthInput && overviewMonthInput.value !== selectedMonth) {
    overviewMonthInput.value = selectedMonth;
  }

  if (overviewMonthCaption) {
    overviewMonthCaption.textContent = `Spending tracked for ${formatMonthLabel(selectedMonth)}.`;
  }

  const teamSpend = getMonthlyTeamSpend(selectedMonth);
  const editorSpend = getMonthlyEditorSpend(selectedMonth);
  const monthlySpendBuckets = {
    ...editorSpend.buckets,
    USD: teamSpend + Number(editorSpend.buckets.USD || 0)
  };

  monthlySpendBreakdown.innerHTML = [
    { label: "Team payouts", value: formatCurrency(teamSpend) },
    { label: "Editor payouts", value: editorSpend.label }
  ].map((item) => (
    `<div class="overview-spend-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`
  )).join("");

  monthlySpendTotal.textContent = formatMoneyBreakdown(monthlySpendBuckets);
  balanceAfterSpend.textContent = formatCurrency(state.bankAccounts.reduce((sum, account) => sum + Number(account.balance || 0), 0) - (teamSpend + editorSpend.amount));
}

function renderTeamDueBreakdown() {
  if (!teamDueBreakdown) return;

  const memberBuckets = buildTeamDueByMember();
  if (!memberBuckets.length) {
    teamDueBreakdown.innerHTML = '<p class="overview-team-empty">No unpaid team dues right now.</p>';
    return;
  }

  teamDueBreakdown.innerHTML = memberBuckets.map((member) => `
    <div class="overview-spend-row overview-team-row">
      <div class="overview-team-copy">
        <div class="overview-team-header">
          <strong class="overview-team-name">${escapeHtml(member.name)}</strong>
          <strong class="overview-team-total-mobile">${formatCurrency(member.total)}</strong>
        </div>
        <div class="overview-team-events">
          ${member.events.map((event) => `
            <div class="overview-team-event">
              <span>${escapeHtml(event.label)}</span>
              <strong>${formatCurrency(event.amount)}</strong>
            </div>
          `).join("")}
        </div>
      </div>
      <strong class="overview-team-total">${formatCurrency(member.total)}</strong>
    </div>
  `).join("");
}

function buildTeamDueByMember() {
  const confirmedStatuses = new Set(["Confirmed", "Completed"]);
  const buckets = new Map();

  const addDue = (member, eventLabel, amount) => {
    const name = String(member?.name || "").trim();
    const numericAmount = Number(amount || 0);
    if (!name || numericAmount <= 0) return;

    const key = name.toLowerCase();
    const existing = buckets.get(key) || { name, total: 0, events: [] };
    existing.total += numericAmount;
    existing.events.push({ label: eventLabel, amount: numericAmount });
    buckets.set(key, existing);
  };

  state.leads.forEach((lead) => {
    if (lead.source === "wedding-plan" || !(lead.source === "manual" || confirmedStatuses.has(lead.status))) return;

    (lead.teamAssignments || []).forEach((item) => {
      if (item.paymentStatus === "Completed" || item.paid) return;
      addDue(item, `${lead.clientName} - ${lead.eventType}`, item.amount);
    });
  });

  state.weddingPlans.forEach((plan) => {
    (plan.events || []).forEach((event) => {
      (event.teamAssignments || []).forEach((item) => {
        if (item.paymentStatus === "Completed" || item.paid) return;
        addDue(item, `${plan.clientName} - ${event.eventName || "Wedding Event"}`, item.amount);
      });
    });
  });

  return [...buckets.values()]
    .map((member) => ({
      ...member,
      events: member.events.sort((left, right) => right.amount - left.amount || left.label.localeCompare(right.label))
    }))
    .sort((left, right) => right.total - left.total || left.name.localeCompare(right.name));
}

function getMonthlyTeamSpend(monthValue) {
  const weddingSpend = state.weddingPlans.reduce((sum, plan) => (
    sum + (plan.events || []).reduce((eventSum, event) => (
      isDateInMonth(event.eventDate || plan.weddingDate, monthValue)
        ? eventSum + (event.teamAssignments || []).reduce((teamSum, item) => (
          item.paymentStatus === "Completed" ? teamSum + Number(item.amount || 0) : teamSum
        ), 0)
        : eventSum
    ), 0)
  ), 0);

  const leadSpend = state.leads.reduce((sum, lead) => (
    lead.source !== "wedding-plan" && isDateInMonth(lead.eventDate, monthValue)
      ? sum + (lead.teamAssignments || []).reduce((teamSum, item) => (
        item.paymentStatus === "Completed" ? teamSum + Number(item.amount || 0) : teamSum
      ), 0)
      : sum
  ), 0);

  return weddingSpend + leadSpend;
}

function getMonthlyEditorSpend(monthValue) {
  const paidJobs = state.editorJobs.filter((job) => (
    job.status === "Paid" && isDateInMonth(job.dueDate || job.eventDate || "", monthValue)
  ));
  const buckets = getCurrencyBuckets(paidJobs, (job) => Number(job.amountDue || 0));
  return {
    amount: Number(buckets.USD || 0),
    buckets,
    label: formatMoneyBreakdown(buckets)
  };
}

function isDateInMonth(dateString, monthValue) {
  if (!dateString || !monthValue) return false;
  return String(dateString).slice(0, 7) === monthValue;
}

function countPendingDeliverables(deliverables) {
  return (deliverables || []).filter((item) => item.status !== "Delivered").length;
}

function getBadgeClass(status) {
  return `status-${status.toLowerCase().replace(/[^a-z]+/g, "-")}`;
}

function compareLeadDates(left, right) {
  return getSortableLeadDate(left) - getSortableLeadDate(right);
}

function getSortableLeadDate(lead) {
  if (!lead.eventDate) return Number.POSITIVE_INFINITY;
  const dateTime = lead.eventTime && /^\d{2}:\d{2}$/.test(lead.eventTime) ? `${lead.eventDate}T${lead.eventTime}:00` : `${lead.eventDate}T23:59:00`;
  return new Date(dateTime).getTime();
}

function buildIcsDate(date, time) {
  const safeTime = /^\d{2}:\d{2}$/.test(time || "") ? `${time}:00` : "09:00:00";
  return `${date.replaceAll("-", "")}T${safeTime.replaceAll(":", "")}`;
}

function addOneHour(time) {
  if (!/^\d{2}:\d{2}$/.test(time || "")) return "10:00";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes + 60, 0, 0);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function buildUtcStamp() {
  const now = new Date();
  return `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}T${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}${String(now.getUTCSeconds()).padStart(2, "0")}Z`;
}

function escapeIcs(value) {
  return String(value || "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function renderWeddingTeamManager(plan) {
  const eventsWithTeam = (plan.events || []).filter((event) => (event.teamAssignments || []).length);
  if (!eventsWithTeam.length) return "";

  const totalMembers = eventsWithTeam.reduce((count, event) => count + (event.teamAssignments || []).length, 0);
  const eventLabel = `${eventsWithTeam.length} ${eventsWithTeam.length === 1 ? "event" : "events"}`;
  const memberLabel = `${totalMembers} ${totalMembers === 1 ? "member" : "members"}`;
  const planOpen = weddingTeamUiState.openPlans.has(plan.id);

  return `
    <details class="team-summary-panel" data-role="team-summary-panel" ${planOpen ? "open" : ""}>
      <summary class="team-summary-toggle">
        <span class="team-summary-toggle-title">Team Updates</span>
        <span class="team-summary-toggle-meta">${eventLabel} | ${memberLabel}</span>
      </summary>
      <div class="team-summary-list">
        ${eventsWithTeam.map((event) => `
          <details
            class="team-summary-event-block"
            data-role="event-team-panel"
            data-event-key="${escapeHtml(getWeddingTeamEventKey(plan.id, event.id))}"
            ${weddingTeamUiState.openEvents.has(getWeddingTeamEventKey(plan.id, event.id)) ? "open" : ""}
          >
            <summary class="team-summary-event-summary">
              <div>
                <h5 class="team-summary-event-title">${escapeHtml(event.eventName || "Wedding Event")}</h5>
                <p class="team-summary-event-subtitle">${(event.teamAssignments || []).length} ${(event.teamAssignments || []).length === 1 ? "member" : "members"}</p>
              </div>
              <div class="team-summary-event-meta">
                <span>Team Due</span>
                <strong>${formatCurrency(sumTeamAssignments(event.teamAssignments))}</strong>
              </div>
            </summary>
            <div class="team-summary-event-list">
              ${(event.teamAssignments || []).map((item) => `
                <div class="team-summary-row">
                  <div class="team-summary-row-head">
                    <strong>${escapeHtml(item.name || "Team Member")}</strong>
                    <span>${formatCurrency(item.rate)}/hr</span>
                  </div>
                  <div class="team-summary-grid">
                    <label>
                      Hours Worked
                      <input type="number" min="0" step="0.5" data-role="event-team-hours" data-event-id="${event.id}" data-member-id="${item.id}" value="${escapeHtml(item.hours ?? "")}" placeholder="Enter after event" />
                    </label>
                    <label>
                      Amount
                      <input type="text" value="${item.amount === null || item.amount === undefined ? "" : escapeHtml(formatCurrency(item.amount))}" placeholder="Auto after hours" readonly />
                    </label>
                    <label>
                      Payment Status
                      <select data-role="event-team-payment-status" data-event-id="${event.id}" data-member-id="${item.id}">
                        ${buildOptions(TEAM_PAYMENT_STATUSES, item.paymentStatus || "Pending")}
                      </select>
                    </label>
                    <label>
                      Data Shared
                      <select data-role="event-team-data-shared" data-event-id="${event.id}" data-member-id="${item.id}">
                        ${buildOptions(TEAM_DATA_SHARED_STATUSES, item.dataSharedStatus || "Not Shared")}
                      </select>
                    </label>
                  </div>
                </div>
              `).join("")}
            </div>
          </details>
        `).join("")}
      </div>
    </details>
  `;
}

function getWeddingTeamEventKey(planId, eventId) {
  return `${planId}:${eventId}`;
}

function updateWeddingEventTeamAssignment(planId, eventId, memberId, updates) {
  state.weddingPlans = state.weddingPlans.map((plan) => {
    if (plan.id !== planId) return plan;
    const updatedEvents = (plan.events || []).map((event) => {
      if (event.id !== eventId) return event;
      return {
        ...event,
        teamAssignments: (event.teamAssignments || []).map((item) => {
          if (item.id !== memberId) return item;
          const next = {
            ...item,
            ...updates
          };
          const hours = parseOptionalNumber(next.hours);
          const rate = Number(next.rate) || 0;
          const amount = hours !== null && rate ? hours * rate : parseOptionalNumber(next.amount);
          const paymentStatus = next.paymentStatus || (next.paid ? "Completed" : "Pending");
          return {
            ...next,
            hours,
            amount,
            paymentStatus,
            paid: paymentStatus === "Completed",
            dataSharedStatus: next.dataSharedStatus || "Not Shared"
          };
        })
      };
    });
    return {
      ...plan,
      events: updatedEvents,
      teamAssignments: collectWeddingPlanTeamAssignments({ ...plan, events: updatedEvents })
    };
  });

  state.leads = state.leads.map((lead) => {
    if (!(lead.source === "wedding-plan" && lead.id === planId)) return lead;
    const plan = state.weddingPlans.find((item) => item.id === planId);
    return plan ? { ...lead, teamAssignments: collectWeddingPlanTeamAssignments(plan) } : lead;
  });

  saveState();
  renderAll();
}

function collectWeddingPlanTeamAssignments(plan) {
  return (plan?.events || []).flatMap((event) => (
    (event.teamAssignments || []).map((item) => ({ ...item }))
  ));
}

function getLeadTeamAssignments(lead) {
  if (lead.source === "wedding-plan") {
    const plan = state.weddingPlans.find((item) => item.id === lead.id);
    if (plan) return collectWeddingPlanTeamAssignments(plan);
  }
  return lead.teamAssignments || [];
}

function getLeadTeamCost(lead) {
  return getLeadTeamAssignments(lead).reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function getLeadTeamDue(lead) {
  return sumTeamAssignments(getLeadTeamAssignments(lead));
}

function upsertById(list, entry) {
  const index = list.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    list[index] = entry;
  } else {
    list.unshift(entry);
  }
}
