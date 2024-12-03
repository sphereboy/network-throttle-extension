let attached = false;
let currentDebuggee = null;
let throttleStartTime = null;
let currentProfile = null;
let totalBytesSaved = 0;

// Speed monitoring
let lastSpeedUpdate = Date.now();
let speedAccumulator = 0;
let speedSampleCount = 0;

// Format speed for badge
function formatSpeedForBadge(bytesPerSec) {
  if (bytesPerSec === 0) return "OFF";
  if (bytesPerSec === -1) return "";

  const mbps = (bytesPerSec * 8) / (1024 * 1024);
  if (mbps >= 1) {
    return Math.round(mbps) + "M";
  } else {
    const kbps = (bytesPerSec * 8) / 1024;
    return Math.round(kbps) + "K";
  }
}

// Update badge with current speed
function updateSpeedBadge(profile) {
  if (!profile) return;

  const speed = profile.download;
  const text = formatSpeedForBadge(speed);
  const color =
    profile.download === -1
      ? [26, 115, 232, 255] // Google Blue
      : profile.download === 0
      ? [158, 158, 158, 255] // Grey
      : speed >= 1024 * 1024
      ? [33, 150, 243, 255] // Blue
      : speed >= 512 * 1024
      ? [255, 193, 7, 255] // Yellow
      : [244, 67, 54, 255]; // Red

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Easter egg messages
const MILESTONES = {
  "1GB": 1024 * 1024 * 1024,
  "10GB": 10 * 1024 * 1024 * 1024,
  "100GB": 100 * 1024 * 1024 * 1024,
};

const EASTER_EGGS = {
  "1GB": "🎉 You've saved 1GB! Your internet is now on a diet!",
  "10GB": "🚀 10GB saved! You're basically a data compression wizard!",
  "100GB": "🏆 100GB! You're the Master of Digital Minimalism!",
};

function checkMilestones(previousTotal, newTotal) {
  for (const [milestone, bytes] of Object.entries(MILESTONES)) {
    if (previousTotal < bytes && newTotal >= bytes) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icon48.png",
        title: "Network Throttle Achievement!",
        message: EASTER_EGGS[milestone],
      });
    }
  }
}

// Network event listeners for speed monitoring
function attachNetworkListeners(debuggee) {
  chrome.debugger.onEvent.addListener((source, method, params) => {
    if (source.tabId !== debuggee.tabId) return;

    if (method === "Network.dataReceived") {
      updateBandwidthSaved(params.dataLength);
    }
  });
}

function updateBandwidthSaved(bytesReceived) {
  if (!currentProfile || currentProfile.download === -1) return;
  if (currentProfile.download === 0) return; // Skip if offline

  // Calculate theoretical bytes saved
  const normalBytes = bytesReceived;
  const throttledBytes =
    bytesReceived * (currentProfile.download / (5 * 1024 * 1024)); // Assuming 5MB/s normal speed
  const bytesSaved = normalBytes - throttledBytes;

  const previousTotal = totalBytesSaved;
  totalBytesSaved += bytesSaved;

  // Store the total
  chrome.storage.local.set({ totalBytesSaved });

  // Check for milestones
  checkMilestones(previousTotal, totalBytesSaved);
}

// Load saved bandwidth data
chrome.storage.local.get(["totalBytesSaved"], (result) => {
  if (result.totalBytesSaved) {
    totalBytesSaved = result.totalBytesSaved;
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "setThrottle" && request.tabId) {
    const debuggee = { tabId: request.tabId };

    // Update current profile and start monitoring
    currentProfile = request.profile;
    updateSpeedBadge(currentProfile);

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
        .then(() => {
          return new Promise((resolve, reject) => {
            chrome.debugger.sendCommand(debuggee, "Network.enable", {}, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          });
        })
        .then(() => {
          attached = true;
          attachNetworkListeners(debuggee);
          applyThrottling(debuggee, request.profile);
        })
        .catch((error) => {
          console.error("Failed to attach debugger:", error.message);
          try {
            chrome.debugger.detach(debuggee);
          } catch (e) {
            // Ignore cleanup errors
          }
          currentDebuggee = null;
          attached = false;
          updateSpeedBadge({ download: -1 });
        });
    } else {
      applyThrottling(debuggee, request.profile);
    }
  } else if (request.action === "getBandwidthSaved") {
    sendResponse({ totalBytesSaved });
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
          updateSpeedBadge({ download: -1 });
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
    updateSpeedBadge({ download: -1 });
  }
});

// Handle tab closing
chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentDebuggee && currentDebuggee.tabId === tabId) {
    console.log("Debugged tab was closed:", tabId);
    attached = false;
    currentDebuggee = null;
    updateSpeedBadge({ download: -1 });
  }
});

// Set initial badge
updateSpeedBadge({ download: -1 });
