import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, Send, X, ShieldAlert, Sparkles, TrendingUp, DollarSign, Calendar, Dog, Info, HelpCircle, MapPin, BedDouble, Bath, Maximize, Copy } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

export default function PropertyDetail({ propertyId, onBack, onViewProperty }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Lease summary upload state
  const [leaseText, setLeaseText] = useState('');
  const [summarizingLease, setSummarizingLease] = useState(false);

  // RAG Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Similarity Recommendations states
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  // Multi-language translation states
  const [selectedLang, setSelectedLang] = useState('English');
  const [translatedDetails, setTranslatedDetails] = useState(null);
  const [translating, setTranslating] = useState(false);

  // Negotiation Email Modal states
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [offeredPrice, setOfferedPrice] = useState('');
  const [offerRationale, setOfferRationale] = useState('');
  const [draftedEmail, setDraftedEmail] = useState(null);
  const [draftingEmail, setDraftingEmail] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/properties/${propertyId}`);
        const data = await res.json();
        setProperty(data);

        // Reset translation states
        setSelectedLang('English');
        setTranslatedDetails(null);

        // Initialize Chat Messages
        setMessages([
          {
            id: 'welcome',
            sender: 'bot',
            text: `Hi! I am RealEstateMate's RAG Assistant. Ask me any question about "${data.title}" (e.g. "Is there a gym?", "What is the pet policy?", "Are there hidden fees?") and I'll find the details for you.`
          }
        ]);

        // Fetch Recommendations
        setLoadingRecs(true);
        const recRes = await fetch(`${API_BASE}/properties/${propertyId}/recommendations`);
        const recData = await recRes.json();
        setRecommendations(recData);
      } catch (err) {
        console.error('Error fetching property details:', err);
      } finally {
        setLoading(false);
        setLoadingRecs(false);
      }
    };

    fetchProperty();
  }, [propertyId]);

  // Scroll chat window to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, botTyping]);

  if (loading) {
    return (
      <div className="detail-container text-loading">
        <div className="spinner"></div>
        Loading property details...
      </div>
    );
  }

  if (!property) {
    return (
      <div className="detail-container">
        <button onClick={onBack} className="back-link">
          <ChevronLeft size={16} /> Back to Listings
        </button>
        <div className="no-results glass">
          <h2>Property not found</h2>
          <p>We could not find the property details you were looking for.</p>
        </div>
      </div>
    );
  }

  // Carousel Navigation
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  };

  // Lease term summarizer
  const handleSummarizeLease = async (e) => {
    e.preventDefault();
    if (!leaseText.trim()) return;

    setSummarizingLease(true);
    try {
      // 1. Post to lease summarize endpoint
      const res = await fetch(`${API_BASE}/properties/summarize-lease`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseText })
      });
      const leaseSummary = await res.json();

      // 2. Save the updated lease summary in the database
      const saveRes = await fetch(`${API_BASE}/properties/${property.id}/lease-summary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaseSummary })
      });
      const updatedProperty = await saveRes.json();

      // 3. Update local state
      setProperty(updatedProperty);
      setLeaseText('');
    } catch (err) {
      console.error('Error summarizing lease:', err);
      alert('Failed to summarize lease. Please try again.');
    } finally {
      setSummarizingLease(false);
    }
  };

  // Property Q&A chatbot
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsgText = inputMessage;
    const userMsgId = Date.now().toString();

    // Add user message to state
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: userMsgText }]);
    setInputMessage('');
    setBotTyping(true);

    try {
      const res = await fetch(`${API_BASE}/properties/${property.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsgText })
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { id: Date.now() + '-bot', sender: 'bot', text: data.answer }
      ]);
    } catch (err) {
      console.error('Error chatting with property chatbot:', err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + '-bot-err', sender: 'bot', text: 'Sorry, I encountered an error searching property documents. Please ask again.' }
      ]);
    } finally {
      setBotTyping(false);
    }
  };

  // Handle language translation
  const handleTranslate = async (lang) => {
    if (lang === 'English') {
      setSelectedLang('English');
      setTranslatedDetails(null);
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch(`${API_BASE}/properties/${property.id}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLanguage: lang })
      });
      const data = await res.json();
      setTranslatedDetails(data);
      setSelectedLang(lang);
    } catch (err) {
      console.error('Error translating property:', err);
      alert('Failed to translate property details. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  // Handle draft offer email
  const handleDraftOffer = async (e) => {
    e.preventDefault();
    if (!buyerName.trim() || !offeredPrice) {
      alert('Please enter Buyer Name and Offered Price.');
      return;
    }

    setDraftingEmail(true);
    setCopied(false);
    try {
      const res = await fetch(`${API_BASE}/properties/${property.id}/draft-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerName,
          offeredPrice: parseFloat(offeredPrice),
          rationale: offerRationale
        })
      });
      const data = await res.json();
      setDraftedEmail(data);
    } catch (err) {
      console.error('Error drafting offer email:', err);
      alert('Failed to draft offer email. Please try again.');
    } finally {
      setDraftingEmail(false);
    }
  };

  // Copy email body to clipboard
  const handleCopyEmail = () => {
    if (!draftedEmail) return;
    const textToCopy = `Subject: ${draftedEmail.subject}\n\n${draftedEmail.body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close offer modal & reset states
  const handleCloseOfferModal = () => {
    setOfferModalOpen(false);
    setDraftedEmail(null);
    setBuyerName('');
    setOfferedPrice('');
    setOfferRationale('');
  };

  return (
    <div className="detail-container">
      {/* Back to Home Button */}
      <button onClick={onBack} className="back-link">
        <ChevronLeft size={18} /> Back to Listings
      </button>

      {/* Image Gallery Carousel */}
      <div className="carousel-container">
        {property.images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`${property.title} Gallery ${idx + 1}`}
            className={`carousel-slide ${idx === currentSlide ? 'active' : ''}`}
          />
        ))}

        {property.images.length > 1 && (
          <>
            <button className="carousel-btn prev" onClick={prevSlide}>
              <ChevronLeft size={24} />
            </button>
            <button className="carousel-btn next" onClick={nextSlide}>
              <ChevronRight size={24} />
            </button>

            <div className="carousel-dots">
              {property.images.map((_, idx) => (
                <div
                  key={idx}
                  className={`carousel-dot ${idx === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(idx)}
                ></div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Details Section Splits */}
      <div className="detail-grid">
        {/* Main Content Pane */}
        <div className="detail-main">
          {/* Header block info */}
          <div className="detail-header-block">
            <div>
              <h1 className="detail-title">{property.title}</h1>
              <p className="card-address" style={{ fontSize: '1.05rem' }}>{property.address}</p>
            </div>
            <div>
              <div className="detail-price">
                ${property.price.toLocaleString()}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                Est. ${(property.price / 150).toFixed(0)}/month
              </p>
            </div>
          </div>

          {/* Key Specs */}
          <div className="card-specs glass" style={{ border: '1px solid var(--border-light)', padding: '1.25rem', borderRadius: '12px' }}>
            <div className="spec-item" style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bedrooms</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{property.beds} Beds</span>
            </div>
            <div className="spec-item" style={{ flex: 1, flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bathrooms</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{property.baths} Baths</span>
            </div>
            <div className="spec-item" style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Square Footage</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{property.sqft} sqft</span>
            </div>
          </div>

          {/* Description Block */}
          <div className="detail-card glass">
            <h2 className="detail-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={20} className="gradient-text" style={{ WebkitTextFillColor: 'initial' }} />
                Property Overview
              </span>
              <div className="lang-selector-container">
                {['English', 'Spanish', 'Hindi'].map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    className={`lang-pill-btn ${selectedLang === lang ? 'active' : ''}`}
                    onClick={() => handleTranslate(lang)}
                    disabled={translating}
                  >
                    {translating && selectedLang === lang ? '...' : lang}
                  </button>
                ))}
              </div>
            </h2>
            <p className="detail-desc-text">
              {translating ? (
                <span className="text-loading" style={{ padding: '1rem', fontSize: '0.95rem' }}>
                  <span className="spinner" style={{ width: '16px', height: '16px' }}></span> Translating...
                </span>
              ) : translatedDetails ? (
                translatedDetails.description
              ) : (
                property.description
              )}
            </p>
          </div>

          {/* Amenities Badges */}
          <div className="detail-card glass">
            <h2 className="detail-card-title">Property Amenities</h2>
            <div className="detail-amenities">
              {translating ? (
                <span className="text-loading" style={{ padding: '0.5rem', fontSize: '0.9rem' }}>
                  <span className="spinner" style={{ width: '14px', height: '14px' }}></span> Translating...
                </span>
              ) : (
                (translatedDetails ? translatedDetails.amenities : property.amenities).map((amenity, idx) => (
                  <span key={idx} className="amenity-badge">
                    <Sparkles size={12} style={{ color: 'var(--color-primary)' }} />
                    {amenity}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets (AI Features) */}
        <div className="detail-sidebar">

          {/* Feature 1: Investment potential Analysis */}
          {property.investmentScore && (
            <div className="detail-card glass investment-card">
              <div className="invest-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <TrendingUp size={20} style={{ color: 'var(--color-success)' }} />
                  Investment Analysis
                </h3>
                <span className="invest-rating">
                  {property.investmentScore.rating.split(' ')[0]} Yield
                </span>
              </div>

              <div className="invest-metric-row">
                <div className="invest-metric">
                  <div className="invest-label">Avg Yield</div>
                  <div className="invest-value" style={{ color: 'var(--color-success)' }}>
                    {property.investmentScore.yieldRate}%
                  </div>
                </div>
                <div className="invest-metric">
                  <div className="invest-label">Estimated Rent</div>
                  <div className="invest-value">
                    ${property.investmentScore.monthlyEstimate.toLocaleString()}/mo
                  </div>
                </div>
              </div>

              <div className="invest-analysis">
                {property.investmentScore.analysis}
              </div>
            </div>
          )}

          {/* Feature 2: Lease Summarizer */}
          <div className="detail-card glass lease-card">
            <h3 className="detail-card-title" style={{ border: 'none', padding: 0 }}>
              <DollarSign size={20} style={{ color: 'var(--color-accent-light)' }} />
              Lease Terms Quick-Look
            </h3>

            {property.leaseSummary ? (
              <div className="lease-grid">
                <div className="lease-item">
                  <span className="invest-label">Security Deposit</span>
                  <span className="lease-item-val">{property.leaseSummary.securityDeposit}</span>
                </div>
                <div className="lease-item">
                  <span className="invest-label">Notice Period</span>
                  <span className="lease-item-val">{property.leaseSummary.noticePeriod}</span>
                </div>
                <div className="lease-item">
                  <span className="invest-label">Pet Policy</span>
                  <span className="lease-item-val">{property.leaseSummary.petPolicy}</span>
                </div>
                <div className="lease-item">
                  <span className="invest-label">Other Fees</span>
                  <span className="lease-item-val" style={{ color: property.leaseSummary.hiddenFees !== 'None' ? 'var(--color-warning)' : 'inherit' }}>
                    {property.leaseSummary.hiddenFees}
                  </span>
                </div>
              </div>
            ) : (
              <p className="detail-desc-text" style={{ fontSize: '0.88rem' }}>No lease summary generated yet.</p>
            )}

            {/* In-page lease summarize capability */}
            <div className="lease-upload-section">
              <form onSubmit={handleSummarizeLease}>
                <span className="invest-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Analyze Rental Agreement text
                </span>
                <textarea
                  className="lease-textarea"
                  placeholder="Paste lease contract text here (e.g. 'Tenants must provide 30 days notice. The deposit is $1200. No pets. A $100 key deposit is required.')"
                  value={leaseText}
                  onChange={(e) => setLeaseText(e.target.value)}
                  disabled={summarizingLease}
                ></textarea>

                <button
                  type="submit"
                  className="lease-btn"
                  disabled={summarizingLease || !leaseText.trim()}
                >
                  {summarizingLease ? (
                    <>
                      <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }}></div>
                      Analyzing text...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} style={{ color: 'var(--color-accent-light)' }} />
                      Summarize Lease
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Feature 3: Make an Offer Card */}
          <div className="detail-card glass" style={{ border: '1px solid rgba(168, 85, 247, 0.2)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.03) 0%, rgba(99, 102, 241, 0.03) 100%), var(--bg-card)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
              <Sparkles size={18} style={{ color: 'var(--color-accent-light)' }} />
              Negotiate & Offer
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              Interested in this property? Submit a custom offer price and counter rationale, and our AI will draft a professional email to negotiate with the listing agent.
            </p>
            <button
              className="btn-primary"
              style={{ width: '100%', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
              onClick={() => setOfferModalOpen(true)}
            >
              <DollarSign size={16} /> Make an Offer
            </button>
          </div>
        </div>
      </div>

      {/* Similar Listings Section */}
      <div className="recommendations-section">
        <h2 style={{ fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <Sparkles size={22} className="gradient-text" style={{ WebkitTextFillColor: 'initial' }} />
          Similar Listings You Might Like
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Powered by semantic analysis. These properties match the profile and style of this home.
        </p>

        {loadingRecs ? (
          <div className="text-loading" style={{ padding: '3rem' }}>
            <div className="spinner"></div>
            Finding similar homes...
          </div>
        ) : recommendations.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.95rem' }}>
            No similar properties found.
          </p>
        ) : (
          <div className="recommendations-grid">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="property-card glass recommendation-card"
                style={{ cursor: 'pointer' }}
                onClick={() => onViewProperty(rec.id)}
              >
                <div className="card-image-wrapper" style={{ height: '180px' }}>
                  <img
                    src={rec.images[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'}
                    alt={rec.title}
                    className="card-image"
                  />
                  <div className="card-price-tag" style={{ fontSize: '0.9rem', padding: '0.25rem 0.6rem' }}>
                    ${rec.price.toLocaleString()}
                  </div>
                  {rec.matchScore !== undefined && (
                    <div className="match-score-badge" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                      <Sparkles size={10} />
                      {rec.matchScore}% Match
                    </div>
                  )}
                </div>
                <div className="card-content" style={{ padding: '1.25rem' }}>
                  <h4 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{rec.title}</h4>
                  <div className="card-address" style={{ fontSize: '0.8rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    {rec.address}
                  </div>
                  <div className="card-specs" style={{ fontSize: '0.8rem', paddingBottom: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="spec-item" style={{ gap: '0.25rem' }}>
                      <BedDouble size={14} />
                      <span>{rec.beds} Bed</span>
                    </div>
                    <div className="spec-item" style={{ gap: '0.25rem' }}>
                      <Bath size={14} />
                      <span>{rec.baths} Bath</span>
                    </div>
                    <div className="spec-item" style={{ gap: '0.25rem' }}>
                      <Maximize size={14} />
                      <span>{rec.sqft} sqft</span>
                    </div>
                  </div>
                  <p className="card-desc" style={{ fontSize: '0.82rem', WebkitLineClamp: 2, height: '2.5rem', overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                    {rec.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Chat widget button */}
      <div className="chat-widget-container">
        {!chatOpen ? (
          <button className="chat-bubble-btn" onClick={() => setChatOpen(true)}>
            <MessageSquare size={28} />
          </button>
        ) : (
          <div className="chat-window glass">
            {/* Chat header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <span className="chat-header-title">Ask the House</span>
                <span className="chat-header-subtitle">Q&A bot for this listing</span>
              </div>
              <button className="chat-close-btn" onClick={() => setChatOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Messages box */}
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
                  {msg.text}
                </div>
              ))}

              {botTyping && (
                <div className="chat-typing-indicator">
                  <div className="chat-dot"></div>
                  <div className="chat-dot"></div>
                  <div className="chat-dot"></div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input form */}
            <form className="chat-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="chat-input"
                placeholder="Is parking included? Is it gas stove?..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={botTyping}
              />
              <button type="submit" className="chat-send-btn" disabled={botTyping || !inputMessage.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Make an Offer Modal Overlay */}
      {offerModalOpen && (
        <div className="modal-overlay" onClick={handleCloseOfferModal}>
          <div className="modal-content glass" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Sparkles size={18} style={{ color: 'var(--color-accent-light)' }} />
                AI Offer Email Drafter
              </h3>
              <button className="chat-close-btn" onClick={handleCloseOfferModal}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDraftOffer}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Enter your details to generate a professional email to the agent arguing for your price.
                </p>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Buyer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    required
                    disabled={draftingEmail || draftedEmail}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Offered Price ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder={`e.g. ${Math.round(property.price * 0.95)}`}
                    value={offeredPrice}
                    onChange={(e) => setOfferedPrice(e.target.value)}
                    required
                    disabled={draftingEmail || draftedEmail}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.82rem' }}>Your Rationale / Counterpoints (Optional)</label>
                  <textarea
                    className="lease-textarea"
                    style={{ height: '70px', marginBottom: 0 }}
                    placeholder="e.g. Needs new carpets, kitchen requires upgrades, or quick cash purchase"
                    value={offerRationale}
                    onChange={(e) => setOfferRationale(e.target.value)}
                    disabled={draftingEmail || draftedEmail}
                  ></textarea>
                </div>

                {draftingEmail && (
                  <div className="text-loading" style={{ padding: '2rem', fontSize: '0.95rem' }}>
                    <div className="spinner"></div>
                    Drafting offer email...
                  </div>
                )}

                {draftedEmail && (
                  <div className="email-draft-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="invest-label" style={{ margin: 0 }}>Generated Draft</span>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        onClick={handleCopyEmail}
                      >
                        <Copy size={12} /> {copied ? 'Copied!' : 'Copy Email'}
                      </button>
                    </div>
                    <div className="email-draft-subject">
                      Subject: {draftedEmail.subject}
                    </div>
                    <div className="email-draft-body">
                      {draftedEmail.body}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseOfferModal}
                  disabled={draftingEmail}
                >
                  Close
                </button>
                {!draftedEmail && (
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={draftingEmail || !buyerName.trim() || !offeredPrice}
                    style={{ background: 'var(--grad-primary)', padding: '0.5rem 1.25rem', borderRadius: '8px' }}
                  >
                    Draft Email
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
