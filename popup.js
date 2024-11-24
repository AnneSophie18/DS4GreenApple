document.addEventListener("DOMContentLoaded", () => {
  const tabsContainer = document.getElementById("tabs");
  const totalTimeElement = document.getElementById("totalTime");
  const siteInput = document.getElementById("siteInput");
  const saveSiteButton = document.getElementById("saveSite");
  const intervalInput = document.getElementById("intervalInput");
  const saveIntervalButton = document.getElementById("saveInterval");

  const notificationSiteDisplay = document.createElement('p');
  const notificationIntervalDisplay = document.createElement('p');
  document.body.insertBefore(notificationSiteDisplay, tabsContainer);
  document.body.insertBefore(notificationIntervalDisplay, tabsContainer);

  const tabElements = {};
  let activeTabId = null;

  // Function to format time as HH:MM:SS
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Update the list of tabs and total time
  const updateTabList = () => {
    chrome.runtime.sendMessage({ type: "getTabsData" }, (response) => {
      const tabs = response.data;
      const totalTime = response.totalTime;

      if (!tabs || tabs.length === 0) return;

      chrome.tabs.query({ active: true, currentWindow: true }, ([currentTab]) => {
        activeTabId = currentTab ? currentTab.id : null;

        const sortedTabs = tabs.slice().sort((a, b) => (a.id === activeTabId ? -1 : b.id === activeTabId ? 1 : 0));

        tabsContainer.innerHTML = "";
        sortedTabs.forEach((tab) => {
          if (!tabElements[tab.id]) {
            tabElements[tab.id] = createTabElement(tab);
          }
          const element = tabElements[tab.id];
          updateTabElement(element, tab, tab.id === activeTabId);
          tabsContainer.appendChild(element);
        });
      });

      totalTimeElement.textContent = `Total Time Spent: ${formatTime(totalTime)}`;
    });
  };

  const createTabElement = (tab) => {
    const div = document.createElement("div");
    div.className = "tab";
    div.innerHTML = `
      <h3>${tab.title}</h3>
      <p><strong>URL:</strong> ${tab.url}</p>
      <p><strong>Time Spent:</strong> <span class="time">${formatTime(tab.timeSpent)}</span></p>
    `;
    return div;
  };

  const updateTabElement = (element, tab, isActive) => {
    element.querySelector("h3").textContent = tab.title;
    element.querySelector(".time").textContent = formatTime(tab.timeSpent);
    element.className = `tab ${isActive ? "active-tab" : ""}`;
  };

  // Save notification site
  saveSiteButton.addEventListener("click", () => {
    const site = siteInput.value.trim();
    if (site) {
      chrome.storage.sync.set({ notificationSite: site }, () => {
        alert("Notification site saved!");
        updateNotificationDetails();
      });
    }
  });

  // Save notification interval
  saveIntervalButton.addEventListener("click", () => {
    const interval = parseInt(intervalInput.value, 10);
    if (interval > 0) {
      chrome.storage.sync.set({ notificationInterval: interval * 1000 }, () => {
        alert("Notification interval saved!");
        updateNotificationDetails();
      });
    }
  });

  // Function to update the display of the notification site and interval
  const updateNotificationDetails = () => {
    chrome.storage.sync.get(["notificationSite", "notificationInterval"], ({ notificationSite, notificationInterval }) => {
      notificationSiteDisplay.textContent = `Notification Site: ${notificationSite || 'Not set'}`;
      notificationIntervalDisplay.textContent = `Notification Interval: ${notificationInterval ? notificationInterval / 1000 : 'Not set'} seconds`;
    });
  };

  // Initial update of notification details
  updateNotificationDetails();

  setInterval(updateTabList, 1000);
  updateTabList();
});
