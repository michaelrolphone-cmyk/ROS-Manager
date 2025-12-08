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

  updateEntry(projectId, entryId, updater) {
    const entries = this.evidenceByProject[projectId] || [];
    const idx = entries.findIndex((ev) => ev.id === entryId);
    if (idx === -1) return null;
    const updated =
      typeof updater === "function"
        ? updater(entries[idx])
        : updater instanceof CornerEvidence
        ? updater
        : CornerEvidence.fromObject({ ...entries[idx].toObject(), ...updater });
    entries[idx] = updated;
    this.saveEvidence();
    return updated;
  }

  deleteEntry(projectId, entryId) {
    if (!projectId) return false;
    const entries = this.evidenceByProject[projectId] || [];
    const newEntries = entries.filter((ev) => ev.id !== entryId);
    this.evidenceByProject[projectId] = newEntries;
    this.saveEvidence();
    return newEntries.length !== entries.length;
  }

  getEntry(projectId, entryId) {
    if (!projectId) return null;
    return (this.evidenceByProject[projectId] || []).find(
      (ev) => ev.id === entryId
    );
  }

  setEvidenceForProject(projectId, entries = []) {
    this.evidenceByProject[projectId] = entries.map((ev) =>
      ev instanceof CornerEvidence ? ev : CornerEvidence.fromObject(ev)
    );
    this.saveEvidence();
  }

  replaceAllEvidence(evidenceMap = {}) {
    this.evidenceByProject = {};
    Object.entries(evidenceMap || {}).forEach(([projectId, entries]) => {
      this.evidenceByProject[projectId] = (entries || []).map((ev) =>
        ev instanceof CornerEvidence ? ev : CornerEvidence.fromObject(ev)
      );
    });
    this.saveEvidence();
  }

  removeProjectEvidence(projectId) {
    if (projectId && this.evidenceByProject[projectId]) {
      delete this.evidenceByProject[projectId];
      this.saveEvidence();
    }
  }

  getProjectEvidence(projectId) {
    if (!projectId) return [];
    return this.evidenceByProject[projectId] || [];
  }

  serializeEvidenceForProject(projectId) {
    if (!projectId) return [];
    return (this.evidenceByProject[projectId] || []).map((entry) =>
      entry.toObject()
    );
  }

  serializeAllEvidence() {
    const output = {};
    Object.entries(this.evidenceByProject).forEach(([projectId, entries]) => {
      output[projectId] = entries.map((entry) => entry.toObject());
    });
    return output;
  }
}
