/**
 * LabFlow Sentinel — Operations Center & What-If Operational Simulator
 * Real-time monitoring of automated laboratory instrumentation, load prediction,
 * and dynamic scenario stress testing.
 */

class OperationsManager {
  constructor() {
    this.storageKey = "labflow_analyzers_data";
    this.analyzers = this.loadAnalyzers();
    this.activeScenario = "analyzer_a_failure";
  }

  loadAnalyzers() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed loading analyzers", e);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(SEED_ANALYZERS));
    return [...SEED_ANALYZERS];
  }

  saveAnalyzers() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.analyzers));
  }

  getAll() {
    return this.analyzers;
  }

  getById(id) {
    return this.analyzers.find(a => a.id === id);
  }

  /**
   * Rebalance workload between analyzers
   */
  rebalanceWorkload() {
    const anlA = this.getById("ANL-A");
    const anlB = this.getById("ANL-B");
    if (!anlA || !anlB) return;

    // Shift 5 samples from A to B
    anlA.capacity = Math.max(72, anlA.capacity - 18);
    anlA.activeQueue = Math.max(6, anlA.activeQueue - 5);
    anlA.status = "Available";
    anlA.warning = null;

    anlB.capacity = Math.min(85, anlB.capacity + 14);
    anlB.activeQueue += 5;

    this.saveAnalyzers();

    if (window.auditManager) {
      window.auditManager.logEvent(
        auth.getCurrentRole().user,
        auth.getCurrentRole().name,
        "Rebalanced Analyzer Workload",
        "Analyzer A & B Queue Balancing",
        "Analyzer A 94% Saturation",
        "Analyzer A 76% (Normal) / Analyzer B 77%"
      );
    }

    app.showToast("Workload successfully rebalanced across Analyzers A and B", "success");
    app.renderOperations();
    app.renderDashboard();
  }

  /**
   * Set active scenario in What-If Simulator
   */
  setScenario(scenarioKey) {
    this.activeScenario = scenarioKey;
    this.renderSimulator("what-if-container");
  }

  /**
   * Apply AI Mitigation Plan from What-If Simulator
   */
  applyMitigation(scenarioKey) {
    this.rebalanceWorkload();
    app.showToast(`Applied AI Mitigation Plan for: ${scenarioKey.replace(/_/g, " ").toUpperCase()}`, "purple");
  }

  /**
   * Render Operations Monitoring Grid
   */
  renderAnalyzers(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cardsHtml = this.analyzers.map(anl => {
      let progressClass = "normal";
      let statusBadge = "badge-success";

      if (anl.capacity >= 90) {
        progressClass = "critical";
        statusBadge = "badge-danger";
      } else if (anl.capacity >= 65) {
        progressClass = "moderate";
        statusBadge = "badge-warning";
      }

      return `
        <div class="analyzer-card">
          <div class="analyzer-header">
            <div>
              <div class="analyzer-name">${anl.name}</div>
              <div class="analyzer-type">${anl.model} &bull; ${anl.type}</div>
            </div>
            <span class="badge ${statusBadge}">${anl.status}</span>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.35rem;">
              <span style="font-weight: 600; color: var(--text-main);">Instrument Utilization</span>
              <strong style="font-size: 1rem; color: ${anl.capacity >= 90 ? 'var(--danger)' : 'var(--text-main)'};">${anl.capacity}%</strong>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill ${progressClass}" style="width: ${anl.capacity}%;"></div>
            </div>
          </div>

          <div class="analyzer-stats-row">
            <div>Active Queue: <strong style="color: var(--text-main);">${anl.activeQueue} samples</strong></div>
            <div>Throughput: <strong style="color: var(--text-main);">${anl.maxThroughputPerHour}/hr max</strong></div>
          </div>

          <div style="font-size: 0.72rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
            <strong>Tests Handled:</strong> ${anl.supportedTests.join(", ")}
          </div>

          ${anl.warning ? `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-sm); padding: 0.5rem; font-size: 0.72rem; color: #991b1b;">
              ⚠️ <strong>Warning:</strong> ${anl.warning}
            </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 0.5rem;">
            <span style="font-size: 0.7rem; color: var(--text-muted);">Calibrated: ${anl.lastCalibration}</span>
            ${anl.capacity >= 80 ? `
              <button class="btn btn-warning btn-sm" onclick="operationsManager.rebalanceWorkload()">
                Balance Queue
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" onclick="app.showToast('${anl.name} diagnostics normal', 'success')">
                Diagnostics
              </button>
            `}
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = cardsHtml;
  }

  /**
   * Render What-If Simulator Panel
   */
  renderSimulator(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const samples = window.sampleManager ? window.sampleManager.getAll() : [];
    const simulationResult = aiService.simulateWhatIf(this.activeScenario, samples, this.analyzers);

    container.innerHTML = `
      <div class="what-if-panel">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
              <span>🔮</span> What-If Operational Simulator
            </h3>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              Stress-test laboratory resilience by simulating real-world failures, volume surges, or staff shortages.
            </p>
          </div>
          <span class="badge badge-purple">AI Predictive Modeling Active</span>
        </div>

        <!-- Scenario Selector Buttons -->
        <div class="scenario-buttons-grid">
          <div class="scenario-btn ${this.activeScenario === 'analyzer_a_failure' ? 'active' : ''}" onclick="operationsManager.setScenario('analyzer_a_failure')">
            <div class="scenario-btn-title">⚠️ Analyzer A Breakdown</div>
            <div class="scenario-btn-desc">Hematology fluidics failure simulation</div>
          </div>
          <div class="scenario-btn ${this.activeScenario === 'staff_shortage' ? 'active' : ''}" onclick="operationsManager.setScenario('staff_shortage')">
            <div class="scenario-btn-title">👥 Staff Shortage</div>
            <div class="scenario-btn-desc">Accession & centrifuge lag</div>
          </div>
          <div class="scenario-btn ${this.activeScenario === 'stat_surge' ? 'active' : ''}" onclick="operationsManager.setScenario('stat_surge')">
            <div class="scenario-btn-title">🚨 Emergency STAT Surge</div>
            <div class="scenario-btn-desc">+25 trauma panels incoming</div>
          </div>
        </div>

        <!-- Simulation Comparison (Before vs After) -->
        <div class="comparison-grid">
          <div class="comparison-column before">
            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem;">
              Current Baseline State
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem;">
              <div>• Active Processing Workload: <strong>${samples.filter(s => s.status !== 'Completed').length} specimens</strong></div>
              <div>• Analyzer A Load: <strong>${this.getById('ANL-A')?.capacity || 94}%</strong></div>
              <div>• Average TAT Breach Risk: <strong>5.4%</strong></div>
              <div>• Bottlenecks: <strong>Routine morning queue</strong></div>
            </div>
          </div>

          <div class="comparison-column simulated">
            <div style="font-size: 0.72rem; font-weight: 700; color: #dc2626; text-transform: uppercase; margin-bottom: 0.5rem;">
              Simulated Impact (${simulationResult.scenarioName})
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem;">
              <div>• Expected Delayed Samples: <strong style="color: #b91c1c; font-size: 0.95rem;">${simulationResult.expectedDelayedSamples} samples</strong></div>
              <div>• Estimated TAT Impact: <strong style="color: #b91c1c;">+${simulationResult.estimatedTatImpactMinutes} minutes average delay</strong></div>
              <div>• Immediate Bottleneck: <strong>${simulationResult.primaryBottleneck}</strong></div>
              <div>• Systemic Risk Shift: <strong style="color: #991b1b;">${simulationResult.riskShift}</strong></div>
            </div>
          </div>
        </div>

        <!-- AI Mitigation Plan Box -->
        <div class="ai-recommendation-box" style="margin-bottom: 1.25rem;">
          <div class="ai-recommendation-title">
            <span>✨</span> Recommended AI Mitigation Strategy:
          </div>
          <div style="font-size: 0.82rem; margin-bottom: 0.5rem;">
            ${simulationResult.aiMitigationPlan}
          </div>
          <ul style="padding-left: 1.25rem; font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.25rem;">
            ${simulationResult.mitigationActions.map(act => `<li>${act}</li>`).join('')}
          </ul>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-secondary btn-sm" onclick="operationsManager.setScenario('analyzer_a_failure')">
            Reset Simulation
          </button>
          <button class="btn btn-primary btn-sm" onclick="operationsManager.applyMitigation('${this.activeScenario}')">
            ⚡ Apply Recommended Mitigation
          </button>
        </div>
      </div>
    `;
  }
}

const operationsManager = new OperationsManager();
window.operationsManager = operationsManager;
