export default class RollingBackupService {
  constructor(storageKey = "carlsonRollingBackups") {
    this.storageKey = storageKey;
    this.backups = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      console.warn("Failed to parse rolling backups", err);
      return {};
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.backups));
  }

  addBackup(projectIds = [], filename, payload, maxCopies = 3) {
    if (!projectIds?.length || !payload) return;
    const timestamp = new Date().toISOString();
    const record = {
      id: `b-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      filename: filename || "backup.json",
      timestamp,
      payload,
    };

    projectIds.forEach((projectId) => {
      if (!projectId) return;
      if (!Array.isArray(this.backups[projectId])) this.backups[projectId] = [];
      this.backups[projectId].unshift(record);
      if (this.backups[projectId].length > maxCopies) {
        this.backups[projectId] = this.backups[projectId].slice(0, maxCopies);
      }
    });

    this.save();
  }

  getBackups(projectId) {
    if (!projectId) return [];
    return this.backups[projectId] || [];
  }

  clearProject(projectId) {
    if (!projectId) return;
    delete this.backups[projectId];
    this.save();
  }
}
