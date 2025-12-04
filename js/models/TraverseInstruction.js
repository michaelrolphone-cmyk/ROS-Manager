export default class TraverseInstruction {
  constructor(bearing = "", distance = "") {
    this.bearing = bearing;
    this.distance = distance;
  }

  static fromObject(obj = {}) {
    return new TraverseInstruction(obj.bearing || "", obj.distance || "");
  }

  toObject() {
    return {
      bearing: this.bearing,
      distance: this.distance,
    };
  }
}
