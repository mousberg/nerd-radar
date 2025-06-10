import { NextRequest, NextResponse } from 'next/server';

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
  }[];
}

async function searchGoogleScholar(researcherName: string): Promise<GoogleScholarProfile | null> {
  try {
    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) {
      console.error('SERP_API_KEY not found in environment variables');
      return null;
    }

    // Use the correct Google Scholar search with author: helper and recent papers filter
    const currentYear = new Date().getFullYear();
    const searchQuery = `author:"${researcherName}"`;
    
    const searchParams = new URLSearchParams({
      engine: 'google_scholar',
      q: searchQuery,
      as_ylo: (currentYear - 10).toString(), // Last 10 years
      as_yhi: currentYear.toString(),
      num: '10', // Get up to 10 results
      scisbd: '1', // Sort by date, include abstracts
      api_key: apiKey
    });
    
    const searchUrl = `https://serpapi.com/search.json?${searchParams.toString()}`;
    
    console.log(`Searching Google Scholar for author: ${researcherName}`);
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      console.error(`SerpApi request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log('SerpApi response received:', data.search_metadata?.status);
    
    // Check if we got organic results back
    if (!data.organic_results || data.organic_results.length === 0) {
      console.log(`No Google Scholar results found for ${researcherName}`);
      return null;
    }

    console.log(`Found ${data.organic_results.length} Google Scholar results for ${researcherName}`);
    
    // Calculate total citations across all papers
    let totalCitations = 0;
    const allAffiliations: string[] = [];
    const allInterests: string[] = [];
    
    data.organic_results.forEach((result: any) => {
      const citations = extractCitedBy(result.inline_links?.cited_by?.total);
      if (citations) totalCitations += citations;
      
      const affiliation = extractAffiliation(result.snippet || '');
      if (affiliation && !allAffiliations.includes(affiliation)) {
        allAffiliations.push(affiliation);
      }
      
      const interests = extractResearchInterests(result.snippet || result.title || '');
      interests.forEach(interest => {
        if (!allInterests.includes(interest)) {
          allInterests.push(interest);
        }
      });
    });
    
    // Parse the aggregate data from all results
    const scholarProfile: GoogleScholarProfile = {
      name: researcherName,
      title: `Researcher with ${data.organic_results.length} publications found`,
      affiliation: allAffiliations[0] || undefined, // Use most common affiliation
      cited_by: totalCitations > 0 ? totalCitations : undefined,
      profile_link: data.organic_results[0]?.link || undefined,
      research_interests: allInterests.slice(0, 5), // Top 5 research interests
      recent_papers: []
    };

    // Extract recent papers from the organic results
    if (data.organic_results.length > 0) {
      const papers = data.organic_results.slice(0, 5).map((result: any) => ({
        title: result.title || 'Untitled',
        year: extractYear(result.publication_info?.summary || ''),
        cited_by: extractCitedBy(result.inline_links?.cited_by?.total)
      })).filter((paper: any) => paper.title !== 'Untitled');
      
      scholarProfile.recent_papers = papers;
    }

    console.log(`Found Google Scholar data for ${researcherName}:`, {
      citations: scholarProfile.cited_by,
      papers: scholarProfile.recent_papers?.length || 0
    });

    return scholarProfile;
  } catch (error) {
    console.error(`Error searching Google Scholar for ${researcherName}:`, error);
    return null;
  }
}

// Helper functions to extract data from Google Scholar results
function extractAffiliation(snippet: string): string | undefined {
  // Look for various institution patterns
  const patterns = [
    /\b([A-Z][a-zA-Z\s]+(?:University|Institute|College|Laboratory|Lab|Center|Centre))\b/g,
    /\b(MIT|Stanford|Harvard|Berkeley|CMU|UCLA|NYU|USC)\b/g,
    /\b([A-Z][a-zA-Z\s]+ Medical (?:School|Center))\b/g
  ];
  
  for (const pattern of patterns) {
    const match = snippet.match(pattern);
    if (match && match[0]) {
      return match[0].trim();
    }
  }
  
  return undefined;
}

function extractCitedBy(citedByTotal: any): number | undefined {
  if (!citedByTotal) return undefined;
  if (typeof citedByTotal === 'number') return citedByTotal;
  if (typeof citedByTotal === 'string') {
    const cleanedString = citedByTotal.replace(/[^\d]/g, '');
    const num = parseInt(cleanedString);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

function extractYear(summary: string): string | undefined {
  const yearMatch = summary.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? yearMatch[0] : undefined;
}

function extractResearchInterests(text: string): string[] {
  const interests: string[] = [];
  const commonTerms = [
    'machine learning', 'computer vision', 'natural language processing', 
    'artificial intelligence', 'deep learning', 'neural networks', 
    'data science', 'robotics', 'bioinformatics', 'computational biology',
    'quantum computing', 'computer graphics', 'human-computer interaction',
    'cybersecurity', 'blockchain', 'software engineering', 'databases',
    'distributed systems', 'algorithms', 'computer networks', 'signal processing',
    'medical imaging', 'biomedical engineering', 'materials science',
    'renewable energy', 'climate science', 'neuroscience', 'genomics'
  ];
  
  const lowerText = text.toLowerCase();
  commonTerms.forEach(term => {
    if (lowerText.includes(term)) {
      const formattedTerm = term.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      if (!interests.includes(formattedTerm)) {
        interests.push(formattedTerm);
      }
    }
  });
  
  return interests;
}

export async function POST(request: NextRequest) {
  try {
    const { researchers } = await request.json();
    
    if (!researchers || !Array.isArray(researchers)) {
      return NextResponse.json({ error: 'No researchers provided' }, { status: 400 });
    }
    
    // Always return researchers, even if Google Scholar fails
    const enhancedResearchers = await Promise.all(
      researchers.map(async (researcher: any) => {
        try {
          const scholarInfo = await searchGoogleScholar(researcher.name);
          return {
            ...researcher,
            google_scholar_info: scholarInfo
          };
        } catch (error) {
          console.error(`Failed to get Google Scholar info for ${researcher.name}:`, error);
          // Return researcher without Google Scholar info if API fails
          return {
            ...researcher,
            google_scholar_info: null
          };
        }
      })
    );
    
    return NextResponse.json({ researchers: enhancedResearchers });
    
  } catch (error) {
    console.error('Error in Google Scholar API:', error);
    // If the entire process fails, still try to return the original researchers
    try {
      const { researchers } = await request.json();
      return NextResponse.json({ 
        researchers: researchers.map((r: any) => ({ ...r, google_scholar_info: null }))
      });
    } catch {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
} 