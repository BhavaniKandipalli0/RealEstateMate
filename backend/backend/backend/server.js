import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import { vectorDb } from './vectorDb.js';
import { geminiService } from './gemini.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Connection Status Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: db.isUsingMongo() ? 'MongoDB Atlas' : 'Local JSON File',
    vectorDb: vectorDb.isUsingPinecone() ? 'Pinecone DB' : 'Local Cosine Similarity',
    gemini: geminiService.isUsingRealGemini() ? 'Gemini API (Real)' : 'AI Studio Simulation (Mock)'
  });
});

// GET /api/properties - Retrieves listings, supporting hybrid (semantic + structured) search
app.get('/api/properties', async (req, res) => {
  try {
    const { query, minPrice, maxPrice, beds, location } = req.query;
    let properties = await db.getProperties();

    let matchesMap = new Map();
    let hasSemanticQuery = false;

    // 1. Semantic search filtering (Pinecone/local similarity vector matching)
    if (query && query.trim() !== '') {
      hasSemanticQuery = true;
      const queryEmbedding = await geminiService.generateEmbedding(query);
      const vectorMatches = await vectorDb.queryVectors(queryEmbedding, 50);
      
      vectorMatches.forEach(match => {
        matchesMap.set(match.id, match.score);
      });

      // Filter properties to only include matches and map the matchScore
      properties = properties
        .filter(p => matchesMap.has(p.id))
        .map(p => ({
          ...p,
          matchScore: Math.round(matchesMap.get(p.id) * 100) // Convert to percentage
        }));
    }

    // 2. Structured structured filtering (Price, Beds, Location)
    if (minPrice) {
      const min = parseFloat(minPrice);
      properties = properties.filter(p => p.price >= min);
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      properties = properties.filter(p => p.price <= max);
    }
    if (beds) {
      const numBeds = parseInt(beds);
      if (numBeds === 4) {
        // Assume '4+' bedrooms
        properties = properties.filter(p => p.beds >= 4);
      } else {
        properties = properties.filter(p => p.beds === numBeds);
      }
    }
    if (location && location.trim() !== '') {
      const locLower = location.toLowerCase();
      properties = properties.filter(p => 
        p.address.toLowerCase().includes(locLower) || 
        p.title.toLowerCase().includes(locLower)
      );
    }

    // 3. Sorting results
    if (hasSemanticQuery) {
      // Sort by semantic score descending
      properties.sort((a, b) => b.matchScore - a.matchScore);
    } else {
      // Sort by date created descending by default
      properties.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    res.json(properties);
  } catch (error) {
    console.error('Failed to get properties:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/properties/:id - Get detail of a specific listing
app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await db.getPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (error) {
    console.error(`Failed to get property ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/properties/generate-desc - Generate listing marketing copy
app.post('/api/properties/generate-desc', async (req, res) => {
  try {
    const { rawFeatures } = req.body;
    if (!rawFeatures) {
      return res.status(400).json({ error: 'rawFeatures is required' });
    }
    const description = await geminiService.generateListingDescription(rawFeatures);
    res.json({ description });
  } catch (error) {
    console.error('Failed to generate description:', error);
    res.status(500).json({ error: 'Failed to generate description' });
  }
});

// POST /api/properties - Ingest (create) a new property listing
app.post('/api/properties', async (req, res) => {
  try {
    const {
      title,
      address,
      price,
      beds,
      baths,
      sqft,
      amenities,
      averageRentalYield,
      images,
      rawFeatures,
      description: userDescription
    } = req.body;

    if (!title || !address || !price) {
      return res.status(400).json({ error: 'Title, address, and price are required' });
    }

    // 1. Description generation if missing
    let finalDescription = userDescription;
    if (!finalDescription && rawFeatures) {
      finalDescription = await geminiService.generateListingDescription(rawFeatures);
    } else if (!finalDescription) {
      finalDescription = `Beautiful property located at ${address}. Offering ${beds || 0} bedrooms and ${baths || 0} bathrooms.`;
    }

    // 2. Investment potential calculations
    const investmentScore = await geminiService.calculateInvestmentPotential(price, averageRentalYield, address);

    // 3. Assemble and save to Database
    const propertyData = {
      title,
      address,
      price: parseFloat(price),
      beds: parseInt(beds) || 1,
      baths: parseFloat(baths) || 1,
      sqft: parseFloat(sqft) || 0,
      amenities: Array.isArray(amenities) ? amenities : [],
      averageRentalYield: parseFloat(averageRentalYield) || 5.0,
      images: Array.isArray(images) && images.length > 0 ? images : [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800" // default villa img
      ],
      description: finalDescription,
      investmentScore,
      leaseSummary: {
        securityDeposit: `$${Math.round(parseFloat(price) * 1.5)}`, // default heuristic
        noticePeriod: '30 Days',
        petPolicy: 'Allowed with approval',
        hiddenFees: 'None'
      }
    };

    const savedProperty = await db.createProperty(propertyData);

    // 4. Create vector embedding and save to Vector DB
    const embedSource = `${savedProperty.title}. ${savedProperty.description}. Amenities: ${savedProperty.amenities.join(', ')}. Located at ${savedProperty.address}. Price is $${savedProperty.price}.`;
    const embedding = await geminiService.generateEmbedding(embedSource);

    await vectorDb.upsertVector(savedProperty.id, embedding, {
      propertyId: savedProperty.id,
      price: savedProperty.price,
      beds: savedProperty.beds,
      address: savedProperty.address
    });

    res.status(201).json(savedProperty);
  } catch (error) {
    console.error('Failed to create property listing:', error);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// POST /api/properties/:id/chat - RAG Chat Widget "Ask the House"
app.post('/api/properties/:id/chat', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const property = await db.getPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const answer = await geminiService.askPropertyRAG(property, question);
    res.json({ answer });
  } catch (error) {
    console.error(`Error in RAG Q&A for property ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to complete Q&A chat request' });
  }
});

// POST /api/properties/:id/lease-summary - Update lease summary (with summarized text)
app.put('/api/properties/:id/lease-summary', async (req, res) => {
  try {
    const { leaseSummary } = req.body;
    if (!leaseSummary) {
      return res.status(400).json({ error: 'leaseSummary is required' });
    }
    const updated = await db.updateProperty(req.params.id, { leaseSummary });
    res.json(updated);
  } catch (error) {
    console.error('Failed to update lease summary:', error);
    res.status(500).json({ error: 'Failed to update lease summary' });
  }
});

// POST /api/properties/summarize-lease - Standalone lease summarization route
app.post('/api/properties/summarize-lease', async (req, res) => {
  try {
    const { leaseText } = req.body;
    if (!leaseText) {
      return res.status(400).json({ error: 'leaseText is required' });
    }
    const summary = await geminiService.summarizeLease(leaseText);
    res.json(summary);
  } catch (error) {
    console.error('Failed to summarize lease:', error);
    res.status(500).json({ error: 'Failed to parse lease agreement' });
  }
});

// GET /api/properties/:id/recommendations - Similarity recommendation route
app.get('/api/properties/:id/recommendations', async (req, res) => {
  try {
    const property = await db.getPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Embed content for search
    const embedSource = `${property.title}. ${property.description}. Amenities: ${property.amenities.join(', ')}. Located at ${property.address}. Price is $${property.price}.`;
    const embedding = await geminiService.generateEmbedding(embedSource);
    
    // Find closest vectors (retrieve top 4 to filter out self)
    const matches = await vectorDb.queryVectors(embedding, 4);
    const filteredMatches = matches.filter(m => m.id !== property.id).slice(0, 3);
    
    const matchedIds = filteredMatches.map(m => m.id);
    const allProperties = await db.getProperties();
    const recommendedProps = allProperties.filter(p => matchedIds.includes(p.id));

    // Map match scores
    const scoresMap = new Map(filteredMatches.map(m => [m.id, m.score]));
    const result = recommendedProps.map(p => ({
      ...p,
      matchScore: Math.max(10, Math.min(99, Math.round((scoresMap.get(p.id) || 0.85) * 100))) // Normalize to reasonable percentages
    })).sort((a, b) => b.matchScore - a.matchScore);

    res.json(result);
  } catch (error) {
    console.error(`Failed to generate recommendations for ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to process similarity recommendation' });
  }
});

// POST /api/properties/:id/translate - Translate property overview and amenities
app.post('/api/properties/:id/translate', async (req, res) => {
  try {
    const { targetLanguage } = req.body;
    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage is required' });
    }

    const property = await db.getPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const translation = await geminiService.translateProperty(property, targetLanguage);
    res.json(translation);
  } catch (error) {
    console.error(`Failed to translate property ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to translate property listing' });
  }
});

// POST /api/properties/:id/draft-offer - Draft negotiation offer email
app.post('/api/properties/:id/draft-offer', async (req, res) => {
  try {
    const { offeredPrice, rationale, buyerName } = req.body;
    if (!offeredPrice || !buyerName) {
      return res.status(400).json({ error: 'offeredPrice and buyerName are required' });
    }

    const property = await db.getPropertyById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const offerEmail = await geminiService.draftOfferEmail(property, offeredPrice, rationale, buyerName);
    res.json(offerEmail);
  } catch (error) {
    console.error(`Failed to draft offer email for property ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to draft negotiation offer email' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
