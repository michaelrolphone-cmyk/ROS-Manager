import { describe, it } from "node:test";
import assert from "node:assert/strict";

import CallsBearingsMixin from "../js/controllers/app/CallsBearingsMixin.js";
import ProjectsRecordsMixin from "../js/controllers/app/ProjectsRecordsMixin.js";
import Project from "../js/models/Project.js";
import SurveyRecord from "../js/models/SurveyRecord.js";

class QcHarness extends ProjectsRecordsMixin(CallsBearingsMixin(class {})) {
  constructor() {
    super();
    this.projects = {};
    this.currentProjectId = null;
    this.traverseGeometries = {};
    this.defaultQcSettings = {
      traverseAngularTolerance: 0.25,
      traverseLinearTolerance: 0.0002,
      levelMisclosurePerDistance: 0.02,
    };
  }

  computeTraversePointsForRecord(_projectId, recordId) {
    return this.traverseGeometries[recordId] || { polylines: [] };
  }

  setTraverseGeometry(recordId, geometry) {
    this.traverseGeometries[recordId] = geometry;
  }
}

describe("Traverse QC closure", () => {
  it("treats a closed square traverse as passing despite perpendicular final bearing", () => {
    const harness = new QcHarness();
    const traverseId = "trv-closed";

    const project = new Project({
      id: "proj-closed",
      name: "Closed Traverse",
      qcSettings: {
        traverseAngularTolerance: 1,
        traverseLinearTolerance: 0.0002,
        levelMisclosurePerDistance: 0.02,
      },
      records: {
        [traverseId]: new SurveyRecord({
          id: traverseId,
          name: "Square Loop",
          closurePointNumber: 1,
        }),
      },
    });

    harness.projects[project.id] = project;
    harness.currentProjectId = project.id;
    harness.setTraverseGeometry(traverseId, {
      polylines: [
        [
          { x: 0, y: 0, pointNumber: 1 },
          { x: 100, y: 0, pointNumber: 2 },
          { x: 100, y: 100, pointNumber: 3 },
          { x: 0, y: 100, pointNumber: 4 },
          { x: 0, y: 0, pointNumber: 5 },
        ],
      ],
    });

    const qcResults = harness.computeQualityResults(project.id);
    const traverseResult = qcResults.traverses[0];

    assert.equal(traverseResult.status, "pass");
    assert.equal(traverseResult.linearMisclosure, 0);
    assert.equal(traverseResult.angularMisclosure, 0);
  });
});
