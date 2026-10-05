import { db } from './db.js';
import { vectorDb } from './vectorDb.js';
import { geminiService } from './gemini.js';

const mockProperties = [
  {
    title: "The Glasshouse Penthouse",
    address: "707 Skyline Blvd, Downtown",
    price: 1250000,
    beds: 3,
    baths: 3.5,
    sqft: 2800,
    amenities: ["Private Pool", "Rooftop Balcony", "Elevator", "Floor-to-ceiling Windows", "Gym"],
    averageRentalYield: 6.8,
    images: [
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800"
    ],
    rawFeatures: "3 Bed, 3.5 Bath, Private Rooftop Pool, Penthouse Floor, Floor-to-Ceiling glass windows, Skyline views, Downtown Skyline, Private Elevator access, $1.25M",
    leaseSummary: {
      securityDeposit: "$5,000",
      noticePeriod: "60 Days",
      petPolicy: "Allowed (subject to $500 refundable pet deposit, max 2 pets)",
      hiddenFees: "$200 cleaning fee at checkout, $75 monthly HOA fee"
    }
  },
  {
    title: "Rustic Garden Cottage",
    address: "12 Valley Oak Rd, Oakridge",
    price: 340000,
    beds: 2,
    baths: 1.0,
    sqft: 1100,
    amenities: ["Large Backyard", "Sunlit Garden", "Fireplace", "Hardwood Floors"],
    averageRentalYield: 5.1,
    images: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
      "https://images.unsplash.com/photo-1464893913606-2ddec773d402?w=800",
      "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800"
    ],
    rawFeatures: "Cozy 2 Bed, 1 Bath, Historic Tudor style, Huge private yard for plants, Natural sun light, Quiet country feel, Oakridge Suburbs, $340k",
    leaseSummary: {
      securityDeposit: "$1,800",
      noticePeriod: "30 Days",
      petPolicy: "Allowed (dogs and cats welcome, no pet fee!)",
      hiddenFees: "None"
    }
  },
  {
    title: "Urban Loft & Art Studio",
    address: "410 Canvas Lane, Arts District",
    price: 480000,
    beds: 1,
    baths: 1.5,
    sqft: 950,
    amenities: ["Exposed Brick", "High Ceilings", "Industrial Windows", "Rooftop Deck", "Gym"],
    averageRentalYield: 7.2,
    images: [
      "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800",
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800"
    ],
    rawFeatures: "1 Bed, 1.5 Bath, Exposed brick walls, High timber ceilings, Industrial windows, Walk to craft coffee, Arts District center, Bachelor pad vibe, $480k",
    leaseSummary: {
      securityDeposit: "$2,200",
      noticePeriod: "30 Days",
      petPolicy: "Allowed (cats allowed, dogs require approval)",
      hiddenFees: "$150 building move-in fee"
    }
  },
  {
    title: "Modern Waterfront Villa",
    address: "22 Yacht Club Dr, Marina Bay",
    price: 2100000,
    beds: 4,
    baths: 4.5,
    sqft: 4200,
    amenities: ["Docking Berth", "Ocean Views", "Infinity Pool", "Gourmet Kitchen", "Wine Cellar", "Smart Home"],
    averageRentalYield: 4.8,
    images: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"
    ],
    rawFeatures: "4 Bed, 4.5 Bath, Waterfront, Boat slip dock, Endless ocean vistas, Yacht bay harbor, Chef kitchen, Pool, Marina Bay, $2.1M",
    leaseSummary: {
      securityDeposit: "$10,000",
      noticePeriod: "90 Days",
      petPolicy: "Prohibited",
      hiddenFees: "$300 monthly pool and landscaping maintenance charge"
    }
  },
  {
    title: "Serene Forest Cabin",
    address: "55 Whisper Pines Way, Green Valley",
    price: 290000,
    beds: 2,
    baths: 2.0,
    sqft: 1400,
    amenities: ["Wood Fireplace", "Cedar Deck", "Hot Tub", "Hiking Trails"],
    averageRentalYield: 5.5,
    images: [
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800",
      "https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=800",
      "https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=800"
    ],
    rawFeatures: "Rustic 2 Bed, 2 Bath cabin, Wood-burning fireplace, Cedar wrap-around porch, Redwood trees, Close to national park trails, Quiet vibe, Green Valley, $290k",
    leaseSummary: {
      securityDeposit: "$1,500",
      noticePeriod: "30 Days",
      petPolicy: "Allowed (large dogs allowed, pet friendly)",
      hiddenFees: "None"
    }
  },
  {
    title: "Eco-Friendly Smart Home",
    address: "88 Solaria Way, Maple Heights",
    price: 520000,
    beds: 3,
    baths: 2.0,
    sqft: 1850,
    amenities: ["Solar Panels", "EV Charger", "Tesla Powerwall", "Rainwater System", "Smart Appliances"],
    averageRentalYield: 6.0,
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800",
      "https://images.unsplash.com/photo-1527030280862-64139fbe04ca?w=800"
    ],
    rawFeatures: "3 Bed, 2 Bath, Full Solar array, Electric vehicle charging station, Sustainable green materials, Tesla energy storage, Maple Heights, $520k",
    leaseSummary: {
      securityDeposit: "$2,500",
      noticePeriod: "45 Days",
      petPolicy: "Allowed (max 1 pet under 25 lbs)",
      hiddenFees: "None (utilities highly reduced due to solar power)"
    }
  },
  {
    title: "Downtown Studio Pad",
    address: "202 Metro Avenue, Center City",
    price: 310000,
    beds: 1, // Will display as Studio / 1 Bed
    baths: 1.0,
    sqft: 600,
    amenities: ["Skyline Views", "Walk-in Closet", "Concierge", "Subway Access", "Secure Parking"],
    averageRentalYield: 7.5,
    images: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
      "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"
    ],
    rawFeatures: "Studio apartment, 1 Bath, High floor view of downtown, Walk to subway and transit, Sleek concrete floor, Perfect bachelor pad, Central location, $310k",
    leaseSummary: {
      securityDeposit: "$1,500",
      noticePeriod: "30 Days",
      petPolicy: "Allowed (cats allowed, no dogs)",
      hiddenFees: "$100 key deposit"
    }
  },
  {
    title: "Classic Tudor Family Home",
    address: "105 Elmwood Ave, Elmwood District",
    price: 680000,
    beds: 4,
    baths: 3.0,
    sqft: 2600,
    amenities: ["Finished Basement", "Fenced Backyard", "Double Garage", "Top School District"],
    averageRentalYield: 5.2,
    images: [
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
      "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800"
    ],
    rawFeatures: "4 Bed, 3 Bath, Elmwood area, Top elementary and middle schools, Big brick chimney, Safe family neighborhood, Backyard for kids and dogs, Finished cellar, $680k",
    leaseSummary: {
      securityDeposit: "$3,500",
      noticePeriod: "60 Days",
      petPolicy: "Allowed (dogs and cats allowed, fully fenced yard)",
      hiddenFees: "None"
    }
  },
  {
    title: "Sunset Hills Mid-Century",
    address: "1840 Ridge Crest, Sunset Hills",
    price: 890000,
    beds: 3,
    baths: 2.5,
    sqft: 2200,
    amenities: ["Swimming Pool", "Panoramic Windows", "Oak Trees", "Open Concept Plan", "Terrazzo Floor"],
    averageRentalYield: 5.9,
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
      "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800",
      "https://images.unsplash.com/photo-1501183007986-d0d080b147f9?w=800"
    ],
    rawFeatures: "3 Bed, 2.5 Bath, Mid-Century Modern architecture, Swimming pool, Oak wood setting, Floor-to-ceiling glass, Sunset views, Open floor layout, $890k",
    leaseSummary: {
      securityDeposit: "$4,500",
      noticePeriod: "60 Days",
      petPolicy: "Allowed (with $250 pet fee)",
      hiddenFees: "$150 pool utility fee"
    }
  },
  {
    title: "Charming Brick Townhouse",
    address: "88 Cobblestone Rd, Historic Quarter",
    price: 620000,
    beds: 3,
    baths: 2.0,
    sqft: 1700,
    amenities: ["Private Patio", "Original Fireplace", "Brick Facade", "Walk to Cafes"],
    averageRentalYield: 6.4,
    images: [
      "https://images.unsplash.com/photo-1602075432748-82d264e2b463?w=800",
      "https://images.unsplash.com/photo-1502005229762-fc1b2b812ca5?w=800",
      "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800"
    ],
    rawFeatures: "3 Bed, 2 Bath, Classic brick front, Courtyard deck patio, Historic district, Walkable to local cafes and bookshops, Fireplace, $620k",
    leaseSummary: {
      securityDeposit: "$3,000",
      noticePeriod: "45 Days",
      petPolicy: "Allowed (cats allowed, small dogs under 20 lbs allowed)",
      hiddenFees: "None"
    }
  },
  {
    title: "Quiet Pines Condominium",
    address: "411 Whispering Pines Dr, Pines Corner",
    price: 275000,
    beds: 2,
    baths: 2.0,
    sqft: 1150,
    amenities: ["Top Floor", "Balcony", "Clubhouse", "Park Views", "Tennis Courts"],
    averageRentalYield: 5.8,
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      "https://images.unsplash.com/photo-1560185127-6a2806647f81?w=800",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800"
    ],
    rawFeatures: "2 Bed, 2 Bath, Top floor condo unit, Quiet neighbors, Balcony facing the park, Low maintenance, Pinewood community, Tennis court, $275k",
    leaseSummary: {
      securityDeposit: "$1,300",
      noticePeriod: "30 Days",
      petPolicy: "Prohibited",
      hiddenFees: "$50 clubhouse key charge"
    }
  },
  {
    title: "Cypress Point Golf Estate",
    address: "1 Country Club Lane, Cypress Point",
    price: 3400000,
    beds: 5,
    baths: 6.0,
    sqft: 6800,
    amenities: ["Golf Frontage", "Wine Cellar", "Infinity Pool", "Gated Security", "Guest House", "Home Theater"],
    averageRentalYield: 4.2,
    images: [
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800",
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=800"
    ],
    rawFeatures: "5 Bed, 6 Bath, Golf course front, Gated estate enclave, Glass wine vault, Cinema theater, Swimming pool, Detached guest lodge, Cypress Point, $3.4M",
    leaseSummary: {
      securityDeposit: "$15,000",
      noticePeriod: "90 Days",
      petPolicy: "Allowed (with landlord approval, $1,000 pet deposit)",
      hiddenFees: "$500 monthly landscaping and security fee"
    }
  }
];

async function seed() {
  console.log('--- STARTING SEED SCRIPT ---');
  try {
    // Clear databases
    await db.clearProperties();
    await vectorDb.clearVectors();
    console.log('Cleared existing properties and vectors.');

    for (const p of mockProperties) {
      console.log(`Seeding: "${p.title}"...`);

      // Generate description using AI helper
      const description = await geminiService.generateListingDescription(p.rawFeatures);
      
      // Calculate investment score details
      const investmentScore = await geminiService.calculateInvestmentPotential(p.price, p.averageRentalYield, p.address);

      // Assemble final property model
      const propertyData = {
        title: p.title,
        address: p.address,
        price: p.price,
        beds: p.beds,
        baths: p.baths,
        sqft: p.sqft,
        amenities: p.amenities,
        averageRentalYield: p.averageRentalYield,
        images: p.images,
        description: description,
        investmentScore: investmentScore,
        leaseSummary: p.leaseSummary,
      };

      // Create in db
      const created = await db.createProperty(propertyData);

      // Create embedding
      const embedSource = `${p.title}. ${description}. Amenities: ${p.amenities.join(', ')}. Located at ${p.address}. Price is $${p.price}.`;
      const embedding = await geminiService.generateEmbedding(embedSource);

      // Upsert to Vector Database
      await vectorDb.upsertVector(created.id, embedding, {
        propertyId: created.id,
        price: p.price,
        beds: p.beds,
        address: p.address
      });
    }

    console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
    console.log(`Using MongoDB: ${db.isUsingMongo()}`);
    console.log(`Using Pinecone: ${vectorDb.isUsingPinecone()}`);
    console.log(`Using Gemini AI: ${geminiService.isUsingRealGemini()}`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding encountered an error:', error);
    process.exit(1);
  }
}

seed();
