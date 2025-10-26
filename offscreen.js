// Initialize Mermaid
window.mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "default",
});

// Handle Mermaid event
chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg?.type === 'MERMAID_RENDER_REQUEST_TO_OFFSCREEN') {
    const mermaidCode = msg.mermaidCode;

    const renderId = "mermaid-" + Math.random().toString(36).slice(2);
    let result;
    
    try {
      const out = await window.mermaid.render(renderId, mermaidCode.trim());
      let output;

      if (out && typeof out.svg === "string") {
        output = out.svg;
      } else if (typeof out === "string") {
        output = out;
      } else {
        throw new Error("Failed to render diagram");
      }

      result = {
        success: true,
        output: output,
      };
    } catch (err) {
      document.getElementById("d" + renderId).remove();
      console.error("Mermaid error:", err);

      result = {
        success: false,
        output: null
      };
    }

    chrome.runtime.sendMessage({ type: "MERMAID_RENDER_RESULT", result });
  }
});
