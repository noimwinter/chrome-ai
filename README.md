# Get Locked In With Me (GLWM)

**Turn long reads into quick, personal insights — summarize, visualize, and learn smarter.** 


GLWM is a Chrome extension that enhances your web reading and learning experience with AI-powered text summarization and persistent highlighting. 


## 🧠 Inspiration
Sometimes, we're faced with long and complex text for studying, research, or work, and it’s easy to lose focus or miss the key ideas. We wondered, what if reading online could feel lighter, clearer, and more interactive? And why copy and paste materials to your online notebook app when you can do the same thing on the website? Those thought inspired us to build a tool that adapts to different learning styles, whether you’re a visual learner, a student, or someone who prefers quick key-point summaries. 

## 🎯 Why GLWM?

Unlike typical summarization tools, GLWM builds **your personal digital learning notebook**:

- **Permanent Persistence**: Your highlights and comments stay intact even after page refreshes. Your thoughts and notes are always there when you return.
- **Personalized AI Summaries**: Tailored summaries based on your occupation and learning goals. Content is restructured for students, developers, researchers, and more.
- **Complete Privacy**: 100% offline operation using Chrome's built-in AI. Your data never leaves your computer.
- **Visual Learning**: Automatically converts complex text into diagrams for better understanding.

We don't just summarize text—we enhance your entire web learning experience.

## 🌟 Key Features

### ✨ AI-Powered Customized Summaries
- **100% Offline AI Summarization** using Chrome's built-in Summarizer API
- Occupation-based customization (Student, Developer, Researcher, Marketer, etc.)
- Summary length options: Short, Medium, Long
- Summary type options: Key Points, TL;DR
- Summarize entire pages or selected text only

### 🖍️ Persistent Text Highlighting
- **XPath-based precise positioning** - Highlights persist after page refresh
- 5 color choices (Yellow, Blue)
- Add and edit comments on each highlight
- Automatic URL-based management - Independent storage per webpage
- Quick highlighting via floating toolbar on text selection

### 💬 Smart Comment System
- Add notes freely to highlighted text
- Edit and delete comments
- Highlights with comments show 💬 icon
- Instant comment access by clicking highlights

### 📊 Automatic Diagram Generation
- Auto-generate Mermaid diagrams using LanguageModel API
- Visualize content as flowcharts, sequence diagrams, pie charts, and more
- Understand complex concepts at a glance

### 📝 Unified Highlight Management
- View all highlights on current page at once
- Click highlights to scroll to their location
- Individual or bulk delete options

## ⚡ Prerequisites

Before installing GLWM, please verify these requirements:

### Chrome Version
- **Chrome Dev or Canary channel** required
- Version **128.0 or higher** required
- [Download Chrome Dev](https://www.google.com/chrome/dev/)
- [Download Chrome Canary](https://www.google.com/chrome/canary/)

### Chrome AI API Activation
- Summarizer API and LanguageModel API activation required
- May not be available in some regions or devices
- See installation section below for detailed activation steps

### System Requirements
- Stable Chrome browser environment
- Local storage available (for saving highlights)

## 🚀 Installation

### Step 1: Enable Chrome AI APIs

1. Launch Chrome Dev or Canary
2. Navigate to `chrome://flags/#optimization-guide-on-device-model`
3. Select **"Enabled BypassPerfRequirement"**
   - This bypasses performance checks to enable AI model download
4. Navigate to `chrome://flags/#prompt-api-for-gemini-nano`
5. Select **"Enabled"**
6. Navigate to `chrome://flags/#summarization-api-for-gemini-nano`
7. Select **"Enabled"**
8. **Restart** Chrome

### Step 2: Install GLWM Extension

1. Clone or download this repository:
   ```bash
   git clone https://github.com/noimwinter/GLWM-GetLockedinWithMe
   ```
2. Open `chrome://extensions/` in Chrome Dev/Canary
3. Enable **"Developer mode"** toggle in the top right
4. Click **"Load unpacked"** button
5. Select the downloaded GLWM folder
6. The extension appears in your Chrome toolbar

### Step 3: Verify Installation

1. Click the extension icon or press `Alt+S` shortcut
2. If the overlay displays properly, installation is complete!

## 💡 How to Use

### Highlighting Text

**Method 1: Right-click Menu**
1. Select desired text on any webpage by dragging
2. Right-click and select **"Highlight Text"** menu
3. Choose your color (Yellow 🟨, Blue 🟦)

**Method 2: Floating Toolbar (Recommended)**
1. Select text and the floating toolbar appears automatically
2. Click highlight button and choose color from toolbar
3. Highlight applies instantly

**Adding Comments**
1. Click on any highlighted text
2. Type your note in the comment box that appears
3. Save to display 💬 icon on that highlight

### Summarizing Text

1. Click extension icon or press `Alt+S` shortcut
2. Select occupation in settings (Student, Developer, Researcher, etc.)
3. Click **"Summarize Page"** button to summarize entire page
4. Or select text first then click **"Summarize Selection"**
5. View AI-generated summary and automatic diagrams

### Managing Highlights

1. Click **"📝 View My Highlights"** in extension overlay
2. View list of all highlights on current page
3. Click any highlight to scroll to its location
4. Add/edit comments or delete individual highlights
5. Use **"Clear All"** button to remove all highlights from current page

## 🔧 How It Works

GLWM combines Chrome's built-in AI with a sophisticated text positioning system:

1. **Text Selection Detection**: Floating toolbar appears when user selects text
2. **XPath-based Position Storage**: Calculates exact DOM path as XPath with character-level offsets
3. **Local Storage Saving**: Stores highlight info (position, color, comment, text) per URL in Chrome's local storage
4. **Restoration on Page Load**: Converts saved XPath back to DOM ranges and recreates highlights when page loads
5. **AI Processing**: When summarization is requested, Chrome's built-in Gemini Nano AI analyzes and summarizes text 100% offline

### Technical Features

- **XPath Precision**: Stores exact DOM path of text nodes, ensuring accurate position restoration when page structure remains unchanged
- **Character-level Offset**: Stores exact character position within text nodes
- **URL-based Isolation**: Manages highlights independently for each webpage

## ⚙️ Features in Detail

### Highlight System

**Data Storage Structure**
```javascript
{
  "highlights:https://example.com/page": [
    {
      "id": "highlight-1234567890-abc123",
      "startPath": "/html/body/p[1]/text()[1]",
      "startOffset": 15,
      "endPath": "/html/body/p[1]/text()[1]",
      "endOffset": 45,
      "color": "yellow",
      "text": "highlighted text",
      "comment": "my comment",
      "timestamp": 1698765432000
    }
  ]
}
```

**Supported Colors**
- Yellow: General highlights
- Blue: Important information

### AI Summary Options

**Occupation-based Customization**
- Student: Learning-optimized summaries
- Developer: Technical content emphasis
- Researcher: Academic perspective focus
- Marketer: Core message focus
- General: Balanced summaries

**Summary Length**
- Short: Key points only
- Medium: Appropriate detail
- Long: Detailed summary

**Summary Type**
- Key Points: Core points as bullet list
- TL;DR: Entire content in one paragraph

### Diagram Generation

Automatically analyzes content to select the most appropriate diagram type:
- **Flowchart**: Process or procedure descriptions
- **Sequence Diagram**: Time-sequential content
- **Pie Chart**: Ratio or distribution information
- **Mind Map**: Concept relationships
- **Gantt Chart**: Schedules or plans

## 🔒 Privacy & Security

GLWM prioritizes your privacy:

- ✅ **100% Offline AI Processing** - Uses Chrome's built-in Gemini Nano
- ✅ **No External Server Transmission** - All data processed locally only
- ✅ **No Data Collection** - We don't collect any user data
- ✅ **Complete Local Storage** - Highlights and settings stored only in Chrome local storage
- ✅ **No Tracking** - No analytics tools or trackers used

Your learning content, highlights, and comments exist only on your computer.

## 🛠️ Tech Stack

### Core Technologies
- **Chrome Extension API** (Manifest V3)
- **Chrome Summarizer API** - Offline AI summarization
- **Chrome LanguageModel API** - Diagram generation
- **XPath** - Precise text position tracking and storage

### Libraries
- **Mermaid.js** - Diagram rendering
- **Marked.js** - Markdown parsing

### Architecture
- **Manifest V3** - Latest Chrome extension standard
- **Service Worker** - Background task processing
- **Content Scripts** - Web page interactions
- **Iframe-based Overlay** - CSS conflict-free UI

## ⚠️ Troubleshooting

### AI Summarization Not Working

1. Verify Chrome version is 128.0 or higher
2. Check `chrome://flags` settings are configured correctly:
   - `#optimization-guide-on-device-model`: Enabled BypassPerfRequirement
   - `#prompt-api-for-gemini-nano`: Enabled
   - `#summarization-api-for-gemini-nano`: Enabled
3. Completely restart Chrome
4. AI APIs may not be supported in some regions or devices
5. Check Chrome Developer Console (F12) for error messages

### Highlights Disappearing

1. Page DOM structure may have changed significantly (dynamic websites)
2. Content re-rendered by JavaScript
3. Chrome local storage may be full (check in settings)
4. Page URL changed (including query parameters)

### Highlight Position Misalignment

1. Page dynamically changes content
2. Ads or popups being added/removed
3. Solution: Best used on static content (blogs, documents, etc.)

### Extension Not Loading

1. Verify Developer mode is enabled
2. Confirm correct folder selected (folder containing manifest.json)
3. Restart Chrome
4. Click "Reload" button on extension page

## 📝 License

MIT License

## 👥 Contributors

| Name | Affiliation | Mail | GitHub |
|------|--------------|------|---------|
| Hyojun Park | Software Developer | developer.bombi@gmail.com | [bom-b](https://github.com/bom-b) |
| Dohyun Kim | Software Developer, University of Waterloo | d67kim@uwaterloo.ca | [noimwinter](https://github.com/noimwinter) |
| Theo Lim | Lecturer, Software Developer | lsmman07@gmail.com | [lsmman](https://github.com/lsmman) |
---

**Get Locked In With Me** and start your more efficient web learning experience! 🚀

Questions or feedback? Feel free to open an issue anytime.
