import Point from "./Point.js";

export default class PointFile {
  constructor({
    id = null,
    name = "",
    points = [],
    originalPoints = [],
    adjustmentMeta = {},
    createdAt = null,
    updatedAt = null,
    version = 1,
  } = {}) {
    const stamp = new Date().toISOString();
    this.id = id || `pf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.name = name || "Points";
    this.points = Array.isArray(points)
      ? points.map((pt) => (pt instanceof Point ? pt : Point.fromObject(pt)))
      : [];
    this.originalPoints = Array.isArray(originalPoints)
      ? originalPoints.map((pt) =>
          pt instanceof Point ? pt : Point.fromObject(pt)
        )
      : this.points.map((pt) => Point.fromObject(pt));
    this.adjustmentMeta = {
      algorithm: adjustmentMeta.algorithm || "",
      notes: adjustmentMeta.notes || "",
      lastAdjustedAt: adjustmentMeta.lastAdjustedAt || null,
      deltas: Array.isArray(adjustmentMeta.deltas)
        ? adjustmentMeta.deltas
        : [],
    };
    this.createdAt = createdAt || stamp;
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;
  }

  static fromObject(obj = {}) {
    return new PointFile(obj);
  }

  toObject() {
    return {
      id: this.id,
      name: this.name,
      points: this.points.map((pt) =>
        pt instanceof Point ? pt.toObject() : Point.fromObject(pt).toObject()
      ),
      originalPoints: this.originalPoints.map((pt) =>
        pt instanceof Point ? pt.toObject() : Point.fromObject(pt).toObject()
      ),
      adjustmentMeta: this.adjustmentMeta,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }

  resetOriginals() {
    this.originalPoints = this.points.map((pt) => Point.fromObject(pt));
  }
}
