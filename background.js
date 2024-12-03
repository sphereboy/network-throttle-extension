let attached = false;
let currentDebuggee = null;

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
  }
});

// Handle tab closing
chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentDebuggee && currentDebuggee.tabId === tabId) {
    console.log("Debugged tab was closed:", tabId);
    attached = false;
    currentDebuggee = null;
  }
});
