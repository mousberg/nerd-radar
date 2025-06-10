"use client";

import { useState } from "react";
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
} from "lucide-react";

interface ArXivPaper {
  title: string;
  published: string;
  arxiv_id: string;
  link: string;
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

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(
    null
  );
  const [error, setError] = useState("");

  const searchPapers = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setSearchResults(null);
    setAnalysisResults(null);

    try {
      const response = await fetch("/api/search-papers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Failed to search papers");
      }

      const data: SearchResult = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const analyzeResearchers = async (pdfUrl: string) => {
    setAnalyzing(true);
    setError("");
    setAnalysisResults(null);

    try {
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

      const data: AnalysisResult = await response.json();
      setAnalysisResults(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during analysis"
      );
    } finally {
      setAnalyzing(false);
    }
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

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-medium text-slate-900">
              Find Researchers by Research Area
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Describe your researcher requirements:
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && searchPapers()}
                placeholder="e.g., I need researchers working on machine learning for healthcare, specifically deep learning applications in medical imaging..."
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900 placeholder-slate-500 resize-vertical h-24"
              />
            </div>

            <button
              onClick={searchPapers}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
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
              <strong>AI Generated Search Query:</strong> {searchResults.query}
            </p>
          </div>
        )}

        {/* Papers Results */}
        {searchResults && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-5 h-5 text-slate-600" />
              <h3 className="text-lg font-medium text-slate-900">
                Papers Found ({searchResults.papers.length})
              </h3>
            </div>

            {searchResults.papers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No papers found matching your criteria.</p>
                <p className="text-sm mt-1">
                  Try adjusting your requirements or extending the time range.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {searchResults.papers.map((paper, index) => (
                  <div
                    key={paper.id}
                    className="border border-slate-200 rounded-lg p-5"
                  >
                    {/* Paper Header */}
                    <div className="mb-4">
                      <h4 className="text-lg font-medium text-slate-900 mb-2">
                        {paper.title}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{paper.authors.join(", ")}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{paper.published}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{paper.id}</span>
                        </div>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed">
                        {paper.summary.length > 300
                          ? `${paper.summary.substring(0, 300)}...`
                          : paper.summary}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3">
                      <a
                        href={paper.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 text-sm font-medium flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Paper
                      </a>

                      {paper.pdf_url && (
                        <button
                          onClick={() => analyzeResearchers(paper.pdf_url!)}
                          disabled={analyzing}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                        >
                          {analyzing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Users className="w-4 h-4" />
                              Find Researchers
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResults && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Researchers Found
            </h2>
            <p className="text-gray-600 mb-4">
              From: {analysisResults.paper_title || "Selected Paper"}
            </p>

            {analysisResults.researchers.length === 0 ? (
              <p className="text-gray-500">
                No researchers found in this paper.
              </p>
            ) : (
              <div className="grid gap-6">
                {analysisResults.researchers.map((researcher, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {researcher.name}
                        </h3>
                        {researcher.paper_count > 0 && (
                          <p className="text-sm text-blue-600 font-medium mb-2">
                            📚 {researcher.paper_count} ArXiv Papers Published
                          </p>
                        )}
                        {researcher.institution && (
                          <p className="text-gray-600 mb-2">
                            {researcher.institution}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Research Areas */}
                    {researcher.research_areas.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Research Areas:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {researcher.research_areas.map((area, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ArXiv Papers */}
                    {researcher.arxiv_papers.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Recent ArXiv Papers:
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {researcher.arxiv_papers
                            .slice(0, 5)
                            .map((paper, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-white rounded border border-gray-200"
                              >
                                <h5 className="text-sm font-medium text-gray-900 mb-1">
                                  <a
                                    href={paper.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-600"
                                  >
                                    {paper.title}
                                  </a>
                                </h5>
                                <p className="text-xs text-gray-500">
                                  {paper.published} • {paper.arxiv_id}
                                </p>
                              </div>
                            ))}
                          {researcher.arxiv_papers.length > 5 && (
                            <p className="text-xs text-gray-500 text-center">
                              ... and {researcher.arxiv_papers.length - 5} more
                              papers
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Information */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700">
                        Contact & Profiles:
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Email */}
                        {researcher.email && (
                          <a
                            href={`mailto:${researcher.email}`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            <span>📧</span>
                            Email Contact
                          </a>
                        )}

                        {/* LinkedIn */}
                        {researcher.linkedin && (
                          <a
                            href={researcher.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 text-sm"
                          >
                            <span>💼</span>
                            LinkedIn
                          </a>
                        )}

                        {/* Google Scholar */}
                        {researcher.google_scholar && (
                          <a
                            href={researcher.google_scholar}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            <span>🎓</span>
                            Google Scholar
                          </a>
                        )}

                        {/* ResearchGate */}
                        {researcher.researchgate && (
                          <a
                            href={researcher.researchgate}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            <span>🔬</span>
                            ResearchGate
                          </a>
                        )}

                        {/* ORCID */}
                        {researcher.orcid && (
                          <a
                            href={`https://orcid.org/${researcher.orcid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 text-sm"
                          >
                            <span>🆔</span>
                            ORCID
                          </a>
                        )}

                        {/* Website */}
                        {researcher.website && (
                          <a
                            href={researcher.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                          >
                            <span>🌐</span>
                            Website
                          </a>
                        )}
                      </div>

                      {/* Additional Contacts */}
                      {researcher.additional_contacts.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-xs font-medium text-gray-600 mb-2">
                            Additional Contacts:
                          </h5>
                          <div className="space-y-1">
                            {researcher.additional_contacts.map(
                              (contact, idx) => (
                                <p
                                  key={idx}
                                  className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded"
                                >
                                  {contact}
                                </p>
                              )
                            )}
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
                <p>Get contact details and LinkedIn profiles for networking</p>
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
                    className="block text-left text-blue-600 hover:underline text-sm"
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
  );
}
