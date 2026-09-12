/**
 * LabFlow Sentinel — Results Management & Non-Diagnostic AI Anomaly Detection
 * High-stakes clinical findings validation with delta checks and human-in-the-loop review.
 */

class ResultsManager {
  constructor() {
    this.storageKey = "labflow_results_data";
    this.results = this.loadResults();
    this.activeTab = "all";
  }

  loadResults() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed loading results", e);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(SEED_CRITICAL_RESULTS));
    return [...SEED_CRITICAL_RESULTS];
  }

  saveResults() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.results));
  }

  getAll() {
    return this.results;
  }

  getById(id) {
    return this.results.find(r => r.resultId === id);
  }

  /**
   * Pathologist Result Review & Sign-Off
   */
  signOffResult(resultId) {
    const res = this.getById(resultId);
    if (!res) return;

    res.status = "Reviewed & Verified";
    res.reviewer = auth.getCurrentRole().user;
    this.saveResults();

    if (window.auditManager) {
      window.auditManager.logEvent(
        auth.getCurrentRole().user,
        auth.getCurrentRole().name,
        "Reviewed & Signed Off Lab Result",
        `Result ${res.resultId} (Patient Code ${res.patientCode} - ${res.test})`,
        "Pending Review",
        "Clinically Verified"
      );
    }

    app.showToast(`Result ${res.resultId} signed off by ${auth.getCurrentRole().user}`, "success");
    app.renderResults();
  }

  /**
   * Dismiss AI Anomaly Flag
   */
  dismissFlag(resultId) {
    const res = this.getById(resultId);
    if (!res) return;

    res.status = "Flag Dismissed by Pathologist";
    this.saveResults();

    if (window.auditManager) {
      window.auditManager.logEvent(
        auth.getCurrentRole().user,
        auth.getCurrentRole().name,
        "Dismissed AI Anomaly Flag",
        `Result ${res.resultId}`,
        "Flagged Anomaly",
        "Clinically Correlated (Non-significant)"
      );
    }

    app.showToast(`Anomaly flag dismissed for ${res.resultId}`, "warning");
    app.renderResults();
  }

  /**
   * Filter results by tab
   */
  getFilteredResults(tabKey) {
    if (tabKey === "critical") {
      return this.results.filter(r => r.flag && r.flag.includes("CRITICAL"));
    }
    if (tabKey === "pending") {
      return this.results.filter(r => r.status.includes("Alert") || r.status.includes("Pending") || r.status.includes("Flagged"));
    }
    if (tabKey === "reviewed") {
      return this.results.filter(r => r.status.includes("Reviewed") || r.status.includes("Verified"));
    }
    return this.results;
  }

  /**
   * Render Results Table
   */
  renderResultsList(containerId, tabKey = "all") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const filtered = this.getFilteredResults(tabKey);
    const criticalCount = this.results.filter(r => r.flag && r.flag.includes("CRITICAL") && !r.status.includes("Verified")).length;

    let bannerHtml = "";
    if (criticalCount > 0) {
      bannerHtml = `
        <div class="critical-banner">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.5rem;">🚨</span>
            <div>
              <div class="critical-banner-text">
                ${criticalCount} Critical Laboratory Result(s) Require Urgent Clinical Correlation!
              </div>
              <div style="font-size: 0.75rem; color: #7f1d1d; margin-top: 2px;">
                Critical findings must be telephonically communicated to the referring physician within 15 minutes of validation.
              </div>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" onclick="app.setResultsTab('critical')">
            View All Critical Findings
          </button>
        </div>
      `;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        ${bannerHtml}
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
          <div style="font-weight: 700; color: var(--text-main);">No Results in this Category</div>
          <p style="font-size: 0.8rem; margin-top: 4px;">All samples in this queue have been processed and signed off.</p>
        </div>
      `;
      return;
    }

    const rowsHtml = filtered.map(r => {
      const isCritical = r.flag && r.flag.includes("CRITICAL");
      const isPending = !r.status.includes("Verified");

      return `
        <tr class="${isCritical ? 'critical-row' : ''}">
          <td>
            <span class="patient-code-badge">${r.patientCode}</span>
            <div style="font-weight: 700; color: var(--text-main); margin-top: 2px;">${r.patientName}</div>
          </td>
          <td>
            <strong style="color: var(--text-main);">${r.sampleId}</strong>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${r.timestamp}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${r.test}</div>
          </td>
          <td>
            <div style="font-size: 1.05rem; font-weight: 800; color: ${isCritical ? '#dc2626' : 'var(--text-main)'};">
              ${r.value} <span style="font-size: 0.75rem; font-weight: 500; color: var(--text-muted);">${r.unit}</span>
            </div>
          </td>
          <td>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${r.referenceRange} ${r.unit}</span>
          </td>
          <td>
            <span class="flag-badge ${isCritical ? 'flag-critical' : 'flag-high'}">${r.flag}</span>
          </td>
          <td>
            <span class="badge ${isPending ? 'badge-danger' : 'badge-success'}">${r.status}</span>
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">${r.reviewer}</div>
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="app.openAnomalyDrawer('${r.resultId}')">
                AI Anomaly Details
              </button>
              ${isPending ? `
                <button class="btn btn-primary btn-sm" onclick="resultsManager.signOffResult('${r.resultId}')">
                  Sign Off
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      ${bannerHtml}
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Patient Code / Name</th>
              <th>Sample ID / Time</th>
              <th>Test Parameter</th>
              <th>Observed Value</th>
              <th>Biological Reference</th>
              <th>Flag</th>
              <th>Review Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render Anomaly Details in Modal
   */
  renderAnomalyModalContent(resultId) {
    const res = this.getById(resultId);
    if (!res) return "Result not found";

    const aiCheck = aiService.detectResultAnomaly(res);

    return `
      <!-- Prominent Medical Disclaimer -->
      <div class="ai-disclaimer-banner" style="margin-bottom: 1.25rem;">
        <span>⚠️</span>
        <div>
          <strong>Non-Diagnostic AI Observation:</strong> ${aiCheck.disclaimer}
        </div>
      </div>

      <!-- Result Snapshot -->
      <div style="background-color: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="patient-code-badge">${res.patientCode}</span>
            <strong style="font-size: 1.1rem; color: var(--text-main);">${res.patientName}</strong>
          </div>
          <span class="flag-badge flag-critical">${res.flag}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; font-size: 0.82rem;">
          <div><span style="color: var(--text-muted);">Test:</span> <strong>${res.test}</strong></div>
          <div><span style="color: var(--text-muted);">Current Value:</span> <strong style="color: #dc2626; font-size: 1rem;">${res.value} ${res.unit}</strong></div>
          <div><span style="color: var(--text-muted);">Standard Ref:</span> <strong>${res.referenceRange} ${res.unit}</strong></div>
        </div>
      </div>

      <!-- Delta Check Comparison -->
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
        <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.75rem;">
          Historical Delta Check Comparison
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.8rem;">
          <div style="background: #f1f5f9; padding: 0.75rem; border-radius: var(--radius-sm);">
            <div style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">Prior Baseline</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main);">${res.historicalValue}</div>
          </div>
          <div style="background: #fee2e2; padding: 0.75rem; border-radius: var(--radius-sm);">
            <div style="color: #991b1b; font-size: 0.7rem; text-transform: uppercase;">Variance / Delta Deviation</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: #dc2626;">${res.deltaDeviation}</div>
          </div>
        </div>
      </div>

      <!-- AI Observation Text -->
      <div class="ai-recommendation-box" style="margin-bottom: 1.5rem;">
        <div class="ai-recommendation-title">
          <span>✨</span> Heuristic Anomaly Evaluation
        </div>
        <div style="margin-bottom: 0.5rem;">${aiCheck.reason}</div>
        <div><strong>Suggested Action:</strong> ${aiCheck.suggestedAction}</div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button class="btn btn-secondary btn-sm" onclick="resultsManager.dismissFlag('${res.resultId}'); app.closeModal('anomaly-modal');">
          Dismiss Flag
        </button>
        <button class="btn btn-primary btn-sm" onclick="resultsManager.signOffResult('${res.resultId}'); app.closeModal('anomaly-modal');">
          ✓ Accept & Clinically Sign Off
        </button>
      </div>
    `;
  }
}

const resultsManager = new ResultsManager();
window.resultsManager = resultsManager;
