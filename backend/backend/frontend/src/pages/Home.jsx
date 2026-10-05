import React, { useState, useEffect } from 'react';
import { Search, Home as HomeIcon, MapPin, BedDouble, Bath, Maximize, TrendingUp, Sparkles, Filter } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function Home({ onViewProperty }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [beds, setBeds] = useState('');
  const [location, setLocation] = useState('');

  // Fetch properties on mount or when filters change
  const fetchProperties = async (useFilters = false) => {
    setLoading(true);
    try {
      let url = `${API_BASE}/properties`;
      const params = [];

      if (useFilters) {
        if (searchQuery.trim()) params.push(`query=${encodeURIComponent(searchQuery)}`);

        if (priceRange) {
          const [min, max] = priceRange.split('-');
          if (min) params.push(`minPrice=${min}`);
          if (max) params.push(`maxPrice=${max}`);
        }

        if (beds) params.push(`beds=${beds}`);
        if (location) params.push(`location=${encodeURIComponent(location)}`);
      }

      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setProperties(data);
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties(false);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProperties(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setPriceRange('');
    setBeds('');
    setLocation('');
    // Delay slightly to allow state to reset
    setTimeout(() => {
      fetchProperties(false);
    }, 50);
  };

  const formatPrice = (val) => {
    return `₹${Number(val).toLocaleString("en-IN")}`;
  };
  return (
    <div className="home-container">
      {/* Hero Banner with Semantic Search */}
      <section className="hero-section glass">
        <div className="hero-glow"></div>
        <h1 className="hero-title">
          Find Your Perfect Property
        </h1>

        <form className="search-console" onSubmit={handleSearchSubmit}>
          <div className="semantic-search-bar">
            <Search className="search-icon" size={24} />
            <input
              type="text"
              className="semantic-search-input"
              placeholder="Describe your dream lifestyle... (e.g. quiet sunlit backyard for my dogs)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="search-submit-btn">
              <Search size={18} />
            </button>
          </div>

          <div className="filters-row">
            {/* Price Filter */}
            <select
              className="filter-select"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
            >
              <option value="">Any Price Range</option>
              <option value="0-350000">Under $350k</option>
              <option value="350000-700000">$350k - $700k</option>
              <option value="700000-1500000">$700k - $1.5M</option>
              <option value="1500000-999999999">$1.5M+</option>
            </select>

            {/* Beds Filter */}
            <select
              className="filter-select"
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
            >
              <option value="">Any Bedrooms</option>
              <option value="1">1 Bedroom / Studio</option>
              <option value="2">2 Bedrooms</option>
              <option value="3">3 Bedrooms</option>
              <option value="4">4+ Bedrooms</option>
            </select>

            {/* Location / Area Filter */}
            <select
              className="filter-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Any Location</option>
              <option value="downtown">Downtown</option>
              <option value="oakridge">Oakridge (Suburbs)</option>
              <option value="arts district">Arts District</option>
              <option value="marina bay">Marina Bay</option>
              <option value="green valley">Green Valley</option>
              <option value="sunset hills">Sunset Hills</option>
              <option value="historic quarter">Historic Quarter</option>
            </select>

            {/* Reset Button */}
            {(searchQuery || priceRange || beds || location) && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}
                onClick={handleResetFilters}
              >
                Reset Filters
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Property Listing Grid */}
      <section>
        <div className="section-header">
          <h2>
            {searchQuery ? 'AI Recommended Matches' : 'Featured Properties'}
            <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.75rem' }}>
              ({properties.length} found)
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="text-loading">
            <div className="spinner"></div>
            Searching listings...
          </div>
        ) : properties.length === 0 ? (
          <div className="no-results glass">
            <HomeIcon size={48} style={{ marginBottom: '1rem', color: 'var(--text-muted)' }} />
            <p>No properties match your search criteria. Try adjusting your description or filters.</p>
            <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={handleResetFilters}>
              Clear Search
            </button>
          </div>
        ) : (
          <div className="property-grid">
            {properties.map((property) => (
              <div key={property.id} className="property-card glass">
                <div className="card-image-wrapper">
                  <img
                    src={property.images[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'}
                    alt={property.title}
                    className="card-image"
                    loading="lazy"
                  />
                  {property.matchScore !== undefined && (
                    <div className="match-score-badge">
                      <Sparkles size={12} />
                      {property.matchScore}% Match
                    </div>
                  )}
                </div>

                <div className="card-content">
                  <h3 className="card-title">{property.title}</h3>
                  <div className="card-address">
                    <MapPin size={14} />
                    {property.address}
                  </div>

                  <div className="card-specs">
                    <div className="spec-item">
                      <BedDouble size={16} />
                      <span>{property.beds} {property.beds === 1 ? 'Bed' : 'Beds'}</span>
                    </div>
                    <div className="spec-item">
                      <Bath size={16} />
                      <span>{property.baths} {property.baths === 1 ? 'Bath' : 'Baths'}</span>
                    </div>
                    <div className="spec-item">
                      <Maximize size={16} />
                      <span>{property.sqft} sq ft</span>
                    </div>
                  </div>

                  <p className="card-desc">{property.description}</p>

                  <div className="card-footer">
                    {property.investmentScore && (
                      <span className={`investment-tag ${property.investmentScore.rating.toLowerCase().includes('fair') ? 'fair' : ''}`}>
                        <TrendingUp size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                        {property.investmentScore.rating.split(' ')[0]} Yield ({property.investmentScore.yieldRate}%)
                      </span>
                    )}
                    <button
                      className="view-details-btn"
                      onClick={() => onViewProperty(property.id)}
                    >
                      View Details &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
