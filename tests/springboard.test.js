import { describe, it } from "node:test";
import assert from "node:assert/strict";

import TraverseGeometryMixin from "../js/controllers/app/TraverseGeometryMixin.js";
import ProjectsRecordsMixin from "../js/controllers/app/ProjectsRecordsMixin.js";

class StubContext {
  constructor() {
    this.operations = [];
  }
  clearRect() {
    this.operations.push("clear");
  }
  beginPath() {
    this.operations.push("begin");
  }
  moveTo() {}
  lineTo() {}
  stroke() {
    this.operations.push("stroke");
  }
  arc() {
    this.operations.push("arc");
  }
  fill() {
    this.operations.push("fill");
  }
}

class StubCanvas {
  constructor() {
    this.width = 0;
    this.height = 0;
    this._ctx = new StubContext();
  }

  getContext() {
    return this._ctx;
  }
}

class GeometryHarness extends TraverseGeometryMixin(class {}) {
  constructor() {
    super();
    this.projects = {};
  }

  fitCanvasToDisplaySize(canvas) {
    canvas.width = 200;
    canvas.height = 120;
  }

  computeTraversePointsForRecord(projectId, recordId) {
    if (projectId !== "proj-1" || recordId !== "rec-1") {
      return { points: [], polylines: [] };
    }

    return {
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
      ],
      polylines: [[{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }]],
    };
  }
}

class StubClassList {
  constructor() {
    this.items = new Set();
  }
  add(name) {
    this.items.add(name);
  }
  remove(name) {
    this.items.delete(name);
  }
  toggle(name, force) {
    if (force === undefined) {
      this.items.has(name) ? this.items.delete(name) : this.items.add(name);
      return;
    }
    force ? this.items.add(name) : this.items.delete(name);
  }
  contains(name) {
    return this.items.has(name);
  }
}

class StubElement {
  constructor() {
    this.textContent = "";
    this.classList = new StubClassList();
  }
}

class StubLink extends StubElement {
  setAttribute(name, value) {
    this[name] = value;
  }
  removeAttribute(name) {
    delete this[name];
  }
}

class StubImage extends StubElement {
  constructor() {
    super();
    this.src = "";
  }
}

class VicinityHarness extends ProjectsRecordsMixin(class {}) {
  constructor() {
    super();
    const placeholder = new StubElement();
    const frame = new StubElement();
    placeholder.parentElement = frame;

    this.elements = {
      vicinityMapImage: new StubImage(),
      vicinityMapPlaceholder: placeholder,
      vicinityMapStatus: new StubElement(),
      vicinityMapAddress: new StubElement(),
      vicinityMapLink: new StubLink(),
    };

    this.geocodeCache = {};
  }

  async resolveAddressToMap(address) {
    this.lastResolvedAddress = address;
    return `https://example.com/map/${encodeURIComponent(address)}`;
  }
}

class IndexHarness extends ProjectsRecordsMixin(class {}) {}

describe("Springboard composite thumbnail", () => {
  it("draws composite geometry when a project has traverse polylines", () => {
    const harness = new GeometryHarness();
    const canvas = new StubCanvas();

    harness.projects["proj-1"] = { records: { "rec-1": {} } };

    const rendered = harness.drawProjectCompositeOnCanvas("proj-1", canvas, true);

    assert.equal(rendered, true);
    assert.ok(canvas._ctx.operations.includes("stroke"));
  });

  it("does not render when no project data is available", () => {
    const harness = new GeometryHarness();
    const canvas = new StubCanvas();

    const rendered = harness.drawProjectCompositeOnCanvas(null, canvas, true);

    assert.equal(rendered, false);
    assert.ok(canvas._ctx.operations.includes("clear"));
  });
});

describe("Vicinity map app", () => { 
  it("shows address guidance when no address is configured", async () => {
    const harness = new VicinityHarness();

    await harness.updateVicinityMap({ address: "" });

    assert.equal(harness.elements.vicinityMapAddress.textContent, "—");
    assert.equal(
      harness.elements.vicinityMapStatus.textContent,
      "Add an address in Project Details to see a map preview."
    );
    assert.equal(harness.elements.vicinityMapLink["aria-disabled"], "true");
  });

  it("renders a static preview when an address is available", async () => {
    const harness = new VicinityHarness();

    await harness.updateVicinityMap({ address: "123 Main St" });

    assert.equal(harness.lastResolvedAddress, "123 Main St");
    assert.equal(
      harness.elements.vicinityMapImage.src,
      "https://example.com/map/123%20Main%20St"
    );
    assert.ok(
      harness.elements.vicinityMapPlaceholder.parentElement.classList.contains(
        "has-map"
      )
    );
    assert.equal(
      harness.elements.vicinityMapStatus.textContent,
      "Static vicinity map preview ready."
    );
    assert.equal(
      harness.elements.vicinityMapLink.href,
      "https://www.google.com/maps/search/?api=1&query=123%20Main%20St"
    );
  });
});

describe("Project index number", () => {
  it("omits padding for township and range digits", () => {
    const harness = new IndexHarness();

    const index = harness.buildProjectIndexNumber({
      townships: ["T3N"],
      ranges: ["R2E"],
      sections: ["10"],
      sectionQuadrant: "SW",
      aliquots: [],
      platBook: "5",
      platPageStart: "12",
    });

    assert.equal(index, "323-10-000-5-12");
  });

  it("fills zeros when details are missing", () => {
    const harness = new IndexHarness();

    const index = harness.buildProjectIndexNumber({});

    assert.equal(index, "000-00-000-0-0");
  });

  it("blends provided parts with zero placeholders", () => {
    const harness = new IndexHarness();

    const index = harness.buildProjectIndexNumber({
      townships: ["T4N"],
      sections: ["7"],
      platPageStart: "3",
      platPageEnd: "9",
    });

    assert.equal(index, "400-07-000-0-3-9");
  });
});
