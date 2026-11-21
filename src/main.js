import '@fontsource-variable/geist';
import './style.css';
import { discoverProjects, findProject } from './projects.js';

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

async function showProject(slug) {
  document.querySelector('#catalog').hidden = true;
  const detail = document.querySelector('#project-detail');
  detail.hidden = false;
  const title = detail.querySelector('h1');
  const summary = detail.querySelector('.detail-summary');
  const description = summary.querySelector('p');
  let project;
  try {
    project = await findProject(slug);
  } catch {
    project = (await loadCatalog())?.find(item => item.slug.toLowerCase() === slug.toLowerCase());
  }
  detail.removeAttribute('aria-busy');
  summary.hidden = false;
  if (!project) {
    title.textContent = 'Project unavailable';
    description.textContent = 'This project could not be found in the public portfolio.';
    document.title = 'Project unavailable · feesh42';
    return;
  }

  title.textContent = project.title;
  document.title = `${project.title} · feesh42`;
  const source = detail.querySelector('.detail-source');
  source.href = project.source;
  source.firstElementChild.textContent = project.source;
  source.append(githubIcon());
  source.hidden = false;
  if (project.demo) {
    const visit = detail.querySelector('.detail-visit');
    visit.href = project.demo;
    visit.hidden = false;
  }
  if (project.thumbnail) {
    const background = new Image();
    background.alt = '';
    background.src = project.thumbnail;
    detail.querySelector('.detail-backdrop').append(background);
  }
  description.textContent = project.description || '';
  description.hidden = !project.description;
  if (project.gif) {
    const preview = detail.querySelector('.detail-preview');
    const link = document.createElement('a');
    link.href = project.gif;
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

async function loadCatalog() {
  try {
    const response = await fetch('/projects.json', { signal: AbortSignal.timeout(3000) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function showCatalog() {
  const catalog = await loadCatalog();
  if (catalog) {
    render(catalog);
    return;
  }
  try {
    render(await discoverProjects());
  } catch {
    grid.textContent = 'Projects are temporarily unavailable. Try refreshing the page.';
  }
}

const route = location.pathname.match(/^\/projects\/([a-z0-9_.-]+)\/?$/i);
if (route) {
  await showProject(route[1]);
} else {
  await showCatalog();
}
