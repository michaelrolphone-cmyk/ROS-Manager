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
    cornerType = "",
    cornerStatus = "",
    status = "Draft",
    condition = "",
    basisOfBearing = "",
    monumentType = "",
    monumentMaterial = "",
    monumentSize = "",
    surveyorName = "",
    surveyorLicense = "",
    surveyorFirm = "",
    surveyDates = "",
    surveyCounty = "",
    recordingInfo = "",
    notes = "",
    ties = [],
    photo = null,
    location = null,
    createdAt = new Date().toISOString(),
    updatedAt = null,
    version = 1,
  } = {}) {
    this.id = id;
    this.projectId = projectId;
    this.recordId = recordId;
    this.recordName = recordName;
    this.pointIndex = pointIndex;
    this.pointLabel = pointLabel;
    this.coords = coords;
    this.type = type;
    this.cornerType = cornerType;
    this.cornerStatus = cornerStatus;
    this.status = status;
    this.condition = condition;
    this.basisOfBearing = basisOfBearing;
    this.monumentType = monumentType;
    this.monumentMaterial = monumentMaterial;
    this.monumentSize = monumentSize;
    this.surveyorName = surveyorName;
    this.surveyorLicense = surveyorLicense;
    this.surveyorFirm = surveyorFirm;
    this.surveyDates = surveyDates;
    this.surveyCounty = surveyCounty;
    this.recordingInfo = recordingInfo;
    this.notes = notes;
    this.ties = ties.map((tie) =>
      tie instanceof EvidenceTie ? tie : EvidenceTie.fromObject(tie)
    );
    this.photo = photo;
    this.location = location;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt || createdAt;
    this.version = version ?? 1;
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
      cornerType: this.cornerType,
      cornerStatus: this.cornerStatus,
      status: this.status,
      condition: this.condition,
      basisOfBearing: this.basisOfBearing,
      monumentType: this.monumentType,
      monumentMaterial: this.monumentMaterial,
      monumentSize: this.monumentSize,
      surveyorName: this.surveyorName,
      surveyorLicense: this.surveyorLicense,
      surveyorFirm: this.surveyorFirm,
      surveyDates: this.surveyDates,
      surveyCounty: this.surveyCounty,
      recordingInfo: this.recordingInfo,
      notes: this.notes,
      ties: this.ties.map((tie) => tie.toObject()),
      photo: this.photo,
      location: this.location,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
