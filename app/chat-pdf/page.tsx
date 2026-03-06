"use client";

import { useState } from "react";
import { uploadPdfAction, askQuestionAction } from "../actions";

export default function ChatPdf() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pdfText, setPdfText] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setPdfText("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadPdfAction(formData);
      if (result.success && result.text) {
          setPdfText(result.text);
      } else {
          setError(result.error || "Failed to upload and parse PDF");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async () => {
    if (!question || !pdfText) return;

    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const result = await askQuestionAction(question, pdfText);
      if (result.success && result.answer) {
        setAnswer(result.answer);
      } else {
        setError(result.error || "Failed to get an answer");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">Chat-PDF</h1>

        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload a PDF Document</label>
          <div className="flex gap-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md"
            />
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
            >
              Upload
            </button>
          </div>
        </div>

        {pdfText && (
          <div className="mb-8">
            <div className="bg-green-50 text-green-700 p-4 rounded-md mb-4 border border-green-200">
              PDF loaded successfully. You can now ask questions about it.
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ask a Question</label>
            <div className="flex gap-4">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What is this document about?"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              />
              <button
                onClick={handleAsk}
                disabled={!question || loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
              >
                Ask
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Processing...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4 border border-red-200">
            {error}
          </div>
        )}

        {answer && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Answer:</h2>
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-gray-700 whitespace-pre-wrap">
              {answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
