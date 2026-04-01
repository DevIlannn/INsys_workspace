import inquirer from "inquirer";
import { t } from "../lang.js";
import {
  color,
  renderSectionTitle,
  renderTable,
  renderSuccess,
  renderError,
  renderInfo,
  renderMuted,
  renderKeyValue,
  createSpinner,
} from "../ui.js";
import * as vc from "../api/vercel.js";

export async function vercelMenu(state) {
  const { lang, tokens } = state;
  const token = tokens.vercel;

  if (!token) {
    renderError("Vercel token not set. Go to Settings > Update Tokens.");
    await pause();
    return;
  }

  let running = true;
  while (running) {
    renderSectionTitle(t(lang, "vercel"));

    const { choice } = await inquirer.prompt([
      {
        type: "list",
        name: "choice",
        message: color.primary("Select action"),
        prefix: "  ",
        choices: [
          { name: color.white(t(lang, "listProjects")), value: "projects" },
          { name: color.white(t(lang, "deleteProject")), value: "del_project" },
          new inquirer.Separator(color.dim("".padEnd(30, "\u2500"))),
          { name: color.white(t(lang, "listDeploys")), value: "deploys" },
          { name: color.white(t(lang, "cancelDeploy")), value: "cancel_deploy" },
          new inquirer.Separator(color.dim("".padEnd(30, "\u2500"))),
          { name: color.white(t(lang, "listEnv")), value: "env_list" },
          { name: color.white(t(lang, "addEnv")), value: "env_add" },
          { name: color.white(t(lang, "removeEnv")), value: "env_remove" },
          new inquirer.Separator(color.dim("".padEnd(30, "\u2500"))),
          { name: color.white(t(lang, "domainList")), value: "domains" },
          { name: color.white(t(lang, "listAlias")), value: "aliases" },
          new inquirer.Separator(color.dim("".padEnd(30, "\u2500"))),
          { name: color.muted(t(lang, "back")), value: "back" },
        ],
      },
    ]);

    if (choice === "back") { running = false; break; }
    if (choice === "projects") await listProjects(token, lang);
    if (choice === "del_project") await deleteProject(token, lang);
    if (choice === "deploys") await listDeployments(token, lang);
    if (choice === "cancel_deploy") await cancelDeployment(token, lang);
    if (choice === "env_list") await listEnvVars(token, lang);
    if (choice === "env_add") await addEnvVar(token, lang);
    if (choice === "env_remove") await removeEnvVar(token, lang);
    if (choice === "domains") await listDomains(token, lang);
    if (choice === "aliases") await listAliases(token, lang);
  }
}

async function listProjects(token, lang) {
  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await vc.listProjects(token);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  if (!res.data.length) { renderInfo(t(lang, "noData")); await pause(); return; }

  renderSectionTitle(t(lang, "projects") + " (" + res.data.length + ")");

  const rows = res.data.map((p) => [
    color.white(p.name),
    color.muted(p.id),
    color.accent(p.framework || "-"),
    p.latestDeployments?.[0]?.readyState
      ? deployStateColor(p.latestDeployments[0].readyState)
      : color.dim("-"),
    color.dim(new Date(p.updatedAt).toLocaleDateString()),
  ]);

  renderTable(["Name", "ID", "Framework", "Status", "Updated"], rows, [24, 28, 14, 12, 14]);
  await pause();
}

async function deleteProject(token, lang) {
  renderSectionTitle(t(lang, "deleteProject"));

  const { projectId } = await inquirer.prompt([
    {
      type: "input",
      name: "projectId",
      message: color.primary("Project name or ID:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const { confirmed } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirmed",
      message: color.error(t(lang, "confirmDelete") + ' "' + projectId + '"?'),
      prefix: "  ",
      default: false,
    },
  ]);

  if (!confirmed) { renderMuted("Cancelled."); await pause(); return; }

  const spinner = createSpinner("Deleting project...");
  spinner.start();
  const res = await vc.deleteProject(token, projectId);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  renderSuccess("Project deleted: " + projectId);
  await pause();
}

async function listDeployments(token, lang) {
  const { projectId } = await inquirer.prompt([
    {
      type: "input",
      name: "projectId",
      message: color.primary("Filter by Project ID (leave blank for all):"),
      prefix: "  ",
    },
  ]);

  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await vc.listDeployments(token, projectId || undefined);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  if (!res.data.length) { renderInfo(t(lang, "noData")); await pause(); return; }

  renderSectionTitle(t(lang, "deployments"));

  const rows = res.data.map((d) => [
    color.muted(d.uid.substring(0, 12) + "..."),
    color.white(d.name),
    deployStateColor(d.state),
    color.info(d.url ? "https://" + d.url : "-"),
    color.dim(new Date(d.createdAt).toLocaleDateString()),
  ]);

  renderTable(["ID", "Name", "State", "URL", "Created"], rows, [16, 24, 12, 32, 14]);
  await pause();
}

async function cancelDeployment(token, lang) {
  const { deployId } = await inquirer.prompt([
    {
      type: "input",
      name: "deployId",
      message: color.primary("Deployment ID to cancel:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const spinner = createSpinner("Cancelling deployment...");
  spinner.start();
  const res = await vc.cancelDeployment(token, deployId);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  renderSuccess("Deployment cancelled: " + deployId);
  await pause();
}

async function listEnvVars(token, lang) {
  const { projectId } = await inquirer.prompt([
    {
      type: "input",
      name: "projectId",
      message: color.primary("Project name or ID:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await vc.listEnvVars(token, projectId);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  if (!res.data.length) { renderInfo(t(lang, "noData")); await pause(); return; }

  renderSectionTitle(t(lang, "envVars"));

  const rows = res.data.map((e) => [
    color.primary(e.key),
    color.muted(e.id),
    color.accent(e.type),
    color.white(e.target?.join(", ") || "-"),
  ]);

  renderTable(["Key", "ID", "Type", "Target"], rows, [30, 28, 12, 24]);
  await pause();
}

async function addEnvVar(token, lang) {
  renderSectionTitle(t(lang, "addEnv"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectId",
      message: color.primary("Project name or ID:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
    {
      type: "input",
      name: "key",
      message: color.primary("Key:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
    {
      type: "input",
      name: "value",
      message: color.primary("Value:"),
      prefix: "  ",
    },
    {
      type: "checkbox",
      name: "target",
      message: color.primary("Target environments:"),
      prefix: "  ",
      choices: ["production", "preview", "development"],
      default: ["production"],
      validate: (v) => v.length > 0 || "Select at least one.",
    },
  ]);

  const spinner = createSpinner("Adding env var...");
  spinner.start();
  const res = await vc.addEnvVar(token, answers.projectId, {
    key: answers.key,
    value: answers.value,
    target: answers.target,
  });
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  renderSuccess("Env var added: " + answers.key);
  await pause();
}

async function removeEnvVar(token, lang) {
  renderSectionTitle(t(lang, "removeEnv"));

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectId",
      message: color.primary("Project name or ID:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
    {
      type: "input",
      name: "envId",
      message: color.primary("Env Var ID (from list):"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const spinner = createSpinner("Removing env var...");
  spinner.start();
  const res = await vc.removeEnvVar(token, answers.projectId, answers.envId);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  renderSuccess("Env var removed.");
  await pause();
}

async function listDomains(token, lang) {
  const { projectId } = await inquirer.prompt([
    {
      type: "input",
      name: "projectId",
      message: color.primary("Project name or ID:"),
      prefix: "  ",
      validate: (v) => v.trim().length > 0 || "Required.",
    },
  ]);

  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await vc.listDomains(token, projectId);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  if (!res.data.length) { renderInfo(t(lang, "noData")); await pause(); return; }

  renderSectionTitle(t(lang, "domainList"));

  const rows = res.data.map((d) => [
    color.white(d.name),
    d.verified ? color.success("verified") : color.warning("unverified"),
    color.muted(d.gitBranch || "-"),
  ]);

  renderTable(["Domain", "Status", "Branch"], rows, [40, 14, 20]);
  await pause();
}

async function listAliases(token, lang) {
  const spinner = createSpinner(t(lang, "fetching") + "...");
  spinner.start();
  const res = await vc.listAliases(token);
  spinner.stop();

  if (!res.ok) { renderError(res.msg); await pause(); return; }
  if (!res.data.length) { renderInfo(t(lang, "noData")); await pause(); return; }

  renderSectionTitle(t(lang, "alias"));

  const rows = res.data.map((a) => [
    color.white(a.alias),
    color.muted(a.uid || "-"),
    color.dim(a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "-"),
  ]);

  renderTable(["Alias", "UID", "Created"], rows, [40, 28, 14]);
  await pause();
}

function deployStateColor(state) {
  const s = (state || "").toUpperCase();
  if (s === "READY") return color.success("READY");
  if (s === "ERROR") return color.error("ERROR");
  if (s === "BUILDING") return color.warning("BUILDING");
  if (s === "CANCELED") return color.muted("CANCELED");
  return color.dim(state || "unknown");
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

