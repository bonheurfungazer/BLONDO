"use server";

import { ChatOpenAI } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Document } from "@langchain/core/documents";
// Use a local, fast keyword retriever that doesn't need external embedding APIs
// but satisfies the "Retrieval" aspect of RAG.
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Embeddings } from "@langchain/core/embeddings";

export async function uploadPdfAction(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file uploaded");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import to avoid Next.js build issues with pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buffer);

    return { success: true, text: data.text };
  } catch (error: any) {
    console.error("Error parsing PDF:", error);
    return { success: false, error: error.message };
  }
}

// Next.js Server Actions run in an isolated environment, but globalThis
// can be used to persist a simple retriever across requests in dev/prod.
const globalRetrieverCache = globalThis as unknown as {
    vectorStore: MemoryVectorStore | null;
    documentTextHash: string | null;
};

// Simple hashing function for the document text
function hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// Since OrcaAI endpoint does not seem to support embeddings via this API key,
// and we want to demonstrate standard RAG with MemoryVectorStore without using Fake vectors,
// we will use a naive embedding approach (e.g. TF-IDF like) mapping words to a small vector space,
// just to make MemoryVectorStore work deterministically and usefully.
class NaiveKeywordEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  _embed(text: string): number[] {
      // Create a deterministic vector of length 100 based on word frequencies
      const vec = new Array(100).fill(0);
      const words = text.toLowerCase().match(/\w+/g) || [];
      for (const word of words) {
          let h = 0;
          for (let i = 0; i < word.length; i++) {
              h = Math.imul(31, h) + word.charCodeAt(i) | 0;
          }
          const index = Math.abs(h) % 100;
          vec[index] += 1;
      }

      // Normalize
      const mag = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
      if (mag === 0) return vec;
      return vec.map(v => v / mag);
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map(doc => this._embed(doc));
  }
  async embedQuery(query: string): Promise<number[]> {
    return this._embed(query);
  }
}

export async function askQuestionAction(question: string, text: string) {
  try {
    if (!text) {
      throw new Error("No document text provided. Please upload a PDF first.");
    }

    const apiKey = process.env.ORCAI_API_KEY;
    if (!apiKey) {
      throw new Error("ORCAI_API_KEY environment variable is missing.");
    }

    const chat = new ChatOpenAI({
      apiKey: apiKey,
      configuration: {
        baseURL: process.env.ORCAI_BASE_URL || "https://cc.orcai.cc/api",
      },
      model: "gemini-2.5-flash-lite",
    });

    const textHash = hashText(text);

    // If the retriever is not cached or the document changed, we rebuild it.
    if (!globalRetrieverCache.vectorStore || globalRetrieverCache.documentTextHash !== textHash) {
        // RAG Step 1: Split the text
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await splitter.createDocuments([text]);

        // RAG Step 2: Build the vector store using Naive Keyword Embeddings
        const store = await MemoryVectorStore.fromDocuments(docs, new NaiveKeywordEmbeddings());

        // Cache for subsequent requests
        globalRetrieverCache.vectorStore = store;
        globalRetrieverCache.documentTextHash = textHash;
    }

    // RAG Step 3: Retrieve relevant documents
    const store = globalRetrieverCache.vectorStore;
    const relevantDocs = await store!.similaritySearch(question, 4);

    const context = relevantDocs.map((doc: Document) => doc.pageContent).join("\n\n");

    // RAG Step 4: Generation
    const template = `Answer the question based only on the following context:
    {context}

    Question: {question}

    Answer: `;

    const prompt = PromptTemplate.fromTemplate(template);

    const chain = RunnableSequence.from([
        prompt,
        chat,
        new StringOutputParser(),
    ]);

    const result = await chain.invoke({
        context: context,
        question: question,
    });

    return { success: true, answer: result };
  } catch (error: any) {
    console.error("Error asking question:", error);
    return { success: false, error: error.message };
  }
}
