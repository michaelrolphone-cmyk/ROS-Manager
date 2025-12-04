import EvidenceTie from "./EvidenceTie.js";

export default class CornerEvidence {
  constructor({
    id = Date.now().toString(),
    projectId = "",
    recordId = "",
    recordName = "",
    pointIndex = 0,
    pointLabel = "",
    coords = null,
    type = "",
    condition = "",
    notes = "",
    ties = [],
    photo = null,
    location = null,
    createdAt = new Date().toISOString(),
  } = {}) {
    this.id = id;
    this.projectId = projectId;
    this.recordId = recordId;
    this.recordName = recordName;
    this.pointIndex = pointIndex;
    this.pointLabel = pointLabel;
    this.coords = coords;
    this.type = type;
    this.condition = condition;
    this.notes = notes;
    this.ties = ties.map((tie) =>
      tie instanceof EvidenceTie ? tie : EvidenceTie.fromObject(tie)
    );
    this.photo = photo;
    this.location = location;
    this.createdAt = createdAt;
  }

  static fromObject(obj = {}) {
    return new CornerEvidence({ ...obj, ties: obj.ties || [] });
  }

  toObject() {
    return {
      id: this.id,
      projectId: this.projectId,
      recordId: this.recordId,
      recordName: this.recordName,
      pointIndex: this.pointIndex,
      pointLabel: this.pointLabel,
      coords: this.coords,
      type: this.type,
      condition: this.condition,
      notes: this.notes,
      ties: this.ties.map((tie) => tie.toObject()),
      photo: this.photo,
      location: this.location,
      createdAt: this.createdAt,
    };
  }
}
