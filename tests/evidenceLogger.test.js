import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import EvidenceLoggerMixin from "../js/controllers/app/EvidenceLoggerMixin.js";

class Element {
  constructor() {
    this.children = [];
    this.dataset = {};
    this.classList = { toggle() {} };
    this.textContent = "";
    this.value = "";
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
  }

  append(...items) {
    items.forEach((item) => this.appendChild(item));
  }

  addEventListener() {}

  set innerHTML(value) {
    this._innerHTML = value;
    this.children = [];
  }

  get innerHTML() {
    return this._innerHTML || "";
  }
}

class DocumentStub {
  createElement() {
    return new Element();
  }
}

class EvidenceHarness extends EvidenceLoggerMixin(class {}) {
  constructor() {
    super();
    this.projects = {};
    this.elements = {};
    this.currentProjectId = "p1";
  }

  computeTraversePointsForRecord() {
    return {
      points: [
        { x: 100.123, y: 200.456, pointNumber: 3 },
        { x: 99.1, y: 201.9 },
      ],
    };
  }
}

describe("EvidenceLoggerMixin traverse options", () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = globalThis.document;
    globalThis.document = new DocumentStub();
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it("derives traverse point dropdown options with record start numbers", () => {
    const harness = new EvidenceHarness();
    harness.projects.p1 = { records: { r1: { startPtNum: "5" } } };

    const options = harness.getTraversePointOptions("r1");

    assert.equal(options.length, 2);
    assert.equal(options[0].label, "P5 (99.10, 201.90)");
    assert.equal(options[1].label, "P3 (100.12, 200.46)");
  });

  it("returns no traverse points when record context is missing", () => {
    const harness = new EvidenceHarness();
    harness.projects.p1 = { records: {} };

    assert.deepEqual(harness.getTraversePointOptions("missing"), []);
    harness.currentProjectId = null;
    assert.deepEqual(harness.getTraversePointOptions("r1"), []);
  });
});

describe("Evidence TRS formatting and titles", () => {
  it("builds TRS strings with additional associations", () => {
    const harness = new EvidenceHarness();
    const title = harness.buildEvidenceTrs({
      township: "T1N",
      range: "R1E",
      section: "12",
      sectionBreakdown: "NW",
      associatedTrs: [{ township: "T2N", range: "R2E" }],
    });

    assert.equal(title, "T1N R1E Sec 12 NW (Also: T2N R2E)");
  });

  it("generates evidence titles from TRS or point labels", () => {
    const harness = new EvidenceHarness();

    const trsTitle = harness.buildEvidenceTitle({
      township: "T5N",
      range: "R2E",
      section: "12",
      sectionBreakdown: "NE",
    });

    const fallbackTitle = harness.buildEvidenceTitle({ pointLabel: "102" });

    assert.equal(trsTitle, "Corner Evidence – T5N R2E Sec 12 NE");
    assert.equal(fallbackTitle, "102");
  });
});
