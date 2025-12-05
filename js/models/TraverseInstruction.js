export default class TraverseInstruction {
  constructor(bearing = "", distance = "", meta = {}) {
    const stamp = new Date().toISOString();
    this.id = meta.id || `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.bearing = bearing;
    this.distance = distance;
    this.createdAt = meta.createdAt || stamp;
    this.updatedAt = meta.updatedAt || this.createdAt;
    this.version = meta.version ?? 1;
  }

  static fromObject(obj = {}) {
    return new TraverseInstruction(obj.bearing || "", obj.distance || "", obj);
  }

  toObject() {
    return {
      id: this.id,
      bearing: this.bearing,
      distance: this.distance,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
