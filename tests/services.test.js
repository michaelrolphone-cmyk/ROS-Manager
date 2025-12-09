import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

import ProjectRepository from "../js/services/ProjectRepository.js";
import GlobalSettingsService from "../js/services/GlobalSettingsService.js";
import VersioningService from "../js/services/VersioningService.js";
import CornerEvidenceService from "../js/services/CornerEvidenceService.js";
import SyncService from "../js/services/SyncService.js";
import {
  buildMapboxStaticUrl,
  getMapboxToken,
  getMakiIconUrl,
} from "../js/services/MapboxService.js";
import AuditTrailService from "../js/services/AuditTrailService.js";
import ExportImportMixin from "../js/controllers/app/ExportImportMixin.js";
import { buildAnnotatedPhotoHtml } from "../js/services/PhotoAnnotationRenderer.js";
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
      backupSettings: {
        rollingBackupsEnabled: false,
        filenamePrefix: "carlson-backup",
        maxCopies: 3,
      },
    });

    localStorage.setItem("settings-test", "not-json");
    assert.deepEqual(service.load(), {
      equipment: [],
      teamMembers: [],
      pointCodes: [],
      deviceProfiles: {},
      liveLocations: {},
      backupSettings: {
        rollingBackupsEnabled: false,
        filenamePrefix: "carlson-backup",
        maxCopies: 3,
      },
    });
  });

  it("persists and retrieves field crew and equipment lists", () => {
    const service = new GlobalSettingsService("settings-test");
    const roster = {
      equipment: ["GS18", "TS16"],
      teamMembers: ["Alex", "Jordan"],
      pointCodes: [
        { code: "CP", description: "", kind: "point" },
        { code: "TBM", description: "", kind: "point" },
      ],
    };
    service.save(roster);
    assert.deepEqual(JSON.parse(localStorage.getItem("settings-test")), roster);
    assert.deepEqual(service.load(), {
      ...roster,
      deviceProfiles: {},
      liveLocations: {},
      backupSettings: {
        rollingBackupsEnabled: false,
        filenamePrefix: "carlson-backup",
        maxCopies: 3,
      },
    });
  });

  it("limits live location telemetry and drops noisy activity buffers", () => {
    const service = new GlobalSettingsService("settings-test");
    const now = Date.now();
    const liveLocations = {};

    for (let i = 0; i < 60; i += 1) {
      liveLocations[`dev-${i}`] = {
        lat: 43 + i,
        lon: -116 - i,
        accuracy: 3.2,
        updatedAt: new Date(now - i * 60 * 1000).toISOString(),
      };
    }

    liveLocations.stale = {
      lat: 42.0,
      lon: -115.0,
      accuracy: 5,
      updatedAt: new Date(now - 48 * 60 * 60 * 1000).toISOString(),
    };

    service.save({
      liveLocations,
      equipment: [],
      activityBuffer: Array.from({ length: 200 }, (_, idx) => ({ ts: idx })),
    });

    const stored = JSON.parse(localStorage.getItem("settings-test"));
    assert.equal(Object.keys(stored.liveLocations).length, 50);
    assert.ok(!stored.liveLocations.stale);
    assert.ok(!("activityBuffer" in stored));

    const hydrated = service.load();
    assert.equal(Object.keys(hydrated.liveLocations).length, 50);
    assert.ok(!hydrated.liveLocations.stale);
    assert.ok(hydrated.liveLocations["dev-0"]);
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

  it("normalizes base urls and surfaces HTTP errors", async () => {
    const responses = [
      { ok: false, status: 503 },
      { ok: true, status: 200, async json() {} },
    ];

    globalThis.fetch = async (url) => {
      fetchCalls.push(url);
      return responses.shift();
    };

    const svc = new SyncService({ baseUrl: "https://sync.example.com/api/" });
    assert.equal(svc.getStreamUrl(), "https://sync.example.com/api/stream");

    await assert.rejects(() => svc.sync({}), /503/);
  });
});

describe("MapboxService", () => {
  it("builds static map URLs with clamped dimensions", () => {
    const url = buildMapboxStaticUrl(43.615, -116.2023, {
      zoom: 12,
      width: 2000,
      height: 5,
      markerColor: "ff0000",
    });

    assert.ok(url.includes("43.615000"));
    assert.ok(url.includes("-116.202300"));
    assert.ok(url.includes("1280x5"));
    assert.ok(url.includes(getMapboxToken()));
  });

  it("defaults static map zoom to 19", () => {
    const url = buildMapboxStaticUrl(40.7128, -74.006);

    assert.ok(url.includes(",19/"));
    assert.ok(url.includes("800x600"));
  });

  it("includes multiple overlays when markers are provided", () => {
    const url = buildMapboxStaticUrl(40.1, -75.2, {
      centerMarker: false,
      markers: [
        { lat: 40.1, lon: -75.21, symbol: "triangle", color: "ff8800", size: "m" },
        { lat: 40.2, lon: -75.22, iconUrl: getMakiIconUrl("post-jp"), size: "m" },
      ],
    });

    assert.ok(url.includes("pin-m-triangle+ff8800(-75.210000,40.100000)"));
    assert.ok(url.includes(encodeURIComponent("post-jp")));
  });

  it("returns null when coordinates are invalid", () => {
    assert.equal(buildMapboxStaticUrl(null, -116.2), null);
    assert.equal(buildMapboxStaticUrl(43.6, "bad"), null);
  });
});

describe("PhotoAnnotationRenderer", () => {
  it("embeds overlays and metadata", () => {
    const html = buildAnnotatedPhotoHtml({
      photo: "data:image/png;base64,abc",
      annotations: [
        { type: "arrow", x1: 0.1, y1: 0.2, x2: 0.3, y2: 0.4 },
        { type: "circle", x: 0.5, y: 0.5, radius: 0.1 },
        { type: "text", x: 0.7, y: 0.7, text: "Corner" },
      ],
      metadata: {
        capturedAt: "2024-01-01T00:00:00.000Z",
        trs: "T1N R1E",
        pointLabel: "101",
      },
      maxWidth: "320px",
    });

    assert.ok(html.includes("annotation-overlay"));
    assert.ok(html.includes("polygon"));
    assert.ok(html.includes("circle"));
    assert.ok(html.includes("Corner"));
    assert.ok(html.includes("Captured"));
    assert.ok(html.includes("T1N R1E"));
    assert.ok(html.includes("Point: 101"));
  });
});

describe("ExportImportMixin level integration", () => {
  class ExportHarness extends ExportImportMixin(class {}) {
    constructor() {
      super();
      this.currentProjectId = "proj-1";
      this.projects = {
        "proj-1": new Project({
          id: "proj-1",
          name: "Level QA",
          levelRuns: [new LevelRun({ id: "lvl-1", name: "Benchmark loop" })],
        }),
      };
      this.cornerEvidenceService = {
        serializeEvidenceForProject: () => [],
        getProjectEvidence: () => [],
        serializeAllEvidence: () => ({}),
      };
      this.researchDocumentService = {
        serializeProject: () => [],
        getProjectDocuments: () => [],
        serializeAll: () => ({}),
      };
      this.auditTrailService = {
        async createSnapshot(payload) {
          this.lastPayload = payload;
          return { id: "snap-1", bundle: payload };
        },
      };
      this.globalSettings = {};
      this.deviceId = "device-1";
    }

    getCurrentProject() {
      return this.projects[this.currentProjectId];
    }

    getCurrentProjectId() {
      return this.currentProjectId;
    }

    getCurrentDeviceProfile() {
      return { teamMember: "Casey" };
    }

    getProjectEvidence() {
      return [];
    }

    computeQualityResults() {
      return {
        traverses: [],
        levels: [
          {
            id: "lvl-1",
            name: "Benchmark loop",
            misclosure: 0.05,
            allowed: 0.1,
            status: "pass",
            message: "Passes tolerance",
          },
        ],
      };
    }

    buildQualityControlSummaryData() {
      return {
        results: this.computeQualityResults(),
        settings: {},
      };
    }

    buildEvidenceTrs() {
      return "";
    }

    formatRatio() {
      return "1:5000";
    }

    formatLevelNumber(value) {
      return Number.isFinite(value) ? value.toFixed(3) : "—";
    }

    formatDegrees() {
      return "0-00-00";
    }

    getProfessionalProfile() {
      return {};
    }

    escapeHtml(value) {
      return String(value ?? "");
    }

    renderSmartPackStatus() {}

    downloadHtml() {}

    setAuditStatus() {}

    renderAuditTrail() {}

    saveProjects() {}
  }

  it("includes level loop results in Smart Pack and audit snapshots", async () => {
    const harness = new ExportHarness();
    const bundle = harness.buildSmartPackBundle();

    assert.equal(bundle.levels[0].name, "Benchmark loop");
    assert.equal(bundle.levels[0].misclosure, 0.05);
    assert.equal(bundle.levelRuns.length, 1);

    await harness.createAuditSnapshot();

    assert.ok(harness.auditTrailService.lastPayload.qcLevels);
    assert.equal(harness.auditTrailService.lastPayload.qcLevels[0].name, "Benchmark loop");
  });
});
