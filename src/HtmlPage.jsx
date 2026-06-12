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

export default function HtmlPage({ pageName }) {
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const styleRefs = useRef([]);
  const scriptRefs = useRef([]);
  const pendingScripts = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    cleanInjectedNodes(styleRefs.current);

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
          setContent(fixedHtml);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setError('Unable to load page');
        }
      }
    }

    loadPage();

    return () => {
      active = false;
      cleanInjectedNodes(styleRefs.current);
      cleanInjectedNodes(scriptRefs.current);
      pendingScripts.current = [];
    };
  }, [pageName]);

  useEffect(() => {
    if (!content) return;
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
  }, [content]);

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
  }, [navigate, content]);

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
  }, [content]);

  return (
    <div ref={containerRef} dangerouslySetInnerHTML={{ __html: error ? `<div style="padding: 48px; color: #fff; text-align:center;">${error}</div>` : content }} />
  );
}