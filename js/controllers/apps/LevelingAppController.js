import MiniAppController from "./MiniAppController.js";

export default class LevelingAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.levelingController = options.levelingController;
  }

  handleActivate() {
    super.handleActivate();
    this.levelingController?.renderLevelRuns();
  }
}
