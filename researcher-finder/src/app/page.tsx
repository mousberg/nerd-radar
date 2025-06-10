"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  Users,
  Mail,
  ExternalLink,
  Building2,
  GraduationCap,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Settings,
  Star,
  Trash2,
  MessageSquare,
  Copy,
  Loader2,
} from "lucide-react";
import NerdRadarHeaderLogo from "./components/NerdRadarHeaderLogo";

interface ArXivPaper {
  title: string;
  published: string;
  arxiv_id: string;
  link: string;
}

interface GoogleScholarProfile {
  name: string;
  title?: string;
  affiliation?: string;
  cited_by?: number;
  profile_link?: string;
  research_interests?: string[];
  recent_papers?: {
    title: string;
    year?: string;
    cited_by?: number;
    link?: string;
  }[];
}

interface Researcher {
  name: string;
  email?: string;
  orcid?: string;
  institution?: string;
  website?: string;
  linkedin?: string;
  google_scholar?: string;
  researchgate?: string;
  research_areas: string[];
  arxiv_papers: ArXivPaper[];
  paper_count: number;
  additional_contacts: string[];
  google_scholar_info?: GoogleScholarProfile;
}

interface Paper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  link: string;
  pdf_url?: string;
}

interface SearchResult {
  papers: Paper[];
  query: string;
}

interface AnalysisResult {
  url: string;
  paper_title: string;
  researchers: Researcher[];
}

interface SearchFilters {
  duration: string;
  maxResults: number;
  sortBy: string;
  categories: string[];
}

interface ConsoleLog {
  id: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  timestamp: Date;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzingPaper, setAnalyzingPaper] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [paperAnalysisResults, setPaperAnalysisResults] = useState<
    Record<string, AnalysisResult>
  >({});
  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const [selectedResearchers, setSelectedResearchers] = useState<Researcher[]>(
    []
  );
  const [dragOverFavorites, setDragOverFavorites] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState<
    Record<string, string>
  >({});
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );
  const [generatingMessage, setGeneratingMessage] = useState<string | null>(
    null
  );
  const [paperSummaries, setPaperSummaries] = useState<Record<string, string>>(
    {}
  );
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(
    null
  );
  const [filters, setFilters] = useState<SearchFilters>({
    duration: "2years",
    maxResults: 15,
    sortBy: "relevance",
    categories: [],
  });

  const addConsoleLog = (
    message: string,
    type: ConsoleLog["type"] = "info"
  ) => {
    const newLog: ConsoleLog = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date(),
    };
    setConsoleLogs((prev) => [...prev.slice(-9), newLog]);
  };

  const clearConsoleLogs = () => {
    setConsoleLogs([]);
  };

  // Auto-scroll console to bottom when new logs are added
  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop =
        consoleContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  // Drag and drop handlers for researcher favorites
  const handleDragStart = (e: React.DragEvent, researcher: Researcher) => {
    e.dataTransfer.setData("researcher", JSON.stringify(researcher));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverFavorites(true);
  };

  const handleDragLeave = () => {
    setDragOverFavorites(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFavorites(false);

    try {
      const researcherData = e.dataTransfer.getData("researcher");
      if (researcherData) {
        const researcher = JSON.parse(researcherData) as Researcher;

        // Check if researcher is already in favorites
        const isAlreadySelected = selectedResearchers.some(
          (selected) =>
            selected.name === researcher.name &&
            selected.institution === researcher.institution
        );

        if (!isAlreadySelected) {
          setSelectedResearchers((prev) => [...prev, researcher]);
          addConsoleLog(`✨ Added ${researcher.name} to favorites`, "success");
        } else {
          addConsoleLog(
            `⚠️ ${researcher.name} already in favorites`,
            "warning"
          );
        }
      }
    } catch (error) {
      console.error("Error dropping researcher:", error);
    }
  };

  const removeFromFavorites = (researcher: Researcher) => {
    setSelectedResearchers((prev) =>
      prev.filter(
        (selected) =>
          !(
            selected.name === researcher.name &&
            selected.institution === researcher.institution
          )
      )
    );
    addConsoleLog(`🗑️ Removed ${researcher.name} from favorites`, "info");
  };

  const generateMessage = async (researcher: Researcher) => {
    const researcherKey = `${researcher.name}-${researcher.institution}`;
    setGeneratingMessage(researcherKey);

    try {
      addConsoleLog(
        `💬 Generating personalized message for ${researcher.name}...`,
        "info"
      );

      const response = await fetch("/api/generate-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ researcher }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate message");
      }

      const data = await response.json();

      setGeneratedMessages((prev) => ({
        ...prev,
        [researcherKey]: data.message,
      }));

      setExpandedMessages((prev) => new Set([...prev, researcherKey]));

      addConsoleLog(`✅ Message generated for ${researcher.name}`, "success");
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "An error occurred";
      addConsoleLog(`❌ Failed to generate message: ${errorMsg}`, "error");
    } finally {
      setGeneratingMessage(null);
    }
  };

  const toggleMessageExpansion = (researcherKey: string) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(researcherKey)) {
        newSet.delete(researcherKey);
      } else {
        newSet.add(researcherKey);
      }
      return newSet;
    });
  };

  const copyMessage = async (message: string, researcherName: string) => {
    try {
      await navigator.clipboard.writeText(message);
      addConsoleLog(`📋 Message copied for ${researcherName}`, "success");
    } catch (error) {
      addConsoleLog(`❌ Failed to copy message`, "error");
    }
  };

  const generatePaperSummary = async (paper: Paper) => {
    setGeneratingSummary(paper.id);

    try {
      addConsoleLog(`✨ Generating engaging summary for paper...`, "info");

      const response = await fetch("/api/summarize-paper", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: paper.title,
          abstract: paper.summary,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();

      setPaperSummaries((prev) => ({
        ...prev,
        [paper.id]: data.summary,
      }));

      addConsoleLog(`🎉 AI summary generated with emojis!`, "success");
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "An error occurred";
      addConsoleLog(`❌ Failed to generate summary: ${errorMsg}`, "error");
    } finally {
      setGeneratingSummary(null);
    }
  };

  const searchPapers = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearchResults(null);
    setPaperAnalysisResults({});
    setExpandedPapers(new Set());
    setPaperSummaries({});
    clearConsoleLogs();

    try {
      addConsoleLog("🔍 Initializing paper search engine...", "info");
      addConsoleLog(
        "🤖 Converting natural language to search parameters...",
        "info"
      );
      addConsoleLog(
        `📊 Configuration: ${filters.maxResults} papers, ${filters.duration} timeframe`,
        "info"
      );
      addConsoleLog("🌐 Connecting to ArXiv API servers...", "info");

      // Add realistic delays to show the process
      await new Promise((resolve) => setTimeout(resolve, 800));
      addConsoleLog("📡 Sending search request to ArXiv...", "info");

      const response = await fetch("/api/search-papers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          filters,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to search papers");
      }

      addConsoleLog("✨ Processing ArXiv response data...", "info");
      await new Promise((resolve) => setTimeout(resolve, 500));
      addConsoleLog("🔍 Parsing paper metadata and abstracts...", "info");

      const data: SearchResult = await response.json();

      await new Promise((resolve) => setTimeout(resolve, 300));
      addConsoleLog("📚 Extracting author information...", "info");
      addConsoleLog("🏗️ Building paper database...", "info");

      addConsoleLog(
        `✅ Successfully found ${data.papers.length} relevant papers`,
        "success"
      );

      if (data.papers.length > 0) {
        addConsoleLog("📋 Papers ready for researcher analysis", "success");
      }
      setSearchResults(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      addConsoleLog(`❌ Error: ${errorMsg}`, "error");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const analyzeResearchers = async (pdfUrl: string, paperId: string) => {
    setAnalyzingPaper(paperId);
    setError("");

    try {
      addConsoleLog(
        `🔬 Starting researcher analysis for paper ${paperId.substring(
          0,
          8
        )}...`,
        "info"
      );
      addConsoleLog("📄 Downloading and parsing PDF content...", "info");

      await new Promise((resolve) => setTimeout(resolve, 600));
      addConsoleLog("🔍 Extracting author names and affiliations...", "info");
      addConsoleLog("📧 Scanning for contact information...", "info");

      const response = await fetch("/api/analyze-researchers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze researchers");
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
      addConsoleLog("🤖 Processing author data with AI...", "info");

      const data: AnalysisResult = await response.json();

      // Filter researchers to only include those with available author details
      const researchersWithDetails = data.researchers.filter(
        (r) => r.google_scholar_info
      );

      addConsoleLog(
        `👥 Identified ${researchersWithDetails.length} researchers with available author details`,
        "success"
      );

      if (data.researchers.length > 0) {
        try {
          addConsoleLog("🎓 Searching author profiles...", "info");
          await new Promise((resolve) => setTimeout(resolve, 500));
          addConsoleLog(
            "📊 Fetching citation data and publications...",
            "info"
          );

          const scholarResponse = await fetch("/api/google-scholar", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ researchers: data.researchers }),
          });

          if (scholarResponse.ok) {
            const scholarData = await scholarResponse.json();
            data.researchers = scholarData.researchers;
            await new Promise((resolve) => setTimeout(resolve, 300));
            addConsoleLog(
              "✅ Enhanced profiles with author's details",
              "success"
            );
            addConsoleLog(
              "📈 Added citation counts and research interests",
              "success"
            );
          } else {
            addConsoleLog(
              `⚠️ Author data API error: ${scholarResponse.status}`,
              "warning"
            );
            addConsoleLog("📝 Using basic researcher information", "info");
          }
        } catch (error) {
          addConsoleLog(
            "⚠️ SerpApi unavailable, proceeding with basic data",
            "warning"
          );
        }
      }

      setPaperAnalysisResults((prev) => ({
        ...prev,
        [paperId]: data,
      }));

      setExpandedPapers((prev) => new Set([...prev, paperId]));
      addConsoleLog("🎉 Researcher analysis complete!", "success");
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "An error occurred during analysis";
      addConsoleLog(`❌ Analysis failed: ${errorMsg}`, "error");
      setError(errorMsg);
    } finally {
      setAnalyzingPaper(null);
    }
  };

  const togglePaperExpansion = (paperId: string) => {
    setExpandedPapers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paperId)) {
        newSet.delete(paperId);
      } else {
        newSet.add(paperId);
      }
      return newSet;
    });
  };

  const examplePrompts = [
    "Find recent papers on machine learning applications in healthcare",
    "Search for research on quantum computing algorithms",
    "Look for papers about natural language processing and transformers",
    "Find studies on computer vision for autonomous vehicles",
    "Search for work on deep learning optimization techniques",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50">
      {/* Logo Header */}
      <div className="pt-6 pb-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="cursor-pointer" onClick={() => window.location.reload()}>
            <NerdRadarHeaderLogo />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Console */}
          <div className="w-80 shrink-0">
            <div className="sticky top-8 space-y-8">
              {/* Console */}
              <div className="bg-emerald-900/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 font-mono text-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"></div>
                    <div className="w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50"></div>
                    <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg shadow-red-400/50"></div>
                    <span className="text-emerald-700 ml-3 text-xs font-semibold">
                      Live Console
                    </span>
                  </div>
                  <button
                    onClick={clearConsoleLogs}
                    className="text-emerald-600 hover:text-emerald-800 text-xs font-medium px-3 py-1 rounded-full hover:bg-white/10 transition-all"
                  >
                    Clear
                  </button>
                </div>
                <div
                  ref={consoleContainerRef}
                  className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar"
                >
                  {consoleLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 animate-fadeIn p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
                    >
                      <span className="text-emerald-500/70 text-xs shrink-0 mt-0.5 font-medium">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                      <span
                        className={`text-xs leading-relaxed font-medium ${
                          log.type === "error"
                            ? "text-red-500"
                            : log.type === "success"
                            ? "text-emerald-500"
                            : log.type === "warning"
                            ? "text-amber-500"
                            : "text-blue-600"
                        }`}
                      >
                        {log.message}
                      </span>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-3 animate-pulse p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                      <span className="text-emerald-500/70 text-xs mt-0.5 font-medium">
                        {new Date().toLocaleTimeString()}
                      </span>
                      <span className="text-blue-500 text-xs flex items-center gap-2 font-medium">
                        <div className="w-2 h-2 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full animate-bounce shadow-lg"></div>
                        Processing...
                      </span>
                    </div>
                  )}
                  {consoleLogs.length === 0 && !loading && (
                    <div className="text-center py-12 px-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div className="text-emerald-600 font-semibold mb-2">
                        ● System Ready
                      </div>
                      <div className="text-emerald-700/80 text-xs font-medium">
                        Console initialized and waiting for activity.
                      </div>
                      <div className="mt-3 text-blue-600/80 text-xs">
                        Start a search to see real-time progress.
                      </div>
                    </div>
                  )}
                  {/* Auto-scroll target */}
                  <div ref={consoleEndRef} />
                </div>
              </div>

              {/* Favorites Box */}
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-400/20 to-pink-400/20 backdrop-blur-xl p-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <Star className="w-5 h-5 text-white fill-white" />
                    </div>
                    <h3 className="text-purple-700 font-bold text-lg">
                      Favorite Researchers
                    </h3>
                  </div>
                  <p className="text-purple-600/80 text-sm mt-2 font-medium">
                    Drag researchers here to save them
                  </p>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`min-h-32 p-6 transition-all duration-300 ${
                    dragOverFavorites
                      ? "bg-purple-100/20 border-purple-300/30"
                      : "bg-white/5"
                  }`}
                >
                  {selectedResearchers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                        <Star className="w-8 h-8 text-purple-400" />
                      </div>
                      <p className="text-purple-600 text-sm font-medium">
                        {dragOverFavorites
                          ? "Drop researcher here!"
                          : "No researchers saved yet"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar">
                      {selectedResearchers.map((researcher, index) => {
                        const researcherKey = `${researcher.name}-${researcher.institution}`;
                        const hasMessage = generatedMessages[researcherKey];
                        const isExpanded = expandedMessages.has(researcherKey);
                        const isGenerating =
                          generatingMessage === researcherKey;

                        return (
                          <div
                            key={`${researcher.name}-${index}`}
                            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 hover:bg-white/15 transition-all shadow-lg"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-emerald-700 text-sm truncate">
                                  {researcher.name}
                                </h4>
                                {researcher.institution && (
                                  <p className="text-xs text-blue-600/80 truncate mt-1 font-medium">
                                    {researcher.institution}
                                  </p>
                                )}
                                {researcher.google_scholar_info?.cited_by && (
                                  <p className="text-xs text-purple-600 mt-1 font-medium">
                                    {researcher.google_scholar_info.cited_by.toLocaleString()}{" "}
                                    citations
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removeFromFavorites(researcher)}
                                className="ml-2 p-2 text-red-400 hover:text-red-600 hover:bg-red-100/20 rounded-xl transition-all"
                                title="Remove from favorites"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Quick contact links */}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {researcher.email && (
                                <a
                                  href={`mailto:${researcher.email}`}
                                  className="px-3 py-1.5 bg-emerald-400/20 text-emerald-700 rounded-full text-xs font-semibold hover:bg-emerald-400/30 transition-all backdrop-blur-sm border border-emerald-200/30"
                                >
                                  Email
                                </a>
                              )}
                              {(researcher.google_scholar ||
                                researcher.google_scholar_info
                                  ?.profile_link) && (
                                <a
                                  href={
                                    researcher.google_scholar_info
                                      ?.profile_link ||
                                    researcher.google_scholar
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-blue-400/20 text-blue-700 rounded-full text-xs font-semibold hover:bg-blue-400/30 transition-all backdrop-blur-sm border border-blue-200/30"
                                >
                                  Profile
                                </a>
                              )}
                            </div>

                            {/* Message Generation Section */}
                            <div className="mt-3 border-t border-white/10 pt-3">
                              <div className="flex items-center gap-2">
                                {!hasMessage ? (
                                  <button
                                    onClick={() => generateMessage(researcher)}
                                    disabled={isGenerating}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-400/20 text-purple-700 rounded-full text-xs font-semibold hover:bg-purple-400/30 transition-all backdrop-blur-sm border border-purple-200/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isGenerating ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <MessageSquare className="w-3 h-3" />
                                        Generate Message
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-2 w-full">
                                    <button
                                      onClick={() =>
                                        toggleMessageExpansion(researcherKey)
                                      }
                                      className="flex items-center gap-2 px-3 py-1.5 bg-green-400/20 text-green-700 rounded-full text-xs font-semibold hover:bg-green-400/30 transition-all backdrop-blur-sm border border-green-200/30"
                                    >
                                      {isExpanded ? (
                                        <>
                                          <ChevronDown className="w-3 h-3" />
                                          Hide Message
                                        </>
                                      ) : (
                                        <>
                                          <MessageSquare className="w-3 h-3" />
                                          View Message
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        copyMessage(hasMessage, researcher.name)
                                      }
                                      className="flex items-center gap-1 px-2 py-1.5 bg-gray-400/20 text-gray-700 rounded-full text-xs font-semibold hover:bg-gray-400/30 transition-all backdrop-blur-sm border border-gray-200/30"
                                      title="Copy message"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Collapsible Message Display */}
                              {hasMessage && isExpanded && (
                                <div className="mt-3 p-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-xs font-semibold text-purple-700">
                                      Personalized Message
                                    </h5>
                                    <button
                                      onClick={() =>
                                        copyMessage(hasMessage, researcher.name)
                                      }
                                      className="p-1 text-gray-500 hover:text-gray-700 rounded transition-all"
                                      title="Copy message"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-white/20 p-3 rounded-lg border border-white/20">
                                    {hasMessage}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search Section */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Search className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-emerald-700">
                    Find Researchers by Research Area
                  </h2>
                </div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:text-blue-700 font-semibold hover:bg-white/20 rounded-2xl transition-all backdrop-blur-sm border border-white/20"
                >
                  <Settings className="w-4 h-4" />
                  {showAdvanced ? "Hide" : "Show"} Advanced
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-emerald-700 mb-3">
                    Describe your researcher requirements:
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && !e.shiftKey && searchPapers()
                    }
                    placeholder="e.g., I need researchers working on machine learning for healthcare, specifically deep learning applications in medical imaging..."
                    className="w-full px-6 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none text-emerald-800 placeholder-emerald-600/60 resize-vertical h-28 font-medium shadow-lg"
                  />
                </div>

                {/* Advanced Search Options */}
                {showAdvanced && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-6 border border-white/20 shadow-lg">
                    <h3 className="text-sm font-bold text-blue-700 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                        <Settings className="w-4 h-4 text-white" />
                      </div>
                      Advanced Search Options
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-purple-700 mb-3">
                          Time Range
                        </label>
                        <select
                          value={filters.duration}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              duration: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-sm font-medium text-purple-700 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 shadow-lg"
                        >
                          <option value="1month">Last Month</option>
                          <option value="3months">Last 3 Months</option>
                          <option value="6months">Last 6 Months</option>
                          <option value="1year">Last Year</option>
                          <option value="2years">Last 2 Years</option>
                          <option value="5years">Last 5 Years</option>
                          <option value="all">All Time</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-purple-700 mb-3">
                          Max Results
                        </label>
                        <select
                          value={filters.maxResults}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              maxResults: parseInt(e.target.value),
                            }))
                          }
                          className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-sm font-medium text-purple-700 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 shadow-lg"
                        >
                          <option value={10}>10 Papers</option>
                          <option value={15}>15 Papers</option>
                          <option value={20}>20 Papers</option>
                          <option value={30}>30 Papers</option>
                          <option value={50}>50 Papers</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-purple-700 mb-3">
                          Sort By
                        </label>
                        <select
                          value={filters.sortBy}
                          onChange={(e) =>
                            setFilters((prev) => ({
                              ...prev,
                              sortBy: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-sm font-medium text-purple-700 focus:ring-2 focus:ring-purple-400 focus:border-purple-400 shadow-lg"
                        >
                          <option value="relevance">Relevance</option>
                          <option value="lastUpdatedDate">Date (Newest)</option>
                          <option value="submittedDate">Submitted Date</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={searchPapers}
                  disabled={loading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-2xl hover:from-emerald-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-2xl hover:shadow-emerald-500/25 backdrop-blur-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Searching Papers...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Find Researchers
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-100/20 backdrop-blur-sm border border-red-200/30 rounded-2xl shadow-lg">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* Search Query Display */}
            {searchResults && (
              <div className="bg-blue-100/20 backdrop-blur-sm border border-blue-200/30 rounded-2xl p-6 mb-8 shadow-lg">
                <div className="space-y-3">
                  <p className="text-blue-700 font-medium">
                    <strong className="text-blue-800">
                      AI Generated Search Query:
                    </strong>{" "}
                    <span className="italic font-mono text-sm bg-white/20 px-2 py-1 rounded border">
                      {searchResults.query}
                    </span>
                  </p>

                  {/* Display Active Filters */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs font-semibold text-blue-600">
                      Active Filters:
                    </span>
                    <span className="inline-flex items-center px-2 py-1 bg-emerald-100/50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200/50">
                      📅{" "}
                      {filters.duration === "all"
                        ? "All Time"
                        : filters.duration === "1month"
                        ? "Last Month"
                        : filters.duration === "3months"
                        ? "Last 3 Months"
                        : filters.duration === "6months"
                        ? "Last 6 Months"
                        : filters.duration === "1year"
                        ? "Last Year"
                        : filters.duration === "2years"
                        ? "Last 2 Years"
                        : "Last 5 Years"}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 bg-blue-100/50 text-blue-700 rounded-full text-xs font-medium border border-blue-200/50">
                      📊 {filters.maxResults} papers
                    </span>
                    <span className="inline-flex items-center px-2 py-1 bg-purple-100/50 text-purple-700 rounded-full text-xs font-medium border border-purple-200/50">
                      📈 Sort by{" "}
                      {filters.sortBy === "relevance"
                        ? "Relevance"
                        : filters.sortBy === "lastUpdatedDate"
                        ? "Date (Newest)"
                        : "Submitted Date"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Papers Results Header */}
            {searchResults && (
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-purple-700">
                  Research Papers Found ({searchResults.papers.length})
                </h3>
              </div>
            )}

            {/* No Papers Found */}
            {searchResults && searchResults.papers.length === 0 && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-12 mb-8 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20">
                  <FileText className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-blue-700 mb-3">
                  No papers found
                </h3>
                <p className="text-blue-600/80 mb-6 font-medium">
                  No papers found matching your criteria.
                </p>
                <p className="text-sm text-purple-600/80 font-medium">
                  Try adjusting your search terms or extending the time range in
                  advanced options.
                </p>
              </div>
            )}

            {/* Papers Results - Each paper as separate block */}
            {searchResults && searchResults.papers.length > 0 && (
              <div className="space-y-8">
                {searchResults.papers.map((paper, index) => (
                  <div
                    key={paper.id}
                    className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden hover:shadow-emerald-500/10 transition-all duration-300"
                  >
                    {/* Paper Header */}
                    <div className="p-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="inline-flex items-center px-4 py-2 rounded-2xl text-sm font-bold bg-gradient-to-r from-emerald-400/20 to-blue-400/20 text-emerald-700 backdrop-blur-sm border border-emerald-200/30">
                              Paper #{index + 1}
                            </span>
                            <span className="text-xs text-blue-600/70 font-medium bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                              {paper.id}
                            </span>
                          </div>
                          <h4 className="text-2xl font-bold text-emerald-800 mb-4 leading-tight">
                            {paper.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-6 text-sm text-purple-700 mb-6">
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-2xl backdrop-blur-sm border border-white/20">
                              <Users className="w-4 h-4" />
                              <span className="font-semibold">
                                {paper.authors.length} authors:
                              </span>
                              <span className="font-medium">
                                {paper.authors.slice(0, 3).join(", ")}
                                {paper.authors.length > 3 &&
                                  ` +${paper.authors.length - 3} more`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-2xl backdrop-blur-sm border border-white/20">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">
                                Published {paper.published}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/20 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                              <FileText className="w-3 h-3 text-white" />
                            </div>
                            {paperSummaries[paper.id]
                              ? "AI Summary"
                              : "Abstract"}
                          </h5>
                          {!paperSummaries[paper.id] && (
                            <button
                              onClick={() => generatePaperSummary(paper)}
                              disabled={generatingSummary === paper.id}
                              className="flex items-center gap-2 px-3 py-1.5 bg-purple-400/20 text-purple-700 rounded-full text-xs font-semibold hover:bg-purple-400/30 transition-all backdrop-blur-sm border border-purple-200/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {generatingSummary === paper.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>✨ Make it Engaging</>
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-emerald-800 text-sm leading-relaxed font-medium">
                          {paperSummaries[paper.id] ? (
                            <div
                              className="space-y-2 whitespace-pre-line emoji-text"
                              dangerouslySetInnerHTML={{
                                __html: paperSummaries[paper.id]
                                  .replace(
                                    /<code>(.*?)<\/code>/g,
                                    '<span class="highlight-code">$1</span>'
                                  )
                                  .replace(
                                    /<tech>(.*?)<\/tech>/g,
                                    '<span class="highlight-tech">$1</span>'
                                  )
                                  .replace(
                                    /<metric>(.*?)<\/metric>/g,
                                    '<span class="highlight-metric">$1</span>'
                                  )
                                  .replace(
                                    /<algo>(.*?)<\/algo>/g,
                                    '<span class="highlight-algorithm">$1</span>'
                                  )
                                  .replace(/\n/g, "<br/>"),
                              }}
                            />
                          ) : paper.summary.length > 400 ? (
                            `${paper.summary.substring(0, 400)}...`
                          ) : (
                            paper.summary
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-4 mb-6">
                        <a
                          href={paper.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-purple-700 rounded-2xl hover:bg-white/30 text-sm font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/20"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on ArXiv
                        </a>

                        {paper.pdf_url && (
                          <button
                            onClick={() =>
                              analyzeResearchers(paper.pdf_url!, paper.id)
                            }
                            disabled={analyzingPaper === paper.id}
                            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-2xl hover:from-emerald-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/25"
                          >
                            {analyzingPaper === paper.id ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Analyzing PDF...
                              </>
                            ) : (
                              <>
                                <Users className="w-4 h-4" />
                                Find Researchers
                              </>
                            )}
                          </button>
                        )}

                        {paperAnalysisResults[paper.id] && (
                          <button
                            onClick={() => togglePaperExpansion(paper.id)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-400/20 to-pink-400/20 backdrop-blur-sm border border-purple-200/30 text-purple-700 rounded-2xl hover:bg-gradient-to-r hover:from-purple-400/30 hover:to-pink-400/30 text-sm font-semibold flex items-center gap-2 transition-all shadow-lg"
                          >
                            {expandedPapers.has(paper.id) ? (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Hide Researchers
                              </>
                            ) : (
                              <>
                                <ChevronRight className="w-4 h-4" />
                                View{" "}
                                {
                                  paperAnalysisResults[paper.id].researchers
                                    .length
                                }{" "}
                                Researchers
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Researcher Results - Tree-like expansion under specific paper */}
                      {paperAnalysisResults[paper.id] &&
                        expandedPapers.has(paper.id) && (
                          <div className="border-t border-white/20 bg-gradient-to-br from-emerald-50/20 to-blue-50/20 backdrop-blur-sm -mx-8 px-8 pt-6">
                            <h5 className="text-xl font-bold text-emerald-700 mb-6 flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                              Researchers Found (
                              {
                                paperAnalysisResults[
                                  paper.id
                                ].researchers.filter(
                                  (researcher) => researcher.google_scholar_info
                                ).length
                              }
                              )
                            </h5>

                            {paperAnalysisResults[paper.id].researchers.filter(
                              (researcher) => researcher.google_scholar_info
                            ).length === 0 ? (
                              <p className="text-blue-600/80 pb-6 font-medium">
                                No researchers with available author details
                                found in this paper.
                              </p>
                            ) : (
                              <div className="space-y-6 pb-6">
                                {paperAnalysisResults[paper.id].researchers
                                  .filter(
                                    (researcher) =>
                                      researcher.google_scholar_info
                                  )
                                  .map((researcher, idx) => (
                                    <div
                                      key={idx}
                                      draggable
                                      onDragStart={(e) =>
                                        handleDragStart(e, researcher)
                                      }
                                      className="bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl p-6 cursor-move hover:bg-white/20 hover:shadow-2xl transition-all duration-300 shadow-lg"
                                      title="Drag to favorites to save this researcher"
                                    >
                                      <div className="flex justify-between items-start mb-3">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <h6 className="text-lg font-semibold text-slate-900">
                                              {researcher.name}
                                            </h6>
                                            <div className="flex flex-col gap-0.5 text-slate-400">
                                              <div className="w-1 h-1 bg-current rounded-full"></div>
                                              <div className="w-1 h-1 bg-current rounded-full"></div>
                                              <div className="w-1 h-1 bg-current rounded-full"></div>
                                            </div>
                                          </div>
                                          {researcher.paper_count > 0 && (
                                            <p className="text-sm text-blue-600 font-medium mb-1">
                                              📚 {researcher.paper_count} ArXiv
                                              Papers Published
                                            </p>
                                          )}
                                          {researcher.institution && (
                                            <p className="text-slate-600 mb-2">
                                              <Building2 className="w-4 h-4 inline mr-1" />
                                              {researcher.institution}
                                            </p>
                                          )}
                                          <div className="text-sm text-slate-600 mb-2">
                                            <GraduationCap className="w-4 h-4 inline mr-1" />
                                            Author Profile Found
                                            {researcher.google_scholar_info!
                                              .cited_by && (
                                              <span className="ml-2 text-blue-600 font-medium">
                                                •{" "}
                                                {researcher.google_scholar_info!.cited_by.toLocaleString()}{" "}
                                                citations
                                              </span>
                                            )}
                                            {researcher.google_scholar_info!
                                              .title && (
                                              <div className="text-xs text-slate-500 mt-1">
                                                {
                                                  researcher.google_scholar_info!
                                                    .title
                                                }
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Author Research Interests */}
                                      {researcher.google_scholar_info
                                        ?.research_interests &&
                                        researcher.google_scholar_info
                                          .research_interests.length > 0 && (
                                          <div className="mb-3">
                                            <h6 className="text-sm font-medium text-slate-700 mb-2">
                                              Research Interests:
                                            </h6>
                                            <div className="flex flex-wrap gap-2">
                                              {researcher.google_scholar_info.research_interests.map(
                                                (interest, interestIdx) => (
                                                  <span
                                                    key={interestIdx}
                                                    className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                                                  >
                                                    {interest}
                                                  </span>
                                                )
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* Research Areas */}
                                      {researcher.research_areas.length > 0 && (
                                        <div className="mb-3">
                                          <h6 className="text-sm font-medium text-slate-700 mb-2">
                                            Research Areas:
                                          </h6>
                                          <div className="flex flex-wrap gap-2">
                                            {researcher.research_areas.map(
                                              (area, areaIdx) => (
                                                <span
                                                  key={areaIdx}
                                                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                                >
                                                  {area}
                                                </span>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Recent Academic Papers */}
                                      {researcher.google_scholar_info
                                        ?.recent_papers &&
                                        researcher.google_scholar_info
                                          .recent_papers.length > 0 && (
                                          <div className="mb-3">
                                            <h6 className="text-sm font-medium text-slate-700 mb-2">
                                              Recent Papers:
                                            </h6>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                              {researcher.google_scholar_info.recent_papers
                                                .slice(0, 3)
                                                .map(
                                                  (scholarPaper, paperIdx) => (
                                                    <div
                                                      key={paperIdx}
                                                      className="p-2 bg-blue-50 rounded border border-blue-200"
                                                    >
                                                      <h6 className="text-sm font-medium text-slate-900 mb-1">
                                                        {scholarPaper.link ? (
                                                          <a
                                                            href={
                                                              scholarPaper.link
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                          >
                                                            {scholarPaper.title}
                                                          </a>
                                                        ) : (
                                                          scholarPaper.title
                                                        )}
                                                      </h6>
                                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        {scholarPaper.year && (
                                                          <span>
                                                            {scholarPaper.year}
                                                          </span>
                                                        )}
                                                        {scholarPaper.cited_by && (
                                                          <span>
                                                            •{" "}
                                                            {scholarPaper.cited_by.toLocaleString()}{" "}
                                                            citations
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  )
                                                )}
                                              {researcher.google_scholar_info
                                                .recent_papers.length > 3 && (
                                                <p className="text-xs text-slate-500 text-center">
                                                  ... and{" "}
                                                  {researcher
                                                    .google_scholar_info
                                                    .recent_papers.length -
                                                    3}{" "}
                                                  more papers
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* ArXiv Papers */}
                                      {researcher.arxiv_papers.length > 0 && (
                                        <div className="mb-3">
                                          <h6 className="text-sm font-medium text-slate-700 mb-2">
                                            Recent ArXiv Papers:
                                          </h6>
                                          <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {researcher.arxiv_papers
                                              .slice(0, 3)
                                              .map((arxivPaper, paperIdx) => (
                                                <div
                                                  key={paperIdx}
                                                  className="p-2 bg-slate-50 rounded border border-slate-200"
                                                >
                                                  <h6 className="text-sm font-medium text-slate-900 mb-1">
                                                    <a
                                                      href={arxivPaper.link}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                                    >
                                                      {arxivPaper.title}
                                                    </a>
                                                  </h6>
                                                  <p className="text-xs text-slate-500">
                                                    {arxivPaper.published} •{" "}
                                                    {arxivPaper.arxiv_id}
                                                  </p>
                                                </div>
                                              ))}
                                            {researcher.arxiv_papers.length >
                                              3 && (
                                              <p className="text-xs text-slate-500 text-center">
                                                ... and{" "}
                                                {researcher.arxiv_papers
                                                  .length - 3}{" "}
                                                more papers
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Contact Information */}
                                      <div className="space-y-2">
                                        <h6 className="text-sm font-medium text-slate-700">
                                          Contact & Profiles:
                                        </h6>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {researcher.email && (
                                            <a
                                              href={`mailto:${researcher.email}`}
                                              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition-colors"
                                            >
                                              <Mail className="w-4 h-4" />
                                              Email
                                            </a>
                                          )}

                                          {researcher.linkedin && (
                                            <a
                                              href={researcher.linkedin}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 text-sm transition-colors"
                                            >
                                              <span>💼</span>
                                              LinkedIn
                                            </a>
                                          )}

                                          {(researcher.google_scholar ||
                                            researcher.google_scholar_info
                                              ?.profile_link) && (
                                            <a
                                              href={
                                                researcher.google_scholar_info
                                                  ?.profile_link ||
                                                researcher.google_scholar
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm transition-colors"
                                            >
                                              <GraduationCap className="w-4 h-4" />
                                              Author's Details
                                            </a>
                                          )}

                                          {researcher.researchgate && (
                                            <a
                                              href={researcher.researchgate}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm transition-colors"
                                            >
                                              <span>🔬</span>
                                              ResearchGate
                                            </a>
                                          )}

                                          {researcher.orcid && (
                                            <a
                                              href={`https://orcid.org/${researcher.orcid}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-green-700 text-white rounded hover:bg-green-800 text-sm transition-colors"
                                            >
                                              <span>🆔</span>
                                              ORCID
                                            </a>
                                          )}

                                          {researcher.website && (
                                            <a
                                              href={researcher.website}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 text-sm transition-colors"
                                            >
                                              <span>🌐</span>
                                              Website
                                            </a>
                                          )}
                                        </div>

                                        {/* Additional Contacts (excluding phone numbers) */}
                                        {researcher.additional_contacts.filter(
                                          (contact) =>
                                            !contact
                                              .toLowerCase()
                                              .includes("phone")
                                        ).length > 0 && (
                                          <div className="mt-2">
                                            <h6 className="text-xs font-medium text-slate-600 mb-2">
                                              Additional Contacts:
                                            </h6>
                                            <div className="space-y-1">
                                              {researcher.additional_contacts
                                                .filter(
                                                  (contact) =>
                                                    !contact
                                                      .toLowerCase()
                                                      .includes("phone")
                                                )
                                                .map((contact, contactIdx) => (
                                                  <p
                                                    key={contactIdx}
                                                    className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded"
                                                  >
                                                    {contact}
                                                  </p>
                                                ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Example Section */}
            {!searchResults && !loading && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
                <h3 className="text-2xl font-bold text-emerald-700 mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  How it works
                </h3>
                <div className="space-y-6 text-purple-700 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 backdrop-blur-sm text-emerald-700 rounded-2xl flex items-center justify-center text-sm font-bold border border-emerald-200/30">
                      1
                    </div>
                    <p className="font-medium pt-2">
                      Describe what kind of researchers you're looking for
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-sm text-blue-700 rounded-2xl flex items-center justify-center text-sm font-bold border border-blue-200/30">
                      2
                    </div>
                    <p className="font-medium pt-2">
                      AI finds relevant research papers from ArXiv
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400/20 to-pink-400/20 backdrop-blur-sm text-purple-700 rounded-2xl flex items-center justify-center text-sm font-bold border border-purple-200/30">
                      3
                    </div>
                    <p className="font-medium pt-2">
                      Click "Find Researchers" on papers of interest
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400/20 to-emerald-400/20 backdrop-blur-sm text-pink-700 rounded-2xl flex items-center justify-center text-sm font-bold border border-pink-200/30">
                      4
                    </div>
                    <p className="font-medium pt-2">
                      Get enhanced profiles with author's details and contact
                      information for networking
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-100/20 to-purple-100/20 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                  <p className="text-blue-700 font-bold mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-xs">✨</span>
                    </div>
                    Try these examples:
                  </p>
                  <div className="space-y-3">
                    {examplePrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(prompt)}
                        className="block text-left text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors p-2 hover:bg-white/10 rounded-xl w-full"
                      >
                        → {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
