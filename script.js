/* ============================================
   PGA Parser - JavaScript Functions
   ============================================ */

let parsedResults = []
let pgaResults = []
let adminResults = []
let sortStates = {}

// Tab Navigation
function showTab(name, btn) {
  // Toggle nav active state
  const navs = document.querySelectorAll(".nav button")
  navs.forEach((n) => n.classList.remove("active"))
  if (btn) btn.classList.add("active")

  // Show/hide main sections
  const sections = ["original", "pga", "admin"]
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
  document.getElementById("adminResults").style.display = "none";
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
