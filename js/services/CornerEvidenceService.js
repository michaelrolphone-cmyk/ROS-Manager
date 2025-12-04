import CornerEvidence from "../models/CornerEvidence.js";

export default class CornerEvidenceService {
  constructor(storageKey = "carlsonSurveyEvidence") {
    this.storageKey = storageKey;
    this.evidenceByProject = this.loadEvidence();
  }

  loadEvidence() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      const output = {};
      Object.entries(parsed || {}).forEach(([projectId, entries]) => {
        output[projectId] = (entries || []).map((ev) =>
          ev instanceof CornerEvidence ? ev : CornerEvidence.fromObject(ev)
        );
      });
      return output;
    } catch (e) {
      console.warn("Failed to parse evidence", e);
      return {};
    }
  }

  saveEvidence() {
    const serialized = {};
    Object.entries(this.evidenceByProject).forEach(([projectId, entries]) => {
      serialized[projectId] = entries.map((entry) => entry.toObject());
    });
    localStorage.setItem(this.storageKey, JSON.stringify(serialized));
  }

  addEntry(entry) {
    if (!entry?.projectId) {
      throw new Error("projectId is required to save evidence");
    }
    if (!this.evidenceByProject[entry.projectId]) {
      this.evidenceByProject[entry.projectId] = [];
    }
    this.evidenceByProject[entry.projectId].push(entry);
    this.saveEvidence();
  }

  getProjectEvidence(projectId) {
    if (!projectId) return [];
    return this.evidenceByProject[projectId] || [];
  }
}
