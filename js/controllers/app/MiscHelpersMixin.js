const MiscHelpersMixin = (Base) =>
  class extends Base {
    /* ===================== Misc helpers ===================== */
    serializeProjects() {
      const obj = {};
      Object.entries(this.projects).forEach(([id, proj]) => {
        obj[id] = proj.toObject();
      });
      return obj;
    }

    handleCommandGrid(evt) {
      const target = evt.target;
      const card = target.closest(".command-card");
      if (!card) return;
      const group = card.dataset.group;
      if (target.tagName === "BUTTON") {
        evt.stopPropagation();
        this.copyGroup(group);
        return;
      }
      this.toggleExpand(group);
    }
  };

export default MiscHelpersMixin;
