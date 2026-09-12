/**
 * LabFlow Sentinel — Sample Management & 10-Stage Digital Journey Engine
 * Tracks specimens from Patient Registration through Analyzer to Report & Patient Notification.
 */

class SampleManager {
  constructor() {
    this.storageKey = "labflow_samples_data";
    this.samples = this.loadSamples();
  }

  loadSamples() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed loading samples from localStorage", e);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(SEED_SAMPLES));
    return [...SEED_SAMPLES];
  }

  saveSamples() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.samples));
  }

  getAll() {
    return this.samples;
  }

  getById(sampleId) {
    return this.samples.find(s => s.sampleId === sampleId) || null;
  }

  getByPatientCode(patientCode) {
    const cleanCode = String(patientCode).padStart(4, "0");
    return this.samples.filter(s => s.patientCode === cleanCode);
  }

  /**
   * Advance sample to next journey stage
   */
  advanceStage(sampleId) {
    const sample = this.getById(sampleId);
    if (!sample) return false;

    if (sample.stageIndex < 10) {
      const oldStage = sample.currentStage;
      sample.stageIndex += 1;
      sample.currentStage = TEN_STAGE_JOURNEY[sample.stageIndex - 1].title;
      
      // Update status if reached completion
      if (sample.stageIndex === 9) {
        sample.status = "Completed";
        sample.riskScore = 5;
        sample.riskLevel = "Low";
      } else if (sample.stageIndex === 10) {
        sample.status = "Completed";
        sample.riskScore = 0;
        sample.riskLevel = "Low";
      }

      this.saveSamples();

      // Log in Audit Trail
      if (window.auditManager) {
        window.auditManager.logEvent(
          auth.getCurrentRole().user,
          auth.getCurrentRole().name,
          "Advanced Workflow Stage",
          `Sample ${sample.sampleId} (Patient Code ${sample.patientCode})`,
          oldStage,
          sample.currentStage
        );
      }

      return true;
    }
    return false;
  }

  /**
   * Reassign sample to a different analyzer
   */
  reassignAnalyzer(sampleId, newAnalyzerName) {
    const sample = this.getById(sampleId);
    if (!sample) return false;

    const oldAnalyzer = sample.assignedAnalyzer;
    sample.assignedAnalyzer = newAnalyzerName;
    
    // Recalculate risk post-reassignment
    if (newAnalyzerName !== "Analyzer A") {
      sample.riskScore = Math.max(15, sample.riskScore - 30);
      sample.riskLevel = sample.riskScore >= 65 ? "High" : sample.riskScore >= 40 ? "Moderate" : "Low";
      sample.rescueStatus = "Rescue Approved";
    }

    this.saveSamples();

    if (window.auditManager) {
      window.auditManager.logEvent(
        auth.getCurrentRole().user,
        auth.getCurrentRole().name,
        "Reassigned Analyzer",
        `Sample ${sample.sampleId}`,
        oldAnalyzer,
        newAnalyzerName
      );
    }

    return true;
  }

  /**
   * Filter samples
   */
  filterSamples({ stage = "all", risk = "all", analyzer = "all", priority = "all", search = "" } = {}) {
    return this.samples.filter(s => {
      if (stage !== "all" && s.currentStage !== stage) return false;
      if (risk !== "all" && s.riskLevel.toLowerCase() !== risk.toLowerCase()) return false;
      if (analyzer !== "all" && s.assignedAnalyzer !== analyzer) return false;
      if (priority !== "all" && s.priority.toLowerCase() !== priority.toLowerCase()) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.sampleId.toLowerCase().includes(q) ||
          s.patientCode.includes(q) ||
          s.patientName.toLowerCase().includes(q) ||
          s.test.toLowerCase().includes(q);
      }
      return true;
    });
  }

  /**
   * Render Samples List Page
   */
  renderSampleList(containerId, filters = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const filtered = this.filterSamples(filters);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🧪</div>
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">No Samples Matching Filter</div>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">Adjust your filter selections to view registered specimens.</p>
        </div>
      `;
      return;
    }

    let rowsHtml = filtered.map(s => {
      let riskBadgeClass = "risk-low";
      if (s.riskScore >= 80) riskBadgeClass = "risk-critical";
      else if (s.riskScore >= 65) riskBadgeClass = "risk-high";
      else if (s.riskScore >= 40) riskBadgeClass = "risk-moderate";

      let priorityBadgeClass = "badge-secondary";
      if (s.priority === "STAT") priorityBadgeClass = "badge-danger";
      else if (s.priority === "Urgent") priorityBadgeClass = "badge-warning";

      let statusBadgeClass = "badge-secondary";
      if (s.status === "Completed") statusBadgeClass = "badge-success";
      else if (s.status === "Delayed") statusBadgeClass = "badge-danger";
      else if (s.status === "Processing") statusBadgeClass = "badge-primary";

      return `
        <tr class="${s.riskScore >= 80 ? 'critical-row' : s.riskScore >= 65 ? 'warning-row' : ''}">
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${s.sampleId}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${s.sampleType}</div>
          </td>
          <td>
            <span class="patient-code-badge sm">${s.patientCode}</span>
            <div style="font-size: 0.78rem; font-weight: 600; margin-top: 2px;">${s.patientName}</div>
          </td>
          <td>
            <strong>${s.test}</strong>
          </td>
          <td>
            <span class="badge ${priorityBadgeClass}">${s.priority}</span>
          </td>
          <td>
            <span class="badge badge-primary">${s.currentStage}</span>
          </td>
          <td>
            <div style="font-size: 0.8rem; font-weight: 600;">${s.assignedAnalyzer}</div>
          </td>
          <td>
            <div style="font-size: 0.78rem;">
              <span>${s.elapsedTime}m</span> / 
              <span style="color: var(--text-muted);">${s.targetTat}m target</span>
            </div>
          </td>
          <td>
            <span class="risk-pill ${riskBadgeClass}">${s.riskScore}%</span>
          </td>
          <td>
            <span class="badge ${statusBadgeClass}">${s.status}</span>
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="app.openSampleModal('${s.sampleId}')">
                Journey
              </button>
              ${s.riskScore >= 70 && s.status !== 'Completed' ? `
                <button class="btn btn-danger btn-sm" onclick="app.openRescueModal('${s.sampleId}')">
                  Rescue
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Sample ID</th>
              <th>Patient Code / Name</th>
              <th>Test Ordered</th>
              <th>Priority</th>
              <th>Current Stage</th>
              <th>Assigned Analyzer</th>
              <th>Elapsed / Target TAT</th>
              <th>AI Risk</th>
              <th>Status</th>
              <th>Action</th>
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
   * Render 10-Stage Sequential Timeline Stepper inside Details Modal
   */
  renderSampleDetailsModalContent(sampleId) {
    const sample = this.getById(sampleId);
    if (!sample) return "Sample not found";

    const stagesHtml = TEN_STAGE_JOURNEY.map(st => {
      let stateClass = "";
      let icon = st.index;
      let statusLabel = "Waiting";

      if (st.index < sample.stageIndex) {
        stateClass = "completed";
        icon = "✓";
        statusLabel = "Completed";
      } else if (st.index === sample.stageIndex) {
        stateClass = sample.riskScore >= 80 ? "critical" : sample.riskScore >= 65 ? "delayed" : "current";
        icon = "●";
        statusLabel = sample.status === "Delayed" ? "Delayed / Bottleneck" : "In Progress";
      }

      return `
        <div class="timeline-step ${stateClass}">
          <div class="timeline-icon-wrap">${icon}</div>
          <div class="timeline-content">
            <div class="timeline-step-header">
              <div class="timeline-stage-title">${st.title}</div>
              <span class="badge ${stateClass === 'completed' ? 'badge-success' : stateClass === 'current' ? 'badge-primary' : stateClass === 'delayed' ? 'badge-warning' : stateClass === 'critical' ? 'badge-danger' : 'badge-secondary'}">
                ${statusLabel}
              </span>
            </div>
            <div class="timeline-meta">
              <span><strong>Role:</strong> ${st.responsibleRole}</span>
              <span><strong>Std Duration:</strong> ${st.typicalDuration}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <!-- Header Summary Strip -->
      <div style="background-color: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span style="font-size: 1.2rem; font-weight: 800; color: var(--text-main);">${sample.sampleId}</span>
              <span class="patient-code-badge">${sample.patientCode}</span>
              <span class="badge ${sample.priority === 'STAT' ? 'badge-danger' : 'badge-primary'}">${sample.priority}</span>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              <strong>Patient:</strong> ${sample.patientName} &bull; <strong>Test:</strong> ${sample.test} &bull; <strong>Tube:</strong> ${sample.sampleType}
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">AI Risk Score</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: ${sample.riskScore >= 80 ? 'var(--danger)' : sample.riskScore >= 50 ? 'var(--warning)' : 'var(--success)'};">
              ${sample.riskScore}%
            </div>
          </div>
        </div>
      </div>

      <!-- Operational Parameters Grid -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; font-size: 0.8rem;">
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem;">
          <div style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">Assigned Analyzer</div>
          <div style="font-weight: 700; color: var(--text-main);">${sample.assignedAnalyzer}</div>
        </div>
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem;">
          <div style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">Elapsed / Target TAT</div>
          <div style="font-weight: 700; color: var(--text-main);">${sample.elapsedTime}m / ${sample.targetTat}m</div>
        </div>
        <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem;">
          <div style="color: var(--text-muted); font-size: 0.7rem; text-transform: uppercase;">Est. Completion</div>
          <div style="font-weight: 700; color: var(--text-main);">${sample.predictedCompletion} min</div>
        </div>
      </div>

      <!-- AI Recommendation Banner -->
      <div class="ai-recommendation-box" style="margin-bottom: 1.5rem;">
        <div class="ai-recommendation-title">
          <span>✨</span> AI Decision Support Analysis
        </div>
        <div style="margin-bottom: 0.35rem;"><strong>Diagnosis:</strong> ${sample.reason}</div>
        <div><strong>Recommended Action:</strong> ${sample.recommendation}</div>
        <div class="human-approval-note">Note: Recommendations are decision-support suggestions only and require human approval.</div>
      </div>

      <!-- 10-Stage Sequential Timeline -->
      <div style="margin-bottom: 1rem;">
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin-bottom: 1rem;">
          Detailed Sample Journey (10-Stage Protocol)
        </h4>
        <div class="sample-timeline">
          ${stagesHtml}
        </div>
      </div>
    `;
  }
}

const sampleManager = new SampleManager();
window.sampleManager = sampleManager;
