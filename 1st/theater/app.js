const scenes = [...document.querySelectorAll('.scene')];
const drawer = document.querySelector('.drawer');
const backdrop = document.querySelector('.drawer-backdrop');
const menuButton = document.querySelector('.menu-button');
const closeButton = document.querySelector('.drawer-close');
const fullscreenButton = document.querySelector('.fullscreen-button');
const currentNumber = document.querySelector('#current-number');
const totalNumber = document.querySelector('#total-number');
const progressLine = document.querySelector('.progress i');
const navLinks = [...drawer.querySelectorAll('a')];
let lastFocus;
let activeSceneIndex = 0;
let pagingLocked = false;

totalNumber.textContent = String(scenes.length).padStart(2, '0');

function openDrawer() {
  lastFocus = document.activeElement;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.hidden = false;
  menuButton.setAttribute('aria-expanded', 'true');
  closeButton.focus();
}

function closeDrawer(returnFocus = true) {
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  backdrop.hidden = true;
  menuButton.setAttribute('aria-expanded', 'false');
  if (returnFocus && lastFocus) lastFocus.focus();
}

menuButton.addEventListener('click', openDrawer);
closeButton.addEventListener('click', () => closeDrawer());
backdrop.addEventListener('click', () => closeDrawer());
navLinks.forEach(link => link.addEventListener('click', () => closeDrawer(false)));

drawer.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [closeButton, ...navLinks];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

function setActive(scene) {
  const index = scenes.indexOf(scene);
  activeSceneIndex = index;
  currentNumber.textContent = String(index + 1).padStart(2, '0');
  progressLine.style.setProperty('--progress', `${((index + 1) / scenes.length) * 100}%`);
  navLinks.forEach(link => {
    const active = link.hash === `#${scene.id}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
}

const observer = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (visible) setActive(visible.target);
}, { threshold: [0.35, 0.6, 0.8] });
scenes.forEach(scene => observer.observe(scene));

function syncFullscreen() {
  const active = Boolean(document.fullscreenElement);
  document.body.classList.toggle('is-fullscreen', active);
  fullscreenButton.setAttribute('aria-label', active ? '離開全螢幕' : '進入全螢幕');
  fullscreenButton.title = active ? '離開全螢幕' : '全螢幕';
}

fullscreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else document.body.classList.toggle('is-fullscreen');
  } catch { document.body.classList.toggle('is-fullscreen'); }
  syncFullscreen();
});

document.addEventListener('fullscreenchange', syncFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
});

document.addEventListener('keydown', event => {
  if (drawer.classList.contains('open')) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;

  const nextKeys = ['PageDown', 'ArrowDown', ' '];
  const previousKeys = ['PageUp', 'ArrowUp'];
  if (!nextKeys.includes(event.key) && !previousKeys.includes(event.key)) return;

  event.preventDefault();
  if (pagingLocked) return;

  const direction = nextKeys.includes(event.key) ? 1 : -1;
  const targetIndex = Math.max(0, Math.min(scenes.length - 1, activeSceneIndex + direction));
  if (targetIndex === activeSceneIndex) return;

  pagingLocked = true;
  setActive(scenes[targetIndex]);
  scenes[targetIndex].scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  });
  window.setTimeout(() => { pagingLocked = false; }, 450);
});

if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
setActive(scenes[0]);
