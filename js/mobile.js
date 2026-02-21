/**
 * Mobile-Specific Features and Logic
 */

function setupMobileFeatures() {
    setupTouchGestures();
    setupMobileEventListeners();
    setupHapticFeedback();
    setupMobileOptimizations();
    setupMobileMenu();
}

function setupMobileMenu() {
    const sidebar = document.getElementById('sidebar'), overlay = document.getElementById('sidebar-overlay'), toggle = document.getElementById('mobile-menu-toggle-btn'), close = document.getElementById('mobile-sidebar-close');
    if (!sidebar || !overlay || !toggle || !close) return;
    const openMenu = () => { sidebar.classList.add('active'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; };
    const closeMenu = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); document.body.style.overflow = ''; };
    toggle.addEventListener('click', openMenu);
    close.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);
    document.querySelectorAll('.sidebar .brand, .sidebar .nav-item, .sidebar .btn-reset, .sidebar .theme-toggle').forEach(t => t.addEventListener('click', () => { if (window.innerWidth <= 768) closeMenu(); }));
}

function setupTouchGestures() {
    let startX = 0, startY = 0, swiping = false;
    document.addEventListener('touchstart', e => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; swiping = false; });
    document.addEventListener('touchmove', e => { if (!startX || !startY) return; const dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY; if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) { swiping = true; e.preventDefault(); } });
    document.addEventListener('touchend', e => {
        if (!swiping) return;
        const dx = e.changedTouches[0].clientX - startX, btns = document.querySelectorAll('.nav-btn'), active = document.querySelector('.nav-btn.active'), idx = Array.from(btns).indexOf(active);
        if (dx > 50 && idx > 0) { switchTab(btns[idx - 1].getAttribute('data-tab')); provideHapticFeedback(); }
        else if (dx < -50 && idx < btns.length - 1) { switchTab(btns[idx + 1].getAttribute('data-tab')); provideHapticFeedback(); }
        startX = startY = 0; swiping = false;
    });
}

function setupMobileEventListeners() {
    document.querySelectorAll('canvas').forEach(c => c.addEventListener('touchstart', e => { if (e.touches.length > 1) e.preventDefault(); }));
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('touchmove', e => e.stopPropagation()));
    document.addEventListener('focusin', e => { if (['INPUT', 'SELECT'].includes(e.target.tagName)) setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300); });
}

function setupHapticFeedback() {
    document.querySelectorAll('.btn-primary, .btn-danger, .quick-add-btn').forEach(b => b.addEventListener('click', provideHapticFeedback));
}

function provideHapticFeedback() { if ('vibrate' in navigator) navigator.vibrate(50); }

function setupMobileOptimizations() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) { Chart.defaults.animation.duration = 500; document.body.classList.add('mobile-device'); }
    else { Chart.defaults.animation.duration = 1000; document.body.classList.remove('mobile-device'); }
    if (!window.hasOrientationListener) { window.addEventListener('orientationchange', () => setTimeout(() => Object.values(charts).forEach(c => c?.resize?.()), 500)); window.hasOrientationListener = true; }
}
