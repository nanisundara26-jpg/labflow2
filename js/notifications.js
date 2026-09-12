/**
 * LabFlow Sentinel — Notification Center
 * Handles clinical critical value notifications, TAT warnings, and operational alerts.
 */

class NotificationManager {
  constructor() {
    this.storageKey = "labflow_notifications_data";
    this.notifications = this.loadNotifications();
  }

  loadNotifications() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed loading notifications", e);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(SEED_NOTIFICATIONS));
    return [...SEED_NOTIFICATIONS];
  }

  saveNotifications() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
  }

  getAll() {
    return this.notifications;
  }

  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  markAsRead(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveNotifications();
      app.updateNotificationBadges();
      app.renderNotifications();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveNotifications();
    app.updateNotificationBadges();
    app.renderNotifications();
    app.showToast("All notifications marked as read", "success");
  }

  addNotification(type, title, message, linkTarget = "dashboard") {
    const newNotif = {
      id: `NTF-${Date.now()}`,
      type,
      title,
      message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
      linkTarget
    };
    this.notifications.unshift(newNotif);
    this.saveNotifications();
    app.updateNotificationBadges();
    return newNotif;
  }

  renderNotifications(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (this.notifications.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🔔</div>
          <div style="font-weight: 700; color: var(--text-main); font-size: 1.1rem;">No Notifications</div>
          <p style="font-size: 0.85rem; margin-top: 4px;">You have cleared all laboratory alerts and warnings.</p>
        </div>
      `;
      return;
    }

    const itemsHtml = this.notifications.map(n => {
      let icon = "🔔";
      let borderCol = "var(--primary)";
      if (n.type === "critical") { icon = "🚨"; borderCol = "var(--danger)"; }
      else if (n.type === "tat") { icon = "⏱️"; borderCol = "var(--warning)"; }
      else if (n.type === "analyzer") { icon = "⚙️"; borderCol = "var(--accent)"; }
      else if (n.type === "ai") { icon = "✨"; borderCol = "var(--ai-purple)"; }

      return `
        <div style="background-color: ${n.read ? '#ffffff' : '#f8fafc'}; border: 1px solid var(--border-color); border-left: 4px solid ${borderCol}; border-radius: var(--radius-md); padding: 1rem; margin-bottom: 0.75rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;">
          <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
            <span style="font-size: 1.3rem;">${icon}</span>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <strong style="color: var(--text-main); font-size: 0.9rem;">${n.title}</strong>
                ${!n.read ? '<span class="badge badge-primary" style="font-size: 0.65rem;">NEW</span>' : ''}
              </div>
              <div style="font-size: 0.82rem; color: var(--text-muted); line-height: 1.4;">
                ${n.message}
              </div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.35rem;">
                ${n.time}
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
            ${n.linkTarget ? `
              <button class="btn btn-secondary btn-sm" onclick="app.navigateTo('${n.linkTarget}'); notificationManager.markAsRead('${n.id}');">
                Open Link
              </button>
            ` : ''}
            ${!n.read ? `
              <button class="btn btn-secondary btn-sm" onclick="notificationManager.markAsRead('${n.id}')">
                Mark Read
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Total Notifications: <strong>${this.notifications.length}</strong> (${this.getUnreadCount()} unread)
        </div>
        <button class="btn btn-secondary btn-sm" onclick="notificationManager.markAllAsRead()">
          ✓ Mark All as Read
        </button>
      </div>
      <div>
        ${itemsHtml}
      </div>
    `;
  }
}

const notificationManager = new NotificationManager();
window.notificationManager = notificationManager;
