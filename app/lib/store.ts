import { MemoryVectorStore } from "langchain/vectorstores/memory";

// Global map to store vector stores by session ID.
// Using a global variable ensures it persists (mostly) during the server lifetime.
// In a production app, use a real vector database (Pinecone, Weaviate, pgvector, etc.)

export const vectorStoreMap = new Map<string, MemoryVectorStore>();
