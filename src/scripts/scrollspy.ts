/**
 * Marks the nav link of the section currently in view with aria-current.
 */
export function initScrollSpy(): void {
  const links = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>('[data-nav-link]').forEach((link) => {
    links.set(link.dataset.navLink ?? '', link);
  });

  const setActive = (id: string) => {
    links.forEach((link, linkId) => {
      if (linkId === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) setActive(top.target.id);
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );

  document.querySelectorAll<HTMLElement>('[data-section]').forEach((section) => observer.observe(section));
}
