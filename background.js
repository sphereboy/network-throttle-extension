let attached = false;
let currentDebuggee = null;

// Icon colors for different states
const iconStates = {
  nothrottle: { color: "#4CAF50" }, // Green
  fast3g: { color: "#2196F3" }, // Blue
  regular3g: { color: "#FFC107" }, // Yellow
  slow: { color: "#F44336" }, // Red
  offline: { color: "#9E9E9E" }, // Grey
};

// Function to draw default icon
function drawDefaultIcon() {
  const canvas = new OffscreenCanvas(32, 32);
  const ctx = canvas.getContext("2d");

  // Draw outer circle
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, 2 * Math.PI);
  ctx.fillStyle = "#1a73e8"; // Google Blue
  ctx.fill();

  // Draw network symbol
  ctx.beginPath();
  // Draw three curved lines representing network waves
  for (let i = 0; i < 3; i++) {
    const radius = 6 + i * 3;
    ctx.arc(16, 16, radius, Math.PI * 0.8, Math.PI * 0.2, true);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, 32, 32);
}

// Function to update extension icon
function updateIcon(profile) {
  // If no profile or resetting, use default icon
  if (!profile || profile === "reset") {
    chrome.action.setIcon({ imageData: drawDefaultIcon() });
    return;
  }

  const state = profile || "nothrottle";
  const color = iconStates[state]?.color || iconStates.nothrottle.color;

  const canvas = new OffscreenCanvas(32, 32);
  const context = canvas.getContext("2d");

  // Draw circle background
  context.beginPath();
  context.arc(16, 16, 14, 0, 2 * Math.PI);
  context.fillStyle = color;
  context.fill();

  // Draw speed indicator
  if (state !== "offline") {
    context.beginPath();
    context.moveTo(16, 8);
    context.lineTo(24, 16);
    context.lineTo(16, 16);
    context.fillStyle = "white";
    context.fill();

    if (state !== "slow") {
      context.beginPath();
      context.moveTo(16, 12);
      context.lineTo(20, 16);
      context.lineTo(16, 16);
      context.fillStyle = "rgba(255, 255, 255, 0.7)";
      context.fill();
    }
  } else {
    // Draw X for offline mode
    context.beginPath();
    context.moveTo(12, 12);
    context.lineTo(20, 20);
    context.moveTo(20, 12);
    context.lineTo(12, 20);
    context.strokeStyle = "white";
    context.lineWidth = 2;
    context.stroke();
  }

  chrome.action.setIcon({ imageData: context.getImageData(0, 0, 32, 32) });
}

// Enable Network domain when debugger is attached
function enableNetworkTracking(debuggee) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand(debuggee, "Network.enable", {}, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setThrottle" && request.tabId) {
    const debuggee = { tabId: request.tabId };

    // If this is a reset request, use default icon
    if (request.profileId === "nothrottle") {
      updateIcon("reset");
    } else {
      // Update icon based on profile
      updateIcon(request.profileId);
    }

    // If we're already attached to a different tab, detach first
    if (currentDebuggee && currentDebuggee.tabId !== request.tabId) {
      try {
        chrome.debugger.detach(currentDebuggee);
      } catch (e) {
        console.error("Error detaching from previous tab:", e);
      }
      attached = false;
    }

    currentDebuggee = debuggee;

    if (!attached) {
      // Wrap the attach operation in a Promise
      new Promise((resolve, reject) => {
        chrome.debugger.attach(debuggee, "1.3", () => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(JSON.stringify(error)));
          } else {
            resolve();
          }
        });
      })
        .then(() => enableNetworkTracking(debuggee))
        .then(() => {
          attached = true;
          applyThrottling(debuggee, request.profile);
        })
        .catch((error) => {
          console.error("Failed to attach debugger:", error.message);
          // Try to clean up if something went wrong
          try {
            chrome.debugger.detach(debuggee);
          } catch (e) {
            // Ignore cleanup errors
          }
          currentDebuggee = null;
          attached = false;
          // Reset to default icon if throttling failed
          updateIcon("reset");
        });
    } else {
      applyThrottling(debuggee, request.profile);
    }
  }
});

function applyThrottling(debuggee, profile) {
  return new Promise((resolve, reject) => {
    const conditions =
      profile.download === -1
        ? {
            offline: false,
            latency: 0,
            downloadThroughput: -1,
            uploadThroughput: -1,
          }
        : {
            offline: profile.download === 0,
            latency: profile.latency,
            downloadThroughput: profile.download,
            uploadThroughput: profile.upload,
          };

    chrome.debugger.sendCommand(
      debuggee,
      "Network.emulateNetworkConditions",
      conditions,
      () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Throttling error:",
            JSON.stringify(chrome.runtime.lastError)
          );
          reject(chrome.runtime.lastError);
          // Reset to default icon if throttling failed
          updateIcon("reset");
        } else {
          resolve();
        }
      }
    );
  });
}

// Handle debugger detachment
chrome.debugger.onDetach.addListener((source) => {
  if (currentDebuggee && source.tabId === currentDebuggee.tabId) {
    console.log("Debugger detached from tab:", source.tabId);
    attached = false;
    currentDebuggee = null;
    // Reset to default icon when debugger is detached
    updateIcon("reset");
  }
});

// Handle tab closing
chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentDebuggee && currentDebuggee.tabId === tabId) {
    console.log("Debugged tab was closed:", tabId);
    attached = false;
    currentDebuggee = null;
    // Reset to default icon when tab is closed
    updateIcon("reset");
  }
});

// Set initial icon to default
updateIcon("reset");
