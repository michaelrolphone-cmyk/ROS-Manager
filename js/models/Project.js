import SurveyRecord from "./SurveyRecord.js";
import EquipmentLog from "./EquipmentLog.js";

export default class Project {
  constructor({ name = "", records = {}, equipmentLogs = [] } = {}) {
    this.name = name;
    this.records = {};
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
      records: Object.fromEntries(entries),
      equipmentLogs: this.equipmentLogs.map((entry) => entry.toObject()),
    };
  }
}
