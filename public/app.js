// SocialMedia Automation Client Dashboard App

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Auto-remove toast after 4s
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  document.body.appendChild(container);
  return container;
}

// Global Application State
const state = {
  currentTab: 'dashboard',
  config: {},
  posts: [],
  availableImages: [],
  tunnelUrl: '',
  logPollingInterval: null,
  refreshInterval: null,
  currentFilter: 'all'
};

// DOM Elements
const elements = {
  navItems: document.querySelectorAll('.nav-item'),
  views: document.querySelectorAll('.content-view'),
  pageTitle: document.getElementById('page-title'),
  
  // Status badges
  tunnelStatus: document.getElementById('tunnel-status'),
  schedulerStatus: document.getElementById('scheduler-status'),
  tunnelBadge: document.getElementById('tunnel-badge'),
  schedulerBadge: document.getElementById('scheduler-badge'),
  
  // Connection panel
  connFb: document.getElementById('conn-fb'),
  connIg: document.getElementById('conn-ig'),
  connTunnel: document.getElementById('conn-tunnel'),
  connCsv: document.getElementById('conn-csv'),

  // Stats
  statTotal: document.getElementById('stat-total'),
  statPublished: document.getElementById('stat-published'),
  statFailed: document.getElementById('stat-failed'),
  statImages: document.getElementById('stat-images'),

  // Controls
  btnToggleScheduler: document.getElementById('btn-toggle-scheduler'),
  btnSchedulerText: document.getElementById('btn-scheduler-text'),
  btnSyncNow: document.getElementById('btn-sync-now'),
  btnClearHistory: document.getElementById('btn-clear-history'),
  btnClearLogs: document.getElementById('btn-clear-logs'),
  btnClearLogsTab: document.getElementById('btn-clear-logs-tab'),
  btnRefreshLogs: document.getElementById('btn-refresh-logs'),
  
  // Importer
  uploadCsvZone: document.getElementById('upload-csv-zone'),
  csvFileInput: document.getElementById('csv-file-input'),
  uploadImagesZone: document.getElementById('upload-images-zone'),
  imagesFileInput: document.getElementById('images-file-input'),
  
  // Queue Table & Inputs
  queueTbody: document.getElementById('queue-tbody'),
  queueSearch: document.getElementById('queue-search'),
  filterTabs: document.querySelectorAll('.filter-tab'),
  
  // Settings Form
  settingsForm: document.getElementById('settings-form'),
  useLocalTunnelCheckbox: document.getElementById('useLocalTunnel'),
  cloudinaryFields: document.getElementById('cloudinary-fields'),
  
  // Logs Output
  logsOutput: document.getElementById('logs-output'),
  
  // Modals
  captionModal: document.getElementById('caption-modal'),
  modalCaptionText: document.getElementById('modal-caption-text'),
  btnCloseCaptionModal: document.getElementById('btn-close-caption-modal'),
  
  errorModal: document.getElementById('error-modal'),
  modalErrorTime: document.getElementById('modal-error-time'),
  modalErrorText: document.getElementById('modal-error-text'),
  btnCloseErrorModal: document.getElementById('btn-close-error-modal')
};

// Navigation controller
function initNavigation() {
  elements.navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tabId) {
  state.currentTab = tabId;
  
  // Update nav item active states
  elements.navItems.forEach(item => {
    if (item.dataset.tab === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Display selected content panel
  elements.views.forEach(view => {
    if (view.id === `view-${tabId}`) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Update page heading title
  const titles = {
    dashboard: 'Automation Dashboard',
    queue: 'Posting Schedule Editor',
    logs: 'System Activity Logs',
    settings: 'Configuration Settings'
  };
  elements.pageTitle.textContent = titles[tabId] || 'Automation Controller';

  // Toggle log poll loops based on view
  if (tabId === 'logs') {
    fetchLogs();
    if (state.logPollingInterval) clearInterval(state.logPollingInterval);
    state.logPollingInterval = setInterval(fetchLogs, 4000);
  } else {
    if (state.logPollingInterval) {
      clearInterval(state.logPollingInterval);
      state.logPollingInterval = null;
    }
  }
}

// Fetch general server configuration state
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();
    state.config = data.config;
    state.tunnelUrl = data.tunnelUrl;
    
    updateStatusIndicators();
    populateSettingsForm();
  } catch (err) {
    console.error('Failed to load server configuration:', err);
    showToast('Failed to connect to local automation server.', 'error');
  }
}

// Update badges on the layout
function updateStatusIndicators() {
  const active = state.config.schedulerActive;
  const isTunnelEnabled = state.config.useLocalTunnel;

  // Toggle button state
  if (active) {
    elements.btnToggleScheduler.className = 'btn btn-danger btn-toggle-state';
    elements.btnSchedulerText.textContent = 'Stop Scheduler';
    elements.schedulerBadge.className = 'status-badge active';
    elements.schedulerBadge.textContent = 'Active';
    elements.schedulerStatus.className = 'status-indicator ok';
  } else {
    elements.btnToggleScheduler.className = 'btn btn-success btn-toggle-state';
    elements.btnSchedulerText.textContent = 'Start Scheduler';
    elements.schedulerBadge.className = 'status-badge idle';
    elements.schedulerBadge.textContent = 'Stopped';
    elements.schedulerStatus.className = 'status-indicator idle';
  }

  // Tunnel badges status
  if (isTunnelEnabled && state.tunnelUrl) {
    elements.tunnelBadge.className = 'status-badge active';
    elements.tunnelBadge.textContent = 'Connected';
    elements.tunnelStatus.className = 'status-indicator ok';
  } else if (isTunnelEnabled && !state.tunnelUrl && active) {
    elements.tunnelBadge.className = 'status-badge warning';
    elements.tunnelBadge.textContent = 'Connecting...';
    elements.tunnelStatus.className = 'status-indicator warning';
  } else {
    elements.tunnelBadge.className = 'status-badge idle';
    elements.tunnelBadge.textContent = 'Inactive';
    elements.tunnelStatus.className = 'status-indicator idle';
  }

  // Update status summary cards
  const hasAuth = state.config.facebookEmail && state.config.facebookPassword;
  updateCardIndicator(elements.connFb, hasAuth && state.config.publishToFacebook);
  updateCardIndicator(elements.connIg, hasAuth && state.config.publishToInstagram);
  updateCardIndicator(elements.connTunnel, isTunnelEnabled ? state.tunnelUrl : 'disabled');
}

function updateCardIndicator(element, statusValue) {
  const indicator = element.querySelector('.conn-indicator');
  if (statusValue === 'disabled') {
    indicator.className = 'conn-indicator disabled';
    element.title = 'Tunnel mode is disabled in settings.';
  } else if (statusValue) {
    indicator.className = 'conn-indicator connected';
    element.title = 'Configured successfully.';
  } else {
    indicator.className = 'conn-indicator disconnected';
    element.title = 'Integration details are missing in Settings.';
  }
}

// Prefill values in settings form inputs
function populateSettingsForm() {
  const el = (id) => document.getElementById(id);
  
  if (el('facebookEmail')) el('facebookEmail').value = state.config.facebookEmail || '';
  if (el('facebookPassword')) el('facebookPassword').value = state.config.facebookPassword || '';
  if (el('runVisually')) el('runVisually').checked = state.config.runVisually !== false; // Default true
  
  if (el('metaAccessToken')) el('metaAccessToken').value = state.config.metaAccessToken || '';
  if (el('facebookPageId')) el('facebookPageId').value = state.config.facebookPageId || '';
  if (el('instagramBusinessAccountId')) el('instagramBusinessAccountId').value = state.config.instagramBusinessAccountId || '';
  
  if (el('publishToFacebook')) el('publishToFacebook').checked = state.config.publishToFacebook;
  if (el('publishToInstagram')) el('publishToInstagram').checked = state.config.publishToInstagram;
  
  if (el('csvFilePath')) el('csvFilePath').value = state.config.csvFilePath || '';
  if (el('imagesFolderPath')) el('imagesFolderPath').value = state.config.imagesFolderPath || '';
  if (el('timezone')) el('timezone').value = state.config.timezone || 'Asia/Kolkata';
  if (el('mongoUri')) el('mongoUri').value = state.config.mongoUri || 'mongodb://localhost:27017/tripkaroai';
  
  if (elements.useLocalTunnelCheckbox) elements.useLocalTunnelCheckbox.checked = state.config.useLocalTunnel;
  
  if (el('cloudinaryCloudName')) el('cloudinaryCloudName').value = state.config.cloudinaryCloudName || '';
  if (el('cloudinaryApiKey')) el('cloudinaryApiKey').value = state.config.cloudinaryApiKey || '';
  if (el('cloudinaryApiSecret')) el('cloudinaryApiSecret').value = state.config.cloudinaryApiSecret || '';
  
  toggleCloudinaryFields();
}

function toggleCloudinaryFields() {
  if (elements.useLocalTunnelCheckbox.checked) {
    elements.cloudinaryFields.style.display = 'none';
  } else {
    elements.cloudinaryFields.style.display = 'block';
  }
}

elements.useLocalTunnelCheckbox.addEventListener('change', toggleCloudinaryFields);

// Save Settings Form
elements.settingsForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const updatedConfig = {
    facebookEmail: document.getElementById('facebookEmail').value.trim(),
    facebookPassword: document.getElementById('facebookPassword').value.trim(),
    runVisually: document.getElementById('runVisually').checked,
    
    metaAccessToken: document.getElementById('metaAccessToken').value.trim(),
    facebookPageId: document.getElementById('facebookPageId').value.trim(),
    instagramBusinessAccountId: document.getElementById('instagramBusinessAccountId').value.trim(),
    
    publishToFacebook: document.getElementById('publishToFacebook').checked,
    publishToInstagram: document.getElementById('publishToInstagram').checked,
    
    csvFilePath: document.getElementById('csvFilePath').value.trim(),
    imagesFolderPath: document.getElementById('imagesFolderPath').value.trim(),
    timezone: document.getElementById('timezone').value,
    mongoUri: document.getElementById('mongoUri').value.trim(),
    
    useLocalTunnel: elements.useLocalTunnelCheckbox.checked,
    
    cloudinaryCloudName: document.getElementById('cloudinaryCloudName').value.trim(),
    cloudinaryApiKey: document.getElementById('cloudinaryApiKey').value.trim(),
    cloudinaryApiSecret: document.getElementById('cloudinaryApiSecret').value.trim()
  };

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedConfig)
    });
    const data = await res.json();
    if (data.success) {
      state.config = data.config;
      state.tunnelUrl = data.tunnelUrl;
      updateStatusIndicators();
      showToast('Configuration settings updated successfully!', 'success');
      fetchPosts();
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
    showToast('Failed to save configuration settings.', 'error');
  }
});

// Fetch Scheduled Posts Queue
async function fetchPosts() {
  try {
    const res = await fetch('/api/posts');
    const data = await res.json();
    
    state.posts = data.posts || [];
    state.availableImages = data.availableImages || [];
    
    renderQueueTable();
    updateDashboardStats();
  } catch (err) {
    console.error('Failed to fetch posts:', err);
    showToast('Could not load scheduled postings queue from server.', 'error');
  }
}

// Update dashboard numeric counters
function updateDashboardStats() {
  elements.statTotal.textContent = state.posts.length;
  elements.statImages.textContent = state.availableImages.length;
  
  const published = state.posts.filter(p => p.status === 'Published').length;
  const failed = state.posts.filter(p => p.status === 'Failed').length;
  
  elements.statPublished.textContent = published;
  elements.statFailed.textContent = failed;
  
  // CSV Status Indicator
  const csvStatusIcon = document.getElementById('conn-csv').querySelector('.conn-indicator');
  if (state.posts.length > 0) {
    csvStatusIcon.className = 'conn-indicator connected';
    document.getElementById('conn-csv').title = `${state.posts.length} posts loaded in database queue.`;
  } else {
    csvStatusIcon.className = 'conn-indicator disconnected';
    document.getElementById('conn-csv').title = 'Posting queue database is empty.';
  }
}

// Render queue database editor table
function renderQueueTable() {
  const query = elements.queueSearch.value.trim().toLowerCase();
  const filter = state.currentFilter;
  
  // Filter posts
  const filteredPosts = state.posts.filter(post => {
    if (filter !== 'all' && post.status !== filter) {
      return false;
    }
    if (query) {
      const matchImage = post.media.join(' ').toLowerCase().includes(query);
      const matchCaption = post.caption.toLowerCase().includes(query);
      const matchType = post.type.toLowerCase().includes(query);
      return matchImage || matchCaption || matchType;
    }
    return true;
  });

  if (filteredPosts.length === 0) {
    elements.queueTbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No posts found matching the filter or search criteria.
        </td>
      </tr>
    `;
    return;
  }

  elements.queueTbody.innerHTML = filteredPosts.map(post => {
    // 1. Content Cell Previews & Reordering List
    let contentHtml = '';
    
    if (post.type.toLowerCase() === 'reel') {
      const videoFile = post.media[0] || '';
      const available = state.availableImages.includes(videoFile);
      contentHtml = `
        <div class="grid-content-media reel-media">
          <div class="media-preview-container reel">
            <video src="/images/${videoFile}" class="post-preview-img" muted playsinline preload="metadata"></video>
            <div class="play-overlay">▶</div>
          </div>
          <span class="file-state-label ${available ? 'ok' : 'missing'}">${videoFile || 'No file'}</span>
        </div>
      `;
    } else if (post.type.toLowerCase() === 'carousel') {
      // Multiple items rendering with shift/swap arrow buttons
      const slidesHtml = post.media.map((file, idx) => {
        const available = state.availableImages.includes(file);
        const shiftLeft = idx > 0 
          ? `<button class="slide-shift-btn" title="Move Left" onclick="moveCarouselSlide('${post._id}', ${idx}, ${idx - 1})">◀</button>` 
          : '';
        const shiftRight = idx < post.media.length - 1 
          ? `<button class="slide-shift-btn" title="Move Right" onclick="moveCarouselSlide('${post._id}', ${idx}, ${idx + 1})">▶</button>` 
          : '';
          
        return `
          <div class="carousel-slide-thumb ${available ? '' : 'missing'}">
            <img src="/images/${file}" alt="${file}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23222%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23888%22 font-size=%228%22 text-anchor=%22middle%22 dy=%22.3em%22>Missing</text></svg>'">
            <div class="slide-controls">
              ${shiftLeft}
              ${shiftRight}
              <button class="slide-shift-btn delete" title="Delete slide" onclick="deleteCarouselSlide('${post._id}', ${idx})">×</button>
            </div>
          </div>
        `;
      }).join('');

      contentHtml = `
        <div class="grid-content-media carousel-media-row">
          <div class="carousel-thumbs-list">${slidesHtml}</div>
          <button class="btn btn-outline btn-xs btn-add-slide" onclick="triggerAddSlide('${post._id}')">➕ Add Slide</button>
        </div>
      `;
    } else {
      // Single post image
      const imgFile = post.media[0] || '';
      const available = state.availableImages.includes(imgFile);
      contentHtml = `
        <div class="grid-content-media">
          <img src="/images/${imgFile}" class="post-preview-img" alt="${imgFile}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2250%22 height=%2250%22><rect width=%22100%25%22 height=%22100%25%22 fill=%22%23222%22/><text x=%2250%25%22 y=%2250%25%22 fill=%22%23888%22 font-size=%228%22 text-anchor=%22middle%22 dy=%22.3em%22>Broken</text></svg>'">
          <span class="file-state-label ${available ? 'ok' : 'missing'}">${imgFile || 'No file'}</span>
        </div>
      `;
    }

    // 2. Type Selector Dropdown HTML
    const typeSelectHtml = `
      <select class="form-input grid-select" onchange="updatePostField('${post._id}', 'type', this.value)">
        <option value="Post" ${post.type === 'Post' ? 'selected' : ''}>Post (Single)</option>
        <option value="Carousel" ${post.type === 'Carousel' ? 'selected' : ''}>Carousel</option>
        <option value="Reel" ${post.type === 'Reel' ? 'selected' : ''}>Reel (Video)</option>
      </select>
    `;

    // 3. Caption text area HTML
    const captionHtml = `
      <textarea class="form-input grid-textarea" placeholder="Enter caption, #hashtags..." onblur="updatePostField('${post._id}', 'caption', this.value)">${post.caption}</textarea>
    `;

    // 4. Date and Time field inputs
    const dateInputHtml = `
      <input type="text" class="form-input grid-date-input" value="${post.date}" onblur="updatePostField('${post._id}', 'date', this.value)" placeholder="e.g. 03 Aug 2026">
    `;
    const timeInputHtml = `
      <input type="text" class="form-input grid-time-input" value="${post.time}" onblur="updatePostField('${post._id}', 'time', this.value)" placeholder="e.g. 10:00 AM">
    `;

    // 5. Status Badges & Action Buttons
    let statusClass = 'pending';
    if (post.status === 'Published') statusClass = 'published';
    if (post.status === 'Failed') statusClass = 'failed';

    const actionButtonsHtml = `
      <div style="display:flex; gap:8px; justify-content:flex-end; align-items:center;">
        <button class="btn btn-primary btn-sm" onclick="publishPostNow('${post._id}')">Publish Now</button>
        <button class="btn btn-outline-danger btn-sm" onclick="deletePost('${post._id}')" title="Delete Post">🗑️</button>
      </div>
    `;

    return `
      <tr id="row-${post._id}">
        <td>${contentHtml}</td>
        <td>${typeSelectHtml}</td>
        <td>${captionHtml}</td>
        <td>${dateInputHtml}</td>
        <td>${timeInputHtml}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
            <span class="status-badge ${statusClass}" ${post.status === 'Failed' ? `onclick="showErrorModal(\`${encodeURIComponent(JSON.stringify(post.details))}\`)"` : ''}>
              ${post.status}
            </span>
            ${actionButtonsHtml}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// CRUD - Update a single field in the post document (updates DB on blur/change)
window.updatePostField = async function(postId, fieldName, value) {
  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldName]: value })
    });
    const data = await res.json();
    if (data.success) {
      // Local indicator save success glow
      const row = document.getElementById(`row-${postId}`);
      if (row) {
        row.classList.add('glow-save-ok');
        setTimeout(() => row.classList.remove('glow-save-ok'), 800);
      }
      
      // Update local state without fetching all unless date/time changed which alters sorting
      const postIdx = state.posts.findIndex(p => p._id === postId);
      if (postIdx !== -1) {
        state.posts[postIdx][fieldName] = value;
        // If sorting factors changed, refresh table completely
        if (fieldName === 'date' || fieldName === 'time' || fieldName === 'type') {
          fetchPosts();
        } else {
          updateDashboardStats();
        }
      }
    } else {
      showToast(`Save failed: ${data.error}`, 'error');
    }
  } catch (err) {
    console.error('Field update failed:', err);
    showToast('Failed to save field updates to database.', 'error');
  }
};

// CRUD - Shift slide index order inside a Carousel post
window.moveCarouselSlide = async function(postId, fromIdx, toIdx) {
  const post = state.posts.find(p => p._id === postId);
  if (!post) return;

  const newMediaList = [...post.media];
  // Swap elements
  const temp = newMediaList[fromIdx];
  newMediaList[fromIdx] = newMediaList[toIdx];
  newMediaList[toIdx] = temp;

  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media: newMediaList })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Carousel slide order updated.', 'success');
      fetchPosts();
    }
  } catch (e) {
    showToast('Failed to swap slide positions.', 'error');
  }
};

// CRUD - Delete slide from a Carousel post
window.deleteCarouselSlide = async function(postId, deleteIdx) {
  const post = state.posts.find(p => p._id === postId);
  if (!post) return;
  
  if (post.media.length <= 1) {
    showToast('Carousels must have at least 1 slide. To remove the post entirely, click the delete post trash icon.', 'warning');
    return;
  }

  const check = confirm('Are you sure you want to remove this slide from the Carousel?');
  if (!check) return;

  const newMediaList = [...post.media];
  newMediaList.splice(deleteIdx, 1);

  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ media: newMediaList })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Slide removed from carousel.', 'success');
      fetchPosts();
    }
  } catch (e) {
    showToast('Failed to remove slide.', 'error');
  }
};

// CRUD - Delete complete post from queue database
window.deletePost = async function(postId) {
  const check = confirm('Are you sure you want to permanently delete this post draft from your schedule database?');
  if (!check) return;

  try {
    const res = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      showToast('Post deleted successfully.', 'success');
      fetchPosts();
    } else {
      showToast(`Delete failed: ${data.error}`, 'error');
    }
  } catch (err) {
    showToast('Failed to delete post.', 'error');
  }
};

// Helper references for dynamically adding slides
let activePostIdForSlideAddition = null;
const addSlideInputHelper = document.createElement('input');
addSlideInputHelper.type = 'file';
addSlideInputHelper.multiple = true;
addSlideInputHelper.accept = 'image/*';
addSlideInputHelper.style.display = 'none';
document.body.appendChild(addSlideInputHelper);

addSlideInputHelper.addEventListener('change', async (e) => {
  if (!activePostIdForSlideAddition || e.target.files.length === 0) return;
  await appendSlidesToPost(activePostIdForSlideAddition, e.target.files);
  activePostIdForSlideAddition = null;
  addSlideInputHelper.value = '';
});

window.triggerAddSlide = function(postId) {
  activePostIdForSlideAddition = postId;
  addSlideInputHelper.click();
};

async function appendSlidesToPost(postId, filesList) {
  const post = state.posts.find(p => p._id === postId);
  if (!post) return;

  const formData = new FormData();
  for (let i = 0; i < filesList.length; i++) {
    formData.append('mediaFiles', filesList[i]);
  }

  showToast(`Uploading ${filesList.length} slide assets...`, 'info');
  try {
    // 1. Upload only to server asset files folder
    const res = await fetch('/api/upload-raw', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      // 2. Append new slide filenames to existing media list and PUT update
      const updatedMediaList = [...post.media, ...data.filenames];
      const updateRes = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media: updatedMediaList })
      });
      const updateData = await updateRes.json();
      if (updateData.success) {
        showToast('Slides added to carousel draft successfully!', 'success');
        fetchPosts();
      }
    } else {
      showToast(`Slide upload failed: ${data.error}`, 'error');
    }
  } catch (err) {
    console.error('Slide upload failed:', err);
    showToast('Error uploading slides.', 'error');
  }
}

// Publish a post immediately bypassing scheduled slot checking
window.publishPostNow = async function(postId) {
  const post = state.posts.find(p => p._id === postId);
  if (!post) return;
  
  const confirmPublish = confirm(`Are you sure you want to publish this post immediately to social media? This will ignore the scheduled slot time.`);
  if (!confirmPublish) return;
  
  showToast(`Initiating immediate publication...`, 'info');
  try {
    const res = await fetch('/api/publish-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: postId })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Publication request completed. Check activity logs.`, 'success');
      fetchPosts();
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (err) {
    console.error('Publish now failed:', err);
    showToast('Failed to execute instant publish command.', 'error');
  }
};

// Expand caption in modal (not strictly needed now but kept for UI utilities)
window.showCaptionModal = function(encodedCaption) {
  const caption = decodeURIComponent(encodedCaption);
  elements.modalCaptionText.textContent = caption;
  elements.captionModal.classList.add('active');
};

elements.btnCloseCaptionModal.addEventListener('click', () => {
  elements.captionModal.classList.remove('active');
});

// Expand error details in modal
window.showErrorModal = function(encodedDetails) {
  const details = JSON.parse(decodeURIComponent(encodedDetails));
  elements.modalErrorTime.textContent = `Attempted at: ${new Date(details.timestamp).toLocaleString()}`;
  elements.modalErrorText.textContent = details.error || JSON.stringify(details);
  elements.errorModal.classList.add('active');
};

elements.btnCloseErrorModal.addEventListener('click', () => {
  elements.errorModal.classList.remove('active');
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  if (e.target === elements.captionModal) {
    elements.captionModal.classList.remove('active');
  }
  if (e.target === elements.errorModal) {
    elements.errorModal.classList.remove('active');
  }
});

// Queue table filtering and search
elements.queueSearch.addEventListener('input', renderQueueTable);

elements.filterTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    elements.filterTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.currentFilter = tab.dataset.filter;
    renderQueueTable();
  });
});

// Fetch Logs
async function fetchLogs() {
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    elements.logsOutput.textContent = data.logs;
    elements.logsOutput.scrollTop = elements.logsOutput.scrollHeight;
  } catch (err) {
    console.error('Failed to fetch logs:', err);
  }
}

// Setup background auto refresh of state
function initStatusAutoRefresh() {
  if (state.refreshInterval) clearInterval(state.refreshInterval);
  state.refreshInterval = setInterval(() => {
    if (state.currentTab === 'dashboard' || state.currentTab === 'queue') {
      fetchConfig();
      fetchPosts();
    }
  }, 10000);
}

// Controller Actions
elements.btnToggleScheduler.addEventListener('click', async () => {
  const targetActive = !state.config.schedulerActive;
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedulerActive: targetActive })
    });
    const data = await res.json();
    if (data.success) {
      state.config = data.config;
      state.tunnelUrl = data.tunnelUrl;
      updateStatusIndicators();
      showToast(targetActive ? 'Scheduler activated successfully!' : 'Scheduler deactivated.', targetActive ? 'success' : 'info');
      fetchPosts();
    }
  } catch (err) {
    console.error('Toggle scheduler failed:', err);
    showToast('Failed to toggle scheduler state.', 'error');
  }
});

elements.btnSyncNow.addEventListener('click', async () => {
  showToast('Forcing manual posting queue scan...', 'info');
  try {
    const res = await fetch('/api/trigger-sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Queue scan and synchronization finished successfully.', 'success');
      fetchPosts();
    } else {
      showToast(`Scan error: ${data.error}`, 'error');
    }
  } catch (err) {
    console.error('Trigger sync failed:', err);
    showToast('Failed to trigger manual queue synchronization.', 'error');
  }
});

async function clearHistory() {
  const check = confirm('Are you sure you want to clear posting history statuses? This will reset all Published/Failed posts back to "Pending", which can cause them to republish if their scheduled times are in the past.');
  if (!check) return;
  
  try {
    const res = await fetch('/api/clear-status', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Posting history logs reset.', 'success');
      fetchPosts();
    }
  } catch (err) {
    console.error('Clear status failed:', err);
    showToast('Failed to clear status logs.', 'error');
  }
}

elements.btnClearHistory.addEventListener('click', clearHistory);

async function clearLogFile() {
  const check = confirm('Are you sure you want to erase all backend logging text? This is irreversible.');
  if (!check) return;
  
  try {
    const res = await fetch('/api/clear-logs', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Log file successfully emptied.', 'success');
      if (state.currentTab === 'logs') fetchLogs();
    }
  } catch (err) {
    console.error('Clear logs failed:', err);
    showToast('Failed to clear log file.', 'error');
  }
}

elements.btnClearLogs.addEventListener('click', clearLogFile);
elements.btnClearLogsTab.addEventListener('click', clearLogFile);
elements.btnRefreshLogs.addEventListener('click', fetchLogs);

// Setup drag and drop / click file uploaders
function initDragAndDrop() {
  // Excel spreadsheet importer (seeds DB)
  elements.uploadCsvZone.addEventListener('click', () => elements.csvFileInput.click());
  elements.csvFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) importSpreadsheet(e.target.files[0]);
  });
  
  setupZoneDragEvents(elements.uploadCsvZone);
  elements.uploadCsvZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadCsvZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      importSpreadsheet(e.dataTransfer.files[0]);
    }
  });
 
  // Multi-media upload zone (creates drafts directly in DB)
  elements.uploadImagesZone.addEventListener('click', () => elements.imagesFileInput.click());
  elements.imagesFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) createMediaDrafts(e.target.files);
  });
  
  setupZoneDragEvents(elements.uploadImagesZone);
  elements.uploadImagesZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadImagesZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      createMediaDrafts(e.dataTransfer.files);
    }
  });

  // Create New Post Button Trigger in Posting Queue tab
  const btnAddPostTrigger = document.getElementById('btn-add-post-trigger');
  const queueMediaInput = document.getElementById('queue-media-input');
  
  if (btnAddPostTrigger && queueMediaInput) {
    btnAddPostTrigger.addEventListener('click', () => queueMediaInput.click());
    queueMediaInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        createMediaDrafts(e.target.files);
        queueMediaInput.value = ''; // Reset input
      }
    });
  }
}

function setupZoneDragEvents(zone) {
  ['dragenter', 'dragover'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    }, false);
  });
  
  ['dragleave', 'drop'].forEach(eventName => {
    zone.addEventListener(eventName, (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
    }, false);
  });
}

async function importSpreadsheet(file) {
  const formData = new FormData();
  formData.append('csvFile', file);
  
  showToast(`Importing schedule spreadsheet: ${file.name}...`, 'info');
  try {
    const res = await fetch('/api/import-schedule', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Successfully seeded queue! Imported ${data.count} schedule entries.`, 'success');
      fetchPosts();
    } else {
      showToast(`Import failed: ${data.error}`, 'error');
    }
  } catch (err) {
    console.error('Spreadsheet import failed:', err);
    showToast('Failed to import schedule spreadsheet data.', 'error');
  }
}

// Media upload creates dynamic scheduled drafts in database
async function createMediaDrafts(files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('mediaFiles', files[i]);
  }
  
  showToast(`Creating scheduled post drafts for ${files.length} file(s)...`, 'info');
  try {
    const res = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Draft successfully added to database queue!`, 'success');
      fetchPosts();
      // Auto redirect to queue tab so the user can edit captions immediately
      switchTab('queue');
    } else {
      showToast(`Draft creation failed: ${data.error}`, 'error');
    }
  } catch (err) {
    console.error('Failed to create post drafts:', err);
    showToast('Failed to upload files and generate schedule drafts.', 'error');
  }
}

// App Initialization
async function initApp() {
  initNavigation();
  initDragAndDrop();
  
  // Fetch settings & content
  await fetchConfig();
  await fetchPosts();
  
  initStatusAutoRefresh();
}

document.addEventListener('DOMContentLoaded', initApp);
