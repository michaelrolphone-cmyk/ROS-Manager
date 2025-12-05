export default class NavigationBookmark {
  constructor({
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(),
    name = "",
    latitude = 0,
    longitude = 0,
    recordedAt = new Date().toISOString(),
    createdAt = null,
    updatedAt = null,
    version = 1,
  } = {}) {
    this.id = id;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.recordedAt = recordedAt;
    this.createdAt = createdAt || recordedAt || new Date().toISOString();
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;
  }

  static fromObject(obj = {}) {
    return new NavigationBookmark(obj);
  }

  toObject() {
    return {
      id: this.id,
      name: this.name,
      latitude: this.latitude,
      longitude: this.longitude,
      recordedAt: this.recordedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
