import SurveyRecord from "./SurveyRecord.js";
import EquipmentLog from "./EquipmentLog.js";
import NavigationBookmark from "./NavigationBookmark.js";
import LevelRun from "./LevelRun.js";

import Point from "./Point.js";
import PointFile from "./PointFile.js";

export default class Project {
  constructor({
    id = null,
    name = "",
    description = "",
    address = "",
    clientName = "",
    clientPhone = "",
    clientEmail = "",
    townships = [],
    ranges = [],
    sections = [],
    records = {},
    equipmentLogs = [],
    referencePoints = [],
    points = [],
    pointFiles = [],
    activePointFileId = null,
    navigationBookmarks = [],
    localization = null,
    createdAt = null,
    updatedAt = null,
    version = 1,
    levelRuns = [],
  } = {}) {
    const stamp = new Date().toISOString();
    this.id = id;
    this.name = name;
    this.description = description;
    this.address = address;
    this.clientName = clientName;
    this.clientPhone = clientPhone;
    this.clientEmail = clientEmail;
    this.townships = Array.isArray(townships) ? townships : [];
    this.ranges = Array.isArray(ranges) ? ranges : [];
    this.sections = Array.isArray(sections) ? sections : [];
    this.records = {};
    this.pointFiles = Array.isArray(pointFiles)
      ? pointFiles.map((pf) =>
          pf instanceof PointFile ? pf : PointFile.fromObject(pf)
        )
      : [];

    if (this.pointFiles.length === 0 && Array.isArray(points) && points.length) {
      const fallback = new PointFile({
        name: "Imported Points",
        points: points.map((pt) => (pt instanceof Point ? pt : Point.fromObject(pt))),
      });
      fallback.resetOriginals();
      this.pointFiles.push(fallback);
    }

    this.activePointFileId =
      activePointFileId || this.pointFiles[0]?.id || null;

    this.navigationBookmarks = navigationBookmarks.map((entry) =>
      entry instanceof NavigationBookmark
        ? entry
        : NavigationBookmark.fromObject(entry)
    );

    this.localization = localization || null;
    this.createdAt = createdAt || stamp;
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;

    Object.entries(records).forEach(([id, record]) => {
      this.records[id] = record instanceof SurveyRecord
        ? record
        : SurveyRecord.fromObject({ id, ...record });
    });
    this.equipmentLogs = equipmentLogs.map((entry) =>
      entry instanceof EquipmentLog ? entry : EquipmentLog.fromObject(entry)
    );
    this.referencePoints = Array.isArray(referencePoints)
      ? referencePoints
      : [];
    this.levelRuns = Array.isArray(levelRuns)
      ? levelRuns.map((run) =>
          run instanceof LevelRun ? run : LevelRun.fromObject(run)
        )
      : [];
  }

  static fromObject(obj = {}) {
    return new Project(obj);
  }

  toObject() {
    const entries = Object.entries(this.records).map(([id, record]) => [
      id,
      record.toObject(),
    ]);
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      address: this.address,
      clientName: this.clientName,
      clientPhone: this.clientPhone,
      clientEmail: this.clientEmail,
      townships: this.townships,
      ranges: this.ranges,
      sections: this.sections,
      records: Object.fromEntries(entries),
      equipmentLogs: this.equipmentLogs.map((entry) => entry.toObject()),
      referencePoints: this.referencePoints,
      pointFiles: this.pointFiles.map((pf) =>
        pf instanceof PointFile ? pf.toObject() : PointFile.fromObject(pf).toObject()
      ),
      activePointFileId: this.activePointFileId,
      navigationBookmarks: this.navigationBookmarks.map((entry) =>
        entry instanceof NavigationBookmark
          ? entry.toObject()
          : NavigationBookmark.fromObject(entry).toObject()
      ),
      localization: this.localization,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      levelRuns: this.levelRuns.map((run) =>
        run instanceof LevelRun ? run.toObject() : LevelRun.fromObject(run).toObject()
      ),
    };
  }
}
