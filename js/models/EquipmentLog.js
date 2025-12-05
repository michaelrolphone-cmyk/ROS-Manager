export default class EquipmentLog {
  constructor({
    id = Date.now().toString(),
    setupAt = "",
    tearDownAt = "",
    baseHeight = "",
    referencePoint = "",
    equipmentUsed = [],
    setupBy = "",
    workNotes = "",
    location = null,
    recordedAt = new Date().toISOString(),
    createdAt = null,
    updatedAt = null,
    version = 1,
  } = {}) {
    this.id = id;
    this.setupAt = setupAt;
    this.tearDownAt = tearDownAt;
    this.baseHeight = baseHeight;
    this.referencePoint = referencePoint;
    this.equipmentUsed = Array.isArray(equipmentUsed) ? equipmentUsed : [];
    this.setupBy = setupBy;
    this.workNotes = workNotes;
    this.location = location;
    this.recordedAt = recordedAt;
    this.createdAt = createdAt || recordedAt || new Date().toISOString();
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;
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
      equipmentUsed: this.equipmentUsed,
      setupBy: this.setupBy,
      workNotes: this.workNotes,
      location: this.location,
      recordedAt: this.recordedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
