import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const VECTORS_FILE = path.join(DATA_DIR, 'vectors.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let pineconeClient = null;
let pineconeIndex = null;
let usePinecone = false;

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || 'realestatemate';

if (PINECONE_API_KEY) {
  try {
    console.log('Connecting to Pinecone Vector Database...');
    pineconeClient = new Pinecone({ apiKey: PINECONE_API_KEY });
    pineconeIndex = pineconeClient.index(PINECONE_INDEX_NAME);
    usePinecone = true;
    console.log(`Using Pinecone index: ${PINECONE_INDEX_NAME}`);
  } catch (error) {
    console.error('Failed to connect to Pinecone. Falling back to local vector simulation.', error.message);
    usePinecone = false;
  }
} else {
  console.log('No PINECONE_API_KEY provided. Using local vector simulation.');
}

// Helpers for Local Vector DB Simulation
function readLocalVectors() {
  if (!fs.existsSync(VECTORS_FILE)) {
    fs.writeFileSync(VECTORS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(VECTORS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading local vectors:', error);
    return [];
  }
}

function writeLocalVectors(data) {
  try {
    fs.writeFileSync(VECTORS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing local vectors:', error);
  }
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const vectorDb = {
  isUsingPinecone: () => usePinecone,

  async upsertVector(propertyId, embedding, metadata) {
    if (!embedding || !Array.isArray(embedding)) {
      console.warn(`Attempted to upsert empty vector for property ${propertyId}`);
      return false;
    }

    if (usePinecone) {
      try {
        await pineconeIndex.upsert([
          {
            id: propertyId,
            values: embedding,
            metadata: metadata
          }
        ]);
        return true;
      } catch (error) {
        console.error(`Pinecone upsert failed for property ${propertyId}. Falling back to local vector database.`, error.message);
        // Fallback to local
      }
    }

    // Local Vector Storage
    const vectors = readLocalVectors();
    const existingIdx = vectors.findIndex(v => v.id === propertyId);
    const vectorRecord = {
      id: propertyId,
      values: embedding,
      metadata: metadata
    };

    if (existingIdx !== -1) {
      vectors[existingIdx] = vectorRecord;
    } else {
      vectors.push(vectorRecord);
    }
    writeLocalVectors(vectors);
    return true;
  },

  async queryVectors(queryEmbedding, limit = 5) {
    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      console.warn('Empty query embedding, returning empty search results.');
      return [];
    }

    if (usePinecone) {
      try {
        const queryResponse = await pineconeIndex.query({
          vector: queryEmbedding,
          topK: limit,
          includeMetadata: true
        });
        return queryResponse.matches.map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata
        }));
      } catch (error) {
        console.error('Pinecone query failed. Falling back to local vector simulation.', error.message);
      }
    }

    // Local Cosine Similarity Search
    const vectors = readLocalVectors();
    if (vectors.length === 0) return [];

    const matches = vectors.map(v => {
      const score = cosineSimilarity(queryEmbedding, v.values);
      return {
        id: v.id,
        score: score,
        metadata: v.metadata
      };
    });

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);
    return matches.slice(0, limit);
  },

  async deleteVector(propertyId) {
    if (usePinecone) {
      try {
        await pineconeIndex.deleteOne(propertyId);
        return true;
      } catch (error) {
        console.error(`Pinecone delete failed for property ${propertyId}. Falling back to local vector deletion.`, error.message);
      }
    }

    const vectors = readLocalVectors();
    const filtered = vectors.filter(v => v.id !== propertyId);
    if (filtered.length !== vectors.length) {
      writeLocalVectors(filtered);
      return true;
    }
    return false;
  },

  async clearVectors() {
    if (usePinecone) {
      try {
        await pineconeIndex.deleteAll();
      } catch (error) {
        console.error('Pinecone clear index failed.', error.message);
      }
    }
    writeLocalVectors([]);
  }
};
