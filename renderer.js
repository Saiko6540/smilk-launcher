// Modpacks Details Mapping
const packDetails = {
  stranded_at_sea: {
    title: 'Create: Stranded at sea',
    description: 'An epic oceanic survival adventure built around the Create mod. Automate massive machinery and systems in the middle of a vast waterworld.',
    mcVersion: '1.20.1',
    loader: 'Fabric-0.15.11',
    serverIp: '185.206.149.27:25601'
  },
  create_new_world: {
    title: 'Create: New World',
    description: 'Explore a boundless new world of engineering and automation powered by the Create mod. Construct massive automated factories, ingenious contraptions, and conquer new horizons.',
    mcVersion: '1.21.1',
    loader: 'NeoForge-21.1.248',
    serverIp: '185.206.149.27:25601'
  },
  cobblemon: {
    title: 'Cobblemon',
    description: 'Catch them all in Minecraft! A fully integrated Pokemon experience, with high quality animations, custom battles, and modern style.',
    mcVersion: '1.20.1',
    loader: 'Fabric-0.15.11',
    serverIp: '185.206.149.27:25601'
  }
};

// UI Elements
const winMinimizeBtn = document.getElementById('win-minimize');
const winMaximizeBtn = document.getElementById('win-maximize');
const winCloseBtn = document.getElementById('win-close');

const packTitleEl = document.getElementById('pack-title');

const packDescEl = document.getElementById('pack-description');
const statMcVerEl = document.getElementById('stat-mc-ver');
const statLoaderEl = document.getElementById('stat-loader');
const statLocalVerEl = document.getElementById('stat-local-ver');

const playBtn = document.getElementById('play-btn');
const btnText = document.getElementById('btn-text');
const progressContainer = document.getElementById('download-progress-container');
const progressFill = document.getElementById('progress-fill');
const progressStatus = document.getElementById('progress-status');
const progressPercentage = document.getElementById('progress-percentage');
const modeBadge = document.getElementById('mode-badge');

const serverStatusDot = document.getElementById('server-status-dot');
const serverStatusText = document.getElementById('server-status-text');

const usernameInput = document.getElementById('username-input');
const avatarPreview = document.getElementById('avatar-preview');

// Settings Modal Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const modalClose = document.getElementById('modal-close');
const settingsNickname = document.getElementById('settings-nickname');
const settingsRam = document.getElementById('settings-ram');
const ramValueLabel = document.getElementById('ram-value');
const settingsJava = document.getElementById('settings-java');
const browseJavaBtn = document.getElementById('browse-java-btn');
const settingsArgs = document.getElementById('settings-args');
const settingsMock = document.getElementById('settings-mock');
const settingsSaveBtn = document.getElementById('settings-save');
const settingsResetBtn = document.getElementById('settings-reset-btn');
const settingsClearBtn = document.getElementById('settings-clear-btn');
const openInstancesBtn = document.getElementById('open-instances-btn');
const packSettingsModal = document.getElementById('pack-settings-modal');
const packSettingsTitle = document.getElementById('pack-settings-title');
const packSettingsClose = document.getElementById('pack-settings-close');
const packSettingsShaders = document.getElementById('pack-settings-shaders');
const packShadersActions = document.getElementById('pack-shaders-actions');
const packOpenShadersBtn = document.getElementById('pack-open-shaders-btn');
const packDownloadShadersLink = document.getElementById('pack-download-shaders-link');
const packShadersHelpBtn = document.getElementById('pack-shaders-help-btn');
const shadersHelpPanel = document.getElementById('shaders-help-panel');
const shadersDropzone = document.getElementById('shaders-dropzone');
const shadersDropzoneStatus = document.getElementById('shaders-dropzone-status');
const installedShadersContainer = document.getElementById('installed-shaders-container');
const installedShadersList = document.getElementById('installed-shaders-list');
const tabBtnAddons = document.getElementById('tab-btn-addons');
const tabBtnOptions = document.getElementById('tab-btn-options');
const tabPanelAddons = document.getElementById('tab-panel-addons');
const tabPanelOptions = document.getElementById('tab-panel-options');
const optRender = document.getElementById('opt-render');
const optRenderVal = document.getElementById('opt-render-val');
const optFov = document.getElementById('opt-fov');
const optFovVal = document.getElementById('opt-fov-val');
const optSensitivity = document.getElementById('opt-sensitivity');
const optSensitivityVal = document.getElementById('opt-sensitivity-val');
const optGuiScale = document.getElementById('opt-gui-scale');
const optGuiScaleVal = document.getElementById('opt-gui-scale-val');
const optFps = document.getElementById('opt-fps');
const optFpsVal = document.getElementById('opt-fps-val');
const optMaster = document.getElementById('opt-master');
const optMasterVal = document.getElementById('opt-master-val');
const optMusic = document.getElementById('opt-music');
const optMusicVal = document.getElementById('opt-music-val');
const optVsync = document.getElementById('opt-vsync');
const optFullscreen = document.getElementById('opt-fullscreen');
const resourcepacksList = document.getElementById('resourcepacks-list');
const optSettingsFieldsWrapper = document.getElementById('opt-settings-fields-wrapper');
const optNotInstalledMessage = document.getElementById('opt-not-installed-message');
const packSettingsSave = document.getElementById('pack-settings-save');

// Website & Debug Buttons
const websiteBtn = document.getElementById('website-btn');
const debugBtn = document.getElementById('debug-btn');

// Custom Modal Dialog System
const customDialogModal = document.getElementById('custom-dialog-modal');
const customDialogTitle = document.getElementById('custom-dialog-title');
const customDialogIcon = document.getElementById('custom-dialog-icon');
const customDialogDesc = document.getElementById('custom-dialog-desc');
const customDialogCancel = document.getElementById('custom-dialog-cancel');
const customDialogConfirm = document.getElementById('custom-dialog-confirm');
const customDialogClose = document.getElementById('custom-dialog-close');

function showCustomDialog(options) {
  return new Promise((resolve) => {
    if (!customDialogModal) return resolve(false);

    customDialogTitle.textContent = options.title || 'Notification';
    customDialogDesc.textContent = options.message || '';
    
    // Set theme and icon
    customDialogTitle.style.color = '#fff';
    customDialogConfirm.style.background = 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)';
    if (options.type === 'error') {
      customDialogTitle.style.color = '#ff4757';
      customDialogIcon.textContent = '❌';
      customDialogIcon.style.filter = 'drop-shadow(0 0 15px rgba(255, 71, 87, 0.45))';
      customDialogConfirm.style.background = 'linear-gradient(135deg, #ff4757 0%, #ff6b81 100%)';
    } else if (options.type === 'warning') {
      customDialogTitle.style.color = '#ffa502';
      customDialogIcon.textContent = '⚠️';
      customDialogIcon.style.filter = 'drop-shadow(0 0 15px rgba(255, 165, 2, 0.45))';
      customDialogConfirm.style.background = 'linear-gradient(135deg, #ffa502 0%, #ff7f50 100%)';
    } else if (options.type === 'success') {
      customDialogTitle.style.color = '#2cd63b';
      customDialogIcon.textContent = '✅';
      customDialogIcon.style.filter = 'drop-shadow(0 0 15px rgba(44, 214, 59, 0.45))';
      customDialogConfirm.style.background = 'linear-gradient(135deg, #2cd63b 0%, #218c32 100%)';
    } else {
      customDialogIcon.textContent = '💬';
      customDialogIcon.style.filter = 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.2))';
    }

    // Configure buttons
    if (options.showCancel) {
      customDialogCancel.style.display = 'inline-block';
      customDialogCancel.textContent = options.cancelText || 'Cancel';
    } else {
      customDialogCancel.style.display = 'none';
    }
    
    customDialogConfirm.textContent = options.confirmText || 'OK';

    // Show modal
    customDialogModal.classList.remove('hidden');

    // Setup event listeners
    const cleanup = () => {
      customDialogConfirm.onclick = null;
      customDialogCancel.onclick = null;
      customDialogClose.onclick = null;
      customDialogModal.classList.add('hidden');
    };

    customDialogConfirm.onclick = () => {
      cleanup();
      resolve(true);
    };

    customDialogCancel.onclick = () => {
      cleanup();
      resolve(false);
    };

    customDialogClose.onclick = () => {
      cleanup();
      resolve(false);
    };
  });
}

window.showCustomAlert = function(message, type = 'info', title = 'Notification') {
  return showCustomDialog({ message, type, title, showCancel: false });
};

window.showCustomConfirm = function(message, title = 'Confirmation', type = 'warning', confirmText = 'Confirm') {
  return showCustomDialog({ message, type, title, showCancel: true, confirmText });
};
// Active Launcher State
let activePack = null;
let activeTheme = null;
let launcherState = 'ready'; // ready, updating, launching, playing, error
let configSettings = {};
let hideTimeout = null;

// Background Animation Canvas Variables
const canvas = document.getElementById('animation-canvas');
const ctx = canvas.getContext('2d');
let bubbles = [];
let sparks = [];
let rafts = [];
let pokemons = [];
let pokeballs = [];
let seagulls = [];
let nwGears = [];
let nwAirships = [];
let nwEmbers = [];

// Canvas Resize Handler
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Animation classes
class NWGear {
  constructor(x, y, radius, teeth, speed, isLarge = false) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.teeth = teeth;
    this.speed = speed;
    this.angle = Math.random() * Math.PI * 2;
    this.isLarge = isLarge;
  }
  update() {
    this.angle += this.speed;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const brassColor = '#d97706';
    const highlightBrass = '#f59e0b';
    const andesiteColor = '#64748b';

    // Teeth
    ctx.fillStyle = brassColor;
    ctx.beginPath();
    for (let i = 0; i < this.teeth; i++) {
      ctx.rotate((Math.PI * 2) / this.teeth);
      ctx.fillRect(-this.radius * 0.12, -this.radius - (this.isLarge ? 8 : 6), this.radius * 0.24, 15);
    }

    // Outer Rim
    ctx.fillStyle = highlightBrass;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner cutout
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Andesite alloy core (octagonal)
    ctx.fillStyle = andesiteColor;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      ctx.lineTo(Math.cos(i * Math.PI / 4) * (this.radius * 0.38), Math.sin(i * Math.PI / 4) * (this.radius * 0.38));
    }
    ctx.fill();

    // Shaft hole
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

class NWAirship {
  constructor() {
    this.x = canvas.width + Math.random() * 300 + 100;
    this.y = Math.random() * (canvas.height * 0.35) + 60;
    this.speed = Math.random() * 0.4 + 0.3;
    this.scale = Math.random() * 0.25 + 0.65;
    this.bob = Math.random() * Math.PI * 2;
  }
  update() {
    this.x -= this.speed;
    this.bob += 0.015;
    if (this.x < -300) {
      this.x = canvas.width + Math.random() * 300 + 100;
      this.y = Math.random() * (canvas.height * 0.35) + 60;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y + Math.sin(this.bob) * 12);
    ctx.scale(this.scale, this.scale);

    // Airship Balloon
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-65, -50, 130, 42);
    ctx.fillRect(-75, -40, 150, 22);
    ctx.fillRect(-55, -60, 110, 12);

    // Wool accent stripes
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(-35, -50, 22, 42);
    ctx.fillRect(15, -50, 22, 42);

    // Support ropes
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-50, -8, 4, 16);
    ctx.fillRect(46, -8, 4, 16);

    // Gondola / Cabin
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-35, 8, 70, 22);
    
    // Windows
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-24, 13, 12, 11);
    ctx.fillRect(12, 13, 12, 11);

    // Rotating Propeller
    ctx.translate(-45, 18);
    ctx.rotate(this.bob * 25);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-3, -16, 6, 32);
    ctx.fillRect(-16, -3, 32, 6);

    ctx.restore();
  }
}

class NWEmber {
  constructor() {
    this.reset();
    this.y = Math.random() * (canvas.height || 600);
  }
  reset() {
    this.x = Math.random() * (canvas.width || 800);
    this.y = (canvas.height || 600) + 20;
    this.size = Math.random() * 3 + 1.5;
    this.speedY = Math.random() * 0.9 + 0.4;
    this.speedX = Math.random() * 0.8 - 0.4;
    this.opacity = Math.random() * 0.5 + 0.2;
    this.flicker = Math.random() * Math.PI * 2;
  }
  update() {
    this.y -= this.speedY;
    this.x += this.speedX + Math.sin(this.flicker) * 0.4;
    this.flicker += 0.03;
    if (this.y < -20) {
      this.reset();
    }
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.restore();
  }
}

// Animation classes
class Bubble {
  constructor() {
    this.reset();
    this.y = Math.random() * canvas.height;
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + 20;
    this.size = Math.random() * 6 + 2;
    this.speed = Math.random() * 1.2 + 0.4;
    this.swingSpeed = Math.random() * 0.02 + 0.005;
    this.angle = Math.random() * Math.PI * 2;
    this.opacity = Math.random() * 0.35 + 0.05;
  }
  update() {
    this.y -= this.speed;
    this.angle += this.swingSpeed;
    this.x += Math.sin(this.angle) * 0.3;
    if (this.y < -20) {
      this.reset();
    }
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 176, 255, ${this.opacity})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 1.5})`;
    ctx.stroke();

    // Bubble shine
    ctx.beginPath();
    ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity * 1.5})`;
    ctx.fill();
  }
}

class Spark {
  constructor() {
    this.reset();
    this.y = Math.random() * canvas.height;
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + 20;
    this.size = Math.random() * 2 + 1;
    this.speed = Math.random() * 3 + 1;
    this.opacity = Math.random() * 0.4 + 0.1;
    this.color = Math.random() > 0.45 ? 'rgba(255, 23, 68,' : 'rgba(41, 121, 255,';
  }
  update() {
    this.y -= this.speed;
    if (this.y < -20) {
      this.reset();
    }
  }
  draw() {
    ctx.beginPath();
    ctx.rect(this.x, this.y, this.size, this.size * 4);
    ctx.fillStyle = `${this.color} ${this.opacity})`;
    ctx.fill();
  }
}

class Raft {
  constructor() {
    this.x = canvas.width * 0.55;
    this.y = 0; // set dynamically
    this.bob = 0;
    this.gearAngle = 0;
  }
  update() {
    this.bob += 0.015;
    this.gearAngle += 0.02;
    this.x = canvas.width * 0.55 + Math.sin(this.bob * 0.3) * 30;
  }
  draw(waterlineY) {
    const raftY = waterlineY - 5 + Math.sin(this.bob) * 6;
    const tilt = Math.sin(this.bob * 0.8) * 0.03;
    ctx.save();
    ctx.translate(this.x, raftY);
    ctx.rotate(tilt);

    // === RAFT PLATFORM ===
    // Main logs
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(-80, -8, 160, 16);
    // Individual log lines
    ctx.fillStyle = '#5d4037';
    for (let i = -80; i < 80; i += 20) {
      ctx.fillRect(i, -8, 18, 16);
    }
    // Gaps between logs
    ctx.fillStyle = '#3e2723';
    for (let i = -62; i < 80; i += 20) {
      ctx.fillRect(i, -8, 2, 16);
    }
    // Dark bottom edge
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(-80, 8, 160, 4);

    // === MAST / CRANE ARM ===
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(-5, -90, 10, 82); // vertical mast
    // Cross beam
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-40, -92, 80, 8);
    // Rope from crane
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, -85);
    ctx.lineTo(35, -50);
    ctx.stroke();
    // Hook
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(32, -52, 6, 6);
    ctx.fillRect(30, -46, 4, 6);

    // === SAIL (torn cloth) ===
    ctx.fillStyle = 'rgba(210, 180, 140, 0.6)';
    ctx.fillRect(8, -80, 25, 35);
    ctx.fillStyle = 'rgba(210, 180, 140, 0.4)';
    ctx.fillRect(8, -45, 20, 15);

    // === CHEST on deck ===
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-65, -22, 24, 14);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-65, -22, 24, 3);
    ctx.fillStyle = '#ffc107';
    ctx.fillRect(-56, -18, 6, 4);

    // === FURNACE ===
    ctx.fillStyle = '#757575';
    ctx.fillRect(40, -25, 20, 17);
    ctx.fillStyle = '#424242';
    ctx.fillRect(40, -25, 20, 4); // top
    // Fire glow
    ctx.fillStyle = '#ff6d00';
    ctx.fillRect(45, -17, 10, 6);
    ctx.fillStyle = '#ffab00';
    ctx.fillRect(47, -15, 6, 3);

    // === WATER WHEEL (Create style) ===
    ctx.save();
    ctx.translate(85, 0);
    ctx.rotate(this.gearAngle * 3);
    ctx.fillStyle = '#795548';
    ctx.fillRect(-18, -18, 36, 36);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-3, -25, 6, 50);
    ctx.fillRect(-25, -3, 50, 6);
    // Diagonal paddles
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -22, 6, 44);
    ctx.fillRect(-22, -3, 44, 6);
    ctx.restore();

    // === SMALL GEAR (Create mod) ===
    ctx.save();
    ctx.translate(-45, -35);
    ctx.rotate(-this.gearAngle * 5);
    ctx.fillStyle = '#795548';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(-2, -12, 4, 24);
    ctx.fillRect(-12, -2, 24, 4);
    ctx.fillStyle = '#9e9e9e';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();

    ctx.restore();
  }
}

class Seagull {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * (canvas.height * 0.3) + 30;
    this.speed = Math.random() * 0.8 + 0.3;
    this.wing = 0;
    this.dir = Math.random() > 0.5 ? 1 : -1;
  }
  update() {
    this.x += this.speed * this.dir;
    this.wing += 0.08;
    if (this.x > canvas.width + 50) { this.x = -50; this.y = Math.random() * (canvas.height * 0.3) + 30; }
    if (this.x < -50) { this.x = canvas.width + 50; this.y = Math.random() * (canvas.height * 0.3) + 30; }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    const wingY = Math.sin(this.wing) * 5;
    ctx.beginPath();
    ctx.moveTo(-10, wingY);
    ctx.lineTo(0, 0);
    ctx.lineTo(10, wingY);
    ctx.stroke();
    ctx.restore();
  }
}

class Pokemon {
  constructor(type) {
    this.type = type;
    this.x = Math.random() * (canvas.width * 0.6) + canvas.width * 0.2;
    this.baseY = 0; // set dynamically based on groundY
    this.bob = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 0.6 + 0.3;
    this.direction = Math.random() > 0.5 ? 1 : -1;
    this.hopHeight = 0;
    this.hopTimer = Math.random() * 60;
    this.isHopping = false;
    this.scale = 1.5;
  }
  update() {
    this.bob += 0.05;
    this.hopTimer--;
    if (this.hopTimer <= 0) {
      this.isHopping = true;
      this.hopTimer = 80 + Math.random() * 120;
    }
    if (this.isHopping) {
      this.hopHeight += 0.15;
      this.x += this.speed * this.direction * 2;
      if (this.hopHeight >= Math.PI) {
        this.hopHeight = 0;
        this.isHopping = false;
      }
    }
    if (this.x < 50) this.direction = 1;
    if (this.x > canvas.width - 50) this.direction = -1;
  }
  draw(groundY) {
    const hopOffset = Math.sin(this.hopHeight) * 25;
    ctx.save();
    ctx.translate(this.x, groundY - hopOffset);
    ctx.scale(this.direction * this.scale, this.scale);
    const s = 4; // pixel size

    if (this.type === 'pikachu') {
      // Ears
      ctx.fillStyle = '#fdd835';
      ctx.fillRect(-3*s, -10*s, 2*s, 3*s);
      ctx.fillRect(2*s, -10*s, 2*s, 3*s);
      ctx.fillStyle = '#212121';
      ctx.fillRect(-3*s, -10*s, 2*s, s);
      ctx.fillRect(2*s, -10*s, 2*s, s);
      // Head
      ctx.fillStyle = '#fdd835';
      ctx.fillRect(-3*s, -7*s, 7*s, 4*s);
      // Eyes
      ctx.fillStyle = '#212121';
      ctx.fillRect(-2*s, -6*s, s, s);
      ctx.fillRect(2*s, -6*s, s, s);
      // Cheeks
      ctx.fillStyle = '#e53935';
      ctx.fillRect(-3*s, -5*s, s, s);
      ctx.fillRect(3*s, -5*s, s, s);
      // Mouth
      ctx.fillStyle = '#212121';
      ctx.fillRect(0, -4*s, s, s*0.5);
      // Body
      ctx.fillStyle = '#fdd835';
      ctx.fillRect(-2*s, -3*s, 5*s, 3*s);
      // Belly
      ctx.fillStyle = '#fff176';
      ctx.fillRect(-s, -2*s, 3*s, 2*s);
      // Feet
      ctx.fillStyle = '#f9a825';
      ctx.fillRect(-2*s, 0, 2*s, s);
      ctx.fillRect(s, 0, 2*s, s);
      // Tail (zigzag)
      ctx.fillStyle = '#f9a825';
      ctx.fillRect(-4*s, -4*s, s, s);
      ctx.fillRect(-5*s, -5*s, s, s);
      ctx.fillRect(-4*s, -6*s, s, s);
      ctx.fillStyle = '#fdd835';
      ctx.fillRect(-5*s, -7*s, s, s);
      ctx.fillRect(-4*s, -8*s, s, s);
    } else if (this.type === 'squirtle') {
      // Head
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(-3*s, -7*s, 6*s, 4*s);
      // Eyes
      ctx.fillStyle = '#212121';
      ctx.fillRect(-2*s, -6*s, s, s);
      ctx.fillRect(2*s, -6*s, s, s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2*s, -6*s, s*0.5, s*0.5);
      ctx.fillRect(2*s, -6*s, s*0.5, s*0.5);
      // Mouth
      ctx.fillStyle = '#e57373';
      ctx.fillRect(-s, -4*s, 2*s, s*0.5);
      // Body
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(-2*s, -3*s, 5*s, 3*s);
      // Shell on back
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-3*s, -3*s, 2*s, 3*s);
      ctx.fillStyle = '#a1887f';
      ctx.fillRect(-3*s, -2*s, s, s);
      // Belly
      ctx.fillStyle = '#b3e5fc';
      ctx.fillRect(-s, -2*s, 3*s, 2*s);
      // Feet
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(-2*s, 0, 2*s, s);
      ctx.fillRect(s, 0, 2*s, s);
      // Tail
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(-4*s, -2*s, s, 2*s);
      ctx.fillRect(-5*s, -3*s, s, 2*s);
    } else if (this.type === 'bulbasaur') {
      // Head
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(-3*s, -6*s, 6*s, 3*s);
      // Eyes
      ctx.fillStyle = '#c62828';
      ctx.fillRect(-2*s, -5*s, s, s);
      ctx.fillRect(2*s, -5*s, s, s);
      ctx.fillStyle = '#212121';
      ctx.fillRect(-2*s, -5*s, s*0.5, s*0.5);
      ctx.fillRect(2*s, -5*s, s*0.5, s*0.5);
      // Mouth
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(-s, -4*s, 2*s, s*0.5);
      // Body
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(-3*s, -3*s, 7*s, 3*s);
      // Spots
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(-2*s, -2*s, s, s);
      ctx.fillRect(2*s, -s, s, s);
      // Bulb
      ctx.fillStyle = '#43a047';
      ctx.fillRect(-s, -5*s, 3*s, 2*s);
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(-2*s, -7*s, 2*s, 2*s);
      ctx.fillRect(s, -7*s, 2*s, 2*s);
      ctx.fillStyle = '#e91e63';
      ctx.fillRect(0, -8*s, s, s);
      // Feet
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(-3*s, 0, 2*s, s);
      ctx.fillRect(2*s, 0, 2*s, s);
    } else if (this.type === 'charmander') {
      // Head
      ctx.fillStyle = '#ef6c00';
      ctx.fillRect(-3*s, -7*s, 6*s, 4*s);
      // Eyes
      ctx.fillStyle = '#212121';
      ctx.fillRect(-2*s, -6*s, s, s);
      ctx.fillRect(2*s, -6*s, s, s);
      // Mouth
      ctx.fillStyle = '#bf360c';
      ctx.fillRect(-s, -4*s, 2*s, s*0.5);
      // Body
      ctx.fillStyle = '#ef6c00';
      ctx.fillRect(-2*s, -3*s, 5*s, 3*s);
      // Belly
      ctx.fillStyle = '#ffe0b2';
      ctx.fillRect(-s, -2*s, 3*s, 2*s);
      // Feet
      ctx.fillStyle = '#ef6c00';
      ctx.fillRect(-2*s, 0, 2*s, s);
      ctx.fillRect(s, 0, 2*s, s);
      // Tail with fire
      ctx.fillStyle = '#ef6c00';
      ctx.fillRect(-4*s, -2*s, s, 2*s);
      ctx.fillRect(-5*s, -3*s, s, 2*s);
      ctx.fillStyle = '#ff6d00';
      ctx.fillRect(-6*s, -5*s, 2*s, 2*s);
      ctx.fillStyle = '#ffc107';
      ctx.fillRect(-5*s, -6*s, s, s);
      ctx.fillStyle = '#ffeb3b';
      ctx.fillRect(-6*s, -4*s, s, s);
    } else if (this.type === 'eevee') {
      // Head
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-3*s, -7*s, 6*s, 4*s);
      // Fluffy collar
      ctx.fillStyle = '#d7ccc8';
      ctx.fillRect(-4*s, -4*s, 8*s, 2*s);
      // Ears
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-4*s, -10*s, 2*s, 3*s);
      ctx.fillRect(3*s, -10*s, 2*s, 3*s);
      ctx.fillStyle = '#a1887f';
      ctx.fillRect(-3*s, -9*s, s, 2*s);
      ctx.fillRect(3*s, -9*s, s, 2*s);
      // Eyes
      ctx.fillStyle = '#212121';
      ctx.fillRect(-2*s, -6*s, s, s);
      ctx.fillRect(2*s, -6*s, s, s);
      // Body
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-2*s, -2*s, 5*s, 2*s);
      // Feet
      ctx.fillRect(-2*s, 0, 2*s, s);
      ctx.fillRect(s, 0, 2*s, s);
      // Tail
      ctx.fillStyle = '#d7ccc8';
      ctx.fillRect(-4*s, -3*s, 2*s, 3*s);
      ctx.fillRect(-5*s, -4*s, 2*s, 2*s);
    }
    ctx.restore();
  }
}

class Pokeball {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = -50;
    this.speedY = Math.random() * 1.5 + 1;
    this.speedX = Math.random() * 2 - 1;
    this.angle = 0;
    this.scale = Math.random() * 0.5 + 0.8;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.angle += 0.03 * Math.sign(this.speedX || 1);
    if (this.y > canvas.height + 50) {
      this.y = -50;
      this.x = Math.random() * canvas.width;
      this.speedY = Math.random() * 1.5 + 1;
      this.speedX = Math.random() * 2 - 1;
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(this.scale, this.scale);
    const s = 3;

    // Outer shape
    ctx.fillStyle = '#e53935';
    ctx.fillRect(-4*s, -3*s, 8*s, 3*s);
    ctx.fillRect(-3*s, -4*s, 6*s, s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4*s, 0, 8*s, 3*s);
    ctx.fillRect(-3*s, 3*s, 6*s, s);
    // Band
    ctx.fillStyle = '#212121';
    ctx.fillRect(-4*s, -s*0.5, 8*s, s);
    // Button
    ctx.fillStyle = '#bdbdbd';
    ctx.fillRect(-s, -s, 2*s, 2*s);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-s*0.5, -s*0.5, s, s);

    ctx.restore();
  }
}

// Generate Particles
function initParticles() {
  bubbles = [];
  sparks = [];
  rafts = [];
  pokemons = [];
  pokeballs = [];
  seagulls = [];
  nwGears = [];
  nwAirships = [];
  nwEmbers = [];

  // Bubbles & Raft & Seagulls (Stranded at sea)
  for (let i = 0; i < 40; i++) {
    bubbles.push(new Bubble());
  }
  rafts.push(new Raft());
  for (let i = 0; i < 5; i++) {
    seagulls.push(new Seagull());
  }

  // Sparks & Pokemon (Cobblemon)
  for (let i = 0; i < 50; i++) {
    sparks.push(new Spark());
  }
  pokemons.push(new Pokemon('pikachu'));
  pokemons.push(new Pokemon('squirtle'));
  pokemons.push(new Pokemon('bulbasaur'));
  pokemons.push(new Pokemon('charmander'));
  pokemons.push(new Pokemon('eevee'));
  for (let i = 0; i < 3; i++) {
    pokeballs.push(new Pokeball());
  }

  // Gears, Airship & Embers (Create: New World)
  nwGears.push(new NWGear(120, 160, 50, 8, 0.003, true));
  nwGears.push(new NWGear(190, 200, 35, 6, -0.004, false));
  nwGears.push(new NWGear(canvas.width - 180, canvas.height - 180, 70, 10, 0.002, true));
  nwGears.push(new NWGear(canvas.width - 270, canvas.height - 150, 45, 8, -0.003, false));

  nwAirships.push(new NWAirship());

  for (let i = 0; i < 35; i++) {
    nwEmbers.push(new NWEmber());
  }
}

// Background Animation Loop
function animate() {
  requestAnimationFrame(animate);
  
  // Pause rendering to save CPU/GPU when the game is running
  if (launcherState === 'playing') return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (activeTheme === 'theme-stranded') {
    drawOceanScene();
  } else if (activeTheme === 'theme-cobblemon') {
    drawPokemonScene();
  } else if (activeTheme === 'theme-new-world') {
    drawNewWorldScene();
  }
}

// ============ STRANDED AT SEA — FULL OCEAN SCENE ============
let waveOffset = 0;
function drawOceanScene() {
  waveOffset += 0.008;
  const W = canvas.width;
  const H = canvas.height;
  const horizonY = H * 0.45;
  const waterlineY = horizonY + 20;

  // === SKY ===
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, '#0a1628');
  skyGrad.addColorStop(0.4, '#0d2137');
  skyGrad.addColorStop(0.7, '#1a4a6e');
  skyGrad.addColorStop(1, '#2a7ab5');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY + 10);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 30; i++) {
    const sx = (i * 137.5 + 50) % W;
    const sy = (i * 73.7 + 20) % (horizonY * 0.6);
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Moon
  ctx.fillStyle = 'rgba(255,255,220,0.8)';
  ctx.beginPath();
  ctx.arc(W * 0.15, horizonY * 0.35, 30, 0, Math.PI * 2);
  ctx.fill();
  // Moon glow
  ctx.fillStyle = 'rgba(255,255,200,0.05)';
  ctx.beginPath();
  ctx.arc(W * 0.15, horizonY * 0.35, 80, 0, Math.PI * 2);
  ctx.fill();

  // Seagulls
  if (typeof seagulls !== 'undefined') {
    seagulls.forEach(sg => { sg.update(); sg.draw(); });
  }

  // === OCEAN ===
  const oceanGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  oceanGrad.addColorStop(0, '#0d3b66');
  oceanGrad.addColorStop(0.3, '#0a2d50');
  oceanGrad.addColorStop(1, '#041222');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // Moon reflection on water
  ctx.fillStyle = 'rgba(255,255,200,0.03)';
  ctx.fillRect(W * 0.1, horizonY, W * 0.1, H - horizonY);

  // === ANIMATED WAVE LAYERS ===
  // Wave layer 1 (far)
  ctx.fillStyle = 'rgba(0, 120, 200, 0.15)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) {
    const y = horizonY + 40 + Math.sin(x * 0.005 + waveOffset * 0.7) * 8 + Math.sin(x * 0.002 + waveOffset * 1.3) * 12;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // Wave layer 2 (mid)
  ctx.fillStyle = 'rgba(0, 80, 160, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) {
    const y = horizonY + 80 + Math.sin(x * 0.006 - waveOffset) * 10 + Math.cos(x * 0.003 + waveOffset * 0.5) * 15;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // === RAFT ===
  rafts.forEach(r => {
    r.update();
    r.draw(horizonY + 80 + Math.sin(r.x * 0.006 - waveOffset) * 10);
  });

  // Wave layer 3 (near, in front of raft)
  ctx.fillStyle = 'rgba(0, 60, 130, 0.10)';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 5) {
    const y = horizonY + 150 + Math.sin(x * 0.008 + waveOffset * 1.5) * 12 + Math.cos(x * 0.004 - waveOffset) * 8;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // Foam/highlight wave crests
  ctx.strokeStyle = 'rgba(150, 220, 255, 0.08)';
  ctx.lineWidth = 1.5;
  for (let layer = 0; layer < 3; layer++) {
    const baseY = horizonY + 60 + layer * 60;
    const freq = 0.004 + layer * 0.002;
    const amp = 6 + layer * 4;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const y = baseY + Math.sin(x * freq + waveOffset * (1 + layer * 0.3)) * amp;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Bubbles (underwater glow particles)
  bubbles.forEach(b => { b.update(); b.draw(); });
}

// ============ COBBLEMON — FULL POKEMON SCENE ============
function drawPokemonScene() {
  const W = canvas.width;
  const H = canvas.height;
  const groundY = H * 0.78;

  // === SKY (Pixelated gradient) ===
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, '#1a237e');
  skyGrad.addColorStop(0.3, '#283593');
  skyGrad.addColorStop(0.6, '#42a5f5');
  skyGrad.addColorStop(0.85, '#90caf9');
  skyGrad.addColorStop(1, '#bbdefb');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, groundY);

  // Blocky Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  const cTime = Date.now() / 8000;
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 300 + cTime * 30) % (W + 200)) - 100;
    const cy = 60 + i * 50;
    ctx.fillRect(cx, cy, 80, 16);
    ctx.fillRect(cx + 20, cy - 16, 60, 16);
    ctx.fillRect(cx + 60, cy, 40, 16);
  }

  // === SUN ===
  ctx.fillStyle = '#ffee58';
  ctx.fillRect(W - 120, 40, 50, 50);
  ctx.fillStyle = 'rgba(255,238,88,0.1)';
  ctx.fillRect(W - 140, 20, 90, 90);

  // === DISTANT MOUNTAINS (pixelated) ===
  ctx.fillStyle = '#558b2f';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= W; x += 30) {
    ctx.lineTo(x, groundY - 50 - Math.abs(Math.sin(x * 0.003)) * 80);
  }
  ctx.lineTo(W, groundY);
  ctx.fill();

  ctx.fillStyle = '#33691e';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= W; x += 20) {
    ctx.lineTo(x, groundY - 20 - Math.abs(Math.sin(x * 0.005 + 1)) * 50);
  }
  ctx.lineTo(W, groundY);
  ctx.fill();

  // === GROUND (Minecraft grass block style) ===
  // Grass top layer
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(0, groundY, W, 12);
  ctx.fillStyle = '#388e3c';
  ctx.fillRect(0, groundY + 12, W, 8);
  // Dirt layer
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(0, groundY + 20, W, H - groundY - 20);
  ctx.fillStyle = '#5d4037';
  // Dirt pixel variation
  for (let x = 0; x < W; x += 20) {
    for (let y = groundY + 20; y < H; y += 20) {
      if ((x + y) % 40 === 0) {
        ctx.fillRect(x, y, 10, 10);
      }
    }
  }
  // Random grass blades on top
  ctx.fillStyle = '#66bb6a';
  for (let i = 0; i < W; i += 30) {
    const bladeH = 5 + Math.sin(i * 0.7) * 3;
    ctx.fillRect(i, groundY - bladeH, 4, bladeH);
    ctx.fillRect(i + 12, groundY - bladeH + 2, 4, bladeH - 2);
  }

  // === TREES (blocky pixel-art) ===
  drawPixelTree(80, groundY);
  drawPixelTree(W - 120, groundY);
  drawPixelTree(W * 0.4, groundY);

  // === TALL GRASS patches ===
  ctx.fillStyle = '#43a047';
  for (let i = 0; i < W; i += 60) {
    const gh = 10 + Math.sin(i * 0.3) * 5;
    ctx.fillRect(i + 20, groundY - gh, 8, gh);
    ctx.fillRect(i + 30, groundY - gh + 3, 6, gh - 3);
    ctx.fillRect(i + 40, groundY - gh + 1, 8, gh - 1);
  }

  // === POKÉMON ===
  pokemons.forEach(p => {
    p.update();
    p.draw(groundY - 2);
  });

  // === POKEBALLS ===
  pokeballs.forEach(pb => {
    pb.update();
    pb.draw();
  });

  // Sparks (subtle energy particles)
  sparks.forEach(s => {
    s.update();
    s.draw();
  });
}

function drawPixelTree(x, groundY) {
  ctx.save();
  ctx.translate(x, groundY);
  // Trunk
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(-5, -40, 10, 40);
  // Leaves (layered blocky)
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(-20, -70, 40, 15);
  ctx.fillRect(-25, -55, 50, 15);
  ctx.fillStyle = '#388e3c';
  ctx.fillRect(-15, -80, 30, 10);
  ctx.fillRect(-20, -60, 40, 10);
  ctx.restore();
}

// ============ CREATE: NEW WORLD — SUNRISE ENGINEERING SCENE ============
let nwTime = 0;
function drawNewWorldScene() {
  nwTime += 0.006;
  const W = canvas.width;
  const H = canvas.height;
  const groundY = H * 0.70;

  // === SUNRISE / GOLDEN SKY ===
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, '#1c1917');
  skyGrad.addColorStop(0.3, '#451a03');
  skyGrad.addColorStop(0.65, '#9a3412');
  skyGrad.addColorStop(0.85, '#d97706');
  skyGrad.addColorStop(1, '#fbbf24');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, groundY + 10);

  // === RISING SUN ===
  const sunX = W * 0.75;
  const sunY = groundY - 30;
  const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 130);
  sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.7)');
  sunGlow.addColorStop(0.4, 'rgba(245, 158, 11, 0.25)');
  sunGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 130, 0, Math.PI * 2);
  ctx.fill();

  // Minecraft Square Golden Sun
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(sunX - 25, sunY - 25, 50, 50);

  // === DISTANT PINE MOUNTAINS (Back Layer) ===
  ctx.fillStyle = '#064e3b';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 30) {
    const my = groundY - 45 - Math.abs(Math.sin(x * 0.003 + 1.2)) * 80;
    ctx.lineTo(x, my);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // === MID LAYER HILLS & WORKSHOPS ===
  ctx.fillStyle = '#047857';
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 25) {
    const my = groundY - 20 - Math.abs(Math.sin(x * 0.004 + 0.5)) * 50;
    ctx.lineTo(x, my);
  }
  ctx.lineTo(W, H);
  ctx.fill();

  // === WINDMILL (Lush Hill Landmark) ===
  const wmX = W * 0.22;
  const wmY = groundY - 35;
  // Windmill Tower
  ctx.fillStyle = '#78350f';
  ctx.fillRect(wmX - 14, wmY - 45, 28, 45);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(wmX - 16, wmY - 55, 32, 10);
  // Windmill Window
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(wmX - 5, wmY - 30, 10, 12);
  // Rotating Windmill Sails
  ctx.save();
  ctx.translate(wmX, wmY - 50);
  ctx.rotate(nwTime * 2);
  ctx.fillStyle = '#e2e8f0';
  for (let s = 0; s < 4; s++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-3, -35, 6, 35);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(3, -32, 12, 28);
    ctx.fillStyle = '#e2e8f0';
  }
  ctx.restore();

  // === FACTORY SILHOUETTES ===
  ctx.fillStyle = '#292524';
  ctx.fillRect(W * 0.80, groundY - 60, 70, 60);
  ctx.fillRect(W * 0.80 + 12, groundY - 95, 14, 35); // Chimney
  // Warm Factory Windows
  ctx.fillStyle = '#f59e0b';
  for (let fx = 0; fx < 3; fx++) {
    for (let fy = 0; fy < 2; fy++) {
      ctx.fillRect(W * 0.80 + 10 + fx * 18, groundY - 48 + fy * 20, 10, 12);
    }
  }
  // Smoke Puffs
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  const smkT = Date.now() / 250;
  for (let p = 0; p < 3; p++) {
    const px = W * 0.80 + 19 + Math.sin(smkT + p) * 6;
    const py = groundY - 95 - p * 18 - Math.sin(smkT * 0.5 + p) * 4;
    const pr = 7 + p * 4;
    ctx.fillRect(px - pr/2, py - pr/2, pr, pr);
  }

  // === AIRSHIPS ===
  nwAirships.forEach(a => { a.update(); a.draw(); });

  // === FOREGROUND GROUND & TERRAIN ===
  // Lush Grass Top
  ctx.fillStyle = '#10b981';
  ctx.fillRect(0, groundY, W, 14);
  ctx.fillStyle = '#059669';
  ctx.fillRect(0, groundY + 14, W, 10);
  // Rich Soil / Andesite Ground
  ctx.fillStyle = '#451a03';
  ctx.fillRect(0, groundY + 24, W, H - groundY - 24);

  // Grass blades
  ctx.fillStyle = '#34d399';
  for (let i = 0; i < W; i += 18) {
    const bh = 5 + Math.sin(i * 0.6 + nwTime * 2.5) * 3;
    ctx.fillRect(i, groundY - bh, 3, bh);
  }

  // === TREES ===
  drawPixelTree(W * 0.08, groundY);
  drawPixelTree(W * 0.40, groundY);
  drawPixelTree(W * 0.62, groundY);

  // === SPINNING GEARS IN FOREGROUND / SIDES ===
  nwGears.forEach(g => {
    if (g.x > W) g.x = W - 180;
    g.update();
    g.draw();
  });

  // === AMBER EMBERS & PARTICLES ===
  nwEmbers.forEach(e => { e.update(); e.draw(); });
}

// Change Modpack Theme & View
function switchModpack(packKey) {
  if (launcherState !== 'ready') return; // block switching while installing/running
  if (!packDetails[packKey]) packKey = 'stranded_at_sea';
  if (activePack === packKey && document.body.classList.contains(activeTheme)) return; // Already active
  
  activePack = packKey;
  const oldTheme = activeTheme;
  
  if (packKey === 'stranded_at_sea') activeTheme = 'theme-stranded';
  else if (packKey === 'cobblemon') activeTheme = 'theme-cobblemon';
  else if (packKey === 'create_new_world') activeTheme = 'theme-new-world';
  
  // Re-initialize particles on theme change (clears old ones and respawns them)
  initParticles();
  
  // CSS Transition
  document.body.classList.remove(oldTheme);
  document.body.classList.add(activeTheme);

  // Update DOM details
  const details = packDetails[packKey];
  packTitleEl.textContent = details.title;
  packDescEl.textContent = details.description;
  statMcVerEl.textContent = details.mcVersion;
  statLoaderEl.textContent = details.loader;

  // Highlight list
  document.querySelectorAll('.modpack-item').forEach(item => {
    item.classList.toggle('active', item.dataset.pack === packKey);
  });

  const installedVerPill = document.getElementById('stat-pill-installed-version');
  const serverPill = document.getElementById('stat-pill-server');
  if (installedVerPill) installedVerPill.style.display = '';
  if (serverPill) serverPill.style.display = '';

  // Save selected modpack preference automatically
  if (configSettings) {
    configSettings.selectedPack = packKey;
    window.api.saveSettings(configSettings).catch(e => console.warn('Failed to save selected pack preference:', e));
  }

  // Fetch local version info
  updateVersionCheck();
  
  if (versionCheckInterval) clearInterval(versionCheckInterval);
  versionCheckInterval = setInterval(updateVersionCheck, 2000); // Check every 2 seconds
  
  // Fetch server status
  checkServerStatus(packKey);
}

// Global server status interval
let serverStatusInterval = null;
let versionCheckInterval = null;

async function checkServerStatus(packKey) {
  const details = packDetails[packKey];
  if (!details || !details.serverIp) return;

  // Clear previous interval if any
  if (serverStatusInterval) clearInterval(serverStatusInterval);

  const fetchStatus = async () => {
    try {
      serverStatusDot.className = 'status-dot';
      serverStatusText.textContent = 'Pinging...';
      
      const response = await fetch(`https://api.mcstatus.io/v2/status/java/${details.serverIp}`);
      const data = await response.json();
      
      if (data.online) {
        // MOTD Synchronization
        const motd = data.motd?.clean?.trim() || "";
        const m = motd.toLowerCase();
        
        let serverPack = null;
        if (m.includes('new world') || m.includes('colonizers') || m.includes('create+') || m.startsWith('2') || m.startsWith('c') || m.startsWith('w')) {
          serverPack = 'create_new_world';
        } else if (m.includes('stranded') || m.includes('sea') || m.startsWith('1')) {
          serverPack = 'stranded_at_sea';
        } else if (m.includes('cobblemon') || m.startsWith('3')) {
          serverPack = 'cobblemon';
        }

        // Highlight the server's active pack in the sidebar
        document.querySelectorAll('.modpack-item').forEach(item => {
          item.classList.remove('server-active');
        });
        if (serverPack) {
          const activeItem = document.querySelector(`.modpack-item[data-pack="${serverPack}"]`);
          if (activeItem) activeItem.classList.add('server-active');
        }

        // Sort the list based on server pack and last played time
        sortModpacks(serverPack);

        if (serverPack && serverPack !== packKey) {
          serverStatusDot.className = 'status-dot offline'; // Using offline (red) dot to indicate mismatch
          serverStatusText.textContent = `Server is on ${packDetails[serverPack].title}`;
          serverStatusText.title = '';
          serverStatusText.style.cursor = 'default';
        } else {
          serverStatusDot.className = 'status-dot online';
          serverStatusText.textContent = `${data.players.online}/${data.players.max} Online`;
          if (data.players.list && data.players.list.length > 0) {
            serverStatusText.title = 'Players online:\n' + data.players.list.map(p => p.name_clean).join('\n');
            serverStatusText.style.cursor = 'help';
          } else if (data.players.online > 0) {
            serverStatusText.title = 'Players are hidden by the server';
            serverStatusText.style.cursor = 'help';
          } else {
            serverStatusText.title = 'No players online';
            serverStatusText.style.cursor = 'default';
          }
        }
      } else {
        serverStatusDot.className = 'status-dot offline';
        serverStatusText.textContent = 'Offline';
        serverStatusText.title = '';
        serverStatusText.style.cursor = 'default';
      }
    } catch (err) {
      serverStatusDot.className = 'status-dot offline';
      serverStatusText.textContent = 'Error';
      serverStatusText.title = '';
      serverStatusText.style.cursor = 'default';
    }
  };

  // Initial fetch
  await fetchStatus();
  
  // Fetch every 30 seconds
  serverStatusInterval = setInterval(fetchStatus, 30000);
}

// Fetch update status from main process
async function updateVersionCheck() {
  try {
    const info = await window.api.checkUpdates(activePack);
    if (info.localVersion === 'none') {
      statLocalVerEl.textContent = 'Not Installed';
      if (launcherState === 'ready' || launcherState === 'error') {
        btnText.textContent = 'INSTALL';
      }
    } else {
      let displayVer = '';
      if (info.packVersion) {
        displayVer = `v${info.packVersion}`;
      } else if (info.commitMessage) {
        displayVer = info.commitMessage;
      } else {
        displayVer = `v${info.localVersion.substring(0, 7)}`;
      }
      statLocalVerEl.textContent = displayVer;
      if (info.mcVersion) statMcVerEl.textContent = info.mcVersion;
      if (launcherState === 'ready' || launcherState === 'error') {
        btnText.textContent = 'PLAY';
      }
    }
  } catch (err) {
    console.error('Update check failed:', err);
    statLocalVerEl.textContent = 'Error Checking';
    if (launcherState === 'ready' || launcherState === 'error') {
      btnText.textContent = 'PLAY (OFFLINE)';
    }
  }
}

// Settings Sync & Dialog Handlers
async function loadSettings() {
  const data = await window.api.loadSettings();
  const settings = data.settings || data; // Fallback in case of older IPC payload
  const sysMem = data.systemMemoryGb || 8; // Default 8GB if unknown
  
  configSettings = settings;
  
  // Calculate max safe RAM (leave 2GB for OS, max 32GB)
  let maxSafeRam = Math.floor(Math.max(2, sysMem - 2));
  if (maxSafeRam > 32) maxSafeRam = 32;
  
  settingsRam.max = maxSafeRam;
  
  // Update the UI labels based on new max
  const rangeLabels = document.querySelector('.range-labels');
  if (rangeLabels) {
    const rMin = 2;
    const rRange = maxSafeRam - rMin;
    let html = `<span style="left: 0%;">2 GB</span>`;
    
    // Generate clean beautiful intermediate steps
    const steps = [8, 16, 24];
    for (const step of steps) {
      if (maxSafeRam > step + 2) {
        const percent = ((step - rMin) / rRange) * 100;
        html += `<span style="left: ${percent}%;">${step} GB</span>`;
      }
    }
    
    html += `<span style="left: 100%;">${maxSafeRam} GB</span>`;
    rangeLabels.innerHTML = html;
  }
  
  // Cap current selection if it exceeds system capabilities or falls below minimum
  if (settings.ramGb > maxSafeRam) settings.ramGb = maxSafeRam;
  if (settings.ramGb < 2) settings.ramGb = 2;
  
  // Sync fields
  if (settings.nickname) {
    if (settingsNickname) settingsNickname.value = settings.nickname;
    if (usernameInput) usernameInput.value = settings.nickname;
  }
  settingsRam.value = settings.ramGb;
  ramValueLabel.textContent = `${settings.ramGb} GB`;
  settingsJava.value = settings.javaPath || '';
  settingsArgs.value = settings.jvmArgs || '';
  settingsMock.checked = settings.mockMode;
  
  // Ensure addons object exists
  if (!configSettings.addons) {
    configSettings.addons = {};
  }

  updateUserAvatar(settings.nickname);
  updateModeBadge(settings.mockMode);
}

async function saveSettingsData() {
  const settings = {
    nickname: settingsNickname.value.trim() || 'Player',
    ramGb: parseInt(settingsRam.value, 10),
    javaPath: settingsJava.value.trim(),
    jvmArgs: settingsArgs.value.trim(),
    selectedPack: activePack,
    mockMode: settingsMock.checked,
    addons: configSettings.addons || {}
  };

  const res = await window.api.saveSettings(settings);
  if (res.success) {
    configSettings = settings;
    // sync visual inputs
    usernameInput.value = settings.nickname;
    updateUserAvatar(settings.nickname);
    updateModeBadge(settings.mockMode);
    
    // Close modal
    settingsModal.classList.add('hidden');
    
    // Re-verify update checker
    updateVersionCheck();
  } else {
    await showCustomAlert(`Failed to save settings: ${res.error}`, 'error', 'Error');
  }
}

let avatarDebounceTimeout = null;

function updateUserAvatar(name) {
  if (name && name.trim() !== '') {
    avatarPreview.textContent = '';
    
    // Clear previous timeout
    if (avatarDebounceTimeout) clearTimeout(avatarDebounceTimeout);
    
    // Debounce the network request by 500ms
    avatarDebounceTimeout = setTimeout(() => {
      // Fetch 2D face avatar from mc-heads.net API (falls back to Steve if not a premium account)
      avatarPreview.style.backgroundImage = `url('https://mc-heads.net/avatar/${encodeURIComponent(name.trim())}/100')`;
      avatarPreview.style.backgroundSize = 'cover';
      avatarPreview.style.backgroundPosition = 'center';
    }, 500);
  } else {
    if (avatarDebounceTimeout) clearTimeout(avatarDebounceTimeout);
    avatarPreview.textContent = 'P';
    avatarPreview.style.backgroundImage = '';
  }
}

// Live update avatar as user types nickname
if (settingsNickname) {
  settingsNickname.addEventListener('input', (e) => {
    updateUserAvatar(e.target.value);
    if (usernameInput) usernameInput.value = e.target.value;
    if (configSettings) {
      configSettings.nickname = e.target.value;
      window.api.saveSettings(configSettings);
    }
  });
}
if (usernameInput) {
  usernameInput.addEventListener('input', (e) => {
    updateUserAvatar(e.target.value);
    if (settingsNickname) settingsNickname.value = e.target.value;
    if (configSettings) {
      configSettings.nickname = e.target.value;
      window.api.saveSettings(configSettings);
    }
  });
}

function updateModeBadge(isMock) {
  if (isMock) {
    modeBadge.textContent = 'Developer Mode';
    modeBadge.classList.remove('off');
    debugBtn.style.display = 'block';
  } else {
    modeBadge.textContent = 'Production';
    modeBadge.classList.add('off');
    debugBtn.style.display = 'none';
  }
}

// Settings Modal Open/Close listeners
settingsBtn.addEventListener('click', () => {
  // Sync setting dialog inputs
  settingsNickname.value = usernameInput.value;
  settingsModal.classList.remove('hidden');
});

modalClose.addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) settingsModal.classList.add('hidden');
});

// Inline Username updates settings instantly on blur/enter
function updateInlineUsername() {
  const val = usernameInput.value.trim();
  if (val && val !== configSettings.nickname) {
    settingsNickname.value = val;
    saveSettingsData();
  }
}
usernameInput.addEventListener('blur', updateInlineUsername);
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    usernameInput.blur();
  }
});

// RAM Slider label
settingsRam.addEventListener('input', () => {
  ramValueLabel.textContent = `${settingsRam.value} GB`;
});

// Java Path Select Dialogue
browseJavaBtn.addEventListener('click', async () => {
  const path = await window.api.selectJavaPath();
  if (path) {
    settingsJava.value = path;
  }
});

settingsSaveBtn.addEventListener('click', saveSettingsData);

settingsResetBtn.addEventListener('click', async () => {
  if (await showCustomConfirm('Are you sure you want to reset all launcher settings to default?', 'Reset Settings', 'warning', 'Reset')) {
    const res = await window.api.resetSettings();
    if (res.success) {
      await showCustomAlert('Settings reset successfully!', 'success', 'Success');
      loadSettings(); // Reload defaults into UI
    } else {
      await showCustomAlert('Failed to reset settings: ' + res.error, 'error', 'Error');
    }
  }
});

if (openInstancesBtn) {
  openInstancesBtn.addEventListener('click', () => {
    window.api.openInstancesDir();
  });
}

// Modpack Settings Modal Logic
let editingPackSettings = null;

async function openPackSettings(packKey) {
  editingPackSettings = packKey;
  const details = packDetails[packKey];
  if (packSettingsTitle && details) {
    packSettingsTitle.textContent = `${details.title} Configuration`;
  }
  
  // Disable Reset & Delete buttons if modpack is not installed
  try {
    const info = await window.api.checkUpdates(packKey);
    const isInstalled = info && info.localVersion && info.localVersion !== 'none';
    if (packSettingsResetBtn) {
      packSettingsResetBtn.disabled = !isInstalled;
      packSettingsResetBtn.title = isInstalled ? 'Reset all options of this modpack to default' : 'Modpack is not installed';
    }
    if (packSettingsDeleteBtn) {
      packSettingsDeleteBtn.disabled = !isInstalled;
      packSettingsDeleteBtn.title = isInstalled ? 'Delete this modpack completely' : 'Modpack is not installed';
    }
  } catch (e) {
    console.warn('Failed to check installation status for pack settings buttons:', e);
  }

  const shadersTitleEl = document.getElementById('pack-shaders-title');
  const shadersSubEl = document.getElementById('pack-shaders-subtitle');
  const isOptiFine = details && (details.loader || '').toLowerCase().includes('optifine');

  if (shadersTitleEl) {
    shadersTitleEl.textContent = isOptiFine ? 'OptiFine Shaders Support' : 'Shader Support (Iris / Oculus)';
  }
  if (shadersSubEl) {
    shadersSubEl.textContent = isOptiFine 
      ? 'Enables shaders. Uses built-in OptiFine shaderpacks manager.' 
      : 'Enables shaders. Installs Iris (Fabric) or Oculus (Forge).';
  }

  if (!configSettings.addons) configSettings.addons = {};
  if (!configSettings.addons[packKey]) configSettings.addons[packKey] = { shaders: true };
  
  const packAddons = configSettings.addons[packKey];
  if (packSettingsShaders) {
    packSettingsShaders.checked = packAddons.shaders || false;
  }
  if (packShadersActions) {
    packShadersActions.style.display = packAddons.shaders ? 'flex' : 'none';
  }
  
  if (packAddons.shaders) {
    loadInstalledShaders(packKey);
  } else {
    if (installedShadersContainer) installedShadersContainer.style.display = 'none';
  }

  // If OptiFine pack, hide Addons tab since shaders/addons are native to OptiFine
  const tabBtnAddonsEl = document.getElementById('tab-btn-addons');
  if (isOptiFine) {
    if (tabBtnAddonsEl) tabBtnAddonsEl.style.display = 'none';
    switchSettingsTab('options');
  } else {
    if (tabBtnAddonsEl) tabBtnAddonsEl.style.display = 'block';
    switchSettingsTab('addons');
  }

  if (packSettingsModal) {
    packSettingsModal.classList.remove('hidden');
  }
}

// Event Delegation for Gear button clicks in Modpack List
const modpackListContainer = document.querySelector('.modpack-list');
if (modpackListContainer) {
  modpackListContainer.addEventListener('click', (e) => {
    const gearBtn = e.target.closest('.pack-settings-btn');
    if (gearBtn) {
      e.stopPropagation();
      e.preventDefault();
      const item = gearBtn.closest('.modpack-item');
      if (item) {
        openPackSettings(item.dataset.pack);
      }
    }
  });
}

// Bind modal events
if (packSettingsClose) {
  packSettingsClose.addEventListener('click', () => {
    if (packSettingsModal) packSettingsModal.classList.add('hidden');
    if (shadersHelpPanel) shadersHelpPanel.style.display = 'none';
    if (shadersDropzoneStatus) shadersDropzoneStatus.style.display = 'none';
  });
}
if (packSettingsModal) {
  packSettingsModal.addEventListener('click', (e) => {
    if (e.target === packSettingsModal) {
      packSettingsModal.classList.add('hidden');
      if (shadersHelpPanel) shadersHelpPanel.style.display = 'none';
      if (shadersDropzoneStatus) shadersDropzoneStatus.style.display = 'none';
    }
  });
}

if (packSettingsShaders) {
  packSettingsShaders.addEventListener('change', (e) => {
    if (packShadersActions) {
      packShadersActions.style.display = e.target.checked ? 'flex' : 'none';
    }
    if (e.target.checked) {
      if (editingPackSettings) loadInstalledShaders(editingPackSettings);
    } else {
      if (installedShadersContainer) installedShadersContainer.style.display = 'none';
    }
  });
}

if (packOpenShadersBtn) {
  packOpenShadersBtn.addEventListener('click', () => {
    if (editingPackSettings) {
      window.api.openShadersDir(editingPackSettings);
    }
  });
}

if (packDownloadShadersLink) {
  packDownloadShadersLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.api.openExternalLink('https://modrinth.com/shaders');
  });
}

// Toggle Help Panel
if (packShadersHelpBtn) {
  packShadersHelpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (shadersHelpPanel) {
      const isHidden = shadersHelpPanel.style.display === 'none' || shadersHelpPanel.style.display === '';
      shadersHelpPanel.style.display = isHidden ? 'flex' : 'none';
    }
  });
}

// Drag & Drop Shaders
if (shadersDropzone) {
  // Prevent defaults for all drag events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    shadersDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  // Highlight drop zone when item is dragged over it
  ['dragenter', 'dragover'].forEach(eventName => {
    shadersDropzone.addEventListener(eventName, () => {
      shadersDropzone.classList.add('dragover');
      shadersDropzone.style.borderColor = 'var(--primary)';
      shadersDropzone.style.color = '#fff';
      shadersDropzone.style.background = 'rgba(255, 255, 255, 0.05)';
    }, false);
  });

  ['dragleave', 'dragend', 'drop'].forEach(eventName => {
    shadersDropzone.addEventListener(eventName, () => {
      shadersDropzone.classList.remove('dragover');
      shadersDropzone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      shadersDropzone.style.color = 'rgba(255, 255, 255, 0.4)';
      shadersDropzone.style.background = 'rgba(0, 0, 0, 0.15)';
    }, false);
  });

  // Handle dropped files
  shadersDropzone.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    
    if (files.length === 0) return;
    
    // Filter only .zip files
    const zipFiles = files.filter(f => f.name.toLowerCase().endsWith('.zip'));
    if (zipFiles.length === 0) {
      showDropzoneStatus('Only .zip files are supported as shaderpacks!', '#ff4757');
      return;
    }
    
    const filePaths = zipFiles.map(f => f.path);
    await handleImportShaderpacks(filePaths);
  });

  // Handle click on dropzone to select file
  shadersDropzone.addEventListener('click', async () => {
    const filePaths = await window.api.selectShaderpackFile();
    if (filePaths && filePaths.length > 0) {
      await handleImportShaderpacks(filePaths);
    }
  });
}

// Helper function to import shaderpacks and update status UI
async function handleImportShaderpacks(filePaths) {
  if (!editingPackSettings) return;
  
  showDropzoneStatus('Importing shaderpack(s)...', 'var(--primary)');
  const res = await window.api.importShaderpack(editingPackSettings, filePaths);
  if (res && res.success) {
    const names = res.imported.join(', ');
    showDropzoneStatus(`Successfully imported: ${names}!`, '#2cd63b');
    // Reload shaders list
    loadInstalledShaders(editingPackSettings);
    // Hide status after 4 seconds
    setTimeout(() => {
      if (shadersDropzoneStatus) shadersDropzoneStatus.style.display = 'none';
    }, 4000);
  } else {
    showDropzoneStatus('Failed to import: ' + (res ? res.error : 'Unknown error'), '#ff4757');
  }
}

function showDropzoneStatus(message, color) {
  if (shadersDropzoneStatus) {
    shadersDropzoneStatus.textContent = message;
    shadersDropzoneStatus.style.color = color;
    shadersDropzoneStatus.style.display = 'block';
  }
}

async function loadInstalledShaders(packKey) {
  if (!installedShadersList) return;
  installedShadersList.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size: 10px; text-align: center; padding: 10px 0; width: 100%;">Loading shaderpacks...</div>';
  
  if (installedShadersContainer) {
    installedShadersContainer.style.display = 'flex';
  }

  const shaders = await window.api.getInstalledShaders(packKey);
  
  if (!shaders || shaders.length === 0) {
    installedShadersList.innerHTML = '<div style="color: rgba(255,255,255,0.3); font-size: 10px; text-align: center; padding: 15px 0; width: 100%;">No shaderpacks installed. Drag & drop or click the box above to add some!</div>';
    return;
  }

  installedShadersList.innerHTML = '';
  shaders.forEach(shader => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.background = 'rgba(255, 255, 255, 0.03)';
    item.style.border = '1px solid rgba(255, 255, 255, 0.06)';
    item.style.borderRadius = '6px';
    item.style.padding = '6px 10px';
    item.style.fontSize = '10px';
    item.style.color = '#fff';
    item.style.boxSizing = 'border-box';
    item.style.width = '100%';
    item.style.gap = '10px';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = shader;
    nameSpan.style.overflow = 'hidden';
    nameSpan.style.textOverflow = 'ellipsis';
    nameSpan.style.whiteSpace = 'nowrap';
    nameSpan.style.flex = '1';
    nameSpan.title = shader;

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete shaderpack';
    deleteBtn.style.background = 'none';
    deleteBtn.style.border = 'none';
    deleteBtn.style.outline = 'none';
    deleteBtn.style.color = 'rgba(255,255,255,0.3)';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.fontSize = '14px';
    deleteBtn.style.fontWeight = 'bold';
    deleteBtn.style.padding = '0 4px';
    deleteBtn.style.display = 'flex';
    deleteBtn.style.alignItems = 'center';
    deleteBtn.style.justifyContent = 'center';
    deleteBtn.style.transition = 'color 0.2s';
    
    deleteBtn.onmouseover = () => deleteBtn.style.color = '#ff4757';
    deleteBtn.onmouseout = () => deleteBtn.style.color = 'rgba(255,255,255,0.3)';

    deleteBtn.onclick = async () => {
      if (await showCustomConfirm(`Are you sure you want to delete "${shader}"?`, 'Delete Shader', 'warning', 'Delete')) {
        deleteBtn.disabled = true;
        const res = await window.api.deleteShaderpack(packKey, shader);
        if (res && res.success) {
          loadInstalledShaders(packKey);
        } else {
          await showCustomAlert('Failed to delete: ' + (res ? res.error : 'Unknown error'), 'error', 'Error');
          deleteBtn.disabled = false;
        }
      }
    };

    item.appendChild(nameSpan);
    item.appendChild(deleteBtn);
    installedShadersList.appendChild(item);
  });
}

async function loadGameOptions(packKey) {
  if (!resourcepacksList) return;
  resourcepacksList.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size: 10px; text-align: center; padding: 10px 0; width: 100%;">Loading game options...</div>';

  const res = await window.api.readGameOptions(packKey);
  if (!res || !res.success) {
    if (res && res.error === 'Modpack not installed') {
      if (optSettingsFieldsWrapper) optSettingsFieldsWrapper.style.display = 'none';
      if (optNotInstalledMessage) optNotInstalledMessage.style.display = 'flex';
    } else {
      if (optSettingsFieldsWrapper) optSettingsFieldsWrapper.style.display = 'flex';
      if (optNotInstalledMessage) optNotInstalledMessage.style.display = 'none';
      resourcepacksList.innerHTML = `<div style="color: #ff4757; font-size: 10px; text-align: center; padding: 10px 0; width: 100%;">Failed to load options.txt</div>`;
    }
    return;
  }

  if (optSettingsFieldsWrapper) optSettingsFieldsWrapper.style.display = 'flex';
  if (optNotInstalledMessage) optNotInstalledMessage.style.display = 'none';

  const { options, availableResourcePacks } = res;

  if (optRender) {
    optRender.value = options.renderDistance;
    if (optRenderVal) optRenderVal.textContent = `${options.renderDistance} chunks`;
  }
  if (optFov) {
    const fovVal = Math.round(options.fov * 40 + 70);
    optFov.value = fovVal;
    if (optFovVal) {
      if (fovVal === 70) optFovVal.textContent = '70 (Normal)';
      else if (fovVal === 110) optFovVal.textContent = '110 (Quake Pro)';
      else optFovVal.textContent = fovVal;
    }
  }
  if (optSensitivity) {
    const sensVal = Math.round(options.mouseSensitivity * 200);
    optSensitivity.value = sensVal;
    if (optSensitivityVal) {
      if (sensVal === 100) optSensitivityVal.textContent = '100% (Normal)';
      else if (sensVal === 200) optSensitivityVal.textContent = '200% (HyperSpeed)';
      else if (sensVal === 0) optSensitivityVal.textContent = '0% (Yawn)';
      else optSensitivityVal.textContent = `${sensVal}%`;
    }
  }
  if (optGuiScale) {
    optGuiScale.value = options.guiScale;
    if (optGuiScaleVal) {
      if (options.guiScale === 0) optGuiScaleVal.textContent = 'Auto';
      else optGuiScaleVal.textContent = `${options.guiScale}x`;
    }
  }
  if (optFps) {
    optFps.value = options.maxFps;
    if (optFpsVal) {
      if (options.maxFps === 260) optFpsVal.textContent = 'Unlimited';
      else optFpsVal.textContent = `${options.maxFps} FPS`;
    }
  }
  if (optMaster) {
    const masterVal = Math.round(options.soundCategory_master * 100);
    optMaster.value = masterVal;
    if (optMasterVal) optMasterVal.textContent = `${masterVal}%`;
  }
  if (optMusic) {
    const musicVal = Math.round(options.soundCategory_music * 100);
    optMusic.value = musicVal;
    if (optMusicVal) optMusicVal.textContent = `${musicVal}%`;
  }
  if (optVsync) {
    optVsync.checked = options.enableVsync;
  }
  if (optFullscreen) {
    optFullscreen.checked = options.fullscreen;
  }

  if (availableResourcePacks.length === 0) {
    resourcepacksList.innerHTML = '<div style="color: rgba(255,255,255,0.3); font-size: 10px; text-align: center; padding: 15px 0; width: 100%;">No resource packs found in folder.</div>';
    return;
  }

  resourcepacksList.innerHTML = '';
  const activePacks = options.resourcePacks || [];

  availableResourcePacks.forEach(packName => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.style.background = 'rgba(255, 255, 255, 0.02)';
    item.style.border = '1px solid rgba(255, 255, 255, 0.05)';
    item.style.borderRadius = '6px';
    item.style.padding = '6px 10px';
    item.style.fontSize = '10px';
    item.style.color = '#fff';
    item.style.width = '100%';
    item.style.boxSizing = 'border-box';
    item.style.gap = '10px';

    const label = document.createElement('span');
    label.textContent = packName;
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.whiteSpace = 'nowrap';
    label.style.flex = '1';
    label.title = packName;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.accentColor = 'var(--primary)';
    checkbox.style.cursor = 'pointer';
    
    const fileRef = `file/${packName}`;
    const isActive = activePacks.includes(fileRef) || activePacks.includes(packName);
    checkbox.checked = isActive;

    item.appendChild(label);
    item.appendChild(checkbox);
    resourcepacksList.appendChild(item);

    item.dataset.packRef = fileRef;
    item.dataset.packName = packName;
  });
}

function switchSettingsTab(tabName) {
  if (tabName === 'addons') {
    if (tabBtnAddons) {
      tabBtnAddons.classList.add('active');
      tabBtnAddons.style.color = '#fff';
      tabBtnAddons.style.borderBottomColor = 'var(--primary)';
    }
    if (tabBtnOptions) {
      tabBtnOptions.classList.remove('active');
      tabBtnOptions.style.color = 'rgba(255,255,255,0.4)';
      tabBtnOptions.style.borderBottomColor = 'transparent';
    }
    if (tabPanelAddons) tabPanelAddons.style.display = 'flex';
    if (tabPanelOptions) tabPanelOptions.style.display = 'none';
  } else {
    if (tabBtnOptions) {
      tabBtnOptions.classList.add('active');
      tabBtnOptions.style.color = '#fff';
      tabBtnOptions.style.borderBottomColor = 'var(--primary)';
    }
    if (tabBtnAddons) {
      tabBtnAddons.classList.remove('active');
      tabBtnAddons.style.color = 'rgba(255,255,255,0.4)';
      tabBtnAddons.style.borderBottomColor = 'transparent';
    }
    if (tabPanelAddons) tabPanelAddons.style.display = 'none';
    if (tabPanelOptions) tabPanelOptions.style.display = 'flex';
    
    if (editingPackSettings) {
      loadGameOptions(editingPackSettings);
    }
  }
}

if (tabBtnAddons) {
  tabBtnAddons.addEventListener('click', () => switchSettingsTab('addons'));
}
if (tabBtnOptions) {
  tabBtnOptions.addEventListener('click', () => switchSettingsTab('options'));
}

if (optRender) {
  optRender.addEventListener('input', (e) => {
    if (optRenderVal) optRenderVal.textContent = `${e.target.value} chunks`;
  });
}
if (optFov) {
  optFov.addEventListener('input', (e) => {
    if (optFovVal) {
      const val = parseInt(e.target.value, 10);
      if (val === 70) optFovVal.textContent = '70 (Normal)';
      else if (val === 110) optFovVal.textContent = '110 (Quake Pro)';
      else optFovVal.textContent = val;
    }
  });
}
if (optSensitivity) {
  optSensitivity.addEventListener('input', (e) => {
    if (optSensitivityVal) {
      const val = parseInt(e.target.value, 10);
      if (val === 100) optSensitivityVal.textContent = '100% (Normal)';
      else if (val === 200) optSensitivityVal.textContent = '200% (HyperSpeed)';
      else if (val === 0) optSensitivityVal.textContent = '0% (Yawn)';
      else optSensitivityVal.textContent = `${val}%`;
    }
  });
}
if (optGuiScale) {
  optGuiScale.addEventListener('input', (e) => {
    if (optGuiScaleVal) {
      const val = parseInt(e.target.value, 10);
      if (val === 0) optGuiScaleVal.textContent = 'Auto';
      else optGuiScaleVal.textContent = `${val}x`;
    }
  });
}
if (optFps) {
  optFps.addEventListener('input', (e) => {
    if (optFpsVal) {
      const val = parseInt(e.target.value, 10);
      if (val === 260) optFpsVal.textContent = 'Unlimited';
      else optFpsVal.textContent = `${val} FPS`;
    }
  });
}
if (optMaster) {
  optMaster.addEventListener('input', (e) => {
    if (optMasterVal) optMasterVal.textContent = `${e.target.value}%`;
  });
}
if (optMusic) {
  optMusic.addEventListener('input', (e) => {
    if (optMusicVal) optMusicVal.textContent = `${e.target.value}%`;
  });
}

if (packSettingsSave) {
  packSettingsSave.addEventListener('click', async () => {
    if (editingPackSettings) {
      if (!configSettings.addons) configSettings.addons = {};
      configSettings.addons[editingPackSettings] = {
        shaders: packSettingsShaders.checked
      };
      
      const settings = {
        nickname: settingsNickname.value.trim() || 'Player',
        ramGb: parseInt(settingsRam.value, 10),
        javaPath: settingsJava.value.trim(),
        jvmArgs: settingsArgs.value.trim(),
        selectedPack: activePack,
        mockMode: settingsMock.checked,
        addons: configSettings.addons
      };
      
      const res = await window.api.saveSettings(settings);
      if (res.success) {
        configSettings = settings;

        // Save options.txt parameters
        if (optRender && optFov && optSensitivity && optGuiScale && optFps && optMaster && optMusic && optVsync && optFullscreen) {
          const activePacks = ['vanilla'];
          const packItems = document.querySelectorAll('#resourcepacks-list > div');
          packItems.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
              activePacks.push(item.dataset.packRef);
            }
          });

          const optionsObj = {
            renderDistance: parseInt(optRender.value, 10),
            fov: (parseInt(optFov.value, 10) - 70) / 40,
            mouseSensitivity: parseFloat(optSensitivity.value) / 200,
            guiScale: parseInt(optGuiScale.value, 10),
            maxFps: parseInt(optFps.value, 10),
            soundCategory_master: parseFloat(optMaster.value) / 100,
            soundCategory_music: parseFloat(optMusic.value) / 100,
            enableVsync: optVsync.checked,
            fullscreen: optFullscreen.checked,
            resourcePacks: activePacks
          };

          await window.api.saveGameOptions(editingPackSettings, optionsObj);
        }

        if (packSettingsModal) packSettingsModal.classList.add('hidden');
        if (shadersHelpPanel) shadersHelpPanel.style.display = 'none';
        if (shadersDropzoneStatus) shadersDropzoneStatus.style.display = 'none';
        updateVersionCheck();
      } else {
        await showCustomAlert('Failed to save settings: ' + res.error, 'error', 'Error');
      }
    }
  });
}

const packSettingsResetBtn = document.getElementById('pack-settings-reset');
const packSettingsDeleteBtn = document.getElementById('pack-settings-delete');

if (packSettingsResetBtn) {
  packSettingsResetBtn.addEventListener('click', async () => {
    if (editingPackSettings) {
      if (await showCustomConfirm('Reset all options of this modpack to default?', 'Reset Modpack Settings', 'warning', 'Reset')) {
        packSettingsResetBtn.disabled = true;
        packSettingsResetBtn.textContent = 'Clearing...';
        const res = await window.api.resetPackSettings(editingPackSettings);
        packSettingsResetBtn.disabled = false;
        packSettingsResetBtn.textContent = 'Reset Options';
        if (res.success) {
          await showCustomAlert('Modpack options have been reset to default. Please reopen the menu.', 'success', 'Success');
          if (packSettingsModal) packSettingsModal.classList.add('hidden');
          if (configSettings.addons && configSettings.addons[editingPackSettings]) {
            delete configSettings.addons[editingPackSettings];
          }
        } else {
          await showCustomAlert('Failed to reset: ' + res.error, 'error', 'Error');
        }
      }
    }
  });
}

if (packSettingsDeleteBtn) {
  packSettingsDeleteBtn.addEventListener('click', async () => {
    if (editingPackSettings) {
      if (await showCustomConfirm('WARNING! This will completely delete the installed modpack files. Continue?', 'Delete Modpack', 'error', 'Delete')) {
        packSettingsDeleteBtn.disabled = true;
        packSettingsDeleteBtn.textContent = 'Deleting...';
        const res = await window.api.deletePack(editingPackSettings);
        packSettingsDeleteBtn.disabled = false;
        packSettingsDeleteBtn.textContent = 'Delete Modpack';
        if (res.success) {
          await showCustomAlert('Modpack deleted successfully.', 'success', 'Success');
          if (packSettingsModal) packSettingsModal.classList.add('hidden');
          updateVersionCheck();
        } else {
          await showCustomAlert('Failed to delete modpack: ' + res.error, 'error', 'Error');
        }
      }
    }
  });
}

settingsClearBtn.addEventListener('click', async () => {
  if (await showCustomConfirm('WARNING! This will delete ALL downloaded modpacks, mods, and game files. Are you completely sure?', 'Clear Game Data', 'error', 'Delete All')) {
    settingsClearBtn.disabled = true;
    settingsClearBtn.textContent = 'Deleting...';
    const res = await window.api.clearInstances();
    if (res.success) {
      await showCustomAlert('All game versions deleted successfully. They will be re-downloaded on next launch.', 'success', 'Success');
    } else {
      await showCustomAlert('Failed to delete game versions: ' + res.error, 'error', 'Error');
    }
    settingsClearBtn.disabled = false;
    settingsClearBtn.textContent = 'Delete All Game Versions';
  }
});

// Website & Debug button handlers
websiteBtn.addEventListener('click', () => {
  window.api.openWebsite();
});

debugBtn.addEventListener('click', () => {
  window.api.openConsoleWindow();
});

// Action play button execution flow
playBtn.addEventListener('click', async () => {
  if (launcherState !== 'ready' && launcherState !== 'error') {
    if (launcherState === 'playing') {
      // Open debug console
      window.api.openConsoleWindow();
    }
    return;
  }

  // 1. Nickname Check & Verification
  const rawNick = (usernameInput ? usernameInput.value : '') || (settingsNickname ? settingsNickname.value : '') || (configSettings ? configSettings.nickname : '') || '';
  const trimmedNick = rawNick.trim();

  // If nickname is empty or default 'Player' (or 'player')
  if (!trimmedNick || trimmedNick.toLowerCase() === 'player') {
    if (usernameInput) {
      usernameInput.focus();
      usernameInput.select();
    }
    const proceed = await showCustomConfirm(
      'You are currently using the default nickname "Player". Would you like to change it to your own custom nickname to keep your server progress and inventory?',
      'Nickname Verification',
      'warning',
      'Play as Player'
    );
    if (!proceed) {
      if (usernameInput) {
        usernameInput.focus();
        usernameInput.select();
      }
      return;
    }
  }

  // Ensure current trimmed nickname is saved immediately to settings
  const finalNick = trimmedNick || 'Player';
  if (configSettings) configSettings.nickname = finalNick;
  if (usernameInput) usernameInput.value = finalNick;
  if (settingsNickname) settingsNickname.value = finalNick;
  updateUserAvatar(finalNick);
  if (configSettings) await window.api.saveSettings(configSettings);

  // Update last played timestamp and re-sort
  localStorage.setItem('lastPlayed_' + activePack, Date.now());
  sortModpacks();

  // Go to updating process
  launcherState = 'updating';
  playBtn.disabled = true;
  btnText.textContent = 'UPDATING...';
  progressContainer.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressPercentage.textContent = '0%';

  // We don't clear logs console here anymore because it's handled in the debug window

  try {
    const res = await window.api.startUpdate(activePack);
    if (!res.success) {
      throw new Error(res.error);
    }

    // Update successfully completed or was already updated, launch client
    launcherState = 'launching';
    progressFill.style.width = '0%';
    progressPercentage.textContent = '0%';
    progressStatus.textContent = 'Launching client...';
    btnText.textContent = 'WAIT...';

    const launchRes = await window.api.startLaunch(activePack, finalNick);
    if (!launchRes.success) {
      if (launchRes.javaError) {
        launcherState = 'error';
        playBtn.disabled = false;
        progressContainer.classList.add('hidden');
        btnText.textContent = 'PLAY';
        return;
      }
      throw new Error(launchRes.error);
    }
  } catch (err) {
    launcherState = 'error';
    playBtn.disabled = false;
    progressContainer.classList.add('hidden');
    btnText.textContent = 'PLAY';
    
    // Open debug console on error only if in Developer Mode (mockMode)
    if (configSettings.mockMode) {
      window.api.openConsoleWindow();
    }
    await showCustomAlert(`Launch aborted: ${err.message}`, 'error', 'Launch Failed');
  }
});



// IPC Progress Update Observers
window.api.onUpdateStatus((data) => {
  console.log('Update progress status:', data);
  if (data.status === 'checking') {
    progressStatus.textContent = data.message;
  } else if (data.status === 'downloading_pack' || data.status === 'downloading_mods') {
    progressStatus.textContent = data.message;
    progressFill.style.width = `${data.progress}%`;
    progressPercentage.textContent = `${data.progress}%`;
  } else if (data.status === 'extracting' || data.status === 'cleaning' || data.status === 'overrides') {
    progressStatus.textContent = data.message;
    progressFill.style.width = '100%';
    progressPercentage.textContent = '100%';
  } else if (data.status === 'ready') {
    progressStatus.textContent = 'Modpack updated!';
    progressFill.style.width = '100%';
    progressPercentage.textContent = '100%';
    // update local tag
    if (data.config) {
      let displayVer = '';
      if (data.config.packVersion) {
        displayVer = `v${data.config.packVersion}`;
      } else if (data.config.commitMessage) {
        displayVer = data.config.commitMessage;
      } else {
        displayVer = `v${data.config.version.substring(0, 7)}`;
      }
      statLocalVerEl.textContent = displayVer;
      if (data.config.minecraft) statMcVerEl.textContent = data.config.minecraft;
    }
  }
});

window.api.onLaunchStatus((data) => {
  console.log('Launch progress status:', data);
  if (data.status === 'installing_loader') {
    progressStatus.textContent = data.message;
  } else if (data.status === 'downloading_assets') {
    progressStatus.textContent = data.message;
    progressFill.style.width = `${data.progress}%`;
    progressPercentage.textContent = `${data.progress}%`;
  } else if (data.status === 'launching') {
    progressStatus.textContent = data.message;
  } else if (data.status === 'game_started') {
    progressStatus.textContent = 'Game is running';
    progressContainer.classList.add('hidden');
    launcherState = 'playing';
    playBtn.disabled = false;
    btnText.textContent = 'PLAYING';
    
    // Auto open debug console only if Developer Mode (mockMode) is enabled
    if (configSettings.mockMode) {
      window.api.openConsoleWindow();
    }
    
    // Smooth fade out and hide
    document.body.classList.add('fade-out');
    clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      if (launcherState === 'playing') {
        window.api.launcherHide();
      }
    }, 800); // Wait for CSS transition
    
  } else if (data.status === 'game_running') {
    // logs go to debug console window now
  } else if (data.status === 'game_crashed') {
    launcherState = 'ready';
    playBtn.disabled = false;
    updateVersionCheck();
    
    clearTimeout(hideTimeout);
    window.api.launcherShow();
    setTimeout(() => {
      document.body.classList.remove('fade-out');
      window.api.restoreWindow();
    }, 100);

    // Setup Crash Modal
    const crashModal = document.getElementById('crash-error-modal');
    document.getElementById('crash-error-title').textContent = `Minecraft crashed (Exit Code: ${data.code})`;
    
    const uploadBtn = document.getElementById('crash-upload-btn');
    const openLogsBtn = document.getElementById('crash-open-btn');
    const closeBtn = document.getElementById('crash-modal-close');
    const resultDiv = document.getElementById('crash-upload-result');
    const urlInput = document.getElementById('crash-url-input');
    const copyBtn = document.getElementById('crash-copy-btn');
    
    // Reset state
    resultDiv.classList.add('hidden');
    uploadBtn.textContent = 'Upload Log to Web';
    uploadBtn.disabled = false;

    closeBtn.onclick = () => crashModal.classList.add('hidden');
    
    openLogsBtn.onclick = () => {
      window.api.openInstancesDir(); // We'll just open the instances dir for now, or we can add a specific open path
    };

    uploadBtn.onclick = async () => {
      uploadBtn.textContent = 'Uploading...';
      uploadBtn.disabled = true;
      try {
        const res = await window.api.uploadLog(data.instanceDir);
        if (res.success) {
          resultDiv.classList.remove('hidden');
          urlInput.value = res.url;
          uploadBtn.textContent = 'Uploaded!';
          uploadBtn.style.background = '#27ae60'; // Green
        }
      } catch (err) {
        await showCustomAlert('Failed to upload log: ' + err.message, 'error', 'Upload Failed');
        uploadBtn.textContent = 'Upload Log to Web';
        uploadBtn.disabled = false;
      }
    };

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(urlInput.value);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    };

    crashModal.classList.remove('hidden');
    
  } else if (data.status === 'game_exited') {
    // reset launcher state
    launcherState = 'ready';
    playBtn.disabled = false;
    updateVersionCheck();
    
    // Clear any pending hide
    clearTimeout(hideTimeout);
    
    // Restore launcher visibility
    window.api.launcherShow();
    setTimeout(() => {
      document.body.classList.remove('fade-out');
      window.api.restoreWindow();
    }, 100);
  } else if (data.status === 'java-error') {
    launcherState = 'error';
    playBtn.disabled = false;
    progressContainer.classList.add('hidden');
    clearTimeout(hideTimeout);
    window.api.launcherShow();
    document.body.classList.remove('fade-out');
    updateVersionCheck();

    // Show Java Error Modal
    const javaModal = document.getElementById('java-error-modal');
    const javaDesc = document.getElementById('java-error-desc');
    const javaAutoBtn = document.getElementById('java-auto-btn');
    const javaManualBtn = document.getElementById('java-manual-btn');
    const javaCloseBtn = document.getElementById('java-modal-close');
    
    const javaHeader = document.getElementById('java-error-header');
    const javaErrorBox = document.getElementById('java-error-box');
    const javaIcon = javaErrorBox ? javaErrorBox.querySelector('svg') : null;
    
    if (data.message.toLowerCase().includes('requires java') || data.message.toLowerCase().includes('are using java')) {
      if (javaHeader) {
        javaHeader.textContent = 'Java Update Required';
        javaHeader.style.color = '#ffa502';
      }
      if (javaErrorBox) {
        javaErrorBox.style.background = 'rgba(255, 165, 2, 0.08)';
        javaErrorBox.style.borderColor = 'rgba(255, 165, 2, 0.2)';
      }
      if (javaIcon) {
        javaIcon.setAttribute('stroke', '#ffa502');
      }
    } else {
      if (javaHeader) {
        javaHeader.textContent = 'Java Not Found';
        javaHeader.style.color = '#ff4757';
      }
      if (javaErrorBox) {
        javaErrorBox.style.background = 'rgba(255, 71, 87, 0.08)';
        javaErrorBox.style.borderColor = 'rgba(255, 71, 87, 0.2)';
      }
      if (javaIcon) {
        javaIcon.setAttribute('stroke', '#ff4757');
      }
    }

    javaDesc.textContent = data.message;
    
    javaCloseBtn.onclick = () => {
      javaModal.classList.add('hidden');
    };
    
    javaManualBtn.onclick = () => {
      window.open('https://adoptium.net/');
    };
    
    javaAutoBtn.onclick = async () => {
      const javaModalFooter = document.getElementById('java-modal-footer');
      javaModalFooter.classList.add('hidden');
      document.getElementById('java-download-progress').classList.remove('hidden');
      try {
        const result = await window.api.installJava(data.requiredVersion);
        if (result && result.success) {
          if (settingsJava) settingsJava.value = result.javaPath;
          
          document.getElementById('java-download-progress').classList.add('hidden');
          if (javaHeader) {
            javaHeader.textContent = 'Java Installed!';
            javaHeader.style.color = '#2cd63b';
          }
          if (javaErrorBox) {
            javaErrorBox.style.background = 'rgba(44, 214, 59, 0.08)';
            javaErrorBox.style.borderColor = 'rgba(44, 214, 59, 0.2)';
          }
          if (javaIcon) {
            javaIcon.setAttribute('stroke', '#2cd63b');
            javaIcon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
          }
          javaDesc.textContent = `Java ${data.requiredVersion} was successfully installed! Click Close and press PLAY to start the game.`;
          
          javaModalFooter.classList.remove('hidden');
          javaManualBtn.style.display = 'none';
          javaAutoBtn.textContent = 'Close';
          javaAutoBtn.style.background = 'linear-gradient(135deg, #2cd63b 0%, #218c32 100%)';
          javaAutoBtn.onclick = () => {
            javaModal.classList.add('hidden');
            // reset button to defaults
            javaManualBtn.style.display = 'block';
            javaAutoBtn.textContent = 'Install Automatically';
            javaAutoBtn.style.background = 'linear-gradient(135deg, #44bd32 0%, #27ae60 100%)';
            if (javaIcon) javaIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16">';
          };
        } else {
          throw new Error('Installation failed without throwing an error');
        }
      } catch (e) {
        document.getElementById('java-download-progress').classList.add('hidden');
        javaModalFooter.classList.remove('hidden');
        if (javaHeader) {
          javaHeader.textContent = 'Installation Failed';
          javaHeader.style.color = '#ff4757';
        }
        if (javaErrorBox) {
          javaErrorBox.style.background = 'rgba(255, 71, 87, 0.08)';
          javaErrorBox.style.borderColor = 'rgba(255, 71, 87, 0.2)';
        }
        if (javaIcon) {
          javaIcon.setAttribute('stroke', '#ff4757');
          javaIcon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
        }
        javaDesc.textContent = `Failed to automatically download Java: ${e.message}. Please try manual installation.`;
      }
    };
    
    javaModal.classList.remove('hidden');

  } else if (data.status === 'error') {
    launcherState = 'error';
    playBtn.disabled = false;
    progressContainer.classList.add('hidden');
    clearTimeout(hideTimeout);
    window.api.launcherShow();
    document.body.classList.remove('fade-out');
    updateVersionCheck();
  }
});

// App Initiation
async function initApp() {
  initParticles();
  animate();
  
  // Launcher Updater UI
  const updateOverlay = document.getElementById('launcher-update-overlay');
  const updateStatus = document.getElementById('launcher-update-status');
  const updatePercent = document.getElementById('launcher-update-percentage');
  const updateFill = document.getElementById('launcher-update-fill');

  if (window.api.onAppUpdateState) {
    window.api.onAppUpdateState((state) => {
      if (state.status === 'checking') {
        updateOverlay.classList.remove('hidden');
        updateStatus.textContent = 'Checking for launcher updates...';
      } else if (state.status === 'available') {
        updateOverlay.classList.remove('hidden');
        updateStatus.textContent = 'Downloading version ' + state.version + '...';
      } else if (state.status === 'progress') {
        updateOverlay.classList.remove('hidden');
        updateFill.style.width = state.percent + '%';
        updatePercent.textContent = Math.round(state.percent) + '%';
        let speedStr = (state.bytesPerSecond / (1024 * 1024)).toFixed(1) + ' MB/s';
        updateStatus.textContent = 'Downloading... ' + speedStr;
      } else if (state.status === 'downloaded') {
        updateOverlay.classList.remove('hidden');
        updateStatus.textContent = 'Installing update... Restarting...';
        updateFill.style.width = '100%';
        updatePercent.textContent = '100%';
        setTimeout(() => {
          window.api.installAppUpdate();
        }, 1000);
      } else if (state.status === 'not-available' || state.status === 'error') {
        updateOverlay.classList.add('hidden');
      }
    });
  }

  // Load local client settings configuration
  await loadSettings();

  // Get and display app version
  try {
    const version = await window.api.getAppVersion();
    const verEl = document.getElementById('app-version-display');
    if (verEl) verEl.textContent = 'v' + version;
    
    const launcherVerEl = document.getElementById('launcher-version-display');
    if (launcherVerEl) launcherVerEl.textContent = 'Launcher v' + version;
  } catch (e) {
    console.error('Failed to get version', e);
  }

  // Sort modpacks based on last played initially
  sortModpacks();

  // Load saved pack or default to create_new_world
  let initialPack = (configSettings && configSettings.selectedPack && packDetails[configSettings.selectedPack]) 
    ? configSettings.selectedPack 
    : 'create_new_world';
  switchModpack(initialPack);
}

// Sort modpacks in the UI
function sortModpacks(activeServerPack = null) {
  const listContainer = document.querySelector('.modpack-list');
  if (!listContainer) return;
  const items = Array.from(listContainer.querySelectorAll('.modpack-item'));
  
  items.sort((a, b) => {
    const packA = a.dataset.pack;
    const packB = b.dataset.pack;

    // Priority 1: Currently running on server
    if (activeServerPack) {
      if (packA === activeServerPack) return -1;
      if (packB === activeServerPack) return 1;
    }
    
    // Priority 2: Recently launched
    const timeA = parseInt(localStorage.getItem('lastPlayed_' + packA) || '0', 10);
    const timeB = parseInt(localStorage.getItem('lastPlayed_' + packB) || '0', 10);
    
    // Sort descending (most recent first)
    return timeB - timeA;
  });
  
  // Re-append to container in new order
  items.forEach(item => listContainer.appendChild(item));
}

// Modpack Click List Handlers
document.querySelectorAll('.modpack-item').forEach(item => {
  item.addEventListener('click', () => {
    switchModpack(item.dataset.pack);
  });
});

// Window Control Listeners
winMinimizeBtn.addEventListener('click', () => window.api.minimizeWindow());
winMaximizeBtn.addEventListener('click', () => window.api.maximizeWindow());
winCloseBtn.addEventListener('click', () => window.api.closeWindow());

// Run Init
initApp();

