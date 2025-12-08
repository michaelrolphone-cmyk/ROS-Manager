import MiniAppController from "./MiniAppController.js";

export default class EvidenceAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.refreshEvidence = options.refreshEvidence;
  }

  handleActivate() {
    super.handleActivate();
    if (typeof this.refreshEvidence === "function") {
      this.refreshEvidence();
    }
  }
}
