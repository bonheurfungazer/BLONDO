"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Send, FileText, Loader2, Bot, User, Trash2 } from "lucide-react";
import { uploadPdf, askQuestion } from "./actions";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadPdf(formData);
      if (result.sessionId) {
        setSessionId(result.sessionId);
        setMessages([
          { role: "assistant", content: `PDF uploaded successfully! I'm ready to answer your questions about it.` }
        ]);
        setFile(null); // Clear file input
      } else {
        // @ts-ignore
        alert(result.error || "Upload failed. No session ID returned.");
      }
    } catch (error: any) {
      console.error(error);
      alert("Error uploading file: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await askQuestion(sessionId, userMessage);
      if (result.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
      } else if (result.error) {
         setMessages((prev) => [...prev, { role: "assistant", content: "Error: " + result.error }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "No answer received." }]);
      }
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong: " + error.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-base-200 p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <h2 className="card-title text-2xl mb-4">Chat PDF</h2>
            <p className="mb-4 text-base-content/70">Upload a PDF document to start chatting with it.</p>

            <div className="form-control w-full max-w-xs mb-4">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="file-input file-input-bordered file-input-primary w-full max-w-xs"
              />
            </div>

            <div className="card-actions justify-end w-full">
              <button
                className="btn btn-primary w-full"
                onClick={handleUpload}
                disabled={!file || isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Upload size={20} className="mr-2" />}
                {isLoading ? "Processing..." : "Upload & Analyze"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-md px-4 z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" />
            <a className="btn btn-ghost text-xl">Chat PDF</a>
          </div>
        </div>
        <div className="flex-none">
          <button
            className="btn btn-ghost btn-sm text-error"
            onClick={() => {
              setSessionId(null);
              setMessages([]);
            }}
          >
            <Trash2 size={16} className="mr-1" />
            New PDF
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.map((msg, index) => (
          <div key={index} className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}>
            <div className="chat-image avatar placeholder">
              <div className={`rounded-full w-10 ${msg.role === "user" ? "bg-neutral text-neutral-content" : "bg-primary text-primary-content"}`}>
                <span className="text-xs">{msg.role === "user" ? <User size={20} /> : <Bot size={20} />}</span>
              </div>
            </div>
            <div className={`chat-bubble ${msg.role === "user" ? "chat-bubble-neutral" : "chat-bubble-primary"} text-sm md:text-base`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="chat chat-start">
             <div className="chat-image avatar placeholder">
              <div className="bg-primary text-primary-content rounded-full w-10">
                 <span className="text-xs"><Bot size={20} /></span>
              </div>
            </div>
            <div className="chat-bubble chat-bubble-primary">
               <Loader2 className="animate-spin w-5 h-5" />
            </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-base-100 p-4 border-t border-base-300 fixed bottom-0 left-0 right-0 w-full">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question about your PDF..."
            className="input input-bordered flex-1 focus:input-primary"
            disabled={isLoading}
          />
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
