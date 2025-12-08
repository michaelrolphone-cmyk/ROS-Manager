import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import NavigationController from "../js/controllers/NavigationController.js";

class StubNavigationController extends NavigationController {
  constructor(options) {
    super({
      ...options,
      onTargetChanged: () => {},
      getDeviceId: () => "dev-1",
      getPeerLocations: () => [],
      onLocationUpdate: () => {},
    });
  }

  bindEvents() {}
  startListeners() {}
  prepareSelectors() {}
  setStatus(message) {
    this.lastStatus = message;
  }
}

const createContainer = () => ({
  innerHTML: "",
  textContent: "",
  children: [],
  appendChild(node) {
    this.children.push(node);
  },
});

const createDocumentStub = () => ({
  createElement(tag) {
    return {
      tagName: tag,
      className: "",
      textContent: "",
      children: [],
      appendChild(child) {
        this.children.push(child);
      },
    };
  },
});

describe("Navigation app nearest points", () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = globalThis.document;
    globalThis.document = createDocumentStub();
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it("indicates GPS wait state when no current position is available", () => {
    const nearestPointsList = createContainer();
    const controller = new StubNavigationController({
      elements: { nearestPointsList },
      getCurrentProject: () => ({})
    });

    controller.renderNearestPoints();

    assert.equal(nearestPointsList.textContent, "Waiting for GPS fix…");
    assert.equal(nearestPointsList.children.length, 0);
  });

  it("renders the nearest five localization points and bookmarks", () => {
    const nearestPointsList = createContainer();
    const controller = new StubNavigationController({
      elements: { nearestPointsList },
      getCurrentProject: () => ({
        localization: {
          points: [
            { id: "p1", label: "Loc-1", lat: 0, lon: 0.00001 },
            { id: "p2", label: "Loc-2", lat: 0, lon: 0.00002 },
            { id: "p3", label: "Loc-3", lat: 0, lon: 0.00003 },
          ],
        },
        navigationBookmarks: [
          {
            id: "b1",
            name: "Bookmark 1",
            latitude: 0,
            longitude: 0.00004,
            recordedAt: new Date().toISOString(),
          },
          {
            id: "b2",
            name: "Bookmark 2",
            latitude: 0,
            longitude: 0.00005,
            recordedAt: new Date().toISOString(),
          },
          {
            id: "b3",
            name: "Far Bookmark",
            latitude: 0,
            longitude: 0.00006,
            recordedAt: new Date().toISOString(),
          },
        ],
      }),
    });
    controller.currentPosition = { lat: 0, lon: 0 };

    controller.renderNearestPoints();

    assert.equal(nearestPointsList.children.length, 5);
    const labels = nearestPointsList.children.map((row) => row.children?.[0]?.textContent);
    assert.ok(labels.includes("Loc-1"));
    assert.ok(labels.includes("Bookmark 2"));
    assert.ok(!labels.includes("Far Bookmark"));
  });
});
