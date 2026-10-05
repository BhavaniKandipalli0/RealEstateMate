import React, { useState } from 'react';
import { Sparkles, Save, FileText, ArrowLeft, Image as ImageIcon } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function AddProperty({ onBack, onListingCreated }) {
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [beds, setBeds] = useState('2');
  const [baths, setBaths] = useState('1.5');
  const [sqft, setSqft] = useState('');
  const [yieldRate, setYieldRate] = useState('5.5');
  const [amenities, setAmenities] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // AI Description Generator states
  const [rawFeatures, setRawFeatures] = useState('');
  const [description, setDescription] = useState('');
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [savingListing, setSavingListing] = useState(false);

  const handleGenerateDescription = async (e) => {
    e.preventDefault();
    if (!rawFeatures.trim()) return;

    setGeneratingDesc(true);
    try {
      const res = await fetch(`${API_BASE}/properties/generate-desc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawFeatures })
      });
      const data = await res.json();
      setDescription(data.description);
    } catch (err) {
      console.error('Error generating description:', err);
      alert('Failed to generate listing description. Using fallback.');
    } finally {
      setGeneratingDesc(false);
    }
  };

  const handleSaveListing = async (e) => {
    e.preventDefault();

    if (!title.trim() || !address.trim() || !price) {
      alert('Please fill out the Title, Address, and Price fields.');
      return;
    }

    setSavingListing(true);
    try {
      const parsedAmenities = amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      const payload = {
        title,
        address,
        price: parseFloat(price),
        beds: parseInt(beds),
        baths: parseFloat(baths),
        sqft: parseFloat(sqft) || 0,
        averageRentalYield: parseFloat(yieldRate) || 5.0,
        amenities: parsedAmenities,
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        rawFeatures,
        description
      };

      const res = await fetch(`${API_BASE}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Save listing failed');
      }

      alert('Listing created successfully!');
      onListingCreated();
    } catch (err) {
      console.error('Error saving property:', err);
      alert('Failed to create property listing.');
    } finally {
      setSavingListing(false);
    }
  };

  // Pre-fill beautiful Unsplash image utility
  const handlePreFillImage = (type) => {
    const images = {
      apartment: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      house: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      villa: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'
    };
    setImageUrl(images[type]);
  };

  return (
    <div className="add-container">
      {/* Back to Home Button */}
      <button onClick={onBack} className="back-link">
        <ArrowLeft size={16} /> Back to Listings
      </button>

      <h1 className="add-title">List a New Property</h1>

      <div className="form-card glass">
        <form onSubmit={handleSaveListing}>
          <div className="form-grid">
            
            {/* Title */}
            <div className="form-group full-width">
              <label className="form-label">Property Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Modern Penthouse with Rooftop Deck"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Address */}
            <div className="form-group full-width">
              <label className="form-label">Property Address</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 102 Sunset Lane, Sunset Hills"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            {/* Price */}
            <div className="form-group">
              <label className="form-label">Price ($)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 450000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>

            {/* Square Feet */}
            <div className="form-group">
              <label className="form-label">Square Feet</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 1800"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
              />
            </div>

            {/* Bedrooms */}
            <div className="form-group">
              <label className="form-label">Bedrooms</label>
              <select
                className="form-select"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
              >
                <option value="1">1 Bed / Studio</option>
                <option value="2">2 Beds</option>
                <option value="3">3 Beds</option>
                <option value="4">4+ Beds</option>
              </select>
            </div>

            {/* Bathrooms */}
            <div className="form-group">
              <label className="form-label">Bathrooms</label>
              <select
                className="form-select"
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
              >
                <option value="1">1.0 Bath</option>
                <option value="1.5">1.5 Baths</option>
                <option value="2">2.0 Baths</option>
                <option value="2.5">2.5 Baths</option>
                <option value="3">3.0+ Baths</option>
              </select>
            </div>

            {/* Average Rental Yield */}
            <div className="form-group">
              <label className="form-label">Average Rental Yield for Area (%)</label>
              <input
                type="number"
                step="0.1"
                className="form-input"
                placeholder="e.g. 5.5"
                value={yieldRate}
                onChange={(e) => setYieldRate(e.target.value)}
              />
            </div>

            {/* Amenities */}
            <div className="form-group">
              <label className="form-label">Amenities (Comma separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pool, Gym, Solar Panels, Backyard"
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
              />
            </div>

            {/* Image URL */}
            <div className="form-group full-width">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Image URL
                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                  Quick Fill Unsplash: 
                  <span onClick={() => handlePreFillImage('apartment')} style={{ color: 'var(--color-primary)', cursor: 'pointer', margin: '0 4px', textDecoration: 'underline' }}>Apartment</span> | 
                  <span onClick={() => handlePreFillImage('house')} style={{ color: 'var(--color-primary)', cursor: 'pointer', margin: '0 4px', textDecoration: 'underline' }}>House</span> | 
                  <span onClick={() => handlePreFillImage('villa')} style={{ color: 'var(--color-primary)', cursor: 'pointer', margin: '0 4px', textDecoration: 'underline' }}>Villa</span>
                </span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <ImageIcon size={18} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="url"
                  className="form-input"
                  style={{ flexGrow: 1 }}
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* AI Listing Description Panel */}
          <div className="form-desc-generator">
            <div className="desc-gen-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1rem', margin: 0 }}>
                <Sparkles size={16} className="gradient-text" style={{ WebkitTextFillColor: 'initial' }} />
                AI Marketing Copy Generator
              </h3>
              <button
                type="button"
                className="desc-gen-btn"
                onClick={handleGenerateDescription}
                disabled={generatingDesc || !rawFeatures.trim()}
              >
                {generatingDesc ? (
                  <>
                    <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate Description
                  </>
                )}
              </button>
            </div>
            
            <div className="form-group" style={{ gap: '0.25rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Raw Property Features / Keywords</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 3 Bed, 2 Bath, Pool, $450k, quiet garden, top school district"
                value={rawFeatures}
                onChange={(e) => setRawFeatures(e.target.value)}
              />
            </div>
          </div>

          {/* Description Text Box (Target of AI generation) */}
          <div className="form-group full-width" style={{ marginBottom: '2.5rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} style={{ color: 'var(--color-primary)' }} />
              Marketing Description
            </label>
            <textarea
              className="form-textarea"
              placeholder="Paste generated text here or write your own. AI generator above helps you draft it automatically."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          {/* Submit Actions */}
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onBack}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={savingListing}>
              {savingListing ? (
                <>
                  <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', marginRight: '6px' }}></div>
                  Saving Listing...
                </>
              ) : (
                <>
                  <Save size={16} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                  Create Listing
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
