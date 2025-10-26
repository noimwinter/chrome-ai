class CommentBox {
  constructor(options = {}) {
    this.onSave = options.onSave || (() => {});
    this.onClose = options.onClose || (() => {});
    
    this.box = null;
    this.comments = [];
  }

  show(position, existingComments = [], highlightId = null) {
    this.highlightId = highlightId;
    this.comments = Array.isArray(existingComments) ? existingComments : (existingComments ? [existingComments] : []);
    
    if (!this.box) {
      this.createBox();
    }

    this.renderComments();

    const boxWidth = 300;
    const boxHeight = 400;
    const spacing = 20;

    let top = position.top + window.scrollY;
    let left = position.right + window.scrollX + spacing;

    if (left + boxWidth > window.innerWidth + window.scrollX) {
      left = position.left + window.scrollX - boxWidth - spacing;
    }

    if (top + boxHeight > window.innerHeight + window.scrollY) {
      top = window.innerHeight + window.scrollY - boxHeight - spacing;
    }

    if (top < window.scrollY) {
      top = window.scrollY + spacing;
    }

    this.box.style.top = `${top}px`;
    this.box.style.left = `${left}px`;
    this.box.style.display = 'flex';
  }

  createBox() {
    this.box = document.createElement('div');
    this.box.id = 'extension-comment-box';
    this.box.innerHTML = `
      <div class="comment-box-header">
        <h3>💬 Comments</h3>
        <button class="comment-close-btn">✕</button>
      </div>
      <div class="comment-list"></div>
      <div class="comment-input-area">
        <textarea class="comment-input" placeholder="Add a comment..."></textarea>
        <div class="comment-actions">
          <button class="comment-cancel-btn">Cancel</button>
          <button class="comment-save-btn">Save</button>
        </div>
      </div>
    `;

    this.box.querySelector('.comment-close-btn').addEventListener('click', () => this.hide());
    this.box.querySelector('.comment-cancel-btn').addEventListener('click', () => this.hide());
    this.box.querySelector('.comment-save-btn').addEventListener('click', () => this.saveComment());

    document.body.appendChild(this.box);
  }

  renderComments() {
    const listEl = this.box.querySelector('.comment-list');
    listEl.innerHTML = '';

    if (this.comments.length === 0) {
      listEl.innerHTML = '<div class="comment-empty">No comments yet</div>';
      return;
    }

    this.comments.forEach((comment, index) => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment-item';
      commentEl.innerHTML = `
        <div class="comment-content">${this.escapeHtml(comment)}</div>
        <button class="comment-delete-btn" data-index="${index}">Delete</button>
      `;
      
      commentEl.querySelector('.comment-delete-btn').addEventListener('click', () => {
        this.deleteComment(index);
      });

      listEl.appendChild(commentEl);
    });
  }

  saveComment() {
    const input = this.box.querySelector('.comment-input');
    const text = input.value.trim();

    if (text) {
      this.comments.push(text);
      this.onSave(this.comments, this.highlightId);
      input.value = '';
      this.renderComments();
    }
  }

  deleteComment(index) {
    this.comments.splice(index, 1);
    this.onSave(this.comments, this.highlightId);
    this.renderComments();
  }

  hide() {
    if (this.box) {
      this.box.style.display = 'none';
      this.box.querySelector('.comment-input').value = '';
    }
    this.onClose();
  }

  destroy() {
    if (this.box) {
      this.box.remove();
      this.box = null;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
