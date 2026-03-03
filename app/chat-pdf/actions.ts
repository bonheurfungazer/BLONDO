"use server";

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

export async function extractTextFromPdf(formData: FormData): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) {
    throw new Error("No file provided");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Import pdf-parse inside the server action to avoid build-time errors
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");

  const data = await pdfParse(buffer);
  return data.text;
}

export async function askQuestion(question: string, documentText: string): Promise<string> {
  if (!question || !documentText) {
    throw new Error("Question and document text are required");
  }

  // Configuration for Orca API
  const apiKey = process.env.ORCAI_API_KEY || "";
  const baseURL = process.env.ORCAI_BASE_URL || "https://cc.orcai.cc/api/v1";

  // Split document into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await splitter.createDocuments([documentText]);

  // Create vector store
  const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-3-small",
    configuration: {
      baseURL: baseURL,
      apiKey: apiKey,
    },
  });

  const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

  // Retrieve relevant chunks
  const relevantDocs = await vectorStore.similaritySearch(question, 3);
  const context = relevantDocs.map((doc) => doc.pageContent).join("\n\n");

  // Generate answer
  const chat = new ChatOpenAI({
    modelName: "gemini-2.5-flash-lite",
    configuration: {
      baseURL: baseURL,
      apiKey: apiKey,
    },
  });

  const prompt = `You are an AI assistant. Use the following context to answer the question at the end.
If you don't know the answer based on the context, just say that you don't know, don't try to make up an answer.

Context:
${context}

Question: ${question}

Answer:`;

  const response = await chat.invoke(prompt);
  return String(response.content);
}
