// QuickNotes scripts (Task 1: GET, Task 2: POST, Task 3: DELETE).
//
// NOTE: JSONPlaceholder is a practice API. It simulates POST and DELETE,
// but it does NOT permanently store created notes or deleted changes on
// the server. Created notes are only kept in this page's displayed list,
// and deleted notes are only removed from this page's display.

const API_URL = "https://jsonplaceholder.typicode.com/posts";

// --- Element references (script is loaded with `defer`, so DOM is ready) ---
const loadBtn = document.querySelector("#load-btn");
const statusEl = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitBtn = document.querySelector("#submit-btn");

/** Update the #status paragraph with a message and its visual kind. */
function setStatus(message, kind) {
  // kind is "success", "error" or undefined (plain/loading)
  statusEl.className = kind ? `status status-${kind}` : "status";
  statusEl.textContent = message;
}

/** Remove the empty-state item, if it is shown. */
function clearEmptyState() {
  const empty = notesList.querySelector(".empty-state");
  if (empty) empty.remove();
}

/** Show the empty-state message when there are no notes to display. */
function showEmptyState() {
  notesList.replaceChildren();
  const empty = document.createElement("li");
  empty.className = "empty-state";
  empty.textContent = "No notes to show. Use the buttons above to add some.";
  notesList.appendChild(empty);
  return empty;
}

/**
 * Reusable fetch helper.
 *
 * - Calls fetch(url, options)
 * - Throws a useful Error when the response is not ok
 * - Returns { data, status }:
 *     - data is the parsed JSON body (or null for 204 No Content)
 *     - status is the HTTP status code
 */
async function request(url, options = {}) {
  const response = await fetch(url, options);

  // 204 No Content: nothing to parse, treat data as empty
  if (response.status === 204) {
    return { data: null, status: 204 };
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status} (${response.statusText})`);
  }

  const data = await response.json();
  return { data, status: response.status };
}

/**
 * Build one note card (li) with title, body and a Delete button.
 * Uses createElement + textContent only. Never innerHTML, so note data
 * cannot inject markup into the page.
 */
function createNoteCard(note) {
  const item = document.createElement("li");

  const title = document.createElement("h3");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body;

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete";
  // Accessible label naming the exact note this button removes
  deleteBtn.setAttribute("aria-label", `Delete note: ${note.title}`);
  deleteBtn.addEventListener("click", () => deleteNote(note, deleteBtn, item));

  item.appendChild(title);
  item.appendChild(body);
  item.appendChild(deleteBtn);
  return item;
}

/** Render a list of notes (replaces any previous content). */
function renderNotes(notes) {
  if (!notes || notes.length === 0) {
    showEmptyState();
    return;
  }
  // replaceChildren clears old notes, so re-rendering never duplicates them
  notesList.replaceChildren();
  for (const note of notes) {
    notesList.appendChild(createNoteCard(note));
  }
}

/**
 * GET flow: load the first 10 notes and display them.
 */
async function loadNotes() {
  loadBtn.disabled = true;
  setStatus("Loading notes...");

  try {
    const { data: notes } = await request(`${API_URL}?_limit=10`);
    renderNotes(notes);

    if (notes && notes.length > 0) {
      setStatus(`Loaded ${notes.length} notes from the server.`, "success");
    } else {
      setStatus("No notes available yet.", "success");
    }
  } catch (error) {
    // Friendly message for the user; log details for debugging
    console.error("Failed to load notes:", error);
    setStatus("Sorry, we could not load the notes. Please try again.", "error");
  } finally {
    // Always restore the button, success or failure
    loadBtn.disabled = false;
  }
}

/**
 * POST flow: validate the form input, create the note and prepend it
 * to the displayed list.
 */
async function createNote(event) {
  event.preventDefault(); // stop the browser's default form submission

  const title = titleInput.value.trim(); // trim for the "is it empty?" check
  const body = bodyInput.value;

  // --- Validation: no request is sent when this fails ---
  if (!title) {
    setStatus("Please enter a title. The title is required.", "error");
    return;
  }
  if (title.length > 100) {
    setStatus("The title must be at most 100 characters.", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Creating note...");

  try {
    const { data: created, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    // JSONPlaceholder only simulates this POST: the note is not permanently
    // saved on the server. Keep it in the current page's list only.
    const card = createNoteCard(created);
    clearEmptyState();
    notesList.prepend(card); // on top, existing notes stay

    // Clear the form after a successful creation
    noteForm.reset();

    setStatus(`Note created (status ${status}, id ${created.id}).`, "success");
  } catch (error) {
    console.error("Failed to create note:", error);
    setStatus("Sorry, we could not create the note. Please try again.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

/**
 * DELETE flow: remove one note from the displayed list, or keep it
 * and show an error if the request fails.
 */
async function deleteNote(note, button, listItem) {
  button.disabled = true;
  setStatus("Deleting note...");

  try {
    const { status } = await request(`${API_URL}/${note.id}`, { method: "DELETE" });

    // JSONPlaceholder only simulates deletion: no data is permanently
    // removed on the server. Remove the note from this page's display only.
    listItem.remove();

    // If the last note is gone, show the empty state
    if (notesList.children.length === 0) {
      showEmptyState();
    }

    setStatus(`Note deleted (status ${status}, id ${note.id}).`, "success");
  } catch (error) {
    console.error("Failed to delete note:", error);
    setStatus("Sorry, we could not delete the note. Please try again.", "error");
    // On failure the note stays in the list; only re-enable the button
    // in finally (it may have been removed on success).
  } finally {
    if (button.isConnected) {
      button.disabled = false;
    }
  }
}

// --- Event listeners ---
loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);
