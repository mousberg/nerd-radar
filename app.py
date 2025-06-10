import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

from flask import Flask, request, render_template_string

app = Flask(__name__)

template = """
<!doctype html>
<title>ArXiv Researcher Contact Search</title>
<h1>Search for Researcher Contact</h1>
<form method="post">
  Researcher name: <input type="text" name="author">
  <input type="submit" value="Search">
</form>
{% if results is not none %}
  <h2>Results</h2>
  <ul>
  {% for r in results %}
    <li>{{ r['name'] }} - {{ r.get('email', 'N/A') }}</li>
  {% endfor %}
  </ul>
{% endif %}
"""

@app.route('/', methods=['GET', 'POST'])
def index():
    results = None
    if request.method == 'POST':
        author = request.form.get('author', '')
        query = urllib.parse.quote(f'au:{author}')
        url = f'http://export.arxiv.org/api/query?search_query={query}&start=0&max_results=5'
        try:
            with urllib.request.urlopen(url) as resp:
                data = resp.read()
            root = ET.fromstring(data)
            ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
            entries = root.findall('atom:entry', ns)
            results = []
            for e in entries:
                author_el = e.find('atom:author', ns)
                if author_el is not None:
                    name = author_el.findtext('atom:name', '', ns)
                    email = author_el.findtext('arxiv:email', None, ns)
                    results.append({'name': name, 'email': email})
        except Exception as e:
            results = [{'name': 'Error', 'email': str(e)}]
    return render_template_string(template, results=results)

if __name__ == '__main__':
    app.run(debug=True)
