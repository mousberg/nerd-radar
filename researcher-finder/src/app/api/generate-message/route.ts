import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

interface Researcher {
  name: string;
  email?: string;
  institution?: string;
  research_areas: string[];
  arxiv_papers: any[];
  google_scholar_info?: {
    research_interests?: string[];
    recent_papers?: {
      title: string;
      year?: string;
      cited_by?: number;
    }[];
    cited_by?: number;
  };
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generatePersonalizedMessage(researcher: Researcher): Promise<string> {
  try {
    // Build context about the researcher
    const researchAreas = researcher.research_areas.length > 0 
      ? researcher.research_areas.join(', ') 
      : 'various research areas';

    const scholarInterests = researcher.google_scholar_info?.research_interests && researcher.google_scholar_info.research_interests.length > 0
      ? researcher.google_scholar_info.research_interests.slice(0, 3).join(', ')
      : '';

    const recentPapers = researcher.google_scholar_info?.recent_papers && researcher.google_scholar_info.recent_papers.length > 0
      ? researcher.google_scholar_info.recent_papers.slice(0, 2).map(p => p.title).join(', ')
      : researcher.arxiv_papers.length > 0
      ? researcher.arxiv_papers.slice(0, 2).map(p => p.title).join(', ')
      : '';

    const citations = researcher.google_scholar_info?.cited_by 
      ? `with ${researcher.google_scholar_info.cited_by.toLocaleString()} citations` 
      : '';

    const institution = researcher.institution ? `at ${researcher.institution}` : '';

    const prompt = `Generate a short, friendly, and professional message to reach out to a researcher for networking. 

Researcher Details:
- Name: ${researcher.name}
- Institution: ${institution}
- Research Areas: ${researchAreas}
- Research Interests: ${scholarInterests}
- Recent Papers: ${recentPapers}
- Citations: ${citations}

Requirements:
- Keep it under 150 words
- Be specific about their research work
- Sound genuine and personalized
- Invite them for a brief chat or coffee
- Professional but approachable tone
- Don't mention specific paper titles unless they're very relevant
- Focus on their research impact and interests

Generate only the message content, no subject line or additional formatting.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional networking assistant helping to craft personalized, genuine outreach messages to researchers. Keep messages concise, specific, and inviting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 180,
      temperature: 0.6,
    });

    const message = completion.choices[0]?.message?.content?.trim();
    
    if (!message) {
      throw new Error('No message generated');
    }

    return message;

  } catch (error) {
    console.error('Error generating message with OpenAI:', error);
    
    // Fallback message if OpenAI fails
    const fallbackMessage = `Hi ${researcher.name},

I came across your work in ${researcher.research_areas.length > 0 ? researcher.research_areas[0] : 'your research area'} and found it really interesting${researcher.institution ? ` - particularly the research being done at ${researcher.institution}` : ''}. 

I'd love to connect and learn more about your current projects. Would you be open to a brief chat over coffee or a quick call sometime?

Looking forward to hearing from you!`;

    return fallbackMessage;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { researcher } = await request.json();
    
    if (!researcher) {
      return NextResponse.json({ error: 'No researcher provided' }, { status: 400 });
    }
    
    console.log(`Generating personalized message for ${researcher.name}`);
    
    const message = await generatePersonalizedMessage(researcher);
    
    return NextResponse.json({ 
      message,
      researcher_name: researcher.name 
    });
    
  } catch (error) {
    console.error('Error in generate message API:', error);
    return NextResponse.json({ error: 'Failed to generate message' }, { status: 500 });
  }
} 