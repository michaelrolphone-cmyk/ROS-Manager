import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  aliquotToCode,
  buildAliquotCodes,
  buildSurveyIndexNumber,
  normalizeBookOrPage,
  normalizeTrsComponent,
} from "../js/services/SurveyIndexService.js";

describe("SurveyIndexService", () => {
  it("normalizes TRS values with optional left padding", () => {
    assert.equal(normalizeTrsComponent("T3N", 0), "3");
    assert.equal(normalizeTrsComponent("Sec 7"), "07");
  });

  it("maps aliquot labels to survey index codes", () => {
    assert.equal(aliquotToCode("NE"), "1");
    assert.equal(aliquotToCode("sw"), "3");
    assert.equal(aliquotToCode("unknown"), "0");
  });

  it("builds three-digit aliquot code groups", () => {
    assert.equal(buildAliquotCodes(["NE", "NW", "SE", "SW"]), "142");
    assert.equal(buildAliquotCodes(["SW"]), "300");
  });

  it("builds a survey index with mixed formatted input", () => {
    const index = buildSurveyIndexNumber({
      townships: ["T4N"],
      ranges: ["R2E"],
      sections: ["Section 7"],
      sectionQuadrant: "SW",
      aliquots: ["NE", "NW"],
      platBook: "Book 12",
      platPageStart: "Page 5",
      platPageEnd: "7A",
    });

    assert.equal(index, "423-07-140-12-5-7");
  });

  it("returns defaults for missing data and strips non-digits", () => {
    assert.equal(normalizeBookOrPage("Pg. 10B"), "10");
    assert.equal(buildSurveyIndexNumber({}), "000-00-000-0-0");
    assert.equal(buildSurveyIndexNumber(null), "");
  });
});
