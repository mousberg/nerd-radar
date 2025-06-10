import { NextRequest, NextResponse } from 'next/server';

interface ContactExtractionResult {
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  twitter?: string;
  office_address?: string;
  department?: string;
  additional_contacts?: string[];
}

async function extractContactDetails(profileUrl: string, researcherName: string): Promise<ContactExtractionResult | null> {
  try {
    const browserUseToken = process.env.BROWSER_USE_API_KEY;
    if (!browserUseToken) {
      console.error('BROWSER_USE_API_KEY not found in environment variables');
      return null;
    }

    const task = `Navigate to ${profileUrl} to find contact information for ${researcherName}. Extract all available contact details including:
    - Email address (look for @, mailto links, contact sections)
    - Phone number (look for phone, tel links, contact info)
    - Website or personal page URL
    - LinkedIn profile URL
    - Twitter/X profile URL
    - Office address or location
    - Department or affiliation details
    - Any other contact methods available
    
    Look carefully in:
    - Contact sections
    - About/Bio sections
    - Footer areas
    - Profile sidebars
    - CV or resume links
    - Publication author info
    - University directory pages
    
    Return the contact details in a structured format.`;

    const requestBody = {
      task: task,
      secrets: {},
      allowed_domains: [
        "scholar.google.com",
        "researchgate.net", 
        "linkedin.com",
        "twitter.com",
        "x.com",
        "arxiv.org",
        "*.edu",
        "*.ac.uk",
        "*.org"
      ],
      save_browser_data: false,
      structured_output_json: JSON.stringify({
        email: "string|null",
        phone: "string|null", 
        website: "string|null",
        linkedin: "string|null",
        twitter: "string|null",
        office_address: "string|null",
        department: "string|null",
        additional_contacts: "array|null"
      }),
      llm_model: "gpt-4o-mini",
      use_adblock: true,
      use_proxy: true,
      proxy_country_code: "us",
      highlight_elements: true,
      included_file_names: []
    };

    console.log(`Starting contact extraction task for ${researcherName} from ${profileUrl}`);

    // Step 1: Submit the task
    const response = await fetch('https://api.browser-use.com/api/v1/run-task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${browserUseToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`Browser-use API request failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return null;
    }

    const taskData = await response.json();
    console.log('Full browser-use API response:', JSON.stringify(taskData, null, 2));

    // Check for different possible task ID field names
    const taskId = taskData.task_id || taskData.taskId || taskData.id || taskData.session_id;
    
    if (!taskId) {
      console.error('No task ID found in browser-use API response');
      console.error('Available fields:', Object.keys(taskData));
      return null;
    }

    console.log('Using task ID:', taskId);

    // Check if task completed immediately (synchronous response)
    if (taskData.status === 'completed' || taskData.status === 'success') {
      console.log('Task completed synchronously');
      
      const structuredOutput = taskData.structured_output || taskData.result?.structured_output;
      if (structuredOutput) {
        const contacts = typeof structuredOutput === 'string' 
          ? JSON.parse(structuredOutput)
          : structuredOutput;
        console.log(`Extracted contacts for ${researcherName}:`, contacts);
        return contacts;
      }

      const textOutput = taskData.output || taskData.result?.output || taskData.result?.text;
      if (textOutput) {
        console.log('No structured output, parsing text output...');
        return parseContactsFromText(textOutput);
      }
    }

    // Step 2: Poll for task completion
    const maxAttempts = 24; // Maximum polling attempts (4 minutes with 10s intervals)
    let attempts = 0;

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Polling task status (attempt ${attempts}/${maxAttempts}) for ${researcherName}...`);

      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      const statusResponse = await fetch(`https://api.browser-use.com/api/v1/task/${taskId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${browserUseToken}`,
        },
      });

      if (!statusResponse.ok) {
        console.error(`Status check failed: ${statusResponse.status} ${statusResponse.statusText}`);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log('Status response:', JSON.stringify(statusData, null, 2));

      const status = statusData.status || statusData.state || statusData.task_status;
      console.log('Task status:', status);

      if (status === 'completed' || status === 'success') {
        console.log('Task completed successfully');
        
        // Extract the structured output from the completed task
        const structuredOutput = statusData.structured_output || statusData.result?.structured_output;
        if (structuredOutput) {
          const contacts = typeof structuredOutput === 'string' 
            ? JSON.parse(structuredOutput)
            : structuredOutput;

          console.log(`Extracted contacts for ${researcherName}:`, contacts);
          return contacts;
        }

        // Fallback: try to extract from text output
        const textOutput = statusData.output || statusData.result?.output || statusData.result?.text;
        if (textOutput) {
          console.log('No structured output, parsing text output...');
          return parseContactsFromText(textOutput);
        }

        console.log(`Task completed but no contact details found for ${researcherName}`);
        return null;
      }

      if (status === 'failed' || status === 'error' || status === 'cancelled') {
        console.error(`Task failed with status: ${status}`);
        const errorDetails = statusData.error || statusData.result?.error || statusData.message;
        if (errorDetails) {
          console.error('Error details:', errorDetails);
        }
        return null;
      }

      // Task is still running (pending, in_progress, etc.)
      console.log(`Task still running with status: ${status}`);
    }

    console.error(`Task timed out after ${maxAttempts} attempts (${maxAttempts * 10} seconds)`);
    return {
      error: `Contact extraction timed out after ${maxAttempts * 10} seconds. The profile page may be slow to load or require manual verification.`
    } as any;

  } catch (error) {
    console.error(`Error extracting contacts for ${researcherName}:`, error);
    return null;
  }
}

function parseContactsFromText(text: string): ContactExtractionResult {
  const contacts: ContactExtractionResult = {};
  
  // Email extraction
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    contacts.email = emailMatch[0];
  }

  // Phone extraction
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    contacts.phone = phoneMatch[0];
  }

  // LinkedIn extraction
  const linkedinMatch = text.match(/linkedin\.com\/in\/[a-zA-Z0-9-]+/);
  if (linkedinMatch) {
    contacts.linkedin = `https://${linkedinMatch[0]}`;
  }

  // Twitter extraction
  const twitterMatch = text.match(/(twitter\.com|x\.com)\/[a-zA-Z0-9_]+/);
  if (twitterMatch) {
    contacts.twitter = `https://${twitterMatch[0]}`;
  }

  return contacts;
}

export async function POST(request: NextRequest) {
  try {
    const { researcher } = await request.json();
    
    if (!researcher || !researcher.name) {
      return NextResponse.json({ error: 'Researcher information required' }, { status: 400 });
    }

    // Use the Google Scholar profile link (Author's Details button)
    let profileUrl = researcher.google_scholar_info?.profile_link || researcher.google_scholar;
    
    if (!profileUrl) {
      return NextResponse.json({ 
        error: 'No Google Scholar profile URL available for contact extraction. Please ensure the researcher has author details.',
        researcher_name: researcher.name 
      }, { status: 400 });
    }

    console.log(`Using profile URL for ${researcher.name}: ${profileUrl}`);

    console.log(`Starting contact extraction for ${researcher.name}`);
    
    const extractedContacts = await extractContactDetails(profileUrl, researcher.name);
    
    if (!extractedContacts) {
      return NextResponse.json({ 
        error: 'Failed to extract contact details - browser automation may have encountered an issue',
        researcher_name: researcher.name 
      }, { status: 500 });
    }

    // Check if the response contains an error (like timeout)
    if ((extractedContacts as any).error) {
      return NextResponse.json({ 
        error: (extractedContacts as any).error,
        researcher_name: researcher.name 
      }, { status: 408 }); // Request timeout
    }

    return NextResponse.json({ 
      contacts: extractedContacts,
      researcher_name: researcher.name,
      source_url: profileUrl,
      message: 'Contact extraction completed successfully'
    });
    
  } catch (error) {
    console.error('Error in extract contacts API:', error);
    return NextResponse.json({ error: 'Failed to extract contacts' }, { status: 500 });
  }
} 