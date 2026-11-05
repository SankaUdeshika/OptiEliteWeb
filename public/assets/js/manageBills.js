// Invoice Management page – filters + invoice table (self-contained)
(function () {
  const byId = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const money = (v) =>
    "LKR " + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const initials = (name) =>
    String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";

  const FILTER_IDS = ["f-invoice-id", "f-customer-name", "f-mobile", "f-status", "f-date-from", "f-date-to"];
  const body = byId("billsBody");

  const messageRow = (html, cls = "") => `<tr><td colspan="7" class="empty ${cls}">${html}</td></tr>`;

  function getFilters() {
    return {
      invoiceId: byId("f-invoice-id").value.trim(),
      customerName: byId("f-customer-name").value.trim(),
      mobile: byId("f-mobile").value.trim(),
      status: byId("f-status").value,
      dateFrom: byId("f-date-from").value,
      dateTo: byId("f-date-to").value,
    };
  }

  function setStats(bills) {
    const pending = bills.filter((b) => Number(b.payment_status_id) === 1).length;
    const due = bills.reduce((s, b) => s + (Number(b.total_price) > 0 ? Number(b.total_price) : 0), 0);
    byId("stCount").textContent = bills.length;
    byId("stPending").textContent = pending;
    byId("stComplete").textContent = bills.length - pending;
    byId("stDue").textContent = money(due);
    byId("resultCount").textContent = bills.length + (bills.length === 1 ? " invoice" : " invoices");
  }

  function progressOf(bill) {
    const net = parseFloat(bill.subtotal);
    const paid = parseFloat(bill.payment_amount);
    if (!(net > 0) || !isFinite(paid)) return { pct: NaN, cls: "na" };
    const pct = Math.round((paid / net) * 100);
    return { pct, cls: pct >= 75 ? "good" : pct >= 35 ? "mid" : "low" };
  }

  function rowHtml(bill) {
    const id = bill.invoice_id;
    const pr = progressOf(bill);
    const width = isNaN(pr.pct) ? 0 : Math.min(Math.max(pr.pct, 0), 100);
    const pending = Number(bill.payment_status_id) === 1;
    const viewUrl = "/api/bill/bills/View/" + encodeURIComponent(id);
    const editUrl = "/edit_order/" + encodeURIComponent(id);

    return `
      <tr>
        <td><a class="row-link" href="${viewUrl}">${esc(id)}</a></td>
        <td>
          <div class="person">
            <span class="avatar-sm">${esc(initials(bill.name))}</span>
            <span>${esc(bill.name)}<span class="cell-sub">${esc(bill.customer_mobile)}</span></span>
          </div>
        </td>
        <td>${esc(bill.date)}</td>
        <td class="num">${money(bill.subtotal)}</td>
        <td>
          <div class="oe-progress"><span class="${pr.cls}" style="width:${width}%"></span></div>
          <div class="progress-meta">
            <span>${isNaN(pr.pct) ? "N/A" : pr.pct + "% paid"}</span>
            <span>Due ${money(bill.total_price)}</span>
          </div>
        </td>
        <td><span class="badge ${pending ? "badge-unpaid" : "badge-paid"}">${pending ? "Pending" : "Complete"}</span></td>
        <td class="num">
          <div class="btn-group" style="justify-content:flex-end">
            <a class="oe-btn sm" href="${viewUrl}"><i class="far fa-eye"></i> View</a>
            <a class="oe-btn sm primary" href="${editUrl}"><i class="fas fa-edit"></i> Edit</a>
          </div>
        </td>
      </tr>`;
  }

  async function loadBills(filters = {}) {
    body.innerHTML = messageRow(`<span class="spinner"></span>`);

    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v != null));
    const qs = new URLSearchParams(clean).toString();

    try {
      const r = await fetch("/api/bill/bills" + (qs ? "?" + qs : ""));
      if (r.status === 401) return (window.location = "/login");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();

      // the backend answers the string "No Result" when nothing matches
      if (!Array.isArray(data) || data.length === 0) {
        setStats([]);
        body.innerHTML = messageRow("No invoices found");
        return;
      }
      setStats(data);
      body.innerHTML = data.map(rowHtml).join("");
    } catch (err) {
      console.error("Error fetching bills:", err);
      body.innerHTML = messageRow("Failed to load invoices", "error");
    }
  }

  function applyFilters() {
    const f = getFilters();
    if (f.dateFrom && f.dateTo && f.dateFrom > f.dateTo) {
      alert("'Date from' cannot be after 'Date to'");
      return;
    }
    loadBills(f);
  }

  function resetFilters() {
    FILTER_IDS.forEach((id) => (byId(id).value = ""));
    loadBills();
  }

  byId("btnSearch").addEventListener("click", applyFilters);
  byId("btnReset").addEventListener("click", resetFilters);
  ["f-invoice-id", "f-customer-name", "f-mobile"].forEach((id) =>
    byId(id).addEventListener("keydown", (e) => { if (e.key === "Enter") applyFilters(); })
  );
  byId("f-status").addEventListener("change", applyFilters);

  loadBills();
})();