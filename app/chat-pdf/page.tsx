"use client";

import { useState, useRef } from "react";
import { extractTextFromPdf, askQuestion } from "./actions";
import { Upload, FileText, Send, Loader2, MessageSquare, RefreshCcw } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);

      const text = await extractTextFromPdf(formData);
      setDocumentText(text);
      setMessages([{
        id: "sys-1",
        role: "assistant",
        content: `J'ai analysé votre fichier "${file.name}". Posez-moi des questions sur son contenu !`
      }]);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de l'analyse du PDF : " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !documentText || isAnswering) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsAnswering(true);
    setError(null);

    // Scroll to bottom
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    try {
      const answer = await askQuestion(userMsg.content, documentText);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: answer,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors de la génération de la réponse : " + err.message);
    } finally {
      setIsAnswering(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  const handleReset = () => {
    setFile(null);
    setDocumentText(null);
    setMessages([]);
    setInput("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center py-10 px-4">
      <div className="max-w-4xl w-full flex flex-col h-[85vh] bg-base-100 rounded-2xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="bg-primary text-primary-content p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6" />
            <h1 className="text-xl font-bold">Chat-PDF (RAG Simplifié)</h1>
          </div>
          {documentText && (
            <button onClick={handleReset} className="btn btn-sm btn-ghost gap-2">
              <RefreshCcw className="w-4 h-4" />
              Nouveau PDF
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert-error rounded-none">
            <span>{error}</span>
          </div>
        )}

        {/* Content area */}
        {!documentText ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <FileText className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold">Bienvenue sur Chat-PDF</h2>
            <p className="text-base-content/70 max-w-md">
              Téléversez un fichier PDF (cours, contrat, article) pour pouvoir poser des questions sur son contenu en utilisant l&apos;intelligence artificielle.
            </p>

            <div className="flex flex-col items-center gap-4 w-full max-w-xs mt-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="file-input file-input-bordered file-input-primary w-full"
                ref={fileInputRef}
                disabled={isUploading}
              />

              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="btn btn-primary w-full gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Analyser le PDF
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-200/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}>
                  <div className={`chat-bubble ${msg.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary bg-base-100 text-base-content shadow-sm"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAnswering && (
                <div className="chat chat-start">
                  <div className="chat-bubble chat-bubble-secondary bg-base-100 text-base-content shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recherche dans le document...
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-base-100 border-t border-base-300">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Posez une question sur le document..."
                  className="input input-bordered flex-1"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isAnswering}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isAnswering}
                  className="btn btn-primary"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
