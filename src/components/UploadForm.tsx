import React, { useState, useRef } from "react";
import { Upload, FileText, X, AlertCircle, Sparkles, Clipboard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UploadFormProps {
  onGenerate: (payload: {
    fileBase64?: string;
    fileName?: string;
    fileType?: string;
    textPaste?: string;
    initialTime: number;
  }) => void;
  isLoading: boolean;
}

const FACILITATOR_TIPS = [
  "Gemini is analyzing your document structure...",
  "Identifying central meeting goals and core objectives...",
  "Parsing key topics, reports, and contextual summaries...",
  "Extracting actionable decisions and next steps...",
  "Calibrating presenter roles and stakeholder associations...",
  "Formatting dynamic time allocations for each section..."
];

export default function UploadForm({ onGenerate, isLoading }: UploadFormProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [textPaste, setTextPaste] = useState("");
  const [duration, setDuration] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotating loading tip index
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setCurrentTipIndex(0);
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % FACILITATOR_TIPS.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (!["docx", "md", "txt"].includes(ext || "")) {
        setErrorMsg("Please upload a .docx, .md, or .txt file only.");
        return;
      }
      setErrorMsg("");
      setFile(selected);
      setTextPaste(""); // Clear text paste if file uploaded
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (!["docx", "md", "txt"].includes(ext || "")) {
        setErrorMsg("Please upload a .docx, .md, or .txt file only.");
        return;
      }
      setErrorMsg("");
      setFile(selected);
      setTextPaste("");
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "upload" && !file) {
      setErrorMsg("Please select or drop a file to process.");
      return;
    }
    if (activeTab === "paste" && !textPaste.trim()) {
      setErrorMsg("Please paste some text documentation to process.");
      return;
    }

    setErrorMsg("");

    if (activeTab === "upload" && file) {
      const reader = new FileReader();
      reader.onload = () => {
        const resultString = reader.result as string;
        const base64 = resultString.split(",")[1];
        onGenerate({
          fileBase64: base64,
          fileName: file.name,
          fileType: file.type,
          initialTime: duration,
        });
      };
      reader.onerror = () => {
        setErrorMsg("Error reading the selected file.");
      };
      reader.readAsDataURL(file);
    } else {
      onGenerate({
        textPaste,
        initialTime: duration,
      });
    }
  };

  const quickDurations = [15, 30, 45, 60, 90, 120];

  return (
    <div id="upload-form-container" className="w-full bg-white rounded-2xl border border-neutral-200/80 shadow-md shadow-neutral-100 p-6 md:p-8">
      <div className="flex flex-col gap-1 mb-6">
        <h2 id="generator-title" className="text-xl font-bold text-neutral-800 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          Agenda Source Material
        </h2>
        <p className="text-sm text-neutral-500">
          Upload report files or paste content. Gemini will formulate a structured team meeting.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Toggle Mode */}
        <div className="flex bg-neutral-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              setErrorMsg("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "upload"
                ? "bg-white text-neutral-800 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("paste");
              setErrorMsg("");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              activeTab === "paste"
                ? "bg-white text-neutral-800 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Clipboard className="w-4 h-4" />
            Paste Raw Text
          </button>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          {activeTab === "upload" ? (
            <motion.div
              key="upload-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {!file ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/20"
                      : "border-neutral-200 hover:border-neutral-300 bg-neutral-50/50"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".docx,.md,.txt"
                    className="hidden"
                  />
                  <div className="p-3 bg-neutral-100 rounded-lg text-neutral-600">
                    <Upload className="w-6 h-6 text-neutral-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-neutral-700 text-sm">
                      Drag & drop a file here, or <span className="text-indigo-600 hover:underline">browse</span>
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Supports Word (.docx), Markdown (.md), or Plain Text (.txt)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="paste-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-2"
            >
              <textarea
                placeholder="Paste emails, project outline, team notes, specifications or report outlines here..."
                value={textPaste}
                onChange={(e) => setTextPaste(e.target.value)}
                rows={6}
                className="w-full text-sm p-4 rounded-xl border border-neutral-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-150 outline-none transition-all placeholder:text-neutral-400"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meeting Duration selector */}
        <div className="space-y-3.5">
          <div className="flex justify-between items-baseline">
            <label className="text-sm font-bold text-neutral-700">
              Total Meeting Time
            </label>
            <span className="text-sm font-bold text-indigo-600 font-mono">
              {duration} minutes
            </span>
          </div>

          <input
            type="range"
            min={15}
            max={180}
            step={5}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-indigo-600 h-1.5 bg-neutral-200 rounded-lg cursor-pointer"
          />

          <div className="flex flex-wrap gap-2 pt-1">
            {quickDurations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                  duration === d
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                    : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>

        {/* Error reporting */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Submit action */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3.5 px-4 rounded-xl font-bold shadow-md shadow-neutral-100 transition-all text-sm flex items-center justify-center gap-2.5 ${
            isLoading
              ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none"
              : "bg-neutral-900 text-white hover:bg-neutral-800 active:scale-[0.99] cursor-pointer"
          }`}
        >
          {isLoading ? (
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="font-semibold text-neutral-600">Formulating Agenda...</span>
              </div>
              <p className="text-[11px] font-normal text-neutral-400 text-center italic tracking-normal mt-0.5">
                {FACILITATOR_TIPS[currentTipIndex]}
              </p>
            </div>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-indigo-300" />
              Generate Timed Agenda
            </>
          )}
        </button>
      </form>
    </div>
  );
}
