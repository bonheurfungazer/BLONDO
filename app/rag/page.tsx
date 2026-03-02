import ChatPDF from "../components/ChatPDF";

export default function RagPage() {
  return (
    <main className="container mx-auto p-4 max-w-4xl min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Chat-PDF (Simplified RAG)</h1>
      <p className="text-gray-600 mb-8">
        Upload a PDF file (a course, a contract, etc.) and ask questions about its content.
        This uses LangChain, in-memory vector embeddings, and the Gemini 2.5 Flash Lite model via the Orcai API.
      </p>

      <ChatPDF />
    </main>
  );
}
