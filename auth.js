/**
 * Authentication Logic for Supabase
 */

document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupAuthListeners();
});

function setupAuthListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginForm.querySelector('#login-email').value;
            const password = loginForm.querySelector('#login-password').value;
            await login(email, password);
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = signupForm.querySelector('#signup-email').value;
            const password = signupForm.querySelector('#signup-password').value;
            await signup(email, password);
        });
    }
}

async function checkAuthState() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    updateUIForAuth(session);

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        updateUIForAuth(session);
    });
}

function updateUIForAuth(session) {
    const loginBtnSidebar = document.getElementById('sidebar-login-btn');
    const profileBtnSidebar = document.getElementById('sidebar-profile-btn');
    const userEmailSpan = document.getElementById('user-email-display');

    if (session) {
        // User is logged in
        if (loginBtnSidebar) loginBtnSidebar.style.display = 'none';
        if (profileBtnSidebar) profileBtnSidebar.style.display = 'flex';
        if (userEmailSpan) userEmailSpan.textContent = session.user.email;
        
        // Load data from Supabase
        if (typeof loadFromSupabase === 'function') {
            loadFromSupabase();
        }
        
        console.log('User is logged in:', session.user.email);
    } else {
        // User is logged out
        if (loginBtnSidebar) loginBtnSidebar.style.display = 'flex';
        if (profileBtnSidebar) profileBtnSidebar.style.display = 'none';
        if (userEmailSpan) userEmailSpan.textContent = '';
        console.log('User is logged out');
    }
}

async function signup(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
        });

        if (error) throw error;
        
        showToast('Registration successful! Check your email for confirmation.', 'success');
        closeModal('auth-modal');
    } catch (error) {
        console.error('Signup error:', error.message);
        showToast('Signup failed: ' + error.message, 'error');
    }
}

async function login(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;

        showToast('Login successful!', 'success');
        closeModal('auth-modal');
    } catch (error) {
        console.error('Login error:', error.message);
        showToast('Login failed: ' + error.message, 'error');
    }
}

async function logout() {
    try {
        // First, attempt to sync current local data to Supabase
        if (typeof syncToSupabase === 'function') {
            await syncToSupabase();
        }

        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        // Clear local storage after sync
        localStorage.removeItem('financeProjectionData');
        localStorage.removeItem('lastProjection');
        localStorage.removeItem('hasRunProjection');
        
        // Trigger a reload of the main script's state
        if (typeof resetAllDataNoConfirm === 'function') {
            resetAllDataNoConfirm();
        } else if (typeof resetAllData === 'function') {
            // If there's no resetAllDataNoConfirm, we'll manually reset what we can
            location.reload(); 
        }

        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error.message);
        showToast('Logout failed', 'error');
    }
}

// UI Helpers for Auth Modal
function showAuthModal(type = 'login') {
    const modal = document.getElementById('auth-modal');
    const loginSection = document.getElementById('login-section');
    const signupSection = document.getElementById('signup-section');
    
    if (type === 'login') {
        loginSection.style.display = 'block';
        signupSection.style.display = 'none';
    } else {
        loginSection.style.display = 'none';
        signupSection.style.display = 'block';
    }
    
    modal.style.display = 'flex';
    modal.classList.add('active');
    // Ensure Lucide icons are rendered in the modal if needed
    if (window.lucide) {
        lucide.createIcons();
    }
}

function switchAuthView(type) {
    showAuthModal(type);
}
