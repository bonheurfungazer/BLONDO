"use server";

import { vectorStoreMap } from "../lib/store";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
// @ts-expect-error pdf-parse type definition mismatch
import pdf from "pdf-parse/lib/pdf-parse.js";
import { randomUUID } from "crypto";

// We'll reuse the embedding model instance if possible to save load time
let embeddingModel: HuggingFaceTransformersEmbeddings | null = null;

async function getEmbeddingModel() {
  if (!embeddingModel) {
    embeddingModel = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });
  }
  return embeddingModel;
}

export async function uploadPdf(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { error: "No file uploaded" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let data;
    try {
      data = await pdf(buffer);
    } catch (e: any) {
      console.error("PDF Parse Error:", e);
      return { error: "Failed to parse PDF: " + (e.message || "Unknown error") };
    }

    const text = data.text;
    if (!text) {
      return { error: "No text extracted from PDF" };
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await splitter.createDocuments([text]);

    const embeddings = await getEmbeddingModel();

    const vectorStore = await MemoryVectorStore.fromDocuments(
      docs,
      embeddings
    );

    const sessionId = randomUUID();
    vectorStoreMap.set(sessionId, vectorStore);

    return { sessionId, message: "PDF processed successfully", pageCount: data.numpages };
  } catch (error: any) {
    console.error("Upload Error:", error);
    return { error: "Processing failed: " + (error.message || "Unknown error") };
  }
}

export async function askQuestion(sessionId: string, question: string) {
  const vectorStore = vectorStoreMap.get(sessionId);
  if (!vectorStore) {
    return { error: "Session expired or invalid. Please upload the PDF again." };
  }

  const retriever = vectorStore.asRetriever();

  const template = `You are a helpful assistant. Answer the question based only on the following context. If you don't know the answer, say you don't know.

Context:
{context}

Question: {question}
`;

  const prompt = PromptTemplate.fromTemplate(template);

  const model = new ChatOpenAI({
    modelName: "gemini 2.5 flash lite",
    openAIApiKey: "cr_38a682b85cce2aad0378038336892f787092dce9202314641859b6710eaf32e8",
    configuration: {
        baseURL: "https://cc.orcai.cc/api/v1",
    },
    temperature: 0.7,
  });

  const chain = RunnableSequence.from([
    {
      context: async (input: string) => {
        const relevantDocs = await retriever.getRelevantDocuments(input);
        return relevantDocs.map((doc) => doc.pageContent).join("\n\n");
      },
      question: (input: string) => input,
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  try {
      const response = await chain.invoke(question);
      return { answer: response };
  } catch (error: any) {
      console.error("Error calling LLM:", error);
      return { error: "Failed to get answer from AI. " + (error.message || "") };
  }
}
