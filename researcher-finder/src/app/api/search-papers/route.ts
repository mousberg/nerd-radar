import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const client = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

interface Paper {
  id: string;
  title: string;
  authors: string[];
  summary: string;
  published: string;
  link: string;
  pdf_url?: string;
}

async function generateAISearchQuery(query: string): Promise<string> {
  if (!client) {
    return generateFallbackQuery(query);
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert at converting research requirements into ArXiv search queries. 
          ArXiv supports these search fields: ti (title), au (author), abs (abstract), cat (category), all (all fields).
          Generate a focused search query using relevant keywords and fields.
          Examples:
          - "machine learning healthcare" -> "ti:machine learning AND abs:healthcare"
          - "computer vision autonomous driving" -> "(ti:computer vision OR abs:computer vision) AND (abs:autonomous driving OR abs:self-driving)"
          
          Respond with ONLY the search query, no explanations.`
        },
        {
          role: "user",
          content: `Convert this research requirement into an ArXiv search query: ${query}`
        }
      ],
      max_tokens: 100,
      temperature: 0.3
    });
    
    return response.choices[0].message.content?.trim() || generateFallbackQuery(query);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return generateFallbackQuery(query);
  }
}

function generateFallbackQuery(query: string): string {
  const queryLower = query.toLowerCase();
  
  // Common research area mappings - using simpler, more reliable queries
  if (queryLower.includes('machine learning') || queryLower.includes('ml')) {
    return 'cat:cs.LG';
  } else if (queryLower.includes('computer vision') || queryLower.includes('cv')) {
    return 'cat:cs.CV';
  } else if (queryLower.includes('natural language processing') || queryLower.includes('nlp')) {
    return 'cat:cs.CL';
  } else if (queryLower.includes('robotics')) {
    return 'cat:cs.RO';
  } else if (queryLower.includes('quantum')) {
    return 'cat:quant-ph';
  } else if (queryLower.includes('physics')) {
    return 'cat:physics';
  } else if (queryLower.includes('mathematics') || queryLower.includes('math')) {
    return 'cat:math';
  } else if (queryLower.includes('ai') || queryLower.includes('artificial intelligence')) {
    return 'cat:cs.AI';
  } else if (queryLower.includes('healthcare') || queryLower.includes('medical')) {
    return 'all:"' + query + '"';
  } else {
    // Use simple keyword search for other queries
    return 'all:"' + query + '"';
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, filters } = await request.json();
    
    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'No search query provided' }, { status: 400 });
    }

    // Generate search query
    let searchQuery = await generateAISearchQuery(query.trim());
    
    // Apply advanced filters
    const maxResults = filters?.maxResults || 20;
    const sortBy = filters?.sortBy || 'submittedDate';
    const duration = filters?.duration || '2years';
    const categories = filters?.categories || [];
    
    // Note: ArXiv date filtering can be restrictive, so we'll filter results after fetching
    // to ensure we get results. The date filtering will be applied post-processing.
    
    // Add category filtering
    if (categories.length > 0) {
      const categoryQuery = categories.map((cat: string) => `cat:${cat}`).join(' OR ');
      searchQuery += ` AND (${categoryQuery})`;
    }
    
    // Build URL with filters
    let url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${maxResults}&sortBy=${sortBy}&sortOrder=descending`;
    
    console.log('ArXiv search URL:', url);
    console.log('Search query:', searchQuery);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`ArXiv API error: ${response.status} ${response.statusText}`);
      throw new Error(`ArXiv API error: ${response.statusText}`);
    }
    
    const xmlData = await response.text();
    console.log('ArXiv response length:', xmlData.length);
    
    // Parse XML response
    const papers: Paper[] = [];
    
    // Simple XML parsing for entries
    const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
    const entries = xmlData.match(entryRegex) || [];
    
    console.log(`Found ${entries.length} entries in ArXiv response`);
    
    // Calculate date cutoff for filtering
    let cutoffDate: Date | null = null;
    if (duration !== 'all') {
      const now = new Date();
      switch (duration) {
        case '1month':
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
        case '3months':
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          break;
        case '6months':
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          break;
        case '1year':
          cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          break;
        case '2years':
          cutoffDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
          break;
        case '5years':
          cutoffDate = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
          break;
      }
    }
    
    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      
      // Extract authors
      const authorMatches = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g) || [];
      const authors = authorMatches.map(author => {
        const nameMatch = author.match(/<name>(.*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : '';
      }).filter(name => name);
      
      if (titleMatch && summaryMatch && publishedMatch && idMatch) {
        const title = titleMatch[1].replace(/\s+/g, ' ').trim();
        const summary = summaryMatch[1].replace(/\s+/g, ' ').trim();
        const published = publishedMatch[1].substring(0, 10); // Just date part
        const link = idMatch[1].trim();
        const arxivId = link.split('/').pop() || 'N/A';
        
        // Apply date filtering if specified
        if (cutoffDate) {
          const paperDate = new Date(published);
          if (paperDate < cutoffDate) {
            continue; // Skip papers older than cutoff
          }
        }
        
        // Generate PDF URL
        const pdfUrl = link.replace('/abs/', '/pdf/') + '.pdf';
        
        papers.push({
          id: arxivId,
          title,
          authors,
          summary,
          published,
          link,
          pdf_url: pdfUrl
        });
      }
    }
    
    console.log(`Processed ${papers.length} papers after filtering`);
    
    // If no papers found with the AI-generated query, try a simpler fallback
    if (papers.length === 0) {
      console.log('No papers found, trying fallback query...');
      const fallbackQuery = generateFallbackQuery(query.trim());
      const fallbackUrl = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(fallbackQuery)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
      
      console.log('Fallback ArXiv URL:', fallbackUrl);
      
      try {
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackXmlData = await fallbackResponse.text();
          const fallbackEntries = fallbackXmlData.match(entryRegex) || [];
          
          console.log(`Found ${fallbackEntries.length} entries in fallback response`);
          
          // Process fallback entries with the same logic
          for (const entry of fallbackEntries.slice(0, maxResults)) {
            const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
            const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
            const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
            const idMatch = entry.match(/<id>(.*?)<\/id>/);
            
            const authorMatches = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g) || [];
            const authors = authorMatches.map(author => {
              const nameMatch = author.match(/<name>(.*?)<\/name>/);
              return nameMatch ? nameMatch[1].trim() : '';
            }).filter(name => name);
            
            if (titleMatch && summaryMatch && publishedMatch && idMatch) {
              const title = titleMatch[1].replace(/\s+/g, ' ').trim();
              const summary = summaryMatch[1].replace(/\s+/g, ' ').trim();
              const published = publishedMatch[1].substring(0, 10);
              const link = idMatch[1].trim();
              const arxivId = link.split('/').pop() || 'N/A';
              
              // Apply date filtering if specified
              if (cutoffDate) {
                const paperDate = new Date(published);
                if (paperDate < cutoffDate) {
                  continue;
                }
              }
              
              const pdfUrl = link.replace('/abs/', '/pdf/') + '.pdf';
              
              papers.push({
                id: arxivId,
                title,
                authors,
                summary,
                published,
                link,
                pdf_url: pdfUrl
              });
            }
          }
          
          console.log(`Fallback found ${papers.length} papers`);
        }
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
      }
    }
    
    // Last resort: try a very simple search if still no results
    if (papers.length === 0) {
      console.log('Trying last resort simple search...');
      const simpleUrl = `http://export.arxiv.org/api/query?search_query=cat:cs.LG&start=0&max_results=10&sortBy=submittedDate&sortOrder=descending`;
      
      try {
        const simpleResponse = await fetch(simpleUrl);
        if (simpleResponse.ok) {
          const simpleXmlData = await simpleResponse.text();
          const simpleEntries = simpleXmlData.match(entryRegex) || [];
          
          console.log(`Found ${simpleEntries.length} entries in simple search`);
          
          // Just take the first few papers from machine learning category
          for (const entry of simpleEntries.slice(0, 5)) {
            const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
            const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
            const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
            const idMatch = entry.match(/<id>(.*?)<\/id>/);
            
            if (titleMatch && summaryMatch && publishedMatch && idMatch) {
              const title = titleMatch[1].replace(/\s+/g, ' ').trim();
              const summary = summaryMatch[1].replace(/\s+/g, ' ').trim();
              const published = publishedMatch[1].substring(0, 10);
              const link = idMatch[1].trim();
              const arxivId = link.split('/').pop() || 'N/A';
              const pdfUrl = link.replace('/abs/', '/pdf/') + '.pdf';
              
              papers.push({
                id: arxivId,
                title,
                authors: ['Sample Research'],
                summary,
                published,
                link,
                pdf_url: pdfUrl
              });
            }
          }
          
          console.log(`Simple search found ${papers.length} papers`);
        }
      } catch (simpleError) {
        console.error('Simple search also failed:', simpleError);
      }
    }
    
    return NextResponse.json({
      papers,
      query: papers.length > 0 ? searchQuery : 'cat:cs.LG'
    });
    
  } catch (error) {
    console.error('Error searching papers:', error);
    return NextResponse.json({ error: 'Failed to search papers' }, { status: 500 });
  }
} 