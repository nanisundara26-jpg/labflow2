/**
 * LabFlow Sentinel — Tamper-Evident Operational Audit Trail Logger
 * Records clinical actions, rescue authorizations, role switches, and stage progressions.
 */

class AuditManager {
  constructor() {
    this.storageKey = "labflow_audit_trail_data";
    this.logs = this.loadLogs();
  }

  loadLogs() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed loading audit logs", e);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(SEED_AUDIT_LOGS));
    return [...SEED_AUDIT_LOGS];
  }

  saveLogs() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.logs));
  }

  logEvent(user, role, action, object, previousValue = "N/A", newValue = "N/A") {
    const newEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      user,
      role,
      action,
      object,
      previousValue,
      newValue
    };
    this.logs.unshift(newEntry);
    this.saveLogs();
    return newEntry;
  }

  getAll() {
    return this.logs;
  }

  renderAuditTrail(containerId, searchFilter = "") {
    const container = document.getElementById(containerId);
    if (!container) return;

    let filtered = this.logs;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = this.logs.filter(l => 
        l.user.toLowerCase().includes(q) ||
        l.role.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.object.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No audit entries matching filter.
        </div>
      `;
      return;
    }

    const rowsHtml = filtered.map(log => {
      return `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted);">${log.timestamp}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${log.user}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${log.role}</div>
          </td>
          <td>
            <span class="badge badge-primary">${log.action}</span>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-main);">${log.object}</div>
          </td>
          <td>
            <div style="font-size: 0.75rem; color: #b91c1c; background: #fef2f2; padding: 2px 6px; border-radius: 4px; display: inline-block;">
              ${log.previousValue}
            </div>
          </td>
          <td>
            <div style="font-size: 0.75rem; color: #065f46; background: #ecfdf5; padding: 2px 6px; border-radius: 4px; display: inline-block;">
              ${log.newValue}
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
              <th>Timestamp</th>
              <th>User & Role</th>
              <th>Action Executed</th>
              <th>Target Object / Entity</th>
              <th>Previous State</th>
              <th>New State</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  }
}

const auditManager = new AuditManager();
window.auditManager = auditManager;
