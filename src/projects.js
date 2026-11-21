const owner = 'feesh42';

const existing = [
  { name: 'Tabs', description: 'Enables use of legacy tabs in tandem with side bar tabs.', default_branch: 'main' },
  { name: 'vs-links', description: 'Displays useful links in VS Code based on actions.', default_branch: 'main' },
  { name: 'any-button', description: 'Create any button. Anywhere.', default_branch: 'main' },
  { name: 'r8scholar', description: 'Rate and discuss professors, departments, and courses at Brock University.', default_branch: 'main' },
];

export const snapshot = existing.map(repo => ({
  ...repo,
  html_url: `https://github.com/${owner}/${repo.name}`,
}));

const artwork = {
  Tabs: ['Tabs', 'tabs'],
  'vs-links': ['VS Links', 'links'],
  'any-button': ['Any Button', 'button'],
  r8scholar: ['R8Scholar', 'scholar'],
};

function httpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

function mediaUrl(value, base) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    return httpsUrl(new URL(value, base).href);
  } catch {
    return '';
  }
}

function label(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export async function getProject(repo) {
  const [title, art] = artwork[repo.name] ?? [repo.name.replace(/[-_]+/g, ' '), 'generic'];
  const base = `https://raw.githubusercontent.com/${owner}/${encodeURIComponent(repo.name)}/${encodeURIComponent(repo.default_branch)}/`;
  let metadata = {};
  if (repo.topics?.includes('portfolio')) {
    try {
      const response = await fetch(new URL('portfolio.json', base), { signal: AbortSignal.timeout(4000) });
      if (response.ok) metadata = (await response.json()) ?? {};
    } catch {
      // Repository fields still work when optional metadata is unavailable.
    }
  }
  return {
    slug: repo.name,
    title: label(metadata.title, title),
    description: label(metadata.description, label(repo.description, existing.find(item => item.name === repo.name)?.description)),
    source: `https://github.com/${owner}/${encodeURIComponent(repo.name)}`,
    demo: httpsUrl(metadata.demo) || httpsUrl(repo.homepage),
    thumbnail: mediaUrl(metadata.thumbnail, base),
    gif: mediaUrl(metadata.gif, base),
    art,
  };
}

export async function discoverProjects() {
  const repos = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(
      `https://api.github.com/users/${owner}/repos?type=owner&sort=pushed&per_page=100&page=${page}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Invalid GitHub repository list');
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const initialOrder = existing.map(repo => repo.name);
  const position = name => initialOrder.includes(name) ? initialOrder.indexOf(name) : initialOrder.length;
  return Promise.all(repos.filter(isEligible).sort((a, b) => position(a.name) - position(b.name)).map(getProject));
}

function isEligible(repo) {
  return typeof repo.name === 'string' && repo.name.toLowerCase() !== 'portfolio' &&
    !repo.private && !repo.fork && !repo.archived && !repo.topics?.includes('portfolio-hidden');
}

export async function findProject(slug) {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const repo = await response.json();
    return isEligible(repo) ? getProject(repo) : null;
  } catch {
    const repo = snapshot.find(item => item.name.toLowerCase() === slug.toLowerCase());
    return repo ? getProject(repo) : null;
  }
}
