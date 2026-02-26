"use client";

import { useState } from "react";
import { uploadPdf, askQuestion } from "./actions";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await uploadPdf(formData);
      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setMessages([{ role: "assistant", content: "PDF uploaded successfully! Ask me anything about it." }]);
      } else {
        setError(result.error || "Failed to upload PDF");
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await askQuestion(sessionId, userMessage);
      if (result.success && result.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error: " + result.error }]);
      }
    } catch (err) {
       console.error(err);
       setMessages((prev) => [...prev, { role: "assistant", content: "Error: Failed to get response." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl min-h-screen flex flex-col font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center">Chat with PDF</h1>

      {!sessionId ? (
        <div className="card bg-base-100 shadow-xl p-6 border border-base-200">
            <h2 className="text-xl mb-4 font-semibold">Upload a PDF to start</h2>
            <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="file-input file-input-bordered file-input-primary w-full mb-4"
            />
            {error && <div className="text-error mb-4">{error}</div>}
            <button
                onClick={handleUpload}
                className="btn btn-primary w-full"
                disabled={!file || isLoading}
            >
                {isLoading ? <span className="loading loading-spinner"></span> : "Upload & Start Chat"}
            </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-[80vh]">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 bg-base-200 rounded-box border border-base-300">
                {messages.map((msg, index) => (
                    <div key={index} className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}>
                        <div className={`chat-bubble ${msg.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary"}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="chat chat-start">
                        <div className="chat-bubble chat-bubble-secondary animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask a question..."
                    className="input input-bordered flex-1 input-primary"
                    disabled={isLoading}
                />
                <button
                    onClick={handleSend}
                    className="btn btn-primary"
                    disabled={isLoading || !input.trim()}
                >
                    Send
                </button>
            </div>
            <button
                onClick={() => { setSessionId(null); setMessages([]); setFile(null); }}
                className="btn btn-ghost mt-4 btn-sm"
            >
                Upload New PDF
            </button>
        </div>
      )}
    </div>
  );
}
