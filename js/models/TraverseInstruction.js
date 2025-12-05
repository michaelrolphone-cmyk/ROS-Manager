export default class TraverseInstruction {
  constructor(
    bearing = "",
    distance = "",
    branches = [],
    curveRadius = "",
    curveDirection = "",
    curveArcLength = "",
    curveChordLength = "",
    curveChordBearing = "",
    curveDeltaAngle = "",
    curveTangent = ""
  ) {
    this.bearing = bearing;
    this.distance = distance;
    this.curveRadius = curveRadius;
    this.curveDirection = curveDirection;
    this.curveArcLength = curveArcLength;
    this.curveChordLength = curveChordLength;
    this.curveChordBearing = curveChordBearing;
    this.curveDeltaAngle = curveDeltaAngle;
    this.curveTangent = curveTangent;
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
      obj.branches || [],
      obj.curveRadius || "",
      obj.curveDirection || "",
      obj.curveArcLength || "",
      obj.curveChordLength || "",
      obj.curveChordBearing || "",
      obj.curveDeltaAngle || "",
      obj.curveTangent || ""
    );
  }

  toObject() {
    return {
      bearing: this.bearing,
      distance: this.distance,
      curveRadius: this.curveRadius,
      curveDirection: this.curveDirection,
      curveArcLength: this.curveArcLength,
      curveChordLength: this.curveChordLength,
      curveChordBearing: this.curveChordBearing,
      curveDeltaAngle: this.curveDeltaAngle,
      curveTangent: this.curveTangent,
      branches: (this.branches || []).map((branch) =>
        (branch || []).map((c) => c?.toObject?.() || c)
      ),
    };
  }
}
