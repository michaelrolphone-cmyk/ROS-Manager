import MiniAppController from "./MiniAppController.js";

export default class ChainEvidenceAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.refreshChainEvidence = options.refreshChainEvidence;
  }

  handleActivate() {
    super.handleActivate();
    if (typeof this.refreshChainEvidence === "function") {
      this.refreshChainEvidence();
    }
  }
}
