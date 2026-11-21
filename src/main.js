import '@fontsource-variable/geist';
import './style.css';
import { discoverProjects, findProject } from './projects.js';

const systemTheme = matchMedia('(prefers-color-scheme: dark)');
const root = document.documentElement;
const themeToggle = document.querySelector('.theme-toggle');
const themeColor = document.querySelector('meta[name="theme-color"]');

function syncTheme() {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : systemTheme.matches;
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeColor.content = dark ? '#101014' : '#f9f9f7';
}

themeToggle.addEventListener('click', () => {
  const theme = themeToggle.getAttribute('aria-pressed') === 'true' ? 'light' : 'dark';
  root.dataset.theme = theme;
  try {
    localStorage.setItem('portfolio-theme', theme);
  } catch {
    // Keep the selected theme for this page when storage is unavailable.
  }
  syncTheme();
});
systemTheme.addEventListener('change', syncTheme);
syncTheme();

const catalogView = document.querySelector('#catalog');
const detail = document.querySelector('#project-detail');
const projectCache = new Map();
let catalogRequest;
let navigation = 0;
const grid = document.querySelector('#projects');
const count = document.querySelector('#project-count');
const template = document.querySelector('#project-template');
const canTilt = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');

function addTilt(tile, card, image, project) {
  tile.addEventListener('pointermove', event => {
    if (!canTilt.matches || event.pointerType === 'touch') return;
    const bounds = tile.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, 2 * (event.clientX - bounds.left) / bounds.width - 1));
    const y = Math.max(-1, Math.min(1, 2 * (event.clientY - bounds.top) / bounds.height - 1));
    card.classList.add('tilting');
    card.style.setProperty('--pitch', `${-y * 2.5}deg`);
    card.style.setProperty('--yaw', `${x * 3}deg`);
  });

  function resetTilt() {
    card.classList.remove('tilting');
    card.style.removeProperty('--pitch');
    card.style.removeProperty('--yaw');
    if (image && project.gif && project.thumbnail) image.src = project.thumbnail;
  }

  tile.addEventListener('pointerleave', resetTilt);
  tile.addEventListener('pointercancel', resetTilt);
  tile.addEventListener('pointerenter', event => {
    if (image && canTilt.matches && event.pointerType !== 'touch' && project.gif && project.thumbnail) {
      image.src = project.gif;
    }
  });
}

function render(projects) {
  count.textContent = String(projects.length).padStart(2, '0');
  grid.replaceChildren(...projects.map(project => {
    const tile = template.content.firstElementChild.cloneNode(true);
    const card = tile.querySelector('.card');
    const art = tile.querySelector('.art');
    const title = tile.querySelector('.project-title');
    const visit = tile.querySelector('.visit');
    const info = tile.querySelector('.info');
    const source = tile.querySelector('.github-shortcut');
    const detailPath = `/projects/${encodeURIComponent(project.slug)}`;

    art.dataset.kind = project.art;
    title.href = detailPath;
    title.textContent = project.title;
    if (project.title.length > 24) title.classList.add('long-title');
    info.href = detailPath;
    info.setAttribute('aria-label', `Info about ${project.title}`);
    tile.querySelector('.tile-description').textContent = project.description || '';
    visit.href = project.demo || 'https://github.com/feesh42';
    visit.setAttribute('aria-label', project.demo ? `Visit ${project.title}` : 'Visit feesh42 on GitHub');
    source.href = project.source;
    source.setAttribute('aria-label', `${project.title} on GitHub`);
    source.append(githubIcon());

    let image;
    const media = project.thumbnail || (canTilt.matches ? project.gif : '');
    if (media) {
      image = new Image();
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', () => {
        if (project.thumbnail && image.src !== project.thumbnail) image.src = project.thumbnail;
        else image.hidden = true;
      });
      image.addEventListener('load', () => { image.hidden = false; });
      image.src = media;
      art.append(image);
    }
    addTilt(tile, card, image, project);
    return tile;
  }));
  if (!projects.length) {
    const message = document.createElement('p');
    message.textContent = 'No public projects to display yet.';
    grid.append(message);
  }
}

function githubIcon() {
  return document.querySelector('#github-icon').content.cloneNode(true);
}

async function showProject(slug, currentNavigation, focusHeading) {
  const title = detail.querySelector('h1');
  const summary = detail.querySelector('.detail-summary');
  const description = summary.querySelector('p');
  const links = detail.querySelector('.detail-links');
  const loading = detail.querySelector('.detail-loading');
  const backdrop = detail.querySelector('.detail-backdrop');
  const preview = detail.querySelector('.detail-preview');
  const key = slug.toLowerCase();
  let project = projectCache.get(key);

  title.textContent = project?.title ?? slug.replace(/[-_]+/g, ' ');
  document.title = `${title.textContent} · feesh42`;
  if (focusHeading) title.focus({ preventScroll: true });
  links.hidden = true;
  summary.hidden = true;
  loading.hidden = Boolean(project);
  backdrop.replaceChildren();
  preview.replaceChildren();

  if (!project) {
    const catalog = await loadCatalog();
    if (currentNavigation !== navigation) return;
    project = catalog?.find(item => item.slug.toLowerCase() === key);
    if (!project) {
      try {
        project = await findProject(slug);
      } catch {
        project = null;
      }
      if (currentNavigation !== navigation) return;
    }
  }

  loading.hidden = true;
  summary.hidden = false;
  if (!project) {
    description.hidden = false;
    description.textContent = 'This project could not be found in the public portfolio.';
    return;
  }

  projectCache.set(key, project);
  title.textContent = project.title;
  document.title = `${project.title} · feesh42`;
  links.hidden = false;
  const source = detail.querySelector('.detail-source');
  source.href = project.source;
  source.firstElementChild.textContent = project.source;
  source.querySelector('svg')?.remove();
  source.append(githubIcon());
  source.hidden = false;
  const visit = detail.querySelector('.detail-visit');
  visit.hidden = !project.demo;
  if (project.demo) {
    visit.href = project.demo;
  }
  if (project.thumbnail) {
    const background = new Image();
    background.alt = '';
    background.src = project.thumbnail;
    backdrop.append(background);
  }
  description.textContent = project.description || '';
  description.hidden = !project.description;
  if (project.gif) {
    const link = document.createElement('a');
    link.href = project.gif;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'View animated preview ↗';
    link.className = 'action';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      preview.append(link);
    } else {
      const image = new Image();
      image.alt = `${project.title} in action`;
      image.loading = 'lazy';
      image.addEventListener('error', () => image.replaceWith(link), { once: true });
      image.src = project.gif;
      preview.append(image);
    }
  }
}

let buildCatalog;

function loadCatalog() {
  buildCatalog ??= fetchCatalog();
  return buildCatalog;
}

async function fetchCatalog() {
  try {
    const response = await fetch('/projects.json', { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return null;
    const projects = await response.json();
    return Array.isArray(projects) ? projects : null;
  } catch {
    return null;
  }
}

async function showCatalog() {
  try {
    const projects = (await loadCatalog()) ?? await discoverProjects();
    for (const project of projects) projectCache.set(project.slug.toLowerCase(), project);
    render(projects);
  } catch {
    grid.textContent = 'Projects are temporarily unavailable. Try refreshing the page.';
  }
}

function projectRoute(path) {
  return path.match(/^\/projects\/([a-z0-9_.-]+)\/?$/i)?.[1];
}

function renderRoute(focusHeading = false) {
  const currentNavigation = ++navigation;
  const slug = projectRoute(location.pathname);
  catalogView.hidden = Boolean(slug);
  detail.hidden = !slug;
  if (slug) {
    void showProject(slug, currentNavigation, focusHeading);
  } else {
    document.title = 'Demos · feesh42';
    if (focusHeading) catalogView.querySelector('h1').focus({ preventScroll: true });
    catalogRequest ??= showCatalog();
  }
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-route]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey ||
      event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || (url.pathname !== '/' && !projectRoute(url.pathname))) return;
  event.preventDefault();
  if (url.href === location.href) return;
  history.pushState(null, '', url);
  renderRoute(true);
  window.scrollTo(0, 0);
});
window.addEventListener('popstate', () => renderRoute(true));
renderRoute();
