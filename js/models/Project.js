import SurveyRecord from "./SurveyRecord.js";

export default class Project {
  constructor({ name = "", records = {} } = {}) {
    this.name = name;
    this.records = {};
    Object.entries(records).forEach(([id, record]) => {
      this.records[id] = record instanceof SurveyRecord
        ? record
        : SurveyRecord.fromObject(record);
    });
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
      records: Object.fromEntries(entries),
    };
  }
}
