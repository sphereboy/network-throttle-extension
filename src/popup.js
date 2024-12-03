import "./css/popup.css";

const profiles = {
  regular3g: {
    download: (750 * 1024) / 8, // 750 Kbps
    upload: (250 * 1024) / 8, // 250 Kbps
    latency: 100, // 100ms
  },
  fast3g: {
    download: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
    upload: (750 * 1024) / 8, // 750 Kbps
    latency: 40, // 40ms
  },
  slow: {
    download: (100 * 1024) / 8, // 100 Kbps
    upload: (50 * 1024) / 8, // 50 Kbps
    latency: 500, // 500ms
  },
  offline: {
    download: 0,
    upload: 0,
    latency: 0,
  },
  nothrottle: {
    download: -1,
    upload: -1,
    latency: 0,
  },
};

// Profile names for display
const profileNames = {
  regular3g: "Regular 3G",
  fast3g: "Fast 3G",
  slow: "Slow Connection",
  offline: "Offline",
  nothrottle: "No Throttling",
};

async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Show profile information
function showProfileInfo(profileId) {
  // Hide all profile infos
  document.querySelectorAll(".profile-info").forEach((el) => {
    el.classList.remove("active");
  });

  // Show selected profile info
  const profileInfo = document.getElementById(`${profileId}-info`);
  if (profileInfo) {
    profileInfo.classList.add("active");
  }

  // Update active profile display
  const activeProfile = document.getElementById("activeProfile");
  activeProfile.textContent = profileNames[profileId] || "Unknown";
  activeProfile.setAttribute("data-profile", profileId);
}

// Initialize profile info display
document.getElementById("profileSelect").addEventListener("change", (e) => {
  showProfileInfo(e.target.value);
});

// Show initial profile info
showProfileInfo(document.getElementById("profileSelect").value);

// Store the last active profile in storage
function updateActiveProfile(profileId) {
  chrome.storage.local.set({ activeProfile: profileId });
  showProfileInfo(profileId);
}

// Load the last active profile
chrome.storage.local.get(["activeProfile"], (result) => {
  if (result.activeProfile) {
    document.getElementById("profileSelect").value = result.activeProfile;
    showProfileInfo(result.activeProfile);
  }
});

document.getElementById("applyThrottle").addEventListener("click", async () => {
  const tab = await getCurrentTab();
  const profile = document.getElementById("profileSelect").value;
  updateActiveProfile(profile);
  chrome.runtime.sendMessage({
    action: "setThrottle",
    profile: profiles[profile],
    profileId: profile,
    tabId: tab.id,
  });
});

document.getElementById("resetThrottle").addEventListener("click", async () => {
  const tab = await getCurrentTab();
  updateActiveProfile("nothrottle");
  document.getElementById("profileSelect").value = "nothrottle";
  chrome.runtime.sendMessage({
    action: "setThrottle",
    profile: profiles.nothrottle,
    profileId: "nothrottle",
    tabId: tab.id,
  });
});

// Format bytes to human readable format
function formatBytes(bytes) {
  if (bytes < 1024) return Math.round(bytes) + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  if (bytes < 1024 * 1024 * 1024)
    return Math.round(bytes / (1024 * 1024)) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
}

// Update bandwidth saved display
function updateBandwidthDisplay() {
  chrome.runtime.sendMessage({ action: "getBandwidthSaved" }, (response) => {
    if (response && response.totalBytesSaved) {
      const bandwidthElement = document.getElementById("bandwidthSaved");
      const amountElement = bandwidthElement.querySelector(".amount");
      const oldValue = amountElement.dataset.value || 0;
      const newValue = response.totalBytesSaved;

      // Update the display
      amountElement.textContent = formatBytes(newValue);
      amountElement.dataset.value = newValue;

      // Add celebration animation if value increased significantly
      if (newValue - oldValue > 1024 * 1024) {
        // More than 1MB difference
        bandwidthElement.classList.add("celebrating");
        setTimeout(() => {
          bandwidthElement.classList.remove("celebrating");
        }, 500);
      }
    }
  });
}

// Update bandwidth display periodically
setInterval(updateBandwidthDisplay, 1000);
updateBandwidthDisplay(); // Initial update
