const owner = 'feesh42';
const api = 'https://api.github.com';

function httpsUrl(value, base) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value, base);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

async function request(url) {
  return fetch(url, { signal: AbortSignal.timeout(5000) });
}

export async function getProject(repo) {
  if (repo.private || repo.visibility && repo.visibility !== 'public') return null;
  const slug = repo.name;
  const base = `https://raw.githubusercontent.com/${owner}/${encodeURIComponent(slug)}/${repo.default_branch.split('/').map(encodeURIComponent).join('/')}/`;
  const response = await request(new URL(`${slug}.portfolio.json`, base));
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Manifest for ${slug} returned ${response.status}`);
  const metadata = await response.json().catch(() => null);
  if (typeof metadata?.title !== 'string' || !metadata.title.trim() ||
      typeof metadata.description !== 'string' || !metadata.description.trim()) return null;
  return {
    slug,
    title: metadata.title.trim(),
    description: metadata.description.trim(),
    source: `https://github.com/${owner}/${encodeURIComponent(slug)}`,
    deployment: httpsUrl(metadata.deployment) || httpsUrl(metadata.demo),
    thumbnail: httpsUrl(metadata.thumbnail, base),
    gif: httpsUrl(metadata.gif, base),
    art: typeof metadata.art === 'string' ? metadata.art : 'generic',
  };
}

export async function discoverProjects() {
  const repos = [];
  for (let page = 1; ; page += 1) {
    const response = await request(`${api}/users/${owner}/repos?type=owner&sort=pushed&per_page=100&page=${page}`);
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('Invalid GitHub repository list');
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  return (await Promise.all(repos.map(getProject))).filter(Boolean);
}

export async function findProject(slug) {
  const response = await request(`${api}/repos/${owner}/${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return getProject(await response.json());
}
