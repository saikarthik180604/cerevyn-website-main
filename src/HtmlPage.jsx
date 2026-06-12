import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const pageRoutes = {
  'index.html': '/',
  'about.html': '/about',
  'services.html': '/services',
  'products.html': '/products',
  'Tutorials.html': '/tutorials',
  'Blogs.html': '/blogs',
  'careers.html': '/careers',
  'contact.html': '/contact'
};

const htmlRoot = '/pages/';

function normalizeRoute(href) {
  if (!href) return null;
  if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
    return null;
  }

  const normalized = href.replace(/^\.\//, '').replace(/^\//, '');
  if (normalized.startsWith('#')) {
    return null;
  }

  const [pathPart, hashPart] = normalized.split('#');
  const pageKey = pathPart;
  const mapped = pageRoutes[pageKey] || pageRoutes[pageKey.toLowerCase()];
  const route = mapped || `/${pageKey.replace(/\.html$/i, '').toLowerCase()}`;
  return hashPart ? `${route}#${hashPart}` : route;
}

function injectStyles(doc, styleRefs) {
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  const styles = Array.from(doc.querySelectorAll('style'));

  links.forEach(link => {
    // BLOCK: Do not inject Google Fonts links to prevent competition with Geist
    if (link.href.includes('fonts.googleapis.com')) return;
    
    const node = document.createElement('link');
    node.rel = 'stylesheet';
    node.href = link.href;
    document.head.appendChild(node);
    styleRefs.push(node);
  });

  styles.forEach(style => {
    // SANITIZER: Strip 'font-family' rules from legacy styles before injection
    let cssText = style.textContent;
    // This removes any declaration like 'font-family: ...;'
    cssText = cssText.replace(/font-family\s*:[^;}]*;/gi, '');
    
    const node = document.createElement('style');
    node.textContent = cssText;
    document.head.appendChild(node);
    styleRefs.push(node);
  });
}

function collectScripts(doc) {
  return Array.from(doc.querySelectorAll('script')).map(script => ({
    src: script.src || null,
    type: script.type || null,
    async: script.async || false,
    defer: script.defer || false,
    noModule: script.noModule || false,
    content: script.src ? null : script.textContent || ''
  }));
}

function cleanInjectedNodes(nodes) {
  nodes.forEach(node => node.remove());
  nodes.length = 0;
}

function dispatchDOMContentLoaded() {
  if (document.readyState !== 'loading') {
    const event = new Event('DOMContentLoaded', {
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }
}

function fixAssetPaths(html) {
  return html
    .replace(/src="\.\//g, 'src="/')
    .replace(/src="assets\//g, 'src="/assets/')
    .replace(/href="\.\//g, 'href="/')
    .replace(/href="assets\//g, 'href="/assets/')
    .replace(/url\("\.\//g, 'url("/')
    .replace(/url\('\.\//g, "url('/")
    .replace(/url\(\.\//g, 'url(/')
    .replace(/url\("assets\//g, 'url("/assets/')
    .replace(/url\('assets\//g, "url('/assets/")
    .replace(/url\(assets\//g, 'url(/assets/');
}

import morphdom from 'morphdom';

export default function HtmlPage({ pageName }) {
  const [updateTick, setUpdateTick] = useState(0);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const styleRefs = useRef([]);
  const scriptRefs = useRef([]);
  const pendingScripts = useRef([]);
  const navigate = useNavigate();

  // Clean up all styles and scripts on component unmount
  useEffect(() => {
    return () => {
      cleanInjectedNodes(styleRefs.current);
      cleanInjectedNodes(scriptRefs.current);
    };
  }, []);

  useEffect(() => {
    let active = true;

    // Save previous refs to clean them up after new content is rendered
    const prevStyles = [...styleRefs.current];
    const prevScripts = [...scriptRefs.current];

    styleRefs.current = [];
    scriptRefs.current = [];

    async function loadPage() {
      try {
        const response = await fetch(`${htmlRoot}${pageName}`);
        if (!response.ok) {
          throw new Error('Failed to load page');
        }

        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const title = doc.querySelector('title')?.textContent;
        if (title) {
          document.title = title;
        }

        injectStyles(doc, styleRefs.current);
        pendingScripts.current = collectScripts(doc);

        const bodyHtml = doc.body ? doc.body.innerHTML : text;
        const fixedHtml = fixAssetPaths(bodyHtml);

        if (active) {
          setError(null);
          
          // Wait for next paint to avoid blinking/FOUC
          requestAnimationFrame(() => {
            setTimeout(() => {
              if (containerRef.current) {
                if (!containerRef.current.hasChildNodes()) {
                  containerRef.current.innerHTML = fixedHtml;
                } else {
                  const newDiv = document.createElement('div');
                  newDiv.innerHTML = fixedHtml;
                  morphdom(containerRef.current, newDiv, {
                    childrenOnly: true
                  });
                }
                setUpdateTick(t => t + 1);
              }
              cleanInjectedNodes(prevStyles);
              cleanInjectedNodes(prevScripts);
            }, 50);
          });
        } else {
          // If aborted, clean up the newly injected styles
          cleanInjectedNodes(styleRefs.current);
        }
      } catch (err) {
        if (active) {
          setError('Unable to load page');
          cleanInjectedNodes(prevStyles);
          cleanInjectedNodes(prevScripts);
        }
      }
    }

    loadPage();

    return () => {
      active = false;
    };
  }, [pageName]);

  useEffect(() => {
    if (updateTick === 0) return;
    if (pendingScripts.current.length === 0) return;

    const scripts = [...pendingScripts.current];
    pendingScripts.current = [];

    const loadScript = index => {
      const scriptData = scripts[index];
      const script = document.createElement('script');

      if (scriptData.type) {
        script.type = scriptData.type;
      }
      if (scriptData.noModule) {
        script.noModule = true;
      }
      if (scriptData.src) {
        script.src = scriptData.src;
        script.async = false;
        script.defer = scriptData.defer;
        script.onload = () => {
          scriptRefs.current.push(script);
          if (index + 1 < scripts.length) {
            loadScript(index + 1);
          } else {
            dispatchDOMContentLoaded();
          }
        };
        script.onerror = () => {
          scriptRefs.current.push(script);
          if (index + 1 < scripts.length) {
            loadScript(index + 1);
          } else {
            dispatchDOMContentLoaded();
          }
        };
        document.head.appendChild(script);
      } else {
        script.textContent = scriptData.content;
        document.head.appendChild(script);
        scriptRefs.current.push(script);
        if (index + 1 < scripts.length) {
          loadScript(index + 1);
        } else {
          dispatchDOMContentLoaded();
        }
      }
    };

    loadScript(0);
  }, [updateTick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = event => {
      const anchor = event.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      const route = normalizeRoute(href);
      if (!route) return;

      event.preventDefault();
      navigate(route);
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [navigate, updateTick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const nav = container.querySelector('nav');
    const scrollEls = Array.from(container.querySelectorAll('.animate-on-scroll'));

    const updateNav = () => {
      if (!nav) return;
      if (window.scrollY > 30) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };

    if (nav) {
      nav.classList.add('ready');
      updateNav();
      window.addEventListener('scroll', updateNav, { passive: true });
    }

    let observer = null;
    if ('IntersectionObserver' in window && scrollEls.length > 0) {
      observer = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('active');
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.18 }
      );
      scrollEls.forEach(el => observer.observe(el));
    } else {
      scrollEls.forEach(el => el.classList.add('active'));
    }

    window.scrollTo(0, 0);

    return () => {
      if (nav) {
        window.removeEventListener('scroll', updateNav);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [updateTick]);

  return (
    <>
      {error && <div style={{ padding: '48px', color: '#fff', textAlign: 'center' }}>{error}</div>}
      <div ref={containerRef} style={{ display: error ? 'none' : 'block' }} />
    </>
  );
}