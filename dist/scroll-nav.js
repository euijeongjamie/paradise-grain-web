const header = document.querySelector('.site-header');
const topThreshold = 10;
const scrollPosition = () => Math.max(0, window.scrollY);
let previousY = scrollPosition();
let direction = 0;
let distance = 0;
let hidden = previousY > topThreshold;

function updateHeader() {
  const y = scrollPosition();
  const delta = y - previousY;
  previousY = y;

  if (y <= topThreshold) {
    hidden = false;
    direction = 0;
    distance = 0;
  } else if (delta !== 0) {
    const nextDirection = Math.sign(delta);
    distance = nextDirection === direction ? distance + Math.abs(delta) : Math.abs(delta);
    direction = nextDirection;
    if (distance >= (direction > 0 ? 20 : 12)) hidden = direction > 0;
  }

  header.classList.toggle('is-scrolled', y > topThreshold);
  header.classList.toggle('is-hidden', hidden);
}

updateHeader();
document.documentElement.classList.add('has-scroll-nav');
window.addEventListener('scroll', updateHeader, { passive: true });
window.addEventListener('pageshow', updateHeader);
