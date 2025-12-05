export default class SyncService {
  constructor({ baseUrl = "/api" } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async sync(payload = {}) {
    const response = await fetch(`${this.baseUrl}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Sync failed with status ${response.status}`);
    }
    return response.json();
  }

  async fetchProjects() {
    const response = await fetch(`${this.baseUrl}/projects`);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`);
    }
    return response.json();
  }
}
