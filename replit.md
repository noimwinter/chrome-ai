# Personal Summarizer - Chrome Extension

## Overview

Personal Summarizer is a Chrome browser extension that provides AI-powered text summarization and persistent text highlighting capabilities. The extension leverages Chrome's built-in Summarizer API and LanguageModel API to generate customized summaries and automatic Mermaid diagrams from web page content. Users can highlight text with multiple colors, add comments to highlights, and manage their annotations across page refreshes using XPath-based positioning for accurate text location tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Extension Structure

**Content Script Architecture**: The extension uses a manifest v3 architecture with separated concerns across content scripts, background service workers, and injected overlay interfaces. Content scripts (`content.js`, `highlighter.js`) run in the context of web pages to handle text extraction and highlighting, while the background service worker (`background.js`) manages context menus and inter-component messaging.

**Overlay System**: User interface is delivered through an iframe-based overlay (`overlay.html`) that loads dynamically into web pages. This overlay uses a view-based routing system where different UI screens (main, settings, highlights) are loaded as separate HTML files into a shared container. This approach isolates the extension UI from page styles while maintaining a responsive single-page application feel.

**Rationale**: Manifest v3 requires service workers instead of background pages, necessitating the separation of persistent storage logic and message handling. The iframe overlay prevents CSS conflicts with host pages while providing a consistent UI experience.

### Text Highlighting System

**XPath-based Positioning**: Text highlights are stored using XPath expressions that uniquely identify text nodes within the DOM tree. Each highlight includes the XPath to both start and end nodes, along with character offsets within those text nodes. This allows precise recreation of highlights even after page DOM changes.

**Storage Strategy**: Highlights are stored in Chrome's local storage, keyed by full URL (including search parameters and hash). Each highlight object contains the XPath range, selected text content, color, optional comment, and creation timestamp.

**Persistence**: When a page loads, the highlighter scans stored highlights for the current URL and reconstructs the visual highlights by resolving XPath expressions back to DOM ranges and wrapping them in styled span elements.

**Pros**: XPath provides stable references that survive most dynamic DOM updates. Character offsets ensure exact text boundaries are preserved.

**Cons**: XPath can break if page structure changes significantly between visits. Performance may degrade with hundreds of highlights on a single page.

### AI Summarization

**Chrome Built-in APIs**: Uses the experimental Chrome Summarizer API (available in Chrome's AI Early Preview Program) for text summarization. The API is accessed through `window.ai.summarizer.create()` with configurable parameters for summary length and type.

**Customization Layer**: Summaries are customized based on user-defined occupation and custom prompts stored in Chrome local storage. The summarization request includes these preferences to tailor output to user context (e.g., student, developer, researcher).

**Text Extraction**: Content is extracted from the active tab by messaging the content script to gather either full page text or selected text. Paragraphs are identified and joined before being sent to the summarization API.

**Alternative Considered**: Using external APIs (OpenAI, etc.) was considered but rejected to maintain privacy and avoid API costs. Built-in Chrome APIs keep data local.

### Diagram Generation

**Mermaid Integration**: Uses the LanguageModel API to generate Mermaid diagram syntax from summarized text. A detailed system prompt (`prompts/language-model-system.md`) guides the model to select appropriate chart types (flowchart, pie, sequence, etc.) based on content structure.

**Rendering Pipeline**: Generated Mermaid code is rendered using the Mermaid.js library (bundled in `vendor/mermaid.min.js`). Diagrams are displayed inline within the overlay interface.

**Fallback Strategy**: If Mermaid plot syntax is unavailable, the system can fall back to minimal Vega-Lite specifications for certain chart types.

**Rationale**: Mermaid provides a text-based, declarative way to generate diagrams without external dependencies, keeping the extension self-contained.

### Context Menu Integration

**Multi-level Menus**: Chrome's context menu API is used to provide right-click access to summarization and highlighting features. The "Highlight Text" menu includes color sub-options (Yellow, Blue, Green, Pink) for quick highlight creation.

**Message Passing**: Context menu selections trigger background script messages to content scripts, which execute the requested action (create highlight, open overlay, etc.).

### View Management System

**Dynamic View Loading**: The overlay uses a custom view loader that fetches HTML files from the extension's resources and injects them into a shared container. Each view can include its own CSS and JavaScript modules.

**Event-driven Navigation**: Views dispatch custom events (`view:loaded`) to signal when they're ready, allowing view-specific initialization logic to run at the appropriate time.

**Pros**: Separates concerns, making each feature (main, settings, highlights list) independently maintainable. Reduces initial bundle size by loading views on demand.

**Cons**: Adds complexity compared to a single-page approach. Requires careful event handling to avoid memory leaks.

## External Dependencies

### Chrome APIs
- **chrome.storage.local**: Persistent storage for user settings (occupation, custom prompts, summary preferences) and highlight data
- **chrome.contextMenus**: Right-click menu integration for quick access to summarization and highlighting
- **chrome.tabs**: Message passing between extension components and active tab content
- **chrome.scripting**: Dynamic content script injection (if needed)
- **window.ai.summarizer**: Chrome's experimental AI Summarizer API for text summarization
- **window.ai.languageModel**: Chrome's experimental LanguageModel API for diagram generation

### Third-party Libraries
- **Mermaid.js** (`vendor/mermaid.min.js`): Diagram rendering library for visualizing generated charts and flowcharts
- **Marked.js** (`vendor/marked.min.js`): Markdown parsing library for rendering formatted text

### Development Server
- **Express.js**: Simple static file server for local testing and development (not part of extension runtime)

### Browser Requirements
- Chrome browser with AI features enabled (requires participation in Chrome's AI Early Preview Program for Summarizer and LanguageModel APIs)
- Manifest V3 support (Chrome 88+)