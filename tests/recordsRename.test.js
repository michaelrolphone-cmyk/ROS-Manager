import { describe, it } from "node:test";
import assert from "node:assert/strict";

import ProjectsRecordsMixin from "../js/controllers/app/ProjectsRecordsMixin.js";

class EvidenceServiceStub {
  constructor(entries = []) {
    this.entries = entries;
  }

  getProjectEvidence() {
    return this.entries;
  }

  updateEntry(_projectId, entryId, update) {
    const entry = this.entries.find((item) => item.id === entryId);
    if (entry) Object.assign(entry, update);
  }
}

class RenameHarness extends ProjectsRecordsMixin(class {}) {
  constructor() {
    super();
    this.projects = {
      p1: {
        records: {
          r1: { id: "r1", name: "Old Traverse" },
        },
      },
    };
    this.currentProjectId = "p1";
    this.currentRecordId = "r1";
    this.elements = {
      recordNameEdit: { value: "" },
      currentRecordName: { textContent: "" },
    };
    this.appControllers = {
      traverseSection: { renderRecords: () => (this.traverseRendered = true) },
      boundarySection: {
        renderRecordOptions: () => (this.boundaryRendered = true),
      },
      legalDescriptionSection: {
        renderTraverseOptions: () => (this.legalRendered = true),
        generateDescription: () => (this.legalGenerated = true),
      },
      stakeoutSection: {
        renderTraverseOptions: () => (this.stakeoutRendered = true),
      },
    };
    this.cornerEvidenceService = new EvidenceServiceStub([
      { id: "e1", recordId: "r1", recordName: "Old Traverse" },
      { id: "e2", recordId: "r2", recordName: "Other Traverse" },
    ]);
  }

  saveProjects() {
    this.saved = true;
  }

  populateLocalizationSelectors() {
    this.localizationUpdated = true;
  }

  populatePointGenerationOptions() {
    this.pointGenerationUpdated = true;
  }

  refreshEvidenceUI() {
    this.evidenceRefreshed = true;
  }
}

describe("renameCurrentRecord", () => {
  it("updates record names and dependent UI state", () => {
    const harness = new RenameHarness();

    harness.renameCurrentRecord("Main Traverse");

    assert.equal(harness.projects.p1.records.r1.name, "Main Traverse");
    assert.equal(harness.elements.currentRecordName.textContent, "Main Traverse");
    assert.equal(harness.elements.recordNameEdit.value, "Main Traverse");
    assert.equal(
      harness.cornerEvidenceService.entries[0].recordName,
      "Main Traverse"
    );
    assert.equal(
      harness.cornerEvidenceService.entries[1].recordName,
      "Other Traverse"
    );
    assert.ok(harness.saved);
    assert.ok(harness.traverseRendered);
    assert.ok(harness.boundaryRendered);
    assert.ok(harness.legalRendered);
    assert.ok(harness.legalGenerated);
    assert.ok(harness.stakeoutRendered);
    assert.ok(harness.localizationUpdated);
    assert.ok(harness.pointGenerationUpdated);
    assert.ok(harness.evidenceRefreshed);
  });
});
