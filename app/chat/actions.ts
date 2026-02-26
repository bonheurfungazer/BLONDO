"use server";

import { vectorStoreMap } from "../lib/store";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

// Configuration
const API_KEY = process.env.ORCAI_API_KEY;
const BASE_URL = process.env.ORCAI_BASE_URL;

// Model Name
// Usually OpenAI compatible models don't have spaces. But the user said "gemini 2.5 flash lite".
// I'll try with spaces, if fail, try replacing with hyphens.
const CHAT_MODEL = "gemini-2.5-flash-lite";
const EMBEDDING_MODEL = "text-embedding-004";

export async function uploadPdf(formData: FormData) {
  try {
    if (!API_KEY || !BASE_URL) {
        throw new Error("Server misconfiguration: Missing API Key or Base URL.");
    }

    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file uploaded");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF
    const data = await pdfParse(buffer);
    const text = data.text;

    // Split text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text]);

    // Create Embeddings
    // Note: If the provider does not support embeddings, this will fail.
    // In that case, we might need a local embedding model.
    const embeddings = new OpenAIEmbeddings({
      apiKey: API_KEY,
      configuration: {
        baseURL: BASE_URL,
      },
      modelName: EMBEDDING_MODEL,
    });

    // Create Vector Store in memory
    const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

    // Generate Session ID
    const sessionId = crypto.randomUUID();

    // Store in Global Map
    vectorStoreMap.set(sessionId, vectorStore);

    return { success: true, sessionId };
  } catch (error) {
    console.error("Error processing PDF:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to process PDF" };
  }
}

export async function askQuestion(sessionId: string, question: string) {
  try {
    if (!API_KEY || !BASE_URL) {
        throw new Error("Server misconfiguration: Missing API Key or Base URL.");
    }

    const vectorStore = vectorStoreMap.get(sessionId);

    if (!vectorStore) {
        return { success: false, error: "Session expired or not found. Please re-upload the PDF." };
    }

    const retriever = vectorStore.asRetriever();
    // Retrieve relevant documents
    const relevantDocs = await retriever.invoke(question);
    const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

    const model = new ChatOpenAI({
      apiKey: API_KEY,
      configuration: {
        baseURL: BASE_URL,
      },
      modelName: CHAT_MODEL,
      temperature: 0.7,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", "You are a helpful assistant. Answer the user's question based on the following context:\n\n{context}"],
      ["user", "{question}"],
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    const response = await chain.invoke({
      context,
      question,
    });

    return { success: true, answer: response };

  } catch (error) {
    console.error("Error asking question:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to get answer." };
  }
}
