export default class Point {
  constructor({
    id = null,
    pointNumber = "",
    x = "",
    y = "",
    elevation = "",
    code = "",
    description = "",
    createdAt = null,
    updatedAt = null,
    version = 1,
  } = {}) {
    const stamp = new Date().toISOString();
    this.id = id || `pt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    this.pointNumber = pointNumber;
    this.x = x;
    this.y = y;
    this.elevation = elevation;
    this.code = code;
    this.description = description;
    this.createdAt = createdAt || stamp;
    this.updatedAt = updatedAt || this.createdAt;
    this.version = version ?? 1;
  }

  static fromObject(obj = {}) {
    return new Point({
      pointNumber: obj.pointNumber,
      x: obj.x,
      y: obj.y,
      elevation: obj.elevation,
      code: obj.code,
      description: obj.description,
      createdAt: obj.createdAt,
      updatedAt: obj.updatedAt,
      version: obj.version,
      id: obj.id,
    });
  }

  toObject() {
    return {
      pointNumber: this.pointNumber,
      x: this.x,
      y: this.y,
      elevation: this.elevation,
      code: this.code,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      id: this.id,
    };
  }

  hasAlphaNumericNumber() {
    return /[a-z]/i.test(this.pointNumber || "");
  }
}
