import MiniAppController from "./MiniAppController.js";

export default class ResearchAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.refreshResearch = options.refreshResearch;
  }

  handleActivate() {
    super.handleActivate();
    if (typeof this.refreshResearch === "function") {
      this.refreshResearch();
    }
  }
}
