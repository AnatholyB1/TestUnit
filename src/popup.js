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

  // Champs du formulaire
  const testerNameInput = document.getElementById("tester-name");
  const environmentInput = document.getElementById("environment");
  const usLinkInput = document.getElementById("us-link");
  const testUrlInput = document.getElementById("test-url");
  const prerequisitesInput = document.getElementById("prerequisites");
  
  // Conteneur des enregistrements sauvegardés
  const savedRecordingsContainer = document.getElementById("saved-recordings");

  // Fonction pour exporter les résultats de test en CSV et vider le rapport
  function exportTestResultsAndClear() {
    chrome.storage.local.get("testReports", (data) => {
      const reports = data.testReports || [];
      if (reports.length === 0) {
        alert("Aucun rapport de test à exporter");
        return;
      }
      
      // Créer l'en-tête du CSV
      let csvContent = "ID;Nom du test;Date;URL;Durée (s);Statut;Événements exécutés;Événements total;Erreurs\n";
      
      // Ajouter chaque rapport comme une ligne
      reports.forEach(report => {
        const status = report.success ? "Succès" : "Échec";
        const duration = (report.duration / 1000).toFixed(1);
        const errors = (report.errors || []).map(e => `Étape ${e.step + 1}: ${e.message}`).join(" | ");
        
        // Échapper les guillemets et les points-virgules dans les champs texte
        const safeTestName = report.testName ? report.testName.replace(/"/g, '""') : "Test sans nom";
        const safeErrors = errors.replace(/"/g, '""');
        
        // Créer la ligne CSV
        const row = [
          report.id,
          `"${safeTestName}"`,
          new Date(report.date).toLocaleString(),
          `"${report.startUrl || ''}"`,
          duration,
          status,
          report.eventsExecuted,
          report.eventsTotal,
          `"${safeErrors}"`
        ].join(';');
        
        csvContent += row + "\n";
      });
      
      // Créer un Blob pour le téléchargement
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement et le cliquer
      const a = document.createElement('a');
      a.href = url;
      a.download = `test-results-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      
      // Libérer l'URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      // Vider le rapport après l'export
      chrome.storage.local.set({ testReports: [] }, () => {
      });
    });
  }

  // Écouteur pour le bouton d'export
  document.getElementById("export-csv-btn").addEventListener("click", () => {
    exportTestResultsAndClear();
  });
  
  // État actuel
  let currentRecording = null;
  let currentUrl = "";
  
  // Charger les enregistrements sauvegardés au démarrage
  loadSavedRecordings();

    // Obtenir l'URL actuelle
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      currentUrl = tabs[0].url;
    }
  });
  
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
      if (response && response.status === "recording_started") {
        saveBtn.disabled = true;
        startBtn.disabled = true;
        
        //mettre à jour l'adresse actuelle
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].url) {
            currentUrl = tabs[0].url;
          }
        });
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
                    
            // Mettre à jour l'URL actuelle au début de l'enregistrement
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
              if (tabs && tabs[0] && tabs[0].url) {
                currentUrl = tabs[0].url;
              }
            });
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
      dialogTitle.textContent = "Modifier l'enregistrement";
      // Charger le nom actuel
      chrome.storage.local.get(["savedRecordings"], (data) => {
        if (data.savedRecordings) {
          const recording = data.savedRecordings.find(r => r.id === recordingId);
          if (recording) {
            recordingNameInput.value = recording.name || "";
            testerNameInput.value = recording.testerName || "";
            environmentInput.value = recording.environment || "";
            usLinkInput.value = recording.usLink || "";
            testUrlInput.value = recording.testUrl || "";
            prerequisitesInput.value = recording.prerequisites || "";
          }
        }
      });
    } else {
      dialogTitle.textContent = "Save Recording";
      recordingNameInput.value = `Recording ${new Date().toLocaleString()}`;
      testUrlInput.value = currentUrl;
      testerNameInput.value = "";
      environmentInput.value = "";
      usLinkInput.value = "";
      prerequisitesInput.value = "";
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
        
    if (!testerNameInput.value.trim()) {
      alert("Veuillez entrer le nom du testeur");
      return;
    }
    
    if (!environmentInput.value.trim()) {
      alert("Veuillez spécifier l'environnement");
      return;
    }  

    if (!testUrlInput.value.trim()) {
      alert("Veuillez spécifier l'URL du test");
      return;
    }

 
    
    chrome.storage.local.get(["savedRecordings"], (data) => {
      let savedRecordings = data.savedRecordings || [];
      
      if (recordingIdInput.value) {
        savedRecordings = savedRecordings.map(recording => 
          recording.id === id ? {
            ...recording, 
            name: name,
            testerName: testerNameInput.value.trim(),
            environment: environmentInput.value.trim(),
            usLink: usLinkInput.value.trim(),
            testUrl: testUrlInput.value.trim(),
            prerequisites: prerequisitesInput.value.trim(),
          } : recording
        );
      } else {
        // C'est un nouvel enregistrement
        savedRecordings.push({
          id: id,
          name: name,
          date: new Date().toISOString(),
          events: currentRecording,
          testerName: testerNameInput.value.trim(),
          environment: environmentInput.value.trim(),
          usLink: usLinkInput.value.trim(),
          testUrl: testUrlInput.value.trim(),
          prerequisites: prerequisitesInput.value.trim(),
        });
      }
      
      // Sauvegarder dans le stockage
      chrome.storage.local.set({ savedRecordings: savedRecordings }, () => {
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
            <div style="font-size: 12px; margin-top: 5px;">
              <strong>Testeur:</strong> ${recording.testerName || 'N/A'} | 
              <strong>Env:</strong> ${recording.environment || 'N/A'} | 
            </div>
          </div>
          <div class="actions">
            <button class="secondary play-btn" data-id="${recording.id}">Jouer</button>
            <button class="secondary rename-btn" data-id="${recording.id}">Modifier</button>
            <button class="danger delete-btn" data-id="${recording.id}">Supprimer</button>
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
        loadSavedRecordings();
      });
    });
  }
  
  // Jouer un enregistrement
  function playRecording(recordingId) {
    chrome.storage.local.get(["savedRecordings"], (data) => {
      if (!data.savedRecordings) return;

      chrome.storage.local.set({ currentTestId: recordingId });
      
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


    // Attendre que le défilement soit terminé
  function waitForScrollToFinish() {
    return new Promise(resolve => {
      // Le défilement peut prendre un certain temps
      setTimeout(() => {
        // On attend un peu pour que le navigateur termine l'opération
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      }, 100);
    });
  }


  // Récupérer les événements enregistrés
  chrome.storage.local.get("events", (data) => {
    const events = data.events || [];
    
    if (!events || events.length === 0) {
      return;
    }
        
    const testResults = {
      success: true,
      eventsExecuted: 0,
      errors: [],
      startTime: Date.now(),
      duration: 0
    };

    let lastProcessedTimestamp = 0;
    // Fonction pour jouer chaque événement séquentiellement
    async function playEventSequentially(index) {
      if (index >= events.length) {
        testResults.duration = Date.now() - testResults.startTime;
        console.log("Test completed", testResults);
        chrome.runtime.sendMessage({ 
          action: "testCompleted", 
          results: testResults 
        });
        return;
      }

      testResults.eventsExecuted++;
      
      const event = events[index];
            
      if (event.timestamp === lastProcessedTimestamp) {
        console.warn("Événement déjà traité, ignoré");
        setTimeout(() => playEventSequentially(index + 1), 10);
        return;
      }
      lastProcessedTimestamp = event.timestamp;
      
      // Traiter différents types d'événements
      if (event.type === "scroll") {
        window.scrollTo(event.scrollX, event.scrollY);
        await waitForScrollToFinish();
      } 
      else if (event.type === "click") {
        window.scrollTo(event.scrollX, event.scrollY);
        await waitForScrollToFinish();
        
        // Utiliser les coordonnées client (viewport) pour trouver l'élément
        const elementAtPoint = document.elementFromPoint(event.pageX, event.pageY);
        
        if (elementAtPoint) {
          showClickVisual(event.pageX, event.pageY);

          const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          clientX: event.pageX,
          clientY: event.pageY
          });
          
          elementAtPoint.dispatchEvent(clickEvent);
        } else {
          console.warn(`No element found at position (${event.x}, ${event.y})`);
          testResults.success = false;
          testResults.errors.push({
            step: index,
            message: `No element found at position (${event.pageX}, ${event.pageY})`
          });
        }
        
        // Petite pause après le clic
        await new Promise(resolve => setTimeout(resolve, 300));
      }else if (event.type === "input") {
        // D'abord faire défiler la page à la position enregistrée
        window.scrollTo(event.scrollX, event.scrollY);
        await waitForScrollToFinish();
        
        // Trouver l'élément via le sélecteur
        const inputElement = document.querySelector(event.selector);
        
        if (inputElement) {
          // Mettre le focus sur l'élément
          inputElement.focus();
          
          // Définir sa valeur
          inputElement.value = event.value;
          
          // Déclencher les événements appropriés pour simuler une saisie réelle
          inputElement.dispatchEvent(new Event('input', { bubbles: true }));
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Pour les select, checkbox et radio qui nécessitent une logique spéciale
          if (event.inputType === 'checkbox' || event.inputType === 'radio') {
            inputElement.checked = event.value === 'true' || event.value === true;
          } else if (event.inputType === 'select-one' || event.inputType === 'select-multiple') {
            // Pour les éléments select
            Array.from(inputElement.options).forEach(option => {
              option.selected = event.value.includes(option.value);
            });
          }
          
          // Pause après la saisie
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        else {
          console.warn(`Input element not found for selector: ${event.selector}`);
          testResults.success = false;
          testResults.errors.push({
            step: index,
            message: `Input element not found for selector: ${event.selector}`
          });
        }
      }
      
      // Calculer le délai avant le prochain événement
      let delay = 0;
      if (index < events.length - 1) {
        delay = Math.max(100, events[index + 1].timestamp - event.timestamp);
      }
      
      // Passer au prochain événement après le délai
      setTimeout(() => playEventSequentially(index + 1), delay);
    }

    // Démarrer la séquence de lecture
    playEventSequentially(0);    

  });
}