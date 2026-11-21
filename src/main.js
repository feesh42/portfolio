import '@fontsource-variable/geist';
import './style.css';
import { discoverProjects, getProject, snapshot } from './projects.js';

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
    const link = tile.querySelector('.project-link');
    const description = tile.querySelector('.description');
    const source = tile.querySelector('.source-link');

    art.dataset.kind = project.art;
    link.href = project.demo || project.source;
    link.firstElementChild.textContent = project.title;
    description.textContent = project.description || '';
    description.hidden = !project.description;
    source.hidden = !project.demo;
    source.href = project.source;

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

render(await Promise.all(snapshot.map(getProject)));
try {
  const projects = await discoverProjects();
  // Avoid rebuilding cards while someone is reading, pointing at, or using one.
  if (!grid.matches(':hover, :focus-within')) {
    render(projects);
  } else {
    function updateWhenIdle() {
      if (grid.matches(':hover, :focus-within')) return;
      grid.removeEventListener('pointerleave', updateWhenIdle);
      grid.removeEventListener('focusout', onFocusOut);
      render(projects);
    }
    function onFocusOut() {
      requestAnimationFrame(updateWhenIdle);
    }
    grid.addEventListener('pointerleave', updateWhenIdle);
    grid.addEventListener('focusout', onFocusOut);
  }
} catch {
  // Keep the bundled snapshot when GitHub is unavailable or rate-limited.
}
