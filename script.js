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
const leadSearchInput = document.querySelector("#leadSearchInput");

const leadSubmitButton = document.querySelector("#leadSubmitButton");
const weddingSubmitButton = document.querySelector("#weddingSubmitButton");
const shootShareSubmitButton = document.querySelector("#shootShareSubmitButton");
const editorSubmitButton = document.querySelector("#editorSubmitButton");
const leadCancelEditButton = document.querySelector("#leadCancelEdit");
const weddingCancelEditButton = document.querySelector("#weddingCancelEdit");
const shootShareCancelEditButton = document.querySelector("#shootShareCancelEdit");
const editorCancelEditButton = document.querySelector("#editorCancelEdit");

const addLeadTeamMemberButton = document.querySelector("#addLeadTeamMember");
const addWeddingTeamMemberButton = document.querySelector("#addWeddingTeamMember");
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
const weddingTeamList = document.querySelector("#weddingTeamList");
const weddingEventList = document.querySelector("#weddingEventList");
const editorDeliverableList = document.querySelector("#editorDeliverableList");

const leadList = document.querySelector("#leadList");
const weddingPlansList = document.querySelector("#weddingPlansList");
const shootShareList = document.querySelector("#shootShareList");
const scheduleList = document.querySelector("#scheduleList");
const calendarGrid = document.querySelector("#calendarGrid");
const calendarMonthLabel = document.querySelector("#calendarMonthLabel");
const editorList = document.querySelector("#editorList");

const pipelineEmptyState = document.querySelector("#pipelineEmptyState");
const weddingPlansEmptyState = document.querySelector("#weddingPlansEmptyState");
const shootShareEmptyState = document.querySelector("#shootShareEmptyState");
const scheduleEmptyState = document.querySelector("#scheduleEmptyState");
const editorEmptyState = document.querySelector("#editorEmptyState");

const statusFilter = document.querySelector("#statusFilter");
const calendarPrevButton = document.querySelector("#calendarPrevButton");
const calendarNextButton = document.querySelector("#calendarNextButton");

const leadCardTemplate = document.querySelector("#leadCardTemplate");
const scheduleCardTemplate = document.querySelector("#scheduleCardTemplate");
const weddingEventTemplate = document.querySelector("#weddingEventTemplate");
const teamMemberTemplate = document.querySelector("#teamMemberTemplate");
const editorDeliverableTemplate = document.querySelector("#editorDeliverableTemplate");

const totalEnquiries = document.querySelector("#totalEnquiries");
const totalConfirmed = document.querySelector("#totalConfirmed");
const totalRevenue = document.querySelector("#totalRevenue");
const totalProfit = document.querySelector("#totalProfit");
const editorDue = document.querySelector("#editorDue");
const teamDue = document.querySelector("#teamDue");
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
let brandHeroIntervalId = null;
let brandHeroSignature = "";
let authMode = "login";
let currentUser = null;
let saveTimerId = null;
let pendingSavePromise = Promise.resolve();

const initialState = {
  leads: [],
  weddingPlans: [],
  shootShareJobs: [],
  editorJobs: []
};

let state = createEmptyState();
let calendarCursor = startOfMonth(new Date());

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
  authMode = "login";
  syncAuthMode();
  showAuthShell();
}));

statusFilter.addEventListener("change", renderLeads);
leadSearchInput.addEventListener("input", renderLeads);
hasPreWeddingCheckbox.addEventListener("change", syncPreWeddingField);
eventTypeSelect.addEventListener("change", syncCustomEventField);
leadStatusSelect.addEventListener("change", syncLeadTeamSection);
exportCalendarButton.addEventListener("click", exportCalendar);
addLeadTeamMemberButton.addEventListener("click", () => addTeamMemberRow(leadTeamList));
addWeddingTeamMemberButton.addEventListener("click", () => addTeamMemberRow(weddingTeamList));
addWeddingEventButton.addEventListener("click", () => addWeddingEventRow());
addEditorDeliverableButton.addEventListener("click", () => addEditorDeliverableRow());
loadPackageDeliverablesButton.addEventListener("click", () => {
  const packageName = editorForm.elements.editorPackage.value;
  loadPackageDeliverables(packageName, true);
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
    editorJobs: []
  };
}

function normalizeAppState(rawState) {
  const safeState = rawState || createEmptyState();
  return {
    leads: (safeState.leads || []).map(normalizeLead),
    weddingPlans: (safeState.weddingPlans || []).map(normalizeWeddingPlan),
    shootShareJobs: (safeState.shootShareJobs || []).map(normalizeShootShareJob),
    editorJobs: (safeState.editorJobs || []).map(normalizeEditorJob)
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
  syncCustomEventField();
  syncLeadTeamSection();
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
  renderStats();
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
  }
}

function showAppShell() {
  appShell.classList.remove("hidden");
  publicShell.classList.add("hidden");
  hideAuthShell();
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
}

function showAuthMessage(message) {
  authMessage.textContent = message;
  authMessage.classList.remove("hidden");
}

function clearAuthMessage() {
  authMessage.textContent = "";
  authMessage.classList.add("hidden");
}

function syncAuthMode() {
  const isSignup = authMode === "signup";
  authTitle.textContent = isSignup ? "Create your dashboard account" : "Sign in to your dashboard";
  authSubtitle.textContent = isSignup
    ? "Use one account for your bookings, weddings, editor tracking, and calendar from anywhere."
    : "Access your photography workflow from anywhere once this app is running on the web.";
  authSubmitButton.textContent = isSignup ? "Create Account" : "Sign In";
  authModeToggle.textContent = isSignup ? "Already have an account? Sign in" : "Need an account? Create one";
}

function toggleAuthMode() {
  authMode = authMode === "login" ? "signup" : "login";
  clearAuthMessage();
  syncAuthMode();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearAuthMessage();
  const formData = new FormData(authForm);
  authSubmitButton.disabled = true;
  authSubmitButton.textContent = authMode === "signup" ? "Creating…" : "Signing In…";

  try {
    const payload = await apiRequest(`/api/auth/${authMode}`, {
      method: "POST",
      body: JSON.stringify({
        email: String(formData.get("email") || "").trim(),
        password: String(formData.get("password") || "")
      })
    });

    currentUser = payload.user;
    accountEmail.textContent = currentUser.email;
    authForm.reset();
    showAppShell();
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
    currentUser = null;
    accountEmail.textContent = "Not signed in";
    state = createEmptyState();
    renderAll();
    showPublicLanding();
    clearAuthMessage();
    setSyncStatus("Signed out");
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
    amount: Number(formData.get("amount")) || 0,
    deliverables: formData.get("deliverables").trim(),
    teamAssignments: readTeamRows(leadTeamList),
    status: formData.get("status"),
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
    pendingAmount: Number(formData.get("pendingAmount")) || 0,
    isFullyPaid: existingPlan ? Boolean(existingPlan.isFullyPaid) : false,
    hasPreWedding: hasPreWeddingCheckbox.checked,
    preWeddingDate: hasPreWeddingCheckbox.checked ? formData.get("preWeddingDate") : "",
    reviewNotes: formData.get("reviewNotes").trim(),
    teamAssignments: readTeamRows(weddingTeamList),
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
    teamAssignments: weddingPlan.teamAssignments,
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
  const selectedStatus = statusFilter.value;
  const searchTerm = leadSearchInput.value.trim().toLowerCase();
  const items = (selectedStatus === "All"
    ? state.leads
    : state.leads.filter((lead) => lead.status === selectedStatus))
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
    const editButton = fragment.querySelector(".edit-button");
    const deleteButton = fragment.querySelector(".delete-button");

    badge.textContent = lead.status;
    badge.classList.add(getBadgeClass(lead.status));
    title.textContent = lead.clientName;
    notes.textContent = lead.notes || "No notes added yet.";
    statusSelect.innerHTML = buildOptions(LEAD_STATUSES, lead.status);

    meta.innerHTML = [
      createMetaItem("Source", lead.source === "manual" ? "Manual" : "Wedding Planner"),
      createMetaItem("Contact", lead.contact || "Not added"),
      createMetaItem("Event", lead.eventType || "Not added"),
      createMetaItem("Service", lead.serviceType || "Not added"),
      createMetaItem("Date", joinDateTime(lead.eventDate, lead.eventTime)),
      createMetaItem("Location", lead.location || "Not added"),
      createMetaItem("Amount", formatCurrency(lead.amount)),
      createMetaItem("Deliverables", lead.deliverables || "Not added"),
      createMetaItem("Team", formatTeamAssignments(lead.teamAssignments))
    ].join("");

    statusSelect.addEventListener("change", (statusEvent) => {
      updateLeadStatus(lead.id, statusEvent.target.value);
    });
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
      createMetaItem("Payment", plan.isFullyPaid ? "Fully Paid" : "Pending"),
      createMetaItem("Team", formatTeamAssignments(plan.teamAssignments))
    ].join("");

    notes.querySelector('[data-role="wedding-payment-toggle"]')?.addEventListener("change", (toggleEvent) => {
      updateWeddingPaymentStatus(plan.id, toggleEvent.target.checked);
    });
    notes.querySelector('[data-role="wedding-actual-hours"]')?.addEventListener("input", (hoursEvent) => {
      updateWeddingActualHours(plan.id, Number(hoursEvent.target.value) || 0);
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
  scheduleList.innerHTML = "";
  scheduleEmptyState.classList.toggle("hidden", items.length > 0);

  items.forEach((item) => {
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
      createMetaItem("Amount", formatCurrency(job.amountDue)),
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
  const revenue = state.leads.reduce((sum, lead) => confirmedStatuses.has(lead.status) ? sum + Number(lead.amount || 0) : sum, 0);
  const totalEditorCost = state.editorJobs.reduce((sum, job) => sum + Number(job.amountDue || 0), 0);
  const totalTeamCost = state.leads.reduce((sum, lead) => (
    confirmedStatuses.has(lead.status)
      ? sum + (lead.teamAssignments || []).reduce((teamSum, item) => teamSum + Number(item.amount || 0), 0)
      : sum
  ), 0);
  const profit = revenue - totalEditorCost - totalTeamCost;

  totalEnquiries.textContent = state.leads.length;
  totalConfirmed.textContent = state.leads.filter((lead) => confirmedStatuses.has(lead.status)).length;
  totalRevenue.textContent = formatCurrency(revenue);
  totalProfit.textContent = formatCurrency(profit);
  editorDue.textContent = formatCurrency(state.editorJobs.reduce((sum, job) => job.status === "Paid" ? sum : sum + Number(job.amountDue || 0), 0));
  teamDue.textContent = formatCurrency(state.leads.reduce((sum, lead) => lead.status === "Completed" ? sum + sumTeamAssignments(lead.teamAssignments) : sum, 0));
}

function buildScheduleItems() {
  const leadItems = state.leads
    .filter((lead) => lead.eventDate)
    .map((lead) => ({
      sortDate: lead.eventDate,
      type: lead.source === "manual" ? "Shoot" : "Wedding Booking",
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
        { label: "Amount", value: formatCurrency(lead.amount) },
        { label: "Team", value: formatTeamAssignments(lead.teamAssignments) }
      ]
    }));

  const weddingItems = state.weddingPlans.map((plan) => ({
    sortDate: plan.weddingDate,
    type: "Wedding Plan",
    badgeStatus: "Confirmed",
    title: `${plan.clientName} Wedding`,
    dateLabel: formatDate(plan.weddingDate),
    notes: `${[plan.reviewNotes || "No review notes added yet.", buildConflictMessage(getWeddingExclusionIds(plan.id), plan.weddingDate, "")]
      .filter(Boolean)
      .map(escapeHtml)
      .join("<br><br>")}${plan.liveLink ? `<br><br><a href="${plan.liveLink}" target="_blank" rel="noreferrer">Open live link</a>` : ""}`,
    meta: [
      { label: "Package", value: plan.packageType || "Not added" },
      { label: "Hours", value: String(plan.totalHours || 0) },
      { label: "Rate / Hour", value: formatCurrency(plan.pricePerHour) },
      { label: "Pre-Wedding", value: plan.hasPreWedding ? formatDate(plan.preWeddingDate) : "No" },
      { label: "Advance", value: formatCurrency(plan.advanceGiven) },
      { label: "Pending", value: formatCurrency(plan.pendingAmount) },
      { label: "Payment", value: plan.isFullyPaid ? "Fully Paid" : "Pending" },
      { label: "Team", value: formatTeamAssignments(plan.teamAssignments) }
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
        { label: "Covered Hours", value: String(entry.coveredHours || 0) },
        { label: "Package", value: plan.packageType || "Not added" },
        { label: "Team", value: formatTeamAssignments(plan.teamAssignments) }
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
          { label: "Team", value: formatTeamAssignments(plan.teamAssignments) }
        ]
      });
    });
  }

  return [...leadItems, ...weddingItems, ...weddingEventItems, ...shootShareItems].sort((left, right) => new Date(left.sortDate) - new Date(right.sortDate));
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
    return {
      ...nextPlan,
      pendingAmount: Math.max(getWeddingActualAmount(nextPlan) - Number(nextPlan.advanceGiven || 0), 0)
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
    leadForm.elements.eventType.value = lead.eventType || "Wedding";
    leadForm.elements.customEventType.value = "";
  } else {
    leadForm.elements.eventType.value = "Other";
    leadForm.elements.customEventType.value = lead.eventType || "";
  }
  leadForm.elements.eventDate.value = lead.eventDate || "";
  leadForm.elements.eventTime.value = /^\d{2}:\d{2}$/.test(lead.eventTime || "") ? lead.eventTime : "";
  leadForm.elements.serviceType.value = lead.serviceType || "Photography";
  leadForm.elements.location.value = lead.location || "";
  leadForm.elements.amount.value = lead.amount || "";
  leadForm.elements.deliverables.value = lead.deliverables || "";
  leadForm.elements.status.value = lead.status || "Enquiry";
  leadForm.elements.notes.value = lead.notes || "";
  leadTeamList.innerHTML = "";
  (lead.teamAssignments || []).forEach((assignment) => addTeamMemberRow(leadTeamList, assignment));
  if (!leadTeamList.children.length) addTeamMemberRow(leadTeamList);
  syncCustomEventField();
  syncLeadTeamSection();
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

  weddingTeamList.innerHTML = "";
  (plan.teamAssignments || []).forEach((assignment) => addTeamMemberRow(weddingTeamList, assignment));
  if (!weddingTeamList.children.length) addTeamMemberRow(weddingTeamList);

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
  editorForm.elements.editorPackage.value = job.editorPackage || "";
  editorDeliverableList.innerHTML = "";
  (job.deliverables || []).forEach((item) => addEditorDeliverableRow(item));
  if (!editorDeliverableList.children.length) addEditorDeliverableRow();
  editorSubmitButton.textContent = "Update editor task";
  editorCancelEditButton.classList.remove("hidden");
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
  leadForm.elements.eventType.value = "Wedding";
  leadForm.elements.customEventType.value = "";
  leadForm.elements.serviceType.value = "Photography";
  leadForm.elements.status.value = "Enquiry";
  syncCustomEventField();
  syncLeadTeamSection();
  syncLeadAvailability();
  leadSubmitButton.textContent = "Save entry";
  leadCancelEditButton.classList.add("hidden");
}

function resetWeddingForm() {
  weddingForm.reset();
  weddingForm.elements.weddingId.value = "";
  weddingForm.elements.totalAmount.value = "";
  weddingTeamList.innerHTML = "";
  addTeamMemberRow(weddingTeamList);
  weddingEventList.innerHTML = "";
  addWeddingEventRow({ eventName: "Muhurtam" });
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
  const shouldShow = ["Confirmed", "Completed", "Closed"].includes(leadStatusSelect.value);
  leadTeamSection.classList.toggle("hidden", !shouldShow);
}

function syncLeadAvailability() {
  const conflicts = findScheduleConflicts({
    date: leadForm.elements.eventDate.value,
    time: leadForm.elements.eventTime.value,
    excludeIds: [leadForm.elements.leadId.value].filter(Boolean)
  });
  renderAvailabilityAlert(leadAvailabilityAlert, conflicts);
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
    lead.deliverables,
    lead.notes,
    ...(lead.teamAssignments || []).flatMap((item) => [item.name, item.rate, item.hours, item.amount])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(searchTerm);
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
  return {
    ...lead,
    serviceType: lead.serviceType || "Photography",
    deliverables: lead.deliverables || "",
    teamAssignments: normalizeTeamAssignments(lead)
  };
}

function isDefaultEventType(value) {
  return ["Wedding", "Engagement", "Birthday", "Maternity", "Corporate", "Portrait", "Other"].includes(value);
}

function normalizeWeddingPlan(plan) {
  return {
    ...plan,
    packageType: plan.packageType || "Silver",
    deliverables: plan.deliverables || "",
    pricePerHour: Number(plan.pricePerHour) || 0,
    expectedHours: Number(plan.expectedHours) || 0,
    totalHours: Number(plan.totalHours) || 0,
    expectedCrowd: Number(plan.expectedCrowd) || 0,
    liveLink: plan.liveLink || "",
    advanceGiven: Number(plan.advanceGiven) || 0,
    pendingAmount: Number(plan.pendingAmount) || 0,
    isFullyPaid: Boolean(plan.isFullyPaid),
    hasPreWedding: Boolean(plan.hasPreWedding),
    preWeddingDate: plan.preWeddingDate || "",
    reviewNotes: plan.reviewNotes || "",
    teamAssignments: normalizeTeamAssignments(plan),
    events: Array.isArray(plan.events) ? plan.events.map(normalizeWeddingEvent) : []
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

function normalizeWeddingEvent(event) {
  return {
    ...event,
    id: event.id || crypto.randomUUID(),
    coveredHours: Number(event.coveredHours) || 0,
    eventNotes: event.eventNotes || ""
  };
}

function normalizeEditorJob(job) {
  return {
    ...job,
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

function normalizeTeamAssignments(entity) {
  if (Array.isArray(entity.teamAssignments)) {
    return entity.teamAssignments.map((item) => ({
      id: item.id || crypto.randomUUID(),
      name: item.name || "",
      hours: Number(item.hours) || 0,
      rate: Number(item.rate) || 0,
      amount: Number(item.amount) || 0,
      paid: Boolean(item.paid)
    }));
  }

  if (entity.teamMembers || entity.teamPayment) {
    const names = String(entity.teamMembers || "").split(",").map((item) => item.trim()).filter(Boolean);
    if (!names.length && !entity.teamPayment) return [];
    const each = Number(entity.teamPayment) || 0;
    return (names.length ? names : ["Team Member"]).map((name) => ({
      id: crypto.randomUUID(),
      name,
      hours: 0,
      rate: 0,
      amount: names.length > 1 ? Math.round(each / names.length) : each,
      paid: false
    }));
  }

  return [];
}

function addTeamMemberRow(container, values = {}) {
  const fragment = teamMemberTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".team-member-item");
  const nameInput = item.querySelector('[data-name="memberName"]');
  const hoursInput = item.querySelector('[data-name="memberHours"]');
  const rateInput = item.querySelector('[data-name="memberRate"]');
  const amountInput = item.querySelector('[data-name="memberAmount"]');
  const paidInput = item.querySelector('[data-name="memberPaid"]');

  nameInput.value = values.name || "";
  hoursInput.value = values.hours || "";
  rateInput.value = values.rate || "";
  amountInput.value = values.amount || "";
  paidInput.checked = Boolean(values.paid);

  const syncAmount = () => {
    const hours = Number(hoursInput.value) || 0;
    const rate = Number(rateInput.value) || 0;
    amountInput.value = hours * rate ? String(hours * rate) : "";
  };

  hoursInput.addEventListener("input", syncAmount);
  rateInput.addEventListener("input", syncAmount);

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
      hours: Number(row.querySelector('[data-name="memberHours"]').value) || 0,
      rate: Number(row.querySelector('[data-name="memberRate"]').value) || 0,
      amount: Number(row.querySelector('[data-name="memberAmount"]').value) || 0,
      paid: row.querySelector('[data-name="memberPaid"]').checked
    }))
    .filter((item) => item.name || item.hours || item.rate || item.amount);
}

function addWeddingEventRow(values = {}) {
  const fragment = weddingEventTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".wedding-event-item");
  item.querySelector('[data-name="eventName"]').value = values.eventName || "";
  item.querySelector('[data-name="eventDate"]').value = values.eventDate || "";
  item.querySelector('[data-name="eventTime"]').value = values.eventTime || "";
  item.querySelector('[data-name="eventLocation"]').value = values.eventLocation || "";
  item.querySelector('[data-name="coveredHours"]').value = values.coveredHours || "";
  item.querySelector('[data-name="eventNotes"]').value = values.eventNotes || "";
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
      coveredHours: Number(row.querySelector('[data-name="coveredHours"]').value) || 0,
      eventNotes: row.querySelector('[data-name="eventNotes"]').value.trim()
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
      description: `${lead.notes || ""}\nDeliverables: ${lead.deliverables || "Not added"}\nTeam: ${formatTeamAssignments(lead.teamAssignments)}`.trim(),
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
  return `${notes}${liveLink}${actualHoursControl}${paymentToggle}`;
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

function formatTeamAssignments(assignments) {
  if (!assignments || !assignments.length) return "Not assigned";
  return assignments
    .map((item) => `${item.name || "Team Member"} (${item.hours || 0}h x ${formatCurrency(item.rate)} = ${formatCurrency(item.amount)}${item.paid ? ", Paid" : ", Pending"})`)
    .join(", ");
}

function sumTeamAssignments(assignments) {
  return (assignments || []).reduce((sum, item) => item.paid ? sum : sum + Number(item.amount || 0), 0);
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

function upsertById(list, entry) {
  const index = list.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    list[index] = entry;
  } else {
    list.unshift(entry);
  }
}
