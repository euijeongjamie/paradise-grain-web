const query = (selector) => document.querySelector(selector);
const items = (selector) => [...document.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (from, to, amount) => from + (to - from) * amount;

function ease(from, to, value) {
  const time = clamp((value - from) / (to - from));
  return time * time * (3 - 2 * time);
}

const hero = query('.hero');
const heroStage = query('.hero-stage');
const heroFirst = query('.hero-headlines h1');
const heroSecond = query('.hero-second');
const story = query('.product');
const storyStage = query('.product-stage');
const bottleFrame = query('.bottle-frame');
const bottleCopy = query('.bottle-copy');
const storyEyebrow = query('.product-copy .eyebrow');
const pillFrame = query('.pill-frame');
const pillFigure = query('.pill-figure');
const pillCopy = query('.pill-copy');
const pillLabels = query('.pill-labels');
const pillCallouts = [...pillLabels.children];
const pillSlices = document.createElement('div');
pillSlices.className = 'pill-slices';
pillSlices.setAttribute('aria-hidden', 'true');
const sliceEdges = [0, .235, .405, .575, .745, 1];
const slices = pillCallouts.map(() => {
  const slice = document.createElement('span');
  const image = pillFigure.cloneNode();
  image.className = '';
  image.alt = '';
  slice.append(image);
  pillSlices.append(slice);
  return slice;
});
pillFigure.after(pillSlices);
const travelingPill = query('.travel-pill');
const routine = query('.routine');
const routineStage = query('.routine-stage');
const rail = query('.routine-rail');
const cards = items('.routine-card');
const landing = query('.landed-pill');
const previous = query('.rail-prev');
const next = query('.rail-next');
const progressBar = query('.rail-progress span');
const ingredients = query('.ingredients');
const ingredientStage = query('.ingredients-stage');
const ingredientRows = items('.ingredient-row');
const ingredientPhotos = items('.ingredient-photo');
const episodes = query('.episode-gallery');
const episodeCards = items('.episode-card');
const episodeProduct = query('.episode-product');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 720px)');

let metrics;
let frame = 0;
let needsMeasure = true;
let lastScrollY = NaN;
let railBias = 0;
let commandedRail = null;
let activeIngredient = 0;
let activeEpisode = 1;
let episodeSettleTimer;

function offsetTop(element) {
  return element.getBoundingClientRect().top + window.scrollY;
}

function setPose(element, opacity, y = 0, scale = 1, x = 0) {
  element.style.opacity = opacity;
  element.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
}

function updateRailControls() {
  const limit = rail.scrollWidth - rail.clientWidth;
  const position = rail.scrollLeft;
  previous.disabled = position <= 2;
  next.disabled = limit - position <= 2;
  progressBar.style.transform = `translateX(${limit > 0 ? clamp(position / limit) * 300 : 0}%)`;
}

function measure() {
  const viewport = window.innerHeight;
  const railLimit = Math.max(0, rail.scrollWidth - rail.clientWidth);
  const railRun = Math.round(narrow.matches
    ? clamp(railLimit * .98, viewport * .68, viewport * 1.10)
    : Math.max(viewport * .55, railLimit * 1.32));
  routine.style.setProperty('--rail-scroll', `${railRun}px`);

  const storyTop = offsetTop(story);
  const storyHeight = story.offsetHeight;
  const stageHeight = storyStage.offsetHeight;
  const routineTop = offsetTop(routine);
  const ingredientTop = offsetTop(ingredients);
  const figureHeight = pillFigure.offsetHeight;
  const figureWidth = pillFigure.offsetWidth;
  const drawnHeight = narrow.matches ? Math.min(figureHeight, figureWidth * 1568 / 1424) : figureHeight;
  const heightRatio = drawnHeight / Math.max(1, figureHeight);
  const cut = (edge) => (50 + (edge - .5) * heightRatio * 100);
  const slope = 25 * heightRatio;
  slices.forEach((slice, index) => {
    const top = cut(sliceEdges[index]);
    const bottom = cut(sliceEdges[index + 1]);
    // The cuts run perpendicular to the long axis of the tablet.
    const leftTop = index === 0 ? 0 : top - slope - .15;
    const rightTop = index === 0 ? 0 : top + slope - .15;
    const leftBottom = index === slices.length - 1 ? 100 : bottom - slope + .15;
    const rightBottom = index === slices.length - 1 ? 100 : bottom + slope + .15;
    slice.firstElementChild.style.clipPath =
      `polygon(0 ${leftTop}%, 100% ${rightTop}%, 100% ${rightBottom}%, 0 ${leftBottom}%)`;
  });
  metrics = {
    viewport,
    heroTop: offsetTop(hero),
    heroRun: Math.max(1, hero.offsetHeight - heroStage.offsetHeight),
    storyTop,
    pillCenterShift: pillFrame.parentElement.clientWidth / 2 - pillFrame.offsetLeft - figureWidth / 2,
    sliceGap: drawnHeight * (narrow.matches ? .057 : .049),
    storyRun: Math.max(1, storyHeight - stageHeight),
    flightStart: storyTop + storyHeight - stageHeight + viewport * .035,
    flightEnd: routineTop - viewport * (narrow.matches ? .075 : .125),
    routineTop,
    railLimit,
    railRun,
    ingredientTop,
    ingredientRun: Math.max(1, ingredients.offsetHeight - ingredientStage.offsetHeight),
  };
}

function updateHero(y) {
  const scroll = (y - metrics.heroTop) / metrics.heroRun;
  const out = ease(.12, .48, scroll);
  const enter = ease(.33, .77, scroll);
  setPose(heroFirst, 1 - out, -20 * out);
  setPose(heroSecond, enter, 21 * (1 - enter));
}

function updateStory(y) {
  const scroll = (y - metrics.storyTop) / metrics.storyRun;
  const bottleOut = ease(.13, .36, scroll);
  const pillIn = ease(.26, .43, scroll);
  const copyOut = ease(.11, .31, scroll);
  const settleLeft = ease(.46, .69, scroll);
  const copyIn = ease(.65, .83, scroll);
  const rejoin = ease(.89, 1.025, scroll);
  const flight = clamp((y - metrics.flightStart) / Math.max(1, metrics.flightEnd - metrics.flightStart));
  const inFlight = flight > 0 && flight < 1 && rail.scrollLeft < 3;
  const handedOff = flight > 0 && (inFlight || flight >= 1);
  const exploded = scroll > .37 && rejoin < 1 && !handedOff;

  setPose(bottleFrame, 1 - bottleOut, -14 * bottleOut, 1 - bottleOut * .13,
    metrics.pillCenterShift * .52 * bottleOut);
  setPose(pillFrame, pillIn, 15 * (1 - pillIn), .84 + .16 * pillIn,
    metrics.pillCenterShift * (1 - settleLeft));
  setPose(bottleCopy, 1 - copyOut, -15 * copyOut);
  const copyExit = 1 - ease(0, .57, flight);
  setPose(pillCopy, copyIn * copyExit, 18 * (1 - copyIn) - 12 * flight);
  setPose(storyEyebrow, Math.max(1 - copyOut, copyIn * copyExit));

  pillSlices.style.visibility = exploded ? 'visible' : 'hidden';
  pillFigure.style.visibility = exploded || handedOff ? 'hidden' : 'visible';
  slices.forEach((slice, index) => {
    const opening = ease(.37 + index * .018, .55 + index * .019, scroll);
    const offset = (index - (slices.length - 1) / 2) * metrics.sliceGap * opening * (1 - rejoin);
    slice.style.transform = `translate3d(${-.47 * offset}px, ${offset}px, 0)`;
    const labelIn = ease(.46 + index * .029, .59 + index * .029, scroll);
    setPose(pillCallouts[index], labelIn * (1 - rejoin), offset, 1, (1 - labelIn) * -9);
  });
  landing.style.opacity = flight >= 1 ? '1' : '0';
  travelingPill.style.visibility = inFlight ? 'visible' : 'hidden';

  if (!inFlight) return;

  const source = pillFigure.getBoundingClientRect();
  const stage = storyStage.getBoundingClientRect();
  const target = landing.parentElement.getBoundingClientRect();
  const targetWidth = landing.offsetWidth;
  const targetHeight = landing.offsetHeight;
  const targetX = target.left + landing.offsetLeft;
  const targetY = landing.offsetTop
    + (target.top - routineStage.getBoundingClientRect().top)
    + (metrics.routineTop - metrics.flightEnd);
  const startX = source.left + source.width * .5;
  const startY = source.top - stage.top - metrics.viewport * .035 + source.height * .5;
  const path = ease(0, 1, flight);
  const curve = Math.sin(Math.PI * path);
  const x = mix(startX, targetX, path) + curve * (narrow.matches ? -Math.min(116, window.innerWidth * .30) : 29);
  const yPosition = mix(startY, targetY, path) - Math.sin(Math.PI * path) * (narrow.matches ? 24 : 33);
  const sizeProgress = narrow.matches ? ease(0, .83, flight) : path;
  const width = mix(source.width, targetWidth, sizeProgress);
  const height = mix(source.height, targetHeight, sizeProgress);

  travelingPill.style.width = `${width}px`;
  travelingPill.style.height = `${height}px`;
  travelingPill.style.transform = `translate3d(${x - width * .5}px, ${yPosition - height * .5}px, 0) rotate(${29 * path}deg)`;
}

function railBase(y) {
  const travel = (y - metrics.routineTop) / metrics.railRun;
  return metrics.railLimit * ease(.02, .985, travel);
}

function updateRail(y) {
  if (y === lastScrollY) return;
  if (y < metrics.routineTop - metrics.viewport || y > metrics.routineTop + metrics.railRun + metrics.viewport) return;
  const base = railBase(y);
  const position = clamp(base + railBias, 0, metrics.railLimit);
  if (Math.abs(rail.scrollLeft - position) > .8) {
    rail.scrollLeft = position;
    commandedRail = rail.scrollLeft;
  }
}

function setIngredient(index) {
  if (index === activeIngredient) return;
  activeIngredient = index;
  ingredients.dataset.active = String(index);
  ingredientRows.forEach((row, i) => {
    const selected = i === index;
    row.classList.toggle('is-active', selected);
    row.classList.toggle('is-past', i < index);
    row.firstElementChild.setAttribute('aria-expanded', String(selected));
    row.lastElementChild.inert = !selected;
    ingredientPhotos[i].classList.toggle('is-active', selected);
    ingredientPhotos[i].setAttribute('aria-hidden', String(!selected));
  });
}

function updateIngredients(y) {
  const local = (y - metrics.ingredientTop) / metrics.ingredientRun;
  setIngredient(clamp(Math.floor(local * 3.6 + .4), 0, ingredientRows.length - 1));
}

function render() {
  frame = 0;
  if (needsMeasure || !metrics) {
    measure();
    needsMeasure = false;
  }
  const y = window.scrollY;
  if (!reduced.matches) {
    updateHero(y);
    updateStory(y);
    updateRail(y);
    updateIngredients(y);
  }
  lastScrollY = y;
  updateRailControls();
}

function schedule(measureAgain = false) {
  if (measureAgain) needsMeasure = true;
  if (!frame) frame = requestAnimationFrame(render);
}

function changeRail(direction) {
  const step = cards[1].offsetLeft - cards[0].offsetLeft;
  const target = clamp(rail.scrollLeft + direction * step, 0, rail.scrollWidth - rail.clientWidth);
  commandedRail = null;
  rail.scrollTo({ left: target, behavior: reduced.matches ? 'instant' : 'smooth' });
}

function setEpisode(index, align = false) {
  const target = episodeCards[index];
  if (activeEpisode !== index || !target.contains(episodeProduct)) {
    activeEpisode = index;
    episodeCards.forEach((card, i) => {
      card.classList.toggle('is-active', index === i);
      card.querySelector('button').setAttribute('aria-pressed', String(index === i));
    });
    target.append(episodeProduct);
  }
  if (align && narrow.matches) {
    const offset = target.offsetLeft - (episodes.clientWidth - target.offsetWidth) / 2;
    episodes.scrollTo({ left: offset, behavior: 'instant' });
  }
}

function configureMotion() {
  document.documentElement.classList.toggle('has-motion', !reduced.matches);
  if (reduced.matches) {
    [heroFirst, heroSecond, bottleFrame, bottleCopy, storyEyebrow, pillFrame, pillFigure, pillCopy, pillSlices, ...pillCallouts, landing, travelingPill]
      .forEach((element) => element.removeAttribute('style'));
  }
  lastScrollY = NaN;
  schedule(true);
}

previous.addEventListener('click', () => changeRail(-1));
next.addEventListener('click', () => changeRail(1));
rail.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  changeRail(event.key === 'ArrowRight' ? 1 : -1);
});
rail.addEventListener('scroll', () => {
  if (commandedRail !== null && Math.abs(rail.scrollLeft - commandedRail) <= 1) {
    commandedRail = null;
  } else if (!reduced.matches && metrics) {
    commandedRail = null;
    railBias = rail.scrollLeft - railBase(window.scrollY);
  }
  schedule();
}, { passive: true });

ingredientRows.forEach((row, index) => {
  row.firstElementChild.addEventListener('click', () => {
    if (reduced.matches || !metrics) {
      setIngredient(index);
      return;
    }
    const position = (index + .08) / 3.6;
    window.scrollTo({ top: metrics.ingredientTop + metrics.ingredientRun * position, behavior: 'smooth' });
  });
});

episodeCards.forEach((card, index) => {
  card.querySelector('button').addEventListener('click', () => {
    setEpisode(index);
    if (narrow.matches) card.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced.matches ? 'instant' : 'smooth' });
  });
});
episodes.addEventListener('scroll', () => {
  if (!narrow.matches) return;
  clearTimeout(episodeSettleTimer);
  episodeSettleTimer = setTimeout(() => {
    const center = episodes.scrollLeft + episodes.clientWidth / 2;
    const nearest = episodeCards.reduce((best, card, index) => {
      const delta = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      return delta < best.delta ? { index, delta } : best;
    }, { index: activeEpisode, delta: Infinity });
    setEpisode(nearest.index);
  }, 120);
}, { passive: true });

for (const anchor of items('a[href^="#"]')) {
  anchor.addEventListener('click', (event) => {
    const href = anchor.getAttribute('href');
    const section = document.getElementById(href.slice(1));
    if (!section) return;
    event.preventDefault();
    if (section === routine) {
      railBias = 0;
      rail.scrollLeft = 0;
      commandedRail = 0;
    }
    if (location.hash !== href) history.pushState(null, '', href);
    section.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth' });
  });
}

window.addEventListener('scroll', () => schedule(), { passive: true });
window.addEventListener('resize', () => schedule(true), { passive: true });
reduced.addEventListener('change', configureMotion);
narrow.addEventListener('change', () => requestAnimationFrame(() => setEpisode(activeEpisode, true)));
new ResizeObserver(() => schedule(true)).observe(document.querySelector('main'));
const prepareIngredientPhotos = new IntersectionObserver((entries, observer) => {
  if (!entries.some((entry) => entry.isIntersecting)) return;
  ingredientPhotos.forEach((photo) => {
    photo.querySelectorAll('img').forEach((image) => image.decode().catch(() => {}));
  });
  observer.disconnect();
}, { rootMargin: '150% 0px' });
prepareIngredientPhotos.observe(ingredients);
document.fonts?.ready.then(() => schedule(true));

configureMotion();
requestAnimationFrame(() => setEpisode(1, true));
