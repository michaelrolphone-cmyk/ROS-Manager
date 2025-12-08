import MiniAppController from "./MiniAppController.js";

export default class SpringboardAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.onScroll = options.onScroll;
  }

  handleActivate() {
    super.handleActivate();
    if (typeof this.onScroll === "function") {
      this.onScroll();
    }
  }
}
