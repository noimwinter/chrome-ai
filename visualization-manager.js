// VisualizationManager.js - Persistent storage for Mermaid diagrams

class VisualizationManager {
  constructor() {
    this.visualizations = new Map();
    this.currentUrl = window.location.href;
    this.storageKey = this.getStorageKey(this.currentUrl);
  }

  // Generate storage key from URL
  getStorageKey(url) {
    try {
      const urlObj = new URL(url);
      return `visualizations:${urlObj.origin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    } catch (e) {
      return `visualizations:${url}`;
    }
  }

  // Generate XPath for a node
  getNodeXPath(node) {
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

  // Create and save visualization container
  async createVisualizationContainer(selection, insertAfter = true) {
    const range = selection.getRangeAt(0);
    
    // Generate unique ID
    const id = `viz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get anchor element XPath (element after which to insert)
    const anchorNode = insertAfter ? range.endContainer : range.startContainer;
    const anchorElement = anchorNode.nodeType === Node.ELEMENT_NODE 
      ? anchorNode 
      : anchorNode.parentElement;
    const anchorPath = this.getNodeXPath(anchorElement);
    
    // Create container
    const container = this.createContainerElement(id);
    
    // Insert container
    const insertRange = range.cloneRange();
    insertRange.collapse(!insertAfter);
    insertRange.insertNode(container);
    
    // Save visualization data
    const vizData = {
      id: id,
      anchorPath: anchorPath,
      insertAfter: insertAfter,
      selectedText: selection.toString().trim(),
      svgContent: null, // Will be set when diagram is rendered
      timestamp: Date.now()
    };
    
    this.visualizations.set(id, { ...vizData, element: container });
    await this.saveAllVisualizations();
    
    return container;
  }

  // Create container element
  createContainerElement(id) {
    const container = document.createElement("div");
    container.id = "visualization-container";
    container.dataset.vizId = id;

    const content = document.createElement("div");
    content.className = "visualization-content";

    const skeleton = document.createElement("div");
    skeleton.className = "visualization-skeleton";

    const loadingText = document.createElement("span");
    loadingText.className = "visualization-loading-text";
    loadingText.textContent = "Generating diagram...";

    const closeBtn = document.createElement("button");
    closeBtn.className = "visualization-close-btn";
    closeBtn.onclick = () => {
      this.deleteVisualization(id);
    };

    skeleton.appendChild(loadingText);
    content.appendChild(skeleton);
    container.appendChild(content);
    container.appendChild(closeBtn);

    return container;
  }

  // Update visualization with rendered SVG
  async updateVisualizationContent(containerId, svgContent) {
    const vizData = this.visualizations.get(containerId);
    if (!vizData) return;

    vizData.svgContent = svgContent;
    
    const container = vizData.element;
    if (container) {
      const skeleton = container.querySelector(".visualization-skeleton");
      if (skeleton) {
        skeleton.remove();
      }

      const closeBtn = container.querySelector(".visualization-close-btn");
      if (closeBtn) {
        closeBtn.style.display = "flex";
      }

      const contentDiv = container.querySelector(".visualization-content");
      
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = svgContent;
      const svgElement = tempDiv.querySelector("svg");
      
      if (svgElement) {
        contentDiv.appendChild(svgElement);
        
        // Add click event to show popup
        contentDiv.style.cursor = "pointer";
        contentDiv.addEventListener("click", () => {
          this.showDiagramPopup(svgContent);
        });
      }
    }

    await this.saveAllVisualizations();
  }

  // Delete visualization
  async deleteVisualization(vizId) {
    const vizData = this.visualizations.get(vizId);
    if (!vizData) return;

    // Remove from DOM
    if (vizData.element && vizData.element.parentNode) {
      vizData.element.parentNode.removeChild(vizData.element);
    }

    this.visualizations.delete(vizId);
    await this.saveAllVisualizations();
  }

  // Save all visualizations to storage
  async saveAllVisualizations() {
    const vizArray = Array.from(this.visualizations.values()).map(v => ({
      id: v.id,
      anchorPath: v.anchorPath,
      insertAfter: v.insertAfter,
      selectedText: v.selectedText,
      svgContent: v.svgContent,
      timestamp: v.timestamp
    }));

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [this.storageKey]: vizArray }, () => {
        if (chrome.runtime.lastError) {
          console.error('Visualization save error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log(`✅ Saved ${vizArray.length} visualizations for key: ${this.storageKey}`);
          resolve();
        }
      });
    });
  }

  // Load visualizations from storage
  async loadVisualizations() {
    return new Promise((resolve, reject) => {
      console.log(`🔍 Loading visualizations for key: ${this.storageKey}`);
      
      chrome.storage.local.get([this.storageKey], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Visualization load error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        const vizArray = result[this.storageKey] || [];
        console.log(`✅ Loaded ${vizArray.length} visualizations`);
        
        let successCount = 0;
        vizArray.forEach(data => {
          const element = this.restoreVisualization(data);
          if (element) {
            this.visualizations.set(data.id, { ...data, element });
            successCount++;
          } else {
            console.warn('Failed to restore visualization:', data.id);
          }
        });
        
        console.log(`Restored ${successCount} out of ${vizArray.length} visualizations`);
        resolve(successCount);
      });
    });
  }

  // Restore visualization from saved data
  restoreVisualization(data) {
    try {
      const anchorNode = this.getNodeFromXPath(data.anchorPath);
      if (!anchorNode) {
        console.warn('Could not find anchor node for visualization:', data.id);
        return null;
      }

      // Create container
      const container = this.createContainerElement(data.id);
      
      // Insert container
      if (data.insertAfter) {
        anchorNode.parentNode.insertBefore(container, anchorNode.nextSibling);
      } else {
        anchorNode.parentNode.insertBefore(container, anchorNode);
      }

      // If SVG content exists, render it
      if (data.svgContent) {
        const skeleton = container.querySelector(".visualization-skeleton");
        if (skeleton) {
          skeleton.remove();
        }

        const closeBtn = container.querySelector(".visualization-close-btn");
        if (closeBtn) {
          closeBtn.style.display = "flex";
        }

        const contentDiv = container.querySelector(".visualization-content");
        
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = data.svgContent;
        const svgElement = tempDiv.querySelector("svg");
        
        if (svgElement) {
          contentDiv.appendChild(svgElement);
          
          // Add click event to show popup
          contentDiv.style.cursor = "pointer";
          contentDiv.addEventListener("click", () => {
            this.showDiagramPopup(data.svgContent);
          });
        }
      }

      return container;
    } catch (error) {
      console.error('Error restoring visualization:', error, data);
      return null;
    }
  }

  // Show diagram in popup modal
  showDiagramPopup(svgContent) {
    const popup = document.createElement("div");
    popup.id = "diagram-popup-overlay";

    const popupContent = document.createElement("div");
    popupContent.className = "diagram-popup-content";

    const closeBtn = document.createElement("button");
    closeBtn.className = "diagram-popup-close";
    closeBtn.onclick = () => popup.remove();

    const svgWrapper = document.createElement("div");
    svgWrapper.className = "diagram-popup-svg-wrapper";
    svgWrapper.innerHTML = svgContent;

    popupContent.appendChild(closeBtn);
    popupContent.appendChild(svgWrapper);
    popup.appendChild(popupContent);

    // Close on overlay click
    popup.addEventListener("click", (e) => {
      if (e.target === popup) {
        popup.remove();
      }
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        popup.remove();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    document.body.appendChild(popup);
  }

  // Clear all visualizations
  async clearAllVisualizations() {
    // Remove from DOM
    this.visualizations.forEach(data => {
      if (data.element && data.element.parentNode) {
        data.element.parentNode.removeChild(data.element);
      }
    });

    this.visualizations.clear();
    
    return new Promise((resolve) => {
      chrome.storage.local.remove([this.storageKey], () => {
        console.log('Cleared all visualizations');
        resolve();
      });
    });
  }

  // Get all visualizations as array
  getAllVisualizations() {
    return Array.from(this.visualizations.values()).map(v => ({
      id: v.id,
      selectedText: v.selectedText,
      timestamp: v.timestamp
    }));
  }
}

// Export for use in content script
if (typeof window !== 'undefined') {
  window.VisualizationManager = VisualizationManager;
}
