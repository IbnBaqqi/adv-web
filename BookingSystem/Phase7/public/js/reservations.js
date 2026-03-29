// Authorization

import {
  initAuthUI,
  getUserRole,
  requireAuthOrBlockPage,
  logout,
} from "./auth-ui.js";
initAuthUI();
if (!requireAuthOrBlockPage()) throw new Error("Authentication required");
window.logout = logout;

// DOM references
const formMessageEl = document.getElementById("formMessage");
const reservationIdEl = document.getElementById("reservationId");
const listEl = document.getElementById("reservationList");
const actionsEl = document.getElementById("reservationActions");

const role = getUserRole();
let formMode = "create";
let cache = [];

// Message helpers
function showMsg(type, text) {
  if (!formMessageEl) return;
  formMessageEl.className =
    "mt-6 rounded-2xl border px-4 py-3 text-sm whitespace-pre-line";
  formMessageEl.classList.remove("hidden");
  const map = {
    success: ["border-emerald-200", "bg-emerald-50", "text-emerald-900"],
    error: ["border-rose-200", "bg-rose-50", "text-rose-900"],
  };
  formMessageEl.classList.add(...(map[type] ?? map.error));
  formMessageEl.textContent = text;
  formMessageEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearMsg() {
  if (!formMessageEl) return;
  formMessageEl.textContent = "";
  formMessageEl.classList.add("hidden");
}

// Button helpers
const BTN =
  "w-full rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-200 ease-out bg-brand-primary text-white hover:bg-brand-dark/80 shadow-soft";

function renderButtons() {
  actionsEl.innerHTML = "";
  if (formMode === "create") {
    actionsEl.innerHTML = `
      <button type="submit" name="action" value="create" class="${BTN}">Create</button>
      <button type="button" id="clearBtn" class="${BTN}">Clear</button>`;
    document.getElementById("clearBtn").addEventListener("click", () => {
      clearForm();
      clearMsg();
    });
  } else {
    actionsEl.innerHTML = `
      <button type="submit" name="action" value="update" class="${BTN}">Update</button>
      <button type="submit" name="action" value="delete" class="${BTN}">Delete</button>
      <button type="button" id="clearBtn" class="${BTN}">New</button>`;
    document.getElementById("clearBtn").addEventListener("click", () => {
      clearForm();
      clearMsg();
    });
  }
}

// Form helpers
function getPayload() {
  return {
    resourceId: document.getElementById("resourceId").value,
    userId: document.getElementById("userId").value,
    startTime: document.getElementById("startTime").value,
    endTime: document.getElementById("endTime").value,
    note: document.getElementById("note").value,
    status: document.getElementById("status").value,
  };
}

function fillForm(r) {
  reservationIdEl.value = r.id;
  document.getElementById("resourceId").value = r.resource_id;
  document.getElementById("userId").value = r.user_id;
  // Convert ISO to datetime-local format (trim seconds+Z)
  document.getElementById("startTime").value = r.start_time?.slice(0, 16) ?? "";
  document.getElementById("endTime").value = r.end_time?.slice(0, 16) ?? "";
  document.getElementById("note").value = r.note ?? "";
  document.getElementById("status").value = r.status ?? "active";
  formMode = "edit";
  renderButtons();
}

function clearForm() {
  reservationIdEl.value = "";
  ["resourceId", "userId", "startTime", "endTime", "note"].forEach((id) => {
    document.getElementById(id).value = "";
  });
  document.getElementById("status").value = "active";
  formMode = "create";
  renderButtons();
}

// List rendering
function renderList(items) {
  if (!listEl) return;
  if (!items.length) {
    listEl.innerHTML = `<p class="text-sm text-black/50">No reservations found.</p>`;
    return;
  }
  listEl.innerHTML = items
    .map(
      (r) => `
    <button type="button" data-id="${r.id}"
      class="w-full text-left rounded-2xl border border-black/10 bg-white px-4 py-3 transition hover:bg-black/5">
      <div class="font-semibold text-sm truncate">#${r.id} — ${r.resource_name ?? r.resource_id}</div>
      <div class="text-xs text-black/50 mt-1">${r.start_time?.slice(0, 16) ?? ""} → ${r.end_time?.slice(0, 16) ?? ""}</div>
      <div class="text-xs text-black/50">${r.user_email ?? ""} · ${r.status ?? ""}</div>
    </button>`,
    )
    .join("");

  listEl.querySelectorAll("[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      clearMsg();
      const item = cache.find((x) => String(x.id) === btn.dataset.id);
      if (item) {
        fillForm(item);
        highlightItem(item.id);
      }
    });
  });
}

function highlightItem(id) {
  listEl?.querySelectorAll("[data-id]").forEach((el) => {
    const sel = String(el.dataset.id) === String(id);
    el.classList.toggle("ring-2", sel);
    el.classList.toggle("ring-brand-blue/40", sel);
    el.classList.toggle("bg-brand-blue/5", sel);
  });
}

// 6) API calls

async function loadReservations() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch("/api/reservations", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const body = await res.json().catch(() => ({}));
    cache = Array.isArray(body.data) ? body.data : [];
    renderList(cache);
  } catch {
    renderList([]);
  }
}

// Form submit
document
  .getElementById("reservationForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const action = e.submitter?.value ?? "create";
    const payload = getPayload();
    const id = reservationIdEl.value;
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    clearMsg();

    let method = "POST",
      url = "/api/reservations",
      body = JSON.stringify(payload);
    if (action === "update") {
      method = "PUT";
      url = `/api/reservations/${id}`;
    }
    if (action === "delete") {
      method = "DELETE";
      url = `/api/reservations/${id}`;
      body = null;
    }

    try {
      const res = await fetch(url, {
        method,
        headers: body ? headers : { Authorization: headers.Authorization },
        body,
      });
      const data =
        res.status === 204 ? null : await res.json().catch(() => null);

      if (!res.ok) {
        showMsg("error", data?.error ?? `Request failed (${res.status})`);
        return;
      }

      const msgs = {
        create: "Reservation created!",
        update: "Reservation updated!",
        delete: "Reservation deleted!",
      };
      showMsg("success", msgs[action]);
      clearForm();
      await loadReservations();
    } catch {
      showMsg("error", "Network error. Could not reach the server.");
    }
  });

// Init
renderButtons();
loadReservations();
