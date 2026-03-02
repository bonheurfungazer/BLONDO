import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export async function processPdf(pdfBuffer: Buffer) {
  // We must import pdf-parse here to avoid Next.js build issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");

  try {
    const data = await pdfParse(pdfBuffer);
    return { success: true, text: data.text, message: "PDF processed successfully" };
  } catch (error) {
    console.error("Error processing PDF:", error);
    return { success: false, text: "", message: "Failed to process PDF" };
  }
}

export async function askQuestion(question: string, contextText: string) {
  if (!contextText) {
    return { success: false, answer: "No context provided. Please upload a PDF first." };
  }

  const API_KEY = process.env.ORCAI_API_KEY;
  const BASE_URL = process.env.ORCAI_BASE_URL || "https://cc.orcai.cc/api/v1";
  const MODEL_NAME = "gemini-2.5-flash-lite";

  if (!API_KEY) {
      return { success: false, answer: "Server configuration error: ORCAI_API_KEY is not set." };
  }

  try {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const docs = await textSplitter.createDocuments([contextText]);

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: API_KEY,
      configuration: {
        baseURL: BASE_URL,
      },
      modelName: "text-embedding-3-small", // fallback embedding model
    });

    const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

    const model = new ChatOpenAI({
      openAIApiKey: API_KEY,
      configuration: {
        baseURL: BASE_URL,
      },
      modelName: MODEL_NAME,
    });

    const retriever = vectorStore.asRetriever();
    const relevantDocs = await retriever.invoke(question);
    const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

    const prompt = `Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say that you don't know, don't try to make up an answer.

Context:
${context}

Question: ${question}

Answer:`;

    const response = await model.invoke(prompt);

    return { success: true, answer: response.content };
  } catch (error) {
    console.error("Error asking question:", error);
    return { success: false, answer: "Failed to answer question. Ensure your API key is correct." };
  }
}
