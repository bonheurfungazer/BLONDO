"use client";

import { useState, useRef } from "react";
import { uploadPdf, chat } from "../actions";

export default function ChatPDF() {
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pdfText, setPdfText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadPdf(formData);
    setIsUploading(false);

    if (result?.success && result.text) {
      setPdfText(result.text);
      setMessages([{ role: "bot", content: "PDF uploaded successfully! You can now ask me questions about it." }]);
    } else {
      setMessages([{ role: "bot", content: "Failed to upload PDF. Please try again." }]);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsTyping(true);

    const result = await chat(userMessage, pdfText);
    setIsTyping(false);

    if (result?.success) {
      setMessages((prev) => [...prev, { role: "bot", content: result.answer as string }]);
    } else {
      setMessages((prev) => [...prev, { role: "bot", content: "Failed to get an answer. Please try again." }]);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border border-base-300 rounded-lg bg-base-100 shadow-sm mt-8">
      {/* Header / Upload */}
      <div className="p-4 border-b border-base-300 bg-base-200 flex justify-between items-center rounded-t-lg">
        <h2 className="font-bold text-lg">ChatPDF (RAG)</h2>
        <div>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleUpload}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !pdfText && (
          <div className="text-center text-gray-500 mt-10">
            Upload a PDF to start chatting!
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}
          >
            <div className={`chat-bubble ${msg.role === "user" ? "chat-bubble-primary" : "chat-bubble-secondary"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="chat chat-start">
            <div className="chat-bubble chat-bubble-secondary">Typing...</div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-base-300 bg-base-200 rounded-b-lg flex gap-2">
        <input
          type="text"
          className="input input-bordered flex-1"
          placeholder="Ask a question about the PDF..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
          disabled={!pdfText || isTyping}
        />
        <button
          className="btn btn-primary"
          onClick={handleSendMessage}
          disabled={!pdfText || isTyping || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
