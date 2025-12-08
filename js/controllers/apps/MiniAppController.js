export default class MiniAppController {
  constructor({ id, section, onActivate } = {}) {
    this.id = id;
    this.section = section;
    this.onActivate = onActivate;
  }

  activate() {
    if (this.section) {
      this.section.classList.add("active");
      this.section.style.display = "block";
    }
    this.handleActivate();
  }

  deactivate() {
    if (this.section) {
      this.section.classList.remove("active");
      this.section.style.display = "none";
    }
  }

  handleActivate() {
    if (typeof this.onActivate === "function") {
      this.onActivate();
    }
  }
}
