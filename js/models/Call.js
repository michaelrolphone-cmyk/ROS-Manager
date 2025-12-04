export default class Call {
  constructor(bearing = "", distance = "") {
    this.bearing = bearing;
    this.distance = distance;
  }

  static fromObject(obj = {}) {
    return new Call(obj.bearing || "", obj.distance || "");
  }

  toObject() {
    return {
      bearing: this.bearing,
      distance: this.distance,
    };
  }
}
