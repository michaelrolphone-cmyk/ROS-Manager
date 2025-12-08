import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import ProjectRepository from "../js/services/ProjectRepository.js";
import GlobalSettingsService from "../js/services/GlobalSettingsService.js";
import VersioningService from "../js/services/VersioningService.js";
import CornerEvidenceService from "../js/services/CornerEvidenceService.js";
import SyncService from "../js/services/SyncService.js";
import AuditTrailService from "../js/services/AuditTrailService.js";
import Project from "../js/models/Project.js";
import SurveyRecord from "../js/models/SurveyRecord.js";
import TraverseInstruction from "../js/models/TraverseInstruction.js";
import Point from "../js/models/Point.js";
import PointFile from "../js/models/PointFile.js";
import EquipmentLog from "../js/models/EquipmentLog.js";
import NavigationBookmark from "../js/models/NavigationBookmark.js";
import LevelRun from "../js/models/LevelRun.js";
import CornerEvidence from "../js/models/CornerEvidence.js";
import EvidenceTie from "../js/models/EvidenceTie.js";

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

const sampleTraverseCalls = [
  new TraverseInstruction({
    distance: "154.32",
    bearing: "N89-15-10E",
    description: "Line to northeast corner",
  }),
  new TraverseInstruction({
    distance: "210.05",
    bearing: "S00-44-50E",
    description: "Back along section line",
  }),
];

const samplePoints = [
  new Point({
    pointNumber: "101",
    x: "1854320.55",
    y: "612345.21",
    elevation: "1125.4",
    code: "PK",
    description: "PK nail in centerline"
  }),
  new Point({
    pointNumber: "102",
    x: "1854475.18",
    y: "612499.87",
    elevation: "1126.1",
    code: "IPF",
    description: "Iron pin found at fence corner"
  }),
];

const makeProject = () =>
  new Project({
    id: "elk-ridge-boundary",
    name: "Elk Ridge Boundary",
    description: "Section corner retracement with topo shots",
    address: "NW 1/4, Section 12, Township 5N, Range 68W",
    clientName: "Frontier Ranch HOA",
    clientPhone: "970-555-2311",
    clientEmail: "field@frontier-ranch.example.com",
    townships: ["5N"],
    ranges: ["68W"],
    sections: ["12"],
    records: {
      start: new SurveyRecord({
        id: "start",
        name: "North section line",
        startPtNum: "101",
        northing: "612345.21",
        easting: "1854320.55",
        elevation: "1125.4",
        bsAzimuth: "359-59-40",
        basis: "Assumed", 
        firstDist: "154.32",
        calls: sampleTraverseCalls,
      }),
    },
    equipmentLogs: [
      new EquipmentLog({
        id: "base-setup",
        equipmentId: "GS18",
        equipmentName: "Leica GS18 T",
        teamMember: "Taylor Fielding",
        notes: "Base set 2.0m height with clear sky view",
      }),
    ],
    navigationBookmarks: [
      new NavigationBookmark({
        id: "trailhead",
        name: "Trailhead gate",
        targetId: "101",
        bearing: "145-32-10",
        distance: "1320.55",
      }),
    ],
    pointFiles: [
      new PointFile({
        name: "Control Points",
        points: samplePoints,
      }),
    ],
    levelRuns: [
      new LevelRun({
        id: "bm-loop",
        name: "BM loop",
        startPoint: "BM10",
        closingPoint: "BM10",
        entries: [
          { type: "BS", point: "BM10", reading: "1.215" },
          { type: "FS", point: "101", reading: "2.005" },
        ],
      }),
    ],
  });

describe("ProjectRepository", () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it("serializes and hydrates surveying projects with realistic traverse data", () => {
    const repository = new ProjectRepository("projects-under-test");
    const project = makeProject();

    repository.saveProjects({ [project.id]: project });
    const hydrated = repository.loadProjects();

    assert.ok(hydrated[project.id] instanceof Project);
    const storedRecord = hydrated[project.id].records.start;
    assert.equal(storedRecord.calls[0].distance, "154.32");
    assert.equal(storedRecord.startPtNum, "101");
    assert.equal(hydrated[project.id].pointFiles[0].points[1].description, "Iron pin found at fence corner");
  });

  it("gracefully handles browsers that block storage writes", () => {
    let attempts = 0;
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {
        attempts += 1;
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
      clear: () => {},
    };

    const repository = new ProjectRepository("projects-under-test");
    const project = makeProject();
    const saved = repository.saveProjects({ [project.id]: project });

    assert.equal(saved, false);
    assert.equal(attempts, 1);
  });
});

describe("GlobalSettingsService", () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it("returns default settings when storage is empty or corrupted", () => {
    const service = new GlobalSettingsService("settings-test");
    assert.deepEqual(service.load(), {
      equipment: [],
      teamMembers: [],
      pointCodes: [],
      deviceProfiles: {},
      liveLocations: {},
    });

    localStorage.setItem("settings-test", "not-json");
    assert.deepEqual(service.load(), {
      equipment: [],
      teamMembers: [],
      pointCodes: [],
      deviceProfiles: {},
      liveLocations: {},
    });
  });

  it("persists and retrieves field crew and equipment lists", () => {
    const service = new GlobalSettingsService("settings-test");
    const roster = {
      equipment: ["GS18", "TS16"],
      teamMembers: ["Alex", "Jordan"],
      pointCodes: ["CP", "TBM"],
    };
    service.save(roster);
    assert.deepEqual(JSON.parse(localStorage.getItem("settings-test")), roster);
    assert.deepEqual(service.load(), {
      ...roster,
      deviceProfiles: {},
      liveLocations: {},
    });
  });
});

describe("VersioningService", () => {
  it("stamps nested survey data with ids, versions, and timestamps", () => {
    const svc = new VersioningService();
    const project = makeProject();
    project.records.start.version = 3;

    const touched = svc.touchProjectTree(project.id, project);

    assert.ok(touched.id.startsWith("elk-ridge"));
    assert.equal(touched.records.start.version, 4);
    assert.ok(touched.records.start.updatedAt);
    assert.ok(touched.pointFiles[0].points[0].version >= 2);
  });

  it("deep merges versioned objects instead of replacing entire project trees", () => {
    const svc = new VersioningService();
    const stored = {
      "project-1": {
        id: "project-1",
        version: 5,
        updatedAt: "2024-06-01T00:00:00.000Z",
        name: "Stored Name",
        description: "Kept description",
        records: {
          a: {
            id: "a",
            version: 3,
            updatedAt: "2024-06-01T00:00:00.000Z",
            name: "Fresh record change",
          },
        },
      },
    };

    const incoming = {
      "project-1": {
        id: "project-1",
        version: 6,
        updatedAt: "2024-06-02T00:00:00.000Z",
        name: "Incoming Name",
        records: {},
      },
    };

    const merged = svc.mergeDataset(stored, incoming);

    assert.equal(merged["project-1"].version, 6);
    assert.equal(merged["project-1"].name, "Incoming Name");
    assert.equal(merged["project-1"].description, "Kept description");
    assert.ok(merged["project-1"].records.a);
    assert.equal(merged["project-1"].records.a.name, "Fresh record change");
  });
});

describe("AuditTrailService", () => {
  it("strips circular project references from audit bundles", async () => {
    const service = new AuditTrailService();
    const project = makeProject();

    const previousSnapshot = { hash: "abc123" };
    previousSnapshot.bundle = { project };
    project.auditTrail = [previousSnapshot];

    const snapshot = await service.createSnapshot(
      {
        project,
        evidence: {},
        research: {},
        globalSettings: {},
        exportMetadata: {},
      },
      { deviceId: "device-1", user: "Taylor" }
    );

    assert.doesNotThrow(() => JSON.stringify(snapshot.bundle));
    assert.deepEqual(snapshot.bundle.project.auditTrail, []);
  });
});

describe("CornerEvidenceService", () => {
  beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
  });

  it("stores evidence with traverse ties and reloads them for a project", () => {
    const ties = [
      new EvidenceTie({ distance: "12.5", bearing: "N45-10-00E", description: "To blazed ponderosa" }),
      new EvidenceTie({ distance: "18.2", bearing: "S10-22-30W", description: "To 3/4\" rebar" }),
    ];
    const entry = new CornerEvidence({
      projectId: "elk-ridge-boundary",
      recordId: "start",
      recordName: "North section line",
      pointIndex: 0,
      pointLabel: "101",
      coords: { x: 1854320.55, y: 612345.21 },
      type: "Brass cap",
      cornerType: "Section corner",
      cornerStatus: "Original monument found",
      condition: "Good",
      notes: "Monument matches deed call",
      ties,
    });

    const service = new CornerEvidenceService("evidence-test");
    service.addEntry(entry);

    const reloaded = new CornerEvidenceService("evidence-test").getProjectEvidence(
      "elk-ridge-boundary"
    );

    assert.equal(reloaded[0].ties[0].description, "To blazed ponderosa");
    assert.equal(reloaded[0].type, "Brass cap");
    assert.equal(reloaded[0].cornerType, "Section corner");
    assert.equal(reloaded[0].cornerStatus, "Original monument found");
    assert.equal(reloaded[0].pointLabel, "101");
  });
});

describe("SyncService", () => {
  beforeEach(() => {
    globalThis.fetchCalls = [];
  });

  it("posts survey payloads to the sync endpoint", async () => {
    globalThis.fetch = async (url, options) => {
      fetchCalls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return { received: true };
        },
      };
    };

    const svc = new SyncService({ baseUrl: "http://localhost:3000/api" });
    const payload = { projects: { [makeProject().id]: makeProject().toObject() } };
    const response = await svc.sync(payload);

    assert.deepEqual(response, { received: true });
    assert.equal(fetchCalls[0].url, "http://localhost:3000/api/sync");
    assert.equal(fetchCalls[0].options.method, "POST");
    assert.match(fetchCalls[0].options.body, /"elk-ridge-boundary"/);
  });
});
