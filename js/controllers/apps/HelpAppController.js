import MiniAppController from "./MiniAppController.js";

export default class HelpAppController extends MiniAppController {
  constructor(options = {}) {
    super(options);
    this.elements = options.elements || {};
    this.renderMarkdown = options.renderMarkdown;
    this.helpLoaded = false;
    this.helpLoading = false;
    this.loadHelp = options.loadHelp;
  }

  handleActivate() {
    super.handleActivate();
    if (typeof this.loadHelpDocument === "function") {
      this.loadHelpDocument();
    } else if (typeof this.loadHelp === "function") {
      this.loadHelp();
    }
  }

  async loadHelpDocument(force = false) {
    if (this.helpLoading || (this.helpLoaded && !force)) return;
    const container = this.elements.helpContent;
    if (!container) return;
    const status = this.elements.helpStatus;
    this.helpLoading = true;
    if (status) status.textContent = "Loading help from HELP.md…";

    try {
      const res = await fetch("HELP.md");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      container.innerHTML = this.renderMarkdown(text);
      if (status)
        status.textContent =
          "Loaded from HELP.md. Click refresh after editing the file.";
      this.helpLoaded = true;
    } catch (err) {
      console.error("Failed to load help content", err);
      if (status)
        status.textContent = "Couldn't load HELP.md. Confirm it sits by index.html.";
      container.innerHTML =
        "<p>Help content could not be loaded. Make sure HELP.md is next to index.html.</p>";
    } finally {
      this.helpLoading = false;
    }
  }
}
