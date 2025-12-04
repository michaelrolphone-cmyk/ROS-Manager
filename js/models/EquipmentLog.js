export default class EquipmentLog {
  constructor({
    id = Date.now().toString(),
    setupAt = "",
    tearDownAt = "",
    baseHeight = "",
    referencePoint = "",
    setupBy = "",
    workNotes = "",
    location = null,
    recordedAt = new Date().toISOString(),
  } = {}) {
    this.id = id;
    this.setupAt = setupAt;
    this.tearDownAt = tearDownAt;
    this.baseHeight = baseHeight;
    this.referencePoint = referencePoint;
    this.setupBy = setupBy;
    this.workNotes = workNotes;
    this.location = location;
    this.recordedAt = recordedAt;
  }

  static fromObject(obj = {}) {
    return new EquipmentLog(obj);
  }

  toObject() {
    return {
      id: this.id,
      setupAt: this.setupAt,
      tearDownAt: this.tearDownAt,
      baseHeight: this.baseHeight,
      referencePoint: this.referencePoint,
      setupBy: this.setupBy,
      workNotes: this.workNotes,
      location: this.location,
      recordedAt: this.recordedAt,
    };
  }
}
