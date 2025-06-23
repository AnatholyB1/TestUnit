document.addEventListener('DOMContentLoaded', () => {
  // Boutons de contrôle d'enregistrement
  const startBtn = document.getElementById("start");
  const stopBtn = document.getElementById("stop");
  const saveBtn = document.getElementById("save");
  
  // Éléments du dialogue
  const dialogBackdrop = document.getElementById("dialog-backdrop");
  const dialog = document.getElementById("recording-name-dialog");
  const recordingNameInput = document.getElementById("recording-name");
  const recordingIdInput = document.getElementById("recording-id");
  const dialogTitle = document.getElementById("dialog-title");
  const dialogCancelBtn = document.getElementById("dialog-cancel");
  const dialogSaveBtn = document.getElementById("dialog-save");
  
  // Conteneur des enregistrements sauvegardés
  const savedRecordingsContainer = document.getElementById("saved-recordings");
  
  // État actuel
  let currentRecording = null;
  
  // Charger les enregistrements sauvegardés au démarrage
  loadSavedRecordings();
  
  // Écouteurs pour les boutons principaux
  startBtn.addEventListener("click", startRecording);
  stopBtn.addEventListener("click", stopRecording);
  saveBtn.addEventListener("click", () => showSaveDialog());
  
  // Écouteurs pour le dialogue
  dialogCancelBtn.addEventListener("click", hideDialog);
  dialogSaveBtn.addEventListener("click", saveRecording);
  dialogBackdrop.addEventListener("click", hideDialog);
  
  // Fonction pour démarrer l'enregistrement
  function startRecording() {
    chrome.runtime.sendMessage({ action: "startRecording" }, (response) => {
      console.log("Start recording response:", response);
      if (response && response.status === "recording_started") {
        saveBtn.disabled = true;
        startBtn.disabled = true;
      }
    });
  }
  
  // Fonction pour arrêter l'enregistrement
  function stopRecording() {
    chrome.runtime.sendMessage({ action: "stopRecording" }, (response) => {
      if (response && response.status === "recording_stopped") {
        // Récupérer l'enregistrement actuel
        chrome.storage.local.get(["events"], (data) => {
          if (data.events && data.events.length > 0) {
            currentRecording = data.events;
            saveBtn.disabled = false;
          }
        });
        startBtn.disabled = false;
      }
    });
  }
  
  // Afficher le dialogue de sauvegarde
  function showSaveDialog(recordingId = null, isRename = false) {
    dialogBackdrop.style.display = "block";
    dialog.style.display = "block";
    
    if (isRename) {
      dialogTitle.textContent = "Rename Recording";
      // Charger le nom actuel
      chrome.storage.local.get(["savedRecordings"], (data) => {
        if (data.savedRecordings) {
          const recording = data.savedRecordings.find(r => r.id === recordingId);
          if (recording) {
            recordingNameInput.value = recording.name;
          }
        }
      });
    } else {
      dialogTitle.textContent = "Save Recording";
      recordingNameInput.value = `Recording ${new Date().toLocaleString()}`;
    }
    
    recordingIdInput.value = recordingId || '';
    recordingNameInput.focus();
  }
  
  // Cacher le dialogue
  function hideDialog() {
    dialogBackdrop.style.display = "none";
    dialog.style.display = "none";
  }
  
  // Sauvegarder l'enregistrement
  function saveRecording() {
    const name = recordingNameInput.value.trim();
    const id = recordingIdInput.value || Date.now().toString();
    
    if (!name) {
      alert("Please enter a name for this recording");
      return;
    }
    
    chrome.storage.local.get(["savedRecordings"], (data) => {
      let savedRecordings = data.savedRecordings || [];
      
      if (recordingIdInput.value) {
        savedRecordings = savedRecordings.map(recording => 
          recording.id === id ? {...recording, name: name} : recording
        );
      } else {
        // C'est un nouvel enregistrement
        savedRecordings.push({
          id: id,
          name: name,
          date: new Date().toISOString(),
          events: currentRecording
        });
      }
      
      // Sauvegarder dans le stockage
      chrome.storage.local.set({ savedRecordings: savedRecordings }, () => {
        console.log("Recording saved:", name);
        hideDialog();
        loadSavedRecordings();
        saveBtn.disabled = true;
      });
    });
  }
  
  // Charger et afficher les enregistrements sauvegardés
  function loadSavedRecordings() {
    chrome.storage.local.get(["savedRecordings"], (data) => {
      const recordings = data.savedRecordings || [];
      
      savedRecordingsContainer.innerHTML = '';
      
      if (recordings.length === 0) {
        savedRecordingsContainer.innerHTML = '<div class="recording-item">No saved recordings</div>';
        return;
      }
      
      recordings.forEach(recording => {
        const item = document.createElement('div');
        item.className = 'recording-item';
        
        const eventsCount = recording.events ? recording.events.length : 0;
        
        item.innerHTML = `
          <div>
            <strong>${recording.name}</strong>
            <div style="font-size: 12px; color: #666;">
              ${new Date(recording.date).toLocaleString()} · ${eventsCount} events
            </div>
          </div>
          <div class="actions">
            <button class="secondary play-btn" data-id="${recording.id}">Play</button>
            <button class="secondary rename-btn" data-id="${recording.id}">Rename</button>
            <button class="danger delete-btn" data-id="${recording.id}">Delete</button>
          </div>
        `;
        
        savedRecordingsContainer.appendChild(item);
      });
      
      // Ajouter des écouteurs pour les boutons
      document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const recordingId = e.target.getAttribute('data-id');
          playRecording(recordingId);
        });
      });
      
      document.querySelectorAll('.rename-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const recordingId = e.target.getAttribute('data-id');
          showSaveDialog(recordingId, true);
        });
      });
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const recordingId = e.target.getAttribute('data-id');
          if (confirm("Are you sure you want to delete this recording?")) {
            deleteRecording(recordingId);
          }
        });
      });
    });
  }
  
  // Supprimer un enregistrement
  function deleteRecording(recordingId) {
    chrome.storage.local.get(["savedRecordings"], (data) => {
      if (!data.savedRecordings) return;
      
      const updatedRecordings = data.savedRecordings.filter(
        recording => recording.id !== recordingId
      );
      
      chrome.storage.local.set({ savedRecordings: updatedRecordings }, () => {
        console.log("Recording deleted:", recordingId);
        loadSavedRecordings();
      });
    });
  }
  
  // Jouer un enregistrement
  function playRecording(recordingId) {
    chrome.storage.local.get(["savedRecordings"], (data) => {
      if (!data.savedRecordings) return;
      
      const recording = data.savedRecordings.find(r => r.id === recordingId);
      
      if (!recording || !recording.events || recording.events.length === 0) {
        alert("Recording not found or empty");
        return;
      }
      
      // Temporairement mettre les clics dans le stockage pour la lecture
      chrome.storage.local.set({ events: recording.events }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: replayEvents
          });
        });
      });
    });
  }
});

function replayEvents() {
  function showClickVisual(x, y) {
    const visual = document.createElement('div');
    Object.assign(visual.style, {
      position: 'absolute',
      left: `${x - 15}px`,
      top: `${y - 15}px`,
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 123, 255, 0.5)',
      pointerEvents: 'none',
      zIndex: '10000',
      transition: 'transform 0.5s, opacity 0.5s',
      transform: 'scale(0.1)',
      opacity: '1'
    });
    document.body.appendChild(visual);
    setTimeout(() => visual.style.transform = 'scale(1)', 10);
    setTimeout(() => {
      visual.style.opacity = '0';
      visual.style.transform = 'scale(1.5)';
      setTimeout(() => document.body.removeChild(visual), 500);
    }, 500);
  }

  // Récupérer les événements enregistrés
  chrome.storage.local.get("events", (data) => {
    const events = data.events || [];
    console.log(`Replaying ${events.length} events`);
    
    if (!events || events.length === 0) {
      console.log("No events to replay");
      return;
    }
    
    const baseTime = events[0].timestamp;
    
    events.forEach((event) => {
      const delay = event.timestamp - baseTime;
      
      setTimeout(() => {
        // Traiter différents types d'événements
        if (event.type === "scroll") {
          console.log(`Scrolling to (${event.scrollX}, ${event.scrollY})`);
          window.scrollTo(event.scrollX, event.scrollY);
        } 
        else if (event.type === "click") {
          // Établir la position de défilement d'abord si nécessaire
          if (window.scrollX !== event.scrollX || window.scrollY !== event.scrollY) {
            window.scrollTo(event.scrollX, event.scrollY);
          }
          
          setTimeout(() => {
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: event.x,
              clientY: event.y
            });
            
            const elementAtPoint = document.elementFromPoint(event.x, event.y);
            
            if (elementAtPoint) {
              console.log(`Clicking at position (${event.x}, ${event.y}) on element:`, elementAtPoint);
              showClickVisual(event.x, event.y);
              elementAtPoint.dispatchEvent(clickEvent);
            } else {
              console.warn(`No element found at position (${event.x}, ${event.y})`);
            }
          }, 100); // Petit délai après le défilement
        }
      }, delay);
    });
  });
}