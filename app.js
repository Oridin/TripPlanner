const STORAGE_KEY = "sydney-visa-trip-planner-v2";

const defaultCategories = {
  flight: { label: "Flights", color: "#45b36b" },
  appointment: { label: "Appointments", color: "#e65757" },
  family: { label: "Family visits", color: "#f0b442" },
  accommodation: { label: "Accommodation", color: "#4f8fe8" },
  task: { label: "Tasks", color: "#9b6be8" },
};

const defaultState = {
  startDate: "2026-06-14",
  endDate: "2026-07-09",
  categories: defaultCategories,
  events: [
    {
      id: crypto.randomUUID(),
      title: "Fly Philadelphia to Sydney",
      date: "2026-06-14",
      time: "Departure day",
      location: "Philadelphia",
      notes: "Update with terminal, flight numbers, and connection details.",
      category: "flight",
    },
    {
      id: crypto.randomUUID(),
      title: "Arrive and settle in",
      date: "2026-06-16",
      time: "",
      location: "Sydney",
      notes: "Add accommodation check-in and transport notes.",
      category: "accommodation",
    },
    {
      id: crypto.randomUUID(),
      title: "Visa renewal appointment",
      date: "2026-06-22",
      time: "",
      location: "Sydney",
      notes: "Placeholder. Move once appointment is confirmed.",
      category: "appointment",
    },
    {
      id: crypto.randomUUID(),
      title: "Dad returns to Philadelphia",
      date: "2026-07-03",
      time: "",
      location: "Sydney Airport",
      notes: "Update with flight number and departure time.",
      category: "flight",
    },
    {
      id: crypto.randomUUID(),
      title: "Mum and kids return",
      date: "2026-07-09",
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

const calendarGrid = document.querySelector("#calendarGrid");
const categoryStrip = document.querySelector("#categoryStrip");
const categoryFilter = document.querySelector("#categoryFilter");
const startDateInput = document.querySelector("#startDate");
const endDateInput = document.querySelector("#endDate");
const rangeTitle = document.querySelector("#rangeTitle");
const dialog = document.querySelector("#eventDialog");
const eventForm = document.querySelector("#eventForm");
const eventId = document.querySelector("#eventId");
const eventTitle = document.querySelector("#eventTitle");
const eventDate = document.querySelector("#eventDate");
const eventTime = document.querySelector("#eventTime");
const eventLocation = document.querySelector("#eventLocation");
const eventNotes = document.querySelector("#eventNotes");
const eventCategory = document.querySelector("#eventCategory");
const dialogTitle = document.querySelector("#dialogTitle");
const deleteEventBtn = document.querySelector("#deleteEventBtn");

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(defaultState),
      ...parsed,
      categories: { ...defaultCategories, ...(parsed.categories || {}) },
      events: Array.isArray(parsed.events) ? parsed.events : defaultState.events,
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function sameDay(a, b) {
  return formatDate(a) === formatDate(b);
}

function formatRangeTitle() {
  const start = parseDate(state.startDate);
  const end = parseDate(state.endDate);
  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const months = startMonth === endMonth ? startMonth : `${startMonth}-${endMonth}`;
  rangeTitle.textContent = `${months} ${end.getFullYear()}`;
}

function buildCalendarDates() {
  const start = parseDate(state.startDate);
  const end = parseDate(state.endDate);
  const first = addDays(start, -start.getDay());
  const last = addDays(end, 6 - end.getDay());
  const dates = [];

  for (let day = first; day <= last; day = addDays(day, 1)) {
    dates.push(new Date(day));
  }

  return dates;
}

function getVisibleEvents(dateKey) {
  return state.events
    .filter((event) => event.date === dateKey)
    .filter((event) => activeFilter === "all" || event.category === activeFilter)
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function render() {
  startDateInput.value = state.startDate;
  endDateInput.value = state.endDate;
  formatRangeTitle();
  renderCategoryControls();
  renderCalendar();
}

function renderCategoryControls() {
  categoryStrip.innerHTML = "";
  categoryFilter.innerHTML = '<option value="all">All categories</option>';
  eventCategory.innerHTML = "";

  Object.entries(state.categories).forEach(([key, category]) => {
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
      state.categories[key].color = event.target.value;
      saveState();
      renderCalendar();
    });
    categoryStrip.append(pill);
  });

  categoryFilter.value = activeFilter;
}

function renderCalendar() {
  const tripStart = parseDate(state.startDate);
  const tripEnd = parseDate(state.endDate);
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
    getVisibleEvents(dateKey).forEach((event) => stack.append(createEventCard(event)));

    cell.querySelector(".add-day-button").addEventListener("click", () => openDialog({ date: dateKey }));
    cell.addEventListener("dragover", onDragOver);
    cell.addEventListener("dragleave", onDragLeave);
    cell.addEventListener("drop", onDrop);
    calendarGrid.append(cell);
  });
}

function createEventCard(event) {
  const category = state.categories[event.category] || defaultCategories.task;
  const card = document.createElement("button");
  card.type = "button";
  card.className = "event-card";
  card.dataset.id = event.id;
  card.style.setProperty("--event-color", category.color);
  card.style.borderLeftColor = category.color;

  const details = [event.time, event.location].filter(Boolean).join(" · ");
  card.innerHTML = `
    <span class="event-title">${escapeHtml(event.title)}</span>
    ${details ? `<span class="event-meta">${escapeHtml(details)}</span>` : ""}
  `;

  card.addEventListener("click", () => {
    if (!card.dataset.suppressClick) openDialog(event);
  });
  card.addEventListener("pointerdown", (pointerEvent) => startPointerDrag(pointerEvent, event.id));
  card.addEventListener("mousedown", (mouseEvent) => startMouseDrag(mouseEvent, event.id));
  card.addEventListener("touchstart", (touchEvent) => startTouchDrag(touchEvent, event.id), { passive: false });
  return card;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onDragOver(event) {
  event.preventDefault();
  event.currentTarget.classList.add("drop-target");
}

function onDragLeave(event) {
  event.currentTarget.classList.remove("drop-target");
}

function onDrop(event) {
  event.preventDefault();
  const id = event.dataTransfer.getData("text/plain");
  const item = state.events.find((entry) => entry.id === id);
  if (item) {
    item.date = event.currentTarget.dataset.date;
    saveState();
    renderCalendar();
  }
}

function startPointerDrag(event, id) {
  if (event.button !== 0) return;
  const card = event.currentTarget;
  beginDrag(card, id, event.clientX, event.clientY);
  card.setPointerCapture(event.pointerId);
  card.addEventListener("pointermove", onPointerMove);
  card.addEventListener("pointerup", onPointerEnd);
  card.addEventListener("pointercancel", onPointerEnd);
}

function startMouseDrag(event, id) {
  if (event.button !== 0 || pointerDrag) return;
  beginDrag(event.currentTarget, id, event.clientX, event.clientY);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseEnd);
}

function startTouchDrag(event, id) {
  if (pointerDrag) return;
  const touch = event.touches[0];
  beginDrag(event.currentTarget, id, touch.clientX, touch.clientY);
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onTouchEnd);
  document.addEventListener("touchcancel", onTouchEnd);
}

function beginDrag(card, id, startX, startY) {
  pointerDrag = {
    id,
    card,
    startX,
    startY,
    active: false,
    clone: null,
  };
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
    const item = state.events.find((entry) => entry.id === id);
    if (target && item) {
      item.date = target.dataset.date;
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
  const cell = document.elementFromPoint(x, y)?.closest(".day-cell");
  if (clone) clone.hidden = false;
  return cell;
}

function openDialog(event = {}) {
  const isEditing = Boolean(event.id);
  dialogTitle.textContent = isEditing ? "Edit item" : "Add item";
  eventId.value = event.id || "";
  eventTitle.value = event.title || "";
  eventDate.value = event.date || state.startDate;
  eventTime.value = event.time || "";
  eventLocation.value = event.location || "";
  eventNotes.value = event.notes || "";
  eventCategory.value = event.category || "task";
  deleteEventBtn.hidden = !isEditing;
  dialog.showModal();
}

function saveEvent() {
  const payload = {
    id: eventId.value || crypto.randomUUID(),
    title: eventTitle.value.trim(),
    date: eventDate.value,
    time: eventTime.value.trim(),
    location: eventLocation.value.trim(),
    notes: eventNotes.value.trim(),
    category: eventCategory.value,
  };

  const existingIndex = state.events.findIndex((event) => event.id === payload.id);
  if (existingIndex >= 0) state.events[existingIndex] = payload;
  else state.events.push(payload);
  saveState();
  render();
}

eventForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (!eventForm.reportValidity()) return;
  saveEvent();
  dialog.close();
});

deleteEventBtn.addEventListener("click", () => {
  state.events = state.events.filter((event) => event.id !== eventId.value);
  saveState();
  render();
  dialog.close();
});

document.querySelector("#addEventBtn").addEventListener("click", () => openDialog());

categoryFilter.addEventListener("change", (event) => {
  activeFilter = event.target.value;
  renderCalendar();
});

startDateInput.addEventListener("change", (event) => {
  state.startDate = event.target.value;
  saveState();
  render();
});

endDateInput.addEventListener("change", (event) => {
  state.endDate = event.target.value;
  saveState();
  render();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  state = structuredClone(defaultState);
  saveState();
  activeFilter = "all";
  render();
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "sydney-visa-trip-planner.json";
  link.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#importInput").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const text = await file.text();
  const imported = JSON.parse(text);
  state = {
    ...structuredClone(defaultState),
    ...imported,
    categories: { ...defaultCategories, ...(imported.categories || {}) },
  };
  saveState();
  render();
  event.target.value = "";
});

render();
