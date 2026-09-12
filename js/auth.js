/**
 * LabFlow Sentinel — Authentication & Role-Based Access Control (RBAC)
 * Supports 5 specialized laboratory roles with simulated session handling.
 */

const ROLES = {
  ADMIN: {
    id: "admin",
    name: "Laboratory Administrator",
    user: "Dr. Arvind Swamy (Admin)",
    email: "admin@labflow-sentinel.com",
    avatar: "AS",
    color: "#2563eb",
    permissions: ["all", "manage_users", "manage_settings", "view_operations", "view_audit", "rescue_samples"]
  },
  TECHNICIAN: {
    id: "technician",
    name: "Lab Technician",
    user: "Vikram Rathore",
    email: "vikram.tech@labflow-sentinel.com",
    avatar: "VR",
    color: "#0891b2",
    permissions: ["manage_samples", "update_stages", "assign_analyzers", "rescue_samples", "view_operations"]
  },
  PATHOLOGIST: {
    id: "pathologist",
    name: "Pathologist",
    user: "Dr. Priya Sharma (MD Path)",
    email: "dr.priya@labflow-sentinel.com",
    avatar: "PS",
    color: "#7c3aed",
    permissions: ["review_results", "review_critical", "approve_reports", "sign_off", "detect_anomalies"]
  },
  DOCTOR: {
    id: "doctor",
    name: "Referring Doctor",
    user: "Dr. Ananya Roy (Cardiologist)",
    email: "dr.ananya@cardio-clinic.org",
    avatar: "AR",
    color: "#059669",
    permissions: ["view_reports", "view_results", "view_notifications", "track_orders"]
  },
  RECEPTIONIST: {
    id: "receptionist",
    name: "Receptionist",
    user: "Sunil Verma",
    email: "reception@labflow-sentinel.com",
    avatar: "SV",
    color: "#d97706",
    permissions: ["register_patients", "create_orders", "search_directory"]
  }
};

class AuthManager {
  constructor() {
    this.storageKey = "labflow_auth_session";
    this.currentRole = this.loadSession() || ROLES.ADMIN;
  }

  loadSession() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return Object.values(ROLES).find(r => r.id === parsed.id) || ROLES.ADMIN;
      }
    } catch (e) {
      console.warn("Could not load session from localStorage", e);
    }
    return ROLES.ADMIN;
  }

  saveSession(role) {
    this.currentRole = role;
    localStorage.setItem(this.storageKey, JSON.stringify({ id: role.id, loggedInAt: new Date().toISOString() }));
  }

  switchRole(roleId) {
    const role = Object.values(ROLES).find(r => r.id === roleId);
    if (role) {
      this.saveSession(role);
      return role;
    }
    return this.currentRole;
  }

  getCurrentRole() {
    return this.currentRole;
  }

  can(permission) {
    if (!this.currentRole) return false;
    if (this.currentRole.permissions.includes("all")) return true;
    return this.currentRole.permissions.includes(permission);
  }

  logout() {
    localStorage.removeItem(this.storageKey);
    this.currentRole = ROLES.ADMIN;
  }
}

const auth = new AuthManager();
