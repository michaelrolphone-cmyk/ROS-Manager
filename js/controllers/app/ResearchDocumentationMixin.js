const ResearchDocumentationMixin = (Base) =>
  class extends Base {
  /* ===================== Research & Source Documentation ===================== */
  refreshResearchUI() {
    this.appControllers?.researchSection?.refreshResearchUI?.();
  }

  populateResearchEvidenceOptions() {
    this.appControllers?.researchSection?.populateResearchEvidenceOptions?.();
  }

  updateResearchSaveState() {
    this.appControllers?.researchSection?.updateResearchSaveState?.();
  }

  saveResearchDocument() {
    this.appControllers?.researchSection?.saveResearchDocument?.();
  }

  resetResearchForm() {
    this.appControllers?.researchSection?.resetResearchForm?.();
  }

  renderResearchList() {
    this.appControllers?.researchSection?.renderResearchList?.();
  }

  exportResearchPacket() {
    this.appControllers?.researchSection?.exportResearchPacket?.();
  }
  };

export default ResearchDocumentationMixin;
