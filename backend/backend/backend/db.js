import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const JSON_DB_PATH = path.join(DATA_DIR, 'properties.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let mongoClient = null;
let mongoDb = null;
let useMongo = false;

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'realestatemate';

if (MONGODB_URI) {
  try {
    console.log('Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    mongoDb = mongoClient.db(DB_NAME);
    useMongo = true;
    console.log('Connected successfully to MongoDB Atlas.');
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas. Falling back to local JSON database.', error.message);
    useMongo = false;
  }
} else {
  console.log('No MONGODB_URI provided. Using local JSON database.');
}

// Helpers for Local JSON Database
function readLocalDb() {
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading local DB:', error);
    return [];
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing to local DB:', error);
  }
}

// Normalized output helper
function normalizeProperty(doc) {
  if (!doc) return null;
  const normalized = { ...doc };
  if (doc._id) {
    normalized.id = doc._id.toString();
    delete normalized._id;
  }
  return normalized;
}

export const db = {
  isUsingMongo: () => useMongo,

  async getProperties() {
    if (useMongo) {
      const collection = mongoDb.collection('properties');
      const docs = await collection.find({}).toArray();
      return docs.map(normalizeProperty);
    } else {
      return readLocalDb();
    }
  },

  async getPropertyById(id) {
    if (useMongo) {
      try {
        const collection = mongoDb.collection('properties');
        const doc = await collection.findOne({ _id: new ObjectId(id) });
        return normalizeProperty(doc);
      } catch (err) {
        // In case id is not a valid ObjectId (e.g. mock seed string ID)
        const collection = mongoDb.collection('properties');
        const doc = await collection.findOne({ $or: [{ _id: id }, { id: id }] });
        return normalizeProperty(doc);
      }
    } else {
      const list = readLocalDb();
      return list.find(p => p.id === id) || null;
    }
  },

  async createProperty(propertyData) {
    const id = useMongo ? new ObjectId().toString() : Math.random().toString(36).substring(2, 9);
    const newProperty = {
      id,
      ...propertyData,
      createdAt: new Date().toISOString()
    };

    if (useMongo) {
      const collection = mongoDb.collection('properties');
      const doc = { _id: new ObjectId(id), ...newProperty };
      delete doc.id; // Store as _id in mongo
      await collection.insertOne(doc);
      return newProperty;
    } else {
      const list = readLocalDb();
      list.push(newProperty);
      writeLocalDb(list);
      return newProperty;
    }
  },

  async updateProperty(id, propertyData) {
    if (useMongo) {
      const collection = mongoDb.collection('properties');
      let query = { _id: new ObjectId(id) };
      try {
        await collection.updateOne(query, { $set: propertyData });
      } catch (err) {
        query = { $or: [{ _id: id }, { id: id }] };
        await collection.updateOne(query, { $set: propertyData });
      }
      return this.getPropertyById(id);
    } else {
      const list = readLocalDb();
      const idx = list.findIndex(p => p.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...propertyData, updatedAt: new Date().toISOString() };
        writeLocalDb(list);
        return list[idx];
      }
      return null;
    }
  },

  async deleteProperty(id) {
    if (useMongo) {
      const collection = mongoDb.collection('properties');
      let query = { _id: new ObjectId(id) };
      try {
        const res = await collection.deleteOne(query);
        if (res.deletedCount === 0) {
          await collection.deleteOne({ id: id });
        }
      } catch (err) {
        await collection.deleteOne({ id: id });
      }
      return true;
    } else {
      const list = readLocalDb();
      const filtered = list.filter(p => p.id !== id);
      if (filtered.length !== list.length) {
        writeLocalDb(filtered);
        return true;
      }
      return false;
    }
  },

  async clearProperties() {
    if (useMongo) {
      const collection = mongoDb.collection('properties');
      await collection.deleteMany({});
    } else {
      writeLocalDb([]);
    }
  }
};
