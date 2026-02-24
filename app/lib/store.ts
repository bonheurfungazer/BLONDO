import { MemoryVectorStore } from "langchain/vectorstores/memory";

// Global map to store vector stores by session ID
// In a real app, this should be a persistent database (e.g., Pinecone, pgvector)
// For this simplified demo, we use an in-memory map.
// Note: This will be reset on server restart.

export const vectorStoreMap = new Map<string, MemoryVectorStore>();
