import axios from "axios";

const BASE = "https://api.github.com";

function client(token) {
  return axios.create({
    baseURL: BASE,
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    timeout: 15000,
  });
}

function handleError(err) {
  if (err.response) {
    const status = err.response.status;
    const msg = err.response.data?.message || "Unknown API error";
    if (status === 401) return { ok: false, code: "INVALID_TOKEN", msg: "Token invalid or expired." };
    if (status === 404) return { ok: false, code: "NOT_FOUND", msg: "Resource not found." };
    if (status === 422) return { ok: false, code: "VALIDATION", msg: msg };
    if (status === 403) return { ok: false, code: "FORBIDDEN", msg: "Access denied: " + msg };
    return { ok: false, code: "API_ERROR", msg: msg };
  }
  if (err.code === "ECONNABORTED") return { ok: false, code: "TIMEOUT", msg: "Request timed out." };
  return { ok: false, code: "NETWORK", msg: "Network error. Check connection." };
}

export async function getUser(token) {
  try {
    const res = await client(token).get("/user");
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function listRepos(token) {
  try {
    const res = await client(token).get("/user/repos", {
      params: { per_page: 100, sort: "updated", affiliation: "owner" },
    });
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function createRepo(token, { name, description, isPrivate, autoInit }) {
  try {
    const res = await client(token).post("/user/repos", {
      name,
      description: description || "",
      private: isPrivate,
      auto_init: autoInit ?? true,
    });
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function deleteRepo(token, owner, repo) {
  try {
    await client(token).delete(`/repos/${owner}/${repo}`);
    return { ok: true };
  } catch (e) {
    return handleError(e);
  }
}

export async function getRepo(token, owner, repo) {
  try {
    const res = await client(token).get(`/repos/${owner}/${repo}`);
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function updateRepo(token, owner, repo, patches) {
  try {
    const res = await client(token).patch(`/repos/${owner}/${repo}`, patches);
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function listBranches(token, owner, repo) {
  try {
    const res = await client(token).get(`/repos/${owner}/${repo}/branches`);
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

export async function listCommits(token, owner, repo) {
  try {
    const res = await client(token).get(`/repos/${owner}/${repo}/commits`, {
      params: { per_page: 10 },
    });
    return { ok: true, data: res.data };
  } catch (e) {
    return handleError(e);
  }
}

