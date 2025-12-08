import MiniAppController from "./MiniAppController.js";

export default class EquipmentAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.refreshEquipment = options.refreshEquipment;
  }

  handleActivate() {
    super.handleActivate();
    if (typeof this.refreshEquipment === "function") {
      this.refreshEquipment();
    }
  }
}
