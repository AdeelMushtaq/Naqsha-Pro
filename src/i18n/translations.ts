import { Language } from '../models/types';

export interface Translations {
  app: {
    title: string;
    subtitle: string;
    version: string;
    newProject: string;
    saveProject: string;
    savedAlert: string;
    exportPNG: string;
    exportPDF: string;
    exportJSON: string;
    importJSON: string;
    projectsList: string;
    shortcutsHelp: string;
    installApp: string;
  };
  tools: {
    select: string;
    selectDesc: string;
    pan: string;
    panDesc: string;
    box: string;
    boxDesc: string;
    circle: string;
    circleDesc: string;
    wall: string;
    wallDesc: string;
    curve_wall: string;
    curve_wallDesc: string;
    door: string;
    doorDesc: string;
    window: string;
    windowDesc: string;
    furniture: string;
    furnitureDesc: string;
    dimension: string;
    dimensionDesc: string;
    plot: string;
    plotDesc: string;
    text: string;
    textDesc: string;
    measure: string;
    measureDesc: string;
    stair: string;
    stairDesc: string;
    road: string;
    roadDesc: string;
    gate: string;
    gateDesc: string;
    obstacle: string;
    obstacleDesc: string;
    vehicle_check: string;
    vehicle_checkDesc: string;
  };
  properties: {
    title: string;
    noSelection: string;
    selectPrompt: string;
    type: string;
    name: string;
    label: string;
    length: string;
    width: string;
    height: string;
    thickness: string;
    radius: string;
    diameter: string;
    bulge: string;
    angle: string;
    offset: string;
    doorSwing: string;
    swingInsideLeft: string;
    swingInsideRight: string;
    swingOutsideLeft: string;
    swingOutsideRight: string;
    openAngle: string;
    area: string;
    perimeter: string;
    positionX: string;
    positionY: string;
    fillColor: string;
    strokeColor: string;
    deleteElement: string;
    duplicateElement: string;
    addDoorToWall: string;
    addWindowToWall: string;
    flipSwing: string;
  };
  canvas: {
    grid: string;
    snap: string;
    dimensions: string;
    unitFeet: string;
    unitInches: string;
    zoom: string;
    resetZoom: string;
    undo: string;
    redo: string;
    drawingHelpWall: string;
    drawingHelpBox: string;
    drawingHelpCircle: string;
    drawingHelpDoor: string;
    drawingHelpWindow: string;
    drawingHelpMeasure: string;
    emptyHintTitle: string;
    emptyHintDesc: string;
    emptyHintStart: string;
  };
  projects: {
    title: string;
    currentProject: string;
    projectName: string;
    createNew: string;
    enterName: string;
    createBtn: string;
    rename: string;
    delete: string;
    open: string;
    duplicate: string;
    lastUpdated: string;
    elementsCount: string;
    deleteConfirm: string;
  };
  shortcuts: {
    title: string;
    subtitle: string;
    selectTool: string;
    panTool: string;
    wallTool: string;
    boxTool: string;
    doorTool: string;
    undoRedo: string;
    deleteElem: string;
    snapOrthogonal: string;
    duplicateElem: string;
    close: string;
  };
  doorLabels: {
    standardDoor: string;
    doubleDoor: string;
    mainGate: string;
    bathroomDoor: string;
  };
  roomLabels: {
    bedroom: string;
    masterBedroom: string;
    kitchen: string;
    bathroom: string;
    livingRoom: string;
    diningRoom: string;
    lounge: string;
    drawingRoom: string;
    porch: string;
    verandah: string;
    lawn: string;
    balcony: string;
    stairs: string;
    store: string;
  };
  layers: {
    title: string;
    walls: string;
    doors_windows: string;
    furniture: string;
    dimensions: string;
    plot: string;
    notes: string;
    stairs: string;
    roads_access: string;
    lockAll: string;
    unlockAll: string;
    clickThrough: string;
  };
  stairs: {
    title: string;
    type: string;
    straight: string;
    lShape: string;
    uShape: string;
    spiral: string;
    winder: string;
    width: string;
    length: string;
    flight2Length: string;
    totalHeight: string;
    riser: string;
    tread: string;
    steps: string;
    landing: string;
    handrail: string;
    direction: string;
    up: string;
    down: string;
    flipDirection: string;
    advancedOptions: string;
    slabOpening: string;
    slabOpeningDesc: string;
    comfortTitle: string;
    comfortIdeal: string;
    comfortSteep: string;
    comfortNarrow: string;
    headroomWarning: string;
  };
  vehicleCheck: {
    title: string;
    subtitle: string;
    selectVehicle: string;
    verdictPass: string;
    verdictTight: string;
    verdictFail: string;
    gateClearance: string;
    sideClearance: string;
    overheadClearance: string;
    collisions: string;
    noCollisions: string;
    suggestions: string;
    autoPath: string;
    drawPath: string;
    manualDrive: string;
    play: string;
    pause: string;
    speed: string;
    allowFootpath: string;
    safetyMargin: string;
    savedChecks: string;
    saveCheck: string;
    exportReport: string;
    minGateWidthNeeded: string;
    minStreetWidthNeeded: string;
    multiPointRequired: string;
  };
  floors: {
    title: string;
    groundFloor: string;
    firstFloor: string;
    basement: string;
    addFloor: string;
    copyFloor: string;
    renameFloor: string;
    deleteFloor: string;
  };
  estimator: {
    title: string;
    wallHeight: string;
    brickSize: string;
    wastage: string;
    totalBricks: string;
    plasterArea: string;
    cementBags: string;
    sandCft: string;
    exportCSV: string;
    thickness: string;
    linearFt: string;
    grossArea: string;
    netArea: string;
  };
  library: {
    title: string;
    doors: string;
    windows: string;
    furniture: string;
    structural: string;
    plots: string;
    insert: string;
  };
  infoPanel: {
    title: string;
    plotArea: string;
    coveredArea: string;
    openArea: string;
    percentage: string;
    selectedArea: string;
    roomsCount: string;
    wallLength: string;
    doorsCount: string;
    windowsCount: string;
    detectRooms: string;
  };
  exportPro: {
    title: string;
    paperSize: string;
    scale: string;
    titleBlock: string;
    areaSchedule: string;
    exportPDF: string;
    exportDXF: string;
    exportSVG: string;
    printView: string;
  };
  junctions: {
    tJunction: string;
    join: string;
    joinDesc: string;
    splitOnly: string;
    splitOnlyDesc: string;
    cross: string;
    crossDesc: string;
    splitWallHere: string;
    joinWalls: string;
    mergeNodes: string;
    disconnectAtNode: string;
    trimIntoX: string;
    leaveCrossing: string;
    wallSplitToast: string;
    wallsJoinedToast: string;
    nodesMergedToast: string;
    disconnectedToast: string;
    cannotJoinThirdWall: string;
    cannotJoinNotCollinear: string;
    targetLockedWarning: string;
    undoBtn: string;
  };
}

export const translations: Record<Language, Translations> = {
  ur: {
    app: {
      title: 'نقشہ (Naqsha)',
      subtitle: 'Ghar Aur Imarat Ka 2D Floor Plan CAD',
      version: 'v1.0',
      newProject: 'Naya Naqsha',
      saveProject: 'Mehfooz Karein',
      savedAlert: 'Naqsha kamyabi se mehfooz hogaya!',
      exportPNG: 'Tasveer (PNG)',
      exportPDF: 'PDF Naqsha',
      exportJSON: 'File Download',
      importJSON: 'File Kholein',
      projectsList: 'Tamam Naqshay',
      shortcutsHelp: 'Shortcuts Aur Madad',
      installApp: 'App Install Karein',
    },
    tools: {
      select: 'Chuno',
      selectDesc: 'Cheez chunein, hilayein ya tabdeel karein',
      pan: 'Canvas Ghumayein',
      panDesc: 'Screen ko drag karke aage peechhe karein',
      box: 'Chaukor Kamra',
      boxDesc: 'Chaukor box ya kamra banayein',
      circle: 'Gol Kamra',
      circleDesc: 'Gol daira ya piller banayein',
      wall: 'Seedhi Deewar',
      wallDesc: 'Seedhi deewar khenchein ya size likhein',
      curve_wall: 'Gol Deewar',
      curve_wallDesc: 'Mudhne wali golaai wali deewar banayein',
      door: 'Darwaza',
      doorDesc: 'Deewar par darwaza lagayein',
      window: 'Khidki',
      windowDesc: 'Deewar par khidki lagayein',
      furniture: 'Saman / Library',
      furnitureDesc: 'Palang, sofa, mez, fixtures lagayein',
      dimension: 'Pamaish Line',
      dimensionDesc: 'Do points ke darmiyan permanent pamaish line',
      plot: 'Plot Hadbandi',
      plotDesc: 'Plot ki hadbandi (5 Marla, 10 Marla ya custom)',
      text: 'Tehreer / Note',
      textDesc: 'Naqshay par naam ya note likhein',
      measure: 'Pamaish Feeta',
      measureDesc: 'Do maqamat ke darmiyan faasla napein',
      stair: 'Seerhiyan (Stairs)',
      stairDesc: 'Parametric seedhiyan (Straight, L, U, Spiral) banayein',
      road: 'Sarak / Road',
      roadDesc: 'Plot ke bahar sarak aur footpath banayein',
      gate: 'Main Gate',
      gateDesc: 'Plot hadbandi deewar mein bara gate lagayein',
      obstacle: 'Rukawat (Obstacle)',
      obstacleDesc: 'Khamba, darakht, transformer ya lenter beam lagayein',
      vehicle_check: 'Gari Entry Check',
      vehicle_checkDesc: 'Gari ya baray container ka plot mein daakhla check karein',
    },
    properties: {
      title: 'Khusoosiyat (Properties)',
      noSelection: 'Koi cheez muntakhib nahi',
      selectPrompt: 'Canvas par kisi deewar, kamray ya darwazay par click karein.',
      type: 'Qisam',
      name: 'Naam / Label',
      label: 'Naam',
      length: 'Lambai (Length)',
      width: 'Chorai (Width)',
      height: 'Oonchai (Height)',
      thickness: 'Deewar Motai (Thickness)',
      radius: 'Nisf Qutar (Radius)',
      diameter: 'Qutar (Diameter)',
      bulge: 'Golaai (Bulge / Curve)',
      angle: 'Zavia (Angle)',
      offset: 'Deewar Se Faasla (Offset)',
      doorSwing: 'Khulnay Ka Rukh (Swing)',
      swingInsideLeft: 'Andar Baayein (In-Left)',
      swingInsideRight: 'Andar Daayein (In-Right)',
      swingOutsideLeft: 'Bahar Baayein (Out-Left)',
      swingOutsideRight: 'Bahar Daayein (Out-Right)',
      openAngle: 'Khulnay Ka Zavia (Angle)',
      area: 'Kul Raqba (Area)',
      perimeter: 'Kul Ghera (Perimeter)',
      positionX: 'Muqam X',
      positionY: 'Muqam Y',
      fillColor: 'Androni Rang (Fill)',
      strokeColor: 'Laker Ka Rang (Stroke)',
      deleteElement: 'Hatao (Delete)',
      duplicateElement: 'Naqal (Duplicate)',
      addDoorToWall: '+ Darwaza Lagayein',
      addWindowToWall: '+ Khidki Lagayein',
      flipSwing: 'Rukh Badlein',
    },
    canvas: {
      grid: 'Grid Jali',
      snap: 'Chapakna (Snap)',
      dimensions: 'Pamaish (Dimensions)',
      unitFeet: 'Foot (\')',
      unitInches: 'Inch (")',
      zoom: 'Zoom',
      resetZoom: '100% Reset',
      undo: 'Peechay (Undo)',
      redo: 'Aagay (Redo)',
      drawingHelpWall: 'Drag karein ya start aur end point par click karein. Shift dabayein seedhi line ke liye.',
      drawingHelpBox: 'Drag karke kamray ka size banayein.',
      drawingHelpCircle: 'Center se drag karke gol daira banayein.',
      drawingHelpDoor: 'Kisi deewar par click karein jahan darwaza lagana ho.',
      drawingHelpWindow: 'Kisi deewar par click karein jahan khidki lagani ho.',
      drawingHelpMeasure: 'Do points par click karein faasla napne ke liye.',
      emptyHintTitle: 'Naya Naqsha Shuru Karein',
      emptyHintDesc: 'Bayein janib tool chunein (Deewar, Chaukor ya Gol Kamra) aur canvas par draw karein.',
      emptyHintStart: 'Deewar Banayein (Wall)',
    },
    projects: {
      title: 'Aap Ke Naqshay (Projects)',
      currentProject: 'Mojooda Naqsha',
      projectName: 'Naqshay Ka Naam',
      createNew: 'Naya Naqsha Banayein',
      enterName: 'Naam darj karein (maslan: 5 Marla Ghar)',
      createBtn: 'Banayein',
      rename: 'Naam Badlein',
      delete: 'Delete',
      open: 'Kholein',
      duplicate: 'Copy Banayein',
      lastUpdated: 'Aakhri Tabdeeli',
      elementsCount: 'Cheezein',
      deleteConfirm: 'Kya aap waqai is naqshay ko delete karna chahte hain?',
    },
    shortcuts: {
      title: 'Keyboard Shortcuts Aur Rehnumai',
      subtitle: 'Naqsha banane ke tezi tareeqay',
      selectTool: 'V ya Esc: Chuno (Select Tool)',
      panTool: 'H ya Space dabaye rakhein: Canvas ghumayein',
      wallTool: 'W: Seedhi Deewar (Wall)',
      boxTool: 'R: Chaukor Kamra (Rectangle)',
      doorTool: 'D: Darwaza (Door)',
      undoRedo: 'Ctrl+Z: Wapis, Ctrl+Y: Dobara',
      deleteElem: 'Delete ya Backspace: Muntakhib cheez hatao',
      snapOrthogonal: 'Shift dabayein: 90/45 degree seedhi deewar',
      duplicateElem: 'Ctrl+D: Cheez ki copy banayein',
      close: 'Band Karein',
    },
    doorLabels: {
      standardDoor: 'Aam Darwaza (3ft)',
      doubleDoor: 'Double Darwaza (5ft)',
      mainGate: 'Main Gate (7ft)',
      bathroomDoor: 'Bath Darwaza (2.5ft)',
    },
    roomLabels: {
      bedroom: 'Kamra (Bedroom)',
      masterBedroom: 'Master Bedroom',
      kitchen: 'Bawarchikhana (Kitchen)',
      bathroom: 'Ghusalkhana (Bath)',
      livingRoom: 'Living Room',
      diningRoom: 'Dining Room',
      lounge: 'TV Lounge',
      drawingRoom: 'Drawing Room',
      porch: 'Car Porch',
      verandah: 'Baramda (Verandah)',
      lawn: 'Chaman (Lawn)',
      balcony: 'Balcony',
      stairs: 'Seedhiyan (Stairs)',
      store: 'Store Room',
    },
    layers: {
      title: 'Layers (Tabaqaat)',
      walls: 'Deewarain (Walls)',
      doors_windows: 'Darwazay / Khidkiyan',
      furniture: 'Saman / Furniture',
      dimensions: 'Pamaish (Dimensions)',
      plot: 'Plot Hadbandi',
      notes: 'Tehreer / Notes',
      stairs: 'Seerhiyan (Stairs)',
      roads_access: 'Sarak Aur Rasta (Roads)',
      lockAll: 'Sab Lock Karein',
      unlockAll: 'Sab Unlock Karein',
      clickThrough: 'Locked cheezon par click na rokein',
    },
    stairs: {
      title: 'Seerhiyan (Stairs Tool)',
      type: 'Stair Qisam',
      straight: 'Seedhi (Straight)',
      lShape: 'L-Shaped (Landing)',
      uShape: 'U-Shaped (Dog-legged)',
      spiral: 'Gol Chakar (Spiral)',
      winder: 'Mudhne Wali (Winder)',
      width: 'Seerhi Chorai (Width)',
      length: 'Pehli Flight Lambai',
      flight2Length: 'Doosri Flight Lambai',
      totalHeight: 'Kul Unchayi (Total Height)',
      riser: 'Riser Oonchai (Riser)',
      tread: 'Kadam Rakhne Ki Jagah (Tread)',
      steps: 'Steps Tadaad',
      landing: 'Chauki (Landing Size)',
      handrail: 'Jungla / Railing',
      direction: 'Rukh (Direction)',
      up: 'Upar (UP)',
      down: 'Neechay (DN)',
      flipDirection: 'Rukh Ulat Karein (Flip)',
      advancedOptions: 'Mazeed Ikhtiyarat (More options)',
      slabOpening: 'Chhat Mein Katao (Slab Opening)',
      slabOpeningDesc: 'Ooper wali manzil ki chhat mein seerhi ka cut banayein',
      comfortTitle: 'Comfort Aur Building Code Jaiza',
      comfortIdeal: 'Munisib aur aaram-deh seerhi',
      comfortSteep: 'Bohat khari seerhi (> 7.5") — charhna mushkil hoga',
      comfortNarrow: 'Tang tread (< 9") — phisal sakti hai',
      headroomWarning: 'Chhat ke neeche sar takrane ka khatra (< 6ft 8in)',
    },
    vehicleCheck: {
      title: 'Gari / Large Object Entry Check',
      subtitle: 'Sarak se plot gate mein gari ka daakhla check karein',
      selectVehicle: 'Gari / Preset Chunein',
      verdictPass: 'Ja sakti hai',
      verdictTight: 'Tang hai, bohat kam jagah',
      verdictFail: 'Nahi ja sakti',
      gateClearance: 'Gate Par Khuli Jagah',
      sideClearance: 'Deewaron Se Faasla',
      overheadClearance: 'Ooper Se Khuli Jagah',
      collisions: 'Takrao Points (Collisions)',
      noCollisions: 'Koi takrao nahi mila!',
      suggestions: 'Tajveezat Aur Hal (Recommendations)',
      autoPath: 'Auto Path (Khudkaar Rasta)',
      drawPath: 'Rasta Khenchein (Draw Path)',
      manualDrive: 'Haath Se Drive Karein (Manual)',
      play: 'Chalao',
      pause: 'Roko',
      speed: 'Raftaar',
      allowFootpath: 'Footpath Ke Upar Chalne Ki Ijazat',
      safetyMargin: 'Hifazati Margin (Safety Margin)',
      savedChecks: 'Mehfooz Shuda Jaizay',
      saveCheck: 'Jaiza Save Karein',
      exportReport: 'Access Report PDF',
      minGateWidthNeeded: 'Kam az kam gate chorai darkar',
      minStreetWidthNeeded: 'Kam az kam sarak chorai darkar',
      multiPointRequired: 'Multi-point turn ya reverse darkar hai',
    },
    floors: {
      title: 'Manzilein (Floors)',
      groundFloor: 'Ground Floor',
      firstFloor: 'Pehli Manzil (First Floor)',
      basement: 'Tehkhana (Basement)',
      addFloor: '+ Nayi Manzil',
      copyFloor: 'Is Manzil Ki Copy',
      renameFloor: 'Naam Badlein',
      deleteFloor: 'Manzil Delete Karein',
    },
    estimator: {
      title: 'Thekedar Estimation (Materials)',
      wallHeight: 'Deewar Ki Oonchai (Foot)',
      brickSize: 'Eent Ka Size (Inches)',
      wastage: 'Zaya Hone Ka Tanazub (Wastage %)',
      totalBricks: 'Kul Eentein (Bricks)',
      plasterArea: 'Plaster Ka Raqba (Sq Ft)',
      cementBags: 'Cement Ki Boriyan (Bags)',
      sandCft: 'Ret (Sand Cft)',
      exportCSV: 'Excel / CSV Download',
      thickness: 'Motai',
      linearFt: 'Lambai (Ft)',
      grossArea: 'Kul Raqba (Sq Ft)',
      netArea: 'Saaf Raqba (Sq Ft)',
    },
    library: {
      title: 'CAD Library (Standard Saman)',
      doors: 'Darwazay',
      windows: 'Khidkiyan',
      furniture: 'Furniture / Fixtures',
      structural: 'Pillars, Stairs & Beams',
      plots: 'Standard Plots (3, 5, 10 Marla)',
      insert: 'Canvas Par Lagayein',
    },
    infoPanel: {
      title: 'Live Raqba Aur Pamaish',
      plotArea: 'Kul Plot Ka Raqba',
      coveredArea: 'Covered Area (Chhat)',
      openArea: 'Khula Raqba (Open Space)',
      percentage: 'Istemal Shuda Raqba %',
      selectedArea: 'Muntakhib Cheez Ka Raqba',
      roomsCount: 'Kamray',
      wallLength: 'Kul Deewar Ki Lambai',
      doorsCount: 'Darwazay',
      windowsCount: 'Khidkiyan',
      detectRooms: 'Kamray Auto-Detect Karein',
    },
    exportPro: {
      title: 'Professional Print & Export',
      paperSize: 'Kaghaz Ka Size',
      scale: 'Pamaish Scale (1:50, 1:100)',
      titleBlock: 'Title Block (Naam, Tareekh, Malik)',
      areaSchedule: 'Kamron Ke Raqbay Ka Table',
      exportPDF: 'Architectural PDF',
      exportDXF: 'AutoCAD DXF File',
      exportSVG: 'Vector SVG File',
      printView: 'Print Ready View',
    },
    junctions: {
      tJunction: 'T-Junction ⊥',
      join: 'Jorein',
      joinDesc: 'Shared node se jorein [J]',
      splitOnly: 'Todein',
      splitOnlyDesc: 'Bina jode deewar ko do hisson mein todein [S]',
      cross: 'Cross',
      crossDesc: 'Bina jode upar se guzar jayein [X]',
      splitWallHere: 'Deewar yahan todein',
      joinWalls: 'Deewarain jorein',
      mergeNodes: 'Nodes ko milayein',
      disconnectAtNode: 'Node se alag karein',
      trimIntoX: 'Trim karke X-junction banayein',
      leaveCrossing: 'Crossing rehne dein',
      wallSplitToast: 'Deewar tod di gayi',
      wallsJoinedToast: 'Deewarain jor di gayin',
      nodesMergedToast: 'Nodes mil gaye',
      disconnectedToast: 'Deewar node se alag kardi gayi',
      cannotJoinThirdWall: 'Deewarain nahi jor sakte: teesri deewar judi hui hai',
      cannotJoinNotCollinear: 'Deewarain seedhi / barabar motai ki nahi hain',
      targetLockedWarning: 'Nishana deewar band (locked) hai',
      undoBtn: 'Wapas (Undo)',
    },
  },
  en: {
    app: {
      title: 'Naqsha CAD',
      subtitle: '2D Architectural Floor Plan Designer',
      version: 'v1.0',
      newProject: 'New Plan',
      saveProject: 'Save Plan',
      savedAlert: 'Floor plan saved successfully!',
      exportPNG: 'Export PNG',
      exportPDF: 'Export PDF',
      exportJSON: 'Export JSON',
      importJSON: 'Import JSON',
      projectsList: 'All Projects',
      shortcutsHelp: 'Shortcuts & Help',
      installApp: 'Install App',
    },
    tools: {
      select: 'Select',
      selectDesc: 'Select, move, resize or rotate elements',
      pan: 'Pan Canvas',
      panDesc: 'Drag canvas to reposition the view',
      box: 'Rectangle Room',
      boxDesc: 'Draw rectangular room or boundary box',
      circle: 'Circle Room',
      circleDesc: 'Draw circular room or column',
      wall: 'Straight Wall',
      wallDesc: 'Draw straight wall with custom thickness',
      curve_wall: 'Curved Wall',
      curve_wallDesc: 'Draw arc wall with curve amount control',
      door: 'Door',
      doorDesc: 'Attach door to wall with swing arc',
      window: 'Window',
      windowDesc: 'Attach architectural window to wall',
      furniture: 'Furniture / Library',
      furnitureDesc: 'Place beds, sofas, tables, stairs, columns & fixtures',
      dimension: 'Dimension Line',
      dimensionDesc: 'Draw permanent measurement line between points',
      plot: 'Plot Boundary',
      plotDesc: 'Draw or preset cadastral plot boundary (Marla / Kanal)',
      text: 'Text / Note',
      textDesc: 'Add architectural labels and room notes',
      measure: 'Measure Tape',
      measureDesc: 'Measure distance between any two points',
      stair: 'Stairs',
      stairDesc: 'Parametric stairs (Straight, L-shape, U-shape, Spiral, Winder)',
      road: 'Street / Road',
      roadDesc: 'Draw access roads and streets outside plot',
      gate: 'Plot Gate',
      gateDesc: 'Add gate with clear opening and posts to plot wall',
      obstacle: 'Obstacle',
      obstacleDesc: 'Add electric pole, tree, wire, beam, or neighbor wall',
      vehicle_check: 'Vehicle Check',
      vehicle_checkDesc: 'Check whether vehicle or large trailer can enter plot gate',
    },
    properties: {
      title: 'Properties',
      noSelection: 'No element selected',
      selectPrompt: 'Click any wall, room box, door or window on the canvas.',
      type: 'Element Type',
      name: 'Name / Label',
      label: 'Label',
      length: 'Length',
      width: 'Width',
      height: 'Height',
      thickness: 'Wall Thickness',
      radius: 'Radius',
      diameter: 'Diameter',
      bulge: 'Bulge / Curve Offset',
      angle: 'Angle',
      offset: 'Offset Along Wall',
      doorSwing: 'Door Swing Direction',
      swingInsideLeft: 'Inside Left',
      swingInsideRight: 'Inside Right',
      swingOutsideLeft: 'Outside Left',
      swingOutsideRight: 'Outside Right',
      openAngle: 'Swing Open Angle',
      area: 'Total Area',
      perimeter: 'Total Perimeter',
      positionX: 'Position X',
      positionY: 'Position Y',
      fillColor: 'Fill Color',
      strokeColor: 'Stroke Color',
      deleteElement: 'Delete Element',
      duplicateElement: 'Duplicate',
      addDoorToWall: '+ Add Door to Wall',
      addWindowToWall: '+ Add Window to Wall',
      flipSwing: 'Flip Swing',
    },
    canvas: {
      grid: 'Grid',
      snap: 'Snap',
      dimensions: 'Dimensions',
      unitFeet: 'Feet (\')',
      unitInches: 'Inches (")',
      zoom: 'Zoom',
      resetZoom: 'Reset View',
      undo: 'Undo',
      redo: 'Redo',
      drawingHelpWall: 'Click and drag to draw wall. Hold Shift for orthogonal snap.',
      drawingHelpBox: 'Click and drag to create room box.',
      drawingHelpCircle: 'Click center and drag outward for circle.',
      drawingHelpDoor: 'Click on any wall to place a door.',
      drawingHelpWindow: 'Click on any wall to place a window.',
      drawingHelpMeasure: 'Click two points to measure distance.',
      emptyHintTitle: 'Start Your Floor Plan',
      emptyHintDesc: 'Select a tool from the left toolbar (Wall, Box Room, or Circle) and draw on the canvas.',
      emptyHintStart: 'Draw Wall',
    },
    projects: {
      title: 'Your Floor Plans',
      currentProject: 'Active Project',
      projectName: 'Project Name',
      createNew: 'Create New Project',
      enterName: 'Enter plan name (e.g. 5 Marla House Plan)',
      createBtn: 'Create Plan',
      rename: 'Rename',
      delete: 'Delete',
      open: 'Open Plan',
      duplicate: 'Duplicate Plan',
      lastUpdated: 'Last Updated',
      elementsCount: 'Elements',
      deleteConfirm: 'Are you sure you want to delete this project?',
    },
    shortcuts: {
      title: 'Keyboard Shortcuts & Guide',
      subtitle: 'Speed up your drafting workflow',
      selectTool: 'V or Esc: Select Tool',
      panTool: 'H or Hold Space: Pan Canvas',
      wallTool: 'W: Straight Wall',
      boxTool: 'R: Rectangle Box',
      doorTool: 'D: Door',
      undoRedo: 'Ctrl+Z: Undo, Ctrl+Y / Ctrl+Shift+Z: Redo',
      deleteElem: 'Delete / Backspace: Remove selected element',
      snapOrthogonal: 'Hold Shift: Orthogonal lock (0°, 45°, 90°)',
      duplicateElem: 'Ctrl+D: Duplicate selected element',
      close: 'Close',
    },
    doorLabels: {
      standardDoor: 'Standard Door (3ft)',
      doubleDoor: 'Double Door (5ft)',
      mainGate: 'Main Gate (7ft)',
      bathroomDoor: 'Bath Door (2.5ft)',
    },
    roomLabels: {
      bedroom: 'Bedroom',
      masterBedroom: 'Master Bedroom',
      kitchen: 'Kitchen',
      bathroom: 'Bathroom',
      livingRoom: 'Living Room',
      diningRoom: 'Dining Room',
      lounge: 'TV Lounge',
      drawingRoom: 'Drawing Room',
      porch: 'Car Porch',
      verandah: 'Verandah',
      lawn: 'Lawn',
      balcony: 'Balcony',
      stairs: 'Stairs',
      store: 'Store Room',
    },
    layers: {
      title: 'Layers',
      walls: 'Walls',
      doors_windows: 'Doors & Windows',
      furniture: 'Furniture & Fixtures',
      dimensions: 'Dimensions',
      plot: 'Plot Boundary',
      notes: 'Notes & Text',
      stairs: 'Stairs',
      roads_access: 'Roads & Access',
      lockAll: 'Lock All',
      unlockAll: 'Unlock All',
      clickThrough: 'Click-through locked elements',
    },
    stairs: {
      title: 'Stairs Tool',
      type: 'Stair Type',
      straight: 'Straight Flight',
      lShape: 'L-Shape (with Landing)',
      uShape: 'U-Shape (Dog-legged)',
      spiral: 'Spiral Stair',
      winder: 'Winder (Quarter-turn)',
      width: 'Stair Width',
      length: 'Primary Flight Run',
      flight2Length: 'Second Flight Run',
      totalHeight: 'Total Floor-to-Floor Height',
      riser: 'Riser Height',
      tread: 'Tread Depth',
      steps: 'Steps Count',
      landing: 'Landing Size',
      handrail: 'Handrail',
      direction: 'Direction',
      up: 'UP',
      down: 'DOWN',
      flipDirection: 'Flip Direction',
      advancedOptions: 'More options',
      slabOpening: 'Cut Upper Floor Slab Opening',
      slabOpeningDesc: 'Create cutout opening in the upper floor slab for staircase headroom',
      comfortTitle: 'Comfort & Building Code Check',
      comfortIdeal: 'Ideal and comfortable step geometry',
      comfortSteep: 'Riser too steep (> 7.5 in) — climbing will be tiring',
      comfortNarrow: 'Tread too narrow (< 9 in) — slipping risk',
      headroomWarning: 'Headroom below code limit (< 6 ft 8 in / 80 in)',
    },
    vehicleCheck: {
      title: 'Vehicle / Large Object Entry Check',
      subtitle: 'Simulate vehicle swept path from road into plot gate to verify clear access',
      selectVehicle: 'Select Vehicle / Preset',
      verdictPass: 'Ja sakti hai (Pass)',
      verdictTight: 'Tang hai, bohat kam jagah (Tight)',
      verdictFail: 'Nahi ja sakti (Collision)',
      gateClearance: 'Gate Clear Opening',
      sideClearance: 'Side Wall Clearance',
      overheadClearance: 'Overhead Clearance',
      collisions: 'Collisions',
      noCollisions: 'No collisions detected!',
      suggestions: 'Architectural Recommendations',
      autoPath: 'Auto Path',
      drawPath: 'Draw Path',
      manualDrive: 'Manual Drive',
      play: 'Play',
      pause: 'Pause',
      speed: 'Speed',
      allowFootpath: 'Allow Driving on Footpath',
      safetyMargin: 'Safety Clearance Margin',
      savedChecks: 'Saved Entry Checks',
      saveCheck: 'Save Check',
      exportReport: 'Export Access Report PDF',
      minGateWidthNeeded: 'Minimum gate width needed',
      minStreetWidthNeeded: 'Minimum street width needed',
      multiPointRequired: 'Reverse / 3-point turn required',
    },
    floors: {
      title: 'Floors',
      groundFloor: 'Ground Floor',
      firstFloor: 'First Floor',
      basement: 'Basement',
      addFloor: '+ Add Floor',
      copyFloor: 'Duplicate Current Floor',
      renameFloor: 'Rename Floor',
      deleteFloor: 'Delete Floor',
    },
    estimator: {
      title: 'Contractor Material Estimator',
      wallHeight: 'Wall Height (ft)',
      brickSize: 'Brick Size (inches)',
      wastage: 'Wastage Allowance (%)',
      totalBricks: 'Total Bricks',
      plasterArea: 'Plaster Area (sq ft)',
      cementBags: 'Cement Bags',
      sandCft: 'Sand (cft)',
      exportCSV: 'Download CSV / Excel',
      thickness: 'Thickness',
      linearFt: 'Length (ft)',
      grossArea: 'Gross Area (sq ft)',
      netArea: 'Net Area (sq ft)',
    },
    library: {
      title: 'CAD Standard Library',
      doors: 'Doors',
      windows: 'Windows',
      furniture: 'Furniture & Fixtures',
      structural: 'Columns, Stairs & Beams',
      plots: 'Standard Plots (3, 5, 10 Marla, 1 Kanal)',
      insert: 'Insert to Canvas',
    },
    infoPanel: {
      title: 'Live Space & Measurements',
      plotArea: 'Total Plot Area',
      coveredArea: 'Covered Area',
      openArea: 'Open Space',
      percentage: 'Plot Utilized %',
      selectedArea: 'Selected Object Area',
      roomsCount: 'Rooms',
      wallLength: 'Total Wall Length',
      doorsCount: 'Doors',
      windowsCount: 'Windows',
      detectRooms: 'Detect Rooms',
    },
    exportPro: {
      title: 'Professional Print & Export',
      paperSize: 'Paper Size',
      scale: 'Architectural Scale',
      titleBlock: 'Title Block & Stamp',
      areaSchedule: 'Room Area Schedule Table',
      exportPDF: 'Architectural PDF',
      exportDXF: 'AutoCAD DXF File',
      exportSVG: 'Vector SVG File',
      printView: 'Print Ready View',
    },
    junctions: {
      tJunction: 'T-Junction ⊥',
      join: 'Join',
      joinDesc: 'Connect with shared node [J]',
      splitOnly: 'Split only',
      splitOnlyDesc: 'Cut target wall without connecting [S]',
      cross: 'Cross',
      crossDesc: 'Pass over without connecting [X]',
      splitWallHere: 'Split wall here',
      joinWalls: 'Join walls',
      mergeNodes: 'Merge nodes',
      disconnectAtNode: 'Disconnect at node',
      trimIntoX: 'Trim into X junction',
      leaveCrossing: 'Leave crossing',
      wallSplitToast: 'Wall split',
      wallsJoinedToast: 'Walls joined',
      nodesMergedToast: 'Nodes merged',
      disconnectedToast: 'Wall disconnected from node',
      cannotJoinThirdWall: 'Cannot join: a 3rd wall is connected at this joint',
      cannotJoinNotCollinear: 'Walls are not collinear or have different thickness',
      targetLockedWarning: 'Target wall is locked',
      undoBtn: 'Undo',
    },
  },
};
