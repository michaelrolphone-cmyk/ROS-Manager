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
    closurePointNumber = "",
    expectedToClose = true,
    boundaryProcedure = null,
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
    this.closurePointNumber = closurePointNumber || "";
    this.expectedToClose = expectedToClose !== false;
    this.calls = calls.map((call) =>
      call instanceof TraverseInstruction
        ? call
        : TraverseInstruction.fromObject(call)
    );
    this.startFromRecordId = startFromRecordId;
    this.boundaryProcedure =
      boundaryProcedure && typeof boundaryProcedure === "object"
        ? boundaryProcedure
        : { steps: [] };
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
      closurePointNumber: obj.closurePointNumber,
      expectedToClose: obj.expectedToClose !== false,
      boundaryProcedure: obj.boundaryProcedure || { steps: [] },
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
      closurePointNumber: this.closurePointNumber,
      expectedToClose: this.expectedToClose,
      boundaryProcedure: this.boundaryProcedure,
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
