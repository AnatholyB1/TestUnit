let recordingState = {
    isRecording: false,
    clicks: []
  };
  
  // Initialiser l'état depuis le stockage au démarrage
  chrome.storage.local.get(['recording', 'clicks'], (data) => {
    console.log("Background script loaded, initial state:", data);  
    if (data.recording) recordingState.isRecording = data.recording;
    if (data.clicks) recordingState.clicks = data.clicks;
  });
  
  // Gérer les messages des content scripts et popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Background received message:", message);
    
    if (message.action === "startRecording") {
      console.log("Starting recording session");
      recordingState.isRecording = true;
      recordingState.clicks = [];
      chrome.storage.local.set({ recording: true, clicks: [] });
      sendResponse({ status: "recording_started" });
    }
    else if (message.action === "stopRecording") {
      console.log("Stopping recording session");
      recordingState.isRecording = false;
      chrome.storage.local.set({ recording: false });
      sendResponse({ status: "recording_stopped" });
    }
    else if (message.action === "addClick") {
      if (recordingState.isRecording) {
        console.log("Adding click:", message.clickData);
        recordingState.clicks.push(message.clickData);
        chrome.storage.local.set({ clicks: recordingState.clicks });
        sendResponse({ status: "click_recorded", clickCount: recordingState.clicks.length });
      } else {
        console.log("Click ignored - not recording");
        sendResponse({ status: "ignored", reason: "not_recording" });
      }
    }
    return true; // Important pour garder le canal de message ouvert pour les réponses asynchrones
  });