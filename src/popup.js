document.addEventListener('DOMContentLoaded', () => {
  document.getElementById("start").addEventListener("click", () => {
    console.log("Requesting to start recording");
    chrome.runtime.sendMessage({ action: "startRecording" }, (response) => {
      console.log("Start recording response:", response);
    });
  });

  document.getElementById("stop").addEventListener("click", () => {
    console.log("Requesting to stop recording");
    chrome.runtime.sendMessage({ action: "stopRecording" }, (response) => {
      console.log("Stop recording response:", response);
    });
  });

  document.getElementById("replay").addEventListener("click", () => {
    console.log("Replaying clicks");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        function: replayClicks
      });
    });
  });
});


// Fonction isolée pour la lecture des clics - reste identique
function replayClicks() {
  // Ajoutez la fonction showClickVisual() aussi dans cette fonction
  function showClickVisual(x, y) {
    // Le même code que dans content.js
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

  chrome.storage.local.get("clicks", (data) => {
    const clicks = data.clicks || [];
    console.log(`Replaying ${clicks.length} click positions`);
    
    if (!clicks || clicks.length === 0) {
      console.log("No clicks to replay");
      return;
    }
    
    const baseTime = clicks[0].timestamp;
    
    clicks.forEach((click) => {
      const delay = click.timestamp - baseTime;
      
      setTimeout(() => {
        // Rétablir la position de défilement
        window.scrollTo(click.scrollX, click.scrollY);
        
        // Petit délai pour laisser le temps au défilement
        setTimeout(() => {
          // Créer un événement de clic aux coordonnées enregistrées
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: click.x,
            clientY: click.y
          });
          
          // Obtenir l'élément à la position du clic
          const elementAtPoint = document.elementFromPoint(click.x, click.y);
          
          if (elementAtPoint) {
            console.log(`Clicking at position (${click.x}, ${click.y}) on element:`, elementAtPoint);
            // Afficher l'effet visuel pendant la lecture
            showClickVisual(click.x, click.y);
            elementAtPoint.dispatchEvent(clickEvent);
          } else {
            console.warn(`No element found at position (${click.x}, ${click.y})`);
          }
        }, 100); // Petit délai après le scroll
      }, delay);
    });
  });
}