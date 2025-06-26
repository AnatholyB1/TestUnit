let eventListeners = null;




function setupEventListeners() {

  function showClickVisual(x, y) {
    // Créer l'élément visuel
    const visual = document.createElement('div')
    
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
    
  // Variable pour le débounce
  let lastClickTime = 0;
  const debounceTime = 10; // millisecondes
  
  // Handler pour les clics (code existant)
  const clickHandler = function (e) {
    
    const now = Date.now();
    
    // Ignorer les clics trop rapprochés dans le temps
    if (now - lastClickTime < debounceTime) {
      return;
    }
    lastClickTime = now;
        
    const currentClientX = e.pageX 
    const currentClientY = e.pageY 

    // Afficher l'effet visuel à l'endroit du clic
    showClickVisual(currentClientX, currentClientY);
    
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
      
      chrome.runtime.sendMessage({ 
        action: "addEvent", 
        eventData: scrollData 
      });
    }
  };

  // Handler pour les événements de saisie
  const inputHandler = function(e) {
    // Ne traiter que les événements des éléments qui acceptent la saisie
    if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
      return;
    }
    
    let value = e.target.value;
    let inputType = e.target.type || 'text';
    
    // Créer un sélecteur pour identifier l'élément
    let selector = getElementSelector(e.target);
    
    const inputData = {
      type: "input",
      selector: selector,
      value: value,
      inputType: inputType,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      timestamp: Date.now()
    };
 
    // Envoyer les données au background script
    chrome.runtime.sendMessage({
      action: "addEvent",
      eventData: inputData
    });
  };

  // Fonction pour créer un sélecteur CSS unique pour l'élément
  function getElementSelector(element) {
    // Stratégie 1: Utiliser l'ID s'il existe
    if (element.id) {
      return `#${element.id}`;
    }
    
    // Stratégie 2: Utiliser le nom s'il existe (pour les formulaires)
    if (element.name) {
      return `${element.tagName.toLowerCase()}[name="${element.name}"]`;
    }
    
    // Stratégie 3: Construire un chemin avec des sélecteurs nth-child
    let path = [];
    let currentElement = element;
    
    while (currentElement && currentElement !== document.body) {
      // Déterminer la position de l'élément parmi ses frères
      let position = 1;
      let sibling = currentElement.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === currentElement.tagName) {
          position++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      path.unshift(`${currentElement.tagName.toLowerCase()}:nth-of-type(${position})`);
      currentElement = currentElement.parentElement;
    }
    
    return path.join(' > ');
  }

  // Ajouter les écouteurs d'événements
  document.addEventListener("input", inputHandler, { passive: true });
  document.addEventListener("change", inputHandler, { passive: true }); // Pour les select, checkbox, radio
  document.addEventListener("click", clickHandler, { capture: true });
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
  // Vérifier si le changement concerne l'enregistrement
  if (namespace === "local" && changes.recording) {
    if (changes.recording.newValue === true) {
      eventListeners = setupEventListeners();  // Appel à setupEventListeners() au lieu de setupClickListener()
    } else if (changes.recording.oldValue === true) {
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
  if (recording) {
    eventListeners = setupEventListeners();  // Appel à setupEventListeners() au lieu de setupClickListener()
  }
});
