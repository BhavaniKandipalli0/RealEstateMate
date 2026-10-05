import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let ai = null;
let useRealGemini = false;

if (GEMINI_API_KEY) {
  try {
    console.log('Initializing Google Gen AI Studio Client...');
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    useRealGemini = true;
    console.log('Google Gen AI Studio Client initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Google Gen AI. Using Mock AI simulation.', error.message);
  }
} else {
  console.log('No GEMINI_API_KEY found in .env. Running in Mock AI Demo Mode.');
}

// Deterministic Mock Embedding Generator (TF-IDF keyword hash simulation)
function getMockEmbedding(text) {
  const DIM = 768;
  const embedding = new Array(DIM).fill(0);
  if (!text) return embedding;

  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);

  if (words.length === 0) return embedding;

  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % DIM;
    embedding[idx] += 1.0;
  }

  // L2 Normalization
  let sumSq = 0;
  for (let i = 0; i < DIM; i++) {
    sumSq += embedding[i] * embedding[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < DIM; i++) {
      embedding[i] = embedding[i] / norm;
    }
  }
  return embedding;
}

export const geminiService = {
  isUsingRealGemini: () => useRealGemini,

  // Generates embedding vector for semantic search
  async generateEmbedding(text) {
    if (useRealGemini) {
      try {
        const response = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: text,
        });
        if (response && response.embedding && response.embedding.values) {
          return response.embedding.values;
        }
        throw new Error('Invalid embedding response format');
      } catch (error) {
        console.error('Real Gemini embedding failed. Falling back to mock embedding.', error.message);
      }
    }
    return getMockEmbedding(text);
  },

  // Generates marketing description from raw features
  async generateListingDescription(features) {
    if (useRealGemini) {
      try {
        const prompt = `You are a professional real estate marketing agent. Write a compelling, highly attractive marketing description (around 3-4 sentences, about 80-120 words) for a property based on these features: "${features}". Make it sound premium, luxury, and inviting. Do not include placeholders.`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text.trim();
      } catch (error) {
        console.error('Real Gemini content generation failed. Using mock.', error.message);
      }
    }

    // Mock description generator
    const featuresList = features.split(',').map(f => f.trim());
    let beds = featuresList.find(f => f.toLowerCase().includes('bed') || f.toLowerCase().includes('bhk')) || 'spacious';
    let baths = featuresList.find(f => f.toLowerCase().includes('bath')) || 'modern';
    let price = featuresList.find(f => f.includes('$') || f.toLowerCase().includes('price')) || 'competitive pricing';
    let location = featuresList.find(f => f.toLowerCase().includes('st') || f.toLowerCase().includes('ave') || f.toLowerCase().includes('road') || f.toLowerCase().includes('downtown') || f.toLowerCase().includes('suburb')) || 'a prime neighborhood';
    let otherFeatures = featuresList.filter(f => f !== beds && f !== baths && f !== price && f !== location);

    const amenityText = otherFeatures.length > 0 
      ? `Featuring exceptional amenities such as ${otherFeatures.slice(0, -1).join(', ')}${otherFeatures.length > 1 ? ', and ' : ''}${otherFeatures.slice(-1)}, it offers an unmatched living experience.` 
      : 'Boasting premium finishes and meticulous attention to detail, it is ready to welcome its new residents.';

    return `Step into luxury with this stunning property located in ${location}! Boasting ${beds} and ${baths}, this home is meticulously crafted to impress at first glance. ${amenityText} Priced at ${price}, this is a rare opportunity to acquire a piece of dream real estate that perfectly combines comfort, style, and absolute convenience.`;
  },

  // RAG chatbot specifically for a single house Q&A
  async askPropertyRAG(property, question) {
    const context = `
Property Title: ${property.title || 'Beautiful Home'}
Location: ${property.address || 'Unknown'}
Price: $${property.price || 'Unknown'}
Rooms: ${property.beds || 0} Beds, ${property.baths || 0} Baths
Area: ${property.sqft || 0} sq ft
Amenities: ${property.amenities ? property.amenities.join(', ') : 'None listed'}
Description: ${property.description || 'No description provided.'}
Lease Terms Summary: ${property.leaseSummary ? JSON.stringify(property.leaseSummary) : 'No lease summary details available.'}
`;

    if (useRealGemini) {
      try {
        const prompt = `
You are "RealEstateMate RAG Assistant", an AI chatbot inside a real estate property page.
Your goal is to answer potential tenant/buyer questions about this specific listing.

[CONTEXT DATA]
${context}

[USER QUESTION]
"${question}"

[INSTRUCTION]
Answer the question strictly based on the provided context data. Be natural, professional, and helpful.
If the answer is NOT mentioned or cannot be inferred from the context data, you MUST respond exactly: "Please contact the agent." Do not make up facts or use external knowledge.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        return response.text.trim();
      } catch (error) {
        console.error('Real Gemini RAG Q&A failed. Using mock.', error.message);
      }
    }

    // Mock RAG processing
    const qLower = question.toLowerCase();
    const description = (property.description || '').toLowerCase();
    const amenities = (property.amenities || []).map(a => a.toLowerCase());
    const address = (property.address || '').toLowerCase();

    // Check amenities first
    for (const amenity of property.amenities || []) {
      if (qLower.includes(amenity.toLowerCase())) {
        return `Yes, the listing explicitly mentions that ${amenity} is available at this property.`;
      }
    }

    // Standard Q&A logic fallback
    if (qLower.includes('pet') || qLower.includes('dog') || qLower.includes('cat')) {
      if (property.leaseSummary && property.leaseSummary.petPolicy) {
        return `Regarding pets: ${property.leaseSummary.petPolicy}`;
      }
      if (description.includes('pet') || description.includes('dog') || description.includes('cat')) {
        return "Pets are allowed! The listing description mentions pet-friendly spaces/features.";
      }
      return "Please contact the agent.";
    }

    if (qLower.includes('park') || qLower.includes('garage') || qLower.includes('car')) {
      if (description.includes('park') || description.includes('garage') || amenities.includes('parking') || amenities.includes('garage')) {
        return "Yes, there is dedicated parking space available as detailed in the amenities.";
      }
      return "Please contact the agent.";
    }

    if (qLower.includes('deposit') || qLower.includes('fee') || qLower.includes('security')) {
      if (property.leaseSummary && property.leaseSummary.securityDeposit) {
        let responseStr = `The security deposit is ${property.leaseSummary.securityDeposit}.`;
        if (property.leaseSummary.hiddenFees && property.leaseSummary.hiddenFees !== 'None' && property.leaseSummary.hiddenFees !== 'Not specified') {
          responseStr += ` Note that there are additional fees: ${property.leaseSummary.hiddenFees}.`;
        }
        return responseStr;
      }
      return "Please contact the agent.";
    }

    if (qLower.includes('kitchen') || qLower.includes('gas') || qLower.includes('electric') || qLower.includes('stove')) {
      if (description.includes('gas') || description.includes('chef') || description.includes('stainless steel')) {
        return "The listing describes a modern chef's kitchen, but for specific utility connections (gas vs. electric stove), please contact the agent.";
      }
      return "Please contact the agent.";
    }

    if (qLower.includes('school') || qLower.includes('education') || qLower.includes('college')) {
      if (description.includes('school') || description.includes('university') || description.includes('district')) {
        return "The property is located near top-rated school districts. For a list of specific school assignments, please contact the agent.";
      }
      return "Please contact the agent.";
    }

    if (qLower.includes('rent') || qLower.includes('price') || qLower.includes('cost')) {
      return `The listed price for this property is $${property.price}. For lease term details or potential negotiations, please contact the agent.`;
    }

    if (qLower.includes('gym') || qLower.includes('fitness') || qLower.includes('workout')) {
      if (amenities.includes('gym') || amenities.includes('fitness center') || description.includes('gym') || description.includes('fitness')) {
        return "Yes, there is access to a fitness center/gym on-site.";
      }
      return "Please contact the agent.";
    }

    if (qLower.includes('pool') || qLower.includes('swim')) {
      if (amenities.includes('pool') || amenities.includes('swimming pool') || description.includes('pool')) {
        return "Yes, this property features a swimming pool.";
      }
      return "Please contact the agent.";
    }

    // Default RAG fallback statement
    return "Please contact the agent.";
  },

  // Lease agreement parser
  async summarizeLease(leaseText) {
    if (useRealGemini) {
      try {
        const prompt = `
You are a legal document summarizer specialized in rental agreements.
Analyze the following lease text and extract:
1. Security Deposit: (The specific amount, e.g. "$1,500" or "One month's rent")
2. Notice Period: (The notice required to move out, e.g. "60 days" or "1 month")
3. Pet Policy: (Detailed policy, e.g. "Allowed with $300 pet deposit, max 2 dogs under 40 lbs" or "No pets allowed")
4. Hidden Fees: (Any extra cleaning fees, late payment charges, key fees, e.g. "$150 cleaning fee, $50 late charge" or "None")

Format your response strictly as a JSON object with these exact keys: "securityDeposit", "noticePeriod", "petPolicy", "hiddenFees". Do not wrap it in markdown code blocks. Just output the raw JSON.

[LEASE AGREEMENT TEXT]
${leaseText}
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      } catch (error) {
        console.error('Real Gemini Lease summarizer failed. Using mock.', error.message);
      }
    }

    // Mock lease summarizer
    const leaseLower = leaseText.toLowerCase();
    let securityDeposit = 'One month\'s rent';
    let noticePeriod = '30 Days';
    let petPolicy = 'Allowed (subject to landlord approval)';
    let hiddenFees = 'None specified';

    // Extract Security Deposit
    const depositMatch = leaseText.match(/security deposit (?:of|is|shall be)\s*([$\d,\w\s]+?)(?:\.|\n|and)/i) || 
                         leaseText.match(/\$([0-9,]+)\s*(?:security deposit|deposit)/i);
    if (depositMatch) {
      securityDeposit = depositMatch[1].trim().startsWith('$') ? depositMatch[1].trim() : '$' + depositMatch[1].trim();
    } else if (leaseLower.includes('deposit')) {
      securityDeposit = 'Specified in lease (Refer to agreement details)';
    }

    // Extract Notice Period
    const noticeMatch = leaseText.match(/(\d+\s*(?:day|month|days|months))\s*written notice/i) ||
                        leaseText.match(/notice period\s*(?:is|of)\s*([a-zA-Z0-9\s]+?)(?:\.|\n)/i);
    if (noticeMatch) {
      noticePeriod = noticeMatch[1].trim();
    }

    // Extract Pet Policy
    if (leaseLower.includes('no pets') || leaseLower.includes('pets are prohibited') || leaseLower.includes('pets not allowed')) {
      petPolicy = 'No pets allowed';
    } else {
      const petMatch = leaseText.match(/pet(?:s)?\s*(?:allowed|permitted)\s*([a-zA-Z0-9\s,$]+?)(?:\.|\n)/i) ||
                       leaseText.match(/pet deposit\s*(?:of|is)\s*([$\d]+)/i);
      if (petMatch) {
        petPolicy = `Allowed (deposit: ${petMatch[1].trim()})`;
      } else if (leaseLower.includes('pet fee') || leaseLower.includes('pet deposit')) {
        petPolicy = 'Allowed with pet deposit/fee';
      }
    }

    // Extract Hidden Fees
    const feeMatches = [];
    const cleaningMatch = leaseText.match(/cleaning fee\s*(?:of|is)\s*([$\d]+)/i);
    const lateMatch = leaseText.match(/late fee\s*(?:of|is)\s*([$\d]+)/i) || leaseText.match(/late charge\s*(?:of|is)\s*([$\d]+)/i);
    const keyMatch = leaseText.match(/key deposit\s*(?:of|is)\s*([$\d]+)/i);

    if (cleaningMatch) feeMatches.push(`$${cleaningMatch[1]} cleaning fee`);
    if (lateMatch) feeMatches.push(`$${lateMatch[1]} late payment charge`);
    if (keyMatch) feeMatches.push(`$${keyMatch[1]} key deposit`);

    if (feeMatches.length > 0) {
      hiddenFees = feeMatches.join(', ');
    } else {
      const generalFeeMatch = leaseText.match(/(?:additional|extra|hidden|other) fee(?:s)?\s*(?:of|is|apply)\s*([a-zA-Z0-9\s,$]+?)(?:\.|\n)/i);
      if (generalFeeMatch) {
        hiddenFees = generalFeeMatch[1].trim();
      }
    }

    return {
      securityDeposit,
      noticePeriod,
      petPolicy,
      hiddenFees
    };
  },

  // Investment Potential Score Generator
  async calculateInvestmentPotential(price, averageRentalYield, address) {
    // Basic financial heuristic
    // Average rental yield is a percentage, e.g. 5%
    // Estimated Rent = (averageRentalYield / 100) * price / 12
    const parsedPrice = parseFloat(price) || 250000;
    const parsedYield = parseFloat(averageRentalYield) || 5.2;
    const estAnnualRent = (parsedYield / 100) * parsedPrice;
    const estMonthlyRent = Math.round(estAnnualRent / 12);

    // Let's decide if this is a "Good", "Excellent", or "Moderate" investment
    let rating = 'Moderate';
    let analysisText = '';

    if (parsedYield >= 7.0) {
      rating = 'Excellent Investment';
      analysisText = `This property is priced competitively and displays an outstanding yield potential of ${parsedYield}%, significantly outperforming the standard regional benchmark of 4.5%. With an estimated monthly rent of $${estMonthlyRent}, it represents an elite source of steady passive cash flow.`;
    } else if (parsedYield >= 5.0) {
      rating = 'Good Investment';
      analysisText = `This property represents a solid long-term acquisition. Operating at a projected ${parsedYield}% rental yield, it offers a consistent expected monthly return of $${estMonthlyRent}. The local market at ${address || 'this area'} exhibits healthy rental demand and positive appreciation vectors.`;
    } else {
      rating = 'Fair/Conservative Investment';
      analysisText = `This property operates under a standard yield profile of ${parsedYield}% (estimated $${estMonthlyRent} monthly rent). While cash flow yields are conservative, it stands out for capital preservation and equity growth potential in a stable neighborhood.`;
    }

    if (useRealGemini) {
      try {
        const prompt = `
You are a senior real estate investment analyst.
Calculate investment potential for:
Property Price: $${parsedPrice}
Average Rental Yield for Area: ${parsedYield}%
Location: ${address || 'Local Neighborhood'}
Estimated Monthly Rent: $${estMonthlyRent}

Provide a short, punchy, professional analysis (2-3 sentences) evaluating this purchase. Highlight the rental yield, investment tier (Excellent, Good, or Fair), and why.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        analysisText = response.text.trim();
      } catch (error) {
        console.error('Real Gemini investment calculation failed. Using mock.', error.message);
      }
    }

    return {
      yieldRate: parsedYield,
      rating,
      monthlyEstimate: estMonthlyRent,
      analysis: analysisText
    };
  },

  // Real-time property translator
  async translateProperty(property, targetLanguage) {
    if (!targetLanguage || targetLanguage.toLowerCase() === 'english') {
      return {
        description: property.description,
        amenities: property.amenities
      };
    }

    if (useRealGemini) {
      try {
        const prompt = `
You are a professional real estate translator.
Translate the following property details into ${targetLanguage}.
Ensure the tone remains professional, premium, and natural for real estate marketing.

Description:
${property.description}

Amenities:
${property.amenities.join(', ')}

Output your response strictly as a JSON object with these exact keys: "description", "amenities".
"amenities" must be an array of translated strings. Do not include markdown code blocks. Just output raw JSON.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      } catch (error) {
        console.error(`Real Gemini translation to ${targetLanguage} failed. Using mock.`, error.message);
      }
    }

    // Mock translations fallback
    if (targetLanguage.toLowerCase() === 'spanish') {
      return {
        description: `[Spanish] Hermosa propiedad en ${property.address}. Esta residencia ofrece un diseño refinado y una experiencia de vida inigualable. ${property.description}`,
        amenities: property.amenities.map(a => `${a} (Traducido)`)
      };
    } else if (targetLanguage.toLowerCase() === 'hindi') {
      return {
        description: `[Hindi] ${property.address} में स्थित सुंदर संपत्ति। यह निवास उत्कृष्ट डिजाइन और बेजोड़ जीवन शैली प्रदान करता है। ${property.description}`,
        amenities: property.amenities.map(a => `${a} (अनुवादित)`)
      };
    }

    return {
      description: `[${targetLanguage}] ${property.description}`,
      amenities: property.amenities.map(a => `${a} (${targetLanguage})`)
    };
  },

  // Professional offer email drafter
  async draftOfferEmail(property, offeredPrice, rationale, buyerName) {
    if (useRealGemini) {
      try {
        const prompt = `
You are a professional real estate buyer's agent. Write a polite, persuasive, and professional email to the listing agent of a property on behalf of a buyer who wants to make an offer.

Property Details:
- Title: ${property.title}
- Address: ${property.address}
- Original Listing Price: $${property.price}

Offer Details:
- Offered Price: $${offeredPrice}
- Buyer Name: ${buyerName}
- Buyer's Rationale/Comments: ${rationale || "None provided"}

Draft a professional email presenting this offer. Provide logical arguments for why the offered price is fair based on the rationale (if provided) or general market conditions, while maintaining a cooperative and respectful tone.

Output format:
Output strictly a JSON object with these exact keys: "subject", "body". Do not include markdown code blocks. Just output raw JSON.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        const cleaned = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
      } catch (error) {
        console.error('Real Gemini draft offer failed. Using mock.', error.message);
      }
    }

    // Mock offer email fallback
    const diff = property.price - offeredPrice;
    const diffText = diff > 0 
      ? `representing a competitive offer adjusted by $${diff.toLocaleString()} from the initial listing price` 
      : 'matching the requested listing price';

    const rationaleSection = rationale 
      ? `\nHere is the context behind this proposed price:\n- ${rationale}\n` 
      : '';

    const subject = `Purchase Offer: ${property.address} - ${buyerName}`;
    const body = `Dear Listing Agent,

I hope this email finds you well. 

On behalf of my client, ${buyerName || 'a qualified buyer'}, I am pleased to submit a formal purchase offer for the property at ${property.address} (${property.title}).

We are offering a purchase price of $${parseFloat(offeredPrice).toLocaleString()}, ${diffText}. We believe this is a highly fair and serious valuation based on current market dynamics and property specifics.
${rationaleSection}
${buyerName || 'My client'} is fully prepared to proceed with the transaction, has funds/financing pre-approval ready, and is flexible on the closing timeline to accommodate the seller's preferences.

Please review this offer with the owners and let us know their thoughts. We look forward to hearing from you and working together towards a successful closing.

Sincerely,
RealEstateMate Digital Offer Assistant`;

    return { subject, body };
  }
};
