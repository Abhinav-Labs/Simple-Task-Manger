/**
 * Simple Task Manager — Full-Stack Application Logic
 * Integrates Supabase Auth & PostgreSQL with Row Level Security (RLS)
 * Features: Dark Mode, Task Categories & Filters, Account Settings (Name, Email, Password)
 */

// ==================== STATE MANAGEMENT ====================
let supabaseClient = null;
let currentUser = null;
let tasks = [];
let currentView = 'inbox';
let currentFilter = 'all';
let currentCategoryFilter = 'all';
let searchQuery = '';
let currentSort = 'created_desc';
let isAuthModeLogin = true;

// DOM Elements
let authScreen, mainApp, authForm, authSubmitBtn, authAlert, authTabs;
let loginTab, signupTab, authToggleBtn, authToggleText, nameFieldGroup, passwordHint;
let emailInput, passwordInput, fullNameInput;
let configWarning, setupUrl, setupKey, saveConfigBtn;
let userAvatar, userEmailDisplay, workspaceName, logoutBtn, mobileLogoutBtn;
let taskInput, taskPriority, taskCategory, taskDueDate, taskDescription, addBtn, toggleDetailsBtn, taskOptionsPanel;
let taskList, loadingIndicator, searchInput, clearSearchBtn, sortSelect, filterBtns, categoryPills, navItems;
let statTotal, statCompleted, statPending, statOverdue, progressPercentage, progressBarFill;
let inboxCount, todayCount, upcomingCount, sidebarOverdueCount;
let pageTitle, pageSubtitle, pageEmoji;
let menuBtn, sidebar, overlay;
let collapseSidebarBtn, expandSidebarBtn, sidebarEdgeZone;
let editModal, editTaskForm, editTaskId, editTaskTitle, editTaskDescription, editTaskPriority, editTaskCategory, editTaskDueDate, closeEditModalBtn, cancelEditBtn;
let toastContainer;

// Logout Confirmation Modal DOM Elements
let logoutModal, cancelLogoutBtn, confirmLogoutBtn;

// Theme & Settings DOM Elements
let themeToggleBtn, themeToggleLabel, mobileThemeBtn, themeOptionLight, themeOptionDark;
let openSettingsBtn, mobileSettingsBtn, settingsModal, closeSettingsModalBtn;
let settingsNameForm, settingsNameInput, saveNameBtn;
let settingsEmailForm, settingsEmailInput, saveEmailBtn;
let settingsPasswordForm, settingsCurrentPasswordInput, settingsPasswordInput, settingsConfirmPasswordInput, savePasswordBtn;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  cacheDOMElements();
  initTheme();
  initSidebarState();
  setupEventListeners();

  // Initialize Supabase Client
  const initialized = initSupabase();
  if (!initialized) {
    showAuthScreen();
    if (configWarning) {
      configWarning.style.display = 'block';
      if (setupUrl && !setupUrl.value) {
        setupUrl.value = localStorage.getItem('supabase_url') || '';
      }
      if (setupKey && !setupKey.value) {
        setupKey.value = localStorage.getItem('supabase_anon_key') || '';
      }
    }
    return;
  }

  // Supabase is successfully initialized: ensure config warning is hidden
  if (configWarning) {
    configWarning.style.display = 'none';
  }

  // Check initial authentication session
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error('Session retrieval error:', error);
      showAuthScreen();
      return;
    }

    if (session && session.user) {
      onUserSignedIn(session.user);
    } else {
      showAuthScreen();
    }

    // Listen for auth state changes (login, logout, session refresh)
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        onUserSignedIn(session.user);
      } else if (event === 'SIGNED_OUT') {
        onUserSignedOut();
      } else if (event === 'USER_UPDATED' && session?.user) {
        onUserSignedIn(session.user);
      }
    });

  } catch (err) {
    console.error('Error during auth check:', err);
    showAuthScreen();
  }
}

// ==================== THEME MANAGEMENT ====================
function initTheme() {
  try {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    applyTheme(initialTheme, false);
  } catch (e) {
    applyTheme('light', false);
  }
}

function applyTheme(theme, save = true) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggleLabel) themeToggleLabel.textContent = 'Light Mode';
    if (themeOptionDark) themeOptionDark.classList.add('active');
    if (themeOptionLight) themeOptionLight.classList.remove('active');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    if (themeToggleLabel) themeToggleLabel.textContent = 'Dark Mode';
    if (themeOptionLight) themeOptionLight.classList.add('active');
    if (themeOptionDark) themeOptionDark.classList.remove('active');
  }
  if (save) {
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme, true);
  showToast(newTheme === 'dark' ? 'Dark mode activated 🌙' : 'Light mode activated ☀️', 'info');
}

// ==================== DOM CACHING ====================
function cacheDOMElements() {
  authScreen = document.getElementById('authScreen');
  mainApp = document.getElementById('mainApp');
  authForm = document.getElementById('authForm');
  authSubmitBtn = document.getElementById('authSubmitBtn');
  authAlert = document.getElementById('authAlert');
  loginTab = document.getElementById('loginTab');
  signupTab = document.getElementById('signupTab');
  authToggleBtn = document.getElementById('authToggleBtn');
  authToggleText = document.getElementById('authToggleText');
  nameFieldGroup = document.getElementById('nameFieldGroup');
  passwordHint = document.getElementById('passwordHint');
  emailInput = document.getElementById('emailInput');
  passwordInput = document.getElementById('passwordInput');
  fullNameInput = document.getElementById('fullNameInput');

  configWarning = document.getElementById('configWarning');
  setupUrl = document.getElementById('setupUrl');
  setupKey = document.getElementById('setupKey');
  saveConfigBtn = document.getElementById('saveConfigBtn');

  userAvatar = document.getElementById('userAvatar');
  userEmailDisplay = document.getElementById('userEmailDisplay');
  workspaceName = document.getElementById('workspaceName');
  logoutBtn = document.getElementById('logoutBtn');
  mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

  taskInput = document.getElementById('taskInput');
  taskPriority = document.getElementById('taskPriority');
  taskCategory = document.getElementById('taskCategory');
  taskDueDate = document.getElementById('taskDueDate');
  taskDescription = document.getElementById('taskDescription');
  addBtn = document.getElementById('addBtn');
  toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
  taskOptionsPanel = document.getElementById('taskOptionsPanel');

  taskList = document.getElementById('taskList');
  loadingIndicator = document.getElementById('loadingIndicator');
  searchInput = document.getElementById('searchInput');
  clearSearchBtn = document.getElementById('clearSearchBtn');
  sortSelect = document.getElementById('sortSelect');
  filterBtns = document.querySelectorAll('.filter-btn');
  categoryPills = document.querySelectorAll('.cat-pill');
  navItems = document.querySelectorAll('.nav-item');

  statTotal = document.getElementById('statTotal');
  statCompleted = document.getElementById('statCompleted');
  statPending = document.getElementById('statPending');
  statOverdue = document.getElementById('statOverdue');
  progressPercentage = document.getElementById('progressPercentage');
  progressBarFill = document.getElementById('progressBarFill');

  inboxCount = document.getElementById('inboxCount');
  todayCount = document.getElementById('todayCount');
  upcomingCount = document.getElementById('upcomingCount');
  sidebarOverdueCount = document.getElementById('sidebarOverdueCount');

  pageTitle = document.getElementById('pageTitle');
  pageSubtitle = document.getElementById('pageSubtitle');
  pageEmoji = document.getElementById('pageEmoji');

  menuBtn = document.getElementById('menuBtn');
  sidebar = document.getElementById('sidebar');
  overlay = document.getElementById('overlay');
  collapseSidebarBtn = document.getElementById('collapseSidebarBtn');
  expandSidebarBtn = document.getElementById('expandSidebarBtn');
  sidebarEdgeZone = document.getElementById('sidebarEdgeZone');

  logoutModal = document.getElementById('logoutModal');
  cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
  confirmLogoutBtn = document.getElementById('confirmLogoutBtn');

  editModal = document.getElementById('editModal');
  editTaskForm = document.getElementById('editTaskForm');
  editTaskId = document.getElementById('editTaskId');
  editTaskTitle = document.getElementById('editTaskTitle');
  editTaskDescription = document.getElementById('editTaskDescription');
  editTaskPriority = document.getElementById('editTaskPriority');
  editTaskCategory = document.getElementById('editTaskCategory');
  editTaskDueDate = document.getElementById('editTaskDueDate');
  closeEditModalBtn = document.getElementById('closeEditModalBtn');
  cancelEditBtn = document.getElementById('cancelEditBtn');

  // Theme & Settings
  themeToggleBtn = document.getElementById('themeToggleBtn');
  themeToggleLabel = document.getElementById('themeToggleLabel');
  mobileThemeBtn = document.getElementById('mobileThemeBtn');
  themeOptionLight = document.getElementById('themeOptionLight');
  themeOptionDark = document.getElementById('themeOptionDark');

  openSettingsBtn = document.getElementById('openSettingsBtn');
  mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
  settingsModal = document.getElementById('settingsModal');
  closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');

  settingsNameForm = document.getElementById('settingsNameForm');
  settingsNameInput = document.getElementById('settingsNameInput');
  saveNameBtn = document.getElementById('saveNameBtn');

  settingsEmailForm = document.getElementById('settingsEmailForm');
  settingsEmailInput = document.getElementById('settingsEmailInput');
  saveEmailBtn = document.getElementById('saveEmailBtn');

  settingsPasswordForm = document.getElementById('settingsPasswordForm');
  settingsCurrentPasswordInput = document.getElementById('settingsCurrentPasswordInput');
  settingsPasswordInput = document.getElementById('settingsPasswordInput');
  settingsConfirmPasswordInput = document.getElementById('settingsConfirmPasswordInput');
  savePasswordBtn = document.getElementById('savePasswordBtn');

  toastContainer = document.getElementById('toastContainer');

  // Set default due date in composer to today
  if (taskDueDate) {
    taskDueDate.value = getTodayDateString();
  }
}

// ==================== SANITIZATION UTILITIES ====================
function sanitizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim()
    .replace(/^['"`]+|['"`]+$/g, '') // remove surrounding quotes
    .replace(/\/+$/, '')             // remove trailing slashes
    .replace(/\/rest\/v1\/?$/i, '')   // remove /rest/v1
    .trim();
}

function sanitizeKey(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim()
    .replace(/^['"`]+|['"`]+$/g, '') // remove surrounding quotes
    .replace(/_SUPABASE_ANON_KEY$/i, '')
    .trim();
}

// ==================== SUPABASE INITIALIZATION ====================
function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase client library not loaded. Check script tag in index.html.');
    return false;
  }

  // Check stored keys or config.js keys
  const storedUrl = localStorage.getItem('supabase_url');
  const storedKey = localStorage.getItem('supabase_anon_key');
  const configUrl = window.SUPABASE_CONFIG?.url;
  const configKey = window.SUPABASE_CONFIG?.anonKey;

  const rawUrl = storedUrl || (configUrl && !configUrl.includes('YOUR_SUPABASE_PROJECT_URL') ? configUrl : null);
  const rawKey = storedKey || (configKey && !configKey.includes('YOUR_SUPABASE_ANON_KEY') ? configKey : null);

  const cleanUrl = sanitizeUrl(rawUrl);
  const cleanKey = sanitizeKey(rawKey);

  if (!cleanUrl || !cleanKey) {
    return false;
  }

  try {
    supabaseClient = window.supabase.createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return true;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return false;
  }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Config save helper
  if (saveConfigBtn) {
    saveConfigBtn.addEventListener('click', async () => {
      const cleanUrl = sanitizeUrl(setupUrl.value);
      const cleanKey = sanitizeKey(setupKey.value);

      if (!cleanUrl || !cleanKey) {
        alert('Please enter both your Supabase URL and public anon key.');
        return;
      }

      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        alert('The Project URL must start with https:// (e.g., https://your-project.supabase.co)');
        return;
      }

      saveConfigBtn.disabled = true;
      const originalText = saveConfigBtn.textContent;
      saveConfigBtn.textContent = 'Verifying...';

      try {
        const client = window.supabase.createClient(cleanUrl, cleanKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });

        // Test connection
        await client.auth.getSession();

        // Successful! Store clean keys in localStorage
        localStorage.setItem('supabase_url', cleanUrl);
        localStorage.setItem('supabase_anon_key', cleanKey);
        supabaseClient = client;

        // Hide warning immediately without reload
        if (configWarning) configWarning.style.display = 'none';
        showToast('Connected to Supabase successfully!', 'success');

        // Check if there is already an active session
        const { data: { session } } = await client.auth.getSession();
        if (session && session.user) {
          onUserSignedIn(session.user);
        } else {
          showAuthScreen();
        }

        // Attach listener for auth events
        client.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            onUserSignedIn(session.user);
          } else if (event === 'SIGNED_OUT') {
            onUserSignedOut();
          }
        });

      } catch (err) {
        console.error('Configuration validation failed:', err);
        alert('Failed to connect to Supabase:\n' + err.message + '\n\nPlease check your Project URL and anon key.');
      } finally {
        if (saveConfigBtn) {
          saveConfigBtn.disabled = false;
          saveConfigBtn.textContent = originalText;
        }
      }
    });
  }

  // Auth Tabs & Toggle
  if (loginTab) loginTab.addEventListener('click', () => setAuthMode(true));
  if (signupTab) signupTab.addEventListener('click', () => setAuthMode(false));
  if (authToggleBtn) {
    authToggleBtn.addEventListener('click', () => setAuthMode(!isAuthModeLogin));
  }

  // Auth Form Submit
  if (authForm) {
    authForm.addEventListener('submit', handleAuthSubmit);
  }

  // Logout confirmation modal triggers
  if (logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', openLogoutModal);
  if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', closeLogoutModal);
  if (confirmLogoutBtn) {
    confirmLogoutBtn.addEventListener('click', async () => {
      closeLogoutModal();
      await handleSignOut();
    });
  }
  if (logoutModal) {
    logoutModal.addEventListener('click', (e) => {
      if (e.target === logoutModal) closeLogoutModal();
    });
  }

  // Theme Toggles
  if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
  if (mobileThemeBtn) mobileThemeBtn.addEventListener('click', toggleTheme);
  if (themeOptionLight) themeOptionLight.addEventListener('click', () => applyTheme('light', true));
  if (themeOptionDark) themeOptionDark.addEventListener('click', () => applyTheme('dark', true));

  // Settings Modal Open/Close
  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettingsModal);
  if (mobileSettingsBtn) mobileSettingsBtn.addEventListener('click', openSettingsModal);
  if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeSettingsModal);
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }

  // Settings Forms
  if (settingsNameForm) settingsNameForm.addEventListener('submit', handleSaveName);
  if (settingsEmailForm) settingsEmailForm.addEventListener('submit', handleSaveEmail);
  if (settingsPasswordForm) settingsPasswordForm.addEventListener('submit', handleSavePassword);

  // Task Options toggle
  if (toggleDetailsBtn) {
    toggleDetailsBtn.addEventListener('click', () => {
      const isHidden = taskOptionsPanel.style.display === 'none';
      taskOptionsPanel.style.display = isHidden ? 'block' : 'none';
      toggleDetailsBtn.classList.toggle('active', isHidden);
    });
  }

  // Add Task
  if (addBtn) addBtn.addEventListener('click', handleAddTask);
  if (taskInput) {
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTask();
      }
    });
  }

  // Navigation Items
  navItems.forEach(item => {
    item.addEventListener('click', () => handleNavClick(item));
    item.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleNavClick(item);
      }
    });
  });

  // Status Filter Buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => handleFilterClick(btn));
  });

  // Category Filter Pills
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => handleCategoryPillClick(pill));
  });

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (clearSearchBtn) {
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
      }
      renderTasks();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderTasks();
    });
  }

  // Sort dropdown
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderTasks();
    });
  }

  // Edit Modal events
  if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', closeEditModal);
  if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeEditModal);
  if (editTaskForm) editTaskForm.addEventListener('submit', handleSaveEditedTask);
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });
  }

  // Sidebar toggle / collapse / expand triggers
  if (collapseSidebarBtn) collapseSidebarBtn.addEventListener('click', collapseSidebar);
  if (expandSidebarBtn) expandSidebarBtn.addEventListener('click', expandSidebar);
  if (menuBtn) menuBtn.addEventListener('click', toggleSidebarResponsive);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  // Setup sidebar mouse & touch drag handlers
  setupSidebarDrag();

  // Escape key closes open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (logoutModal && logoutModal.style.display === 'flex') closeLogoutModal();
      if (settingsModal && settingsModal.style.display === 'flex') closeSettingsModal();
      if (editModal && editModal.style.display === 'flex') closeEditModal();
    }
  });
}

// ==================== AUTHENTICATION FLOWS ====================
function setAuthMode(isLogin) {
  isAuthModeLogin = isLogin;
  hideAuthAlert();

  if (isLogin) {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    nameFieldGroup.style.display = 'none';
    passwordHint.style.display = 'none';
    authSubmitBtn.querySelector('.btn-text').textContent = 'Sign In';
    authToggleText.textContent = "Don't have an account?";
    authToggleBtn.textContent = 'Register now';
    passwordInput.setAttribute('autocomplete', 'current-password');
  } else {
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
    nameFieldGroup.style.display = 'block';
    passwordHint.style.display = 'block';
    authSubmitBtn.querySelector('.btn-text').textContent = 'Create Account';
    authToggleText.textContent = 'Already have an account?';
    authToggleBtn.textContent = 'Sign in here';
    passwordInput.setAttribute('autocomplete', 'new-password');
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  hideAuthAlert();

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const fullName = fullNameInput ? fullNameInput.value.trim() : '';

  if (!email || !password) {
    showAuthAlert('Please fill in all required fields.', 'error');
    return;
  }

  setAuthLoading(true);

  try {
    if (isAuthModeLogin) {
      // Sign in
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        showAuthAlert(error.message, 'error');
        setAuthLoading(false);
        return;
      }

      showToast('Welcome back!', 'success');
      onUserSignedIn(data.user);
    } else {
      // Register
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0]
          }
        }
      });

      if (error) {
        showAuthAlert(error.message, 'error');
        setAuthLoading(false);
        return;
      }

      if (data?.session) {
        showToast('Registration successful! Welcome.', 'success');
        onUserSignedIn(data.user);
      } else if (data?.user) {
        showAuthAlert('Registration successful! Please check your email to confirm your account.', 'success');
        setAuthLoading(false);
      }
    }
  } catch (err) {
    console.error('Unexpected auth error:', err);
    showAuthAlert('An unexpected error occurred. Please try again.', 'error');
    setAuthLoading(false);
  }
}

async function handleSignOut() {
  try {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
  } catch (err) {
    console.error('Error signing out:', err);
  } finally {
    onUserSignedOut();
  }
}

function onUserSignedIn(user) {
  currentUser = user;
  setAuthLoading(false);
  authScreen.style.display = 'none';
  mainApp.style.display = 'flex';

  updateUserDisplayInfo(user);

  // Fetch tasks for the authenticated user from PostgreSQL
  fetchTasks();
}

function onUserSignedOut() {
  currentUser = null;
  tasks = [];
  mainApp.style.display = 'none';
  authScreen.style.display = 'flex';
  emailInput.value = '';
  passwordInput.value = '';
  hideAuthAlert();
  if (window.innerWidth <= 768) closeSidebar();
}

function showAuthScreen() {
  if (mainApp) mainApp.style.display = 'none';
  if (authScreen) authScreen.style.display = 'flex';
  if (supabaseClient && configWarning) {
    configWarning.style.display = 'none';
  }
}

function showAuthAlert(msg, type = 'error') {
  if (!authAlert) return;
  authAlert.textContent = msg;
  authAlert.className = `auth-alert ${type}`;
  authAlert.style.display = 'block';
}

function hideAuthAlert() {
  if (authAlert) authAlert.style.display = 'none';
}

function setAuthLoading(loading) {
  if (!authSubmitBtn) return;
  const btnText = authSubmitBtn.querySelector('.btn-text');
  const btnSpinner = authSubmitBtn.querySelector('.btn-spinner');

  authSubmitBtn.disabled = loading;
  if (loading) {
    if (btnText) btnText.textContent = isAuthModeLogin ? 'Signing In...' : 'Creating Account...';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
  } else {
    if (btnText) btnText.textContent = isAuthModeLogin ? 'Sign In' : 'Create Account';
    if (btnSpinner) btnSpinner.style.display = 'none';
  }
}

function updateUserDisplayInfo(user) {
  if (!user) return;
  const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
  if (userAvatar) userAvatar.textContent = displayName.charAt(0).toUpperCase();
  if (userEmailDisplay) userEmailDisplay.textContent = user.email;
  if (workspaceName) workspaceName.textContent = `${displayName}'s Workspace`;
}

// ==================== ACCOUNT SETTINGS ====================
function openSettingsModal() {
  if (!settingsModal) return;
  if (currentUser) {
    if (settingsNameInput) {
      settingsNameInput.value = currentUser.user_metadata?.full_name || '';
    }
    if (settingsEmailInput) {
      settingsEmailInput.value = currentUser.email || '';
    }
  }
  if (settingsCurrentPasswordInput) settingsCurrentPasswordInput.value = '';
  if (settingsPasswordInput) settingsPasswordInput.value = '';
  if (settingsConfirmPasswordInput) settingsConfirmPasswordInput.value = '';

  const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(activeTheme, false);

  settingsModal.style.display = 'flex';
  if (settingsNameInput) settingsNameInput.focus();
}

function closeSettingsModal() {
  if (settingsModal) settingsModal.style.display = 'none';
}

function setBtnLoading(btn, loading, defaultText, loadingText) {
  if (!btn) return;
  btn.disabled = loading;
  const btnText = btn.querySelector('.btn-text');
  const btnSpinner = btn.querySelector('.btn-spinner');
  if (loading) {
    if (btnText) btnText.textContent = loadingText || 'Saving...';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
  } else {
    if (btnText) btnText.textContent = defaultText;
    if (btnSpinner) btnSpinner.style.display = 'none';
  }
}

async function handleSaveName(e) {
  e.preventDefault();
  if (!supabaseClient || !currentUser) return;

  const newName = settingsNameInput.value.trim();
  if (!newName) {
    showToast('Name cannot be empty.', 'error');
    return;
  }

  setBtnLoading(saveNameBtn, true, 'Save Name', 'Saving...');

  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      data: { full_name: newName }
    });

    if (error) {
      console.error('Error updating name:', error);
      showToast('Failed to update name: ' + error.message, 'error');
      return;
    }

    if (data?.user) {
      currentUser = data.user;
      updateUserDisplayInfo(currentUser);
    }
    showToast('User name updated successfully!', 'success');
  } catch (err) {
    console.error('Unexpected error updating name:', err);
    showToast('Network error while updating name.', 'error');
  } finally {
    setBtnLoading(saveNameBtn, false, 'Save Name');
  }
}

async function handleSaveEmail(e) {
  e.preventDefault();
  if (!supabaseClient || !currentUser) return;

  const newEmail = settingsEmailInput.value.trim();
  if (!newEmail) {
    showToast('Email cannot be empty.', 'error');
    return;
  }
  if (newEmail.toLowerCase() === currentUser.email?.toLowerCase()) {
    showToast('This is already your current email address.', 'info');
    return;
  }

  setBtnLoading(saveEmailBtn, true, 'Update Email', 'Updating...');

  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      email: newEmail
    });

    if (error) {
      console.error('Error updating email:', error);
      showToast('Failed to update email: ' + error.message, 'error');
      return;
    }

    if (data?.user) {
      currentUser = data.user;
      updateUserDisplayInfo(currentUser);
    }
    showToast('Confirmation email sent to verify your new email address.', 'info');
  } catch (err) {
    console.error('Unexpected error updating email:', err);
    showToast('Network error while updating email.', 'error');
  } finally {
    setBtnLoading(saveEmailBtn, false, 'Update Email');
  }
}

async function handleSavePassword(e) {
  e.preventDefault();
  if (!supabaseClient || !currentUser) return;

  const currentPass = settingsCurrentPasswordInput ? settingsCurrentPasswordInput.value : '';
  const newPass = settingsPasswordInput ? settingsPasswordInput.value : '';
  const confirmPass = settingsConfirmPasswordInput ? settingsConfirmPasswordInput.value : '';

  if (!currentPass) {
    showToast('Please enter your current password.', 'error');
    if (settingsCurrentPasswordInput) settingsCurrentPasswordInput.focus();
    return;
  }

  if (!newPass || newPass.length < 6) {
    showToast('New password must be at least 6 characters long.', 'error');
    if (settingsPasswordInput) settingsPasswordInput.focus();
    return;
  }

  if (newPass !== confirmPass) {
    showToast('New passwords do not match. Please re-enter.', 'error');
    if (settingsConfirmPasswordInput) settingsConfirmPasswordInput.focus();
    return;
  }

  if (currentPass === newPass) {
    showToast('New password must be different from current password.', 'error');
    return;
  }

  setBtnLoading(savePasswordBtn, true, 'Update Password', 'Verifying...');

  try {
    // 1. Verify the current password by re-authenticating
    const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPass
    });

    if (verifyError) {
      console.error('Current password verification failed:', verifyError);
      showToast('Incorrect current password. Please try again.', 'error');
      setBtnLoading(savePasswordBtn, false, 'Update Password');
      if (settingsCurrentPasswordInput) {
        settingsCurrentPasswordInput.select();
      }
      return;
    }

    setBtnLoading(savePasswordBtn, true, 'Update Password', 'Updating...');

    // 2. Perform the secure password update with current_password included
    const { error: updateError } = await supabaseClient.auth.updateUser({
      password: newPass,
      current_password: currentPass
    });

    if (updateError) {
      console.error('Error updating password:', updateError);
      showToast('Failed to update password: ' + updateError.message, 'error');
      return;
    }

    if (settingsCurrentPasswordInput) settingsCurrentPasswordInput.value = '';
    if (settingsPasswordInput) settingsPasswordInput.value = '';
    if (settingsConfirmPasswordInput) settingsConfirmPasswordInput.value = '';
    showToast('Login password updated successfully!', 'success');
  } catch (err) {
    console.error('Unexpected error updating password:', err);
    showToast('Network error while updating password.', 'error');
  } finally {
    setBtnLoading(savePasswordBtn, false, 'Update Password');
  }
}

// ==================== DATABASE CRUD OPERATIONS ====================
async function fetchTasks() {
  if (!supabaseClient || !currentUser) return;

  showLoading(true);

  try {
    // Row Level Security automatically ensures only this user's tasks are returned
    const { data, error } = await supabaseClient
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tasks from Supabase:', error);
      showToast('Could not load tasks from database: ' + error.message, 'error');
      tasks = [];
    } else {
      tasks = data || [];
    }

    renderTasks();
    updateDashboardStats();
    updateSidebarCounts();

  } catch (err) {
    console.error('Database query failed:', err);
    showToast('Network error while connecting to Supabase.', 'error');
  } finally {
    showLoading(false);
  }
}

async function handleAddTask() {
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }

  // Duplicate task check (case-insensitive)
  const isDuplicate = tasks.some(t => t.title && t.title.trim().toLowerCase() === title.toLowerCase());
  if (isDuplicate) {
    showToast(`A task named "${title}" already exists!`, 'warning');
    taskInput.classList.remove('input-shake');
    void taskInput.offsetWidth; // trigger reflow for smooth animation
    taskInput.classList.add('input-shake');
    taskInput.focus();
    setTimeout(() => {
      if (taskInput) taskInput.classList.remove('input-shake');
    }, 600);
    return;
  }

  if (!currentUser || !supabaseClient) {
    showToast('Please sign in to add tasks.', 'error');
    return;
  }

  const priority = taskPriority ? taskPriority.value : 'Medium';
  const category = taskCategory ? taskCategory.value : 'General';
  const dueDate = taskDueDate && taskDueDate.value ? taskDueDate.value : null;
  const description = taskDescription && taskDescription.value.trim() ? taskDescription.value.trim() : null;

  addBtn.disabled = true;

  try {
    const newTaskPayload = {
      user_id: currentUser.id,
      title: title,
      description: description,
      priority: priority,
      category: category,
      status: 'Pending',
      due_date: dueDate
    };

    let { data, error } = await supabaseClient
      .from('tasks')
      .insert([newTaskPayload])
      .select()
      .single();

    // Fallback if category column is not yet present in Supabase table
    if (error && error.message && error.message.includes('category')) {
      console.warn('Category column not detected in database. Retrying without category column...');
      delete newTaskPayload.category;
      const retryResult = await supabaseClient
        .from('tasks')
        .insert([newTaskPayload])
        .select()
        .single();
      data = retryResult.data ? { ...retryResult.data, category: category } : null;
      error = retryResult.error;
    }

    if (error) {
      console.error('Error inserting task:', error);
      showToast('Failed to save task: ' + error.message, 'error');
      return;
    }

    // Prepend new task to local state
    tasks.unshift(data);

    // Reset input fields
    taskInput.value = '';
    if (taskDescription) taskDescription.value = '';
    if (taskPriority) taskPriority.value = 'Medium';
    if (taskCategory) taskCategory.value = 'General';
    if (taskDueDate) taskDueDate.value = getTodayDateString();
    if (taskOptionsPanel) taskOptionsPanel.style.display = 'none';
    if (toggleDetailsBtn) toggleDetailsBtn.classList.remove('active');

    renderTasks();
    updateDashboardStats();
    updateSidebarCounts();
    showToast('Task added successfully.', 'success');

  } catch (err) {
    console.error('Unexpected error creating task:', err);
    showToast('Failed to connect to database.', 'error');
  } finally {
    addBtn.disabled = false;
  }
}

async function toggleTaskStatus(id) {
  const task = tasks.find(t => t.id === id);
  if (!task || !supabaseClient) return;

  const previousStatus = task.status;
  const newStatus = previousStatus === 'Completed' ? 'Pending' : 'Completed';

  // Optimistic UI update
  task.status = newStatus;
  renderTasks();
  updateDashboardStats();
  updateSidebarCounts();

  try {
    const { error } = await supabaseClient
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      // Revert on failure
      task.status = previousStatus;
      renderTasks();
      updateDashboardStats();
      updateSidebarCounts();
      showToast('Failed to update task status: ' + error.message, 'error');
    }
  } catch (err) {
    console.error('Error during status toggle:', err);
    task.status = previousStatus;
    renderTasks();
    updateDashboardStats();
    updateSidebarCounts();
    showToast('Network error while updating task.', 'error');
  }
}

async function deleteTask(id) {
  const taskEl = document.querySelector(`[data-id="${id}"]`);
  if (taskEl) {
    taskEl.classList.add('removing');
    await new Promise(r => setTimeout(r, 220));
  }

  try {
    const { error } = await supabaseClient
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      if (taskEl) taskEl.classList.remove('removing');
      showToast('Failed to delete task: ' + error.message, 'error');
      return;
    }

    tasks = tasks.filter(t => t.id !== id);
    renderTasks();
    updateDashboardStats();
    updateSidebarCounts();
    showToast('Task deleted.', 'info');

  } catch (err) {
    console.error('Error deleting task:', err);
    if (taskEl) taskEl.classList.remove('removing');
    showToast('Network error while deleting task.', 'error');
  }
}

function openEditModal(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  editTaskId.value = task.id;
  editTaskTitle.value = task.title;
  editTaskDescription.value = task.description || '';
  editTaskPriority.value = task.priority || 'Medium';
  if (editTaskCategory) editTaskCategory.value = task.category || 'General';
  editTaskDueDate.value = task.due_date || '';

  editModal.style.display = 'flex';
  editTaskTitle.focus();
}

function closeEditModal() {
  if (editModal) editModal.style.display = 'none';
}

async function handleSaveEditedTask(e) {
  e.preventDefault();

  const id = editTaskId.value;
  const title = editTaskTitle.value.trim();
  const description = editTaskDescription.value.trim() || null;
  const priority = editTaskPriority.value;
  const category = editTaskCategory ? editTaskCategory.value : 'General';
  const dueDate = editTaskDueDate.value || null;

  if (!title) {
    showToast('Task title cannot be empty.', 'warning');
    return;
  }

  const saveBtn = document.getElementById('saveEditBtn');

  // Check for duplicate title on another task (case-insensitive)
  const isDuplicate = tasks.some(t => t.id !== id && t.title && t.title.trim().toLowerCase() === title.toLowerCase());
  if (isDuplicate) {
    showToast(`Another task named "${title}" already exists!`, 'warning');
    editTaskTitle.classList.remove('input-shake');
    void editTaskTitle.offsetWidth; // trigger reflow
    editTaskTitle.classList.add('input-shake');
    editTaskTitle.focus();
    setTimeout(() => {
      if (editTaskTitle) editTaskTitle.classList.remove('input-shake');
    }, 600);
    return;
  }
  if (saveBtn) saveBtn.disabled = true;

  try {
    const updatePayload = {
      title: title,
      description: description,
      priority: priority,
      category: category,
      due_date: dueDate
    };

    let { data, error } = await supabaseClient
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    // Fallback if category column does not exist
    if (error && error.message && error.message.includes('category')) {
      delete updatePayload.category;
      const retryResult = await supabaseClient
        .from('tasks')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      data = retryResult.data ? { ...retryResult.data, category: category } : null;
      error = retryResult.error;
    }

    if (error) {
      console.error('Error updating task:', error);
      showToast('Failed to update task: ' + error.message, 'error');
      return;
    }

    // Update in local array
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = data;
    }

    closeEditModal();
    renderTasks();
    updateDashboardStats();
    updateSidebarCounts();
    showToast('Task updated successfully.', 'success');

  } catch (err) {
    console.error('Error saving edited task:', err);
    showToast('Network error while saving changes.', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

// ==================== FILTERING & SORTING LOGIC ====================
function getFilteredAndSortedTasks() {
  const todayStr = getTodayDateString();
  const nextWeekStr = getNextWeekDateString();

  let result = [...tasks];

  // 1. Navigation View Filter
  if (currentView === 'today') {
    result = result.filter(t => t.due_date === todayStr);
  } else if (currentView === 'upcoming') {
    result = result.filter(t => t.due_date && t.due_date > todayStr && t.due_date <= nextWeekStr);
  } else if (currentView === 'overdue') {
    result = result.filter(t => t.status === 'Pending' && t.due_date && t.due_date < todayStr);
  }

  // 2. Status Button Filter
  if (currentFilter === 'pending') {
    result = result.filter(t => t.status === 'Pending');
  } else if (currentFilter === 'completed') {
    result = result.filter(t => t.status === 'Completed');
  } else if (currentFilter === 'overdue') {
    result = result.filter(t => t.status === 'Pending' && t.due_date && t.due_date < todayStr);
  }

  // 3. Category Filter
  if (currentCategoryFilter && currentCategoryFilter !== 'all') {
    result = result.filter(t => (t.category || 'General') === currentCategoryFilter);
  }

  // 4. Search Query
  if (searchQuery) {
    result = result.filter(t => {
      const matchTitle = t.title.toLowerCase().includes(searchQuery);
      const matchDesc = t.description ? t.description.toLowerCase().includes(searchQuery) : false;
      const matchCategory = t.category ? t.category.toLowerCase().includes(searchQuery) : false;
      return matchTitle || matchDesc || matchCategory;
    });
  }

  // 5. Sorting
  result.sort((a, b) => {
    if (currentSort === 'created_desc') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (currentSort === 'created_asc') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (currentSort === 'due_date_asc') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    } else if (currentSort === 'priority_desc') {
      const priorityWeight = { High: 3, Medium: 2, Low: 1 };
      return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
    }
    return 0;
  });

  return result;
}

// ==================== RENDERING ====================
function renderTasks() {
  if (!taskList) return;

  const filteredTasks = getFilteredAndSortedTasks();

  if (filteredTasks.length === 0) {
    let emptyMsg = 'No tasks yet';
    let emptySub = 'Add a task above to get started';

    if (searchQuery) {
      emptyMsg = 'No matching tasks';
      emptySub = `No results found for "${escapeHTML(searchQuery)}"`;
    } else if (currentCategoryFilter !== 'all') {
      emptyMsg = `No ${currentCategoryFilter} tasks`;
      emptySub = `No tasks in category "${currentCategoryFilter}"`;
    } else if (currentFilter === 'overdue' || currentView === 'overdue') {
      emptyMsg = 'No overdue tasks 🎉';
      emptySub = 'You are completely caught up!';
    } else if (currentFilter === 'completed') {
      emptyMsg = 'No completed tasks';
      emptySub = 'Check off tasks as you finish them';
    } else if (currentView === 'today') {
      emptyMsg = 'No tasks due today';
      emptySub = 'Enjoy your day or plan ahead';
    }

    taskList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <div class="empty-state-text">${emptyMsg}</div>
        <div class="empty-state-subtext">${emptySub}</div>
      </div>
    `;
    return;
  }

  taskList.innerHTML = filteredTasks.map(task => createTaskHTML(task)).join('');

  // Attach event listeners to task elements
  taskList.querySelectorAll('.task-item').forEach(taskEl => {
    const id = taskEl.dataset.id;
    const checkbox = taskEl.querySelector('input[type="checkbox"]');
    const deleteBtn = taskEl.querySelector('.delete-btn');
    const editBtn = taskEl.querySelector('.edit-btn');

    if (checkbox) {
      checkbox.addEventListener('change', () => toggleTaskStatus(id));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(id);
      });
    }
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(id);
      });
    }
  });
}

function createTaskHTML(task) {
  const isCompleted = task.status === 'Completed';
  const todayStr = getTodayDateString();
  const isOverdue = !isCompleted && task.due_date && task.due_date < todayStr;

  // Format Due Date Display
  let dueDateBadge = '';
  if (task.due_date) {
    const formattedDate = formatDisplayDate(task.due_date);
    const overdueClass = isOverdue ? 'is-overdue' : '';
    dueDateBadge = `<span class="task-date-badge ${overdueClass}">${isOverdue ? '⚠️ Overdue: ' : '📅 '}${formattedDate}</span>`;
  }

  // Priority Badge
  const priorityClass = `priority-${(task.priority || 'medium').toLowerCase()}`;
  const priorityBadge = `<span class="priority-badge ${priorityClass}">${escapeHTML(task.priority || 'Medium')}</span>`;

  // Category Badge
  const category = task.category || 'General';
  const catClass = `cat-${category.toLowerCase()}`;
  const categoryBadge = `<span class="category-badge ${catClass}">📁 ${escapeHTML(category)}</span>`;

  // Optional description snippet
  const descHTML = task.description 
    ? `<span class="task-description">${escapeHTML(task.description)}</span>` 
    : '';

  return `
    <div class="task-item ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
      <label class="checkbox-wrapper">
        <input type="checkbox" ${isCompleted ? 'checked' : ''} aria-label="Mark task as ${isCompleted ? 'incomplete' : 'complete'}">
        <div class="checkbox-custom">
          <svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </label>

      <div class="task-content-body">
        <span class="task-title">${escapeHTML(task.title)}</span>
        ${descHTML}
        <div class="task-meta-row">
          ${priorityBadge}
          ${categoryBadge}
          ${dueDateBadge}
        </div>
      </div>

      <div class="task-actions">
        <button class="action-icon-btn edit-btn" title="Edit task" aria-label="Edit task">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="action-icon-btn delete-btn" title="Delete task" aria-label="Delete task">
          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// ==================== DASHBOARD & STATS LOGIC ====================
function updateDashboardStats() {
  const todayStr = getTodayDateString();

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const pending = tasks.filter(t => t.status === 'Pending').length;
  const overdue = tasks.filter(t => t.status === 'Pending' && t.due_date && t.due_date < todayStr).length;

  if (statTotal) statTotal.textContent = total;
  if (statCompleted) statCompleted.textContent = completed;
  if (statPending) statPending.textContent = pending;
  if (statOverdue) statOverdue.textContent = overdue;

  // Safe percentage calculation (0% if total === 0)
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
  if (progressBarFill) progressBarFill.style.width = `${percentage}%`;
}

function updateSidebarCounts() {
  const todayStr = getTodayDateString();
  const nextWeekStr = getNextWeekDateString();

  const activeTasks = tasks.filter(t => t.status === 'Pending');

  // Inbox count (all pending)
  if (inboxCount) inboxCount.textContent = activeTasks.length;

  // Today count
  const todayTasks = activeTasks.filter(t => t.due_date === todayStr);
  if (todayCount) todayCount.textContent = todayTasks.length;

  // Upcoming count (tomorrow to next week)
  const upcomingTasks = activeTasks.filter(t => t.due_date && t.due_date > todayStr && t.due_date <= nextWeekStr);
  if (upcomingCount) upcomingCount.textContent = upcomingTasks.length;

  // Overdue count
  const overdueTasks = activeTasks.filter(t => t.due_date && t.due_date < todayStr);
  if (sidebarOverdueCount) sidebarOverdueCount.textContent = overdueTasks.length;
}

// ==================== NAVIGATION & VIEW HANDLING ====================
function handleNavClick(item) {
  const view = item.dataset.view;
  currentView = view;

  navItems.forEach(nav => nav.classList.remove('active'));
  item.classList.add('active');

  updatePageHeader();
  renderTasks();

  if (window.innerWidth <= 768) {
    closeSidebar();
  }
}

function handleFilterClick(btn) {
  currentFilter = btn.dataset.filter;
  filterBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function handleCategoryPillClick(pill) {
  currentCategoryFilter = pill.dataset.category || 'all';
  categoryPills.forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  renderTasks();
}

function updatePageHeader() {
  const titles = {
    inbox:    { emoji: '📥', title: 'Inbox',    subtitle: 'All your tasks securely stored in PostgreSQL' },
    today:    { emoji: '📅', title: 'Today',    subtitle: 'Focus on what matters today'  },
    upcoming: { emoji: '⏳', title: 'Upcoming', subtitle: 'Plan ahead for the next 7 days' },
    overdue:  { emoji: '⚠️', title: 'Overdue',  subtitle: 'Tasks that require immediate attention' }
  };

  const current = titles[currentView] || titles.inbox;
  if (pageEmoji) pageEmoji.textContent = current.emoji;
  if (pageTitle) pageTitle.textContent = current.title;
  if (pageSubtitle) pageSubtitle.textContent = current.subtitle;
}

// ==================== SIDEBAR COLLAPSE, EXPAND & DRAG ====================
function initSidebarState() {
  try {
    const isSidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isSidebarCollapsed && window.innerWidth > 768 && mainApp) {
      mainApp.classList.add('sidebar-collapsed');
    }
  } catch (e) {}
}

function collapseSidebar() {
  if (window.innerWidth > 768) {
    if (mainApp) mainApp.classList.add('sidebar-collapsed');
    try { localStorage.setItem('sidebar_collapsed', 'true'); } catch (e) {}
  } else {
    closeSidebar();
  }
}

function expandSidebar() {
  if (window.innerWidth > 768) {
    if (mainApp) mainApp.classList.remove('sidebar-collapsed');
    try { localStorage.setItem('sidebar_collapsed', 'false'); } catch (e) {}
  } else {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('active');
  }
}

function toggleSidebarResponsive() {
  if (window.innerWidth > 768) {
    if (mainApp && mainApp.classList.contains('sidebar-collapsed')) {
      expandSidebar();
    } else {
      collapseSidebar();
    }
  } else {
    toggleSidebar();
  }
}

function toggleSidebar() {
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active');
}

function closeSidebar() {
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

function setupSidebarDrag() {
  // Drag to close: when user drags left on sidebar
  let sidebarStartX = 0;
  let sidebarStartY = 0;
  let isSidebarDragging = false;

  function onSidebarStart(e) {
    if (e.target.closest('button, input, select, textarea, a, .nav-item, .cat-pill')) {
      return;
    }
    const pt = e.touches ? e.touches[0] : e;
    sidebarStartX = pt.clientX;
    sidebarStartY = pt.clientY;
    isSidebarDragging = true;
  }

  function onSidebarMove(e) {
    if (!isSidebarDragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const diffX = pt.clientX - sidebarStartX;
    const diffY = pt.clientY - sidebarStartY;

    // Detect intentional horizontal drag left (at least 35px)
    if (diffX < -35 && Math.abs(diffX) > Math.abs(diffY)) {
      isSidebarDragging = false;
      collapseSidebar();
    }
  }

  function onSidebarEnd() {
    isSidebarDragging = false;
  }

  if (sidebar) {
    sidebar.addEventListener('mousedown', onSidebarStart);
    window.addEventListener('mousemove', onSidebarMove);
    window.addEventListener('mouseup', onSidebarEnd);

    sidebar.addEventListener('touchstart', onSidebarStart, { passive: true });
    window.addEventListener('touchmove', onSidebarMove, { passive: true });
    window.addEventListener('touchend', onSidebarEnd);
  }

  // Drag to open: when user drags right from left edge zone or screen left edge <= 28px
  let edgeStartX = 0;
  let edgeStartY = 0;
  let isEdgeDragging = false;

  function onEdgeStart(e) {
    const pt = e.touches ? e.touches[0] : e;
    const isCollapsed = (window.innerWidth > 768 && mainApp && mainApp.classList.contains('sidebar-collapsed')) ||
                        (window.innerWidth <= 768 && sidebar && !sidebar.classList.contains('open'));

    if (isCollapsed && pt.clientX <= 28) {
      edgeStartX = pt.clientX;
      edgeStartY = pt.clientY;
      isEdgeDragging = true;
    }
  }

  function onEdgeMove(e) {
    if (!isEdgeDragging) return;
    const pt = e.touches ? e.touches[0] : e;
    const diffX = pt.clientX - edgeStartX;
    const diffY = pt.clientY - edgeStartY;

    // Detect intentional horizontal drag right (at least 28px)
    if (diffX > 28 && Math.abs(diffX) > Math.abs(diffY)) {
      isEdgeDragging = false;
      expandSidebar();
    }
  }

  function onEdgeEnd() {
    isEdgeDragging = false;
  }

  if (sidebarEdgeZone) {
    sidebarEdgeZone.addEventListener('mousedown', onEdgeStart);
    sidebarEdgeZone.addEventListener('touchstart', onEdgeStart, { passive: true });
  }

  window.addEventListener('mousedown', onEdgeStart);
  window.addEventListener('mousemove', onEdgeMove);
  window.addEventListener('mouseup', onEdgeEnd);

  window.addEventListener('touchstart', onEdgeStart, { passive: true });
  window.addEventListener('touchmove', onEdgeMove, { passive: true });
  window.addEventListener('touchend', onEdgeEnd);
}

// ==================== LOGOUT CONFIRMATION MODAL ====================
function openLogoutModal() {
  if (logoutModal) {
    logoutModal.style.display = 'flex';
  }
}

function closeLogoutModal() {
  if (logoutModal) {
    logoutModal.style.display = 'none';
  }
}

function showLoading(show) {
  if (loadingIndicator) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
  }
}

// ==================== TOAST & UTILITIES ====================
function showToast(message, type = 'info') {
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  }, 3200);
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextWeekDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);

    const todayStr = getTodayDateString();
    if (dateStr === todayStr) return 'Today';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    if (dateStr === tomorrowStr) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return dateStr;
}
