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
    curveTangent = "",
    id = null,
    createdAt = null,
    updatedAt = null,
    version = 1
  ) {
    // Allow constructing from a plain object for backwards compatibility
    if (typeof bearing === "object" && bearing !== null) {
      const obj = bearing;
      const stamp = new Date().toISOString();
      this.id = obj.id || `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.bearing = obj.bearing || "";
      this.distance = obj.distance || "";
      this.branches = (obj.branches || []).map((branch) =>
        (branch || []).map((call) =>
          call instanceof TraverseInstruction
            ? call
            : TraverseInstruction.fromObject(call)
        )
      );
      this.curveRadius = obj.curveRadius || "";
      this.curveDirection = obj.curveDirection || "";
      this.curveArcLength = obj.curveArcLength || "";
      this.curveChordLength = obj.curveChordLength || "";
      this.curveChordBearing = obj.curveChordBearing || "";
      this.curveDeltaAngle = obj.curveDeltaAngle || "";
      this.curveTangent = obj.curveTangent || "";
      this.createdAt = obj.createdAt || stamp;
      this.updatedAt = obj.updatedAt || this.createdAt;
      this.version = obj.version ?? 1;
      return;
    }

    const stamp = new Date().toISOString();
    this.id = id || `call-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.bearing = bearing || "";
    this.distance = distance || "";
    this.branches = (branches || []).map((branch) =>
      (branch || []).map((call) =>
        call instanceof TraverseInstruction
          ? call
          : TraverseInstruction.fromObject(call)
      )
    );
    this.curveRadius = curveRadius || "";
    this.curveDirection = curveDirection || "";
    this.curveArcLength = curveArcLength || "";
    this.curveChordLength = curveChordLength || "";
    this.curveChordBearing = curveChordBearing || "";
    this.curveDeltaAngle = curveDeltaAngle || "";
    this.curveTangent = curveTangent || "";
    this.createdAt = createdAt || stamp;
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;
  }

  static fromObject(obj = {}) {
    return new TraverseInstruction(obj);
  }

  toObject() {
    return {
      id: this.id,
      bearing: this.bearing,
      distance: this.distance,
      branches: (this.branches || []).map((branch) =>
        (branch || []).map((call) =>
          call instanceof TraverseInstruction ? call.toObject() : call
        )
      ),
      curveRadius: this.curveRadius,
      curveDirection: this.curveDirection,
      curveArcLength: this.curveArcLength,
      curveChordLength: this.curveChordLength,
      curveChordBearing: this.curveChordBearing,
      curveDeltaAngle: this.curveDeltaAngle,
      curveTangent: this.curveTangent,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}
