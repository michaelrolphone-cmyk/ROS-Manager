import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import AppController from "../js/controllers/AppController.js";

const createDocumentStub = () => {
  const listeners = new Map();
  return {
    activeElement: null,
    addEventListener(event, handler) {
      listeners.set(event, handler);
    },
    removeEventListener(event, handler) {
      if (listeners.get(event) === handler) {
        listeners.delete(event);
      }
    },
    trigger(event) {
      listeners.get(event)?.();
    },
  };
};

describe("AppController save refresh scheduling", () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it("refreshes immediately when no input is focused", () => {
    const documentStub = createDocumentStub();
    globalThis.document = documentStub;

    const controller = Object.create(AppController.prototype);
    controller.pendingSaveRefresh = false;
    controller.pendingSaveRefreshHandler = null;
    let refreshCount = 0;
    controller.refreshSaveDependentViews = () => {
      refreshCount += 1;
    };

    controller.scheduleSaveDependentRefresh();

    assert.equal(refreshCount, 1);
    assert.equal(controller.pendingSaveRefresh, false);
    assert.equal(controller.pendingSaveRefreshHandler, null);
  });

  it("defers refresh until focus leaves input fields", () => {
    const documentStub = createDocumentStub();
    globalThis.document = documentStub;

    const controller = Object.create(AppController.prototype);
    controller.pendingSaveRefresh = false;
    controller.pendingSaveRefreshHandler = null;
    let refreshCount = 0;
    controller.refreshSaveDependentViews = () => {
      refreshCount += 1;
    };

    documentStub.activeElement = { tagName: "INPUT" };
    controller.scheduleSaveDependentRefresh();

    assert.equal(refreshCount, 0);
    assert.equal(controller.pendingSaveRefresh, true);

    documentStub.activeElement = { tagName: "INPUT" };
    documentStub.trigger("focusout");
    assert.equal(refreshCount, 0);

    documentStub.activeElement = null;
    documentStub.trigger("focusout");
    assert.equal(refreshCount, 1);
    assert.equal(controller.pendingSaveRefresh, false);
    assert.equal(controller.pendingSaveRefreshHandler, null);
  });
});
