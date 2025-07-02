let recordingState = {
  isRecording: false,
  events: []
};

// Initialiser l'état depuis le stockage au démarrage
chrome.storage.local.get(['recording', 'events', 'savedRecordings'], (data) => {
  if (data.recording) recordingState.isRecording = data.recording;
  if (data.events) recordingState.events = data.events;
});

// Gérer les messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startRecording") {
    recordingState.isRecording = true;
    recordingState.events = [];  // Utiliser events au lieu de clicks
    chrome.storage.local.set({ recording: true, events: [] });
    sendResponse({ status: "recording_started" });
  }
  else if (message.action === "stopRecording") {
    recordingState.isRecording = false;
    chrome.storage.local.set({ recording: false });
    sendResponse({ status: "recording_stopped" });
  }
  else if (message.action === "addEvent") {  // Renommer addClick en addEvent
    if (recordingState.isRecording) {
      recordingState.events.push(message.eventData);
      chrome.storage.local.set({ events: recordingState.events });
      sendResponse({ status: "event_recorded", eventCount: recordingState.events.length });
    }
  }
  return true;
});


// Dans votre background.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "testCompleted") {
    console.log("Test completed:", message.results, "background.js");
    // Récupérer les informations du test exécuté
    chrome.storage.local.get(["currentTestId", "savedRecordings"], (data) => {
      const currentTestId = data.currentTestId;
      const recordings = data.savedRecordings || [];
      const currentTest = recordings.find(r => r.id === currentTestId);

      console.log("Current test:", currentTest, "background.js");
      
      if (currentTest) {
        const testReport = {
          id: Date.now().toString(),
          testName: currentTest.name,
          startUrl: currentTest.startUrl || sender.tab.url,
          date: new Date().toISOString(),
          duration: message.results ? message.results.duration : 0,
          eventsTotal: currentTest.events.length,
          eventsExecuted: message.results ? message.results.eventsExecuted : 0,
          success: message.results ? message.results.success : true,
          errors: message.results ? message.results.errors : []
        };
        
        // Ajouter au rapport existant sans écraser
        chrome.storage.local.get("testReports", (reportData) => {
          const reports = reportData.testReports || [];
          reports.push(testReport);
          chrome.storage.local.set({ testReports: reports }, () => {
          });
        });
      }
    });
    
    return true;
  }
});