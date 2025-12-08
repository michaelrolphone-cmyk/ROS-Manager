import TraverseInstruction from "./TraverseInstruction.js";

export default class SurveyRecord {
  constructor({
    id = null,
    name = "",
    startPtNum = "1",
    northing = "5000",
    easting = "5000",
    elevation = "0",
    bsAzimuth = "0.0000",
    basis = "",
    firstDist = "",
    status = "Draft",
    calls = [],
    startFromRecordId = null,
    createdAt = null,
    updatedAt = null,
    version = 1,
  } = {}) {
    const stamp = new Date().toISOString();
    this.id = id;
    this.name = name;
    this.startPtNum = startPtNum;
    this.northing = northing;
    this.easting = easting;
    this.elevation = elevation;
    this.bsAzimuth = bsAzimuth;
    this.basis = basis;
    this.firstDist = firstDist;
    this.status = status;
    this.calls = calls.map((call) =>
      call instanceof TraverseInstruction
        ? call
        : TraverseInstruction.fromObject(call)
    );
    this.startFromRecordId = startFromRecordId;
    this.createdAt = createdAt || stamp;
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;
  }

  static fromObject(obj = {}) {
    return new SurveyRecord({
      ...obj,
      calls: (obj.calls || []).map((call) =>
        TraverseInstruction.fromObject(call)
      ),
    });
  }

  toObject() {
    return {
      name: this.name,
      startPtNum: this.startPtNum,
      northing: this.northing,
      easting: this.easting,
      elevation: this.elevation,
      bsAzimuth: this.bsAzimuth,
      basis: this.basis,
      firstDist: this.firstDist,
      status: this.status,
      calls: this.calls.map((call) => call.toObject()),
      startFromRecordId: this.startFromRecordId,
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
