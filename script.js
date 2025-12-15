/* ============================================
   PGA Parser - JavaScript Functions
   ============================================ */

let parsedResults = []
let pgaResults = []
let adminResults = []
let cashbackResults = []
let cashbackTableData = [[], [], []]
let sortStates = {}

// Tab Navigation
function showTab(name, btn) {
  // Toggle nav active state
  const navs = document.querySelectorAll(".nav button")
  navs.forEach((n) => n.classList.remove("active"))
  if (btn) btn.classList.add("active")

  // Show/hide main sections
  const sections = ["original", "pga", "admin", "cashback"]
  sections.forEach((id) => {
    const el = document.getElementById(id)
    if (!el) return
    el.style.display = id === name ? "block" : "none"
  })
}

// Error Display
function showError(message, containerId = "errorContainer") {
  const container = document.getElementById(containerId)
  container.innerHTML = `
    <div style="
      background: rgba(220, 38, 38, 0.1);
      padding: 12px 16px;
      border-radius: 10px;
      color: #dc2626;
      border-left: 4px solid #dc2626;
      font-weight: 500;
      font-size: 13px;
    ">${message}</div>
  `
  setTimeout(() => {
    container.innerHTML = ""
  }, 5000)
}

// Success Display
function showSuccess(message, containerId = "errorContainer") {
  const container = document.getElementById(containerId)
  container.innerHTML = `
    <div style="
      background: rgba(5, 150, 105, 0.1);
      padding: 12px 16px;
      border-radius: 10px;
      color: #059669;
      border-left: 4px solid #059669;
      font-weight: 500;
      font-size: 13px;
    ">${message}</div>
  `
  setTimeout(() => {
    if (container) container.innerHTML = ""
  }, 3000)
}

// Parse Main Data
function parseData() {
  const inputText = document.getElementById("inputText").value
  if (!inputText.trim()) {
    showError("Please enter some text data to parse.")
    return
  }

  const allLines = inputText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
  parsedResults = []
  const errors = []
  let i = 0
  let blockIndex = 1

  while (i < allLines.length) {
    try {
      // Skip until "TOPJITU"
      if (!/^\s*TOPJITU\s*$/.test(allLines[i])) {
        i++
        continue
      }

      // Parse block from TOPJITU until NOTE
      const blockLines = []
      let lineCount = 0
      let foundEndMarker = false
      const maxScan = 50

      for (let offset = 0; offset < maxScan && i + offset < allLines.length; offset++) {
        const currentLine = allLines[i + offset]
        blockLines.push(currentLine)
        lineCount++

        if (currentLine.trim() === "NOTE") {
          foundEndMarker = true
          break
        }
      }

      if (!foundEndMarker) {
        errors.push(`Block ${blockIndex}: Missing 'NOTE' terminator.`)
        i++
        blockIndex++
        continue
      }

      if (lineCount < 10) {
        errors.push(`Block ${blockIndex}: Too short (only ${lineCount} lines, need at least 10).`)
        i++
        blockIndex++
        continue
      }

      const getLine = (n) => (lineCount >= n ? blockLines[n - 1] : "")

      const id = (getLine(9) || "").trim()
      const name = (getLine(11) || "").trim()
      const bank = (getLine(13) || "").trim()
      const nominal = (getLine(15) || "")
        .trim()
        .replace(/^Rp\s*/i, "")
        .trim()

      let reff = ""
      const line22 = getLine(22)
      if (line22) {
        const tfPattern = /^TF_\d{6}_[A-Z0-9]{15,30}$/
        if (tfPattern.test(line22.trim())) {
          reff = line22.trim()
        }
      }

      // Validate required fields
      let hasError = false
      if (!id) {
        errors.push(`Block ${blockIndex}: Missing ID (line 9).`)
        hasError = true
      }
      if (!name) {
        errors.push(`Block ${blockIndex}: Missing Name (line 11).`)
        hasError = true
      }
      if (!bank) {
        errors.push(`Block ${blockIndex}: Missing Bank (line 13).`)
        hasError = true
      }
      if (!nominal) {
        errors.push(`Block ${blockIndex}: Missing Nominal (line 15).`)
        hasError = true
      }

      if (!hasError) {
        parsedResults.push({ bank, id, name, amount: nominal, reff, space: "" })
      }

      i += lineCount
      blockIndex++
    } catch (err) {
      console.error("Parse error at line index", i, err)
      errors.push(`Block ${blockIndex}: Parse error - ${err.message}`)
      i++
      blockIndex++
    }
  }

  if (parsedResults.length === 0) {
    showError("No valid transactions found. Please check the input format.")
    return
  }

  displayResults()
  if (errors.length > 0) {
    showError(`Found ${errors.length} parsing notice(s). Check console for details.`)
  }
}

// Display Results
function displayResults() {
  const tableBody = document.getElementById("tableBody")
  const resultsDiv = document.getElementById("results")
  const statsContent = document.getElementById("statsContent")
  tableBody.innerHTML = ""

  parsedResults.forEach((row) => {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${row.bank}</td>
      <td>${row.id}</td>
      <td class="empty-cell">${row.space || "&nbsp;"}</td>
      <td>${row.amount || ""}</td>
      <td>${row.name || ""}</td>
      <td>${row.reff || ""}</td>
    `
    tableBody.appendChild(tr)
  })

  const bankCounts = {}
  parsedResults.forEach((r) => (bankCounts[r.bank] = (bankCounts[r.bank] || 0) + 1))
  const totalAmount = parsedResults.filter((r) => r.amount).reduce((s, r) => s + (parseFloat(r.amount.replace(/,/g, '')) || 0), 0)

  statsContent.innerHTML = `
    <div class="muted-2">
      <strong>Total Transactions:</strong> ${parsedResults.length}<br>
      <strong>Total Amount:</strong> Rp ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<br>
      <strong>Bank Distribution:</strong><br>
      ${Object.entries(bankCounts)
        .map(([b, c]) => `&nbsp;&nbsp;${b}: ${c}`)
        .join("<br>")}
    </div>
  `
  resultsDiv.style.display = "block"
}

// Clear Data
function clearData() {
  document.getElementById("inputText").value = ""
  document.getElementById("results").style.display = "none"
  document.getElementById("errorContainer").innerHTML = ""
  parsedResults = []
}

// Copy Results
function copyResults() {
  const table = document.getElementById("resultTable")
  if (!table) {
    showError("No result table found to copy.")
    return
  }

  const rows = table.querySelectorAll("thead tr, tbody tr")
  if (!rows || rows.length === 0) {
    showError("No results to copy.")
    return
  }

  try {
    const lines = []
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const cols = Array.from(tr.cells).map((td) => td.innerText.replace(/\u00A0/g, " ").trim())
      lines.push(cols.join("\t"))
    })
    const text = lines.join("\n")

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showSuccess("Result table copied to clipboard.")
        })
        .catch((err) => {
          fallbackCopyText(text)
        })
    } else {
      fallbackCopyText(text)
    }
  } catch (err) {
    console.error(err)
    showError("Copy failed: " + err.message)
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement("textarea")
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand("copy")
    showSuccess("Result table copied to clipboard.")
  } catch (e) {
    showError("Copy failed: " + ((e && e.message) || e))
  }
  ta.remove()
}

/* --- PGA Deposit CSV functions --- */
function handleFileSelect(event) {
  const file = event.target.files && event.target.files[0]
  if (!file) return
  if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
    showCSVError("Please select a valid CSV file.")
    return
  }
  document.getElementById("fileName").textContent = `Selected: ${file.name}`
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      parseCSVData(e.target.result)
    } catch (err) {
      showCSVError("Error reading file: " + err.message)
    }
  }
  reader.readAsText(file)
}

function parseCSVData(csv) {
  const lines = csv
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "")
  if (lines.length === 0) {
    showCSVError("CSV file is empty.")
    return
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
  const idInvoiceIndex = headers.findIndex((h) => h.toLowerCase().includes("id invoice"))
  const nominalIndex = headers.findIndex((h) => h.toLowerCase().includes("nominal"))
  const refNoIndex = headers.findIndex((h) => h.toLowerCase().includes("ref.no") || h.toLowerCase().includes("ref no"))

  if (idInvoiceIndex === -1 || nominalIndex === -1 || refNoIndex === -1) {
    showCSVError("Required columns not found. Please ensure CSV contains: ID Invoice, Nominal, Ref.no columns.")
    return
  }

  pgaResults = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length > Math.max(idInvoiceIndex, nominalIndex, refNoIndex)) {
      const id = (values[idInvoiceIndex] || "").replace(/"/g, "").trim()
      const amount = (values[nominalIndex] || "").replace(/"/g, "").trim()
      const refNumb = (values[refNoIndex] || "").replace(/"/g, "").trim()
      if (id && amount) {
        pgaResults.push({ id, amount, space: "", refNumb })
      }
    }
  }

  if (pgaResults.length === 0) {
    showCSVError("No valid data found in CSV file.")
    return
  }
  displayPGAResults()
}

function parseCSVLine(line) {
  const values = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      values.push(current)
      current = ""
    } else {
      current += ch
    }
  }
  values.push(current)
  return values
}

function displayPGAResults() {
  const body = document.getElementById("pgaTableBody")
  const resultsDiv = document.getElementById("pgaResults")
  const stats = document.getElementById("pgaStatsContent")
  body.innerHTML = ""

  pgaResults.forEach((r) => {
    const tr = document.createElement("tr")
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.amount}</td>
      <td class="empty-cell">${r.space || "&nbsp;"}</td>
      <td>${r.refNumb || ""}</td>
    `
    body.appendChild(tr)
  })

  const totalAmount = pgaResults
    .filter((r) => r.amount)
    .reduce((s, r) => {
      const clean = (r.amount || "").replace(/[^0-9.,]/g, "").replace(/\./g, "").replace(',', '.')
      return s + (parseFloat(clean) || 0)
    }, 0)

  stats.innerHTML = `
    <div class="muted-2">
      <strong>Total Records:</strong> ${pgaResults.length}<br>
      <strong>Total Amount:</strong> Rp ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  `
  resultsDiv.style.display = "block"
}

function clearPGAData() {
  pgaResults = []
  const b = document.getElementById("pgaTableBody")
  if (b) b.innerHTML = ""
  document.getElementById("pgaResults").style.display = "none"
  document.getElementById("csvErrorContainer").innerHTML = ""
  document.getElementById("fileName").textContent = ""
  showCSVSuccess("PGA data cleared!")
}

function copyIDAmount(button) {
  if (!pgaResults || pgaResults.length === 0) {
    showCSVError("No data to copy. Please import a CSV file first.")
    return
  }

  const lines = pgaResults.map((r) => `${r.id}\t${r.amount}`)
  const textToCopy = lines.join("\n")

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showCopySuccess(button))
      .catch(() => fallbackCopy(textToCopy, button))
  } else {
    fallbackCopy(textToCopy, button)
  }
}

function copyRefNumb(button) {
  if (!pgaResults || pgaResults.length === 0) {
    showCSVError("No data to copy. Please import a CSV file first.")
    return
  }

  const lines = pgaResults.map((r) => r.refNumb)
  const textToCopy = lines.join("\n")

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showCopySuccess(button))
      .catch(() => fallbackCopy(textToCopy, button))
  } else {
    fallbackCopy(textToCopy, button)
  }
}

function fallbackCopy(text, button) {
  const ta = document.createElement("textarea")
  ta.value = text
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand("copy")
    showCopySuccess(button)
  } catch (e) {
    showCSVError("Failed to copy data. Please copy manually.")
  }
  ta.remove()
}

function showCSVError(message) {
  const c = document.getElementById("csvErrorContainer")
  if (c)
    c.innerHTML = `
    <div style="
      background: rgba(220, 38, 38, 0.1);
      padding: 12px 16px;
      border-radius: 10px;
      color: #dc2626;
      border-left: 4px solid #dc2626;
      font-weight: 500;
      font-size: 13px;
    ">${message}</div>
  `
  setTimeout(() => {
    if (c) c.innerHTML = ""
  }, 5000)
}

function showCSVSuccess(message) {
  const c = document.getElementById("csvErrorContainer")
  if (c)
    c.innerHTML = `
    <div style="
      background: rgba(5, 150, 105, 0.1);
      padding: 12px 16px;
      border-radius: 10px;
      color: #059669;
      border-left: 4px solid #059669;
      font-weight: 500;
      font-size: 13px;
    ">${message}</div>
  `
  setTimeout(() => {
    if (c) c.innerHTML = ""
  }, 3000)
}

function showCopySuccess(button) {
  const originalText = button.textContent
  button.textContent = "Copied!"
  button.style.color = "#059669"

  setTimeout(() => {
    button.textContent = originalText
    button.style.color = ""
  }, 1500)
}

/* --- Sorting Logic --- */
function sortData(key, data, displayFn, stateKey) {
  if (!sortStates[stateKey]) {
    sortStates[stateKey] = { key: key, order: 'asc' };
  } else if (sortStates[stateKey].key === key) {
    sortStates[stateKey].order = sortStates[stateKey].order === 'asc' ? 'desc' : 'asc';
  } else {
    sortStates[stateKey] = { key: key, order: 'asc' };
  }

  const { order } = sortStates[stateKey];
  const isNumeric = ['amount', 'nominal'].includes(key.toLowerCase());

  data.sort((a, b) => {
    const valA = a[key];
    const valB = b[key];

    let compA = isNumeric ? parseFloat(String(valA).replace(/[^0-9.-]+/g,"")) : String(valA).toLowerCase();
    let compB = isNumeric ? parseFloat(String(valB).replace(/[^0-9.-]+/g,"")) : String(valB).toLowerCase();

    if (compA < compB) return order === 'asc' ? -1 : 1;
    if (compA > compB) return order === 'asc' ? 1 : -1;
    return 0;
  });

  displayFn();
}

function sortResults(key) {
  sortData(key, parsedResults, displayResults, 'results');
}

function sortPGAResults(key) {
  sortData(key, pgaResults, displayPGAResults, 'pga');
}

function sortAdminResults(key) {
  sortData(key, adminResults, displayAdminResults, 'admin');
}

/* --- Admin Parser Functions --- */
function parseAdminData() {
  const inputText = document.getElementById("adminInputText").value;
  if (!inputText.trim()) {
    showError("Please paste your admin data to parse.", "adminErrorContainer");
    return;
  }

  const lines = inputText.replace(/\r\n/g, "\n").split("\n");
  adminResults = [];
  let currentEntry = {};
  let errors = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (/^\d+\s+\w+/.test(trimmedLine)) {
      if (currentEntry.id) adminResults.push(currentEntry);
      currentEntry = { id: trimmedLine.split(/\s+/)[1] };
    } else if (trimmedLine.toLowerCase().startsWith('withdraw')) {
      currentEntry.amount = trimmedLine.split(/\s+/)[3];
    } else if (trimmedLine.includes(',')) {
      const parts = trimmedLine.split(',');
      currentEntry.bank = parts[0];
      currentEntry.name = parts.slice(2).join(',').trim();
    }
  });
  if (currentEntry.id) adminResults.push(currentEntry);

  if (adminResults.length === 0) {
    showError("No valid admin data found. Please check the format.", "adminErrorContainer");
    return;
  }

  displayAdminResults();
  if (errors.length > 0) {
    showError(`Found ${errors.length} parsing notices.`, "adminErrorContainer");
  }
}

function displayAdminResults() {
  const tableBody = document.getElementById("adminTableBody");
  const resultsDiv = document.getElementById("adminResults");
  const statsContent = document.getElementById("adminStatsContent");
  tableBody.innerHTML = "";

  adminResults.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.bank || ""}</td>
      <td>${row.id || ""}</td>
      <td class="empty-cell">&nbsp;</td>
      <td>${row.amount || ""}</td>
      <td>${row.name || ""}</td>
    `;
    tableBody.appendChild(tr);
  });

  const totalAmount = adminResults.reduce((sum, row) => sum + (parseFloat(row.amount.replace(/,/g, '')) || 0), 0);
  statsContent.innerHTML = `
    <div class="muted-2">
      <strong>Total Transactions:</strong> ${adminResults.length}<br>
      <strong>Total Amount:</strong> Rp ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  `;
  resultsDiv.style.display = "block";
}

function clearAdminData() {
  document.getElementById("adminInputText").value = "";
  document.getElementById("adminResults").style.display = "none"
  document.getElementById("adminErrorContainer").innerHTML = "";
  adminResults = [];
}

function copyAdminResults() {
  const table = document.getElementById("adminResultTable");
  if (!table) {
    showError("No result table found to copy.", "adminErrorContainer");
    return;
  }
  const lines = Array.from(table.querySelectorAll("tbody tr")).map(tr => {
    return Array.from(tr.cells).map(td => td.innerText.trim()).join("\t");
  }).join("\n");

  if (navigator.clipboard) {
    navigator.clipboard.writeText(lines).then(() => {
      showSuccess("Admin results copied to clipboard.", "adminErrorContainer");
    }).catch(err => {
      showError("Failed to copy: " + err, "adminErrorContainer");
    });
  }
}

/* --- Cashback Parser Functions --- */
function handleCashbackFileSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
    showError("Please select a valid CSV file.", "cashbackErrorContainer");
    return;
  }
  const fileNameEl = document.getElementById("cashbackFileName");
  fileNameEl.textContent = `Selected: ${file.name}`;
  fileNameEl.style.display = 'block';
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      parseCashbackData(e.target.result); // Call the updated function
    } catch (err) {
      showError("Error reading file: " + err.message, "cashbackErrorContainer");
    }
  };
  reader.readAsText(file);
}

/**
 * Parses the uploaded CSV string for cashback data.
 * Identifies the *last* occurrence of '-100000' in the 'Loss Amount' column (index 2).
 * Includes all data up to and including the last '-100000' row.
 * Discards any data rows appearing after the last '-100000'.
 * Preserves the original format of numbers without adding decimals.
 */
function parseCashbackData(csv) {
  // Normalize line endings and filter out empty lines
  const lines = csv.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(l => l);

  if (lines.length <= 1) { // Check for header + at least one data row
    showError("CSV file is empty or contains only a header.", "cashbackErrorContainer");
    return;
  }

  // Find the index of the header row to locate the 'Loss Amount' column
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine); // Reuse the existing helper function
  const lossAmountColumnIndex = headers.findIndex(h => h.toLowerCase().includes('loss amount')); // Adjust if header name differs

  if (lossAmountColumnIndex === -1) {
     showError("Required 'Loss Amount' column not found in CSV header.", "cashbackErrorContainer");
     return;
  }

  // Parse data rows
  let parsedRows = [];
  for (let i = 1; i < lines.length; i++) { // Start from 1 to skip header
    const values = parseCSVLine(lines[i]);
    if (values.length > lossAmountColumnIndex) { // Ensure the column exists
      const id = values[0]; // Assuming ID is in the first column
      const lossAmount = values[lossAmountColumnIndex]; // Get the value from the correct column
      parsedRows.push({ id, lossAmount });
    }
  }

  // Find the *last* index of a row where the 'Loss Amount' column equals '-100000'
  let lastTerminatorIndex = -1;
  for (let i = parsedRows.length - 1; i >= 0; i--) {
    if (parsedRows[i].lossAmount === '-100000') {
      lastTerminatorIndex = i;
      break; // Found the last one
    }
  }

  // Determine the final dataset to use based on the terminator
  let finalDataToProcess;
  if (lastTerminatorIndex !== -1) {
    // Include data up to and including the last '-100000' row
    finalDataToProcess = parsedRows.slice(0, lastTerminatorIndex + 1);
    console.log("Parsing stopped at last '-100000' found at index:", lastTerminatorIndex);
  } else {
    // No '-100000' found, use the entire parsed list
    finalDataToProcess = parsedRows;
    console.log("No '-100000' terminator found, processing all parsed rows.");
  }

  // Update the global variable with the final dataset
  cashbackResults = finalDataToProcess;

  if (cashbackResults.length === 0) {
    showError("No valid data could be parsed or no terminator found before end of file.", "cashbackErrorContainer");
    return;
  }

  console.log("Total cashbackResults after parsing and applying terminator rule:", cashbackResults.length);
  // Distribute the data into three tables after parsing is complete
  distributeCashbackDataToTables();
}

/**
 * Distributes the globally stored cashbackResults array into three separate arrays
 * and calls the display function.
 */
function distributeCashbackDataToTables() {
  const totalRows = cashbackResults.length;

  if (totalRows === 0) {
    // Handle case where there's no data after parsing
    ["1", "2", "3"].forEach(n => {
        const body = document.getElementById(`cashbackTableBody${n}`);
        if (body) body.innerHTML = "";
    });
    document.getElementById("cashbackResults").style.display = "none";
    return;
  }

  // Calculate base size and remainder for even distribution
  const baseSize = Math.floor(totalRows / 3);
  const remainder = totalRows % 3;

  // Calculate individual table sizes
  const table1Size = baseSize;
  const table2Size = baseSize;
  // The third table gets the base size plus any remainder
  const table3Size = baseSize + remainder;

  // Slice the data accordingly
  const table1Data = cashbackResults.slice(0, table1Size);
  const table2Data = cashbackResults.slice(table1Size, table1Size + table2Size);
  const table3Data = cashbackResults.slice(table1Size + table2Size, table1Size + table2Size + table3Size); // Explicit end index

  console.log(`Distributing ${totalRows} rows: T1=${table1Data.length}, T2=${table2Data.length}, T3=${table3Data.length}`);

  // Display the distributed data
  displayCashbackResults(table1Data, table2Data, table3Data);
}

/**
 * Displays the distributed cashback data into the three designated table bodies.
 * This function now receives the pre-divided data arrays.
 * @param {Array} data1 - Array of objects for table 1
 * @param {Array} data2 - Array of objects for table 2
 * @param {Array} data3 - Array of objects for table 3
 */
function displayCashbackResults(data1, data2, data3) {
  console.log("displayCashbackResults called with data lengths:", data1.length, data2.length, data3.length);

  const resultsDiv = document.getElementById("cashbackResults");
  const bodies = [
    document.getElementById("cashbackTableBody1"),
    document.getElementById("cashbackTableBody2"),
    document.getElementById("cashbackTableBody3")
  ];
  const datasets = [data1, data2, data3];

  console.log("Table bodies found in DOM:", bodies.every(b => !!b)); // Check if all elements exist

  // Clear all table bodies first
  bodies.forEach(body => {
    if (body) {
      body.innerHTML = ""; // Clear previous content
      // Populate the table body with data
      datasets.forEach((dataset, index) => {
        if (index === bodies.indexOf(body)) { // Match dataset to its corresponding body
          dataset.forEach(row => {
            const tr = document.createElement("tr");
            // Use raw string values directly, preserving format like "-100000"
            tr.innerHTML = `<td>${row.id}</td><td>${row.lossAmount}</td>`;
            body.appendChild(tr);
          });
          console.log(`Populated table ${index + 1} with ${dataset.length} rows.`);
        }
      });
    } else {
       console.error(`Target table body element for table ${bodies.indexOf(body) + 1} not found in the DOM.`);
    }
  });

  // Add scrolling to tables for large datasets
  ["1", "2", "3"].forEach(n => {
    const tbody = document.getElementById(`cashbackTableBody${n}`);
    const table = document.getElementById(`cashbackTable${n}`);
    if (table && tbody) {
      table.style.tableLayout = 'fixed';
      table.style.width = '100%';
      const thead = table.querySelector('thead');
      if (thead) {
        thead.style.display = 'table';
        thead.style.width = 'calc(100% - 1em)'; // Approximate scrollbar width
        thead.style.tableLayout = 'fixed';
      }
      tbody.style.display = 'block';
      tbody.style.maxHeight = '400px';
      tbody.style.overflowY = 'scroll';
      tbody.style.width = '100%';
      tbody.style.tableLayout = 'fixed';
      Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
        tr.style.display = 'table';
        tr.style.width = '100%';
        tr.style.tableLayout = 'fixed';
      });
    }
  });

  if (resultsDiv) {
    resultsDiv.style.display = "block";
  }
}

function clearCashbackData() {
  cashbackResults = [];
  cashbackTableData = [[], [], []];
  ["1", "2", "3"].forEach(n => {
    document.getElementById(`cashbackTableBody${n}`).innerHTML = "";
  });
  document.getElementById("cashbackResults").style.display = "none";
  document.getElementById("cashbackFileInput").value = null;
  document.getElementById("cashbackFileName").style.display = "none";
  document.getElementById("cashbackErrorContainer").innerHTML = "";
  showSuccess("Cashback data and file selection have been cleared.", "cashbackErrorContainer");
}

function copyCashbackTable(tableNumber) {
    const data = cashbackTableData[tableNumber - 1];
    if (data.length === 0) {
        showError(`Table ${tableNumber} has no data to copy.`, "cashbackErrorContainer");
        return;
    }
    const text = data.map(row => `${row.id}\t${row.lossAmount}`).join('\n');

    navigator.clipboard.writeText(text).then(() => {
        showSuccess(`Table ${tableNumber} data copied to clipboard.`, "cashbackErrorContainer");
    }).catch(err => {
        showError(`Failed to copy Table ${tableNumber}: ${err}`, "cashbackErrorContainer");
    });
}