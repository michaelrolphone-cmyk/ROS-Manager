import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import ResearchDocumentService from "../js/services/ResearchDocumentService.js";
import ResearchDocument from "../js/models/ResearchDocument.js";
import RollingBackupService from "../js/services/RollingBackupService.js";
import AuditTrailService from "../js/services/AuditTrailService.js";
import EquipmentSetupMixin from "../js/controllers/app/EquipmentSetupMixin.js";
import Project from "../js/models/Project.js";
import GlobalSettingsService from "../js/services/GlobalSettingsService.js";
import ProjectRepository from "../js/services/ProjectRepository.js";
import VersioningService from "../js/services/VersioningService.js";
import CornerEvidenceService from "../js/services/CornerEvidenceService.js";
import CornerEvidence from "../js/models/CornerEvidence.js";
import ProjectsRecordsMixin from "../js/controllers/app/ProjectsRecordsMixin.js";

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

describe("Historical Research mini-app", () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it("persists structured research documents with links and annotations", () => {
    const service = new ResearchDocumentService("research-test");
    const entry = new ResearchDocument({
      id: "doc-1",
      projectId: "proj-1",
      type: "GLO plat",
      jurisdiction: "County",
      instrumentNumber: "IN-123",
      bookPage: "Book 5/Page 10",
      documentNumber: "2024-0001",
      township: "T5N",
      range: "R2E",
      sections: "12",
      aliquots: "NE",
      source: "scanner",
      dateReviewed: "2024-02-02",
      reviewer: "Casey",
      status: "Ready for Review",
      classification: "Controlling",
      notes: "Controls NE corner",
      cornerNotes: "Matches deed call",
      linkedEvidence: [{ id: "ev-1" }],
      traverseLinks: "tr-7",
      stakeoutLinks: "st-2",
      cornerIds: "12-NE",
    });

    service.addEntry(entry);

    const rehydrated = new ResearchDocumentService("research-test");
    const stored = rehydrated.getProjectDocuments("proj-1")[0];

    assert.equal(stored.type, "GLO plat");
    assert.equal(stored.classification, "Controlling");
    assert.equal(stored.linkedEvidence[0].id, "ev-1");
    assert.equal(stored.traverseLinks, "tr-7");
    assert.equal(stored.stakeoutLinks, "st-2");

    const serialized = rehydrated.serializeProject("proj-1");
    assert.equal(serialized[0].aliquots, "NE");
    assert.equal(serialized[0].status, "Ready for Review");
  });

  it("rehydrates plain objects into ResearchDocument instances and clears removed projects", () => {
    const service = new ResearchDocumentService("research-test");
    service.setDocumentsForProject("proj-1", [
      {
        id: "o-1",
        projectId: "proj-1",
        type: "Deed",
        linkedEvidence: [{ id: "ev-9" }],
      },
    ]);

    const rehydrated = new ResearchDocumentService("research-test");
    const doc = rehydrated.getProjectDocuments("proj-1")[0];

    assert.ok(doc instanceof ResearchDocument);
    assert.equal(doc.linkedEvidence[0].id, "ev-9");

    rehydrated.removeProjectDocuments("proj-1");
    assert.deepEqual(rehydrated.getProjectDocuments("proj-1"), []);
  });

  it("handles malformed storage payloads gracefully", () => {
    const storageKey = "research-test";
    const rawStorage = new MemoryStorage();
    rawStorage.setItem(storageKey, "not-json");
    globalThis.localStorage = rawStorage;

    const service = new ResearchDocumentService(storageKey);
    assert.deepEqual(service.serializeAll(), {});
  });
});

describe("RollingBackupService", () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it("keeps separate capped backup histories per project", () => {
    const service = new RollingBackupService("backup-test");
    const payload = { data: true };

    service.addBackup(["proj-1", "proj-2"], "backup.json", payload, 2);
    service.addBackup(["proj-1"], "backup.json", payload, 2);
    service.addBackup(["proj-1"], "backup.json", payload, 2);

    const projectBackups = new RollingBackupService("backup-test").getBackups(
      "proj-1"
    );
    const otherProjectBackups = new RollingBackupService(
      "backup-test"
    ).getBackups("proj-2");

    assert.equal(projectBackups.length, 2);
    assert.equal(otherProjectBackups.length, 1);
    assert.ok(projectBackups[0].id.startsWith("b-"));
    assert.equal(projectBackups[0].filename, "backup.json");
  });

  it("rotates backups per project and clears scoped history", () => {
    const service = new RollingBackupService("backup-test");
    const payload = { value: 1 };

    service.addBackup(["proj-1"], "a.json", payload, 2);
    const first = service.getBackups("proj-1")[0];
    service.addBackup(["proj-1"], "b.json", payload, 2);
    service.addBackup(["proj-1"], "c.json", payload, 2);

    const backups = service.getBackups("proj-1");
    assert.equal(backups.length, 2);
    assert.equal(backups[0].filename, "c.json");
    assert.equal(backups[1].filename, "b.json");
    assert.notEqual(backups[1].id, first.id);

    service.clearProject("proj-1");
    assert.deepEqual(service.getBackups("proj-1"), []);
  });

  it("ignores attempts to add backups without project ids or payloads", () => {
    const service = new RollingBackupService("backup-test");
    service.addBackup([], "file.json", null, 2);
    service.addBackup(null, "file.json", { ok: true }, 2);
    assert.deepEqual(service.getBackups("proj-1"), []);
  });
});

describe("Immutable Audit Trail mini-app", () => {
  it("hashes snapshots and verifies integrity with device/user metadata", async () => {
    const service = new AuditTrailService();
    const snapshot = await service.createSnapshot(
      {
        project: { id: "proj-1", name: "Audit Trail", auditTrail: [{}] },
        evidence: { count: 1 },
        metadata: { previous: "abc" },
      },
      { deviceId: "dev-1", user: "Taylor" }
    );

    assert.ok(snapshot.hash);
    assert.equal(snapshot.bundle.project.auditTrail.length, 0);
    assert.equal(snapshot.bundle.metadata.deviceId, "dev-1");
    assert.equal(snapshot.bundle.metadata.user, "Taylor");

    const verified = await service.verifySnapshot(snapshot.bundle, snapshot.hash);
    assert.equal(verified, true);
  });

  it("sanitizes project auditTrail and attaches captured metadata", async () => {
    const service = new AuditTrailService();
    const snapshot = await service.createSnapshot(
      {
        project: { id: "proj-2", auditTrail: [{ action: "old" }] },
        metadata: { previous: "z" },
      },
      { deviceId: "device-x", user: "Jamie" }
    );

    assert.deepEqual(snapshot.bundle.project.auditTrail, []);
    assert.equal(snapshot.bundle.metadata.deviceId, "device-x");
    assert.equal(snapshot.bundle.metadata.user, "Jamie");
    assert.ok(snapshot.bundle.metadata.capturedAt);
    assert.equal(snapshot.bundle.metadata.previous, "z");
  });

  it("falls back to deterministic hash generation without subtle crypto", async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "crypto"
    );
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
      enumerable: true,
      writable: true,
    });

    try {
      const service = new AuditTrailService();
      const hash = await service.computeHash("sample");

      assert.ok(hash.startsWith("fallback-"));
    } finally {
      Object.defineProperty(globalThis, "crypto", originalDescriptor);
    }
  });
});

describe("CP&F validation", () => {
  class Harness extends EquipmentSetupMixin(class {}) {}

  it("flags missing CP&F-required fields and passes complete entries", () => {
    const mixin = new Harness();
    const incomplete = mixin.getCpfCompleteness({});

    assert.equal(incomplete.complete, false);
    assert.ok(incomplete.missing.includes("monumentType"));
    assert.ok(incomplete.missing.includes("recordingInfo"));

    const complete = mixin.getCpfCompleteness({
      recordId: "rec-1",
      pointLabel: "101",
      township: "T5N",
      range: "R2E",
      section: "12",
      sectionBreakdown: "NE",
      cornerType: "Section corner",
      cornerStatus: "Original monument found",
      monumentType: "Brass cap",
      monumentMaterial: "Brass",
      monumentSize: "2\"",
      basisOfBearing: "Solar",
      condition: "Good",
      surveyorName: "Alex Fielding",
      surveyorLicense: "PLS12345",
      surveyorFirm: "Fielding Survey",
      surveyorDates: "2024-05-01",
      surveyCounty: "Ada",
      recordingInfo: "Inst 123",
    });

    assert.equal(complete.complete, true);
    assert.deepEqual(complete.missing, []);
  });

  it("persists navigation target with sanitized coordinates and versioning", () => {
    class ProjectHarness extends EquipmentSetupMixin(class {}) {
      constructor() {
        super();
        this.currentProjectId = "p1";
        this.projects = { p1: { navigationTarget: null } };
        this.saveCount = 0;
      }

      saveProjects() {
        this.saveCount += 1;
      }
    }

    const mixin = new ProjectHarness();
    mixin.persistNavigationTarget({
      type: "stakeout",
      id: "st-1",
      label: "Stakeout 1",
      value: "A",
      coords: { lat: 43.6, lon: -116.2, extra: "ignored" },
    });

    const target = mixin.projects.p1.navigationTarget;
    assert.equal(target.type, "stakeout");
    assert.equal(target.version, 1);
    assert.deepEqual(target.coords, { lat: 43.6, lon: -116.2 });
    assert.equal(mixin.saveCount, 1);

    mixin.persistNavigationTarget({ label: "Updated" });
    assert.equal(mixin.projects.p1.navigationTarget.version, 2);
  });
});

describe("Global settings and export hygiene", () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it("sanitizes persisted settings and defaults backup settings", () => {
    const storageKey = "global-settings";
    const raw = {
      equipment: [{ id: "eq-1" }],
      pointCodes: [{ code: "CP" }],
      liveLocations: {
        stale: {
          lat: 0,
          lon: 0,
          updatedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        },
        fresh: { lat: 1, lon: 2, updatedAt: new Date().toISOString() },
        invalid: { lat: "bad", lon: 2, updatedAt: "x" },
      },
      activityLog: ["should-remove"],
    };

    localStorage.setItem(storageKey, JSON.stringify(raw));
    const service = new GlobalSettingsService(storageKey);

    const settings = service.load();

    assert.equal(settings.equipment[0].id, "eq-1");
    assert.deepEqual(settings.pointCodes[0], { code: "CP", kind: "point" });
    assert.deepEqual(settings.liveLocations, {
      fresh: raw.liveLocations.fresh,
    });
    assert.ok(settings.backupSettings); // defaults applied
    assert.equal(settings.activityLog, undefined);

    service.save(settings);
    const persisted = JSON.parse(localStorage.getItem(storageKey));
    assert.equal("activityLog" in persisted, false);
  });

  it("prunes live locations by recency and max entries", () => {
    const service = new GlobalSettingsService();
    const recent = { lat: 5, lon: 5, updatedAt: new Date().toISOString() };
    const older = {
      lat: 6,
      lon: 6,
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
    const newest = {
      lat: 7,
      lon: 7,
      updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };

    const pruned = service.pruneLiveLocations(
      { a: recent, b: older, c: newest },
      { maxEntries: 2, maxAgeHours: 1 }
    );

    assert.deepEqual(Object.keys(pruned).sort(), ["a", "c"]);
    assert.equal(pruned.a.lat, 5);
    assert.equal(pruned.c.lat, 7);
  });
});

describe("Project repository persistence", () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it("persists and rehydrates projects with QC defaults and exports", () => {
    const repo = new ProjectRepository("projects-key");
    const project = new Project({
      id: "p1",
      name: "QC Project",
      qcSettings: { traverseAngularTolerance: 1 },
      lastExportedAt: "2024-01-01T00:00:00.000Z",
    });

    repo.saveProjects({ p1: project });

    const loaded = new ProjectRepository("projects-key").loadProjects().p1;
    assert.ok(loaded instanceof Project);
    assert.equal(loaded.name, "QC Project");
    assert.equal(loaded.lastExportedAt, "2024-01-01T00:00:00.000Z");
    assert.equal(loaded.qcSettings.traverseAngularTolerance, 1);
    assert.equal(loaded.qcSettings.levelMisclosurePerDistance, 0.02);
  });

  it("returns an empty dataset when storage cannot be parsed", () => {
    localStorage.setItem("projects-key", "{invalid json");
    const repo = new ProjectRepository("projects-key");
    assert.deepEqual(repo.loadProjects(), {});
  });
});

describe("Corner evidence CP&F persistence", () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it("requires project id and retains CP&F metadata", () => {
    const service = new CornerEvidenceService("evidence-key");

    assert.throws(() => service.addEntry(new CornerEvidence({})), /projectId/);

    const entry = new CornerEvidence({
      id: "ev-1",
      projectId: "p1",
      pointLabel: "101",
      basisOfBearing: "Solar",
      monumentType: "Brass cap",
      recordingInfo: "Inst 5",
      ties: [{ description: "north 50" }],
    });

    service.addEntry(entry);

    const reloaded = new CornerEvidenceService("evidence-key");
    const stored = reloaded.getProjectEvidence("p1")[0];

    assert.ok(stored instanceof CornerEvidence);
    assert.equal(stored.pointLabel, "101");
    assert.equal(stored.basisOfBearing, "Solar");
    assert.equal(stored.monumentType, "Brass cap");
    assert.equal(stored.recordingInfo, "Inst 5");
    assert.equal(stored.ties[0].description, "north 50");
  });
});

describe("Versioning and sync deduplication", () => {
  it("prefers the most recently updated versioned object when merging", () => {
    const service = new VersioningService();
    const base = { version: 1, updatedAt: "2024-01-01T00:00:00Z", value: "old" };
    const incoming = {
      version: 1,
      updatedAt: "2024-02-01T00:00:00Z",
      value: "new",
    };

    const merged = service.mergeValues(base, incoming);
    assert.equal(merged.value, "new");
    assert.equal(merged.updatedAt, "2024-02-01T00:00:00Z");
    assert.equal(merged.version, 1);
  });

  it("deduplicates traverse calls by signature and promotes newest version", () => {
    const service = new VersioningService();
    const calls = [
      { bearing: "N0E", distance: 100, version: 1, updatedAt: "2024-01-01" },
      { bearing: "N0E", distance: 100, version: 2, updatedAt: "2024-01-02" },
    ];

    const deduped = service.dedupeCalls(calls);

    assert.equal(deduped.length, 1);
    assert.equal(deduped[0].version, 2);
    assert.equal(deduped[0].updatedAt, "2024-01-02");
  });

  it("ensures entities gain stable ids, timestamps, and versions", () => {
    const service = new VersioningService();
    const entity = {};
    service.ensureEntity(entity, { prefix: "record" });

    assert.ok(entity.id.startsWith("record-"));
    assert.ok(entity.createdAt);
    assert.ok(entity.updatedAt);
    assert.equal(entity.version, 1);

    const touched = service.touchEntity(entity, {
      prefix: "record",
      timestamp: "2024-02-01T00:00:00Z",
    });
    assert.equal(touched.version, 2);
    assert.equal(touched.updatedAt, "2024-02-01T00:00:00Z");
  });
});

describe("Export reminder warnings", () => {
  class ExportHarness extends ProjectsRecordsMixin(class {}) {}

  it("warns when no exports exist", () => {
    const mixin = new ExportHarness();
    const { warning, lastExport } = mixin.getExportAlert({});

    assert.equal(warning, "No export recorded. Export now to avoid data loss.");
    assert.equal(lastExport, null);
  });

  it("flags stale exports with unexported updates", () => {
    const mixin = new ExportHarness();
    const now = new Date();
    const lastExport = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const { warning } = mixin.getExportAlert({
      lastExportedAt: lastExport.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });

    assert.equal(
      warning,
      "Export is older than 7 days and changes have not been saved to an export."
    );
  });

  it("surfaces stale and recent change warnings based on export timestamps", () => {
    const mixin = new ExportHarness();
    const now = new Date();
    const recentExport = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const staleExport = new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000);

    const { warning: staleWarning } = mixin.getExportAlert({
      lastExportedAt: staleExport.toISOString(),
      updatedAt: staleExport.toISOString(),
    });

    assert.equal(staleWarning, "No export in the last 7 days. Create a backup.");

    const { warning: changeWarning } = mixin.getExportAlert({
      lastExportedAt: recentExport.toISOString(),
      updatedAt: now.toISOString(),
    });

    assert.equal(changeWarning, "Recent changes have not been exported yet.");
  });
});
