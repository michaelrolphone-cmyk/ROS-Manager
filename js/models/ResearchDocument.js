export default class ResearchDocument {
  constructor({
    id = Date.now().toString(),
    projectId = "",
    type = "",
    jurisdiction = "",
    instrumentNumber = "",
    bookPage = "",
    documentNumber = "",
    township = "",
    range = "",
    sections = "",
    aliquots = "",
    source = "",
    dateReviewed = "",
    reviewer = "",
    classification = "",
    notes = "",
    cornerNotes = "",
    linkedEvidence = [],
    traverseLinks = "",
    createdAt = new Date().toISOString(),
    updatedAt = null,
  } = {}) {
    this.id = id;
    this.projectId = projectId;
    this.type = type;
    this.jurisdiction = jurisdiction;
    this.instrumentNumber = instrumentNumber;
    this.bookPage = bookPage;
    this.documentNumber = documentNumber;
    this.township = township;
    this.range = range;
    this.sections = sections;
    this.aliquots = aliquots;
    this.source = source;
    this.dateReviewed = dateReviewed;
    this.reviewer = reviewer;
    this.classification = classification;
    this.notes = notes;
    this.cornerNotes = cornerNotes;
    this.linkedEvidence = Array.isArray(linkedEvidence)
      ? linkedEvidence
      : [];
    this.traverseLinks = traverseLinks;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt || createdAt;
  }

  static fromObject(obj = {}) {
    return new ResearchDocument(obj);
  }

  toObject() {
    return {
      id: this.id,
      projectId: this.projectId,
      type: this.type,
      jurisdiction: this.jurisdiction,
      instrumentNumber: this.instrumentNumber,
      bookPage: this.bookPage,
      documentNumber: this.documentNumber,
      township: this.township,
      range: this.range,
      sections: this.sections,
      aliquots: this.aliquots,
      source: this.source,
      dateReviewed: this.dateReviewed,
      reviewer: this.reviewer,
      classification: this.classification,
      notes: this.notes,
      cornerNotes: this.cornerNotes,
      linkedEvidence: this.linkedEvidence,
      traverseLinks: this.traverseLinks,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
