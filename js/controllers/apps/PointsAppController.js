import MiniAppController from "./MiniAppController.js";

export default class PointsAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.pointController = options.pointController;
  }

  handleActivate() {
    super.handleActivate();
    this.pointController?.renderPointsTable();
  }
}
