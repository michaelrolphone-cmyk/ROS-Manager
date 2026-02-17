import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeFourierSlice,
  holomorphicSpectrumSample,
  toDomainValue,
} from "../js/demos/holomorphicSpectrum.js";

describe("holomorphic spectrum helpers", () => {
  it("maps domain indices into [-1, 1]", () => {
    assert.equal(toDomainValue(0, 5), -1);
    assert.equal(toDomainValue(4, 5), 1);
    assert.equal(toDomainValue(2, 5), 0);
  });

  it("produces a bounded holomorphic sample envelope", () => {
    const near = holomorphicSpectrumSample({
      x1: 0.2,
      x2: -0.1,
      x3: 0.15,
      x4: -0.05,
      x5: 0.1,
    });
    const far = holomorphicSpectrumSample({
      x1: 1,
      x2: 1,
      x3: 1,
      x4: 1,
      x5: 1,
    });

    const originMagnitude = Math.hypot(near.re, near.im);
    const farMagnitude = Math.hypot(far.re, far.im);
    assert.ok(originMagnitude > farMagnitude);
    assert.ok(originMagnitude > 0);
  });

  it("computes normalized Fourier slices", () => {
    const { values, min, max } = computeFourierSlice({
      resolution: 6,
      sampleCount: 4,
      slice: { k3: 2, k4: 1, k5: 3 },
    });
    assert.equal(values.length, 36);
    values.forEach((value) => {
      assert.ok(value >= 0 && value <= 1);
    });
    assert.ok(min <= max);
  });
});
