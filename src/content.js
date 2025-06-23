console.log("Content script loaded and running!");
let clickListener = null;




// Fonction qui configure l'écouteur de clics
function setupClickListener() {
  console.log("Setting up click position listener");
  // Fonction pour afficher une indication visuelle du clic
  function showClickVisual(x, y) {
    // Créer l'élément visuel
    const visual = document.createElement('div');
    
    // Appliquer le style
    Object.assign(visual.style, {
      position: 'absolute',
      left: `${x - 15}px`,
      top: `${y - 15}px`,
      width: '30px',
      height: '30px',
      borderRadius: '50%',
      backgroundColor: 'rgba(0, 123, 255, 0.5)', // Bleu translucide
      pointerEvents: 'none', // Ne pas interférer avec les clics
      zIndex: '10000',
      transition: 'transform 0.5s, opacity 0.5s',
      transform: 'scale(0.1)',
      opacity: '1'
    });
    
    // Ajouter au DOM
    document.body.appendChild(visual);
    
    // Déclencher animation d'apparition
    setTimeout(() => {
      visual.style.transform = 'scale(1)';
    }, 10);
    
    // Faire disparaître puis supprimer
    setTimeout(() => {
      visual.style.opacity = '0';
      visual.style.transform = 'scale(1.5)';
      setTimeout(() => {
        document.body.removeChild(visual);
      }, 500);
    }, 500);
  }
  
  
  return function (e) {
    
    // Afficher l'effet visuel à l'endroit du clic
    showClickVisual(e.clientX, e.clientY);

    // Capturer les coordonnées du clic
    const clickData = {
      x: e.clientX,            // Position X relative à la fenêtre visible
      y: e.clientY,            // Position Y relative à la fenêtre visible
      pageX: e.pageX,          // Position X relative au document (utile pour le scrolling)
      pageY: e.pageY,          // Position Y relative au document
      scrollX: window.scrollX, // Position de défilement horizontal
      scrollY: window.scrollY, // Position de défilement vertical
      timestamp: Date.now(),
      windowWidth: window.innerWidth,  // Pour tenir compte du redimensionnement
      windowHeight: window.innerHeight
    };
    
    console.log("Click position detected:", clickData);
    
    chrome.runtime.sendMessage({ 
      action: "addClick", 
      clickData: clickData 
    }, response => {
      console.log("Click position recorded, response:", response);
    });
  };
}

// Écouter les changements de statut d'enregistrement
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log("Storage changes detected:", changes, "in namespace:", namespace);
  // Vérifier si le changement concerne l'enregistrement
  if (namespace === "local" && changes.recording) {
    console.log("Recording status changed:", changes.recording);
    if (changes.recording.newValue === true) {
      console.log("Recording started - adding click listener");
      clickListener = setupClickListener();  // Appel de la fonction ici
      document.addEventListener("click", clickListener);
    } else if (changes.recording.oldValue === true) {
      console.log("Recording stopped - removing click listener");
      if (clickListener) {
        document.removeEventListener("click", clickListener);
        clickListener = null;
      }
    }
  }
});

// Vérifier le statut d'enregistrement au chargement
chrome.storage.local.get("recording", ({ recording }) => {
  console.log("Content script loaded, recording status:", recording);
  if (recording) {
    clickListener = setupClickListener();  // Appel de la fonction ici
    document.addEventListener("click", clickListener);
  }
});


function replayClicks() {
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
            elementAtPoint.dispatchEvent(clickEvent);
          } else {
            console.warn(`No element found at position (${click.x}, ${click.y})`);
          }
        }, 100); // Petit délai après le scroll
      }, delay);
    });
  });
}