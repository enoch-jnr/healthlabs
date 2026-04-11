/* =============================================
   HealthLabs — app.js
   Demo Prototype · All logic in one clean file
   ============================================= */

'use strict';

// ============================================================
//  STATE
// ============================================================
const State = {
  currentUser: null,
  currentTool: 'box',
  annotations: [],
  currentImage: null,
  selectedAnnotation: null,
  isDrawing: false,
  startX: 0, startY: 0,
  polygonPoints: [],
  logs: [],
  datasets: [],
  workspaces: [],
};

// ============================================================
//  SAMPLE DATA
// ============================================================
const SAMPLE_DATASETS = [
  {
    id: 'ds1',
    title: 'Chest X-Ray Series A',
    desc: 'Posterior-anterior chest radiographs for pneumonia detection study.',
    imgUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Chest_Xray_PA_3-8-2010.png/420px-Chest_Xray_PA_3-8-2010.png',
  },
  {
    id: 'ds2',
    title: 'Brain MRI Slices',
    desc: 'Axial T1-weighted MRI slices for tumor segmentation.',
    imgUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Typical_MRI_Brain_Scan.jpg/420px-Typical_MRI_Brain_Scan.jpg',
  },
  {
    id: 'ds3',
    title: 'Retinal Fundus Images',
    desc: 'Color fundus photography for diabetic retinopathy grading.',
    imgUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Fundus_photo_of_normal_left_eye.jpg/420px-Fundus_photo_of_normal_left_eye.jpg',
  },
  {
    id: 'ds4',
    title: 'Skin Lesion Dermoscopy',
    desc: 'Dermoscopic images for melanoma classification.',
    imgUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Dermoscopy_of_a_melanoma.jpg/420px-Dermoscopy_of_a_melanoma.jpg',
  },
];

const SAMPLE_WORKSPACES = [
  {
    id: 'ws1',
    name: 'Radiology Team Alpha',
    icon: '🫁',
    role: 'Owner',
    tag: 'RADIOLOGY',
    participants: ['Dr. Chen', 'Dr. Osei', 'Dr. Patel', 'Dr. Kim'],
    activity: [
      { user: 'Dr. Chen', action: 'annotated image "Chest X-Ray #4"', time: '2m ago' },
      { user: 'Dr. Osei', action: 'uploaded 12 new images', time: '1h ago' },
    ],
  },
  {
    id: 'ws2',
    name: 'Neuro Research Lab',
    icon: '🧠',
    role: 'Member',
    tag: 'NEUROLOGY',
    participants: ['Dr. Smith', 'Dr. Andoh', 'Dr. Müller'],
    activity: [
      { user: 'Dr. Smith', action: 'added label "Glioma" to slice 14', time: '5m ago' },
      { user: 'Dr. Andoh', action: 'exported PDF report', time: '3h ago' },
    ],
  },
  {
    id: 'ws3',
    name: 'Oncology AI Project',
    icon: '🔬',
    role: 'Viewer',
    tag: 'ONCOLOGY',
    participants: ['Dr. Boateng', 'Dr. Liu'],
    activity: [
      { user: 'Dr. Boateng', action: 'ran AI suggestion on image', time: '15m ago' },
    ],
  },
];

// ============================================================
//  UTILITY
// ============================================================
function showPage(pageName) {
  if (pageName === 'page-login') window.location.href = 'login.html';
  else if (pageName === 'page-signup') window.location.href = 'signup.html';
  else if (pageName === 'page-home') window.location.href = 'index.html';
  else if (pageName === 'page-dashboard') window.location.href = 'dashboard.html';
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ============================================================
//  INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.toLowerCase();
  const isAuthPage = currentPath.includes('login.html') || currentPath.includes('signup.html');
  const isDashboardPage = currentPath.includes('dashboard.html');
  const isHomePage = currentPath.includes('index.html') || (!isAuthPage && !isDashboardPage);

  // Check for existing session
  const stored = localStorage.getItem('hl_user');
  if (stored) {
    State.currentUser = JSON.parse(stored);
    
    // Auth Guard
    if (isAuthPage) {
      window.location.href = 'dashboard.html';
      return;
    }
    
    // Update Home Nav if logged in
    if (isHomePage) {
      const loginBtn = document.getElementById('nav-login-btn');
      const signupBtn = document.getElementById('nav-signup-btn');
      if (loginBtn) { loginBtn.textContent = 'Dashboard'; loginBtn.onclick = () => window.location.href='dashboard.html'; }
      if (signupBtn) { signupBtn.style.display = 'none'; }
    }
    
    if (isDashboardPage) {
      initDashboard();
    }
  } else {
    // Auth Guard
    if (isDashboardPage) {
      window.location.href = 'login.html';
      return;
    }
  }

  // Seed default demo user
  if (!localStorage.getItem('hl_users')) {
    localStorage.setItem('hl_users', JSON.stringify([
      { email: 'demo@healthlabs.io', password: 'demo123', name: 'Demo User' }
    ]));
  }

  loadSavedLogs();
  loadSavedDatasets();
  loadSavedWorkspaces();
});

// ============================================================
//  AUTH
// ============================================================
function getUsers() {
  return JSON.parse(localStorage.getItem('hl_users') || '[]');
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');

  if (!email || !password) {
    showAuthError(errEl, 'Please fill in all fields.');
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    // For demo: allow any email/password combo (min 6 chars password)
    if (password.length < 6) {
      showAuthError(errEl, 'Password must be at least 6 characters.');
      return;
    }
    // Create new session for any valid credentials
    const name = email.split('@')[0].replace(/[._]/g, ' ');
    State.currentUser = { email, name: capitalize(name) };
  } else {
    State.currentUser = { email: user.email, name: user.name };
  }

  localStorage.setItem('hl_user', JSON.stringify(State.currentUser));
  addLog('login', `<span class="log-user">${State.currentUser.name}</span> signed in to HealthLabs`);
  window.location.href = 'dashboard.html';
}

function handleSignup() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('signup-error');

  if (!name || !email || !password) {
    showAuthError(errEl, 'Please fill in all fields.');
    return;
  }
  if (password.length < 6) {
    showAuthError(errEl, 'Password must be at least 6 characters.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAuthError(errEl, 'Please enter a valid email address.');
    return;
  }

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    showAuthError(errEl, 'An account with this email already exists.');
    return;
  }

  users.push({ name, email, password });
  localStorage.setItem('hl_users', JSON.stringify(users));
  State.currentUser = { email, name };
  localStorage.setItem('hl_user', JSON.stringify(State.currentUser));
  addLog('login', `<span class="log-user">${name}</span> created a new account`);
  window.location.href = 'dashboard.html';
}

function handleLogout() {
  localStorage.removeItem('hl_user');
  State.currentUser = null;
  State.annotations = [];
  State.currentImage = null;
  window.location.href = 'index.html';
}

function showAuthError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

// ============================================================
//  DASHBOARD INIT
// ============================================================
function initDashboard() {
  const u = State.currentUser;
  document.getElementById('sidebar-username').textContent = u.name;
  document.getElementById('user-avatar').textContent = getInitials(u.name);
  renderDatasets();
  renderWorkspaces();
  renderLogs();
  renderImageSelector();
}

function switchSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  if (id === 'labeling') renderImageSelector();
  if (id === 'logs') renderLogs();
}

// ============================================================
//  DATASET LIBRARY
// ============================================================
function loadSavedDatasets() {
  const saved = JSON.parse(localStorage.getItem('hl_datasets') || '[]');
  State.datasets = [...SAMPLE_DATASETS, ...saved];
}

function saveDatasets() {
  // Only save user-uploaded ones
  const userDs = State.datasets.filter(d => d.userUploaded);
  localStorage.setItem('hl_datasets', JSON.stringify(userDs));
}

function renderDatasets() {
  const grid = document.getElementById('dataset-grid');
  grid.innerHTML = '';
  State.datasets.forEach(ds => {
    const card = document.createElement('div');
    card.className = 'dataset-card';
    card.innerHTML = `
      ${ds.imgUrl
        ? `<img class="dataset-img" src="${ds.imgUrl}" alt="${ds.title}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : ''
      }
      <div class="dataset-img-placeholder" ${ds.imgUrl ? 'style="display:none"' : ''}>🏥</div>
      <div class="dataset-info">
        <div class="dataset-title">${ds.title}</div>
        <div class="dataset-desc">${ds.desc}</div>
        <div class="dataset-actions">
          <button class="btn btn-primary" onclick="openInLabeler('${ds.id}')">Annotate</button>
          <button class="btn btn-outline" onclick="downloadDataset('${ds.id}')">↓ Download</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function handleUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const newDs = {
      id: 'user_' + uid(),
      title: file.name.replace(/\.[^.]+$/, ''),
      desc: `Uploaded ${new Date().toLocaleDateString()}. ${(file.size / 1024).toFixed(0)} KB.`,
      imgUrl: e.target.result,
      userUploaded: true,
    };
    State.datasets.push(newDs);
    saveDatasets();
    renderDatasets();
    renderImageSelector();
    addLog('upload', `<span class="log-user">${State.currentUser.name}</span> uploaded image "${newDs.title}"`);
    showToast('Image uploaded to Dataset Library!');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function openInLabeler(dsId) {
  const ds = State.datasets.find(d => d.id === dsId);
  if (!ds) return;
  switchSection('labeling', document.querySelector('[data-section="labeling"]'));
  loadImageOnCanvas(ds);
}

function downloadDataset(dsId) {
  const ds = State.datasets.find(d => d.id === dsId);
  if (!ds) return;
  showToast(`Downloading "${ds.title}"... (simulated)`);
  addLog('upload', `<span class="log-user">${State.currentUser.name}</span> downloaded dataset "${ds.title}"`);
}

// ============================================================
//  WORKSPACES
// ============================================================
function loadSavedWorkspaces() {
  const saved = JSON.parse(localStorage.getItem('hl_workspaces') || '[]');
  State.workspaces = [...SAMPLE_WORKSPACES, ...saved];
}

function renderWorkspaces() {
  const grid = document.getElementById('workspaces-grid');
  grid.innerHTML = '';
  State.workspaces.forEach(ws => {
    const avatars = ws.participants.slice(0, 4).map(p =>
      `<div class="participant-avatar" title="${p}">${getInitials(p)}</div>`
    ).join('');
    const extra = ws.participants.length > 4
      ? `<div class="participant-avatar">+${ws.participants.length - 4}</div>` : '';
    const activityLines = ws.activity.map(a =>
      `<div class="activity-line"><span class="user">${a.user}</span> ${a.action} <em style="color:var(--text-dim);font-size:10px">${a.time}</em></div>`
    ).join('');

    const card = document.createElement('div');
    card.className = 'workspace-card';
    card.innerHTML = `
      <div class="workspace-header">
        <div class="workspace-icon">${ws.icon}</div>
        <div>
          <div class="workspace-name">${ws.name}</div>
          <div class="workspace-role">${ws.role}</div>
        </div>
      </div>
      <div class="participants">${avatars}${extra}</div>
      <div class="workspace-activity">${activityLines || '<em style="color:var(--text-dim)">No recent activity</em>'}</div>
      <div class="workspace-footer">
        <span class="ws-tag">${ws.tag}</span>
        <button class="btn btn-outline" style="padding:5px 12px;font-size:12px" onclick="joinWorkspace('${ws.id}')">Open →</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function joinWorkspace(wsId) {
  const ws = State.workspaces.find(w => w.id === wsId);
  if (!ws) return;
  addLog('workspace', `<span class="log-user">${State.currentUser.name}</span> opened workspace "${ws.name}"`);
  showToast(`Opened workspace: ${ws.name}`);
}

function openCreateWorkspace() {
  openModal('Create New Workspace', `
    <div class="form-group">
      <label>Workspace Name</label>
      <input type="text" id="ws-name" placeholder="e.g. Cardiology Research Q4" />
    </div>
    <div class="form-group">
      <label>Specialty</label>
      <input type="text" id="ws-tag" placeholder="e.g. CARDIOLOGY" />
    </div>
    <div class="form-group">
      <label>Icon (emoji)</label>
      <input type="text" id="ws-icon" placeholder="🏥" maxlength="2" value="🏥" />
    </div>
    <button class="btn btn-primary btn-full" onclick="createWorkspace()">Create Workspace</button>
  `);
}

function createWorkspace() {
  const name = document.getElementById('ws-name').value.trim();
  const tag = document.getElementById('ws-tag').value.trim().toUpperCase() || 'GENERAL';
  const icon = document.getElementById('ws-icon').value.trim() || '🏥';

  if (!name) { showToast('Please enter a workspace name.', true); return; }

  const ws = {
    id: 'ws_' + uid(),
    name,
    icon,
    role: 'Owner',
    tag,
    participants: [State.currentUser.name],
    activity: [
      { user: State.currentUser.name, action: 'created this workspace', time: 'just now' }
    ],
    userCreated: true,
  };
  State.workspaces.push(ws);
  const saved = State.workspaces.filter(w => w.userCreated);
  localStorage.setItem('hl_workspaces', JSON.stringify(saved));
  renderWorkspaces();
  closeModal();
  addLog('workspace', `<span class="log-user">${State.currentUser.name}</span> created workspace "${name}"`);
  showToast(`Workspace "${name}" created!`);
}

// ============================================================
//  LABELING TOOL
// ============================================================
const canvas = document.getElementById('annotation-canvas');
const ctx = canvas.getContext('2d');
let canvasImage = null;
let imgScale = 1;
let imgOffsetX = 0, imgOffsetY = 0;

function renderImageSelector() {
  const list = document.getElementById('image-selector-list');
  if (!list) return;
  list.innerHTML = '';
  State.datasets.forEach(ds => {
    const item = document.createElement('div');
    item.className = 'img-sel-item' + (State.currentImage?.id === ds.id ? ' active' : '');
    item.textContent = ds.title;
    item.title = ds.title;
    item.onclick = () => loadImageOnCanvas(ds);
    list.appendChild(item);
  });
}

function loadImageOnCanvas(ds) {
  State.currentImage = ds;
  State.annotations = JSON.parse(localStorage.getItem('hl_ann_' + ds.id) || '[]');

  // Update selector highlight
  document.querySelectorAll('.img-sel-item').forEach(el => {
    el.classList.toggle('active', el.textContent === ds.title);
  });

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    canvasImage = img;
    fitCanvasToWrapper();
    redraw();
    document.getElementById('canvas-hint').style.display = 'none';
  };
  img.onerror = () => {
    // Create a placeholder canvas image
    const placeholderCanvas = document.createElement('canvas');
    placeholderCanvas.width = 800;
    placeholderCanvas.height = 600;
    const pCtx = placeholderCanvas.getContext('2d');
    pCtx.fillStyle = '#1a2235';
    pCtx.fillRect(0, 0, 800, 600);
    pCtx.fillStyle = '#2a3a50';
    pCtx.fillRect(50, 50, 700, 500);
    pCtx.fillStyle = '#4a5f78';
    pCtx.font = '24px DM Sans, sans-serif';
    pCtx.textAlign = 'center';
    pCtx.fillText(ds.title, 400, 280);
    pCtx.font = '14px DM Sans, sans-serif';
    pCtx.fillText('Annotate this image', 400, 315);

    const tempImg = new Image();
    tempImg.onload = () => {
      canvasImage = tempImg;
      fitCanvasToWrapper();
      redraw();
      document.getElementById('canvas-hint').style.display = 'none';
    };
    tempImg.src = placeholderCanvas.toDataURL();
  };
  img.src = ds.imgUrl;

  renderAnnotationsList();
  addLog('annotate', `<span class="log-user">${State.currentUser.name}</span> opened "${ds.title}" in Labeling Tool`);
}

function fitCanvasToWrapper() {
  const wrapper = canvas.parentElement;
  const ww = wrapper.clientWidth - 2;
  const wh = wrapper.clientHeight - 2;
  if (!canvasImage) return;

  const scaleX = ww / canvasImage.width;
  const scaleY = wh / canvasImage.height;
  imgScale = Math.min(scaleX, scaleY, 1);

  canvas.width = canvasImage.width * imgScale;
  canvas.height = canvasImage.height * imgScale;
}

function redraw() {
  if (!canvasImage) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(canvasImage, 0, 0, canvas.width, canvas.height);

  State.annotations.forEach((ann, i) => {
    drawAnnotation(ann, i === State.selectedAnnotation);
  });
}

function drawAnnotation(ann, isSelected) {
  ctx.save();
  const color = ann.color || '#00d4aa';
  ctx.strokeStyle = color;
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.setLineDash(isSelected ? [5, 3] : []);

  if (ann.type === 'box') {
    ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
    ctx.fillStyle = color + '22';
    ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
    drawLabel(ann.label, ann.x, ann.y - 4, color);
  } else if (ann.type === 'polygon' && ann.points.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(ann.points[0].x, ann.points[0].y);
    ann.points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = color + '22';
    ctx.fill();
    drawLabel(ann.label, ann.points[0].x, ann.points[0].y - 4, color);
  } else if (ann.type === 'marker') {
    ctx.beginPath();
    ctx.arc(ann.x, ann.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ann.x, ann.y, 12, 0, Math.PI * 2);
    ctx.stroke();
    drawLabel(ann.label, ann.x + 16, ann.y, color);
  } else if (ann.type === 'highlight') {
    ctx.fillStyle = color + '44';
    ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
    ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
    drawLabel(ann.label, ann.x, ann.y - 4, color);
  }
  ctx.restore();
}

function drawLabel(text, x, y, color) {
  if (!text) return;
  ctx.save();
  ctx.font = '500 12px DM Sans, sans-serif';
  const w = ctx.measureText(text).width + 12;
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 18, w, 18);
  ctx.fillStyle = isLightColor(color) ? '#000' : '#fff';
  ctx.fillText(text, x + 6, y - 4);
  ctx.restore();
}

function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

function setTool(tool) {
  State.currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tool-' + tool)?.classList.add('active');
  if (tool !== 'polygon') {
    State.polygonPoints = [];
  }
}

// Canvas Events
canvas.addEventListener('mousedown', onCanvasMouseDown);
canvas.addEventListener('mousemove', onCanvasMouseMove);
canvas.addEventListener('mouseup', onCanvasMouseUp);
canvas.addEventListener('dblclick', onCanvasDoubleClick);
canvas.addEventListener('click', onCanvasClick);

function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function onCanvasMouseDown(e) {
  if (!canvasImage) return;
  const { x, y } = getCanvasPos(e);
  const tool = State.currentTool;

  if (tool === 'polygon') return; // handled by click
  if (tool === 'marker') {
    addAnnotation({ type: 'marker', x, y, label: getLabelInput(), color: getColorInput() });
    return;
  }

  State.isDrawing = true;
  State.startX = x;
  State.startY = y;
}

function onCanvasMouseMove(e) {
  if (!State.isDrawing || !canvasImage) return;
  const { x, y } = getCanvasPos(e);
  redraw();

  const color = getColorInput();
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(State.startX, State.startY, x - State.startX, y - State.startY);
  if (State.currentTool === 'highlight') {
    ctx.fillStyle = color + '33';
    ctx.fillRect(State.startX, State.startY, x - State.startX, y - State.startY);
  }
  ctx.restore();
}

function onCanvasMouseUp(e) {
  if (!State.isDrawing) return;
  State.isDrawing = false;
  const { x, y } = getCanvasPos(e);
  const w = x - State.startX;
  const h = y - State.startY;

  if (Math.abs(w) < 5 || Math.abs(h) < 5) return;

  const type = State.currentTool === 'highlight' ? 'highlight' : 'box';
  addAnnotation({
    type,
    x: w > 0 ? State.startX : x,
    y: h > 0 ? State.startY : y,
    w: Math.abs(w),
    h: Math.abs(h),
    label: getLabelInput(),
    color: getColorInput(),
  });
}

function onCanvasClick(e) {
  if (State.currentTool !== 'polygon') return;
  const { x, y } = getCanvasPos(e);
  State.polygonPoints.push({ x, y });
  redraw();
  // Draw in-progress polygon
  if (State.polygonPoints.length >= 2) {
    ctx.save();
    ctx.strokeStyle = getColorInput();
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(State.polygonPoints[0].x, State.polygonPoints[0].y);
    State.polygonPoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  }
  // Draw vertex dots
  State.polygonPoints.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = getColorInput();
    ctx.fill();
  });
}

function onCanvasDoubleClick(e) {
  if (State.currentTool !== 'polygon') return;
  if (State.polygonPoints.length < 3) {
    showToast('Need at least 3 points for a polygon.', true);
    State.polygonPoints = [];
    return;
  }
  addAnnotation({
    type: 'polygon',
    points: [...State.polygonPoints],
    label: getLabelInput(),
    color: getColorInput(),
  });
  State.polygonPoints = [];
}

function getLabelInput() {
  return document.getElementById('label-input').value.trim() || 'Region';
}
function getColorInput() {
  return document.getElementById('color-input').value;
}

function addAnnotation(ann) {
  ann.id = uid();
  ann.createdAt = new Date().toISOString();
  State.annotations.push(ann);
  saveAnnotations();
  redraw();
  renderAnnotationsList();
  addLog('annotate', `<span class="log-user">${State.currentUser.name}</span> added "${ann.label}" annotation to "${State.currentImage?.title || 'image'}"`);
}

function saveAnnotations() {
  if (!State.currentImage) return;
  localStorage.setItem('hl_ann_' + State.currentImage.id, JSON.stringify(State.annotations));
}

function renderAnnotationsList() {
  const list = document.getElementById('annotations-list');
  document.getElementById('ann-count').textContent = State.annotations.length;
  list.innerHTML = '';
  if (State.annotations.length === 0) {
    list.innerHTML = '<div style="color:var(--text-dim);font-size:12px;padding:12px 0">No annotations yet</div>';
    return;
  }
  State.annotations.forEach((ann, i) => {
    const item = document.createElement('div');
    item.className = 'ann-item' + (i === State.selectedAnnotation ? ' selected' : '');
    item.innerHTML = `
      <div class="ann-item-label">${ann.label}</div>
      <div class="ann-item-type">${ann.type.toUpperCase()}</div>
      <div class="ann-item-color" style="background:${ann.color}"></div>
      <span class="ann-delete" onclick="deleteAnnotation(${i}, event)" title="Delete">✕</span>
    `;
    item.onclick = () => {
      State.selectedAnnotation = i;
      redraw();
      renderAnnotationsList();
    };
    list.appendChild(item);
  });
}

function deleteAnnotation(i, e) {
  e.stopPropagation();
  State.annotations.splice(i, 1);
  State.selectedAnnotation = null;
  saveAnnotations();
  redraw();
  renderAnnotationsList();
}

function clearAnnotations() {
  if (!State.annotations.length) return;
  State.annotations = [];
  State.selectedAnnotation = null;
  saveAnnotations();
  redraw();
  renderAnnotationsList();
  showToast('All annotations cleared.');
}

function undoAnnotation() {
  if (!State.annotations.length) return;
  State.annotations.pop();
  State.selectedAnnotation = null;
  saveAnnotations();
  redraw();
  renderAnnotationsList();
}

function aiSuggest() {
  if (!canvasImage) { showToast('Load an image first.', true); return; }
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const padX = canvas.width * 0.1;
  const padY = canvas.height * 0.1;
  const x = padX + Math.random() * (canvas.width * 0.5);
  const y = padY + Math.random() * (canvas.height * 0.5);
  const w = 60 + Math.random() * (canvas.width * 0.25);
  const h = 40 + Math.random() * (canvas.height * 0.2);
  const labels = ['Suspicious Region', 'Anomaly', 'Region of Interest', 'Finding', 'Lesion Candidate'];
  const label = labels[Math.floor(Math.random() * labels.length)];
  addAnnotation({ type: 'box', x, y, w, h, label: `AI: ${label}`, color });
  showToast('🧠 AI suggestion added!');
}

// ============================================================
//  EXPORT
// ============================================================
function exportPNG() {
  if (!canvasImage) { showToast('Load an image first.', true); return; }
  const link = document.createElement('a');
  link.download = (State.currentImage?.title || 'annotated') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  addLog('upload', `<span class="log-user">${State.currentUser.name}</span> exported "${State.currentImage?.title}" as PNG`);
  showToast('PNG exported!');
}

function exportPDF() {
  if (!canvasImage) { showToast('Load an image first.', true); return; }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('HealthLabs — Annotation Report', 15, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Image: ${State.currentImage?.title || 'Untitled'}`, 15, 30);
    doc.text(`Annotated by: ${State.currentUser.name}`, 15, 37);
    doc.text(`Date: ${new Date().toLocaleString()}`, 15, 44);
    doc.text(`Total Annotations: ${State.annotations.length}`, 15, 51);

    // Image
    const imgData = canvas.toDataURL('image/png');
    const maxW = 180, maxH = 100;
    const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
    const iw = canvas.width * ratio;
    const ih = canvas.height * ratio;
    doc.addImage(imgData, 'PNG', 15, 58, iw, ih);

    // Annotations table
    const tableY = 58 + ih + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Annotation Details', 15, tableY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let row = tableY + 8;
    State.annotations.forEach((ann, i) => {
      const detail = ann.type === 'polygon'
        ? `Polygon (${ann.points?.length} pts)`
        : ann.type === 'marker'
        ? `Marker at (${Math.round(ann.x)}, ${Math.round(ann.y)})`
        : `(x:${Math.round(ann.x)}, y:${Math.round(ann.y)}, w:${Math.round(ann.w)}, h:${Math.round(ann.h)})`;
      doc.text(`${i + 1}. [${ann.type.toUpperCase()}] ${ann.label} — ${detail}`, 15, row);
      row += 7;
      if (row > 190) { doc.addPage(); row = 20; }
    });

    doc.save((State.currentImage?.title || 'annotation') + '-report.pdf');
    addLog('upload', `<span class="log-user">${State.currentUser.name}</span> exported "${State.currentImage?.title}" as PDF`);
    showToast('PDF report exported!');
  } catch (err) {
    console.error(err);
    showToast('PDF export failed. Check console.', true);
  }
}

// ============================================================
//  ACTIVITY LOGS
// ============================================================
function loadSavedLogs() {
  State.logs = JSON.parse(localStorage.getItem('hl_logs') || '[]');
}

function addLog(type, text) {
  const log = { id: uid(), type, text, time: new Date().toISOString() };
  State.logs.unshift(log);
  if (State.logs.length > 100) State.logs = State.logs.slice(0, 100);
  localStorage.setItem('hl_logs', JSON.stringify(State.logs));
  // Live update if logs section visible
  const logsSection = document.getElementById('section-logs');
  if (logsSection?.classList.contains('active')) renderLogs();
}

const LOG_ICONS = {
  upload: { icon: '📤', cls: 'upload' },
  annotate: { icon: '⬡', cls: 'annotate' },
  workspace: { icon: '🤝', cls: 'workspace' },
  login: { icon: '👤', cls: 'login' },
};

function renderLogs() {
  const container = document.getElementById('logs-container');
  if (!container) return;
  if (State.logs.length === 0) {
    container.innerHTML = '<div class="logs-empty">No activity yet. Start by uploading an image!</div>';
    return;
  }
  container.innerHTML = State.logs.map(log => {
    const iconData = LOG_ICONS[log.type] || { icon: '●', cls: 'login' };
    const d = new Date(log.time);
    const timeStr = `${d.toLocaleDateString()} ${formatTime(d)}`;
    return `
      <div class="log-item">
        <div class="log-icon ${iconData.cls}">${iconData.icon}</div>
        <div class="log-content">
          <div class="log-text">${log.text}</div>
          <div class="log-time">${timeStr}</div>
        </div>
      </div>
    `;
  }).join('');
}

function clearLogs() {
  State.logs = [];
  localStorage.removeItem('hl_logs');
  renderLogs();
  showToast('Activity logs cleared.');
}

// ============================================================
//  WINDOW RESIZE — refit canvas
// ============================================================
window.addEventListener('resize', () => {
  if (canvasImage) {
    fitCanvasToWrapper();
    redraw();
  }
});
