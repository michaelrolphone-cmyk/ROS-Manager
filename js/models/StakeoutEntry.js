export default class StakeoutEntry {
  constructor({
    id = `stakeout-${Date.now()}`,
    occurredAt = "",
    monumentType = "",
    monumentMaterial = "",
    witnessMarks = "",
    digNotes = "",
    crewMembers = [],
    equipmentUsed = [],
    traverseId = "",
    evidenceId = "",
    controlPoints = "",
    createdAt = null,
    updatedAt = null,
    version = 1,
  } = {}) {
    const stamp = new Date().toISOString();
    this.id = id;
    this.occurredAt = occurredAt;
    this.monumentType = monumentType;
    this.monumentMaterial = monumentMaterial;
    this.witnessMarks = witnessMarks;
    this.digNotes = digNotes;
    this.crewMembers = Array.isArray(crewMembers) ? crewMembers : [];
    this.equipmentUsed = Array.isArray(equipmentUsed) ? equipmentUsed : [];
    this.traverseId = traverseId;
    this.evidenceId = evidenceId;
    this.controlPoints = controlPoints;
    this.createdAt = createdAt || stamp;
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;
  }

  static fromObject(obj = {}) {
    return new StakeoutEntry(obj);
  }

  toObject() {
    return {
      id: this.id,
      occurredAt: this.occurredAt,
      monumentType: this.monumentType,
      monumentMaterial: this.monumentMaterial,
      witnessMarks: this.witnessMarks,
      digNotes: this.digNotes,
      crewMembers: this.crewMembers,
      equipmentUsed: this.equipmentUsed,
      traverseId: this.traverseId,
      evidenceId: this.evidenceId,
      controlPoints: this.controlPoints,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
