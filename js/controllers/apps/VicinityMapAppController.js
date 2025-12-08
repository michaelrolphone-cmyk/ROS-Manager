import MiniAppController from "./MiniAppController.js";

export default class VicinityMapAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.refreshMap = options.refreshMap;
  }

  handleActivate() {
    super.handleActivate();
    if (typeof this.refreshMap === "function") {
      this.refreshMap();
    }
  }
}
