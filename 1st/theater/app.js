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
const hashLinks = [...document.querySelectorAll('a[href^="#"]')];
hashLinks.forEach(link => link.addEventListener('click', event => {
  if (drawer.contains(link)) closeDrawer(false);
  const target = link.hash ? document.querySelector(link.hash) : null;
  if (!target) return;
  event.preventDefault();
  goToScene(target);
}));

drawer.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const focusable = [closeButton, ...navLinks];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

let settleTimer;

// 捲動一律用即時定位：iOS Safari 對平滑捲動 + scroll-snap 的處理不可靠，
// 動畫沒跑起來時使用者看到的就是「點了沒反應」。定位後再校正一次，
// 確保瀏覽器的 snap 不會把畫面拉走。
function goToScene(scene) {
  if (!scene) return;
  setActive(scene);
  history.replaceState(null, '', `#${scene.id}`);

  const root = document.documentElement;
  const end = Math.max(0, Math.min(scene.offsetTop, root.scrollHeight - window.innerHeight));

  root.style.scrollSnapType = 'none';
  window.scrollTo(0, end);

  window.clearTimeout(settleTimer);
  settleTimer = window.setTimeout(() => {
    if (Math.abs(window.scrollY - end) > 2) window.scrollTo(0, end);
    root.style.scrollSnapType = '';
  }, 150);
}

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
  goToScene(scenes[targetIndex]);
  window.setTimeout(() => { pagingLocked = false; }, 450);
});

setActive(scenes[0]);
const initial = location.hash ? document.querySelector(location.hash) : null;
if (initial) goToScene(initial);
