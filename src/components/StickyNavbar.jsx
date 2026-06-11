import { useEffect, useState } from 'react';
import './StickyNavbar.css';

const links = [
  { label: 'Home', href: '#' },
  { label: 'Services', href: '#learn-more' },
  { label: 'Products', href: '#product' },
  { label: 'Resources', href: '#resources' },
  { label: 'Careers', href: '#careers' },
  { label: 'Contact', href: '#contact' }
];

const StickyNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }, [mobileOpen]);

  return (
    <header className={`sticky-navbar ${scrolled ? 'sticky' : ''}`}>
      <div className="sticky-navbar__inner">
        <a className="sticky-navbar__brand" href="#top">
          <span className="sticky-navbar__mark">C</span>
          <span className="sticky-navbar__name">Cerevyn</span>
        </a>

        <button
          type="button"
          className={`sticky-navbar__toggle ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(prev => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`sticky-navbar__nav ${mobileOpen ? 'open' : ''}`}>
          <ul>
            {links.map(link => (
              <li key={link.label}>
                <a href={link.href} onClick={() => setMobileOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <a className="sticky-navbar__cta" href="#contact">
          Talk to Sales
        </a>
      </div>
    </header>
  );
};

export default StickyNavbar;
