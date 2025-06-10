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
} from "lucide-react";

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

  const searchPapers = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearchResults(null);
    setPaperAnalysisResults({});
    setExpandedPapers(new Set());
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
      addConsoleLog(
        `👥 Identified ${data.researchers.length} researchers`,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Researcher Finder
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - Console */}
          <div className="w-80 shrink-0">
            {(loading || consoleLogs.length > 0) && (
              <div className="sticky top-8">
                <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-700 p-4 font-mono text-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-slate-400 ml-2 text-xs font-medium">
                        Live Console
                      </span>
                    </div>
                    <button
                      onClick={clearConsoleLogs}
                      className="text-slate-400 hover:text-slate-300 text-xs transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                  <div
                    ref={consoleContainerRef}
                    className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar"
                  >
                    {consoleLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-2 animate-fadeIn"
                      >
                        <span className="text-slate-500 text-xs shrink-0 mt-0.5">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span
                          className={`text-xs leading-relaxed ${
                            log.type === "error"
                              ? "text-red-400"
                              : log.type === "success"
                              ? "text-green-400"
                              : log.type === "warning"
                              ? "text-yellow-400"
                              : "text-slate-300"
                          }`}
                        >
                          {log.message}
                        </span>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex items-center gap-2 animate-pulse">
                        <span className="text-slate-500 text-xs mt-0.5">
                          {new Date().toLocaleTimeString()}
                        </span>
                        <span className="text-blue-400 text-xs flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          Processing...
                        </span>
                      </div>
                    )}
                    {consoleLogs.length === 0 && !loading && (
                      <div className="text-slate-500 text-xs text-center py-4">
                        Console ready. Start a search to see activity.
                      </div>
                    )}
                    {/* Auto-scroll target */}
                    <div ref={consoleEndRef} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-medium text-slate-900">
                    Find Researchers by Research Area
                  </h2>
                </div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  {showAdvanced ? "Hide" : "Show"} Advanced
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Describe your researcher requirements:
                  </label>
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && !e.shiftKey && searchPapers()
                    }
                    placeholder="e.g., I need researchers working on machine learning for healthcare, specifically deep learning applications in medical imaging..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 placeholder-slate-500 resize-vertical h-24"
                  />
                </div>

                {/* Advanced Search Options */}
                {showAdvanced && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-4 border border-slate-200">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Advanced Search Options
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">
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
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        <label className="block text-sm font-medium text-slate-600 mb-2">
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
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={10}>10 Papers</option>
                          <option value={15}>15 Papers</option>
                          <option value={20}>20 Papers</option>
                          <option value={30}>30 Papers</option>
                          <option value={50}>50 Papers</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">
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
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Searching Papers...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Find Researchers
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Search Query Display */}
            {searchResults && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                  <strong>AI Generated Search Query:</strong>{" "}
                  {searchResults.query}
                </p>
              </div>
            )}

            {/* Papers Results Header */}
            {searchResults && (
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-medium text-slate-900">
                  Research Papers Found ({searchResults.papers.length})
                </h3>
              </div>
            )}

            {/* No Papers Found */}
            {searchResults && searchResults.papers.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No papers found
                </h3>
                <p className="text-slate-600 mb-4">
                  No papers found matching your criteria.
                </p>
                <p className="text-sm text-slate-500">
                  Try adjusting your search terms or extending the time range in
                  advanced options.
                </p>
              </div>
            )}

            {/* Papers Results - Each paper as separate block */}
            {searchResults && searchResults.papers.length > 0 && (
              <div className="space-y-6">
                {searchResults.papers.map((paper, index) => (
                  <div
                    key={paper.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Paper Header */}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Paper #{index + 1}
                            </span>
                            <span className="text-xs text-slate-500">
                              {paper.id}
                            </span>
                          </div>
                          <h4 className="text-xl font-semibold text-slate-900 mb-3 leading-tight">
                            {paper.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              <span className="font-medium">
                                {paper.authors.length} authors:
                              </span>
                              <span>
                                {paper.authors.slice(0, 3).join(", ")}
                                {paper.authors.length > 3 &&
                                  ` +${paper.authors.length - 3} more`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>Published {paper.published}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <h5 className="text-sm font-medium text-slate-700 mb-2">
                          Abstract
                        </h5>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          {paper.summary.length > 400
                            ? `${paper.summary.substring(0, 400)}...`
                            : paper.summary}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 mb-4">
                        <a
                          href={paper.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center gap-2 transition-colors"
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
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
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
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center gap-2 transition-colors"
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
                          <div className="border-t border-slate-200 bg-slate-50 -mx-6 px-6 pt-4">
                            <h5 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
                              <Users className="w-5 h-5" />
                              Researchers Found (
                              {
                                paperAnalysisResults[paper.id].researchers
                                  .length
                              }
                              )
                            </h5>

                            {paperAnalysisResults[paper.id].researchers
                              .length === 0 ? (
                              <p className="text-slate-500 pb-4">
                                No researchers found in this paper.
                              </p>
                            ) : (
                              <div className="space-y-4 pb-4">
                                {paperAnalysisResults[paper.id].researchers.map(
                                  (researcher, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white border border-slate-200 rounded-lg p-4"
                                    >
                                      <div className="flex justify-between items-start mb-3">
                                        <div>
                                          <h6 className="text-lg font-semibold text-slate-900 mb-1">
                                            {researcher.name}
                                          </h6>
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
                                          {researcher.google_scholar_info ? (
                                            <div className="text-sm text-slate-600 mb-2">
                                              <GraduationCap className="w-4 h-4 inline mr-1" />
                                              Author Profile Found
                                              {researcher.google_scholar_info
                                                .cited_by && (
                                                <span className="ml-2 text-blue-600 font-medium">
                                                  •{" "}
                                                  {researcher.google_scholar_info.cited_by.toLocaleString()}{" "}
                                                  citations
                                                </span>
                                              )}
                                              {researcher.google_scholar_info
                                                .title && (
                                                <div className="text-xs text-slate-500 mt-1">
                                                  {
                                                    researcher
                                                      .google_scholar_info.title
                                                  }
                                                </div>
                                              )}
                                            </div>
                                          ) : (
                                            <div className="text-xs text-slate-500 mb-2">
                                              💡 Author details unavailable
                                              (data service may be down)
                                            </div>
                                          )}
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
                                  )
                                )}
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
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-medium text-slate-900 mb-4">
                  How it works
                </h3>
                <div className="space-y-3 text-slate-700 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                      1
                    </div>
                    <p>Describe what kind of researchers you're looking for</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                      2
                    </div>
                    <p>AI finds relevant research papers from ArXiv</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                      3
                    </div>
                    <p>Click "Find Researchers" on papers of interest</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                      4
                    </div>
                    <p>
                      Get enhanced profiles with author's details and contact
                      information for networking
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-800 font-medium mb-2">
                    Try these examples:
                  </p>
                  <div className="space-y-2">
                    {examplePrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(prompt)}
                        className="block text-left text-blue-600 hover:underline text-sm transition-colors"
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
