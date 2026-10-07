const actState = { page: 1, pageSize: 20, total: 0 };

function actEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function actMessageRow(html) {
  return `<tr><td colspan="7" class="text-center">${html}</td></tr>`;
}

function actPriorityBadge(id, label) {
  const colors = { 1: "danger", 2: "warning", 3: "secondary" };
  const color = colors[id] || "light";
  return `<span class="badge badge-${color}">${actEscape(label || "-")}</span>`;
}

function actInitials(fname, lname) {
  const a = (fname || "").trim().charAt(0);
  const b = (lname || "").trim().charAt(0);
  return (a + b).toUpperCase() || "?";
}

function getActivityFilters() {
  return {
    search: document.getElementById("a-search").value.trim(),
    priority: document.getElementById("a-priority").value,
    dateFrom: document.getElementById("a-date-from").value,
    dateTo: document.getElementById("a-date-to").value,
  };
}

async function loadActivities(page = 1) {
  const tableBody = document.getElementById("activity-table-body");

  tableBody.innerHTML = actMessageRow(
    `<div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div>`
  );

  const filters = getActivityFilters();
  const params = { ...filters, page, pageSize: actState.pageSize };
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null)
  );
  const qs = new URLSearchParams(clean).toString();

  try {
    const result = await fetch("/api/activity/list?" + qs, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!result.ok) throw new Error("HTTP " + result.status);

    const data = await result.json();
    const rows = data.rows || [];

    actState.page = data.page;
    actState.total = data.total;

    document.getElementById("a-total").textContent =
      data.total + (data.total === 1 ? " activity" : " activities");

    if (rows.length === 0) {
      tableBody.innerHTML = actMessageRow(
        `<span class="text-muted">No activities found</span>`
      );
      renderActivityPager();
      return;
    }

    tableBody.innerHTML = rows
      .map((a) => {
        const fullName =
          [a.fname, a.lname].filter(Boolean).join(" ") || a.username || "Unknown";

        return `
          <tr>
            <td>${actEscape(a.log_id)}</td>
            <td>
              <div class="d-flex align-items-center">
                <div class="act-avatar">${actEscape(actInitials(a.fname, a.lname))}</div>
                <div>
                  <div class="font-weight-bold">${actEscape(fullName)}</div>
                  <small class="text-muted">@${actEscape(a.username)}</small>
                </div>
              </div>
            </td>
            <td>${actEscape(a.user_type || "-")}</td>
            <td>${actEscape(a.location_name || "-")}</td>
            <td>${actPriorityBadge(a.activity_priority_id, a.priority)}</td>
            <td>${actEscape(a.date || "-")}</td>
            <td><div class="act-text">${actEscape(a.log_text)}</div></td>
          </tr>`;
      })
      .join("");

    renderActivityPager();
  } catch (err) {
    console.error("Error fetching activities:", err);
    tableBody.innerHTML = actMessageRow(
      `<span class="text-danger">Failed to load activities</span>`
    );
  }
}

function renderActivityPager() {
  const totalPages = Math.max(Math.ceil(actState.total / actState.pageSize), 1);
  const start = actState.total === 0 ? 0 : (actState.page - 1) * actState.pageSize + 1;
  const end = Math.min(actState.page * actState.pageSize, actState.total);

  document.getElementById("a-page-info").textContent =
    `Showing ${start}-${end} of ${actState.total} (page ${actState.page} of ${totalPages})`;

  document.getElementById("a-prev").disabled = actState.page <= 1;
  document.getElementById("a-next").disabled = actState.page >= totalPages;
}

function changeActivityPage(delta) {
  const totalPages = Math.max(Math.ceil(actState.total / actState.pageSize), 1);
  const next = actState.page + delta;
  if (next < 1 || next > totalPages) return;
  loadActivities(next);
}

function applyActivityFilters() {
  const f = getActivityFilters();
  if (f.dateFrom && f.dateTo && f.dateFrom > f.dateTo) {
    alert("'Date From' cannot be after 'Date To'");
    return;
  }
  loadActivities(1);
}

function resetActivityFilters() {
  ["a-search", "a-priority", "a-date-from", "a-date-to"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
  loadActivities(1);
}

// press Enter in the search box to search
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("a-search");
  if (el) {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") applyActivityFilters();
    });
  }
});