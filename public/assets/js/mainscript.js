const { getBranchLocation } = require("../../../controllers/branchController");

// User Login Function
async function Login() {
  let username = document.getElementById("username").value;
  let password = document.getElementById("password").value;

  if (username == "") {
    alert("please Enter a Username ");
  } else if (password == "") {
    alert("please Enter a Password ");
  } else {
    console.log("send login request");

    const result = await fetch("user/login", {
      method: "POST",
      body: JSON.stringify({
        username: username,
        password: password,
      }),
      headers: {
        "Content-type": "application/json",
      },
    });
    if (result.ok) {
      const response = await result.text();
      if (response == "Invalid") {
        document.getElementById("errormessage").innerHTML =
          "Invalid User Details, Please Try again later";
      } else {
        const locations = JSON.parse(response);
        console.log("Locations received:", locations);
        const locationDiv = document.getElementById("locationdiv");
        locationDiv.innerHTML = ""; // Clear previous content
        locations.forEach((loc) => {
          locationDiv.innerHTML += `<button class="btn btn-outline-danger" onclick="setUserLocation('${loc.id}')">${loc.location_name}</button>`;
        });

        // Get the modal element
        var myModal = new bootstrap.Modal(
          document.getElementById("exampleModal"),
        );
        myModal.show();
      }
    }
  }
}
// set user Location
async function setUserLocation(location_id) {
  const result = await fetch("user/updateLocation", {
    method: "POST",
    body: JSON.stringify({
      location_id: location_id,
    }),
    headers: {
      "Content-type": "application/json",
    },
  });

  if (result.ok) {
    const response = await result.json();
    if (response.success) {
      window.location = "/";
    } else {
      alert("Failed to set location. Please try again.");
    }
  }
}

// ----------------------------------------------------------------------------------
// load Index Page Data
async function loadIndexPage() {
  await fetchBranchStatus();
  await getUserDetails();
}

// get UserDetails
async function getUserDetails() {
  const result = await fetch("user/getUserDetails", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (result.ok) {
    const response = await result.json();
    // console.log("User details received:", response.userbane);
  } else {
    console.error("Failed to fetch user details:", result.status);
  }
}

// fetch Branch Details
async function fetchBranchStatus() {
  try {
    const result = await fetch("branch/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!result.ok) {
      console.error("Failed to fetch branch data:", result.status);
      return;
    }

    const response = await result.json();
    const locations = response.locations;

    if (!locations || locations.length === 0) {
      console.warn("No branch locations returned.");
      return;
    }

    const container = document.getElementById("render-target");

    // ✅ Fix #3: build HTML string first, set innerHTML once
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const currentMonthIndex = new Date().getMonth(); // 0-based
    const currentMonthName = monthNames[currentMonthIndex]; // ✅ Fix #4

    // ✅ Fix #6: currency formatter
    const formatCurrency = (value) =>
      Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    let html = "";

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i]; // cleaner reference

      html += `
        <div class="row">
          <div class="col-12">
            <div class="card card-statistic-2 border-0 shadow-sm rounded-lg mb-4">
              <div class="card-header d-flex justify-content-between align-items-center border-bottom py-3 px-4">
                <h4 class="m-0 text-muted" style="font-size: 1.1rem;">
                  <span class="text-primary mr-1"><i class="fas fa-map-marker-alt"></i></span>
                  <span style="color: purple; font-weight: 700;">${loc.location_name}</span>
                  <small class="text-dark ml-1">Order Statistics</small>
                </h4>

                <div class="dropdown d-inline">
                  <button class="btn btn-outline-primary btn-sm dropdown-toggle font-weight-600"
                          type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    ${currentMonthName}
                  </button>
                  <div class="dropdown-menu dropdown-menu-right">
                    <div class="dropdown-title">Select Month</div>
                    ${monthNames
                      .map(
                        (name, idx) => `
                      <a href="#" class="dropdown-item ${idx === currentMonthIndex ? "active" : ""}"
                         onclick="ChangeMonthForBranchStatus(${idx + 1})">
                        ${name}
                      </a>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              </div>

              <div class="card-body d-flex align-items-center p-4">
                <div class="card-icon shadow-primary bg-primary text-white mr-4">
                  <i class="fas fa-shopping-bag"></i>
                </div>

                <div class="card-wrap flex-grow-1">
                  <div class="text-muted small font-weight-bold text-uppercase mb-1">Estimated Total Sale</div>
                  <div class="h3 font-weight-bold mb-0 text-dark">
                    ${formatCurrency(loc.estimated_total_sale)}
                  </div>
                </div>

                <div class="card-stats d-flex border-left pl-4">
                  <div class="card-stats-item px-3 text-center">
                    <div class="font-weight-bold text-dark h5 mb-0">${loc.order_count}</div>
                    <div class="text-muted small">Orders</div>
                  </div>
                  <div class="card-stats-item px-3 text-center">
                    <div class="font-weight-bold text-success h5 mb-0">${formatCurrency(loc.total_cash_collected)}</div>
                    <div class="text-muted small">Cash Collected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = html; // ✅ Fix #3: single DOM write
  } catch (err) {
    // ✅ Fix #5: catch network or parse errors
    console.error("Error fetching branch status:", err);
  }
}

async function ChangeMonthForBranchStatus() {
  const dateInput = document.getElementById("startDate").value;

  // ✅ Fix #1: validate before sending
  if (!dateInput || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    alert("Please select a valid date (YYYY-MM-DD) before filtering.");
    return;
  }

  try {
    const result = await fetch("branch/fetchMonth", {
      method: "POST",
      body: JSON.stringify({ dateInput }),
      headers: { "Content-Type": "application/json" },
    });

    // ✅ Fix #5: handle failed response
    if (!result.ok) {
      console.error("Failed to fetch branch data:", result.status);
      return;
    }

    const response = await result.json();
    const locations = response.locations;

    if (!locations || locations.length === 0) {
      console.warn("No branch locations returned.");
      return;
    }

    // ✅ Fix #4: derive selected month name from dateInput
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    const selectedMonthIndex = new Date(dateInput).getMonth(); // 0-based
    const selectedMonthName = monthNames[selectedMonthIndex];

    // ✅ Fix #6: currency formatter
    const formatCurrency = (value) =>
      Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    // ✅ Fix #2: build full HTML string, set innerHTML once
    let html = "";

    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];

      html += `
        <div class="row">
          <div class="col-12">
            <div class="card card-statistic-2 border-0 shadow-sm rounded-lg mb-4">
              <div class="card-header d-flex justify-content-between align-items-center border-bottom py-3 px-4">
                <h4 class="m-0 text-muted" style="font-size: 1.1rem;">
                  <span class="text-primary mr-1"><i class="fas fa-map-marker-alt"></i></span>
                  <span style="color: purple; font-weight: 700;">${loc.location_name}</span>
                  <small class="text-dark ml-1">Order Statistics</small>
                </h4>

                <div class="dropdown d-inline">
                  <button class="btn btn-outline-primary btn-sm dropdown-toggle font-weight-600"
                          type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                    ${selectedMonthName}
                  </button>
                  <div class="dropdown-menu dropdown-menu-right">
                    <div class="dropdown-title">Select Month</div>
                    ${monthNames
                      .map(
                        (name, idx) => `
                      <a href="#" class="dropdown-item ${idx === selectedMonthIndex ? "active" : ""}"
                         onclick="ChangeMonthForBranchStatus()">
                        ${name}
                      </a>
                    `,
                      )
                      .join("")}
                  </div>
                </div>
              </div>

              <div class="card-body d-flex align-items-center p-4">
                <div class="card-icon shadow-primary bg-primary text-white mr-4">
                  <i class="fas fa-shopping-bag"></i>
                </div>

                <div class="card-wrap flex-grow-1">
                  <div class="text-muted small font-weight-bold text-uppercase mb-1">Estimated Total Sale</div>
                  <div class="h3 font-weight-bold mb-0 text-dark">
                    ${formatCurrency(loc.estimated_total_sale)}
                  </div>
                </div>

                <div class="card-stats d-flex border-left pl-4">
                  <div class="card-stats-item px-3 text-center">
                    <div class="font-weight-bold text-dark h5 mb-0">${loc.order_count}</div>
                    <div class="text-muted small">Orders</div>
                  </div>
                  <div class="card-stats-item px-3 text-center">
                    <div class="font-weight-bold text-success h5 mb-0">${formatCurrency(loc.total_cash_collected)}</div>
                    <div class="text-muted small">Cash Collected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    document.getElementById("render-target").innerHTML = html; // ✅ Fix #2: single DOM write
  } catch (err) {
    // ✅ Fix #5: catch network or parse errors
    console.error("Error in ChangeMonthForBranchStatus:", err);
  }
}

async function loadBills() {
  const result = await fetch("api/bill/bills", {
    method: "GET",
    headers: { "Content-type": "application/json" },
  });

  if (result.ok) {
    const response = await result.json();

    const tableBody = document.getElementById("sortable-table-body");

    response.forEach((bill) => {
      const {
        invoice_id: invoiceId,
        name: customerName,
        total_price: totalAmount,
        subtotal: subTotal,
        payment_amount: payAmount,
        date,
        payment_status_id: status,
        invoice_location: billLocation,
      } = bill;

      const payingPercentage = (payAmount / subTotal) * 100;
      var Percentage = Math.round(payingPercentage * 100) / 100;

      let bgColor, color, avatar;

      // Define thresholds and related properties
      if (Percentage <= 100 && Percentage >= 75) {
        bgColor = "bg-success";
        color = "success";
        avatar = "assets/img/avatar/avatar-2.png";
      } else if (Percentage < 75 && Percentage >= 35) {
        bgColor = "bg-warning";
        color = "warning";
        avatar = "assets/img/avatar/avatar-4.png";
      } else if (Percentage < 35) {
        bgColor = "bg-danger";
        color = "danger";
        avatar = "assets/img/avatar/avatar-5.png";
      } else {
        bgColor = "bg-secondary";
        color = "secondary";
        avatar = "assets/img/avatar/avatar-1.png";
      }

      const rowHtml = `
              <tr>
                <td>
                  <div class="sort-handler">
                    <i class="fas fa-th"></i>
                  </div>
                </td>
                <td>${invoiceId}</td>
                <td class="align-middle">
                  <div class="progress" data-height="4" data-toggle="tooltip" title="${payingPercentage}%">
                    <div class="progress-bar  ${bgColor}" role="progressbar" style="width: ${payingPercentage}%" aria-valuenow="${payingPercentage}" aria-valuemin="0" aria-valuemax="100"></div>
                  </div>
                </td>
                <td>
                  <img alt="image" src="${avatar}"
                    class="rounded-circle" width="35"
                    data-toggle="tooltip" title="${customerName}" />
                    <span>${customerName}</span>
                </td>
                <td>${date}</td>
                <td><div class="badge badge-${color}">${
                  status == 1 ? "Pending" : "Complete"
                }</div></td>
                <td><a href="#" class="btn btn-secondary" onclick="ViewBill(${invoiceId})" >Detail</a></td>
              </tr>
              `;

      tableBody.insertAdjacentHTML("beforeend", rowHtml);
    });
    document.getElementById("loading-row").remove();
  } else {
    console.log("Error fetching bills");
  }
}

// Page Redirects
async function Openinvoice() {
  const currentURL = window.location.pathname;
  const invoiceId = currentURL.split("/").pop();

  console.log("print invoice " + invoiceId);
  window.location = "/api/bill/bills/View/print/" + invoiceId;
}

function GoBillManagement() {
  window.location = "/manage_bills";
}

function ViewBill(invoiceId) {
  window.location = "/api/bill/bills/View/" + invoiceId;
}

function fetchInvoiceDetails() {
  loadInvoice();
  loadProductStock();
  loadLensStock();
  loadPaymentHistory();
  fetchActions();
}

// Load Functions
async function loadInvoice() {
  const currentURL = window.location.pathname;
  const invoiceId = currentURL.split("/").pop();

  const result = await fetch("/api/bill/bills/loadData", {
    method: "POST",
    body: JSON.stringify({ invoiceId }),
    headers: { "Content-Type": "application/json" },
  });

  if (result.ok) {
    const response = await result.json();

    //invoice
    const invoice_id = response[0].invoice_id;
    const date = response[0].date;
    const subtotal = response[0].subtotal;
    const total_due = response[0].total_price;
    const discount = response[0].discount;
    const advance_payment = response[0].advance_payment;
    const payment_amount = response[0].payment_amount;
    const payment_method_Payment_id = response[0].payment_method_Payment_id;
    const prescription_details_job_no = response[0].prescription_details_job_no;
    const customer_mobile = response[0].mobile;
    const lenstotal = response[0].lenstotal;
    const JobType_job_id = response[0].JobType_job_id;
    const description = response[0].description;
    const payment_status_id = response[0].payment_status_id;
    const payment_status = response[0].status_name;
    const job_warrenty_warrenty_id = response[0].job_warrenty_warrenty_id;
    const delivery_date = response[0].delivery_date;
    const delivery_time = response[0].delivery_time;
    const lens_stock_lens_id = response[0].lens_stock_lens_id;
    const lens_Qty = response[0].lens_Qty;
    const bags = response[0].bag;
    const box = response[0].box;
    const clothing = response[0].clothing;
    const invoice_location = response[0].location_name;
    const isAccessories = response[0].isAccessories;
    const total = Number(subtotal) + Number(discount);

    // customer
    const customer_name = response[0].name;
    const customer_email = response[0].email;
    const customer_address = response[0].address_line1;
    const address_line2 = response[0].address_line2;

    const mobile2 = response[0].mobile2;
    const telephone_land = response[0].telephone_land;
    const nic = response[0].nic;
    const birthday = response[0].birthday;

    const customer_filenumber = response[0].filenumber;
    const register_date = response[0].register_date;
    const location_id = response[0].location_id;

    const notes = response[0].notes;
    // const added_by = response[0].added_by;

    //inner html
    document.getElementById("invoiced_number").innerHTML = "Issued : " + date;
    document.getElementById("customer_Name").innerHTML = customer_name;
    document.getElementById("customer_address").innerHTML = customer_address;
    document.getElementById("customer-mobile").innerHTML = customer_mobile;
    document.getElementById("customer_email").innerHTML = customer_email;
    document.getElementById("invoice_id").innerHTML = invoice_id;
    document.getElementById("subtotoal").innerHTML = "LKR " + subtotal;
    document.getElementById("discount").innerHTML = "LKR " + discount;
    document.getElementById("advance").innerHTML = "LKR " + advance_payment;
    document.getElementById("payamount").innerHTML = "LKR " + payment_amount;
    document.getElementById("due").innerHTML = "LKR " + total_due;
    document.getElementById("total").innerHTML = "LKR " + total;

    prescription_details_job_no == "" || prescription_details_job_no == null
      ? (document.getElementById("prescription_details").innerHTML =
          "No Prescription")
      : (document.getElementById("prescription_details").innerHTML =
          prescription_details_job_no);
    document.getElementById("invoice_status").innerHTML = payment_status;
    payment_status_id == 1
      ? (document.getElementById("invoice_status").className =
          "fw-semibold badge bg-warning")
      : (document.getElementById("invoice_status").className =
          "fw-semibold badge bg-success");
    document.getElementById("invoice_location").innerHTML = invoice_location;
  } else {
    console.log("Error fetching invoice details");
  }
}

// Save Product Price and Lens price
let productPrice = 0;
let lensPrice = 0;
async function loadProductStock() {
  const currentURL = window.location.pathname;
  const invoiceId = currentURL.split("/").pop();

  const result = await fetch("/api/bill/bills/loadProductStock", {
    method: "POST",
    body: JSON.stringify({ invoiceId }),
    headers: { "Content-Type": "application/json" },
  });
  if (result.ok) {
    const response = await result.json();

    const tableBody = document.getElementById("product-table-body");

    response.forEach((item, index) => {
      const {
        stock_id,
        product_name,
        sub_category,
        brand_name,
        qty,
        saling_price,
        product_id,
      } = item;
      productPrice += saling_price * qty;

      const rowHtml = `
              <tr>
                <td>${stock_id}</td>
                <td><b>#${product_id} ${product_name + " "}</b> ${
                  brand_name + " " + sub_category
                }</td>
                <td class="text-center">${qty}</td>
                <td>LKR ${saling_price}</td>
              </tr>
              `;
      tableBody.insertAdjacentHTML("beforeend", rowHtml);
    });
  } else {
    console.log("Error fetching invoice details");
  }
}

async function loadLensStock() {
  const currentURL = window.location.pathname;
  const invoiceId = currentURL.split("/").pop();
  const result = await fetch("/api/bill/bills/loadLensStock", {
    method: "POST",
    body: JSON.stringify({ invoiceId }),
    headers: { "Content-Type": "application/json" },
  });
  if (result.ok) {
    const response = await result.json();

    const tableBody = document.getElementById("product-table-body");
    if (response == "No Result") {
      const rowHtml = `
              <tr>
                <td class= "text-center" colspan = 4>No Lens Details</td>
              </tr>
              `;
      tableBody.insertAdjacentHTML("beforeend", rowHtml);
    } else {
      response.forEach((item, index) => {
        const { lens_id, lens_code, lens_Qty, lens_price } = item;
        lensPrice += lens_price * lens_Qty;

        const rowHtml = `
              <tr>
                <td>${lens_id}</td>
                <td><b>#${lens_code} </b></td>
                <td class="text-center">${lens_Qty}</td>
                <td>LKR ${lens_price * lens_Qty}</td>
              </tr>
              `;
        tableBody.insertAdjacentHTML("beforeend", rowHtml);
      });
    }
  }
}

async function loadPaymentHistory() {
  const currentURL = window.location.pathname;
  const invoiceId = currentURL.split("/").pop();

  const result = await fetch("/api/bill/bills/loadPaymentHistory", {
    method: "POST",
    body: JSON.stringify({ invoiceId }),
    headers: { "Content-Type": "application/json" },
  });
  if (result.ok) {
    const response = await result.json();

    response.forEach((item, index) => {
      const {
        payment_id,
        date,
        amount,
        paid_amount,
        payment_method,
        payment_name,
      } = item;
      const fullDate = new Date(date);
      const finaldate = fullDate.toDateString();
      // formatDate.split('00:')[0];
      // formatDate = formatDate.getFullYear() + '-' + String(formatDate.getMonth() + 1).padStart(2, '0') + '-' + String(formatDate.getDate()).padStart(2, '0');
      // let year = formatDate.getFullYear();
      //
      // let day = String(formatDate.getDate()).padStart(2, '0');
      // let month = String(formatDate.getMonth() + 1).padStart(2, '0');
      const historyTab = document.getElementById("paymentHistory");
      const dataHTML = `
              <span class="d-flex justify-content-between">
                <span>${finaldate}  - Paid (${payment_name}) </span>
                <span>LKR ${paid_amount}</span>
              </span>
              <hr />
              `;
      historyTab.insertAdjacentHTML("beforeend", dataHTML);
    });
  } else {
    console.log("Error fetching payment history");
  }
}

async function fetchActions() {
  const result = await fetch("/api/bill/bills/fetchBillActions", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (result.ok) {
    const response = await result.json();
    console.log(response);
    console.log(response[0].id);
    if (response[0].Type == "admin") {
      const actionTab = document.getElementById("actionTab");
      const dataHTML = `
              <button class="btn btn-danger w-100 mb-2">Delete Bill</button>
              `;
      actionTab.insertAdjacentHTML("beforeend", dataHTML);
    }
  } else {
    alert("working");
  }
}

async function fetchPrintInvoice() {
  await Promise.all([printInvoiceHeader(), printProductStock()]);
}

async function printInvoiceHeader() {
  const currentURL = window.location.pathname;
  const invoiceId = currentURL.split("/").pop();

  const request = await fetch(
    `/api/bill/bills/loadCompanyHeaderData/${invoiceId}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (request.ok) {
    const response = await request.json();
    console.log(response);

    //invoice
    const invoice_id = response[0].invoice_id;
    const reg_name = response[0].reg_name;
    const reg_no = response[0].reg_no;
    const email = response[0].email;
    const web = response[0].web;
    const branch_address = response[0].branch_address;
    const branch_name = response[0].branch_name;
    const locaiton_mobile = response[0].locaiton_mobile;
    const location_mobile2 = response[0].location_mobile2;
    const customer_name = response[0].name;
    const address = response[0].address_line1;
    const customer_mobile = response[0].customer_mobile;
    const purchsed_date = response[0].date;

    //Lens stock Details
    const lens_id = response[0].lens_stock_lens_id;
    const lens_Qty = response[0].lens_Qty;
    const lens_code = response[0].lens_code;
    const lens_price = response[0].lens_price;
    const lenstotal = response[0].lenstotal;

    // Summery Details
    const discount_percentage = response[0].discount_percentage;
    const total = Number(response[0].subtotal) + Number(response[0].discount);
    const discount = Number(response[0].discount).toLocaleString();
    const subtotal = Number(response[0].subtotal).toLocaleString();
    const advance_payment = Number(
      response[0].advance_payment,
    ).toLocaleString();
    const payment_amount = Number(response[0].payment_amount).toLocaleString();

    let due_amount_raw =
      Number(response[0].subtotal) - Number(response[0].payment_amount);
    let due_amount = due_amount_raw.toLocaleString();

    // accessories items
    const box = response[0].box;
    const bag = response[0].bag;
    const clothing = response[0].clothing;

    document.getElementById("CompanyName").innerHTML = reg_name;
    document.getElementById("CompanyRegNo").innerHTML = reg_no;
    document.getElementById("CompanyEmail").innerHTML = email;
    document.getElementById("CompanyWeb").innerHTML = web;
    document.getElementById("BranchName").innerHTML = branch_name;
    document.getElementById("BranchAddress").innerHTML =
      "Address: " + branch_address;
    document.getElementById("BranchContact1").innerHTML =
      "Contact 1: " + locaiton_mobile;

    if (location_mobile2 != null || location_mobile2 != "") {
      document.getElementById("BranchContact2").innerHTML =
        "Contact 2: " + location_mobile2;
    }

    document.getElementById("PrintCustomerName").innerHTML = customer_name;
    document.getElementById("PrintCustomerAddress").innerHTML = address;
    document.getElementById("PrintCustomerMobile").innerHTML =
      "Contact: " + customer_mobile;
    document.getElementById("PrintPurchaseDate").innerHTML =
      "Date: " + purchsed_date;
    document.getElementById("PrintInvoiceID").innerHTML =
      "Invoice #: " + invoice_id;

    // summery details loading
    document.getElementById("PrintDiscount").innerHTML = discount;
    if (discount_percentage != null || discount_percentage != "") {
      document.getElementById("discount_percentage").innerHTML =
        discount_percentage;
    }

    document.getElementById("PrintSubTotal").innerHTML = subtotal;
    document.getElementById("PrintAdvancePayment").innerHTML = advance_payment;
    document.getElementById("PrintPaymentAmount").innerHTML = payment_amount;
    document.getElementById("PrintTotal").innerHTML = total;
    document.getElementById("dueamount").innerHTML = due_amount;

    // accessories items
    const ulTag = document.getElementById("accessoriesList");
    if (bag == "true") {
      const li = document.createElement("li");
      li.textContent = "free Bag - 01";
      ulTag.appendChild(li);
    }
    if (box == "true") {
      const li = document.createElement("li");
      li.textContent = "free Box - 01";
      ulTag.appendChild(li);
    }
    if (clothing == "true") {
      const li = document.createElement("li");
      li.textContent = "free Clothing - 01";
      ulTag.appendChild(li);
    }

    // lens stock details
    if (lens_id != null) {
      const stockTable = document.getElementById("stockTable");
      const tableRaw = document.createElement("tr");
      tableRaw.innerHTML = `
        <td class="type">Lens</td>
        <td>
            <div>
               <b id="lensID">${lens_id}</b> &nbsp;&nbsp; <span id="lensCode">${lens_code} </span>
            </div>
        </td>
        <td class="qty" id="lensQty">${lens_Qty}</td>
        <td class="price" id="lensPrice">${lenstotal}</td>
        `;
      stockTable.appendChild(tableRaw);

      // document.getElementById("lensID").innerHTML = lens_id;
      // document.getElementById("lensCode").innerHTML = lens_code;
      // document.getElementById("lensQty").innerHTML = lens_Qty;
      // document.getElementById("lensPrice").innerHTML = lens_price;
      // document.getElementById("lensTotal").innerHTML = lenstotal;
    } else {
      const stockTable = document.getElementById("stockTable");
      const tableRaw = document.createElement("tr");
      tableRaw.innerHTML = `
        <td class="type">Lens</td>
        <td>
            <div class="text-center">
                 <span class=" text-black-50" id="lensCode">No Lens Details</span>
            </div>
        </td>
         <td class="qty" id="lensQty"></td>
            <td class="price" id="lensPrice"></td>
        `;
      stockTable.appendChild(tableRaw);
    }
  } else {
    console.log("Error fetching invoice details");
  }
}

async function printProductStock() {
  const currentURL = window.location.pathname;
  const invoiceId = currentURL.split("/").pop();

  const request = await fetch(
    `/api/bill/bills/loadCompanystocks/${invoiceId}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (request.ok) {
    const response = await request.json();
    console.log(response);

    //invoice

    if (response != "No Result") {
      for (let i = 0; i < response.length; i++) {
        const saling_price = response[i].saling_price;
        const product_id = response[i].product_id;
        const product_name = response[i].product_name;
        const qty = response[i].qty;
        const sub_category = response[i].sub_category;
        const brand_name = response[i].brand_name;
        const category_name = response[i].Category;

        const stockTable = document.getElementById("stockTable");
        const tableRaw = document.createElement("tr");
        tableRaw.innerHTML = `
        <tr>
            <td class="type">${category_name}</td>
            <td>
              <div>
                <b id="printProductID">${product_id}</b>&nbsp;&nbsp;<span
                  id="printProductBrand"
                >${brand_name}</span
                >&nbsp;&nbsp;<span
                  class="muted"
                  id="printProductCategory"
                >${sub_category}</span>
              </div>
            </td>
            <td class="qty" id="printProductQty">${qty}</td>
            <td class="price" id="printProductPrice">${saling_price}</td>
          </tr>
        `;
        stockTable.appendChild(tableRaw);
      }
    } else if (response == "No Result") {
      const stockTable = document.getElementById("stockTable");
      const tableRaw = document.createElement("tr");
      tableRaw.innerHTML = `
        <td class="type">Frame</td>
        <td>
            <div class="text-center">
                 <span class=" text-black-50" id="lensCode">No Frame Details</span>
            </div>
        </td>
         <td class="qty" id="lensQty"></td>
            <td class="price" id="lensPrice"></td>
        `;
      stockTable.appendChild(tableRaw);
    }
  }
}

function GoAddBillPage() {
  window.location = "/add_bill";
}

async function customerMobileSearch() {
  let mobileOrName = document.getElementById("customerMobile").value;

  const result = await fetch("/api/customer/mobile_search", {
    method: "POST",
    body: JSON.stringify({ mobileOrName }),
    headers: { "Content-Type": "application/json" },
  });

  if (result.ok) {
    const response = await result.json();

    const Table = document.getElementById("customerSearchTable");
    console.log(response.length);
    if (response.length <= 0) {
      Table.innerHTML = `<div class="d-flex justify-content-center">
                                      <a
                                        class="btn btn-outline-primary"
                                        data-toggle="collapse"
                                        href="#collapseExample"
                                        role="button"
                                        aria-expanded="false"
                                        aria-controls="collapseExample"
                                        id="newCustomerBtn"
                                      >
                                        Add New Customer
                                      </a>
                                    </div>
        `;
      return;
    } else if (response.length > 0) {
      Table.innerHTML = ""; // Clear previous results
      for (let i = 0; i < response.length; i++) {
        const mobile = response[i].mobile;
        const name = response[i].name;

        // Table.removeChild(Table.lastChild);
        const rowHtmlElement = document.createElement("tr");
        rowHtmlElement.innerHTML = `
             <tr>
                                    <td><span>${name}</span></td>
                                    <td>
                                      <span>${mobile}</span>
                                    </td>
                                    <td>
                                      <input type="radio" name="selectCustomer" /> 
                                    </td>
                                  </tr>
              `;
        Table.appendChild(rowHtmlElement);
      }
    }
  } else {
    const TableElement = document.getElementById("customerSearchResults");
    const innerHtmlText = document.createElement("span");
    innerHtmlText.innerHTML = "No Results Found";
    TableElement.appendChild(innerHtmlText);

    console.log("Error fetching customer details");
  }
}

async function loadAddBillPage() {
  loadAllAddBillStockData();
}

async function loadAllAddBillStockData() {
  const result = await fetch("/api/stock/getAllStocks", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (result.ok) {
    const data = await result.json();
    console.log("Stock data loaded successfully:", data);
    // Return the data so it can be used by the calling function
    return data;
  } else {
    // Handle non-200 responses
    const errorData = await result.json();
    console.error("Failed to load stock data:", errorData);
    return null;
  }
}

// customer -----------------------------------------------------------------------------
// customer Registration
async function customerSectionLoading() {
  loadAllCustomers();
  loadLocationsForCustomer();
}
async function loadAllCustomers() {
  const result = await fetch("/api/customer/getAllCustomers", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (result.ok) {
    const response = await result.json();

    customerTable.clear(); // clear existing rows

    response.forEach((customer) => {
      customerTable.row.add([
        customer.name,
        customer.gender,
        customer.location_name,
        customer.mobile,
        customer.birthday,
        customer.nic,
        customer.email,
        `<button class="bg-success text-white">
            <i class="bi bi-eye"></i>
         </button>`,
      ]);
    });

    customerTable.draw(); // redraw table (important!)
  } else {
    console.log("Error fetching customer details");
  }
}
// load  Locations
async function loadLocationsForCustomer() {
  const result = await fetch("/branch/getBranchLocation", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (result.ok) {
    const response = await result.json();
    console.log(response);
    const branchLocationSelect = document.getElementById("location");
    response.forEach((location) => {
      const option = document.createElement("option");
      option.value = location.location_id;
      option.textContent = location.location_name;
      branchLocationSelect.appendChild(option);
    });
  }
}

// add New Customer
async function addNewCustomer() {
  // ... (Your existing variable declarations) ...
  const name = document.getElementById("fullName").value;
  const gender = document.getElementById("gender").value;
  const location = document.getElementById("location").value;
  const address = document.getElementById("address").value;
  const mobile1 = document.getElementById("mobile1").value;
  const mobile2 = document.getElementById("mobile2").value;
  const landline = document.getElementById("landline").value;
  const birthday = document.getElementById("dob").value;
  const nic = document.getElementById("nic").value;
  const email = document.getElementById("email").value;

  // Validation
  if (
    !name ||
    !gender ||
    !location ||
    !mobile1 ||
    !birthday ||
    !nic ||
    !email
  ) {
    Swal.fire({
      icon: "warning",
      title: "Missing Info",
      text: "Please fill in all required fields.",
      confirmButtonColor: "#3085d6",
    });
    return;
  }

  const customerData = {
    name,
    gender,
    location_name: location,
    address,
    mobile1,
    mobile2,
    landline,
    birthday,
    nic,
    email,
  };

  try {
    const response = await fetch("/api/customer/addCustomer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customerData),
    });

    if (response.ok) {
      // --- BEAUTIFUL TOAST ALERT ---
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener("mouseenter", Swal.stopTimer);
          toast.addEventListener("mouseleave", Swal.resumeTimer);
        },
      });

      await Toast.fire({
        icon: "success",
        title: "Customer Added Successfully!",
      });

      // RELOAD PAGE AFTER TOAST
      window.location.reload();
    } else {
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: "Something went wrong on the server.",
      });
    }
  } catch (error) {
    console.error("Error:", error);
    Swal.fire({
      icon: "error",
      title: "Connection Failed",
      text: "Could not connect to the server.",
    });
  }
}
