"use client";

import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { Upload, FileImage, Loader2 } from "lucide-react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

interface AnalysisResult {
  analysis: string;
}

const ImageAnalyzer = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setAnalysis(null); // Clear previous analysis
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(
        "http://localhost:8000/analyze-image/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      // Clean up the response and handle escaped characters
      const cleanAnalysis = response.data.analysis
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'");
      setAnalysis(cleanAnalysis);
    } catch (error) {
      console.error("Error analyzing image:", error);
      setAnalysis("Error analyzing image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col p-6 space-y-4">
      <div className="w-full flex flex-col items-center justify-center mt-8 mb-6">
        {/* <div className="bg-gradient-to-br from-emerald-500 to-blue-600 rounded-full p-3 mb-2 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect width="18" height="14" x="3" y="5" rx="2"/><circle cx="8.5" cy="10.5" r="1.5"/><path d="M21 19l-5.5-5.5a2.121 2.121 0 00-3 0L3 19"/></svg>
        </div> */}
        <h2 className="text-2xl font-bold text-white mb-1">Medical Imaging Analysis</h2>
        <p className="text-gray-300 text-sm text-center max-w-xl">Upload and analyze medical images including X-rays, CT scans, and other diagnostic imaging. Get AI-powered insights and preliminary analysis.</p>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        {/* Upload Section */}
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="w-full max-w-md">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="max-h-48 max-w-full object-contain"
                  />
                ) : (
                  <>
                    <Upload className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      X-Ray images (PNG, JPG, JPEG)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {selectedFile && (
            <Button
              onClick={analyzeImage}
              disabled={loading}
              className="w-full max-w-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileImage className="mr-2 h-4 w-4" />
                  Analyze Image
                </>
              )}
            </Button>
          )}
        </div>

        {/* Analysis Results */}
        <div className="flex-1">
          <div className="bg-gray-800 rounded-lg p-4 h-full">
            <h3 className="text-lg font-semibold text-white mb-4">
              Analysis Results
            </h3>
            {analysis ? (
              <div className="text-gray-300 overflow-y-auto max-h-96 prose prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-2">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-yellow-300">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-400 pl-4 italic">{children}</blockquote>,
                    code: ({ children }) => <code className="bg-gray-700 px-1 py-0.5 rounded text-sm">{children}</code>,
                    pre: ({ children }) => <pre className="bg-gray-700 p-2 rounded overflow-x-auto">{children}</pre>,
                  }}
                >
                  {analysis}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Upload an X-ray image and click "Analyze Image" to get started
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAnalyzer; 