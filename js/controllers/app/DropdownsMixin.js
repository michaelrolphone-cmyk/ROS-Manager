const DropdownsMixin = (Base) =>
  class extends Base {
  /* ===================== Dropdowns ===================== */
  toggleEvidenceRecordDropdown() {
    this.elements.evidenceRecordDropdownContainer?.classList.toggle("open");
  }

  closeEvidenceRecordDropdown() {
    this.elements.evidenceRecordDropdownContainer?.classList.remove("open");
  }

  syncEvidenceRecordDropdownSelection() {
    const select = this.elements.evidenceRecordSelect;
    const menu = this.elements.evidenceRecordDropdownMenu;
    const label = this.elements.evidenceRecordDropdownLabel;
    if (label && select) {
      const selectedOpt = select.options[select.selectedIndex];
      label.textContent = selectedOpt?.textContent || "Select a record";
    }
    if (menu && select) {
      const currentId = select.value;
      menu.querySelectorAll(".start-option").forEach((node) => {
        if (node.dataset.recordId === currentId) node.classList.add("active");
        else node.classList.remove("active");
      });
    }
  }

  handleEvidenceRecordChange() {
    this.refreshEvidencePointOptions();
    this.updateEvidenceSaveState();
    this.syncEvidenceRecordDropdownSelection();
  }

  toggleProjectDropdown() {
    this.elements.projectDropdownContainer.classList.toggle("open");
    this.updateProjectList();
  }

  closeProjectDropdown() {
    this.elements.projectDropdownContainer.classList.remove("open");
  }

  updateProjectList() {
    const select = this.elements.projectSelect;
    const dropdownMenu = this.elements.projectDropdownMenu;
    if (!select || !dropdownMenu) return;

    select.innerHTML = "";
    dropdownMenu.innerHTML = "";

    Object.entries(this.projects).forEach(([id, proj]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = proj.name;
      if (id === this.currentProjectId) opt.selected = true;
      select.appendChild(opt);

      const option = document.createElement("div");
      option.className = "project-option";

      const nameSpan = document.createElement("span");
      nameSpan.className = "project-option-name";
      nameSpan.textContent = proj.name;

      const canvasWrapper = document.createElement("div");
      canvasWrapper.className = "project-option-canvas";
      const projCanvas = document.createElement("canvas");
      projCanvas.width = 80;
      projCanvas.height = 40;
      canvasWrapper.appendChild(projCanvas);

      option.appendChild(nameSpan);
      option.appendChild(canvasWrapper);

      option.addEventListener("click", () => {
        this.loadProject(id);
        this.closeProjectDropdown();
      });

      dropdownMenu.appendChild(option);

      try {
        this.drawProjectCompositeOnCanvas(id, projCanvas, true);
      } catch (e) {
        // ignore
      }
    });

    const selected = this.currentProjectId
      ? this.projects[this.currentProjectId]?.name
      : "No project";
    if (this.elements.projectDropdownLabel) {
      this.elements.projectDropdownLabel.textContent = selected || "No project";
    }
  }

  toggleStartFromDropdown() {
    this.elements.startFromDropdownContainer.classList.toggle("open");
    this.updateStartFromDropdownUI();
  }

  closeStartFromDropdown() {
    this.elements.startFromDropdownContainer.classList.remove("open");
  }

  updateStartFromDropdownUI() {
    const menu = this.elements.startFromDropdownMenu;
    if (!menu) return;
    menu.innerHTML = "";
    if (!this.currentProjectId) return;

    const records = this.projects[this.currentProjectId].records || {};
    const recordIds = Object.keys(records);
    if (recordIds.length === 0) return;

    const noneOpt = document.createElement("div");
    noneOpt.className = "start-option";
    noneOpt.innerHTML = '<span class="start-option-name">Manual Start</span>';
    noneOpt.addEventListener("click", () => {
      this.setStartFromRecord(null);
      this.closeStartFromDropdown();
    });
    menu.appendChild(noneOpt);

    recordIds.forEach((rid) => {
      if (rid === this.currentRecordId) return;
      const record = records[rid];
      const opt = document.createElement("div");
      opt.className = "start-option";
      const name = document.createElement("span");
      name.className = "start-option-name";
      name.textContent = record.name;
      const canvasWrapper = document.createElement("div");
      canvasWrapper.className = "start-option-canvas";
      const canvas = document.createElement("canvas");
      canvas.width = 50;
      canvas.height = 50;
      canvasWrapper.appendChild(canvas);
      opt.append(name, canvasWrapper);

      opt.addEventListener("click", () => {
        this.setStartFromRecord(rid);
        this.closeStartFromDropdown();
      });

      menu.appendChild(opt);

      try {
        const pts = this.computeTraversePointsForRecord(
          this.currentProjectId,
          rid
        );
        this.drawTraversePreview(canvas, pts);
      } catch (e) {
        // ignore
      }
    });

    const record = this.currentRecordId
      ? this.projects[this.currentProjectId].records[this.currentRecordId]
      : null;
    const label = record?.startFromRecordId
      ? records[record.startFromRecordId]?.name || "Linked Start"
      : "Manual Start";
    if (this.elements.startFromDropdownLabel) {
      this.elements.startFromDropdownLabel.textContent = label;
    }
  }

  setStartFromRecord(recordId) {
    if (!this.currentRecordId) return;
    const record =
      this.projects[this.currentProjectId].records[this.currentRecordId];
    record.startFromRecordId = recordId;
    this.saveProjects();
    this.updateStartFromDropdownUI();
    this.generateCommands();
  }
  };

export default DropdownsMixin;
