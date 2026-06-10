const STORAGE_KEY = "trip-planner-v3";
const LEGACY_STORAGE_KEY = "sydney-visa-trip-planner-v2";

const defaultCategories = {
  flight: { label: "Flights", color: "#45b36b" },
  appointment: { label: "Appointments", color: "#e65757" },
  family: { label: "Family visits", color: "#f0b442" },
  accommodation: { label: "Accommodation", color: "#4f8fe8" },
  task: { label: "Tasks", color: "#9b6be8" },
};

const defaultTrip = {
  id: "sydney-visa-2026",
  name: "Sydney Visa Trip",
  tagline: "Philadelphia to Sydney",
  startDate: "2026-06-14",
  endDate: "2026-07-09",
  categories: defaultCategories,
  events: [
    {
      id: crypto.randomUUID(),
      title: "Fly Philadelphia to Sydney",
      startDate: "2026-06-14",
      endDate: "2026-06-14",
      time: "Departure day",
      location: "Philadelphia",
      notes: "Update with terminal, flight numbers, and connection details.",
      category: "flight",
    },
    {
      id: crypto.randomUUID(),
      title: "Arrive and settle in",
      startDate: "2026-06-16",
      endDate: "2026-06-16",
      time: "",
      location: "Sydney",
      notes: "Add accommodation check-in and transport notes.",
      category: "accommodation",
    },
    {
      id: crypto.randomUUID(),
      title: "Visa renewal appointment",
      startDate: "2026-06-22",
      endDate: "2026-06-22",
      time: "",
      location: "Sydney",
      notes: "Placeholder. Move once appointment is confirmed.",
      category: "appointment",
    },
    {
      id: crypto.randomUUID(),
      title: "Dad returns to Philadelphia",
      startDate: "2026-07-03",
      endDate: "2026-07-03",
      time: "",
      location: "Sydney Airport",
      notes: "Update with flight number and departure time.",
      category: "flight",
    },
    {
      id: crypto.randomUUID(),
      title: "Mum and kids return",
      startDate: "2026-07-09",
      endDate: "2026-07-09",
      time: "",
      location: "Sydney Airport",
      notes: "Update with flight number and departure time.",
      category: "flight",
    },
  ],
};

let state = loadState();
let activeFilter = "all";
let pointerDrag = null;
let resizeDrag = null;

const calendarGrid = document.querySelector("#calendarGrid");
const categoryStrip = document.querySelector("#categoryStrip");
const categoryFilter = document.querySelector("#categoryFilter");
const tripSelect = document.querySelector("#tripSelect");
const startDateInput = document.querySelector("#startDate");
const endDateInput = document.querySelector("#endDate");
const rangeTitle = document.querySelector("#rangeTitle");
const dialog = document.querySelector("#eventDialog");
const eventForm = document.querySelector("#eventForm");
const eventId = document.querySelector("#eventId");
const eventTitle = document.querySelector("#eventTitle");
const eventStartDate = document.querySelector("#eventStartDate");
const eventEndDate = document.querySelector("#eventEndDate");
const eventTime = document.querySelector("#eventTime");
const eventLocation = document.querySelector("#eventLocation");
const eventNotes = document.querySelector("#eventNotes");
const eventCategory = document.querySelector("#eventCategory");
const dialogTitle = document.querySelector("#dialogTitle");
const deleteEventBtn = document.querySelector("#deleteEventBtn");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!saved) return createDefaultState();

  try {
    return normalizeState(JSON.parse(saved));
  } catch {
    return createDefaultState();
  }
}

function createDefaultState() {
  return {
    activeTripId: defaultTrip.id,
    trips: [structuredClone(defaultTrip)],
  };
}

function normalizeState(saved) {
  if (Array.isArray(saved.trips)) {
    const trips = saved.trips.map(normalizeTrip);
    return {
      activeTripId: trips.some((trip) => trip.id === saved.activeTripId) ? saved.activeTripId : trips[0]?.id,
      trips: trips.length ? trips : [structuredClone(defaultTrip)],
    };
  }

  const migratedTrip = normalizeTrip({
    id: "sydney-visa-2026",
    name: "Sydney Visa Trip",
    tagline: "Philadelphia to Sydney",
    ...saved,
  });

  return {
    activeTripId: migratedTrip.id,
    trips: [migratedTrip],
  };
}

function normalizeTrip(trip) {
  return {
    id: trip.id || crypto.randomUUID(),
    name: trip.name || "Untitled Trip",
    tagline: trip.tagline || "",
    startDate: trip.startDate || "2026-06-14",
    endDate: trip.endDate || "2026-07-09",
    categories: { ...defaultCategories, ...(trip.categories || {}) },
    events: Array.isArray(trip.events) ? trip.events.map(normalizeEvent) : [],
  };
}

function normalizeEvent(event) {
  const startDate = event.startDate || event.date || defaultTrip.startDate;
  return {
    id: event.id || crypto.randomUUID(),
    title: event.title || "Untitled item",
    startDate,
    endDate: event.endDate || startDate,
    time: event.time || "",
    location: event.location || "",
    notes: event.notes || "",
    category: event.category || "task",
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentTrip() {
  let trip = state.trips.find((entry) => entry.id === state.activeTripId);
  if (!trip) {
    trip = state.trips[0] || structuredClone(defaultTrip);
    state.activeTripId = trip.id;
  }
  return trip;
}

function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(startDate, endDate) {
  return Math.max(0, Math.round((parseDate(endDate) - parseDate(startDate)) / 86400000));
}

function formatRangeTitle() {
  const trip = currentTrip();
  const start = parseDate(trip.startDate);
  const end = parseDate(trip.endDate);
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const months = startMonth === endMonth ? startMonth : `${startMonth}-${endMonth}`;
  rangeTitle.textContent = `${months} ${end.getFullYear()}`;
}

function buildCalendarDates() {
  const trip = currentTrip();
  const start = parseDate(trip.startDate);
  const end = parseDate(trip.endDate);
  const first = addDays(start, -start.getDay());
  const last = addDays(end, 6 - end.getDay());
  const dates = [];

  for (let day = first; day <= last; day = addDays(day, 1)) {
    dates.push(new Date(day));
  }

  return dates;
}

function eventTouchesDate(event, dateKey) {
  return event.startDate <= dateKey && event.endDate >= dateKey;
}

function getVisibleEvents(dateKey) {
  const trip = currentTrip();
  return trip.events
    .filter((event) => eventTouchesDate(event, dateKey))
    .filter((event) => activeFilter === "all" || event.category === activeFilter)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.time || "").localeCompare(b.time || ""));
}

function render() {
  const trip = currentTrip();
  document.querySelector("h1").textContent = trip.name;
  document.querySelector(".eyebrow").textContent = trip.tagline || "Trip planner";
  tripSelect.value = trip.id;
  startDateInput.value = trip.startDate;
  endDateInput.value = trip.endDate;
  formatRangeTitle();
  renderTrips();
  renderCategoryControls();
  renderCalendar();
}

function renderTrips() {
  tripSelect.innerHTML = "";
  state.trips.forEach((trip) => {
    tripSelect.append(new Option(trip.name, trip.id));
  });
  tripSelect.value = currentTrip().id;
}

function renderCategoryControls() {
  const trip = currentTrip();
  categoryStrip.innerHTML = "";
  categoryFilter.innerHTML = '<option value="all">All categories</option>';
  eventCategory.innerHTML = "";

  Object.entries(trip.categories).forEach(([key, category]) => {
    const option = new Option(category.label, key);
    categoryFilter.append(option.cloneNode(true));
    eventCategory.append(option);

    const pill = document.createElement("label");
    pill.className = "category-pill";
    pill.innerHTML = `
      <input type="color" value="${category.color}" aria-label="${category.label} color">
      <span>${category.label}</span>
    `;
    pill.querySelector("input").addEventListener("input", (event) => {
      currentTrip().categories[key].color = event.target.value;
      saveState();
      renderCalendar();
    });
    categoryStrip.append(pill);
  });

  if (!trip.categories[activeFilter] && activeFilter !== "all") activeFilter = "all";
  categoryFilter.value = activeFilter;
}

function renderCalendar() {
  const trip = currentTrip();
  const tripStart = parseDate(trip.startDate);
  const tripEnd = parseDate(trip.endDate);
  calendarGrid.innerHTML = "";

  buildCalendarDates().forEach((date) => {
    const dateKey = formatDate(date);
    const cell = document.createElement("article");
    cell.className = "day-cell";
    cell.dataset.date = dateKey;
    if (date < tripStart || date > tripEnd) cell.classList.add("outside");
    cell.innerHTML = `
      <span class="day-number">${date.getDate()}</span>
      <button class="add-day-button" type="button" aria-label="Add item on ${dateKey}">+</button>
      <div class="event-stack"></div>
    `;

    const stack = cell.querySelector(".event-stack");
    getVisibleEvents(dateKey).forEach((event) => stack.append(createEventCard(event, dateKey)));

    cell.querySelector(".add-day-button").addEventListener("click", () => openDialog({ startDate: dateKey, endDate: dateKey }));
    calendarGrid.append(cell);
  });
}

function createEventCard(event, dateKey) {
  const trip = currentTrip();
  const category = trip.categories[event.category] || defaultCategories.task;
  const card = document.createElement("button");
  card.type = "button";
  card.className = "event-card";
  card.dataset.id = event.id;
  card.style.setProperty("--event-color", category.color);
  card.style.borderLeftColor = category.color;

  if (event.startDate !== event.endDate) {
    card.classList.add("multi-day");
    if (dateKey === event.startDate) card.classList.add("span-start");
    if (dateKey === event.endDate) card.classList.add("span-end");
  }

  const details = [event.time, event.location].filter(Boolean).join(" - ");
  const span = event.startDate !== event.endDate ? `${formatShortDate(event.startDate)} to ${formatShortDate(event.endDate)}` : "";
  card.innerHTML = `
    <span class="event-title">${escapeHtml(event.title)}</span>
    ${details || span ? `<span class="event-meta">${escapeHtml([details, span].filter(Boolean).join(" - "))}</span>` : ""}
  `;

  if (event.startDate === event.endDate || card.classList.contains("span-start")) {
    card.append(createResizeHandle(event.id, "start"));
  }
  if (event.startDate === event.endDate || card.classList.contains("span-end")) {
    card.append(createResizeHandle(event.id, "end"));
  }

  card.addEventListener("click", () => {
    if (!card.dataset.suppressClick) openDialog(event);
  });
  card.addEventListener("pointerdown", (pointerEvent) => startPointerDrag(pointerEvent, event.id));
  card.addEventListener("mousedown", (mouseEvent) => startMouseDrag(mouseEvent, event.id));
  card.addEventListener("touchstart", (touchEvent) => startTouchDrag(touchEvent, event.id), { passive: false });
  return card;
}

function createResizeHandle(id, edge) {
  const handle = document.createElement("span");
  handle.className = `resize-handle resize-${edge}`;
  handle.dataset.edge = edge;
  handle.setAttribute("aria-hidden", "true");
  handle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  handle.addEventListener("pointerdown", (event) => startResizeDrag(event, id, edge));
  handle.addEventListener("mousedown", (event) => startResizeDrag(event, id, edge));
  handle.addEventListener("touchstart", (event) => startResizeDrag(event, id, edge), { passive: false });
  return handle;
}

function formatShortDate(dateKey) {
  return parseDate(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function startPointerDrag(event, id) {
  if (event.target.closest(".resize-handle")) return;
  if (event.button !== 0) return;
  const card = event.currentTarget;
  beginDrag(card, id, event.clientX, event.clientY);
  card.setPointerCapture(event.pointerId);
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerEnd);
  card.addEventListener("pointercancel", onPointerEnd);
}

function startMouseDrag(event, id) {
  if (event.target.closest(".resize-handle")) return;
  if (event.button !== 0 || pointerDrag) return;
  beginDrag(event.currentTarget, id, event.clientX, event.clientY);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseEnd);
}

function startTouchDrag(event, id) {
  if (event.target.closest(".resize-handle")) return;
  if (pointerDrag) return;
  const touch = event.touches[0];
  beginDrag(event.currentTarget, id, touch.clientX, touch.clientY);
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onTouchEnd);
  document.addEventListener("touchcancel", onTouchEnd);
}

function startResizeDrag(event, id, edge) {
  event.preventDefault();
  event.stopPropagation();
  if (resizeDrag) return;
  const point = getEventPoint(event);
  const item = currentTrip().events.find((entry) => entry.id === id);
  if (!item) return;

  resizeDrag = {
    id,
    edge,
    startX: point.clientX,
    startY: point.clientY,
    active: false,
    originalStartDate: item.startDate,
    originalEndDate: item.endDate,
  };

  document.body.classList.add("resizing-event");
  document.addEventListener("pointermove", onResizeMove);
  document.addEventListener("pointerup", onResizeEnd);
  document.addEventListener("mousemove", onResizeMove);
  document.addEventListener("mouseup", onResizeEnd);
  document.addEventListener("touchmove", onResizeMove, { passive: false });
  document.addEventListener("touchend", onResizeEnd);
  document.addEventListener("touchcancel", onResizeEnd);
}

function onResizeMove(event) {
  if (!resizeDrag) return;
  event.preventDefault();
  const point = getEventPoint(event);
  const distance = Math.hypot(point.clientX - resizeDrag.startX, point.clientY - resizeDrag.startY);
  if (distance > 4) resizeDrag.active = true;

  const target = getCellAtPoint(point.clientX, point.clientY);
  if (!target) return;

  const item = currentTrip().events.find((entry) => entry.id === resizeDrag.id);
  if (!item) return;

  const date = target.dataset.date;
  if (resizeDrag.edge === "start") {
    item.startDate = date <= item.endDate ? date : item.endDate;
  } else {
    item.endDate = date >= item.startDate ? date : item.startDate;
  }

  saveState();
  renderCalendar();
  document.querySelector(`.day-cell[data-date="${date}"]`)?.classList.add("drop-target");
}

function onResizeEnd() {
  if (!resizeDrag) return;
  cleanupResizeListeners();
  document.body.classList.remove("resizing-event");
  document.querySelectorAll(".drop-target").forEach((cell) => cell.classList.remove("drop-target"));
  resizeDrag = null;
  renderCalendar();
}

function cleanupResizeListeners() {
  document.removeEventListener("pointermove", onResizeMove);
  document.removeEventListener("pointerup", onResizeEnd);
  document.removeEventListener("mousemove", onResizeMove);
  document.removeEventListener("mouseup", onResizeEnd);
  document.removeEventListener("touchmove", onResizeMove);
  document.removeEventListener("touchend", onResizeEnd);
  document.removeEventListener("touchcancel", onResizeEnd);
}

function getEventPoint(event) {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  return touch || event;
}

function beginDrag(card, id, startX, startY) {
  pointerDrag = { id, card, startX, startY, active: false, clone: null };
}

function onPointerMove(event) {
  if (!pointerDrag) return;
  updateDrag(event.clientX, event.clientY);
}

function onMouseMove(event) {
  if (!pointerDrag) return;
  updateDrag(event.clientX, event.clientY);
}

function onTouchMove(event) {
  if (!pointerDrag) return;
  event.preventDefault();
  const touch = event.touches[0];
  updateDrag(touch.clientX, touch.clientY);
}

function updateDrag(clientX, clientY) {
  const distance = Math.hypot(clientX - pointerDrag.startX, clientY - pointerDrag.startY);

  if (!pointerDrag.active && distance > 8) {
    pointerDrag.active = true;
    pointerDrag.card.dataset.suppressClick = "true";
    pointerDrag.card.classList.add("dragging");
    pointerDrag.clone = pointerDrag.card.cloneNode(true);
    pointerDrag.clone.classList.add("drag-clone");
    document.body.append(pointerDrag.clone);
  }

  if (pointerDrag.active) {
    moveClone(clientX, clientY);
    highlightDropCell(clientX, clientY);
  }
}

function onPointerEnd(event) {
  if (!pointerDrag) return;
  const { card } = pointerDrag;
  if (card.hasPointerCapture?.(event.pointerId)) card.releasePointerCapture(event.pointerId);
  card.removeEventListener("pointermove", onPointerMove);
  card.removeEventListener("pointerup", onPointerEnd);
  card.removeEventListener("pointercancel", onPointerEnd);
  finishDrag(event.clientX, event.clientY);
}

function onMouseEnd(event) {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseEnd);
  finishDrag(event.clientX, event.clientY);
}

function onTouchEnd(event) {
  document.removeEventListener("touchmove", onTouchMove);
  document.removeEventListener("touchend", onTouchEnd);
  document.removeEventListener("touchcancel", onTouchEnd);
  const touch = event.changedTouches[0];
  finishDrag(touch.clientX, touch.clientY);
}

function finishDrag(clientX, clientY) {
  if (!pointerDrag) return;
  const { id, card, active, clone } = pointerDrag;

  if (active) {
    const target = getDropCell(clientX, clientY);
    const item = currentTrip().events.find((entry) => entry.id === id);
    if (target && item) {
      const duration = daysBetween(item.startDate, item.endDate);
      item.startDate = target.dataset.date;
      item.endDate = formatDate(addDays(parseDate(item.startDate), duration));
      saveState();
    }
    clone?.remove();
    document.querySelectorAll(".drop-target").forEach((cell) => cell.classList.remove("drop-target"));
    setTimeout(() => delete card.dataset.suppressClick, 0);
    renderCalendar();
  }

  card.classList.remove("dragging");
  pointerDrag = null;
}

function moveClone(x, y) {
  pointerDrag.clone.style.left = `${x}px`;
  pointerDrag.clone.style.top = `${y}px`;
}

function highlightDropCell(x, y) {
  document.querySelectorAll(".drop-target").forEach((cell) => cell.classList.remove("drop-target"));
  getDropCell(x, y)?.classList.add("drop-target");
}

function getDropCell(x, y) {
  const clone = pointerDrag?.clone;
  if (clone) clone.hidden = true;
  const cell = getCellAtPoint(x, y);
  if (clone) clone.hidden = false;
  return cell;
}

function getCellAtPoint(x, y) {
  return document.elementFromPoint(x, y)?.closest(".day-cell");
}

function openDialog(event = {}) {
  const isEditing = Boolean(event.id);
  dialogTitle.textContent = isEditing ? "Edit item" : "Add item";
  eventId.value = event.id || "";
  eventTitle.value = event.title || "";
  eventStartDate.value = event.startDate || currentTrip().startDate;
  eventEndDate.value = event.endDate || event.startDate || currentTrip().startDate;
  eventTime.value = event.time || "";
  eventLocation.value = event.location || "";
  eventNotes.value = event.notes || "";
  eventCategory.value = event.category || "task";
  deleteEventBtn.hidden = !isEditing;
  dialog.showModal();
}

function saveEvent() {
  const startDate = eventStartDate.value;
  const endDate = eventEndDate.value < startDate ? startDate : eventEndDate.value;
  const payload = {
    id: eventId.value || crypto.randomUUID(),
    title: eventTitle.value.trim(),
    startDate,
    endDate,
    time: eventTime.value.trim(),
    location: eventLocation.value.trim(),
    notes: eventNotes.value.trim(),
    category: eventCategory.value,
  };

  const trip = currentTrip();
  const existingIndex = trip.events.findIndex((event) => event.id === payload.id);
  if (existingIndex >= 0) trip.events[existingIndex] = payload;
  else trip.events.push(payload);
  saveState();
  render();
}

function createTrip() {
  const name = prompt("Trip name");
  if (!name?.trim()) return;
  const today = new Date();
  const trip = {
    id: crypto.randomUUID(),
    name: name.trim(),
    tagline: "Trip planner",
    startDate: formatDate(today),
    endDate: formatDate(addDays(today, 14)),
    categories: structuredClone(defaultCategories),
    events: [],
  };
  state.trips.push(trip);
  state.activeTripId = trip.id;
  activeFilter = "all";
  saveState();
  render();
}

function createCategory() {
  const label = prompt("Category name");
  if (!label?.trim()) return;
  const key = slugify(label);
  const trip = currentTrip();
  let categoryKey = key;
  let index = 2;
  while (trip.categories[categoryKey]) {
    categoryKey = `${key}-${index}`;
    index += 1;
  }
  trip.categories[categoryKey] = { label: label.trim(), color: "#2f9cf4" };
  saveState();
  renderCategoryControls();
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || crypto.randomUUID();
}

eventForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (!eventForm.reportValidity()) return;
  saveEvent();
  dialog.close();
});

deleteEventBtn.addEventListener("click", () => {
  const trip = currentTrip();
  trip.events = trip.events.filter((event) => event.id !== eventId.value);
  saveState();
  render();
  dialog.close();
});

document.querySelector("#newTripBtn").addEventListener("click", createTrip);
document.querySelector("#addEventBtn").addEventListener("click", () => openDialog());
document.querySelector("#addCategoryBtn").addEventListener("click", createCategory);

tripSelect.addEventListener("change", (event) => {
  state.activeTripId = event.target.value;
  activeFilter = "all";
  saveState();
  render();
});

categoryFilter.addEventListener("change", (event) => {
  activeFilter = event.target.value;
  renderCalendar();
});

startDateInput.addEventListener("change", (event) => {
  currentTrip().startDate = event.target.value;
  saveState();
  render();
});

endDateInput.addEventListener("change", (event) => {
  currentTrip().endDate = event.target.value;
  saveState();
  render();
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "trip-planner.json";
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#importInput").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const text = await file.text();
  state = normalizeState(JSON.parse(text));
  activeFilter = "all";
  saveState();
  render();
  event.target.value = "";
});

render();
