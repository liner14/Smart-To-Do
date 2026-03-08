/* ============================================================
   Smart To-Do List — script.js
   Clean, modular JavaScript with full comments.
   Features: CRUD, localStorage, filters, search, stats,
             dark/light toggle, drag-and-drop reorder, priorities.
   ============================================================ */

// ==================== DOM REFERENCES ====================

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const validationMsg = document.getElementById("validationMsg");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const themeToggle = document.getElementById("themeToggle");
const emptyState = document.getElementById("emptyState");

// Stats elements
const totalCount = document.getElementById("totalCount");
const completedCount = document.getElementById("completedCount");
const pendingCount = document.getElementById("pendingCount");

// Filter buttons
const filterButtons = document.querySelectorAll("[data-filter]");

// ==================== STATE ====================

/** @type {'all'|'completed'|'pending'} Current active filter */
let currentFilter = "all";

/** @type {string} Current search query */
let searchQuery = "";

/** @type {number|null} ID of the task currently being dragged */
let draggedId = null;

// ==================== LOCAL STORAGE HELPERS ====================

/**
 * Load tasks from localStorage.
 * Each task: { id: number, text: string, completed: boolean, priority: 'high'|'medium'|'low' }
 * @returns {Array} Array of task objects
 */
function loadTasks() {
  try {
    const data = localStorage.getItem("smartTodoTasks");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save the tasks array to localStorage.
 * @param {Array} tasks
 */
function saveTasks(tasks) {
  localStorage.setItem("smartTodoTasks", JSON.stringify(tasks));
}

/**
 * Load the saved theme preference, defaulting to 'dark'.
 * @returns {'dark'|'light'}
 */
function loadTheme() {
  return localStorage.getItem("smartTodoTheme") || "dark";
}

/**
 * Save the current theme preference.
 * @param {'dark'|'light'} theme
 */
function saveTheme(theme) {
  localStorage.setItem("smartTodoTheme", theme);
}

// ==================== STATS ====================

/**
 * Update the stats bar with current totals.
 */
function updateStats() {
  const tasks = loadTasks();
  const total = tasks.length;
  const completed = tasks.filter((t) => t.completed).length;
  const pending = total - completed;

  // Animate number changes with a small scale pulse
  animateNumber(totalCount, total);
  animateNumber(completedCount, completed);
  animateNumber(pendingCount, pending);
}

/**
 * Smoothly update a stat number element.
 * @param {HTMLElement} el
 * @param {number} value
 */
function animateNumber(el, value) {
  if (el.textContent !== String(value)) {
    el.textContent = value;
    el.style.transform = "scale(1.25)";
    setTimeout(() => {
      el.style.transition = "transform 0.3s";
      el.style.transform = "scale(1)";
    }, 50);
  }
}

// ==================== RENDERING ====================

/**
 * Render the visible task list based on the current filter and search query.
 * Re-creates all <li> elements from the stored task array.
 */
function renderTasks() {
  const tasks = loadTasks();

  // Apply filter
  let visible = tasks;
  if (currentFilter === "completed") {
    visible = tasks.filter((t) => t.completed);
  } else if (currentFilter === "pending") {
    visible = tasks.filter((t) => !t.completed);
  }

  // Apply search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    visible = visible.filter((t) => t.text.toLowerCase().includes(q));
  }

  // Clear existing list
  taskList.innerHTML = "";

  // Build each task item
  visible.forEach((task) => {
    const li = createTaskElement(task);
    taskList.appendChild(li);
  });

  // Toggle empty state
  emptyState.classList.toggle("visible", visible.length === 0);

  // Update statistics
  updateStats();
}

/**
 * Create a single <li> element for a task.
 * @param {Object} task - { id, text, completed, priority }
 * @returns {HTMLLIElement}
 */
function createTaskElement(task) {
  const li = document.createElement("li");
  li.className = `task-item${task.completed ? " completed" : ""}`;
  li.setAttribute("draggable", "true");
  li.dataset.id = task.id;

  li.innerHTML = `
    <!-- Priority bar -->
    <div class="task-item__priority task-item__priority--${task.priority}"></div>

    <!-- Checkbox -->
    <label class="task-item__check">
      <input type="checkbox" ${task.completed ? "checked" : ""} aria-label="Mark complete" />
      <span class="checkmark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
    </label>

    <!-- Task text -->
    <span class="task-item__text">${escapeHTML(task.text)}</span>

    <!-- Priority badge -->
    <span class="task-item__badge task-item__badge--${task.priority}">${task.priority}</span>

    <!-- Action buttons -->
    <div class="task-item__actions">
      <button class="btn-sm" title="Edit" aria-label="Edit task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-sm btn-sm--danger" title="Delete" aria-label="Delete task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
      </button>
    </div>
  `;

  // --- Event Listeners ---

  // Toggle complete
  li.querySelector('input[type="checkbox"]').addEventListener("change", () => {
    toggleComplete(task.id);
  });

  // Edit button
  li.querySelector(".btn-sm:first-child").addEventListener("click", () => {
    startEdit(li, task);
  });

  // Delete button
  li.querySelector(".btn-sm--danger").addEventListener("click", () => {
    deleteTask(task.id, li);
  });

  // Drag events
  li.addEventListener("dragstart", handleDragStart);
  li.addEventListener("dragend", handleDragEnd);
  li.addEventListener("dragover", handleDragOver);
  li.addEventListener("dragleave", handleDragLeave);
  li.addEventListener("drop", handleDrop);

  return li;
}

// ==================== CRUD OPERATIONS ====================

/**
 * Add a new task from the form input.
 * Validates that the input is not empty.
 */
function addTask(text, priority) {
  const tasks = loadTasks();

  const newTask = {
    id: Date.now(), // unique timestamp ID
    text: text,
    completed: false,
    priority: priority,
  };

  tasks.push(newTask);
  saveTasks(tasks);
  renderTasks();
}

/**
 * Delete a task by its ID with a removal animation.
 * @param {number} id
 * @param {HTMLLIElement} li - the DOM element to animate
 */
function deleteTask(id, li) {
  // Play exit animation, then remove from data
  li.classList.add("removing");
  li.addEventListener(
    "animationend",
    () => {
      const tasks = loadTasks().filter((t) => t.id !== id);
      saveTasks(tasks);
      renderTasks();
    },
    { once: true },
  );
}

/**
 * Toggle the completed status of a task.
 * @param {number} id
 */
function toggleComplete(id) {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks(tasks);
    renderTasks();
  }
}

/**
 * Enter inline-edit mode for a task.
 * Replaces the text span with an input field.
 * @param {HTMLLIElement} li
 * @param {Object} task
 */
function startEdit(li, task) {
  const textSpan = li.querySelector(".task-item__text");
  if (!textSpan) return;

  // Create input pre-filled with current text
  const input = document.createElement("input");
  input.type = "text";
  input.className = "task-item__edit-input";
  input.value = task.text;
  input.maxLength = 120;

  textSpan.replaceWith(input);
  input.focus();
  input.select();

  /** Save on Enter or blur */
  const save = () => {
    const newText = input.value.trim();
    if (newText && newText !== task.text) {
      const tasks = loadTasks();
      const t = tasks.find((t) => t.id === task.id);
      if (t) {
        t.text = newText;
        saveTasks(tasks);
      }
    }
    renderTasks();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") renderTasks(); // cancel
  });

  input.addEventListener("blur", save, { once: true });
}

// ==================== FILTERS & SEARCH ====================

/**
 * Set the active filter and re-render.
 * @param {'all'|'completed'|'pending'} filter
 */
function setFilter(filter) {
  currentFilter = filter;

  // Update active button styling
  filterButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });

  renderTasks();
}

// ==================== THEME TOGGLE ====================

/**
 * Toggle between dark and light themes.
 * Persists choice in localStorage.
 */
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  saveTheme(next);
}

// ==================== DRAG & DROP ====================

/**
 * Handle drag start — store the dragged task's ID.
 * @param {DragEvent} e
 */
function handleDragStart(e) {
  draggedId = Number(this.dataset.id);
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
}

/** Remove dragging style when drag ends. */
function handleDragEnd() {
  this.classList.remove("dragging");
  draggedId = null;
  // Remove all drag-over classes
  document
    .querySelectorAll(".drag-over")
    .forEach((el) => el.classList.remove("drag-over"));
}

/** Allow drop and show visual cue. */
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  this.classList.add("drag-over");
}

/** Remove visual cue when dragging leaves. */
function handleDragLeave() {
  this.classList.remove("drag-over");
}

/**
 * Handle drop — reorder the tasks array and re-render.
 * @param {DragEvent} e
 */
function handleDrop(e) {
  e.preventDefault();
  this.classList.remove("drag-over");

  const droppedOnId = Number(this.dataset.id);
  if (draggedId === null || draggedId === droppedOnId) return;

  const tasks = loadTasks();
  const fromIndex = tasks.findIndex((t) => t.id === draggedId);
  const toIndex = tasks.findIndex((t) => t.id === droppedOnId);

  if (fromIndex === -1 || toIndex === -1) return;

  // Remove dragged item and insert at new position
  const [moved] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, moved);

  saveTasks(tasks);
  renderTasks();
}

// ==================== UTILITY ====================

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ==================== EVENT BINDINGS ====================

// Form submission — add new task
taskForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const text = taskInput.value.trim();

  // Input validation
  if (!text) {
    validationMsg.textContent = "⚠️ Please enter a task description.";
    taskInput.classList.add("shake");
    taskInput.addEventListener(
      "animationend",
      () => taskInput.classList.remove("shake"),
      { once: true },
    );
    return;
  }

  validationMsg.textContent = "";
  addTask(text, prioritySelect.value);
  taskInput.value = "";
  taskInput.focus();
});

// Live search
searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderTasks();
});

// Filter buttons
filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

// Theme toggle
themeToggle.addEventListener("click", toggleTheme);

// ==================== INITIALISATION ====================

/**
 * Boot the app: apply saved theme, then render tasks.
 */
function init() {
  // Apply persisted theme
  document.documentElement.setAttribute("data-theme", loadTheme());

  // Render stored tasks
  renderTasks();
}

// Run on DOM ready
init();
