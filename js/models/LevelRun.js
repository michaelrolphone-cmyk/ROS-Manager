export default class LevelRun {
  constructor({
    id = null,
    name = "",
    startPoint = "",
    startElevation = "",
    closingPoint = "",
    closingElevation = "",
    entries = [],
  } = {}) {
    this.id =
      id ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    this.name = name;
    this.startPoint = startPoint;
    this.startElevation = startElevation;
    this.closingPoint = closingPoint;
    this.closingElevation = closingElevation;
    this.entries = Array.isArray(entries)
      ? entries.map((entry, idx) => ({
          id:
            entry?.id ||
            `${this.id}-${idx}-${Math.random().toString(16).slice(2)}`,
          point: entry?.point || "",
          backsight: entry?.backsight || "",
          foresight: entry?.foresight || "",
          notes: entry?.notes || "",
        }))
      : [];
  }

  static fromObject(obj = {}) {
    return new LevelRun(obj);
  }

  toObject() {
    return {
      id: this.id,
      name: this.name,
      startPoint: this.startPoint,
      startElevation: this.startElevation,
      closingPoint: this.closingPoint,
      closingElevation: this.closingElevation,
      entries: this.entries.map((entry) => ({ ...entry })),
    };
  }
}
