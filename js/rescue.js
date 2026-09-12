/**
 * LabFlow Sentinel — Sample Rescue Center & Human-in-the-Loop Workflow
 * Empowers laboratory technicians & administrators to intervene on at-risk samples.
 *
 * "Predict. Prioritize. Rescue. Deliver."
 */

class SampleRescueCenter {
  constructor() {
    this.filterRisk = "all";
  }

  getRescueSamples() {
    if (!window.sampleManager) return [];
    // Prioritize active samples with riskScore >= 50 or delayed status
    return window.sampleManager.getAll().filter(s => 
      s.status !== "Completed" && (s.riskScore >= 50 || s.status === "Delayed" || s.rescueStatus === "Pending Approval" || s.rescueStatus === "Recommended")
    ).sort((a, b) => b.riskScore - a.riskScore);
  }

  /**
   * Approve AI Rescue Recommendation (Human-in-the-Loop)
   */
  approveRescue(sampleId) {
    const sample = window.sampleManager ? window.sampleManager.getById(sampleId) : null;
    if (!sample) return false;

    const oldAnalyzer = sample.assignedAnalyzer;
    let targetAnalyzer = "Analyzer B";
    if (oldAnalyzer === "Analyzer B") targetAnalyzer = "Analyzer C";
    else if (oldAnalyzer === "Analyzer C") targetAnalyzer = "Analyzer B";

    sample.assignedAnalyzer = targetAnalyzer;
    sample.rescueStatus = "Rescue Approved";
    sample.status = "Processing";
    sample.riskScore = Math.max(20, Math.round(sample.riskScore * 0.45)); // Significant risk reduction
    sample.riskLevel = sample.riskScore >= 65 ? "High" : sample.riskScore >= 40 ? "Moderate" : "Low";
    sample.reason = `Sample rescued by ${auth.getCurrentRole().user}. Reassigned from ${oldAnalyzer} to ${targetAnalyzer} for accelerated processing.`;

    window.sampleManager.saveSamples();

    // Tamper-evident Audit Trail entry
    if (window.auditManager) {
      window.auditManager.logEvent(
        auth.getCurrentRole().user,
        auth.getCurrentRole().name,
        "Approved AI Sample Rescue",
        `Sample ${sample.sampleId} (Patient Code ${sample.patientCode})`,
        `Assigned to ${oldAnalyzer} (At Risk)`,
        `Rerouted to ${targetAnalyzer} (Rescue Approved)`
      );
    }

    // Refresh views & notify
    app.showToast(`Rescue Approved: ${sample.sampleId} reassigned to ${targetAnalyzer}`, "success");
    app.renderRescueCenter();
    app.renderDashboard();
    return true;
  }

  /**
   * Escalate sample to Laboratory Director / Supervisor
   */
  escalateSample(sampleId) {
    const sample = window.sampleManager ? window.sampleManager.getById(sampleId) : null;
    if (!sample) return;

    sample.priority = "STAT";
    sample.rescueStatus = "Escalated to Director";
    window.sampleManager.saveSamples();

    if (window.auditManager) {
      window.auditManager.logEvent(
        auth.getCurrentRole().user,
        auth.getCurrentRole().name,
        "Escalated Sample Priority",
        `Sample ${sample.sampleId}`,
        "Standard Workflow",
        "STAT Supervisor Escalation"
      );
    }

    app.showToast(`Sample ${sample.sampleId} escalated to Laboratory Director`, "warning");
    app.renderRescueCenter();
  }

  /**
   * Render the Rescue Center View
   */
  render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rescueSamples = this.getRescueSamples();

    if (rescueSamples.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-body" style="text-align: center; padding: 4rem 1rem;">
            <div style="font-size: 3rem; margin-bottom: 0.75rem;">🛡️</div>
            <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">
              No Samples At Risk — All Workflows Compliant
            </h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); max-width: 500px; margin: 0 auto 1.5rem;">
              The AI sentinel monitoring system has verified that all active specimens are progressing within established turnaround time parameters.
            </p>
            <button class="btn btn-secondary btn-sm" onclick="app.runSimulation()">
              Run AI Simulation to Trigger Workload Spike
            </button>
          </div>
        </div>
      `;
      return;
    }

    const cardsHtml = rescueSamples.map(sample => {
      const timeRemaining = Math.max(1, sample.targetTat - sample.elapsedTime);
      const isCritical = sample.riskScore >= 75;

      return `
        <div class="rescue-card ${isCritical ? '' : 'warning-level'}">
          <div class="rescue-card-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="patient-code-badge">${sample.patientCode}</span>
              <strong style="font-size: 1.05rem; color: var(--text-main);">${sample.sampleId}</strong>
            </div>
            <div class="rescue-time-remaining">
              <span>⏱️</span> ${timeRemaining} min remaining
            </div>
          </div>

          <div class="rescue-card-details">
            <div class="rescue-detail-item">
              <span class="rescue-detail-label">Patient</span>
              <span class="rescue-detail-val">${sample.patientName}</span>
            </div>
            <div class="rescue-detail-item">
              <span class="rescue-detail-label">Test Ordered</span>
              <span class="rescue-detail-val">${sample.test}</span>
            </div>
            <div class="rescue-detail-item">
              <span class="rescue-detail-label">Current Stage</span>
              <span class="rescue-detail-val">${sample.currentStage}</span>
            </div>
            <div class="rescue-detail-item">
              <span class="rescue-detail-label">Location / Analyzer</span>
              <span class="rescue-detail-val">${sample.assignedAnalyzer}</span>
            </div>
            <div class="rescue-detail-item">
              <span class="rescue-detail-label">Elapsed / Target</span>
              <span class="rescue-detail-val">${sample.elapsedTime}m / ${sample.targetTat}m</span>
            </div>
            <div class="rescue-detail-item">
              <span class="rescue-detail-label">Risk Assessment</span>
              <span class="rescue-detail-val" style="color: ${isCritical ? 'var(--danger)' : 'var(--warning)'}; font-weight: 800;">
                ${sample.riskScore}% (${sample.riskLevel})
              </span>
            </div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.4;">
            <strong style="color: var(--text-main);">Bottleneck Diagnosis:</strong> ${sample.reason}
          </div>

          <div class="ai-recommendation-box">
            <div class="ai-recommendation-title">
              <span>✨</span> AI Recommended Rescue Action:
            </div>
            <div>${sample.recommendation}</div>
            <div class="human-approval-note">
              ${sample.rescueStatus === 'Rescue Approved' 
                ? '✓ Human Approved — Action in progress' 
                : 'Decision support suggestion — Human approval required'}
            </div>
          </div>

          <div class="rescue-actions">
            ${sample.rescueStatus === 'Rescue Approved' ? `
              <span class="badge badge-success" style="padding: 0.5rem 0.85rem;">
                ✓ Rescue Approved & Active
              </span>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="rescueCenter.approveRescue('${sample.sampleId}')">
                ✓ Approve Rescue
              </button>
              <button class="btn btn-warning btn-sm" onclick="app.openReassignModal('${sample.sampleId}')">
                Reassign Analyzer
              </button>
              <button class="btn btn-secondary btn-sm" onclick="rescueCenter.escalateSample('${sample.sampleId}')">
                Escalate
              </button>
            `}
            <button class="btn btn-secondary btn-sm" style="margin-left: auto;" onclick="app.openSampleModal('${sample.sampleId}')">
              View Sample
            </button>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="ai-disclaimer-banner">
        <span>🛡️</span>
        <div>
          <strong>Human-in-the-Loop Protocol:</strong> AI-generated recommendations identify predicted turnaround bottlenecks and suggest rerouting actions. Final clinical and operational actions require authorized human approval.
        </div>
      </div>

      <div class="rescue-grid">
        ${cardsHtml}
      </div>
    `;
  }
}

const rescueCenter = new SampleRescueCenter();
window.rescueCenter = rescueCenter;
