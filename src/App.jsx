import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HtmlPage from './HtmlPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HtmlPage pageName="index.html" />} />
        <Route path="/about" element={<HtmlPage pageName="about.html" />} />
        <Route path="/services" element={<HtmlPage pageName="services.html" />} />
        <Route path="/products" element={<HtmlPage pageName="products.html" />} />
        <Route path="/tutorials" element={<HtmlPage pageName="Tutorials.html" />} />
        <Route path="/blogs" element={<HtmlPage pageName="Blogs.html" />} />
        <Route path="/careers" element={<HtmlPage pageName="careers.html" />} />
        <Route path="/contact" element={<HtmlPage pageName="contact.html" />} />

        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="/about.html" element={<Navigate to="/about" replace />} />
        <Route path="/services.html" element={<Navigate to="/services" replace />} />
        <Route path="/products.html" element={<Navigate to="/products" replace />} />
        <Route path="/Tutorials.html" element={<Navigate to="/tutorials" replace />} />
        <Route path="/Blogs.html" element={<Navigate to="/blogs" replace />} />
        <Route path="/careers.html" element={<Navigate to="/careers" replace />} />
        <Route path="/contact.html" element={<Navigate to="/contact" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
