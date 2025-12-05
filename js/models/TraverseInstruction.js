export default class TraverseInstruction {
  constructor(bearing = "", distance = "", branches = []) {
    this.bearing = bearing;
    this.distance = distance;
    this.branches = (branches || []).map((branch) =>
      Array.isArray(branch)
        ? branch.map((c) => TraverseInstruction.fromObject(c))
        : []
    );
  }

  static fromObject(obj = {}) {
    return new TraverseInstruction(
      obj.bearing || "",
      obj.distance || "",
      obj.branches || []
    );
  }

  toObject() {
    return {
      bearing: this.bearing,
      distance: this.distance,
      branches: (this.branches || []).map((branch) =>
        (branch || []).map((c) => c?.toObject?.() || c)
      ),
    };
  }
}
