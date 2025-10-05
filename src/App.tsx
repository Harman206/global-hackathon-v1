import { useEffect, useState } from "react";
import { useCompletion } from "./hooks/useCompletion";
import { useApp } from "./contexts";
import { listen } from "@tauri-apps/api/event";
import { Settings, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

const App = () => {
  const { input, response, isLoading, error, setInput, submit, stop, clear } = useCompletion();
  const { apiKey, setApiKey } = useApp();
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey);

  // Listen for focus event
  useEffect(() => {
    const unlistenPromise = listen<any>("focus-text-input", () => {
      const inputEl = document.querySelector("input");
      if (inputEl) {
        inputEl.focus();
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleSaveApiKey = () => {
    setApiKey(tempApiKey);
    setShowSettings(false);
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden justify-center items-start">
      <div className="w-full flex flex-col p-2 gap-2 bg-black/80 backdrop-blur-sm rounded-lg border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">GPT-4o-mini</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white/5 rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-white/80 text-xs">OpenAI API Key</label>
              <button
                onClick={() => setShowSettings(false)}
                className="text-white/60 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-white/10 text-white text-sm px-2 py-1 rounded border border-white/20 focus:outline-none focus:border-white/40"
            />
            <button
              onClick={handleSaveApiKey}
              className="w-full bg-white/20 hover:bg-white/30 text-white text-xs py-1 rounded transition-colors"
            >
              Save
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={apiKey ? "Ask anything..." : "Set API key first →"}
            disabled={!apiKey || isLoading}
            className="flex-1 bg-white/10 text-white px-3 py-2 rounded border border-white/20 focus:outline-none focus:border-white/40 placeholder:text-white/40 disabled:opacity-50"
          />
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!apiKey || !input.trim()}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          )}
        </form>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 text-red-300 text-sm px-3 py-2 rounded">
            {error}
          </div>
        )}

        {/* Response Display */}
        {response && (
          <div className="bg-white/5 rounded p-3 max-h-96 overflow-y-auto">
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                {response}
              </ReactMarkdown>
            </div>
            <button
              onClick={clear}
              className="mt-2 text-white/60 hover:text-white text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
