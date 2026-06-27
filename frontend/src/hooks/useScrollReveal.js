import { useEffect } from 'react';

/**
 * Adds .visible class to elements with .reveal class when they scroll into view.
 * Usage: add className="reveal" to any element, call useScrollReveal() in the page.
 */
const useScrollReveal = (selector = '.reveal') => {
  useEffect(() => {
    const els = document.querySelectorAll(selector);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Only animate once
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [selector]);
};

export default useScrollReveal;
