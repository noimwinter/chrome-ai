(async () => {
  loadSettings();
})();

document.addEventListener("view:loaded", async (e) => {
  if (e.detail.path === "views/settings.html") {
    loadSettings();
  }
});

document.addEventListener("click", async (e) => {
  if (e.target.closest("#btn-back")) {
    window.loadView("views/main.html");
  }

  if (e.target.closest("#btn-save")) {
    saveSettings();
  }

  if (e.target.closest("#btn-reset")) {
    resetSettings();
  }
});

document.addEventListener("change", (e) => {
  if (e.target.id === "occupation") {
    document.getElementById("occupation-error").textContent = "";
    toggleCustomOccupation(e.target.value);
  }
});

document.addEventListener("input", (e) => {
  if (e.target.id === "custom-occupation") {
    document.getElementById("occupation-error").textContent = "";
  }
});

// Load settings from storage
async function loadSettings() {
  // Load occupation
  const { occupation } = await chrome.storage.local.get({ occupation: DEFAULT_SETTINGS.occupation });
  document.getElementById("occupation").value = occupation;
  document.getElementById("custom-occupation").value = "";

  if (!["student", "teacher", "developer", "researcher"].includes(occupation)) {
    toggleCustomOccupation("other");
    document.getElementById("occupation").value = "other";
    document.getElementById("custom-occupation").value = occupation;
  }

  // Load custom prompt
  const { customPrompt } = await chrome.storage.local.get({ customPrompt: DEFAULT_SETTINGS.customPrompt });
  document.getElementById("custom-prompt").value = customPrompt;

  // Load default summary type
  const { summaryType } = await chrome.storage.local.get({ summaryType: DEFAULT_SETTINGS.summaryType });
  document.querySelector(`input[name="default-summary-type"][value="${summaryType}"]`).checked = true;
}

// Save settings to storage
async function saveSettings() {
  document.getElementById("occupation-error").textContent = "";

  const occupationVal = document.getElementById("occupation").value;
  const customOccupationVal = document.getElementById("custom-occupation").value.trim();
  const customPromptVal = document.getElementById("custom-prompt").value.trim();
  const summaryTypeVal = document.querySelector('input[name="default-summary-type"]:checked').value;

  // Validate occupation
  if (!occupationVal || occupationVal === "") {
    document.getElementById("occupation-error").textContent = "Please select your occupation.";
    document.getElementById("occupation").focus();
    return;
  }
  if (occupationVal === "other" && customOccupationVal.length === 0) {
    document.getElementById("occupation-error").textContent = "Please enter your occupation.";
    document.getElementById("custom-occupation").focus();
    return;
  }

  await chrome.storage.local.set({
    occupation: occupationVal === "other" ? customOccupationVal : occupationVal,
    customPrompt: customPromptVal,
    summaryType: summaryTypeVal,
  });

  // UX feedback
  const saveBtn = document.getElementById("btn-save");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saved!";
  setTimeout(() => {
    saveBtn.textContent = "Save Settings";
    saveBtn.disabled = false;
  }, 2000);
}

// Reset settings to defaults
async function resetSettings() {
  // Reset occupation
  document.getElementById("occupation").value = DEFAULT_SETTINGS.occupation;
  toggleCustomOccupation(DEFAULT_SETTINGS.occupation);
  document.getElementById("custom-occupation").value = "";

  // Reset custom prompt
  document.getElementById("custom-prompt").value = "";

  // Reset default summary type
  document.querySelector(`input[name="default-summary-type"][value="${DEFAULT_SETTINGS.summaryType}"]`).checked = true;
}

// Show/hide custom occupation input
function toggleCustomOccupation(value) {
  const group = document.getElementById("custom-occupation-group");
  if (value === "other") {
    group.classList.remove("hidden");
  } else {
    group.classList.add("hidden");
  }
}
