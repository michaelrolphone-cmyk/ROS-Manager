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
    this.traverseGeometries = {};
    this.defaultQcSettings = {
      traverseAngularTolerance: 0.25,
      traverseLinearTolerance: 0.0002,
      levelMisclosurePerDistance: 0.02,
    };
    this.globalSettings = { backupSettings: { rollingBackupsEnabled: true } };
    this.pointController = { renderPointsTable() {} };
    this.navigationController = { onProjectChanged() {} };
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

  computeTraversePointsForRecord(_projectId, recordId) {
    const geometry = this.traverseGeometries[recordId];
    if (geometry) return geometry;
    return { polylines: [] };
  }

  setTraverseGeometry(recordId, geometry) {
    this.traverseGeometries[recordId] = geometry;
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

  updateProjectList() {}

  drawProjectOverview() {}

  hideProjectForm() {}

  refreshEvidenceUI() {}

  refreshResearchUI() {}

  resetEquipmentForm() {}

  refreshEquipmentUI() {}

  populateLocalizationSelectors() {}

  populatePointGenerationOptions() {}

  populateProjectDetailsForm() {}

  renderAuditTrail() {}

  renderQualityDashboard() {}

  handleSpringboardScroll() {}

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

  recordAuditEvent(type, metadata = {}) {
    const project = this.projects[this.currentProjectId];
    if (!project) return;
    project.auditTrail = project.auditTrail || [];
    project.auditTrail.push({
      type,
      timestamp: new Date().toISOString(),
      ...metadata,
    });
  }
}

describe("End-to-end workflow from project creation to Smart Pack", () => {
  let harness;
  let storage;

  const expectCloseTo = (actual, expected, tolerance = 1e-6) => {
    assert.ok(Math.abs(actual - expected) < tolerance, `${actual} not within ${tolerance} of ${expected}`);
  };

  const expectGate = (projectId, expectedStatus, reasons = []) => {
    const gate = harness.computeSmartPackGate(projectId);
    assert.equal(gate.status, expectedStatus);
    reasons.forEach((reason) => {
      assert.ok(
        gate.blockers.some((blocker) => blocker.toLowerCase().includes(reason.toLowerCase())),
        `Missing blocker containing "${reason}"`
      );
    });
    return gate;
  };

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

  it("enforces Smart Pack gates, validates QC geometry, and round-trips export/import", async () => {
    const traverseId = "trv-1";
    const failingTraverse = {
      polylines: [
        [
          { x: 0, y: 0, pointNumber: 1 },
          { x: 100, y: 0, pointNumber: 2 },
          { x: 100, y: 100, pointNumber: 3 },
          { x: -1, y: -0.2, pointNumber: 4 },
          { x: 0.5, y: -0.2, pointNumber: 5 },
        ],
      ],
    };
    const passingTraverse = {
      polylines: [
        [
          { x: 0, y: 0, pointNumber: 1 },
          { x: 100, y: 0, pointNumber: 2 },
          { x: 100, y: 100, pointNumber: 3 },
          { x: -0.05, y: 0.01, pointNumber: 4 },
          { x: 0.05, y: 0.01, pointNumber: 5 },
        ],
      ],
    };

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
        traverseAngularTolerance: 1,
        traverseLinearTolerance: 0.0002,
        levelMisclosurePerDistance: 0.02,
      },
      records: {
        [traverseId]: new SurveyRecord({
          id: traverseId,
          name: "TRV-NW-Sec12-Test",
          status: "Final",
          basis: "Solar observation",
          closurePointNumber: 1,
        }),
      },
    });

    harness.projects[project.id] = project;
    harness.currentProjectId = project.id;
    harness.setTraverseGeometry(traverseId, failingTraverse);
    harness.saveProjects();

    let qcResults = harness.computeQualityResults(project.id);
    const failingTraverseResult = qcResults.traverses[0];
    expectCloseTo(failingTraverseResult.linearMisclosure, Math.hypot(0.5, -0.2));
    expectCloseTo(
      failingTraverseResult.misclosureRatio,
      Math.hypot(0.5, -0.2) /
        (100 + 100 + Math.hypot(-101, -100.2) + 1.5)
    );
    assert.equal(failingTraverseResult.closurePointNumber, 1);
    assert.equal(failingTraverseResult.misclosureDirection, "SE-68.20°");
    expectGate(project.id, "QC Failed", ["QC failed", "Evidence missing", "Research missing"]);

    harness.setTraverseGeometry(traverseId, passingTraverse);
    qcResults = harness.computeQualityResults(project.id);
    const passingTraverseResult = qcResults.traverses[0];
    expectCloseTo(passingTraverseResult.linearMisclosure, Math.hypot(0.05, 0.01));
    expectCloseTo(
      passingTraverseResult.misclosureRatio,
      Math.hypot(0.05, 0.01) /
        (100 + 100 + Math.hypot(-100.05, -99.99) + 0.1)
    );
    assert.equal(passingTraverseResult.closurePointNumber, 1);
    assert.equal(passingTraverseResult.misclosureDirection, "NE-78.69°");
    expectGate(project.id, "Blocked", ["Evidence missing", "Research missing"]);

    const controllingDoc = new ResearchDocument({
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
      status: "Draft",
    });
    harness.researchDocumentService.addEntry(controllingDoc);
    expectGate(project.id, "Blocked", ["Research draft", "Evidence missing"]);

    harness.researchDocumentService.updateEntry({
      ...controllingDoc.toObject(),
      status: "Final",
    });
    harness.recordAuditEvent("RESEARCH_FINALIZED", { docId: controllingDoc.id });

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
    harness.researchDocumentService.addEntry(conflictingRos);
    expectGate(project.id, "Blocked", ["conflict resolution", "Evidence missing"]);

    harness.researchDocumentService.updateEntry({
      ...conflictingRos.toObject(),
      resolution: "Accepted controlling GLO plat; ROS provides tie check only.",
      resolutionBy: "Jane Doe",
      resolutionDate: "2024-02-01",
      resolutionDocIds: [controllingDoc.id],
    });
    harness.recordAuditEvent("CONFLICT_RESOLVED", { docId: conflictingRos.id });

    const incompleteEvidence = new CornerEvidence({
      id: "ev-nw",
      projectId: project.id,
      recordId: traverseId,
      township: "T5N",
      range: "R2E",
      section: "12",
      sectionBreakdown: "NW",
      type: "Monument",
      cornerType: "PLSS",
      cornerStatus: "Found",
      condition: "Good",
      status: "Draft",
      surveyorName: "Jane Doe",
      surveyorLicense: "PLS 12345",
      surveyorFirm: "Test Survey LLC",
      notes: "Standard aluminum cap with 5/8\" rebar.",
      basisOfBearing: "Solar observation",
    });
    harness.cornerEvidenceService.addEntry(incompleteEvidence);
    expectGate(project.id, "Blocked", ["Evidence draft", "ties"]);

    harness.cornerEvidenceService.updateEntry(project.id, incompleteEvidence.id, {
      ...incompleteEvidence.toObject(),
      status: "Final",
      ties: [
        {
          type: "witness",
          distance: 100.0,
          bearing: "S 45°00'00\" E",
          description: "To 10\" pine",
          photos: ["monument_photo.jpg"],
        },
        {
          type: "accessory",
          distance: 75.0,
          bearing: "N10E",
          description: "To 12\" oak",
        },
      ],
    });
    harness.recordAuditEvent("EVIDENCE_FINALIZED", { evidenceId: incompleteEvidence.id });

    qcResults = harness.computeQualityResults(project.id);
    assert.equal(qcResults.researchSummary.readyCount, 2);
    assert.equal(qcResults.evidenceSummary.readyCount, 1);
    assert.equal(qcResults.traverses[0].status, "pass");
    assert.equal(qcResults.overallClass, "qc-pass");

    const smartPackGate = expectGate(project.id, "Final", []);
    assert.equal(harness.computeSmartPackStatus(project.id), "Final");

    const bundle = harness.buildSmartPackBundle(project.id);
    assert.equal(bundle.project.name, project.name);
    assert.equal(bundle.research.length, 2);
    assert.equal(bundle.evidence.length, 1);
    assert.equal(bundle.evidence[0].ties.length, 2);
    assert.equal(bundle.traverses[0].status, "pass");

    harness.exportCurrentProject();
    assert.ok(harness.lastDownload.payload.projects[project.id]);
    assert.ok(harness.lastDownload.payload.qcSummaries[project.id]);
    assert.ok(harness.projects[project.id].lastExportedAt);
    assert.equal(harness.lastBackup.ids[0], project.id);

    harness.recordAuditEvent("SMART_PACK_FINALIZED", { status: smartPackGate.status });
    const auditEntries = harness.projects[project.id].auditTrail || [];
    const auditTypes = auditEntries.map((e) => e.type);
    [
      "RESEARCH_FINALIZED",
      "CONFLICT_RESOLVED",
      "EVIDENCE_FINALIZED",
      "SMART_PACK_FINALIZED",
    ].forEach((required) => {
      assert.ok(auditTypes.includes(required));
    });

    const snapshot = await harness.auditTrailService.createSnapshot(
      { project: project.toObject(), research: bundle.research },
      { deviceId: "dev-1", user: "Jane" }
    );
    const verified = await harness.auditTrailService.verifySnapshot(
      snapshot.bundle,
      snapshot.hash
    );
    assert.equal(verified, true);

    const importStorage = new MemoryStorage();
    globalThis.localStorage = importStorage;
    const importHarness = new EndToEndHarness({
      projectRepository: new ProjectRepository("e2e-projects"),
      cornerEvidenceService: new CornerEvidenceService("e2e-evidence"),
      researchDocumentService: new ResearchDocumentService("e2e-research"),
      auditTrailService: new AuditTrailService(),
    });
    importHarness.applyImportPayload(harness.lastDownload.payload);
    importHarness.currentProjectId = project.id;
    importHarness.setTraverseGeometry(traverseId, passingTraverse);

    const restoredResults = importHarness.computeQualityResults(project.id);
    assert.equal(restoredResults.traverses[0].status, qcResults.traverses[0].status);
    assert.equal(
      restoredResults.evidenceSummary.readyCount,
      qcResults.evidenceSummary.readyCount
    );
    assert.equal(
      restoredResults.researchSummary.readyCount,
      qcResults.researchSummary.readyCount
    );
    const importedGate = importHarness.computeSmartPackGate(project.id);
    assert.equal(importedGate.status, "Final");
    assert.deepEqual(importedGate.blockers, []);

    const importedEvidence = importHarness.cornerEvidenceService.getProjectEvidence(
      project.id
    );
    assert.equal(importedEvidence[0].ties.length, 2);
    assert.equal(importedEvidence[0].ties[0].type, "witness");
    assert.ok(Array.isArray(importHarness.projects[project.id].auditTrail));
  });
});
