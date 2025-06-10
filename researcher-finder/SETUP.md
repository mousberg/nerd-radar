# Nerd Radar Setup Guide

## Required API Keys

To use all features of Nerd Radar, you'll need to set up the following API keys in your `.env.local` file:

### 1. OpenAI API Key

Required for AI-powered message generation and paper summaries.

```
OPENAI_API_KEY=your_openai_api_key_here
```

Get your key from: https://platform.openai.com/api-keys

### 2. SERP API Key (Optional)

Enhances researcher profiles with Google Scholar data including citations and research interests.

```
SERP_API_KEY=your_serp_api_key_here
```

Get your key from: https://serpapi.com/

### 3. Browser Use API Key (For Contact Extraction)

Required for the new contact extraction feature that automatically finds researcher contact details.

```
BROWSER_USE_API_KEY=your_browser_use_api_key_here
```

Get your key from: https://api.browser-use.com/

## Setup Instructions

1. Create a `.env.local` file in the `researcher-finder` directory
2. Add all your API keys to this file
3. Restart your development server

Example `.env.local` file:

```env
OPENAI_API_KEY=sk-your-actual-openai-key-here
SERP_API_KEY=your-actual-serp-key-here
BROWSER_USE_API_KEY=your-actual-browser-use-key-here
```

## Feature Availability

- **Paper Search**: Always available (uses ArXiv API)
- **Researcher Analysis**: Always available (basic functionality)
- **Enhanced Profiles**: Requires SERP_API_KEY
- **Message Generation**: Requires OPENAI_API_KEY
- **Paper Summaries**: Requires OPENAI_API_KEY
- **Contact Extraction**: Requires BROWSER_USE_API_KEY

## Contact Extraction Feature

The new "Extract Contacts" button in the saved researchers section will:

1. **Submit a browser automation task** to visit the researcher's Google Scholar profile
2. **Poll for completion** (typically takes 1-4 minutes)
3. **Intelligently scan** for contact information including:
   - Email addresses
   - Phone numbers
   - Personal websites
   - Social media profiles (LinkedIn, Twitter/X)
   - Office addresses
   - Department information
4. **Display found contacts** with clickable links for easy communication

### Important Notes:

- **Timing**: Contact extraction is asynchronous and may take 1-4 minutes to complete
- **Progress**: Watch the live console for real-time status updates
- **Best Results**: Works best with Google Scholar profiles that link to university pages
- **Limitations**: May timeout if profile pages are slow to load or require authentication

### How It Works:

1. Click "Extract Contacts" on any saved researcher
2. The system submits a browser automation task to browser-use.com
3. A headless browser visits the researcher's profile page
4. AI scans the page for contact information
5. Results are displayed with clickable contact links
