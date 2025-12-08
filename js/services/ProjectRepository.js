import Project from "../models/Project.js";

export default class ProjectRepository {
  constructor(storageKey) {
    this.storageKey = storageKey;
  }

  loadProjects() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      return this.deserializeProjects(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to parse projects", e);
      return {};
    }
  }

  deserializeProjects(parsed = {}) {
    const projects = {};
    Object.entries(parsed || {}).forEach(([id, proj]) => {
      projects[id] = Project.fromObject({ id, ...proj });
    });
    return projects;
  }

  saveProjects(projects) {
    const obj = {};
    Object.entries(projects).forEach(([id, project]) => {
      obj[id] = project.toObject();
    });
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
      return true;
    } catch (err) {
      console.warn("Failed to persist projects to localStorage", err);
      return false;
    }
  }
}
