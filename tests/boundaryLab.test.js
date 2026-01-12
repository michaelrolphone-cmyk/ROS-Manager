import { describe, it } from "node:test";
import assert from "node:assert/strict";

import BoundaryLabAppController from "../js/controllers/apps/BoundaryLabAppController.js";

const makeController = () =>
  new BoundaryLabAppController({
    elements: {},
    getProjects: () => ({}),
    getCurrentProjectId: () => null,
    getCurrentRecordId: () => null,
    computeTraversePointsForRecord: () => null,
    fitCanvasToDisplaySize: () => {},
    escapeHtml: (text) => text ?? "",
    saveProjects: () => {},
    loadRecord: () => {},
  });

const assertPoint = (actual, expected, message) => {
  assert.ok(
    Math.abs(actual.x - expected.x) < 1e-6 &&
      Math.abs(actual.y - expected.y) < 1e-6,
    message
  );
};

describe("BoundaryLabAppController.applyOffset", () => {
  it("creates a closed inset offset for a closed square", () => {
    const controller = makeController();
    const square = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ];

    const result = controller.applyOffset(square, 1, 1);

    assert.equal(result.length, 5);
    assertPoint(result[0], result[result.length - 1], "offset should be closed");
    assertPoint(result[0], { x: 9, y: 1 }, "first corner should be inset");
    assertPoint(result[1], { x: 9, y: 9 }, "second corner should be inset");
    assertPoint(result[2], { x: 1, y: 9 }, "third corner should be inset");
    assertPoint(result[3], { x: 1, y: 1 }, "fourth corner should be inset");
  });
});
