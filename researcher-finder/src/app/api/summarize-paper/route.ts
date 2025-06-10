import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generatePaperSummary(title: string, abstract: string): Promise<string> {
  try {
    const prompt = `Create an engaging, easy-to-understand summary of this research paper with relevant emojis. Make it accessible to a general audience while highlighting key findings and implications.

Paper Title: ${title}

Abstract: ${abstract}

Requirements:
- Keep it under 120 words for quick reading
- Use 3-5 relevant emojis to make it engaging (🔬🧬🤖📊💡🚀 etc.)
- Focus on what the research does and why it matters
- Write in an accessible, conversational tone
- Highlight key findings or practical applications
- Make it punchy and easy to scan
- Use highlighting syntax for technical terms:
  * <code>code or algorithms</code> for programming/code
  * <tech>technical terms</tech> for key technologies 
  * <metric>performance numbers</metric> for results/metrics
  * <algo>algorithm names</algo> for specific algorithms

Generate only the summary content with emojis and highlighting tags.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a science communicator who excels at making complex research accessible and engaging through clear explanations and appropriate use of emojis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 200,
      temperature: 0.6,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    
    if (!summary) {
      throw new Error('No summary generated');
    }

    return summary;

  } catch (error) {
    console.error('Error generating summary with OpenAI:', error);
    
    // Fallback summary if OpenAI fails
    const fallbackSummary = `🔬 **Research Overview**

${abstract.length > 300 ? abstract.substring(0, 300) + '...' : abstract}

📊 This research contributes to advancing our understanding in this field and may have practical applications for future developments.`;

    return fallbackSummary;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, abstract } = await request.json();
    
    if (!title || !abstract) {
      return NextResponse.json({ error: 'Title and abstract are required' }, { status: 400 });
    }
    
    console.log(`Generating summary for paper: ${title.substring(0, 50)}...`);
    
    const summary = await generatePaperSummary(title, abstract);
    
    return NextResponse.json({ 
      summary,
      original_title: title 
    });
    
  } catch (error) {
    console.error('Error in summarize paper API:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
} 