// Invoice view page – everything comes from /api/bill/bills/details/:id
(function () {
  const byId = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  const money = (v) =>
    "LKR " + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dash = (v) => (v === null || v === undefined || String(v).trim() === "" ? "—" : esc(v));

  const invoiceId = decodeURIComponent(window.location.pathname.split("/").pop());

  function showError(text) {
    byId("vbAlert").innerHTML = `<div class="alert alert-danger">${esc(text)}</div>`;
  }

  function renderHeader(d) {
    const inv = d.invoice;
    byId("hdrInvoice").textContent = "#" + inv.id;
    byId("invId").textContent = inv.id;
    byId("invDate").textContent = inv.date || "—";
    byId("invLocation").textContent = inv.location || "—";
    byId("invDelivery").textContent = inv.deliveryDate
      ? inv.deliveryDate + (inv.deliveryTime ? " " + inv.deliveryTime : "")
      : "—";

    const badge = byId("invStatus");
    badge.textContent = inv.status || "—";
    badge.className = "badge " + (Number(inv.statusId) === 1 ? "badge-unpaid" : "badge-paid");

    byId("btnPrint").href = "/api/bill/bills/View/print/" + encodeURIComponent(inv.id);
    byId("btnEditOrder").href = "/edit_order/" + encodeURIComponent(inv.id);
  }

  function renderCustomer(c) {
    byId("cName").textContent = c.name || "—";
    byId("cMobile").textContent = c.mobile || "—";
    byId("cMobile2").innerHTML = dash(c.mobile2);
    byId("cLand").innerHTML = dash(c.landline);
    byId("cEmail").innerHTML = dash(c.email);
    byId("cNic").innerHTML = dash(c.nic);
    byId("cAddress").innerHTML = dash(c.address);
  }

  function renderItems(d) {
    const rows = [];
    d.items.forEach((it) => {
      rows.push(`
        <tr>
          <td><span class="badge badge-light">Frame</span></td>
          <td>${esc(it.stockId)}</td>
          <td>#${esc(it.productCode)} ${esc(it.name)}<span class="cell-sub">${esc(it.brand)} ${esc(it.category)}</span></td>
          <td class="center">${esc(it.qty)}</td>
          <td class="num">${money(it.unitPrice)}</td>
          <td class="num">${money(it.lineTotal)}</td>
        </tr>`);
    });
    if (d.lens) {
      const l = d.lens;
      rows.push(`
        <tr>
          <td><span class="badge badge-light">Lens</span></td>
          <td>${esc(l.lensId)}</td>
          <td>${esc(l.code)}${l.supplier ? `<span class="cell-sub">${esc(l.supplier)}</span>` : ""}</td>
          <td class="center">${esc(l.qty)}</td>
          <td class="num">${money(l.unitPrice)}</td>
          <td class="num">${money(l.lineTotal)}</td>
        </tr>`);
    }
    byId("itemsBody").innerHTML =
      rows.join("") || `<tr><td colspan="6" class="empty">No items on this invoice</td></tr>`;
  }

  function renderPrescription(p) {
    const box = byId("rxBody");
    if (!p) {
      box.innerHTML = `<div class="empty">No prescription attached to this invoice</div>`;
      return;
    }
    const row = (label, e) => `
      <tr>
        <th>${label}</th>
        <td>${dash(e.sph)}</td><td>${dash(e.cyl)}</td><td>${dash(e.axis)}</td>
        <td>${dash(e.add)}</td><td>${dash(e.dva)}</td><td>${dash(e.nva)}</td>
        <td>${dash(e.pd)}</td><td>${dash(e.height)}</td>
      </tr>`;
    box.innerHTML = `
      <div class="rx-meta"><span><b>Job No:</b> #${esc(p.jobNo)}</span><span><b>Date:</b> ${dash(p.date)}</span></div>
      <div class="table-wrap">
        <table class="rx">
          <thead><tr><th></th><th>SPH</th><th>CYL</th><th>Axis</th><th>Add</th><th>DVA</th><th>NVA</th><th>PD</th><th>Height</th></tr></thead>
          <tbody>${row("Right (R)", p.right)}${row("Left (L)", p.left)}</tbody>
        </table>
      </div>`;
  }

  function renderPayments(d) {
    const t = d.totals;
    byId("payBody").innerHTML =
      d.payments
        .map(
          (p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${esc(p.date)}<span class="cell-sub">${esc(p.time)}</span></td>
          <td>${esc(p.method)}</td>
          <td class="num">${money(p.amount)}</td>
        </tr>`
        )
        .join("") || `<tr><td colspan="4" class="empty">No payments recorded</td></tr>`;

    byId("payTotal").textContent = money(t.paid);

    const pct = t.net > 0 ? Math.min(100, Math.round((t.paid / t.net) * 100)) : 0;
    const bar = byId("payBar");
    bar.style.width = pct + "%";
    bar.className = pct >= 75 ? "good" : pct >= 35 ? "mid" : "low";
    byId("payPct").textContent = pct + "% paid";
  }

  function renderTotals(t) {
    byId("tGross").textContent = money(t.gross);
    byId("tDiscount").textContent =
      money(t.discount) + (t.discountPercentage && t.discountPercentage.endsWith("%") ? ` (${t.discountPercentage})` : "");
    byId("tNet").textContent = money(t.net);
    byId("tPaid").textContent = money(t.paid);
    byId("tDue").textContent = money(t.due);
    byId("tDue").className = "amt " + (t.due > 0 ? "owed" : "clear");
    byId("tWarn").style.display = t.dueMismatch ? "block" : "none";
  }

  async function init() {
    try {
      const r = await fetch("/api/bill/bills/details/" + encodeURIComponent(invoiceId));
      if (r.status === 401) return (window.location = "/login");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return showError(d.error || "Failed to load the invoice.");

      renderHeader(d);
      renderCustomer(d.customer);
      renderItems(d);
      renderPrescription(d.prescription);
      renderPayments(d);
      renderTotals(d.totals);
    } catch (e) {
      console.error(e);
      showError("Failed to load the invoice. Please try again.");
    }
  }

  init();
})();