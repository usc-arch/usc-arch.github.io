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
let scrollRaf;

// 捲動由 JS 自行補間：iOS Safari 對原生平滑捲動 + scroll-snap 的處理不可靠。
// 動畫期間停用 snap；另外用 setTimeout 保底，即使 requestAnimationFrame
// 完全沒跑（背景分頁、省電模式），時間到仍會強制定位到目標場景。
function goToScene(scene) {
  if (!scene) return;
  setActive(scene);
  history.replaceState(null, '', `#${scene.id}`);

  const root = document.documentElement;
  const from = window.scrollY;
  const to = Math.max(0, Math.min(scene.offsetTop, root.scrollHeight - window.innerHeight));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduce ? 0 : Math.min(460, Math.max(220, Math.abs(to - from) * 0.32));

  stopScroll();
  root.style.scrollSnapType = 'none';

  if (duration === 0 || Math.abs(to - from) < 2) {
    finishScroll(to);
    return;
  }

  // 使用者一碰就停手，交還控制權
  window.addEventListener('touchstart', onUserScroll, { passive: true });
  window.addEventListener('wheel', onUserScroll, { passive: true });

  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / duration);
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    window.scrollTo(0, from + (to - from) * eased);
    if (p < 1) scrollRaf = requestAnimationFrame(step);
    else finishScroll(to);
  };
  scrollRaf = requestAnimationFrame(step);

  // 保底：動畫沒跑起來也一定到位
  settleTimer = window.setTimeout(() => finishScroll(to), duration + 220);
}

function onUserScroll() {
  stopScroll();
  document.documentElement.style.scrollSnapType = '';
}

function stopScroll() {
  cancelAnimationFrame(scrollRaf);
  window.clearTimeout(settleTimer);
  window.removeEventListener('touchstart', onUserScroll);
  window.removeEventListener('wheel', onUserScroll);
}

function finishScroll(to) {
  stopScroll();
  if (Math.abs(window.scrollY - to) > 2) window.scrollTo(0, to);
  document.documentElement.style.scrollSnapType = '';
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
