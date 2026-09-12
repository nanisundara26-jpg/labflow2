/**
 * LabFlow Sentinel — Central Application Controller & SPA Router
 * "Predict. Prioritize. Rescue. Deliver."
 */

class LabFlowApp {
  constructor() {
    this.currentPage = "dashboard";
    this.liveMonitoring = false;
    this.liveTimer = null;
    this.currentPatientCodeForReport = "0048";
    this.init();
  }

  init() {
    this.initGlobalState();
    this.setupEventListeners();
    this.updateUserUI();
    this.updateNotificationBadges();
    this.navigateTo("dashboard");

    // Initialize global shortcuts (Ctrl+K for search)
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        if (searchInput) searchInput.focus();
      }
    });
  }

  initGlobalState() {
    window.appState = {
      patients: window.patientManager ? window.patientManager.getAll() : [],
      samples: window.sampleManager ? window.sampleManager.getAll() : [],
      analyzers: window.operationsManager ? window.operationsManager.getAll() : [],
      testOrders: this.loadTestOrders(),
      results: window.resultsManager ? window.resultsManager.getAll() : [],
      aiInsights: [...SEED_AI_INSIGHTS]
    };
  }

  loadTestOrders() {
    try {
      const stored = localStorage.getItem("labflow_test_orders");
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
    localStorage.setItem("labflow_test_orders", JSON.stringify(SEED_TEST_ORDERS));
    return [...SEED_TEST_ORDERS];
  }

  saveTestOrders() {
    localStorage.setItem("labflow_test_orders", JSON.stringify(window.appState.testOrders));
  }

  setupEventListeners() {
    // Global search input listener
    const searchInput = document.getElementById("global-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.handleGlobalSearch(e.target.value);
      });
      searchInput.addEventListener("focus", (e) => {
        if (e.target.value.trim().length > 0) {
          this.handleGlobalSearch(e.target.value);
        }
      });
    }

    // Close search dropdown on click outside
    document.addEventListener("click", (e) => {
      const searchContainer = document.querySelector(".global-search-container");
      const dropdown = document.getElementById("global-search-dropdown");
      if (dropdown && searchContainer && !searchContainer.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });

    // Mobile sidebar toggle
    const mobileBtn = document.getElementById("mobile-menu-btn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (mobileBtn && sidebar && overlay) {
      mobileBtn.addEventListener("click", () => {
        sidebar.classList.toggle("mobile-open");
        overlay.classList.toggle("active");
      });
      overlay.addEventListener("click", () => {
        sidebar.classList.remove("mobile-open");
        overlay.classList.remove("active");
      });
    }
  }

  /**
   * Router: Switch active view smoothly
   */
  navigateTo(pageId, extraParam = null) {
    this.currentPage = pageId;

    // Update sidebar navigation links
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
      if (item.dataset.page === pageId) {
        item.classList.add("active");
      }
    });

    // Update active page view container
    document.querySelectorAll(".page-view").forEach(pv => {
      pv.classList.remove("active");
    });
    const targetView = document.getElementById(`view-${pageId}`);
    if (targetView) {
      targetView.classList.add("active");
    }

    // Close mobile drawer if open
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.remove("mobile-open");
    if (overlay) overlay.classList.remove("active");

    // Render corresponding view data
    switch (pageId) {
      case "dashboard":
        this.renderDashboard();
        break;
      case "patients":
        if (window.patientManager) window.patientManager.renderPatientList("patients-table-container");
        break;
      case "patient-profile":
        if (window.patientManager && extraParam) {
          window.patientManager.renderPatientProfile("patient-profile-container", extraParam);
        }
        break;
      case "orders":
        this.renderOrders();
        break;
      case "samples":
        if (window.sampleManager) window.sampleManager.renderSampleList("samples-table-container");
        break;
      case "rescue":
        this.renderRescueCenter();
        break;
      case "intelligence":
        this.renderAIIntelligence();
        break;
      case "operations":
        this.renderOperations();
        break;
      case "results":
        this.renderResults();
        break;
      case "reports":
        this.renderReportsList();
        break;
      case "report-preview":
        if (window.reportsManager) {
          window.reportsManager.renderReportPreview("report-preview-container", extraParam || this.currentPatientCodeForReport);
        }
        break;
      case "notifications":
        this.renderNotifications();
        break;
      case "audit":
        this.renderAuditTrail();
        break;
      case "settings":
        this.renderSettings();
        break;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Topbar Global Search (Patient Code, Name, Sample ID, Test, Report ID)
   */
  handleGlobalSearch(query) {
    const dropdown = document.getElementById("global-search-dropdown");
    if (!dropdown) return;

    const q = (query || "").trim().toLowerCase();
    if (q.length === 0) {
      dropdown.classList.remove("active");
      dropdown.innerHTML = "";
      return;
    }

    const matchedPatients = window.patientManager.getAll().filter(p => 
      p.patientCode.includes(q) || p.name.toLowerCase().includes(q) || p.phone.includes(q)
    ).slice(0, 4);

    const matchedSamples = window.sampleManager.getAll().filter(s =>
      s.sampleId.toLowerCase().includes(q) || s.patientCode.includes(q) || s.patientName.toLowerCase().includes(q) || s.test.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedOrders = window.appState.testOrders.filter(o =>
      o.orderId.toLowerCase().includes(q) || o.patientCode.includes(q) || o.testName.toLowerCase().includes(q)
    ).slice(0, 3);

    let html = "";

    if (matchedPatients.length > 0) {
      html += `<div class="search-group-title">Patients (By Numeric Code / Name)</div>`;
      matchedPatients.forEach(p => {
        html += `
          <div class="search-item" onclick="app.viewPatientProfile('${p.patientCode}'); app.closeSearchDropdown();">
            <div class="search-item-main">
              <div class="search-item-primary">
                <span class="patient-code-badge sm">${p.patientCode}</span>
                <span>${p.name}</span>
              </div>
              <div class="search-item-secondary">${p.age}y / ${p.gender} &bull; ${p.phone} &bull; ${p.referringDoctor}</div>
            </div>
            <span class="badge badge-secondary">Patient</span>
          </div>
        `;
      });
    }

    if (matchedSamples.length > 0) {
      html += `<div class="search-group-title">Active Samples & Tests</div>`;
      matchedSamples.forEach(s => {
        html += `
          <div class="search-item" onclick="app.openSampleModal('${s.sampleId}'); app.closeSearchDropdown();">
            <div class="search-item-main">
              <div class="search-item-primary">
                <strong style="color: var(--primary);">${s.sampleId}</strong>
                <span class="patient-code-badge sm">${s.patientCode}</span>
                <span>${s.test}</span>
              </div>
              <div class="search-item-secondary">Stage: ${s.currentStage} &bull; Analyzer: ${s.assignedAnalyzer} &bull; Risk: ${s.riskScore}%</div>
            </div>
            <span class="risk-pill ${s.riskScore >= 75 ? 'risk-critical' : 'risk-low'}">${s.riskScore}%</span>
          </div>
        `;
      });
    }

    if (matchedOrders.length > 0) {
      html += `<div class="search-group-title">Test Orders</div>`;
      matchedOrders.forEach(o => {
        html += `
          <div class="search-item" onclick="app.navigateTo('orders'); app.closeSearchDropdown();">
            <div class="search-item-main">
              <div class="search-item-primary">
                <strong>${o.orderId}</strong>
                <span class="patient-code-badge sm">${o.patientCode}</span>
                <span>${o.testName}</span>
              </div>
              <div class="search-item-secondary">Priority: ${o.priority} &bull; Dr: ${o.doctor}</div>
            </div>
            <span class="badge badge-primary">${o.status}</span>
          </div>
        `;
      });
    }

    if (html === "") {
      html = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          No matching records found for "<strong>${query}</strong>"
        </div>
      `;
    }

    dropdown.innerHTML = html;
    dropdown.classList.add("active");
  }

  closeSearchDropdown() {
    const dropdown = document.getElementById("global-search-dropdown");
    if (dropdown) dropdown.classList.remove("active");
  }

  /**
   * Render Dashboard & AI Command Center
   */
  renderDashboard() {
    const samples = window.sampleManager ? window.sampleManager.getAll() : [];
    const totalPatients = (window.patientManager ? window.patientManager.getAll().length : 16) + 1232;
    const activeSamples = samples.filter(s => s.status !== "Completed");
    const atRiskSamples = samples.filter(s => s.status !== "Completed" && s.riskScore >= 70);
    const criticalResults = window.resultsManager ? window.resultsManager.getAll().filter(r => r.flag && r.flag.includes("CRITICAL")) : [];
    const analyzers = window.operationsManager ? window.operationsManager.getAll() : [];
    const avgUtilization = analyzers.length ? Math.round(analyzers.reduce((acc, a) => acc + a.capacity, 0) / analyzers.length) : 78;

    // Update KPI Card values
    const kpiPatients = document.getElementById("kpi-total-patients");
    const kpiActive = document.getElementById("kpi-active-samples");
    const kpiTat = document.getElementById("kpi-tat-compliance");
    const kpiRisk = document.getElementById("kpi-samples-at-risk");
    const kpiCrit = document.getElementById("kpi-critical-results");
    const kpiAnalyzer = document.getElementById("kpi-analyzer-utilization");

    if (kpiPatients) kpiPatients.textContent = totalPatients.toLocaleString();
    if (kpiActive) kpiActive.textContent = activeSamples.length;
    if (kpiTat) kpiTat.textContent = "94.6%";
    if (kpiRisk) kpiRisk.textContent = atRiskSamples.length;
    if (kpiCrit) kpiCrit.textContent = criticalResults.length;
    if (kpiAnalyzer) kpiAnalyzer.textContent = `${avgUtilization}%`;

    // Render AI Command Center Insights
    const insightsContainer = document.getElementById("dashboard-ai-insights");
    if (insightsContainer) {
      const dynamicInsights = aiService.generateOperationalInsights(samples, analyzers);
      insightsContainer.innerHTML = dynamicInsights.map(ins => {
        let severityClass = "severity-medium";
        if (ins.severity === "Critical") severityClass = "severity-critical";
        else if (ins.severity === "High") severityClass = "severity-high";
        else if (ins.severity === "Low") severityClass = "severity-low";

        return `
          <div class="ai-insight-card">
            <div>
              <div class="ai-insight-top" style="margin-bottom: 0.5rem;">
                <span class="ai-severity-badge ${severityClass}">${ins.severity}</span>
                <span style="font-size: 0.7rem; color: #94a3b8;">${ins.timestamp}</span>
              </div>
              <div class="ai-insight-title">${ins.title}</div>
              <div class="ai-insight-reason" style="margin-top: 0.35rem;">${ins.description}</div>
            </div>
            <div style="margin-top: 0.75rem;">
              <div class="ai-insight-recommendation" style="margin-bottom: 0.5rem;">
                <span>💡</span> ${ins.recommendation}
              </div>
              <button class="ai-insight-action-btn" onclick="app.navigateTo('${ins.actionTarget}')">
                ${ins.actionText} →
              </button>
            </div>
          </div>
        `;
      }).join("");
    }

    // Render AI Predictive TAT Table
    const tatTableContainer = document.getElementById("dashboard-tat-table");
    if (tatTableContainer) {
      const topAtRisk = samples.filter(s => s.status !== "Completed").sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
      tatTableContainer.innerHTML = `
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Patient Code</th>
                <th>Test</th>
                <th>Current Stage</th>
                <th>Target TAT</th>
                <th>Elapsed</th>
                <th>Predicted</th>
                <th>TAT Risk</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${topAtRisk.map(s => {
                const tat = aiService.predictTAT(s);
                return `
                  <tr class="${s.riskScore >= 80 ? 'critical-row' : ''}">
                    <td><strong>${s.sampleId}</strong></td>
                    <td><span class="patient-code-badge sm">${s.patientCode}</span></td>
                    <td>${s.test}</td>
                    <td><span class="badge badge-primary">${s.currentStage}</span></td>
                    <td>${tat.targetTat} min</td>
                    <td>${tat.elapsedTime} min</td>
                    <td><strong>${tat.predictedCompletion} min</strong></td>
                    <td><span class="risk-pill ${tat.riskClass}">${tat.riskBadge}</span></td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="app.openSampleModal('${s.sampleId}')">Details</button>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      `;
    }

    // Render AI Priority Queue
    const priorityQueueContainer = document.getElementById("dashboard-priority-queue");
    if (priorityQueueContainer) {
      const prioritized = aiService.prioritizeSamples(samples).filter(s => s.status !== "Completed").slice(0, 5);
      priorityQueueContainer.innerHTML = prioritized.map((s, idx) => `
        <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.75rem;">
              ${idx + 1}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <strong style="color: var(--text-main); font-size: 0.88rem;">${s.sampleId}</strong>
                <span class="patient-code-badge sm">${s.patientCode}</span>
                <span class="badge ${s.priority === 'STAT' ? 'badge-danger' : 'badge-warning'}" style="font-size: 0.65rem;">${s.priority}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1px;">
                ${s.test} &bull; ${s.assignedAnalyzer} &bull; Stage: ${s.currentStage}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="risk-pill ${s.dynamicRisk >= 75 ? 'risk-critical' : 'risk-high'}">${s.dynamicRisk}%</span>
            <button class="btn btn-secondary btn-sm" onclick="app.openWhyPrioritizedModal('${s.sampleId}')" title="Explainability factors">
              Why Prioritized?
            </button>
          </div>
        </div>
      `).join("");
    }
  }

  /**
   * Render Sample Rescue Center View
   */
  renderRescueCenter() {
    if (window.rescueCenter) {
      window.rescueCenter.render("rescue-cards-container");
    }
  }

  /**
   * Render AI Intelligence View (Risk Engine & Diagnostics)
   */
  renderAIIntelligence() {
    const samples = window.sampleManager ? window.sampleManager.getAll() : [];
    const container = document.getElementById("intelligence-view-container");
    if (!container) return;

    const prioritized = aiService.prioritizeSamples(samples);

    container.innerHTML = `
      <div class="ai-disclaimer-banner">
        <span>🤖</span>
        <div>
          <strong>AI Decision-Support System:</strong> Sentinel's AI Risk Engine continuously recalculates multi-factor specimen risk indices, predictive TAT breach hazards, and instrument congestion parameters.
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <div class="card-title">⚙️ Dynamic Multi-Factor Risk Queue</div>
          </div>
          <div class="card-body no-padding">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Sample ID</th>
                    <th>Patient Code</th>
                    <th>Priority</th>
                    <th>Calculated Risk</th>
                    <th>Confidence</th>
                    <th>Explainability</th>
                  </tr>
                </thead>
                <tbody>
                  ${prioritized.slice(0, 8).map(s => {
                    const analysis = aiService.analyzeSampleRisk(s);
                    return `
                      <tr>
                        <td><strong>${s.sampleId}</strong></td>
                        <td><span class="patient-code-badge sm">${s.patientCode}</span></td>
                        <td><span class="badge ${s.priority === 'STAT' ? 'badge-danger' : 'badge-primary'}">${s.priority}</span></td>
                        <td><span class="risk-pill ${analysis.riskScore >= 75 ? 'risk-critical' : 'risk-low'}">${analysis.riskScore}%</span></td>
                        <td><span style="color: var(--success); font-weight: 700;">${analysis.confidence}%</span></td>
                        <td>
                          <button class="btn btn-secondary btn-sm" onclick="app.openWhyPrioritizedModal('${s.sampleId}')">
                            Explain Score
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🔍 Subsystem Diagnostics</div>
          </div>
          <div class="card-body" style="font-size: 0.82rem; display: flex; flex-direction: column; gap: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">
              <span><strong>TAT Predictive Model</strong></span>
              <span class="badge badge-success">Active (15s polling)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">
              <span><strong>Sample Risk Engine</strong></span>
              <span class="badge badge-success">Online (Weight-Matrix v2.4)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">
              <span><strong>Instrument Bottleneck Tracker</strong></span>
              <span class="badge badge-success">Listening (3 Analyzers)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.5rem;">
              <span><strong>Clinical Anomaly Heuristic</strong></span>
              <span class="badge badge-success">Active (Delta Checks)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span><strong>LabFlow Conversational Assistant</strong></span>
              <span class="badge badge-success">Ready</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Operations Center & What-If Simulator
   */
  renderOperations() {
    if (window.operationsManager) {
      window.operationsManager.renderAnalyzers("analyzers-grid-container");
      window.operationsManager.renderSimulator("what-if-container");
    }
  }

  /**
   * Render Results Management
   */
  renderResults() {
    if (window.resultsManager) {
      window.resultsManager.renderResultsList("results-table-container", window.resultsManager.activeTab);
    }
  }

  setResultsTab(tabKey) {
    if (window.resultsManager) {
      window.resultsManager.activeTab = tabKey;
      document.querySelectorAll(".result-tab-btn").forEach(btn => {
        btn.classList.remove("active");
        if (btn.dataset.tab === tabKey) btn.classList.add("active");
      });
      window.resultsManager.renderResultsList("results-table-container", tabKey);
    }
  }

  /**
   * Render Test Orders Management
   */
  renderOrders() {
    const container = document.getElementById("orders-table-container");
    if (!container) return;

    const orders = window.appState.testOrders;

    container.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Patient Code</th>
              <th>Test Name</th>
              <th>Referring Clinician</th>
              <th>Priority</th>
              <th>Order Timestamp</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>${o.orderId}</strong></td>
                <td><span class="patient-code-badge sm">${o.patientCode}</span></td>
                <td><strong>${o.testName}</strong></td>
                <td>${o.doctor}</td>
                <td><span class="badge ${o.priority === 'STAT' ? 'badge-danger' : o.priority === 'Urgent' ? 'badge-warning' : 'badge-secondary'}">${o.priority}</span></td>
                <td style="font-size: 0.78rem; color: var(--text-muted);">${o.orderTime}</td>
                <td><span class="badge badge-primary">${o.status}</span></td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="app.viewPatientProfile('${o.patientCode}')">
                    Patient Profile
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render Reports List View
   */
  renderReportsList() {
    const container = document.getElementById("reports-list-container");
    if (!container) return;

    const patients = window.patientManager.getAll().slice(0, 8);

    container.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Patient Code</th>
              <th>Patient Name</th>
              <th>Test Profile</th>
              <th>Referring Doctor</th>
              <th>Review Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${patients.map(p => `
              <tr>
                <td><strong>RPT-${p.patientCode}-2026</strong></td>
                <td><span class="patient-code-badge sm">${p.patientCode}</span></td>
                <td><strong>${p.name}</strong></td>
                <td>Complete Blood Count & Liver Panel</td>
                <td>${p.referringDoctor}</td>
                <td><span class="badge badge-success">Approved & Signed</span></td>
                <td>
                  <button class="btn btn-primary btn-sm" onclick="app.viewPatientReport('${p.patientCode}')">
                    📄 View & Print Report
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  viewPatientReport(patientCode) {
    this.currentPatientCodeForReport = patientCode;
    this.navigateTo("report-preview", patientCode);
  }

  viewPatientProfile(patientCode) {
    this.navigateTo("patient-profile", patientCode);
  }

  /**
   * Render Notifications View
   */
  renderNotifications() {
    if (window.notificationManager) {
      window.notificationManager.renderNotifications("notifications-view-container");
    }
  }

  /**
   * Render Audit Trail View
   */
  renderAuditTrail(filter = "") {
    if (window.auditManager) {
      window.auditManager.renderAuditTrail("audit-table-container", filter);
    }
  }

  /**
   * Render Settings Page
   */
  renderSettings() {
    const container = document.getElementById("settings-view-container");
    if (!container) return;

    container.innerHTML = `
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <div class="card-title">🏥 Diagnostic Laboratory Profile</div>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label class="form-label">Laboratory Name</label>
              <input type="text" class="form-control" value="Sentinel Central Diagnostics & PathLab" readonly />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Accreditation Number</label>
                <input type="text" class="form-control" value="NABL / ISO 15189:2022 - BLR-9041" readonly />
              </div>
              <div class="form-group">
                <label class="form-label">Operating Hours</label>
                <input type="text" class="form-control" value="24 Hours / 7 Days (Emergency Support)" readonly />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Facility Address</label>
              <input type="text" class="form-control" value="Sentinel Health Tower, Healthcare City, Bengaluru 560103" readonly />
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🤖 AI Decision Support Configuration</div>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.85rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>AI Predictive TAT Risk Scoring</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Real-time multi-factor specimen risk calculation</div>
              </div>
              <input type="checkbox" checked disabled />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Non-Diagnostic Anomaly Detection</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Delta checks and extreme value flags</div>
              </div>
              <input type="checkbox" checked disabled />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>Automated Rescue Recommendations</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Instrument spillover and STAT prioritizing suggestions</div>
              </div>
              <input type="checkbox" checked disabled />
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>AI Draft Report Summary Assistant</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Technical interpretation assistant for Pathologist review</div>
              </div>
              <input type="checkbox" checked disabled />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Run AI Simulation (Hackathon Demo Trigger)
   */
  runSimulation() {
    const samples = window.sampleManager.getAll();
    const analyzers = window.operationsManager.getAll();

    // Dynamically adjust metrics
    samples.forEach(s => {
      if (s.status !== "Completed") {
        s.elapsedTime = Math.min(s.targetTat + 10, s.elapsedTime + 5);
        s.riskScore = Math.min(98, s.riskScore + 8);
      }
    });

    const anlA = analyzers.find(a => a.id === "ANL-A");
    if (anlA) anlA.capacity = 96;

    window.sampleManager.saveSamples();
    window.operationsManager.saveAnalyzers();

    if (window.notificationManager) {
      window.notificationManager.addNotification(
        "ai",
        "Simulation Workload Surge Triggered",
        "Sample TAT parameters adjusted. Check Sample Rescue Center for newly at-risk specimens.",
        "rescue"
      );
    }

    this.showToast("AI Simulation Complete: Workload spikes and updated risk scores calculated.", "purple");
    this.renderDashboard();
    if (this.currentPage === "rescue") this.renderRescueCenter();
    if (this.currentPage === "operations") this.renderOperations();
  }

  /**
   * Toggle Live Monitoring Loop
   */
  toggleLiveMonitoring() {
    this.liveMonitoring = !this.liveMonitoring;
    const pill = document.getElementById("live-monitor-pill");
    if (pill) {
      if (this.liveMonitoring) {
        pill.classList.add("active");
        pill.innerHTML = `<span class="ai-pulse-dot"></span> Live Monitoring Active`;
        this.showToast("Live Laboratory Monitoring Enabled (Auto-syncing every 8s)", "success");
        this.startLiveTimer();
      } else {
        pill.classList.remove("active");
        pill.innerHTML = `○ Live Monitoring Off`;
        this.showToast("Live Monitoring Paused", "secondary");
        this.stopLiveTimer();
      }
    }
  }

  startLiveTimer() {
    this.stopLiveTimer();
    this.liveTimer = setInterval(() => {
      // Periodic subtle time progression
      const samples = window.sampleManager.getAll();
      const sample = samples[Math.floor(Math.random() * samples.length)];
      if (sample && sample.status !== "Completed") {
        sample.elapsedTime = Math.min(sample.targetTat + 5, sample.elapsedTime + 1);
        window.sampleManager.saveSamples();
        if (this.currentPage === "dashboard") this.renderDashboard();
        if (this.currentPage === "rescue") this.renderRescueCenter();
      }
    }, 8000);
  }

  stopLiveTimer() {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
  }

  /**
   * Modal Management Helpers
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("active");
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  }

  openRegisterPatientModal() {
    const nextCode = window.patientManager.getNextPatientCode();
    const codePreview = document.getElementById("new-patient-code-preview");
    if (codePreview) codePreview.value = nextCode;
    this.openModal("register-patient-modal");
  }

  handlePatientRegistration(e) {
    e.preventDefault();
    const form = e.target;
    const newPatient = window.patientManager.registerPatient({
      name: form.patientName.value,
      age: form.patientAge.value,
      gender: form.patientGender.value,
      phone: form.patientPhone.value,
      email: form.patientEmail.value,
      address: form.patientAddress.value,
      referringDoctor: form.patientDoctor.value
    });

    this.closeModal("register-patient-modal");
    form.reset();
    this.showToast(`Patient Registered Successfully! Generated Patient Code: ${newPatient.patientCode}`, "success");
    this.navigateTo("patients");
  }

  openNewOrderModal(patientCode) {
    const select = document.getElementById("order-patient-code-select");
    if (select) {
      select.innerHTML = window.patientManager.getAll().map(p => `
        <option value="${p.patientCode}" ${p.patientCode === patientCode ? 'selected' : ''}>
          Code ${p.patientCode} — ${p.name}
        </option>
      `).join('');
    }
    this.openModal("create-order-modal");
  }

  handleCreateOrder(e) {
    e.preventDefault();
    const form = e.target;
    const patientCode = form.orderPatientCode.value;
    const testName = form.orderTestName.value;
    const priority = form.orderPriority.value;
    const doctor = form.orderDoctor.value || "Dr. Arvind Swamy";

    const newOrder = {
      orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      patientCode,
      testName,
      doctor,
      priority,
      orderTime: "Just now",
      status: "In Progress"
    };

    window.appState.testOrders.unshift(newOrder);
    this.saveTestOrders();

    // Also auto-create active sample
    const newSample = {
      sampleId: `SMP-${Math.floor(2000 + Math.random() * 8000)}`,
      patientCode,
      patientName: window.patientManager.getByCode(patientCode)?.name || "Patient",
      test: testName,
      sampleType: testName.includes("CBC") ? "Whole Blood (EDTA)" : "Serum (SST)",
      collectionTime: "Just now",
      currentStage: "Sample Collected",
      stageIndex: 2,
      assignedAnalyzer: testName.includes("CBC") ? "Analyzer A" : "Analyzer B",
      targetTat: priority === "STAT" ? 45 : priority === "Urgent" ? 60 : 90,
      elapsedTime: 2,
      predictedCompletion: priority === "STAT" ? 40 : 55,
      riskScore: priority === "STAT" ? 65 : 20,
      riskLevel: priority === "STAT" ? "High" : "Low",
      priority,
      status: "Collected",
      reason: "Fresh sample accessioned. Progression normal.",
      recommendation: "Load into automated centrifuge carousel.",
      rescueStatus: "None",
      temperature: "Room Temp (22°C)",
      hemolysisLevel: "None",
      volumeMl: 3.5
    };

    window.sampleManager.samples.unshift(newSample);
    window.sampleManager.saveSamples();

    this.closeModal("create-order-modal");
    form.reset();
    this.showToast(`Test Order ${newOrder.orderId} created for Patient Code ${patientCode}`, "success");
    this.navigateTo("orders");
  }

  openSampleModal(sampleId) {
    const modalBody = document.getElementById("sample-details-modal-body");
    const modalTitle = document.getElementById("sample-details-modal-title");
    if (modalBody && modalTitle) {
      modalTitle.innerHTML = `<span>🔬</span> Sample Digital Journey: <strong>${sampleId}</strong>`;
      modalBody.innerHTML = window.sampleManager.renderSampleDetailsModalContent(sampleId);
    }
    this.currentModalSampleId = sampleId;
    this.openModal("sample-details-modal");
  }

  advanceCurrentSampleStage() {
    if (this.currentModalSampleId) {
      const advanced = window.sampleManager.advanceStage(this.currentModalSampleId);
      if (advanced) {
        this.showToast(`Advanced ${this.currentModalSampleId} to next workflow stage`, "success");
        this.openSampleModal(this.currentModalSampleId);
        if (this.currentPage === "samples") window.sampleManager.renderSampleList("samples-table-container");
      } else {
        this.showToast("Sample has already reached final workflow completion stage", "warning");
      }
    }
  }

  openWhyPrioritizedModal(sampleId) {
    const sample = window.sampleManager.getById(sampleId);
    if (!sample) return;

    const modalBody = document.getElementById("why-prioritized-modal-body");
    if (modalBody) {
      const analysis = aiService.analyzeSampleRisk(sample);
      modalBody.innerHTML = `
        <div style="background-color: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 800; font-size: 1.1rem; color: var(--text-main);">${sample.sampleId} &bull; ${sample.test}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Patient Code: <span class="patient-code-badge sm">${sample.patientCode}</span> (${sample.patientName})</div>
            </div>
            <div style="text-align: right;">
              <span class="risk-pill ${analysis.riskScore >= 75 ? 'risk-critical' : 'risk-high'}">${analysis.riskScore}% Risk</span>
            </div>
          </div>
        </div>

        <h4 style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.75rem;">
          Explainability Scoring Factor Breakdown:
        </h4>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem;">
          ${analysis.factors.map(f => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: #ffffff; border: 1px solid var(--border-color); padding: 0.65rem 0.85rem; border-radius: var(--radius-sm);">
              <div>
                <strong style="color: var(--text-main); font-size: 0.85rem;">${f.name}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${f.desc}</div>
              </div>
              <span style="font-weight: 800; color: var(--primary); font-size: 0.95rem;">${f.impact} pts</span>
            </div>
          `).join('')}
        </div>

        <div class="ai-recommendation-box">
          <div class="ai-recommendation-title">Recommendation Summary</div>
          <div>${sample.recommendation}</div>
          <div style="font-size: 0.7rem; color: #6366f1; margin-top: 0.35rem;">Confidence Index: ${analysis.confidence}% &bull; Evaluated: ${analysis.timestamp}</div>
        </div>
      `;
    }
    this.openModal("why-prioritized-modal");
  }

  openAnomalyDrawer(resultId) {
    const modalBody = document.getElementById("anomaly-modal-body");
    if (modalBody && window.resultsManager) {
      modalBody.innerHTML = window.resultsManager.renderAnomalyModalContent(resultId);
    }
    this.openModal("anomaly-modal");
  }

  openRescueModal(sampleId) {
    this.navigateTo("rescue");
  }

  openReassignModal(sampleId) {
    this.currentReassignSampleId = sampleId;
    this.openModal("reassign-modal");
  }

  submitReassignAnalyzer() {
    const select = document.getElementById("reassign-analyzer-select");
    if (select && this.currentReassignSampleId) {
      window.sampleManager.reassignAnalyzer(this.currentReassignSampleId, select.value);
      this.closeModal("reassign-modal");
      this.showToast(`Sample ${this.currentReassignSampleId} reassigned to ${select.value}`, "success");
      this.renderRescueCenter();
    }
  }

  /**
   * Toast Notifications
   */
  showToast(message, type = "primary") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span>${type === 'success' ? '✓' : type === 'danger' ? '⚠️' : type === 'warning' ? '⏱️' : type === 'purple' ? '✨' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.remove()" style="color: var(--text-muted); font-size: 1rem;">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 4500);
  }

  /**
   * Update Notification Badges
   */
  updateNotificationBadges() {
    const unread = window.notificationManager ? window.notificationManager.getUnreadCount() : 0;
    const badge = document.getElementById("topbar-notif-badge");
    const sidebarBadge = document.getElementById("sidebar-notif-badge");
    if (badge) {
      badge.style.display = unread > 0 ? "block" : "none";
    }
    if (sidebarBadge) {
      sidebarBadge.textContent = unread;
      sidebarBadge.style.display = unread > 0 ? "inline-block" : "none";
    }
  }

  /**
   * User Role Management UI
   */
  updateUserUI() {
    const role = auth.getCurrentRole();
    const nameEl = document.getElementById("topbar-user-name");
    const avatarEl = document.getElementById("topbar-user-avatar");
    const roleSelect = document.getElementById("role-switcher-select");

    if (nameEl) nameEl.textContent = role.user;
    if (avatarEl) avatarEl.textContent = role.avatar;
    if (roleSelect) roleSelect.value = role.id;
  }

  handleRoleSwitch(roleId) {
    const newRole = auth.switchRole(roleId);
    this.updateUserUI();
    this.showToast(`Switched active view to role: ${newRole.name}`, "primary");
    this.navigateTo("dashboard");
  }

  /**
   * AI Chat Assistant (LabFlow AI)
   */
  toggleAiChat() {
    const drawer = document.getElementById("ai-chat-drawer");
    if (drawer) {
      drawer.classList.toggle("active");
      if (drawer.classList.contains("active")) {
        const input = document.getElementById("ai-chat-input");
        if (input) input.focus();
      }
    }
  }

  sendAiChatMessage(customText = null) {
    const input = document.getElementById("ai-chat-input");
    const text = customText || (input ? input.value.trim() : "");
    if (!text) return;

    if (input) input.value = "";

    const messagesContainer = document.getElementById("ai-chat-messages");
    if (!messagesContainer) return;

    // Append User Message
    const userMsg = document.createElement("div");
    userMsg.className = "ai-msg user";
    userMsg.textContent = text;
    messagesContainer.appendChild(userMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Generate Contextual AI Response
    setTimeout(() => {
      const responseText = aiService.chatWithAssistant(text, {
        samples: window.sampleManager ? window.sampleManager.getAll() : [],
        analyzers: window.operationsManager ? window.operationsManager.getAll() : [],
        results: window.resultsManager ? window.resultsManager.getAll() : []
      });

      const assistantMsg = document.createElement("div");
      assistantMsg.className = "ai-msg assistant";
      // Format simple markdown bold and breaks
      assistantMsg.innerHTML = responseText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<span class="patient-code-badge sm">$1</span>')
        .replace(/\n/g, '<br/>');

      messagesContainer.appendChild(assistantMsg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }, 350);
  }
}

// Global App Instance
const app = new LabFlowApp();
window.app = app;
