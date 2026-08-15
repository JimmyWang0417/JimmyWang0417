import fs from "node:fs/promises";

const USER = "JimmyWang0417";
const headers = { Accept: "application/vnd.github+json", "User-Agent": `${USER}-profile-readme` };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function json(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function search(query, kind = "issues") {
  const data = await json(`https://api.github.com/search/${kind}?q=${encodeURIComponent(query)}&per_page=1`);
  return data.total_count;
}

function escape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

async function yearlyContributions() {
  const response = await fetch(`https://github.com/users/${USER}/contributions`, { headers: { "User-Agent": headers["User-Agent"] } });
  if (!response.ok) throw new Error(`Unable to load contribution calendar: ${response.status}`);
  const html = await response.text();
  return Number(html.match(/([\d,]+)\s+contributions?\s+in the last year/i)?.[1]?.replaceAll(",", "") ?? 0);
}

function grade({ yearly, commits, prs, issues, stars }) {
  const score = yearly * 0.55 + commits * 0.08 + prs * 4 + issues * 2 + stars * 3;
  if (score >= 240) return "S";
  if (score >= 160) return "A+";
  if (score >= 100) return "A";
  if (score >= 60) return "B+";
  return "B";
}

function statsSvg(theme, data) {
  const dark = theme === "dark";
  const c = dark
    ? { bg: "#0d1b2a", border: "#27445d", title: "#67e8f9", text: "#d7e3ec", muted: "#8ca3b5", accent: "#86efac", track: "#1d3448" }
    : { bg: "#f8fbff", border: "#bad5df", title: "#0e7490", text: "#243b53", muted: "#64748b", accent: "#16a34a", track: "#dcecf1" };
  const rows = [["Commits", data.commits], ["Pull requests", data.prs], ["Issues", data.issues], ["Stars earned", data.stars]];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="250" viewBox="0 0 560 250" role="img" aria-label="GitHub contribution statistics">
  <rect x="1" y="1" width="558" height="248" rx="18" fill="${c.bg}" stroke="${c.border}"/>
  <text x="28" y="43" fill="${c.title}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="20" font-weight="700">GitHub contribution overview</text>
  <circle cx="495" cy="63" r="38" fill="${c.track}"/><text x="495" y="72" text-anchor="middle" fill="${c.accent}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="27" font-weight="700">${data.rank}</text><text x="495" y="119" text-anchor="middle" fill="${c.muted}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="12">activity grade</text>
  <text x="28" y="82" fill="${c.text}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="28" font-weight="700">${data.yearly}</text><text x="28" y="104" fill="${c.muted}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="13">contributions in the last year</text>
  ${rows.map(([label, value], i) => { const x = 28 + (i % 2) * 218; const y = 154 + Math.floor(i / 2) * 55; return `<circle cx="${x + 5}" cy="${y - 5}" r="5" fill="${c.accent}"/><text x="${x + 19}" y="${y}" fill="${c.text}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="18" font-weight="700">${value}</text><text x="${x + 19}" y="${y + 19}" fill="${c.muted}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="12">${label}</text>`; }).join("")}
  <text x="532" y="231" text-anchor="end" fill="${c.muted}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10">auto-updated · public data</text>
</svg>`;
}

function languagesSvg(theme, languages) {
  const dark = theme === "dark";
  const c = dark
    ? { bg: "#0d1b2a", border: "#27445d", title: "#67e8f9", text: "#d7e3ec", muted: "#8ca3b5", track: "#1d3448" }
    : { bg: "#f8fbff", border: "#bad5df", title: "#0e7490", text: "#243b53", muted: "#64748b", track: "#dcecf1" };
  const palette = ["#3572A5", "#f34b7d", "#f1e05a", "#A97BFF", "#00ADD8", "#89e051", "#e34c26", "#563d7c"];
  let offset = 0;
  const bar = languages.map((item, index) => { const width = 504 * item.ratio / 100; const part = `<rect x="${28 + offset}" y="66" width="${Math.max(width, .8).toFixed(2)}" height="13" fill="${palette[index]}"/>`; offset += width; return part; }).join("");
  const rows = languages.map((item, index) => { const col = index % 2; const row = Math.floor(index / 2); const x = 28 + col * 254; const y = 113 + row * 31; return `<circle cx="${x + 5}" cy="${y - 5}" r="5" fill="${palette[index]}"/><text x="${x + 17}" y="${y}" fill="${c.text}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="13">${escape(item.name)}</text><text x="${x + 224}" y="${y}" text-anchor="end" fill="${c.muted}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="12">${item.ratio.toFixed(1)}%</text>`; }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="250" viewBox="0 0 560 250" role="img" aria-label="Top languages by public repository code volume">
  <rect x="1" y="1" width="558" height="248" rx="18" fill="${c.bg}" stroke="${c.border}"/>
  <text x="28" y="43" fill="${c.title}" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="20" font-weight="700">Most used languages</text>
  <rect x="28" y="66" width="504" height="13" rx="6.5" fill="${c.track}"/><g clip-path="url(#bar)">${bar}</g><defs><clipPath id="bar"><rect x="28" y="66" width="504" height="13" rx="6.5"/></clipPath></defs>
  ${rows}
  <text x="532" y="231" text-anchor="end" fill="${c.muted}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="10">by bytes · public repositories</text>
</svg>`;
}

const repos = await json(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`);
const owned = repos.filter(repo => !repo.fork);
const stars = owned.reduce((sum, repo) => sum + repo.stargazers_count, 0);
const [yearly, commits, prs, issues] = await Promise.all([
  yearlyContributions(),
  search(`author:${USER}`, "commits"),
  search(`author:${USER} type:pr`),
  search(`author:${USER} type:issue`),
]);

const languageTotals = new Map();
for (const repo of owned) {
  if (!repo.languages_url) continue;
  const values = await json(repo.languages_url);
  for (const [name, bytes] of Object.entries(values)) languageTotals.set(name, (languageTotals.get(name) ?? 0) + bytes);
}
const totalBytes = [...languageTotals.values()].reduce((a, b) => a + b, 0) || 1;
const languages = [...languageTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, bytes]) => ({ name, ratio: bytes * 100 / totalBytes }));
const data = { yearly, commits, prs, issues, stars, rank: grade({ yearly, commits, prs, issues, stars }) };

await fs.mkdir("assets", { recursive: true });
for (const theme of ["light", "dark"]) {
  await fs.writeFile(`assets/github-stats-${theme}.svg`, statsSvg(theme, data));
  await fs.writeFile(`assets/top-languages-${theme}.svg`, languagesSvg(theme, languages));
}
console.log(JSON.stringify({ ...data, languages }, null, 2));
