const DEFAULT_PREFIX = "item";

const makeId = (prefix = DEFAULT_PREFIX) =>
  `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const nowIso = () => new Date().toISOString();

const isPlainObject = (val) =>
  val && typeof val === "object" && !Array.isArray(val);

export default class VersioningService {
  ensureEntity(entity = {}, { prefix = DEFAULT_PREFIX } = {}) {
    const stamp = nowIso();
    if (!entity.id) entity.id = makeId(prefix);
    if (!entity.createdAt) entity.createdAt = stamp;
    if (!entity.updatedAt) entity.updatedAt = entity.createdAt;
    if (entity.version === undefined || entity.version === null) {
      entity.version = 1;
    }
    return entity;
  }

  touchEntity(entity = {}, { prefix = DEFAULT_PREFIX, timestamp = nowIso() } = {}) {
    this.ensureEntity(entity, { prefix });
    entity.version = (entity.version || 1) + 1;
    entity.updatedAt = timestamp;
    return entity;
  }

  touchArray(entries = [], prefix = DEFAULT_PREFIX, timestamp = nowIso()) {
    return entries.map((entry) => this.touchEntity(entry, { prefix, timestamp }));
  }

  ensureArray(entries = [], prefix = DEFAULT_PREFIX) {
    return entries.map((entry) => this.ensureEntity(entry, { prefix }));
  }

  touchProjectTree(projectId, project) {
    if (!project) return;
    const timestamp = nowIso();
    this.touchEntity(project, { prefix: "project", timestamp });
    if (!project.id) project.id = projectId;

    const records = project.records || {};
    Object.entries(records).forEach(([recordId, record]) => {
      this.touchEntity(record, { prefix: "record", timestamp });
      if (!record.id) record.id = recordId;
      record.calls = this.touchArray(record.calls || [], "call", timestamp);
    });

    project.equipmentLogs = this.touchArray(
      project.equipmentLogs || [],
      "equipment",
      timestamp
    );
    project.pointFiles = this.touchArray(
      project.pointFiles || [],
      "pointFile",
      timestamp
    );
    project.pointFiles.forEach((pf) => {
      pf.points = this.touchArray(pf.points || [], "point", timestamp);
      pf.originalPoints = this.ensureArray(pf.originalPoints || [], "point");
    });

    project.navigationBookmarks = this.touchArray(
      project.navigationBookmarks || [],
      "bookmark",
      timestamp
    );
    if (project.navigationTarget) {
      this.touchEntity(project.navigationTarget, {
        prefix: "navigation",
        timestamp,
      });
    }
    if (project.localization) {
      this.touchEntity(project.localization, {
        prefix: "localization",
        timestamp,
      });
      project.localization.points = this.touchArray(
        project.localization.points || [],
        "localizedPoint",
        timestamp
      );
    }
    return project;
  }

  ensureProjectTree(projectId, project) {
    if (!project) return;
    const timestamp = nowIso();
    this.ensureEntity(project, { prefix: "project" });
    if (!project.id) project.id = projectId;
    const records = project.records || {};
    Object.entries(records).forEach(([recordId, record]) => {
      this.ensureEntity(record, { prefix: "record" });
      if (!record.id) record.id = recordId;
      record.calls = this.ensureArray(record.calls || [], "call");
    });

    project.equipmentLogs = this.ensureArray(
      project.equipmentLogs || [],
      "equipment"
    );
    project.pointFiles = this.ensureArray(project.pointFiles || [], "pointFile");
    project.pointFiles.forEach((pf) => {
      pf.points = this.ensureArray(pf.points || [], "point");
      pf.originalPoints = this.ensureArray(pf.originalPoints || [], "point");
    });
    project.navigationBookmarks = this.ensureArray(
      project.navigationBookmarks || [],
      "bookmark"
    );
    if (project.navigationTarget) {
      this.ensureEntity(project.navigationTarget, { prefix: "navigation" });
    }
    if (project.localization) {
      this.ensureEntity(project.localization, { prefix: "localization" });
      project.localization.points = this.ensureArray(
        project.localization.points || [],
        "localizedPoint"
      );
    }
    return project;
  }

  ensureEvidenceMap(evidenceByProject = {}) {
    Object.values(evidenceByProject || {}).forEach((entries) => {
      (entries || []).forEach((entry) => {
        this.ensureEntity(entry, { prefix: "evidence" });
        entry.ties = this.ensureArray(entry.ties || [], "tie");
      });
    });
    return evidenceByProject;
  }

  touchEvidenceMap(evidenceByProject = {}) {
    const timestamp = nowIso();
    Object.values(evidenceByProject || {}).forEach((entries) => {
      (entries || []).forEach((entry) => {
        this.touchEntity(entry, { prefix: "evidence", timestamp });
        entry.ties = this.touchArray(entry.ties || [], "tie", timestamp);
      });
    });
    return evidenceByProject;
  }

  touchAll(projects = {}, evidenceByProject = {}) {
    Object.entries(projects || {}).forEach(([projectId, project]) => {
      this.touchProjectTree(projectId, project);
    });
    this.touchEvidenceMap(evidenceByProject);
    return { projects, evidenceByProject };
  }
}
