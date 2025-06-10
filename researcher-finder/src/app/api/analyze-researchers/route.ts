import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const client = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

interface ArXivPaper {
  title: string;
  published: string;
  arxiv_id: string;
  link: string;
}

async function extractPDFFirstPage(pdfUrl: string): Promise<{ text: string | null; error: string | null }> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      return { text: null, error: `Failed to fetch PDF: ${response.statusText}` };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // For now, we'll use a simple text extraction approach
    // In production, you'd want to use a proper PDF parser like pdf-parse
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 8000)); // Increased for better extraction
    
    return { text, error: null };
  } catch (error) {
    return { text: null, error: `Error processing PDF: ${error}` };
  }
}

async function searchArXivByAuthor(authorName: string): Promise<ArXivPaper[]> {
  try {
    const searchQuery = `au:"${authorName}"`;
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `http://export.arxiv.org/api/query?search_query=${encodedQuery}&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    
    const xmlData = await response.text();
    const papers: ArXivPaper[] = [];
    
    // Parse XML response
    const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
    const entries = xmlData.match(entryRegex) || [];
    
    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      
      if (titleMatch && publishedMatch && idMatch) {
        const title = titleMatch[1].replace(/\s+/g, ' ').trim();
        const published = publishedMatch[1].substring(0, 10);
        const link = idMatch[1].trim();
        const arxivId = link.split('/').pop() || 'N/A';
        
        papers.push({
          title,
          published,
          arxiv_id: arxivId,
          link
        });
      }
    }
    
    return papers;
  } catch (error) {
    console.error(`Error searching ArXiv for ${authorName}:`, error);
    return [];
  }
}

async function findGoogleScholarProfile(researcherName: string, institution?: string): Promise<string | null> {
  if (!client) {
    return null;
  }

  try {
    const searchContext = `
      Find the Google Scholar profile URL for researcher: ${researcherName}
      ${institution ? `Institution: ${institution}` : ''}
      
      Google Scholar URLs follow the format: https://scholar.google.com/citations?user=USER_ID
      
      If you can suggest a likely Google Scholar profile URL based on the researcher's name and institution, provide it.
      If you cannot find or suggest a specific URL, respond with "null".
      
      Respond with ONLY the URL or "null", no explanations.
    `;
    
    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert at finding academic profiles. Suggest likely Google Scholar profile URLs based on researcher information. Be conservative - only suggest URLs if you're confident they might exist."
        },
        {
          role: "user",
          content: searchContext
        }
      ],
      max_tokens: 100,
      temperature: 0.1
    });
    
    const result = response.choices[0].message.content?.trim();
    
    if (result && result !== "null" && result.includes("scholar.google.com")) {
      return result;
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding Google Scholar for ${researcherName}:`, error);
    return null;
  }
}

function extractResearcherContacts(text: string): Researcher[] {
  const researchers: Researcher[] = [];
  
  // Extract emails
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailPattern) || [];
  
  // Extract ORCID IDs
  const orcidPattern = /(?:orcid\.org\/|ORCID:\s*)?(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/gi;
  const orcids = text.match(orcidPattern) || [];
  
  // Extract URLs/websites
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+[^\s<>"{}|\\^`\[\].,;:!?]/g;
  const urls = text.match(urlPattern) || [];
  
  // Extract social media and academic profiles
  const linkedinPattern = /linkedin\.com\/in\/[^\s<>"{}|\\^`\[\].,;:!?]+/gi;
  const scholarPattern = /scholar\.google\.com\/citations\?user=[^\s<>"{}|\\^`\[\].,;:!?]+/gi;
  const researchgatePattern = /researchgate\.net\/profile\/[^\s<>"{}|\\^`\[\].,;:!?]+/gi;
  
  const linkedinProfiles = text.match(linkedinPattern) || [];
  const scholarProfiles = text.match(scholarPattern) || [];
  const researchgateProfiles = text.match(researchgatePattern) || [];
  
  // Extract phone numbers
  const phonePattern = /(\+?[\d\s\-\(\)]{10,})/g;
  const phones = text.match(phonePattern) || [];
  
  // Extract author names and affiliations
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  const authorInfo: string[] = [];
  let inAuthorSection = false;
  
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i];
    
    // Detect author section
    if (['author', 'affiliation', 'department', 'university', 'institute'].some(keyword => 
      line.toLowerCase().includes(keyword))) {
      inAuthorSection = true;
    }
    
    // Extract potential author names
    if (inAuthorSection || i < 15) {
      const namePatterns = [
        /([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)/g,  // John M. Smith
        /([A-Z]\. [A-Z][a-z]+)/g,              // J. Smith
        /([A-Z][a-z]+ [A-Z][a-z]+)/g,          // John Smith
        /([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+)/g, // First Middle Last
      ];
      
      for (const pattern of namePatterns) {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach(match => {
            if (match.length > 3 && !authorInfo.includes(match) && 
                !match.toLowerCase().includes('university') && 
                !match.toLowerCase().includes('institute') &&
                !match.toLowerCase().includes('department')) {
              authorInfo.push(match);
            }
          });
        }
      }
    }
  }
  
  // Extract institutions
  const institutionKeywords = ['university', 'institute', 'college', 'laboratory', 'center', 'department'];
  const institutions: string[] = [];
  
  for (let i = 0; i < Math.min(lines.length, 35); i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    
    if (institutionKeywords.some(keyword => lineLower.includes(keyword))) {
      if (line.length > 10 && line.length < 200) {
        institutions.push(line.trim());
      }
    }
  }
  
  // Create researcher entries
  for (let i = 0; i < Math.min(authorInfo.length, 10); i++) {
    const name = authorInfo[i];
    const additionalContacts: string[] = [];
    
    // Add relevant emails, phones, and other contacts for this researcher
    emails.forEach(email => {
      if (email.toLowerCase().includes(name.split(' ')[0].toLowerCase()) ||
          email.toLowerCase().includes(name.split(' ').pop()?.toLowerCase() || '')) {
        additionalContacts.push(`Email: ${email}`);
      }
    });
    
    phones.forEach(phone => {
      if (phone.length > 8) {
        additionalContacts.push(`Phone: ${phone.trim()}`);
      }
    });
    
    const researcher: Researcher = {
      name,
      email: emails[i] || undefined,
      orcid: orcids[i] || undefined,
      institution: institutions[i] || undefined,
      website: undefined,
      linkedin: linkedinProfiles[i] ? `https://${linkedinProfiles[i]}` : undefined,
      google_scholar: scholarProfiles[i] ? `https://${scholarProfiles[i]}` : undefined,
      researchgate: researchgateProfiles[i] ? `https://${researchgateProfiles[i]}` : undefined,
      research_areas: [],
      arxiv_papers: [],
      paper_count: 0,
      additional_contacts: additionalContacts
    };
    
    // Try to find relevant URLs for this researcher
    for (const url of urls) {
      const nameParts = name.split(' ').filter(part => part.length > 2);
      if (nameParts.some(part => url.toLowerCase().includes(part.toLowerCase()))) {
        researcher.website = url;
        break;
      }
    }
    
    researchers.push(researcher);
  }
  
  return researchers;
}

async function enhanceResearcherInfo(researchers: Researcher[], paperContext: string = ""): Promise<Researcher[]> {
  const enhancedResearchers: Researcher[] = [];
  
  for (const researcher of researchers) {
    const enhanced = { ...researcher };
    
    try {
      // Search ArXiv for researcher's papers
      console.log(`Searching ArXiv for ${researcher.name}...`);
      enhanced.arxiv_papers = await searchArXivByAuthor(researcher.name);
      enhanced.paper_count = enhanced.arxiv_papers.length;
      
      // Find Google Scholar profile if not already found
      if (!enhanced.google_scholar) {
        console.log(`Searching Google Scholar for ${researcher.name}...`);
        const scholarProfile = await findGoogleScholarProfile(researcher.name, researcher.institution);
        enhanced.google_scholar = scholarProfile || undefined;
      }
      
      // Use AI to enhance research areas and profiles
      if (client) {
        const searchContext = `
          Researcher: ${researcher.name}
          Institution: ${researcher.institution || 'Unknown'}
          Paper Context: ${paperContext.substring(0, 300)}
          ArXiv Papers Found: ${enhanced.paper_count}
          
          Based on this information, suggest research areas for this researcher.
          Also suggest likely LinkedIn and ResearchGate profile URLs if not already found.
          
          Respond in JSON format:
          {
            "research_areas": ["area1", "area2", "area3"],
            "linkedin": "https://linkedin.com/in/...",
            "researchgate": "https://www.researchgate.net/profile/..."
          }
          
          If you cannot suggest specific URLs, use null for those fields.
        `;
        
        const response = await client.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert at analyzing academic profiles. Suggest research areas based on context and likely profile URLs. Be conservative with URLs."
            },
            {
              role: "user",
              content: searchContext
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        });
        
        const aiResponse = response.choices[0].message.content;
        
        if (aiResponse) {
          try {
            const profileData = JSON.parse(aiResponse);
            
            if (profileData.research_areas && Array.isArray(profileData.research_areas)) {
              enhanced.research_areas = profileData.research_areas.slice(0, 5);
            }
            
            if (!enhanced.linkedin && profileData.linkedin) {
              enhanced.linkedin = profileData.linkedin;
            }
            
            if (!enhanced.researchgate && profileData.researchgate) {
              enhanced.researchgate = profileData.researchgate;
            }
          } catch {
            // If JSON parsing fails, extract research areas from the paper context
            const contextLower = paperContext.toLowerCase();
            const commonAreas = ['machine learning', 'computer vision', 'natural language processing', 
                                'artificial intelligence', 'deep learning', 'neural networks', 'robotics',
                                'quantum computing', 'bioinformatics', 'data science'];
            
            enhanced.research_areas = commonAreas.filter(area => 
              contextLower.includes(area)
            ).slice(0, 3);
          }
        }
      }
    } catch (error) {
      console.error(`Error enhancing info for ${researcher.name}:`, error);
    }
    
    enhancedResearchers.push(enhanced);
  }
  
  // Sort researchers by paper count (descending)
  return enhancedResearchers.sort((a, b) => b.paper_count - a.paper_count);
}

function parsePaperMetadata(text: string): { title?: string } {
  const metadata: { title?: string } = {};
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  // Find title - usually one of the first few substantial lines
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    if (line.length > 20 && 
        !line.startsWith('arXiv:') && 
        !line.startsWith('Submitted') && 
        !line.startsWith('Received') && 
        !line.startsWith('Accepted') &&
        !line.includes('@') &&
        !line.includes('University') &&
        !line.includes('Institute') &&
        !line.includes('http')) {
      metadata.title = line;
      break;
    }
  }
  
  return metadata;
}

export async function POST(request: NextRequest) {
  try {
    const { pdfUrl } = await request.json();
    
    if (!pdfUrl) {
      return NextResponse.json({ error: 'No PDF URL provided' }, { status: 400 });
    }
    
    // Validate URL
    if (!pdfUrl.startsWith('http') || !pdfUrl.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Invalid PDF URL' }, { status: 400 });
    }
    
    // Extract first page text
    const { text, error } = await extractPDFFirstPage(pdfUrl);
    if (error || !text) {
      return NextResponse.json({ error: error || 'Could not extract text from PDF' }, { status: 500 });
    }
    
    // Extract paper title
    const metadata = parsePaperMetadata(text);
    const paperTitle = metadata.title || '';
    
    // Extract researcher contacts
    let researchers = extractResearcherContacts(text);
    
    // Enhance with ArXiv papers, Google Scholar, and additional info
    if (researchers.length > 0) {
      const paperContext = `${paperTitle}\n${text.substring(0, 1000)}`;
      researchers = await enhanceResearcherInfo(researchers, paperContext);
    }
    
    return NextResponse.json({
      url: pdfUrl,
      paper_title: paperTitle,
      researchers
    });
    
  } catch (error) {
    console.error('Error analyzing researchers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 