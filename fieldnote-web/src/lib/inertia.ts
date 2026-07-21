type Cleanup = () => void;

const FRICTION = 0.95;
const MIN_SPEED = 0.5;
const FRAME_MS = 16.67;

export function applyInertiaScroll(el: HTMLElement): Cleanup {
  let pointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityX = 0;
  let velocityY = 0;
  let frame: number | null = null;
  const previousTouchAction = el.style.touchAction;

  el.style.touchAction = 'none';

  const stopMomentum = () => {
    if (frame === null) return;
    cancelAnimationFrame(frame);
    frame = null;
  };

  const step = () => {
    const speed = Math.hypot(velocityX, velocityY);
    if (speed < MIN_SPEED) {
      frame = null;
      return;
    }

    const previousLeft = el.scrollLeft;
    const previousTop = el.scrollTop;

    el.scrollLeft -= velocityX;
    el.scrollTop -= velocityY;

    if (el.scrollLeft === previousLeft) velocityX = 0;
    if (el.scrollTop === previousTop) velocityY = 0;

    velocityX *= FRICTION;
    velocityY *= FRICTION;
    frame = requestAnimationFrame(step);
  };

  const startMomentum = () => {
    stopMomentum();
    frame = requestAnimationFrame(step);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (pointerId !== null || event.button !== 0) return;

    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    lastTime = event.timeStamp;
    velocityX = 0;
    velocityY = 0;
    stopMomentum();
    el.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;

    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    const deltaTime = Math.max(event.timeStamp - lastTime, 1);

    el.scrollLeft -= deltaX;
    el.scrollTop -= deltaY;
    velocityX = (deltaX / deltaTime) * FRAME_MS;
    velocityY = (deltaY / deltaTime) * FRAME_MS;
    lastX = event.clientX;
    lastY = event.clientY;
    lastTime = event.timeStamp;
    event.preventDefault();
  };

  const onPointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return;

    if (el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }

    pointerId = null;
    startMomentum();
  };

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove, { passive: false });
  el.addEventListener('pointerup', onPointerEnd);
  el.addEventListener('pointercancel', onPointerEnd);
  el.addEventListener('lostpointercapture', onPointerEnd);

  return () => {
    stopMomentum();
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerEnd);
    el.removeEventListener('pointercancel', onPointerEnd);
    el.removeEventListener('lostpointercapture', onPointerEnd);
    el.style.touchAction = previousTouchAction;
    pointerId = null;
  };
}

export function useInertiaRef() {
  let cleanup: Cleanup | null = null;

  return (element: HTMLElement | null) => {
    cleanup?.();
    cleanup = element ? applyInertiaScroll(element) : null;
  };
}
