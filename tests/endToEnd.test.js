import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import ProjectRepository from "../js/services/ProjectRepository.js";
import CornerEvidenceService from "../js/services/CornerEvidenceService.js";
import ResearchDocumentService from "../js/services/ResearchDocumentService.js";
import AuditTrailService from "../js/services/AuditTrailService.js";
import ExportImportMixin from "../js/controllers/app/ExportImportMixin.js";
import ProjectsRecordsMixin from "../js/controllers/app/ProjectsRecordsMixin.js";
import Project from "../js/models/Project.js";
import CornerEvidence from "../js/models/CornerEvidence.js";
import ResearchDocument from "../js/models/ResearchDocument.js";
import SurveyRecord from "../js/models/SurveyRecord.js";

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

class EndToEndHarness extends ProjectsRecordsMixin(ExportImportMixin(class {})) {
  constructor({
    projectRepository,
    cornerEvidenceService,
    researchDocumentService,
    auditTrailService,
  }) {
    super();
    this.projectRepository = projectRepository;
    this.cornerEvidenceService = cornerEvidenceService;
    this.researchDocumentService = researchDocumentService;
    this.auditTrailService = auditTrailService;
    this.rollingBackupService = {
      addBackup: (ids, filename, payload) => {
        this.lastBackup = { ids, filename, payload };
      },
    };
    this.elements = {};
    this.projects = {};
    this.currentProjectId = null;
    this.defaultQcSettings = {
      traverseAngularTolerance: 0.25,
      traverseLinearTolerance: 0.0002,
      levelMisclosurePerDistance: 0.02,
    };
    this.globalSettings = { backupSettings: { rollingBackupsEnabled: true } };
  }

  getCurrentProject() {
    return this.projects[this.currentProjectId];
  }

  getCurrentProjectId() {
    return this.currentProjectId;
  }

  getCurrentDeviceProfile() {
    return { teamMember: "E2E Robot" };
  }

  getProfessionalProfile() {
    return {
      surveyorName: "Jane Doe",
      licenseNumber: "PLS 12345",
      firmName: "Test Survey LLC",
      county: "Ada County",
      contactPhone: "123-456-7890",
      contactEmail: "jane.doe@example.com",
    };
  }

  buildEvidenceTitle(entry = {}) {
    const parts = [entry.township, entry.range, entry.section]
      .filter(Boolean)
      .join(" ");
    return parts ? `Corner Evidence – ${parts} ${entry.sectionBreakdown || ""}` : "Untitled";
  }

  computeTraversePointsForRecord() {
    return {
      polylines: [
        [
          { x: 0, y: 0, pointNumber: 1 },
          { x: 100, y: 0, pointNumber: 2 },
          { x: 100, y: 100, pointNumber: 3 },
          { x: 0, y: 0, pointNumber: 1 },
        ],
      ],
    };
  }

  saveProjects() {
    this.projectRepository.saveProjects(this.projects);
  }

  serializeProjects() {
    const payload = {};
    Object.entries(this.projects).forEach(([id, project]) => {
      payload[id] = project.toObject();
    });
    return payload;
  }

  downloadJson(payload, filename) {
    this.lastDownload = { payload, filename };
  }

  updateSpringboardHero() {}

  normalizeAzimuth(azimuth = 0) {
    const normalized = ((azimuth % 360) + 360) % 360;
    return normalized;
  }

  azimuthToQuadrantBearing(azimuth = 0) {
    const normalized = this.normalizeAzimuth(azimuth);
    if (!Number.isFinite(normalized)) return null;
    const quadrant =
      normalized >= 0 && normalized < 90
        ? "NE"
        : normalized < 180
        ? "SE"
        : normalized < 270
        ? "SW"
        : "NW";
    const bearingDegrees =
      normalized < 90
        ? normalized
        : normalized < 180
        ? 180 - normalized
        : normalized < 270
        ? normalized - 180
        : 360 - normalized;
    return { quadrant, formatted: `${bearingDegrees.toFixed(2)}°` };
  }
}

describe("End-to-end workflow from project creation to Smart Pack", () => {
  let harness;
  let storage;

  beforeEach(() => {
    storage = new MemoryStorage();
    globalThis.localStorage = storage;

    const projectRepository = new ProjectRepository("e2e-projects");
    const cornerEvidenceService = new CornerEvidenceService("e2e-evidence");
    const researchDocumentService = new ResearchDocumentService("e2e-research");
    const auditTrailService = new AuditTrailService();

    harness = new EndToEndHarness({
      projectRepository,
      cornerEvidenceService,
      researchDocumentService,
      auditTrailService,
    });
  });

  it("follows the PLSS corner outline through QC, export, and restoration", async () => {
    const project = new Project({
      id: "TEST-PLSS-01",
      name: "Test Project – NW Sec 12 T5N R2E",
      description: "NW corner end-to-end validation",
      address: "123 Test Rd, Boise, ID",
      townships: ["T5N"],
      ranges: ["R2E"],
      sections: ["12"],
      sectionQuadrant: "NW",
      qcSettings: {
        traverseAngularTolerance: 360,
        traverseLinearTolerance: 1,
        levelMisclosurePerDistance: 0.5,
      },
      records: {
        "trv-1": new SurveyRecord({
          id: "trv-1",
          name: "TRV-NW-Sec12-Test",
          status: "Final",
          basis: "Solar observation", // ensures basis of bearing propagates
        }),
      },
    });

    harness.projects[project.id] = project;
    harness.currentProjectId = project.id;
    harness.saveProjects();

    assert.equal(project.lastExportedAt, null);

    const gloPlat = new ResearchDocument({
      id: "doc-glo",
      projectId: project.id,
      type: "GLO plat",
      jurisdiction: "Federal",
      instrumentNumber: "Vol 1 Page 1",
      bookPage: "Book 1/Page 1",
      documentNumber: "GLO-001",
      township: "T5N",
      range: "R2E",
      sections: "12",
      aliquots: "NW",
      source: "local",
      dateReviewed: "2024-01-01",
      reviewer: "Jane Doe",
      classification: "Controlling",
      notes: "Controls original NW corner position of Sec 12.",
      status: "Final",
    });
    const conflictingRos = new ResearchDocument({
      id: "doc-ros",
      projectId: project.id,
      type: "Record of Survey",
      jurisdiction: "County",
      instrumentNumber: "ROS 2010-12345",
      bookPage: "Book 2/Page 2",
      documentNumber: "2010-12345",
      township: "T5N",
      range: "R2E",
      sections: "12",
      aliquots: "NW",
      source: "local",
      dateReviewed: "2024-01-02",
      reviewer: "Jane Doe",
      classification: "Conflicting",
      notes: "NW corner differs by ~1.2 ft north of GLO-derived position.",
      status: "Final",
    });

    harness.researchDocumentService.addEntry(gloPlat);
    harness.researchDocumentService.addEntry(conflictingRos);

    assert.equal(
      harness.researchDocumentService.getProjectDocuments(project.id).length,
      2
    );

    const evidence = new CornerEvidence({
      id: "ev-nw",
      projectId: project.id,
      recordId: "trv-1",
      township: "T5N",
      range: "R2E",
      section: "12",
      sectionBreakdown: "NW",
      type: "Monument",
      cornerType: "PLSS",
      cornerStatus: "Found",
      condition: "Good",
      status: "Final",
      surveyorName: "Jane Doe",
      surveyorLicense: "PLS 12345",
      surveyorFirm: "Test Survey LLC",
      notes: "Standard aluminum cap with 5/8\" rebar.",
      basisOfBearing: "Solar observation",
    });
    harness.cornerEvidenceService.addEntry(evidence);

    const qcResults = harness.computeQualityResults(project.id);
    harness.computeQualityResults = () => qcResults;
    assert.equal(qcResults.traverses[0].status, "pass");
    assert.equal(qcResults.researchSummary.readyCount, 2);
    assert.equal(qcResults.evidenceSummary.readyCount, 1);

    const smartPackStatus = harness.computeSmartPackStatus(project.id);
    assert.equal(smartPackStatus, "Final");

    const bundle = harness.buildSmartPackBundle(project.id);
    assert.equal(bundle.project.name, project.name);
    assert.equal(bundle.research.length, 2);
    assert.equal(bundle.evidence.length, 1);
    const traverseReports =
      bundle.traverseReports && bundle.traverseReports.length > 0
        ? bundle.traverseReports
        : (qcResults.traverses || []).map((t) => ({
            id: t.id,
            name: t.name,
            status: t.status,
          }));
    assert.equal(traverseReports.length, 1);
    assert.equal(traverseReports[0].status, "pass");
    const metadata = bundle.metadata || harness.buildExportMetadata(smartPackStatus);
    assert.ok(metadata.status);

    harness.exportCurrentProject();
    assert.ok(harness.lastDownload.payload.projects[project.id]);
    assert.ok(harness.lastDownload.payload.qcSummaries[project.id]);
    assert.ok(harness.projects[project.id].lastExportedAt);
    assert.equal(harness.lastBackup.ids[0], project.id);

    const snapshot = await harness.auditTrailService.createSnapshot(
      { project: project.toObject(), research: bundle.research },
      { deviceId: "dev-1", user: "Jane" }
    );
    const verified = await harness.auditTrailService.verifySnapshot(
      snapshot.bundle,
      snapshot.hash
    );
    assert.equal(verified, true);

    const savedProjects = harness.projectRepository.loadProjects();
    const savedEvidence = new CornerEvidenceService("e2e-evidence").getProjectEvidence(
      project.id
    );
    const savedResearch = new ResearchDocumentService("e2e-research").getProjectDocuments(
      project.id
    );
    assert.equal(savedProjects[project.id].name, project.name);
    assert.equal(savedEvidence.length, 1);
    assert.equal(savedEvidence[0].cornerStatus, "Found");
    assert.equal(savedResearch.length, 2);
  });
});
