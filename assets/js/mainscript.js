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
      if (response == "success") {
        window.location = "/";
      } else if (response == "Invalid") {
        document.getElementById("errormessage").innerHTML =
          "Invalid User Details, Please Try again later";
      }
    }
  }
}

// fetch Branch Details
async function fetchBranchStatus() {
  const result = await fetch("brnch/fetch", {
    method: "POST",
    body: JSON.stringify({
      date: "2025-09-25", // <-- test date you showed in HeidiSQL
      // or new Date().toISOString().slice(0,10) for today
    }),
    headers: { "Content-type": "application/json" },
  });

  if (result.ok) {
    const response = await result.json();

    let branchcount = response.locations.length;
    console.log(response.locations);

    const container = document.getElementById("render-target");

    for (let i = 0; i < branchcount; i++) {
      console.log(response.locations[i].location_name);

      container.innerHTML += `
        <div class="row" >
                <div class="col-lg-12 col-md-12 col-sm-12 ">
                  <div class="card card-statistic-2  border border-1 border-dark rounded mb-3">
                    <div class="card-stats ">
                      <div class="card-stats-title">
                        <b style="color :purple">${response.locations[i].location_name}</b> Order Statistics -
                        <div class="dropdown d-inline" >
                          <a
                            class="font-weight-600 dropdown-toggle"
                            data-toggle="dropdown"
                            href="#"
                            id="orders-month"
                            >August</a
                          >
                          <ul class="dropdown-menu dropdown-menu-sm">
                            <li class="dropdown-title">Select Month</li>
                            <li><a href="#" class="dropdown-item">January</a></li>
                            <li>
                              <a href="#" class="dropdown-item">February</a>
                            </li>
                            <li><a href="#" class="dropdown-item">March</a></li>
                            <li><a href="#" class="dropdown-item">April</a></li>
                            <li><a href="#" class="dropdown-item">May</a></li>
                            <li><a href="#" class="dropdown-item">June</a></li>
                            <li><a href="#" class="dropdown-item">July</a></li>
                            <li>
                              <a href="#" class="dropdown-item active">August</a>
                            </li>
                            <li>
                              <a href="#" class="dropdown-item">September</a>
                            </li>
                            <li><a href="#" class="dropdown-item">October</a></li>
                            <li>
                              <a href="#" class="dropdown-item">November</a>
                            </li>
                            <li>
                              <a href="#" class="dropdown-item">December</a>
                            </li>
                          </ul>
                        </div>
                      </div>
                      <div class="card-stats-items">
                        <div class="card-stats-item">
                          <div class="card-stats-item-count">${response.locations[i].order_count} </div>
                          <div class="card-stats-item-label">Orders</div>
                        </div>
                       
                        <div class="card-stats-item">
                          <div class="card-stats-item-count">${response.locations[i].total_cash_collected}</div>
                          <div class="card-stats-item-label">Cash Collected</div>
                        </div>
                      </div>
                    </div>
                    <div class="card-icon shadow-primary bg-primary">
                      <i class="fas fa-archive"></i>
                    </div>
                    <div class="card-wrap">
                      <div class="card-header">
                        <h4>Total Sales</h4>
                      </div>
                      <div class="card-body"> ${response.locations[i].astimate_total_profit}</div>
                    </div>
                  </div>
                </div>
                
                
              </div>
        `;
    }
  }
}

// open Bills
async function UpdateBills() {
  window.location = "/update_bills";
}
