export default class EvidenceTie {
  constructor({
    distance = "",
    bearing = "",
    description = "",
    photos = [],
  } = {}) {
    this.distance = distance;
    this.bearing = bearing;
    this.description = description;
    this.photos = photos;
  }

  static fromObject(obj = {}) {
    return new EvidenceTie({
      distance: obj.distance || "",
      bearing: obj.bearing || "",
      description: obj.description || "",
      photos: obj.photos || [],
    });
  }

  toObject() {
    return {
      distance: this.distance,
      bearing: this.bearing,
      description: this.description,
      photos: this.photos || [],
    };
  }
}
