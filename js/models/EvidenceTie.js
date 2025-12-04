export default class EvidenceTie {
  constructor({ distance = "", bearing = "", description = "" } = {}) {
    this.distance = distance;
    this.bearing = bearing;
    this.description = description;
  }

  static fromObject(obj = {}) {
    return new EvidenceTie({
      distance: obj.distance || "",
      bearing: obj.bearing || "",
      description: obj.description || "",
    });
  }

  toObject() {
    return {
      distance: this.distance,
      bearing: this.bearing,
      description: this.description,
    };
  }
}
