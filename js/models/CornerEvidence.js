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
    township = "",
    range = "",
    section = "",
    sectionBreakdown = "",
    type = "",
    cornerType = "",
    cornerStatus = "",
    status = "Draft",
    condition = "",
    basisOfBearing = "",
    monumentType = "",
    monumentMaterial = "",
    monumentSize = "",
    associatedTrs = [],
    surveyorName = "",
    surveyorLicense = "",
    surveyorFirm = "",
    surveyDates = "",
    surveyCounty = "",
    recordingInfo = "",
    notes = "",
    title = "",
    ties = [],
    photo = null,
    photoAnnotations = [],
    photoMetadata = null,
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
    this.township = township;
    this.range = range;
    this.section = section;
    this.sectionBreakdown = sectionBreakdown;
    this.type = type;
    this.cornerType = cornerType;
    this.cornerStatus = cornerStatus;
    this.status = status;
    this.condition = condition;
    this.basisOfBearing = basisOfBearing;
    this.monumentType = monumentType;
    this.monumentMaterial = monumentMaterial;
    this.monumentSize = monumentSize;
    this.associatedTrs = (associatedTrs || []).map((trs) => ({
      township: trs?.township || "",
      range: trs?.range || "",
      section: trs?.section || "",
      sectionBreakdown: trs?.sectionBreakdown || "",
    }));
    this.surveyorName = surveyorName;
    this.surveyorLicense = surveyorLicense;
    this.surveyorFirm = surveyorFirm;
    this.surveyDates = surveyDates;
    this.surveyCounty = surveyCounty;
    this.recordingInfo = recordingInfo;
    this.notes = notes;
    this.title = title;
    this.ties = ties.map((tie) =>
      tie instanceof EvidenceTie ? tie : EvidenceTie.fromObject(tie)
    );
    this.photo = photo;
    this.photoAnnotations = photoAnnotations || [];
    this.photoMetadata = photoMetadata;
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
      township: this.township,
      range: this.range,
      section: this.section,
      sectionBreakdown: this.sectionBreakdown,
      type: this.type,
      cornerType: this.cornerType,
      cornerStatus: this.cornerStatus,
      status: this.status,
      condition: this.condition,
      basisOfBearing: this.basisOfBearing,
      monumentType: this.monumentType,
      monumentMaterial: this.monumentMaterial,
      monumentSize: this.monumentSize,
      associatedTrs: this.associatedTrs,
      surveyorName: this.surveyorName,
      surveyorLicense: this.surveyorLicense,
      surveyorFirm: this.surveyorFirm,
      surveyDates: this.surveyDates,
      surveyCounty: this.surveyCounty,
      recordingInfo: this.recordingInfo,
      notes: this.notes,
      title: this.title,
      ties: this.ties.map((tie) => tie.toObject()),
      photo: this.photo,
      photoAnnotations: this.photoAnnotations,
      photoMetadata: this.photoMetadata,
      location: this.location,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
