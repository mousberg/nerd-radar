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
      model: "gpt-3.5-turbo",
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
  
  // Common research area mappings
  if (queryLower.includes('machine learning') || queryLower.includes('ml')) {
    return 'cat:cs.LG OR cat:stat.ML';
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
  } else {
    return `all:${query}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'No search query provided' }, { status: 400 });
    }

    // Generate search query
    const searchQuery = await generateAISearchQuery(query.trim());
    
    const maxResults = 20;
    
    // Try search without restrictive date filtering first
    let url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${maxResults}&sortBy=submittedDate&sortOrder=descending`;
    
    console.log('ArXiv search URL:', url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.statusText}`);
    }
    
    const xmlData = await response.text();
    
    // Parse XML response
    const papers: Paper[] = [];
    
    // Simple XML parsing for entries
    const entryRegex = /<entry>[\s\S]*?<\/entry>/g;
    const entries = xmlData.match(entryRegex) || [];
    
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
    
    return NextResponse.json({
      papers,
      query: searchQuery
    });
    
  } catch (error) {
    console.error('Error searching papers:', error);
    return NextResponse.json({ error: 'Failed to search papers' }, { status: 500 });
  }
} 