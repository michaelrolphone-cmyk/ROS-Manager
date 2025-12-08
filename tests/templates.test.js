import { describe, it } from "node:test";
import assert from "node:assert/strict";

import ExportImportMixin from "../js/controllers/app/ExportImportMixin.js";
import ProjectsRecordsMixin from "../js/controllers/app/ProjectsRecordsMixin.js";
import LevelingController from "../js/controllers/LevelingController.js";

class ExportHarness extends ExportImportMixin(class {}) {
  constructor(profile) {
    super();
    this.profile = profile;
  }

  getProfessionalProfile() {
    return this.profile;
  }

  getExportStatusLabel() {
    return { title: "Draft", note: "" };
  }

  formatLevelNumber(value) {
    return `${value}`;
  }

  formatDegrees(value) {
    return `${value}`;
  }

  escapeHtml(str) {
    return str;
  }

  buildEvidenceTrs() {
    return "T1 R1 S1";
  }
}

class QcHarness extends ProjectsRecordsMixin(ExportImportMixin(class {})) {
  constructor(profile) {
    super();
    this.profile = profile;
  }

  getProfessionalProfile() {
    return this.profile;
  }

  getExportStatusLabel() {
    return { title: "Draft", note: "" };
  }

  formatLevelNumber(value) {
    return `${value}`;
  }

  formatRatio() {
    return "1:5000";
  }

  formatDegrees(value) {
    return `${value}`;
  }

  escapeHtml(str) {
    return str;
  }

  buildEvidenceTrs() {
    return "T1 R1 S1";
  }
}

describe("Professional headers", () => {
  const profile = {
    surveyorName: "Ada Lovelace",
    licenseNumber: "ID-12345",
    firmName: "Analytical Engines",
    contactPhone: "555-0100",
    contactEmail: "ada@example.com",
    county: "Ada County",
  };

  it("injects surveyor identity into Smart Pack HTML", () => {
    const harness = new ExportHarness(profile);
    const html = harness.buildSmartPackHtml({
      status: "Draft",
      project: { name: "Prairie Farm", id: "p-1" },
      basisOfBearing: "Solar observation",
      traverses: [],
      levels: [],
      evidence: [],
      equipmentLogs: [],
      stakeoutEntries: [],
      research: [],
      qcSummary: {},
    });

    assert.match(html, /Ada Lovelace/);
    assert.match(html, /ID-12345/);
    assert.match(html, /Analytical Engines/);
    assert.match(html, /555-0100/);
    assert.match(html, /Ada County/);
    assert.match(html, /Solar observation/);
    assert.match(html, /Place Surveyor Seal/);
  });

  it("adds professional header to QC summary exports", () => {
    const harness = new QcHarness(profile);
    const html = harness.buildQualityControlSummaryHtml(
      {
        project: { name: "Prairie Farm", id: "p-1", records: {} },
        generatedAt: new Date().toISOString(),
        results: { traverses: [], levels: [], overallLabel: "Pass" },
        affectedEvidence: [],
        settings: {
          traverseAngularTolerance: 0.1,
          traverseLinearTolerance: 0.0001,
          levelMisclosurePerDistance: 0.02,
        },
        overrides: [],
      },
      "Draft"
    );

    assert.match(html, /Professional identification/);
    assert.match(html, /Ada Lovelace/);
    assert.match(html, /Place Surveyor Seal/);
  });

  it("formats professional info for level run exports", () => {
    const controller = new LevelingController({
      elements: {},
      getCurrentProject: () => null,
      saveProjects: () => {},
      getProjectName: () => "Prairie Farm",
      getProfessionalProfile: () => profile,
    });

    const html = controller.buildLevelRunHtml({
      run: {
        name: "Loop A",
        startPoint: "BM1",
        startElevation: 100.5,
        closingPoint: "BM2",
        closingElevation: 100.55,
      },
      stats: { misclosure: 0.02 },
      rows: "<tr><td>1</td><td>BM1</td><td>0.5</td><td>0.4</td><td></td><td>0.1</td><td>100.5</td><td>0.5</td><td>0.4</td><td>0</td></tr>",
      projectName: "Prairie Farm",
    });

    assert.match(html, /Ada Lovelace/);
    assert.match(html, /Analytical Engines/);
    assert.match(html, /555-0100/);
    assert.match(html, /Place Surveyor Seal/);
  });

  it("includes backsight and foresight values in differential level exports", () => {
    const controller = new LevelingController({
      elements: {},
      getCurrentProject: () => null,
      saveProjects: () => {},
      getProjectName: () => "Prairie Farm",
      getProfessionalProfile: () => profile,
    });

    const html = controller.buildLevelRunHtml({
      run: {
        name: "Loop B",
        startPoint: "BM10",
        startElevation: 100.0,
        closingPoint: "BM10",
        closingElevation: 100.0,
      },
      stats: { misclosure: 0.0 },
      rows: "<tr><td>1</td><td>BM10</td><td>1.234</td><td>2.345</td><td>note</td><td>0.0</td><td>100.0</td><td>1.234</td><td>2.345</td><td>0</td></tr>",
      projectName: "Prairie Farm",
    });

    assert.match(html, />1.234<\/td><td>2.345</);
    assert.match(html, /<th>BS<\/th><th>FS<\/th>/);
  });
});
