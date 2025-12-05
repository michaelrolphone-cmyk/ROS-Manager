export default class EvidenceTie {
  constructor({
    id = null,
    distance = "",
    bearing = "",
    description = "",
    photos = [],
    createdAt = null,
    updatedAt = null,
    version = 1,
  } = {}) {
    const stamp = new Date().toISOString();
    this.id = id || `tie-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.distance = distance;
    this.bearing = bearing;
    this.description = description;
    this.photos = photos;
    this.createdAt = createdAt || stamp;
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;
  }

  static fromObject(obj = {}) {
    return new EvidenceTie({
      distance: obj.distance || "",
      bearing: obj.bearing || "",
      description: obj.description || "",
      photos: obj.photos || [],
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      version: obj.version,
      id: obj.id,
    });
  }

  toObject() {
    return {
      distance: this.distance,
      bearing: this.bearing,
      description: this.description,
      photos: this.photos || [],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      id: this.id,
    };
  }
}