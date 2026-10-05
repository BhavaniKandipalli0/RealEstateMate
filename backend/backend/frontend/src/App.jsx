import React, { useState, useEffect } from 'react';
import { Home as HomeIcon, PlusCircle, Building, Sparkles } from 'lucide-react';
import Home from './pages/Home';
import PropertyDetail from './pages/PropertyDetail';
import AddProperty from './pages/AddProperty';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'add', or 'property-<id>'
  const [healthStatus, setHealthStatus] = useState({
    database: 'Checking...',
    vectorDb: 'Checking...',
    gemini: 'Checking...',
    isDemoMode: true
  });

  // Query health status of backend adapters on load
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        const data = await res.json();
        setHealthStatus({
          database: data.database,
          vectorDb: data.vectorDb,
          gemini: data.gemini,
          isDemoMode: data.gemini.includes('Mock')
        });
      } catch (err) {
        console.error('Failed to connect to backend health status:', err);
        setHealthStatus({
          database: 'Offline',
          vectorDb: 'Offline',
          gemini: 'Offline',
          isDemoMode: true
        });
      }
    };

    checkHealth();
  }, [currentPage]);

  // Navigate to property detail page
  const handleViewProperty = (id) => {
    setCurrentPage(`property-${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listing creation handler
  const handleListingCreated = () => {
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateHome = (e) => {
    e.preventDefault();
    setCurrentPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateAdd = (e) => {
    e.preventDefault();
    setCurrentPage('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <nav className="navbar">
        <a href="#" onClick={handleNavigateHome} className="nav-brand">
          <Building size={28} className="gradient-text" style={{ WebkitTextFillColor: 'initial' }} />
          <span>RealEstate<span className="gradient-text">Mate</span></span>
        </a>

        <div className="nav-links">
          <a
            href="#"
            onClick={handleNavigateHome}
            className={`nav-link ${currentPage === 'home' ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HomeIcon size={16} /> Home
            </span>
          </a>

          <a
            href="#"
            onClick={handleNavigateAdd}
            className={`nav-link ${currentPage === 'add' ? 'active' : ''}`}
          >
            <PlusCircle size={16} />
            <span>List Property</span>
          </a>
        </div>
      </nav>

      {/* Main Page Routing */}
      <main style={{ flexGrow: 1 }}>
        {currentPage === 'home' && (
          <Home onViewProperty={handleViewProperty} />
        )}

        {currentPage === 'add' && (
          <AddProperty
            onBack={() => setCurrentPage('home')}
            onListingCreated={handleListingCreated}
          />
        )}

        {currentPage.startsWith('property-') && (
          <PropertyDetail
            propertyId={currentPage.replace('property-', '')}
            onBack={() => setCurrentPage('home')}
            onViewProperty={handleViewProperty}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-light)', padding: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', background: 'var(--bg-main)' }}>
        <p>&copy; {new Date().getFullYear()} RealEstateMate. Built with Google Gemini AI Studio.</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.2)' }}>
          DB: {healthStatus.database} | Vectors: {healthStatus.vectorDb} | AI: {healthStatus.gemini}
        </p>
      </footer>
    </div>
  );
}
