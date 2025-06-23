console.log("Content script loaded and running!");
let eventListeners = null;




function setupEventListeners() {
  console.log("Setting up all event listeners");

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
  
  // Handler pour les clics (code existant)
  const clickHandler = function(e) {
    // Afficher l'effet visuel à l'endroit du clic
    showClickVisual(e.clientX, e.clientY);
    
    const clickData = {
      type: "click",  // Ajouter un type d'événement pour distinguer les actions
      x: e.clientX,
      y: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      timestamp: Date.now(),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    };
    
    chrome.runtime.sendMessage({ 
      action: "addEvent", 
      eventData: clickData 
    });
  };
  
  // Nouveau handler pour les événements de défilement avec throttling
  let lastScrollTime = 0;
  let lastScrollPosition = { x: window.scrollX, y: window.scrollY };
  const scrollThrottle = 150; // Ms entre les enregistrements de défilement
  
  const scrollHandler = function() {
    const now = Date.now();
    const currentPosition = { x: window.scrollX, y: window.scrollY };
    
    // N'enregistrer que si suffisamment de temps s'est écoulé ET la position a changé
    if (now - lastScrollTime > scrollThrottle && 
        (currentPosition.x !== lastScrollPosition.x || 
         currentPosition.y !== lastScrollPosition.y)) {
      
      lastScrollTime = now;
      lastScrollPosition = currentPosition;
      
      const scrollData = {
        type: "scroll",  // Identifie le type d'événement
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        timestamp: now
      };
      
      console.log("Scroll recorded:", scrollData);
      
      chrome.runtime.sendMessage({ 
        action: "addEvent", 
        eventData: scrollData 
      });
    }
  };
  
  // Ajouter les écouteurs
  document.addEventListener("click", clickHandler);
  document.addEventListener("scroll", scrollHandler, { passive: true });
  
  // Retourner les handlers pour pouvoir les supprimer plus tard
  return {
    click: clickHandler,
    scroll: scrollHandler
  };
}

// Ajuster le code qui retire les écouteurs
if (eventListeners) {
  document.removeEventListener("click", eventListeners.click);
  document.removeEventListener("scroll", eventListeners.scroll);
  eventListeners = null;
}

// Écouter les changements de statut d'enregistrement
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log("Storage changes detected:", changes, "in namespace:", namespace);
  // Vérifier si le changement concerne l'enregistrement
  if (namespace === "local" && changes.recording) {
    console.log("Recording status changed:", changes.recording);
    if (changes.recording.newValue === true) {
      console.log("Recording started - adding event listeners");
      eventListeners = setupEventListeners();  // Appel à setupEventListeners() au lieu de setupClickListener()
    } else if (changes.recording.oldValue === true) {
      console.log("Recording stopped - removing event listeners");
      if (eventListeners) {
        document.removeEventListener("click", eventListeners.click);
        document.removeEventListener("scroll", eventListeners.scroll);
        eventListeners = null;
      }
    }
  }
});

// Vérifier le statut d'enregistrement au chargement
chrome.storage.local.get("recording", ({ recording }) => {
  console.log("Content script loaded, recording status:", recording);
  if (recording) {
    eventListeners = setupEventListeners();  // Appel à setupEventListeners() au lieu de setupClickListener()
  }
});
