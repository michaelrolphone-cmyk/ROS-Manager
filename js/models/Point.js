export default class Point {
  constructor({
    pointNumber = "",
    x = "",
    y = "",
    elevation = "",
    code = "",
    description = "",
  } = {}) {
    this.pointNumber = pointNumber;
    this.x = x;
    this.y = y;
    this.elevation = elevation;
    this.code = code;
    this.description = description;
  }

  static fromObject(obj = {}) {
    return new Point({
      pointNumber: obj.pointNumber,
      x: obj.x,
      y: obj.y,
      elevation: obj.elevation,
      code: obj.code,
      description: obj.description,
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
    };
  }

  hasAlphaNumericNumber() {
    return /[a-z]/i.test(this.pointNumber || "");
  }
}
