import { useState, useRef } from "react";
import { FiBarChart2, FiUploadCloud, FiFile, FiLoader, FiCheckCircle, FiRefreshCw } from "react-icons/fi";

export default function NavbarAndUpload({ onAnalyze, onReset, isLoaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  function handleFile(e) {
    setFile(e.target.files[0]);
    setDone(false);
  }

  function formatBytes(b) {
    return b < 1024 ? b + " B" : (b / 1024).toFixed(1) + " KB";
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
    onAnalyze();
  }

  function handleReset() {
    setFile(null);
    setDone(false);
    onReset();
  }

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <FiBarChart2 size={20} />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-800 tracking-tight">ReviewLens</span>
              <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 font-medium px-2 py-0.5 rounded-full">
                AI Review Analytics
              </span>
            </div>
          </div>
          {isLoaded && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <FiRefreshCw size={14} />
              Reset Demo
            </button>
          )}
        </nav>

        <div className="py-5">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Upload Reviews CSV
          </p>

          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            <FiUploadCloud size={34} className="text-indigo-400" />
            <p className="text-slate-600 font-medium text-sm">
              {file ? "Change file" : "Click to select a .csv file"}
            </p>
            <p className="text-xs text-slate-400">Accepts .csv files only</p>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          {file && (
            <div className="mt-3 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <FiFile size={18} className="text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {loading && <FiLoader size={14} className="animate-spin" />}
                {loading ? "Analyzing…" : "Analyze Reviews"}
              </button>
            </div>
          )}

          {done && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Total Rows Processed", value: "30" },
                { label: "Empty / Duplicates Skipped", value: "2 empty · 1 duplicate" },
                { label: "AI Calls · Cache Hits", value: "9 calls · 3 hits" },
                { label: "Processing Time", value: "1.2s" },
              ].map((s) => (
                <div key={s.label} className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex flex-col gap-0.5">
                  <span className="text-xs text-emerald-600 font-medium">{s.label}</span>
                  <span className="text-sm font-bold text-emerald-800">{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
