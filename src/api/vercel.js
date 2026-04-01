import axios from "axios";

const BASE = "https://api.vercel.com";

function client(token) {
  return axios.create({
    baseURL: BASE,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    timeout: 15000,
  });
}

function handleError(err) {
  if (err.response) {
    const status = err.response.status;
    const msg = err.response.data?.error?.message || "Unknown error";
    if (status === 401 || status === 403)
      return { ok: false, code: "INVALID_TOKEN", msg: "Token invalid or no access." };
    if (status === 404) return { ok: false, code: "NOT_FOUND", msg: "Resource not found." };
    if (status === 429) return { ok: false, code: "RATE_LIMIT", msg: "Rate limit hit. Wait a moment." };
    return { ok: false, code: "API_ERROR", msg };
  }
  if (err.code === "ECONNABORTED") return { ok: false, code: "TIMEOUT", msg: "Request timed out." };
  return { ok: false, code: "NETWORK", msg: "Network error. Check connection." };
}

export async function getUser(token) {
  try {
    const res = await client(token).get("/v2/user");
    return { ok: true, data: res.data.user };
  } catch (e) {
    return handleError(e);
  }
}

export async function listProjects(token) {
  try {
    const res = await client(token).get("/v9/projects", {
      params: { limit: 100 },
    });
    return { ok: true, data: res.data.projects };
  } catch (e) {
    return handleError(e);
  }
}

export async function getProject(token, idOrName) {
  try {
    const res = await client(token).get(`/v9/projects/${idOrName}`);
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteProject(token, idOrName) {
  try {
    await client(token).delete(`/v9/projects/${idOrName}`);
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function listDeployments(token, projectId) {
  try {
    const params = { limit: 20 };
    if (projectId) params.projectId = projectId;
    const res = await client(token).get("/v6/deployments", { params });
    return { ok: true, data: res.data.deployments };
  } catch (e) {
    return handleError(e);
  }
}

export async function getDeployment(token, id) {
  try {
    const res = await client(token).get(`/v13/deployments/${id}`);
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function cancelDeployment(token, id) {
  try {
    await client(token).patch(`/v12/deployments/${id}/cancel`);
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function listEnvVars(token, projectId) {
  try {
    const res = await client(token).get(`/v9/projects/${projectId}/env`);
    return { ok: true, data: res.data.envs };
  } catch (e) {
    return handleError(e);
  }
}

export async function addEnvVar(token, projectId, { key, value, target }) {
  try {
    const targets = Array.isArray(target) ? target : [target];
    const res = await client(token).post(`/v10/projects/${projectId}/env`, {
      key,
      value,
      type: "plain",
      target: targets,
    });
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function removeEnvVar(token, projectId, envId) {
  try {
    await client(token).delete(`/v9/projects/${projectId}/env/${envId}`);
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function listDomains(token, projectId) {
  try {
    const res = await client(token).get(`/v9/projects/${projectId}/domains`);
    return { ok: true, data: res.data.domains };
  } catch (e) {
    return handleError(e);
  }
}

export async function listAliases(token) {
  try {
    const res = await client(token).get("/v4/aliases", { params: { limit: 50 } });
    return { ok: true, data: res.data.aliases };
  } catch (e) {
    return handleError(e);
  }
}

