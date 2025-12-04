import Project from "../models/Project.js";

export default class ProjectRepository {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  loadProjects() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      const projects = {};
      Object.entries(parsed || {}).forEach(([id, proj]) => {
        projects[id] = Project.fromObject(proj);
      });
      return projects;
    } catch (e) {
      console.warn("Failed to parse projects", e);
      return {};
    }
  }

  saveProjects(projects) {
    const obj = {};
    Object.entries(projects).forEach(([id, project]) => {
      obj[id] = project.toObject();
    });
    localStorage.setItem(this.storageKey, JSON.stringify(obj));
  }
}
