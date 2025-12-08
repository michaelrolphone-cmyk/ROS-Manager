import MiniAppController from "./MiniAppController.js";

export default class TraverseAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.getProjects = options.getProjects;
    this.getCurrentProjectId = options.getCurrentProjectId;
    this.getCurrentRecordId = options.getCurrentRecordId;
    this.computeTraversePointsForRecord =
      options.computeTraversePointsForRecord;
    this.drawTraversePreview = options.drawTraversePreview;
    this.drawProjectOverview = options.drawProjectOverview;
    this.populatePointGenerationOptions = options.populatePointGenerationOptions;
    this.loadRecord = options.loadRecord;
    this.buildStatusChip = options.buildStatusChip;
  }

  handleActivate() {
    super.handleActivate();
    this.renderRecords();
  }

  renderRecords() {
    const container = this.elements.recordList;
    if (!container) return;

    const projects = typeof this.getProjects === "function" ? this.getProjects() : {};
    const currentProjectId =
      typeof this.getCurrentProjectId === "function"
        ? this.getCurrentProjectId()
        : null;
    const currentRecordId =
      typeof this.getCurrentRecordId === "function"
        ? this.getCurrentRecordId()
        : null;

    if (!currentProjectId || !projects[currentProjectId]) {
      container.innerHTML = "<p>Select or create a project first.</p>";
      return;
    }

    const records = projects[currentProjectId].records || {};
    if (Object.keys(records).length === 0) {
      container.innerHTML = "<p>No records yet. Create one above.</p>";
      this.drawProjectOverview?.();
      return;
    }

    container.innerHTML = "";
    Object.keys(records).forEach((id) => {
      const record = records[id];
      const div = document.createElement("div");
      div.className = "record-item";
      if (id === currentRecordId) div.classList.add("active");

      const titleSpan = document.createElement("span");
      titleSpan.className = "record-title";
      titleSpan.textContent = record.name;

      const statusChip =
        (this.buildStatusChip &&
          this.buildStatusChip(record.status || "Draft")) ||
        document.createElement("span");

      const canvasWrapper = document.createElement("div");
      canvasWrapper.className = "record-canvas";
      const miniCanvas = document.createElement("canvas");
      miniCanvas.width = 80;
      miniCanvas.height = 80;
      canvasWrapper.appendChild(miniCanvas);

      div.appendChild(titleSpan);
      div.appendChild(statusChip);
      div.appendChild(canvasWrapper);

      div.addEventListener("click", () => this.loadRecord?.(id));
      container.appendChild(div);

      try {
        const pts = this.computeTraversePointsForRecord?.(
          currentProjectId,
          id
        );
        this.drawTraversePreview?.(miniCanvas, pts);
      } catch (e) {
        // ignore icon errors
      }
    });

    this.drawProjectOverview?.();
    this.populatePointGenerationOptions?.();
  }
}
