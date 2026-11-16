// Shows the marquee's Pause button and toggles the loop. Without JavaScript
// the button stays hidden and the loop still pauses on hover and focus; under
// reduced motion the CSS stops the loop and hides the button.
export function init(): void {
  const root = document.querySelector<HTMLElement>('[data-marquee]');
  const button = root?.querySelector<HTMLButtonElement>('[data-marquee-toggle]');
  if (!root || !button) return;
  button.hidden = false;
  button.addEventListener('click', () => {
    const paused = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(paused));
    root.classList.toggle('is-paused', paused);
  });
}
