import ResearchDocument from "../models/ResearchDocument.js";

export default class ResearchDocumentService {
  constructor(storageKey = "carlsonResearchDocs") {
    this.storageKey = storageKey;
    this.docsByProject = this.loadDocuments();
  }

  loadDocuments() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      const output = {};
      Object.entries(parsed || {}).forEach(([projectId, entries]) => {
        output[projectId] = (entries || []).map((doc) =>
          doc instanceof ResearchDocument
            ? doc
            : ResearchDocument.fromObject(doc)
        );
      });
      return output;
    } catch (e) {
      console.warn("Failed to parse research documents", e);
      return {};
    }
  }

  saveDocuments() {
    const serialized = {};
    Object.entries(this.docsByProject).forEach(([projectId, entries]) => {
      serialized[projectId] = entries.map((doc) => doc.toObject());
    });
    localStorage.setItem(this.storageKey, JSON.stringify(serialized));
  }

  addEntry(entry) {
    if (!entry?.projectId) {
      throw new Error("projectId is required to save research document");
    }
    if (!this.docsByProject[entry.projectId]) {
      this.docsByProject[entry.projectId] = [];
    }
    this.docsByProject[entry.projectId].push(entry);
    this.saveDocuments();
  }

  setDocumentsForProject(projectId, entries = []) {
    this.docsByProject[projectId] = entries.map((doc) =>
      doc instanceof ResearchDocument ? doc : ResearchDocument.fromObject(doc)
    );
    this.saveDocuments();
  }

  replaceAllDocuments(docMap = {}) {
    this.docsByProject = {};
    Object.entries(docMap || {}).forEach(([projectId, entries]) => {
      this.docsByProject[projectId] = (entries || []).map((doc) =>
        doc instanceof ResearchDocument
          ? doc
          : ResearchDocument.fromObject(doc)
      );
    });
    this.saveDocuments();
  }

  removeProjectDocuments(projectId) {
    if (projectId && this.docsByProject[projectId]) {
      delete this.docsByProject[projectId];
      this.saveDocuments();
    }
  }

  getProjectDocuments(projectId) {
    if (!projectId) return [];
    return this.docsByProject[projectId] || [];
  }

  serializeProject(projectId) {
    if (!projectId) return [];
    return (this.docsByProject[projectId] || []).map((doc) => doc.toObject());
  }

  serializeAll() {
    const output = {};
    Object.entries(this.docsByProject).forEach(([projectId, entries]) => {
      output[projectId] = entries.map((doc) => doc.toObject());
    });
    return output;
  }
}
