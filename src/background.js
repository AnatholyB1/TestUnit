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
      console.log("Event recorded:", message.eventData);
      recordingState.events.push(message.eventData);
      chrome.storage.local.set({ events: recordingState.events });
      sendResponse({ status: "event_recorded", eventCount: recordingState.events.length });
    }
  }
  return true;
});