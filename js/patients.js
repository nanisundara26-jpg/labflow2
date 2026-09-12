/**
 * LabFlow Sentinel — Patient Management & 4-Digit Numeric Patient Code Engine
 * Strict Requirement: Zero QR/Barcode. Automatic zero-padded 4-digit Patient Code (e.g. 0048 -> 0049).
 */

class PatientManager {
  constructor() {
    this.storageKey = "labflow_patients_data";
    this.counterKey = "labflow_patient_counter";
    this.patients = this.loadPatients();
    this.counter = this.loadCounter();
  }

  loadPatients() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed loading patients from localStorage", e);
    }
    // Default seed
    localStorage.setItem(this.storageKey, JSON.stringify(SEED_PATIENTS));
    return [...SEED_PATIENTS];
  }

  loadCounter() {
    try {
      const stored = localStorage.getItem(this.counterKey);
      if (stored) {
        return parseInt(stored, 10);
      }
    } catch (e) {
      console.error("Failed loading counter", e);
    }
    // Default counter
    localStorage.setItem(this.counterKey, INITIAL_PATIENT_COUNTER.toString());
    return INITIAL_PATIENT_COUNTER;
  }

  savePatients() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.patients));
  }

  saveCounter() {
    localStorage.setItem(this.counterKey, this.counter.toString());
  }

  /**
   * Generates next sequential 4-digit Patient Code
   * e.g., 48 -> "0049"
   */
  getNextPatientCode() {
    const nextNum = this.counter + 1;
    return String(nextNum).padStart(4, "0");
  }

  /**
   * Register a new patient
   */
  registerPatient(formData) {
    this.counter += 1;
    const newCode = String(this.counter).padStart(4, "0");
    this.saveCounter();

    const now = new Date();
    const formattedDate = `${now.toISOString().split("T")[0]} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newPatient = {
      patientCode: newCode,
      name: formData.name.trim(),
      age: parseInt(formData.age, 10),
      gender: formData.gender,
      phone: formData.phone.trim(),
      email: formData.email ? formData.email.trim() : `patient.${newCode}@example.com`,
      address: formData.address ? formData.address.trim() : "Standard City Address",
      referringDoctor: formData.referringDoctor ? formData.referringDoctor.trim() : "Self-Referred",
      registrationDate: formattedDate
    };

    this.patients.unshift(newPatient);
    this.savePatients();

    // Record in audit log
    if (window.auditManager) {
      window.auditManager.logEvent(
        auth.getCurrentRole().user,
        auth.getCurrentRole().name,
        "Registered New Patient",
        `Patient Code ${newCode} (${newPatient.name})`,
        "Unregistered",
        "Registered & Active"
      );
    }

    return newPatient;
  }

  getAll() {
    return this.patients;
  }

  getByCode(patientCode) {
    const cleanCode = String(patientCode).padStart(4, "0");
    return this.patients.find(p => p.patientCode === cleanCode) || null;
  }

  search(query) {
    if (!query) return this.patients;
    const q = query.toLowerCase().trim();
    return this.patients.filter(p => 
      p.patientCode.includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.referringDoctor && p.referringDoctor.toLowerCase().includes(q))
    );
  }

  /**
   * Renders the Patient List View
   */
  renderPatientList(containerId, searchQuery = "") {
    const container = document.getElementById(containerId);
    if (!container) return;

    const filtered = this.search(searchQuery);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">👥</div>
          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main);">No Patients Found</div>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">Try adjusting your search criteria or register a new patient.</p>
        </div>
      `;
      return;
    }

    let rowsHtml = filtered.map(patient => {
      return `
        <tr>
          <td>
            <span class="patient-code-badge">${patient.patientCode}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${patient.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${patient.phone}</div>
          </td>
          <td>${patient.age} yrs / ${patient.gender}</td>
          <td>${patient.referringDoctor}</td>
          <td style="font-size: 0.78rem; color: var(--text-muted);">${patient.registrationDate}</td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm" onclick="app.viewPatientProfile('${patient.patientCode}')">
                View Profile
              </button>
              <button class="btn btn-primary btn-sm" onclick="app.openNewOrderModal('${patient.patientCode}')">
                + Order Test
              </button>
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
              <th>Patient Code</th>
              <th>Name & Contact</th>
              <th>Demographics</th>
              <th>Referring Doctor</th>
              <th>Registered At</th>
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
   * Render Comprehensive Patient Profile
   */
  renderPatientProfile(containerId, patientCode) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const patient = this.getByCode(patientCode);
    if (!patient) {
      container.innerHTML = `<div class="card"><div class="card-body">Patient ${patientCode} not found.</div></div>`;
      return;
    }

    // Retrieve associated samples and orders
    const samples = window.sampleManager ? window.sampleManager.getByPatientCode(patientCode) : [];
    const orders = window.appState ? window.appState.testOrders.filter(o => o.patientCode === patientCode) : [];
    const criticals = window.appState ? window.appState.results.filter(r => r.patientCode === patientCode && r.flag && r.flag.includes("CRITICAL")) : [];

    container.innerHTML = `
      <div style="margin-bottom: 1.25rem;">
        <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('patients')">
          ← Back to Patients Directory
        </button>
      </div>

      <!-- Patient Header Card -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div class="card-body" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1.25rem;">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <div style="width: 58px; height: 58px; border-radius: var(--radius-md); background: linear-gradient(135deg, #0284c7, #2563eb); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800;">
              ${patient.name.charAt(0)}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.25rem;">
                <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin: 0;">${patient.name}</h2>
                <span class="patient-code-badge lg">${patient.patientCode}</span>
              </div>
              <div style="font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 1rem; flex-wrap: wrap;">
                <span><strong>Age/Sex:</strong> ${patient.age} yrs, ${patient.gender}</span>
                <span><strong>Phone:</strong> ${patient.phone}</span>
                <span><strong>Email:</strong> ${patient.email}</span>
                <span><strong>Doctor:</strong> ${patient.referringDoctor}</span>
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.6rem;">
            <button class="btn btn-primary" onclick="app.openNewOrderModal('${patient.patientCode}')">
              + Create Test Order
            </button>
            <button class="btn btn-secondary" onclick="app.viewPatientReport('${patient.patientCode}')">
              📄 View Reports
            </button>
          </div>
        </div>
      </div>

      <!-- Profile Tabbed Sections -->
      <div class="dashboard-grid">
        <!-- Left Column: Active Samples & Tests -->
        <div>
          <div class="card">
            <div class="card-header">
              <div class="card-title">🔬 Active & Recent Samples (${samples.length})</div>
            </div>
            <div class="card-body no-padding">
              ${samples.length === 0 ? `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted);">No samples registered for this patient yet.</div>
              ` : `
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Sample ID</th>
                        <th>Test</th>
                        <th>Current Stage</th>
                        <th>Analyzer</th>
                        <th>Risk Score</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${samples.map(s => `
                        <tr>
                          <td><strong>${s.sampleId}</strong></td>
                          <td>${s.test}</td>
                          <td><span class="badge badge-primary">${s.currentStage}</span></td>
                          <td>${s.assignedAnalyzer}</td>
                          <td><span class="risk-pill ${s.riskScore >= 75 ? 'risk-critical' : s.riskScore >= 45 ? 'risk-high' : 'risk-low'}">${s.riskScore}%</span></td>
                          <td>
                            <button class="btn btn-secondary btn-sm" onclick="app.openSampleModal('${s.sampleId}')">Details</button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>

          <!-- Orders History -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">📋 Test Order History (${orders.length})</div>
            </div>
            <div class="card-body no-padding">
              ${orders.length === 0 ? `
                <div style="padding: 2rem; text-align: center; color: var(--text-muted);">No test orders placed yet.</div>
              ` : `
                <div class="table-container">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Test Name</th>
                        <th>Priority</th>
                        <th>Ordered At</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${orders.map(o => `
                        <tr>
                          <td><strong>${o.orderId}</strong></td>
                          <td>${o.testName}</td>
                          <td><span class="badge ${o.priority === 'STAT' ? 'badge-danger' : o.priority === 'Urgent' ? 'badge-warning' : 'badge-secondary'}">${o.priority}</span></td>
                          <td style="font-size: 0.78rem; color: var(--text-muted);">${o.orderTime}</td>
                          <td><span class="badge badge-success">${o.status}</span></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Right Column: Critical Flags & Timeline -->
        <div>
          <!-- Critical Flags -->
          <div class="card" style="border-left: 4px solid var(--danger);">
            <div class="card-header">
              <div class="card-title" style="color: var(--danger);">⚠️ Critical Clinical Findings</div>
            </div>
            <div class="card-body">
              ${criticals.length === 0 ? `
                <div style="font-size: 0.85rem; color: var(--success); display: flex; align-items: center; gap: 0.5rem;">
                  <span>✓</span> No critical abnormal flags recorded for this patient.
                </div>
              ` : criticals.map(c => `
                <div style="background: #fef2f2; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid #fecaca; margin-bottom: 0.5rem;">
                  <div style="font-weight: 700; color: #991b1b; font-size: 0.85rem;">${c.test}: ${c.value} ${c.unit}</div>
                  <div style="font-size: 0.75rem; color: #7f1d1d; margin-top: 2px;">${c.clinicalNotes}</div>
                  <div style="font-size: 0.7rem; color: #b91c1c; margin-top: 4px; font-weight: 600;">${c.deltaDeviation}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Patient Demographics Summary -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">📍 Address & Contact Info</div>
            </div>
            <div class="card-body" style="font-size: 0.82rem; display: flex; flex-direction: column; gap: 0.6rem;">
              <div><strong style="color: var(--text-muted); display: block; font-size: 0.7rem;">RESIDENTIAL ADDRESS</strong> ${patient.address}</div>
              <div><strong style="color: var(--text-muted); display: block; font-size: 0.7rem;">REGISTRATION TIMESTAMP</strong> ${patient.registrationDate}</div>
              <div><strong style="color: var(--text-muted); display: block; font-size: 0.7rem;">SYSTEM IDENTIFIER</strong> Patient Code ${patient.patientCode} (Numeric Standard)</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

const patientManager = new PatientManager();
window.patientManager = patientManager;
