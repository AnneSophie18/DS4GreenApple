let tabTimers = {};
let currentTabId = null;
let currentStartTime = null;
let totalTime = 0;

let notificationInterval = 10000; // Default interval

// Retrieve stored interval on startup
chrome.storage.sync.get("notificationInterval", ({ notificationInterval: storedInterval }) => {
  if (storedInterval) {
    notificationInterval = storedInterval;
  }
});

// Function to update timers for tabs
const updateTabTimers = () => {
  const now = Date.now();
  if (currentTabId !== null && currentStartTime !== null) {
    const elapsedTime = (now - currentStartTime) / 1000;
    tabTimers[currentTabId] = (tabTimers[currentTabId] || 0) + elapsedTime;
    totalTime += elapsedTime;
    currentStartTime = now;
  }
};

// Listen for tab activation changes
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTabTimers();
  currentTabId = activeInfo.tabId;
  currentStartTime = Date.now();
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === currentTabId) {
    updateTabTimers();
    currentTabId = null;
    currentStartTime = null;
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getTabsData") {
    updateTabTimers();
    chrome.tabs.query({}, (tabs) => {
      const data = tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        url: new URL(tab.url).hostname,
        timeSpent: Math.round(tabTimers[tab.id] || 0),
      }));
      sendResponse({
        data: data,
        totalTime: Math.round(totalTime),
      });
    });
    return true; // Keeps the channel open for async response
  } else if (message.type === "setNotificationInterval") {
    // Update the notification interval from the popup
    const newInterval = message.interval;
    notificationInterval = newInterval * 1000; // Convert seconds to milliseconds
    chrome.storage.sync.set({ notificationInterval: notificationInterval });
    sendResponse({ status: "Interval updated successfully!" });
  }
});

// Periodically send notifications
let notificationIntervalId = setInterval(() => {
  chrome.storage.sync.get(["notificationSite", "notificationInterval"], ({ notificationSite }) => {
    if (notificationSite && currentTabId !== null) {
      chrome.tabs.get(currentTabId, (tab) => {
        if (tab) {
          chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            func: (site) => {
              alert(`Why not visit ${site}?`);
            },
            args: [notificationSite],
          });
        }
      });
    }
  });
}, notificationInterval);

// Dynamically update interval when storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.notificationInterval) {
    notificationInterval = changes.notificationInterval.newValue;
    clearInterval(notificationIntervalId); // Clear the previous interval
    notificationIntervalId = setInterval(() => {
      chrome.storage.sync.get(["notificationSite", "notificationInterval"], ({ notificationSite }) => {
        if (notificationSite && currentTabId !== null) {
          chrome.tabs.get(currentTabId, (tab) => {
            if (tab) {
              chrome.scripting.executeScript({
                target: { tabId: currentTabId },
                func: (site) => {
                  alert(`Why not visit ${site}?`);
                },
                args: [notificationSite],
              });
            }
          });
        }
      });
    }, notificationInterval); // Set the new interval
  }
});
