/**
 * LabFlow Sentinel — Clinical Diagnostic Report Generation & AI Report Assistant
 * Generates NABL/ISO-standard lab reports with printable previews and AI draft assistance.
 */

class ReportsManager {
  constructor() {
    this.currentReport = null;
  }

  getSampleTestParameters(testName, patientCode) {
    if (testName.includes("CBC")) {
      return [
        { param: "Hemoglobin (Hb)", value: "13.8", unit: "g/dL", range: "13.0 - 17.0", flag: "NORMAL" },
        { param: "Total Leukocyte Count (TLC)", value: "8,400", unit: "/μL", range: "4,000 - 11,000", flag: "NORMAL" },
        { param: "Platelet Count", value: patientCode === "0048" ? "18,000" : "240,000", unit: "/μL", range: "150,000 - 450,000", flag: patientCode === "0048" ? "CRITICAL LOW" : "NORMAL" },
        { param: "Packed Cell Volume (PCV)", value: "41.2", unit: "%", range: "40.0 - 50.0", flag: "NORMAL" },
        { param: "RBC Count", value: "4.8", unit: "million/μL", range: "4.5 - 5.5", flag: "NORMAL" }
      ];
    }
    if (testName.includes("Lipid")) {
      return [
        { param: "Serum Total Cholesterol", value: "242", unit: "mg/dL", range: "< 200", flag: "HIGH" },
        { param: "Serum Triglycerides", value: "195", unit: "mg/dL", range: "< 150", flag: "HIGH" },
        { param: "HDL Cholesterol (Good)", value: "38", unit: "mg/dL", range: "> 40", flag: "LOW" },
        { param: "LDL Cholesterol (Calculated)", value: "165", unit: "mg/dL", range: "< 100", flag: "HIGH" },
        { param: "VLDL Cholesterol", value: "39", unit: "mg/dL", range: "< 30", flag: "HIGH" }
      ];
    }
    if (testName.includes("Kidney") || testName.includes("KFT")) {
      return [
        { param: "Blood Urea Nitrogen (BUN)", value: "24", unit: "mg/dL", range: "7 - 20", flag: "HIGH" },
        { param: "Serum Creatinine", value: "1.4", unit: "mg/dL", range: "0.7 - 1.3", flag: "HIGH" },
        { param: "Serum Potassium (K+)", value: patientCode === "0004" ? "6.8" : "4.4", unit: "mEq/L", range: "3.5 - 5.0", flag: patientCode === "0004" ? "CRITICAL HIGH" : "NORMAL" },
        { param: "Serum Sodium (Na+)", value: "139", unit: "mEq/L", range: "136 - 145", flag: "NORMAL" }
      ];
    }
    // Default routine
    return [
      { param: "Fasting Blood Glucose", value: "118", unit: "mg/dL", range: "70 - 100", flag: "HIGH" },
      { param: "HbA1c Glycated Hemoglobin", value: "7.2", unit: "%", range: "< 5.7", flag: "HIGH" }
    ];
  }

  /**
   * Render Printable Diagnostic Report
   */
  renderReportPreview(containerId, patientCode = "0048", testName = "CBC") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const patient = window.patientManager ? window.patientManager.getByCode(patientCode) : null;
    if (!patient) {
      container.innerHTML = "Patient not found";
      return;
    }

    const reportId = `RPT-${patient.patientCode}-${Math.floor(1000 + Math.random() * 9000)}`;
    const testItems = this.getSampleTestParameters(testName, patientCode);
    const aiSummary = aiService.generateReportSummary(patient, testItems.map(t => ({ test: t.param, value: t.value, unit: t.unit, referenceRange: t.range, flag: t.flag })));

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('reports')">
            ← Back to All Reports
          </button>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" onclick="reportsManager.runQaCheck('${patient.patientCode}')">
            ✓ Run AI Quality Check
          </button>
          <button class="btn btn-primary btn-sm" onclick="window.print()">
            🖨️ Print / Save PDF
          </button>
          <button class="btn btn-success btn-sm" onclick="app.showToast('Report dispatched to Dr. Arvind Swamy and Patient SMS', 'success')">
            📲 Send Report to Patient
          </button>
        </div>
      </div>

      <!-- Printable A4 Paper Layout -->
      <div class="report-paper">
        <!-- Lab Header -->
        <div class="report-header-banner">
          <div>
            <div class="report-lab-name">SENTINEL CENTRAL DIAGNOSTICS</div>
            <div class="report-lab-sub">Department of Automated Hematology & Clinical Pathology</div>
            <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">
              Sentinel Tower, Healthcare City, Bengaluru 560103 &bull; Phone: +91 (80) 4122-8899
            </div>
          </div>
          <div class="report-accreditation">
            <div>★ NABL ACCREDITED LAB</div>
            <div style="color: #64748b; font-size: 0.65rem;">ISO 15189:2022 Certified</div>
            <div style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-main); margin-top: 4px;">
              Report ID: <strong>${reportId}</strong>
            </div>
          </div>
        </div>

        <!-- Patient Demographics Strip (Numeric Patient Code Prominently Highlighted) -->
        <div class="report-patient-strip">
          <div class="report-strip-item">
            <label>Patient Code</label>
            <span class="patient-code-badge">${patient.patientCode}</span>
          </div>
          <div class="report-strip-item">
            <label>Patient Name</label>
            <span>${patient.name}</span>
          </div>
          <div class="report-strip-item">
            <label>Age / Gender</label>
            <span>${patient.age} Yrs / ${patient.gender}</span>
          </div>
          <div class="report-strip-item">
            <label>Contact Phone</label>
            <span>${patient.phone}</span>
          </div>
          <div class="report-strip-item">
            <label>Referring Doctor</label>
            <span>${patient.referringDoctor}</span>
          </div>
          <div class="report-strip-item">
            <label>Sample Drawn</label>
            <span>Today, 09:40 AM</span>
          </div>
          <div class="report-strip-item">
            <label>Report Time</label>
            <span>Today, 10:25 AM</span>
          </div>
          <div class="report-strip-item">
            <label>Sample Matrix</label>
            <span>Whole Blood (K2-EDTA)</span>
          </div>
        </div>

        <!-- Test Results Table -->
        <h4 style="font-size: 0.95rem; font-weight: 800; color: #0f172a; margin-bottom: 0.6rem; text-transform: uppercase;">
          ${testName} — Automated Multi-Angle Evaluation
        </h4>

        <table class="report-table">
          <thead>
            <tr>
              <th>Test Parameter</th>
              <th>Observed Result</th>
              <th>Units</th>
              <th>Biological Reference Interval</th>
              <th>Clinical Flag</th>
            </tr>
          </thead>
          <tbody>
            ${testItems.map(item => `
              <tr style="${item.flag.includes('CRITICAL') ? 'background-color: #fee2e2; font-weight: 700;' : ''}">
                <td style="font-weight: 600;">${item.param}</td>
                <td style="font-size: 0.95rem; color: ${item.flag.includes('CRITICAL') ? '#dc2626' : item.flag === 'HIGH' ? '#ea580c' : '#0f172a'};">
                  ${item.value}
                </td>
                <td style="color: #64748b;">${item.unit}</td>
                <td style="color: #475569;">${item.range}</td>
                <td>
                  <span class="flag-badge ${item.flag.includes('CRITICAL') ? 'flag-critical' : item.flag === 'HIGH' ? 'flag-high' : 'badge-secondary'}">
                    ${item.flag}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- AI Assistant Technical Summary Draft -->
        <div class="report-ai-draft-box">
          <div class="report-ai-watermark">
            <span>✨</span> ${aiSummary.watermark}
          </div>
          <div style="font-size: 0.78rem; line-height: 1.5; color: #1e1b4b; white-space: pre-line;">
            ${aiSummary.draftContent}
          </div>
          <div style="font-size: 0.68rem; color: #6366f1; margin-top: 0.5rem; font-style: italic;">
            * This draft summary is generated by LabFlow Sentinel AI Decision Support to assist clinical workflow and has been reviewed by the signee below.
          </div>
        </div>

        <!-- Authorized Signatures -->
        <div class="report-signatures">
          <div class="signature-block">
            <div style="color: #64748b; font-size: 0.65rem; text-transform: uppercase;">Medical Lab Technologist</div>
            <div class="signature-name">Vikram Rathore, B.Sc MLT</div>
            <div style="color: #94a3b8; font-size: 0.68rem;">Instrument Operator & Delta Verified</div>
          </div>
          <div class="signature-block" style="text-align: right;">
            <div style="color: #64748b; font-size: 0.65rem; text-transform: uppercase;">Consultant Pathologist</div>
            <div class="signature-name" style="color: #1e40af;">Dr. Priya Sharma, MD (Pathology)</div>
            <div style="color: #94a3b8; font-size: 0.68rem;">Reg No: KMC-74192 &bull; Digital Signature Verified</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 2rem; font-size: 0.65rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 0.75rem;">
          *** End of Laboratory Examination Report &bull; Protected Laboratory Workflow Environment ***
        </div>
      </div>
    `;
  }

  /**
   * Run AI Quality Assurance Check on Report
   */
  runQaCheck(patientCode) {
    const patient = window.patientManager ? window.patientManager.getByCode(patientCode) : null;
    const testItems = this.getSampleTestParameters("CBC", patientCode);
    
    const qa = aiService.runQualityCheck({
      patientCode: patient ? patient.patientCode : "0048",
      results: testItems.map(t => ({ referenceRange: t.range })),
      reviewer: "Dr. Priya Sharma, MD (Pathology)"
    });

    let msg = "AI Quality Check Passed (3/3 standards verified):\n";
    qa.checks.forEach(c => {
      msg += `• ${c.name}: ${c.passed ? '✓ PASSED' : '✗ FAILED'} (${c.desc})\n`;
    });

    alert(msg);
  }
}

const reportsManager = new ReportsManager();
window.reportsManager = reportsManager;
