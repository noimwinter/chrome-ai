// Highlighter.js - XPath-based text highlighting with persistent storage

class TextHighlighter {
  constructor() {
    this.highlights = new Map();
    this.currentUrl = window.location.href;
    this.storageKey = this.getStorageKey(this.currentUrl);
    this.colors = ['yellow', 'lightblue', 'lightgreen', 'pink', 'orange'];
    this.defaultColor = 'yellow';
    this.commentBoxHandler = null;
  }

  setCommentBoxHandler(handler) {
    this.commentBoxHandler = handler;
  }

  // Generate storage key from URL (include search and hash for uniqueness)
  getStorageKey(url) {
    try {
      const urlObj = new URL(url);
      return `highlights:${urlObj.origin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    } catch (e) {
      return `highlights:${url}`;
    }
  }

  // Generate XPath for a node
  getNodeXPath(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return this.getTextNodeXPath(node);
    }
    
    const paths = [];
    for (; node && node.nodeType === Node.ELEMENT_NODE; node = node.parentNode) {
      let index = 1;
      for (let sibling = node.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === node.nodeName) {
          index++;
        }
      }
      const tagName = node.nodeName.toLowerCase();
      paths.unshift(`${tagName}[${index}]`);
    }
    return paths.length ? `/${paths.join('/')}` : null;
  }

  // Generate XPath for text node
  getTextNodeXPath(textNode) {
    const parent = textNode.parentNode;
    const parentPath = this.getNodeXPath(parent);
    
    if (!parentPath) return null;

    let index = 1;
    for (let sibling = parent.firstChild; sibling; sibling = sibling.nextSibling) {
      if (sibling.nodeType === Node.TEXT_NODE) {
        if (sibling === textNode) break;
        index++;
      }
    }
    
    return `${parentPath}/text()[${index}]`;
  }

  // Get node from XPath
  getNodeFromXPath(xpath) {
    if (!xpath) return null;
    
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue;
    } catch (e) {
      console.error('XPath evaluation error:', e);
      return null;
    }
  }

  // Create highlight from current selection
  async createHighlightFromSelection(color = null) {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      return null;
    }

    const range = selection.getRangeAt(0);
    const highlightData = {
      id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startPath: this.getNodeXPath(range.startContainer),
      startOffset: range.startOffset,
      endPath: this.getNodeXPath(range.endContainer),
      endOffset: range.endOffset,
      color: color || this.defaultColor,
      text: selection.toString().trim(),
      comment: '',
      timestamp: Date.now()
    };

    if (!highlightData.startPath || !highlightData.endPath) {
      console.warn('Could not generate XPath for selection');
      return null;
    }

    const element = this.applyHighlight(highlightData);
    if (element) {
      this.highlights.set(highlightData.id, { ...highlightData, element });
      await this.saveAllHighlights();
    }
    selection.removeAllRanges();

    return highlightData;
  }

  // Apply highlight to DOM
  applyHighlight(data) {
    try {
      const startNode = this.getNodeFromXPath(data.startPath);
      const endNode = this.getNodeFromXPath(data.endPath);

      if (!startNode || !endNode) {
        console.warn('Could not find nodes for highlight:', data.id);
        return null;
      }

      const range = document.createRange();
      range.setStart(startNode, data.startOffset);
      range.setEnd(endNode, data.endOffset);

      const span = document.createElement('span');
      span.className = 'text-highlight';
      span.style.backgroundColor = data.color;
      span.dataset.highlightId = data.id;
      span.title = data.comment || 'Click to add comment';

      try {
        range.surroundContents(span);
      } catch (e) {
        // If surroundContents fails (range spans multiple elements), use alternative
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);
      }

      // Add comment indicator if comment exists
      const hasComment = Array.isArray(data.comment) ? data.comment.length > 0 : !!data.comment;
      if (hasComment) {
        const commentIcon = document.createElement('span');
        commentIcon.className = 'comment-icon';
        commentIcon.textContent = '💬';
        const commentText = Array.isArray(data.comment) ? data.comment.join('\n') : data.comment;
        commentIcon.title = commentText;
        span.title = commentText;
        span.appendChild(commentIcon);
      }

      // Add click event for editing comment
      span.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showCommentDialog(data.id);
      });

      return span;
    } catch (error) {
      console.error('Error applying highlight:', error);
      return null;
    }
  }

  // Show comment dialog
  showCommentDialog(highlightId) {
    const data = this.highlights.get(highlightId);
    if (!data) return;

    if (this.commentBoxHandler && data.element) {
      const rect = data.element.getBoundingClientRect();
      const comments = Array.isArray(data.comment) ? data.comment : (data.comment ? [data.comment] : []);
      this.commentBoxHandler(rect, comments, highlightId);
    } else {
      const comment = prompt('Enter your comment:', data.comment || '');
      if (comment !== null) {
        this.updateComment(highlightId, comment);
      }
    }
  }

  // Update comment
  async updateComment(highlightId, comment) {
    const data = this.highlights.get(highlightId);
    if (!data) return;

    data.comment = comment;
    
    // Update icon
    const span = data.element;
    if (span) {
      let icon = span.querySelector('.comment-icon');
      const hasComment = Array.isArray(comment) ? comment.length > 0 : comment;
      const commentText = Array.isArray(comment) ? comment.join('\n') : comment;
      
      if (hasComment) {
        if (!icon) {
          icon = document.createElement('span');
          icon.className = 'comment-icon';
          span.appendChild(icon);
        }
        icon.textContent = '💬';
        icon.title = commentText;
        span.title = commentText;
      } else if (icon) {
        icon.remove();
        span.title = 'Click to add comment';
      }
    }

    await this.saveAllHighlights();
  }

  // Delete highlight
  async deleteHighlight(highlightId) {
    const data = this.highlights.get(highlightId);
    if (!data) return;

    // Remove from DOM
    if (data.element) {
      const parent = data.element.parentNode;
      if (parent) {
        while (data.element.firstChild) {
          parent.insertBefore(data.element.firstChild, data.element);
        }
        parent.removeChild(data.element);
        parent.normalize();
      }
    }

    this.highlights.delete(highlightId);
    await this.saveAllHighlights();
  }

  // Save all highlights to storage
  async saveAllHighlights() {
    const highlightsArray = Array.from(this.highlights.values()).map(h => ({
      id: h.id,
      startPath: h.startPath,
      startOffset: h.startOffset,
      endPath: h.endPath,
      endOffset: h.endOffset,
      color: h.color,
      text: h.text,
      comment: h.comment,
      timestamp: h.timestamp
    }));

    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: highlightsArray }, () => {
        console.log('Saved highlights:', highlightsArray.length);
        resolve();
      });
    });
  }

  // Load highlights from storage
  async loadHighlights() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        const highlightsArray = result[this.storageKey] || [];
        console.log('Loaded highlights:', highlightsArray.length);
        
        highlightsArray.forEach(data => {
          const element = this.applyHighlight(data);
          if (element) {
            this.highlights.set(data.id, { ...data, element });
          }
        });
        
        resolve(highlightsArray.length);
      });
    });
  }

  // Clear all highlights
  async clearAllHighlights() {
    // Remove from DOM
    this.highlights.forEach(data => {
      if (data.element) {
        const parent = data.element.parentNode;
        if (parent) {
          while (data.element.firstChild) {
            parent.insertBefore(data.element.firstChild, data.element);
          }
          parent.removeChild(data.element);
        }
      }
    });

    this.highlights.clear();
    
    return new Promise((resolve) => {
      chrome.storage.local.remove([this.storageKey], () => {
        console.log('Cleared all highlights');
        resolve();
      });
    });
  }

  // Get all highlights as array
  getAllHighlights() {
    return Array.from(this.highlights.values()).map(h => ({
      id: h.id,
      text: h.text,
      comment: h.comment,
      color: h.color,
      timestamp: h.timestamp
    }));
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.TextHighlighter = TextHighlighter;
}
