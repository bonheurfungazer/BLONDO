"use server";

import { processPdf, askQuestion } from "./lib/rag";

export async function uploadPdf(formData: FormData): Promise<{ success: boolean; message: string; text?: string }> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, message: "No file provided" };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    return await processPdf(buffer);
  } catch (error) {
    console.error("Error in uploadPdf action:", error);
    return { success: false, message: "Error uploading PDF" };
  }
}

export async function chat(question: string, contextText: string) {
  try {
    return await askQuestion(question, contextText);
  } catch (error) {
    console.error("Error in chat action:", error);
    return { success: false, answer: "Error asking question" };
  }
}
