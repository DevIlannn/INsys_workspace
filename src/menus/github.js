import inquirer from "inquirer";
import { t } from "../lang.js";
import {
  color,
  renderSectionTitle,
  renderTable,
  renderSuccess,
  renderError,
  renderWarning,
  renderInfo,
  renderMuted,
  createSpinner,
  renderBox,
  renderKeyValue,
} from "../ui.js";
import * as gh from "../api/github.js";

let _owner = null;

async function ensureOwner(token) {
  if (_owner) return _owner;
  const res = await gh.getUser(token);
  if (res.ok) _owner = res.data.login;
  return _owner;
}

export async function githubMenu(state) {
  const { lang, tokens } = state;
  const token = tokens.github;

  if (!token) {
    renderError("GitHub token not set. Go to Settings > Update Tokens.");
    await pause();
    return;
  }

  let running = true;
  while (running) {
    renderSectionTitle(t(lang, "github"));

    const { choice } = await inquirer.prompt([
      {
        type: "list",
        name: "choice",
        message: color.primary("Select action"),
        prefix: "  ",
        choices: [
          { name: color.white(t(lang, "listRepos")), value: "list" },
          { name: color.white(t(lang, "createRepo")), value: "create" },
          { name: color.white(t(lang, "deleteRepo")), value: "delete" },
          { name: color.white("View Repository Detail"), value: "detail" },
          { name: color.white("List Branches"), value: "branches" },
          { name: color.white("Recent Commits"), value: "commits" },
          new inquirer.Separator(color.dim("".padEnd(30, "\u2500"))),
          { name: color.muted(t(lang, "back")), value: "back" },
        ],
      },
    ]);

    if (choice === "back") { running = false; break; }
    if (choice === "list") await listRepos(token, lang);
    if (choice === "create") await createRepo(token, lang);
    if (choice === "delete") await deleteRepo(token, lang);
    if (choice === "detail") await repoDetail(token, lang);
    if (choice === "branches") await listBranches(token, lang);
    if (choice === "commits") await recentCommits(token, lang);
  }
}

async function listRepos(token, lang) {
  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await gh.listRepos(token);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }

  const repos = res.data;
  if (!repos.length) { renderInfo(t(lang, "noData")); await pause(); return; }

  renderSectionTitle(t(lang, "repos") + " (" + repos.length + ")");

  const rows = repos.map((r) => [
    color.white(r.name),
    r.private ? color.warning("private") : color.success("public"),
    color.muted(r.language || "-"),
    color.muted(r.stargazers_count + " stars"),
    color.dim(new Date(r.updated_at).toLocaleDateString()),
  ]);

  renderTable(
    ["Repository", "Visibility", "Language", "Stars", "Updated"],
    rows,
    [30, 12, 14, 12, 14]
  );
  await pause();
}

async function createRepo(token, lang) {
  renderSectionTitle(t(lang, "createRepo"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "name",
      message: color.primary(t(lang, "repoName") + ":"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Name is required.",
    },
    {
      type: "input",
      name: "description",
      message: color.muted(t(lang, "repoDesc") + ":"),
      prefix: "  ",
    },
    {
      type: "confirm",
      name: "isPrivate",
      message: color.primary(t(lang, "repoPrivate")),
      prefix: "  ",
      default: false,
    },
    {
      type: "confirm",
      name: "autoInit",
      message: color.muted("Initialize with README?"),
      prefix: "  ",
      default: true,
    },
  ]);

  const spinner = createSpinner("Creating repository...");
  spinner.start();
  const res = await gh.createRepo(token, answers);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }

  renderSuccess(t(lang, "repoCreated") + ": " + color.accent(res.data.full_name));
  renderInfo("URL: " + res.data.html_url);
  await pause();
}

async function deleteRepo(token, lang) {
  renderSectionTitle(t(lang, "deleteRepo"));

  const owner = await ensureOwner(token);
  if (!owner) { renderError("Could not resolve GitHub user."); await pause(); return; }

  const { repoName } = await inquirer.prompt([
    {
      type: "input",
      name: "repoName",
      message: color.primary(t(lang, "repoNamePrompt") + ":"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: color.error(t(lang, "confirmDelete") + ' "' + repoName + '"?'),
      prefix: "  ",
      default: false,
    },
  ]);

  if (!confirmed) { renderMuted("Cancelled."); await pause(); return; }

  const spinner = createSpinner("Deleting...");
  spinner.start();
  const res = await gh.deleteRepo(token, owner, repoName);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  renderSuccess(t(lang, "repoDeleted") + ": " + repoName);
  await pause();
}

async function repoDetail(token, lang) {
  renderSectionTitle("Repository Detail");
  const owner = await ensureOwner(token);

  const { repoName } = await inquirer.prompt([
    {
      type: "input",
      name: "repoName",
      message: color.primary("Repository name:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await gh.getRepo(token, owner, repoName);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }

  const r = res.data;
  renderKeyValue([
    ["Name", r.name, "white"],
    ["Full Name", r.full_name, "accent"],
    ["Visibility", r.private ? "Private" : "Public", r.private ? "warning" : "success"],
    ["Description", r.description || "-", "muted"],
    ["Language", r.language || "-", "info"],
    ["Stars", String(r.stargazers_count), "warning"],
    ["Forks", String(r.forks_count), "muted"],
    ["Default Branch", r.default_branch, "primary"],
    ["URL", r.html_url, "info"],
    ["Created", new Date(r.created_at).toLocaleString(), "muted"],
    ["Updated", new Date(r.updated_at).toLocaleString(), "muted"],
  ]);
  await pause();
}

async function listBranches(token, lang) {
  renderSectionTitle("Branches");
  const owner = await ensureOwner(token);

  const { repoName } = await inquirer.prompt([
    {
      type: "input",
      name: "repoName",
      message: color.primary("Repository name:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await gh.listBranches(token, owner, repoName);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  if (!res.data.length) { renderInfo(t(lang, "noData")); await pause(); return; }

  const rows = res.data.map((b) => [
    color.white(b.name),
    color.muted(b.commit.sha.substring(0, 7)),
    b.protected ? color.success("protected") : color.dim("none"),
  ]);

  renderTable(["Branch", "SHA", "Protection"], rows, [30, 12, 14]);
  await pause();
}

async function recentCommits(token, lang) {
  renderSectionTitle("Recent Commits");
  const owner = await ensureOwner(token);

  const { repoName } = await inquirer.prompt([
    {
      type: "input",
      name: "repoName",
      message: color.primary("Repository name:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await gh.listCommits(token, owner, repoName);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  if (!res.data.length) { renderInfo(t(lang, "noData")); await pause(); return; }

  const rows = res.data.map((c) => [
    color.muted(c.sha.substring(0, 7)),
    color.white(c.commit.message.split("\n")[0].substring(0, 50)),
    color.accent(c.commit.author.name),
    color.dim(new Date(c.commit.author.date).toLocaleDateString()),
  ]);

  renderTable(["SHA", "Message", "Author", "Date"], rows, [10, 52, 20, 14]);
  await pause();
}

async function pause() {
  await inquirer.prompt([
    {
      type: "input",
      name: "_",
      message: color.dim("Press Enter to continue..."),
      prefix: "  ",
    },
  ]);
}

