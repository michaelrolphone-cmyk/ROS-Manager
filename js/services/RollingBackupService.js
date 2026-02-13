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
    const orderedBackups = this.#flattenBackupsByAge();

    while (true) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.backups));
        return true;
      } catch (err) {
        if (!orderedBackups.length) {
          console.warn("Failed to persist rolling backups", err);
          return false;
        }

        const oldest = orderedBackups.shift();
        const projectBackups = this.backups[oldest.projectId];
        if (!Array.isArray(projectBackups)) continue;

        this.backups[oldest.projectId] = projectBackups.filter(
          (backup) => backup.id !== oldest.id,
        );

        if (!this.backups[oldest.projectId].length) {
          delete this.backups[oldest.projectId];
        }
      }
    }
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

    return this.save();
  }

  getBackups(projectId) {
    if (!projectId) return [];
    return this.backups[projectId] || [];
  }

  clearProject(projectId) {
    if (!projectId) return;
    delete this.backups[projectId];
    return this.save();
  }

  #flattenBackupsByAge() {
    const flattened = [];

    Object.entries(this.backups).forEach(([projectId, records]) => {
      (records || []).forEach((record, index) => {
        flattened.push({
          projectId,
          id: record.id,
          timestamp: Date.parse(record.timestamp) || 0,
          order: index,
        });
      });
    });

    flattened.sort((a, b) => a.timestamp - b.timestamp || b.order - a.order);
    return flattened;
  }
}
