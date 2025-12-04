import Call from "./Call.js";

export default class Record {
  constructor({
    name = "",
    startPtNum = "1",
    northing = "5000",
    easting = "5000",
    elevation = "0",
    bsAzimuth = "0.0000",
    basis = "",
    firstDist = "",
    calls = [],
    startFromRecordId = null,
  } = {}) {
    this.name = name;
    this.startPtNum = startPtNum;
    this.northing = northing;
    this.easting = easting;
    this.elevation = elevation;
    this.bsAzimuth = bsAzimuth;
    this.basis = basis;
    this.firstDist = firstDist;
    this.calls = calls.map((call) =>
      call instanceof Call ? call : Call.fromObject(call)
    );
    this.startFromRecordId = startFromRecordId;
  }

  static fromObject(obj = {}) {
    return new Record({
      ...obj,
      calls: (obj.calls || []).map((call) => Call.fromObject(call)),
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
      calls: this.calls.map((call) => call.toObject()),
      startFromRecordId: this.startFromRecordId,
    };
  }
}
