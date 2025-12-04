import SurveyRecord from "./SurveyRecord.js";
import EquipmentLog from "./EquipmentLog.js";
import NavigationBookmark from "./NavigationBookmark.js";

import Point from "./Point.js";
import PointFile from "./PointFile.js";

export default class Project {
  constructor({
    name = "",
    description = "",
    address = "",
    clientName = "",
    townships = [],
    ranges = [],
    sections = [],
    records = {},
    equipmentLogs = [],
    points = [],
    pointFiles = [],
    activePointFileId = null,
    navigationBookmarks = [],
  } = {}) {
    this.name = name;
    this.description = description;
    this.address = address;
    this.clientName = clientName;
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

    Object.entries(records).forEach(([id, record]) => {
      this.records[id] = record instanceof SurveyRecord
        ? record
        : SurveyRecord.fromObject(record);
    });
    this.equipmentLogs = equipmentLogs.map((entry) =>
      entry instanceof EquipmentLog ? entry : EquipmentLog.fromObject(entry)
    );
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
      name: this.name,
      description: this.description,
      address: this.address,
      clientName: this.clientName,
      townships: this.townships,
      ranges: this.ranges,
      sections: this.sections,
      records: Object.fromEntries(entries),
      equipmentLogs: this.equipmentLogs.map((entry) => entry.toObject()),
      pointFiles: this.pointFiles.map((pf) =>
        pf instanceof PointFile ? pf.toObject() : PointFile.fromObject(pf).toObject()
      ),
      activePointFileId: this.activePointFileId,
      navigationBookmarks: this.navigationBookmarks.map((entry) =>
        entry instanceof NavigationBookmark
          ? entry.toObject()
          : NavigationBookmark.fromObject(entry).toObject()
      ),
    };
  }
}
