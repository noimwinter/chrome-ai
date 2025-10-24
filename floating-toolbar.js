class FloatingToolbar {
  constructor(options = {}) {
    this.onHighlight = options.onHighlight || (() => {});
    this.onComment = options.onComment || (() => {});
    this.onSummarize = options.onSummarize || (() => {});
    
    this.toolbar = null;
    this.currentSelection = null;
    this.isVisible = false;
    
    this.init();
  }

  init() {
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('selectionchange', () => this.handleSelectionChange());
  }

  handleMouseUp(e) {
    if (this.toolbar && this.toolbar.contains(e.target)) {
      return;
    }

    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection.toString().trim();

      if (text.length > 0) {
        this.currentSelection = selection;
        this.showToolbar(selection);
      } else {
        this.hideToolbar();
      }
    }, 10);
  }

  handleMouseDown(e) {
    if (this.toolbar && !this.toolbar.contains(e.target)) {
      this.hideToolbar();
    }
  }

  handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) {
      if (this.isVisible) {
        setTimeout(() => {
          if (!window.getSelection()?.toString().trim()) {
            this.hideToolbar();
          }
        }, 100);
      }
    }
  }

  showToolbar(selection) {
    if (!this.toolbar) {
      this.createToolbar();
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const toolbarWidth = 400;
    const toolbarHeight = 50;
    const spacing = 8;

    let top = rect.top + window.scrollY - toolbarHeight - spacing;
    let left = rect.left + window.scrollX + (rect.width / 2) - (toolbarWidth / 2);

    if (top < window.scrollY) {
      top = rect.bottom + window.scrollY + spacing;
    }

    if (left < 0) {
      left = 10;
    }
    if (left + toolbarWidth > window.innerWidth) {
      left = window.innerWidth - toolbarWidth - 10;
    }

    this.toolbar.style.top = `${top}px`;
    this.toolbar.style.left = `${left}px`;
    this.toolbar.style.display = 'flex';
    this.isVisible = true;
  }

  createToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'floating-toolbar';
    this.toolbar.innerHTML = `
      <button class="toolbar-btn" data-action="highlight-yellow">
        <span class="btn-icon">🟨</span>
        <span class="btn-text">Highlight</span>
      </button>
      <button class="toolbar-btn" data-action="highlight-blue">
        <span class="btn-icon">🟦</span>
        <span class="btn-text">Highlight</span>
      </button>
      <button class="toolbar-btn" data-action="summarize">
        <span class="btn-icon">🧠</span>
        <span class="btn-text">Summary & Visualization</span>
      </button>
      <button class="toolbar-btn" data-action="comment">
        <span class="btn-icon">📜</span>
        <span class="btn-text">Comment</span>
      </button>
    `;

    this.toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (btn) {
        const action = btn.dataset.action;
        this.handleAction(action);
      }
    });

    document.body.appendChild(this.toolbar);
  }

  handleAction(action) {
    if (!this.currentSelection) return;
    
    switch (action) {
      case 'highlight-yellow':
        this.onHighlight('yellow');
        break;
      case 'highlight-blue':
        this.onHighlight('lightblue');
        break;
      case 'summarize':
        this.onSummarize(this.currentSelection);
        break;
      case 'comment':
        this.onComment();
        break;
    }

    this.hideToolbar();
    this.currentSelection.removeAllRanges();
  }

  hideToolbar() {
    if (this.toolbar) {
      this.toolbar.style.display = 'none';
      this.isVisible = false;
    }
    this.currentSelection = null;
  }

  destroy() {
    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }
  }
}
