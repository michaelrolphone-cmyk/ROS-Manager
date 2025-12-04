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
  } = {}) {
    this.id = id;
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.recordedAt = recordedAt;
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
    };
  }
}
