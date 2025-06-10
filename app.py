import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import os
import tempfile
import re
import json
from datetime import datetime, timedelta

from flask import Flask, request, render_template_string, jsonify

app = Flask(__name__)

# Initialize OpenAI client (optional)
client = None
try:
    from openai import OpenAI
    api_key = os.getenv('OPENAI_API_KEY')
    if api_key:
        client = OpenAI(api_key=api_key)
    else:
        print("⚠️  OPENAI_API_KEY not set. AI-powered search query generation will be disabled.")
except ImportError:
    print("⚠️  OpenAI package not installed. AI-powered search query generation will be disabled.")
except Exception as e:
    print(f"⚠️  OpenAI initialization failed: {e}. Using fallback search.")

# Initialize PDF processing (optional)
PDF_AVAILABLE = False
try:
    import pdfplumber
    PDF_AVAILABLE = True
    print("✅ PDF processing available")
except ImportError:
    print("⚠️  pdfplumber not installed. Install with: pip install pdfplumber")

template = """
<!doctype html>
<title>🔍 AI-Powered Researcher Contact Finder</title>
<style>
body { font-family: Arial, sans-serif; max-width: 1000px; margin: 0 auto; padding: 20px; }
.form-group { margin-bottom: 15px; }
label { display: block; margin-bottom: 5px; font-weight: bold; }
input[type="text"], textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
textarea { height: 100px; resize: vertical; }
input[type="submit"], .btn { background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; display: inline-block; margin: 5px; }
input[type="submit"]:hover, .btn:hover { background-color: #0056b3; }
.result-item { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
.paper-title { font-weight: bold; color: #333; }
.authors { color: #666; margin: 5px 0; }
.abstract { margin: 10px 0; font-size: 0.9em; line-height: 1.4; }
.metadata { font-size: 0.8em; color: #888; }
.researcher-card { background: #e8f5e8; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #28a745; }
.researcher-name { font-size: 1.2em; font-weight: bold; color: #2d5a2d; margin-bottom: 10px; }
.contact-info { margin: 8px 0; }
.contact-info strong { color: #333; }
.social-links { margin: 10px 0; }
.social-links a { display: inline-block; margin: 3px 5px; padding: 5px 10px; background: #007bff; color: white; text-decoration: none; border-radius: 3px; font-size: 0.85em; }
.social-links a:hover { background: #0056b3; }
.tab-container { margin: 20px 0; border-bottom: 1px solid #ddd; }
.tab-button { background: none; border: none; padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; }
.tab-button.active { border-bottom: 2px solid #007bff; color: #007bff; }
.tab-content { display: none; }
.tab-content.active { display: block; }
.institution { color: #666; font-style: italic; margin: 5px 0; }
.research-areas { margin: 8px 0; }
.tag { display: inline-block; background: #e3f2fd; color: #1565c0; padding: 2px 8px; margin: 2px; border-radius: 12px; font-size: 0.8em; }
</style>
<h1>🔍 AI-Powered Researcher Contact Finder</h1>
<p style="color: #666; margin-bottom: 20px;">Find researchers and their contact information from ArXiv papers</p>

<div class="tab-container">
  <button class="tab-button active" onclick="switchTab('search')">📊 Search Papers</button>
  <button class="tab-button" onclick="switchTab('researcher')">👨‍🔬 Find Researchers</button>
</div>

<div id="search-tab" class="tab-content active">
  <form method="post">
    <div class="form-group">
      <label for="requirements">Describe your researcher requirements:</label>
      <textarea name="requirements" id="requirements" placeholder="e.g., I need researchers working on machine learning for healthcare, specifically deep learning applications in medical imaging...">{{ requirements or '' }}</textarea>
    </div>
    <div class="form-group">
      <label for="days_back">Search papers from last N days:</label>
      <input type="text" name="days_back" id="days_back" value="{{ days_back or '30' }}" placeholder="30">
    </div>
    <div class="form-group">
      <label for="max_results">Maximum results:</label>
      <input type="text" name="max_results" id="max_results" value="{{ max_results or '10' }}" placeholder="10">
    </div>
    <input type="submit" value="🔍 Find Researchers">
  </form>

  {% if search_query %}
    <div style="background: #e7f3ff; padding: 10px; margin: 20px 0; border-radius: 5px;">
      <strong>{{ 'AI Generated' if ai_enabled else 'Fallback' }} Search Query:</strong> {{ search_query }}
      {% if not ai_enabled %}
        <br><small style="color: #666;">💡 Set OPENAI_API_KEY environment variable for AI-powered query generation</small>
      {% endif %}
    </div>
  {% endif %}

  {% if results is not none %}
    <h2>📊 Results ({{ results|length }} papers found)</h2>
    {% if results %}
      {% for r in results %}
        <div class="result-item">
          <div class="paper-title">{{ r['title'] }}</div>
          <div class="authors"><strong>Authors:</strong> {{ r['authors']|join(', ') }}</div>
          {% if r['abstract'] %}
            <div class="abstract"><strong>Abstract:</strong> {{ r['abstract'][:500] }}{% if r['abstract']|length > 500 %}...{% endif %}</div>
          {% endif %}
          <div class="metadata">
            <strong>Published:</strong> {{ r['published'] }} | 
            <strong>ArXiv ID:</strong> {{ r['arxiv_id'] }} | 
            <a href="{{ r['link'] }}" target="_blank">View Paper</a>
            {% if r['link'] and 'arxiv.org/abs/' in r['link'] %}
              | <a href="#" onclick="analyzeResearchers('{{ r['link'].replace('/abs/', '/pdf/') }}.pdf')" class="btn" style="font-size: 0.8em; padding: 5px 10px;">👨‍🔬 Find Researchers</a>
            {% endif %}
          </div>
        </div>
      {% endfor %}
    {% else %}
      <p>No papers found matching your criteria. Try adjusting your requirements or extending the time range.</p>
    {% endif %}
  {% endif %}
</div>

<div id="researcher-tab" class="tab-content">
  <form onsubmit="return analyzeResearchersForm(event)">
    <div class="form-group">
      <label for="pdf_url">ArXiv PDF URL:</label>
      <input type="text" name="pdf_url" id="pdf_url" placeholder="https://arxiv.org/pdf/2506.07912v1.pdf" style="width: 70%; display: inline-block;">
      <input type="submit" value="👨‍🔬 Find Researchers" style="width: 25%; display: inline-block;">
    </div>
  </form>
  
  <div id="researcher-analysis-result"></div>
</div>

<script>
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  
  document.getElementById(tabName + '-tab').classList.add('active');
  event.target.classList.add('active');
}

function analyzeResearchers(url) {
  switchTab('researcher');
  document.getElementById('pdf_url').value = url;
  analyzeResearchersForm({preventDefault: () => {}});
}

async function analyzeResearchersForm(event) {
  event.preventDefault();
  
  const url = document.getElementById('pdf_url').value;
  const resultDiv = document.getElementById('researcher-analysis-result');
  
  if (!url) {
    alert('Please enter a PDF URL');
    return false;
  }
  
  resultDiv.innerHTML = '<div style="padding: 20px; text-align: center;"><em>🔄 Analyzing researchers... This may take a moment to find contact details and LinkedIn profiles.</em></div>';
  
  try {
    const response = await fetch('/analyze_researchers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'pdf_url=' + encodeURIComponent(url)
    });
    
    const data = await response.json();
    
    if (data.error) {
      resultDiv.innerHTML = '<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">❌ Error: ' + data.error + '</div>';
    } else {
      let html = '<h3>👨‍🔬 Researcher Analysis Results</h3>';
      html += '<div style="margin-bottom: 15px;"><strong>📎 Source:</strong> <a href="' + url + '" target="_blank">' + url + '</a></div>';
      
      if (data.paper_title) {
        html += '<div style="margin-bottom: 15px;"><strong>📋 Paper:</strong> ' + data.paper_title + '</div>';
      }
      
      if (data.researchers && data.researchers.length > 0) {
        data.researchers.forEach((researcher, index) => {
          html += '<div class="researcher-card">';
          html += '<div class="researcher-name">👤 ' + researcher.name + '</div>';
          
          if (researcher.institution) {
            html += '<div class="institution">🏛️ ' + researcher.institution + '</div>';
          }
          
          if (researcher.email) {
            html += '<div class="contact-info"><strong>📧 Email:</strong> <a href="mailto:' + researcher.email + '">' + researcher.email + '</a></div>';
          }
          
          if (researcher.orcid) {
            html += '<div class="contact-info"><strong>🆔 ORCID:</strong> <a href="https://orcid.org/' + researcher.orcid + '" target="_blank">' + researcher.orcid + '</a></div>';
          }
          
          if (researcher.website) {
            html += '<div class="contact-info"><strong>🌐 Website:</strong> <a href="' + researcher.website + '" target="_blank">' + researcher.website + '</a></div>';
          }
          
          if (researcher.research_areas && researcher.research_areas.length > 0) {
            html += '<div class="research-areas"><strong>🔬 Research Areas:</strong><br>';
            researcher.research_areas.forEach(area => {
              html += '<span class="tag">' + area + '</span>';
            });
            html += '</div>';
          }
          
          // Social/Professional Links
          let socialLinks = [];
          if (researcher.linkedin) {
            socialLinks.push('<a href="' + researcher.linkedin + '" target="_blank">💼 LinkedIn</a>');
          }
          if (researcher.google_scholar) {
            socialLinks.push('<a href="' + researcher.google_scholar + '" target="_blank">🎓 Google Scholar</a>');
          }
          if (researcher.researchgate) {
            socialLinks.push('<a href="' + researcher.researchgate + '" target="_blank">🔬 ResearchGate</a>');
          }
          
          if (socialLinks.length > 0) {
            html += '<div class="social-links">' + socialLinks.join('') + '</div>';
          }
          
          html += '</div>';
        });
      } else {
        html += '<p>No detailed researcher information found. This may be because:</p>';
        html += '<ul><li>The PDF format makes contact extraction difficult</li>';
        html += '<li>Contact information is not on the first page</li>';
        html += '<li>The paper uses a non-standard format</li></ul>';
      }
      
      resultDiv.innerHTML = html;
    }
  } catch (error) {
    resultDiv.innerHTML = '<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">❌ Error: ' + error.message + '</div>';
  }
  
  return false;
}
</script>
"""

def extract_researcher_contacts(text):
    """Extract researcher contact information from PDF text"""
    researchers = []
    
    # Extract emails
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    
    # Extract ORCID IDs
    orcid_pattern = r'(?:orcid\.org/|ORCID:\s*)?(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])'
    orcids = re.findall(orcid_pattern, text, re.IGNORECASE)
    
    # Extract URLs/websites
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+[^\s<>"{}|\\^`\[\].,;:!?]'
    urls = re.findall(url_pattern, text)
    
    # Extract author names and affiliations
    lines = text.split('\n')
    lines = [line.strip() for line in lines if line.strip()]
    
    # Look for author sections (usually near the top)
    author_info = []
    in_author_section = False
    
    for i, line in enumerate(lines[:25]):  # Check first 25 lines
        # Detect author section
        if any(keyword in line.lower() for keyword in ['author', 'affiliation', 'department', 'university', 'institute']):
            in_author_section = True
        
        # Extract potential author names (capitalized words)
        if in_author_section or i < 10:  # First 10 lines or in author section
            # Look for patterns like "First M. Last" or "F. Last"
            name_patterns = [
                r'([A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+)',  # John M. Smith
                r'([A-Z]\. [A-Z][a-z]+)',              # J. Smith
                r'([A-Z][a-z]+ [A-Z][a-z]+)',          # John Smith
            ]
            
            for pattern in name_patterns:
                matches = re.findall(pattern, line)
                for match in matches:
                    if len(match) > 3 and match not in author_info:
                        author_info.append(match)
    
    # Extract institutions
    institution_keywords = ['university', 'institute', 'college', 'laboratory', 'center', 'department']
    institutions = []
    
    for line in lines[:30]:  # Check first 30 lines
        line_lower = line.lower()
        if any(keyword in line_lower for keyword in institution_keywords):
            if len(line) > 10 and len(line) < 200:  # Reasonable length
                institutions.append(line.strip())
    
    # Create researcher entries
    for i, name in enumerate(author_info[:10]):  # Limit to first 10 authors
        researcher = {
            'name': name,
            'email': emails[i] if i < len(emails) else None,
            'orcid': orcids[i] if i < len(orcids) else None,
            'institution': institutions[i] if i < len(institutions) else None,
            'website': None,
            'linkedin': None,
            'google_scholar': None,
            'researchgate': None,
            'research_areas': []
        }
        
        # Try to find relevant URLs for this researcher
        for url in urls:
            if any(part.lower() in url.lower() for part in name.split() if len(part) > 2):
                researcher['website'] = url
                break
        
        researchers.append(researcher)
    
    return researchers

def find_linkedin_profiles(researchers, paper_context=""):
    """Use AI to search for LinkedIn profiles of researchers"""
    if not client:
        return researchers
    
    enhanced_researchers = []
    
    for researcher in researchers:
        enhanced = researcher.copy()
        
        try:
            # Create search context
            search_context = f"""
            Researcher: {researcher['name']}
            Institution: {researcher.get('institution', 'Unknown')}
            Paper Context: {paper_context[:200]}
            
            Based on this information, suggest likely LinkedIn profile URLs and research areas.
            Also suggest Google Scholar and ResearchGate profile URLs if possible.
            
            Respond in JSON format:
            {{
                "linkedin": "https://linkedin.com/in/...",
                "google_scholar": "https://scholar.google.com/citations?user=...",
                "researchgate": "https://www.researchgate.net/profile/...",
                "research_areas": ["area1", "area2", "area3"]
            }}
            
            If you cannot find specific URLs, use null for those fields.
            """
            
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert at finding academic profiles online. Based on researcher information, suggest likely profile URLs and research areas. Be conservative - only suggest URLs if you're confident they exist. For research areas, extract from the paper context."""
                    },
                    {
                        "role": "user",
                        "content": search_context
                    }
                ],
                max_tokens=300,
                temperature=0.1
            )
            
            ai_response = response.choices[0].message.content
            
            # Try to parse JSON response
            try:
                profile_data = json.loads(ai_response)
                
                if profile_data.get('linkedin'):
                    enhanced['linkedin'] = profile_data['linkedin']
                if profile_data.get('google_scholar'):
                    enhanced['google_scholar'] = profile_data['google_scholar']
                if profile_data.get('researchgate'):
                    enhanced['researchgate'] = profile_data['researchgate']
                if profile_data.get('research_areas'):
                    enhanced['research_areas'] = profile_data['research_areas'][:5]  # Limit to 5 areas
                
            except json.JSONDecodeError:
                # If JSON parsing fails, try to extract URLs from text
                linkedin_match = re.search(r'linkedin\.com/in/[^\s"]+', ai_response)
                if linkedin_match:
                    enhanced['linkedin'] = f"https://{linkedin_match.group()}"
        
        except Exception as e:
            print(f"Error finding profiles for {researcher['name']}: {e}")
        
        enhanced_researchers.append(enhanced)
    
    return enhanced_researchers

@app.route('/analyze_researchers', methods=['POST'])
def analyze_researchers():
    """API endpoint to analyze researchers from PDF first page"""
    pdf_url = request.form.get('pdf_url', '').strip()
    
    if not pdf_url:
        return jsonify({'error': 'No PDF URL provided'})
    
    # Validate URL
    if not pdf_url.startswith('http') or not pdf_url.endswith('.pdf'):
        return jsonify({'error': 'Invalid PDF URL'})
    
    # Extract first page text
    text, error = extract_pdf_first_page(pdf_url)
    if error:
        return jsonify({'error': error})
    
    if not text:
        return jsonify({'error': 'Could not extract text from PDF'})
    
    # Extract paper title
    metadata = parse_paper_metadata(text)
    paper_title = metadata.get('title', '')
    
    # Extract researcher contacts
    researchers = extract_researcher_contacts(text)
    
    # Enhance with LinkedIn and other profiles using AI
    if client and researchers:
        paper_context = f"{paper_title}\n{text[:500]}"  # Title + first 500 chars
        researchers = find_linkedin_profiles(researchers, paper_context)
    
    result = {
        'url': pdf_url,
        'paper_title': paper_title,
        'researchers': researchers
    }
    
    return jsonify(result)

def extract_pdf_first_page(pdf_url):
    """Extract text from the first page of a PDF"""
    if not PDF_AVAILABLE:
        return None, "PDF processing not available. Install pdfplumber: pip install pdfplumber"
    
    try:
        # Download PDF to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            with urllib.request.urlopen(pdf_url) as response:
                tmp_file.write(response.read())
            tmp_filename = tmp_file.name
        
        # Extract text from first page using pdfplumber
        with pdfplumber.open(tmp_filename) as pdf:
            if len(pdf.pages) > 0:
                first_page = pdf.pages[0]
                text = first_page.extract_text()
                
                # Clean up temporary file
                os.unlink(tmp_filename)
                
                return text, None
            else:
                os.unlink(tmp_filename)
                return None, "PDF appears to be empty"
                
    except Exception as e:
        return None, f"Error processing PDF: {str(e)}"

def parse_paper_metadata(text):
    """Extract basic metadata from the first page text"""
    metadata = {}
    
    # Extract title (usually the first line or after some header info)
    lines = text.split('\n')
    lines = [line.strip() for line in lines if line.strip()]
    
    # Find title - usually one of the first few substantial lines
    for i, line in enumerate(lines[:10]):
        if len(line) > 20 and not line.startswith(('arXiv:', 'Submitted', 'Received', 'Accepted')):
            # Skip if it looks like author info (has email or institution patterns)
            if '@' not in line and 'University' not in line and 'Institute' not in line:
                metadata['title'] = line
                break
    
    return metadata

def generate_search_query(requirements):
    """Use OpenAI to convert researcher requirements into ArXiv search terms"""
    if client is not None:
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert at converting research requirements into ArXiv search queries. 
                        ArXiv supports these search fields: ti (title), au (author), abs (abstract), cat (category), all (all fields).
                        Generate a focused search query using relevant keywords and fields.
                        Examples:
                        - "machine learning healthcare" -> "ti:machine learning AND abs:healthcare"
                        - "computer vision autonomous driving" -> "(ti:computer vision OR abs:computer vision) AND (abs:autonomous driving OR abs:self-driving)"
                        
                        Respond with ONLY the search query, no explanations."""
                    },
                    {
                        "role": "user",
                        "content": f"Convert this research requirement into an ArXiv search query: {requirements}"
                    }
                ],
                max_tokens=100,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"OpenAI API error: {e}")
            return generate_fallback_query(requirements)
    else:
        return generate_fallback_query(requirements)

def generate_fallback_query(requirements):
    """Generate a basic search query when OpenAI is not available"""
    # Simple keyword extraction and formatting
    requirements = requirements.lower()
    
    # Common research area mappings
    if 'machine learning' in requirements or 'ml' in requirements:
        base_query = 'cat:cs.LG OR cat:stat.ML'
    elif 'computer vision' in requirements or 'cv' in requirements:
        base_query = 'cat:cs.CV'
    elif 'natural language processing' in requirements or 'nlp' in requirements:
        base_query = 'cat:cs.CL'
    elif 'robotics' in requirements:
        base_query = 'cat:cs.RO'
    elif 'quantum' in requirements:
        base_query = 'cat:quant-ph'
    elif 'physics' in requirements:
        base_query = 'cat:physics'
    elif 'mathematics' in requirements or 'math' in requirements:
        base_query = 'cat:math'
    else:
        # Use all fields search as fallback
        return f"all:{requirements}"
    
    # Add additional keywords to the search
    keywords = []
    if 'healthcare' in requirements or 'medical' in requirements:
        keywords.append('abs:healthcare OR abs:medical')
    if 'autonomous' in requirements or 'self-driving' in requirements:
        keywords.append('abs:autonomous OR abs:self-driving')
    if 'deep learning' in requirements:
        keywords.append('abs:"deep learning"')
    if 'reinforcement learning' in requirements:
        keywords.append('abs:"reinforcement learning"')
    
    if keywords:
        return f"({base_query}) AND ({' OR '.join(keywords)})"
    else:
        return base_query

@app.route('/', methods=['GET', 'POST'])
def index():
    results = None
    search_query = None
    requirements = None
    days_back = None
    max_results = None
    
    if request.method == 'POST':
        requirements = request.form.get('requirements', '').strip()
        days_back = int(request.form.get('days_back', 30))
        max_results = int(request.form.get('max_results', 10))
        
        if requirements:
            # Generate search query using OpenAI
            search_query = generate_search_query(requirements)
            
            # Calculate date range for recent papers
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days_back)
            
            # Format dates for ArXiv API
            date_filter = f"submittedDate:[{start_date.strftime('%Y%m%d')}* TO {end_date.strftime('%Y%m%d')}*]"
            
            # Combine search query with date filter
            full_query = f"({search_query}) AND {date_filter}"
            encoded_query = urllib.parse.quote(full_query)
            
            url = f'http://export.arxiv.org/api/query?search_query={encoded_query}&start=0&max_results={max_results}&sortBy=submittedDate&sortOrder=descending'
            
            try:
                with urllib.request.urlopen(url) as resp:
                    data = resp.read()
                
                root = ET.fromstring(data)
                ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
                entries = root.findall('atom:entry', ns)
                
                results = []
                for entry in entries:
                    # Extract paper information
                    title = entry.findtext('atom:title', '', ns).strip().replace('\n', ' ')
                    abstract = entry.findtext('atom:summary', '', ns).strip().replace('\n', ' ')
                    published = entry.findtext('atom:published', '', ns)[:10]  # Just the date part
                    link = entry.findtext('atom:id', '', ns)
                    arxiv_id = link.split('/')[-1] if link else 'N/A'
                    
                    # Extract all authors
                    authors = []
                    for author_elem in entry.findall('atom:author', ns):
                        name = author_elem.findtext('atom:name', '', ns)
                        if name:
                            authors.append(name)
                    
                    results.append({
                        'title': title,
                        'authors': authors,
                        'abstract': abstract,
                        'published': published,
                        'arxiv_id': arxiv_id,
                        'link': link
                    })
                    
            except Exception as e:
                results = []
                search_query = f"Error: {str(e)}"
    
    return render_template_string(template, 
                                results=results, 
                                search_query=search_query,
                                requirements=requirements,
                                days_back=days_back,
                                max_results=max_results,
                                ai_enabled=client is not None)

if __name__ == '__main__':
    app.run(debug=True)
