const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-highlight.html'));
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-highlight.html'));
});

app.get('/extension', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Personal Summarizer Extension</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          line-height: 1.6;
        }
        h1 { color: #2c3e50; }
        .section { 
          background: #f8f9fa; 
          padding: 20px; 
          margin: 20px 0; 
          border-radius: 8px;
          border-left: 4px solid #3498db;
        }
        code {
          background: #e9ecef;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .step {
          background: #fff;
          padding: 15px;
          margin: 10px 0;
          border-radius: 5px;
          border: 1px solid #dee2e6;
        }
        .btn {
          display: inline-block;
          padding: 10px 20px;
          background: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 10px 5px;
        }
        .btn:hover {
          background: #2980b9;
        }
      </style>
    </head>
    <body>
      <h1>🖍️ Personal Summarizer Extension</h1>
      
      <div class="section">
        <h2>Features</h2>
        <ul>
          <li>✨ AI-powered text summarization using Chrome's built-in Summarizer API</li>
          <li>🖍️ Text highlighting with persistent storage</li>
          <li>💬 Add comments to highlighted text</li>
          <li>🎨 Multiple highlight colors (Yellow, Blue, Green, Pink)</li>
          <li>📊 Automatic diagram generation from text</li>
          <li>⚙️ Customizable summarization based on occupation</li>
        </ul>
      </div>

      <div class="section">
        <h2>Installation Instructions</h2>
        
        <div class="step">
          <h3>Step 1: Open Chrome Extensions</h3>
          <p>Navigate to <code>chrome://extensions/</code> in your Chrome browser</p>
        </div>

        <div class="step">
          <h3>Step 2: Enable Developer Mode</h3>
          <p>Toggle the "Developer mode" switch in the top right corner</p>
        </div>

        <div class="step">
          <h3>Step 3: Load Extension</h3>
          <p>Click "Load unpacked" and select the extension folder containing these files:</p>
          <ul>
            <li>manifest.json</li>
            <li>background.js</li>
            <li>content.js</li>
            <li>highlighter.js</li>
            <li>overlay.html, overlay.js</li>
            <li>views/ folder</li>
            <li>vendor/ folder</li>
          </ul>
        </div>

        <div class="step">
          <h3>Step 4: Test the Extension</h3>
          <p>Go to the <a href="/test" class="btn">Test Page</a> to try out the highlighting features!</p>
        </div>
      </div>

      <div class="section">
        <h2>How to Use</h2>
        
        <h3>Text Highlighting:</h3>
        <ol>
          <li>Select any text on a webpage</li>
          <li>Right-click and choose "Highlight Text"</li>
          <li>Choose your preferred color</li>
          <li>Click on highlighted text to add/edit comments</li>
        </ol>

        <h3>Text Summarization:</h3>
        <ol>
          <li>Click the extension icon or press <code>Alt+S</code></li>
          <li>Click "Summarize Page" or "Summarize Selection"</li>
          <li>Wait for the AI to generate a summary</li>
          <li>View your highlights by clicking "View My Highlights"</li>
        </ol>
      </div>

      <div class="section">
        <h2>Quick Links</h2>
        <a href="/test" class="btn">Test Page</a>
        <a href="/test-highlight.html" class="btn">Download Test Page</a>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📝 Test page: http://localhost:${PORT}/test`);
  console.log(`📦 Extension info: http://localhost:${PORT}/extension`);
});
