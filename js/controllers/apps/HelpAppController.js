import MiniAppController from "./MiniAppController.js";

export default class HelpAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.loadHelp = options.loadHelp;
  }

  handleActivate() {
    super.handleActivate();
    if (typeof this.loadHelp === "function") {
      this.loadHelp();
    }
  }
}
