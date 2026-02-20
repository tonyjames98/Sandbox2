function handleValueTypeChange(prefix) {
    const typeSelect = document.getElementById(prefix === 'unified' ? 'event-amount-type' : `${prefix}-type`);
    const amountInput = document.getElementById(prefix === 'unified' ? 'event-amount' : `${prefix}-amount`);
    const wrapper = document.getElementById('event-amount-wrapper');
    
    if (!typeSelect || !amountInput) return;

    const isRecurring = document.getElementById('event-is-recurring')?.checked;

    // Update value defaults
    if (typeSelect.value === 'percent') {
        amountInput.value = '4';
    } else {
        amountInput.value = isRecurring ? '500' : '1000';
    }

    // Update UI symbols
    if (wrapper) {
        if (typeSelect.value === 'fixed') {
            wrapper.classList.add('currency');
            wrapper.classList.remove('percent');
        } else {
            wrapper.classList.add('percent');
            wrapper.classList.remove('currency');
        }
    }
}

// Global variables
let investments = [];
let events = [];
let goals = [];
let projections = [];
let baselineProjections = null;
let baselineInvestments = null;
let baselineEvents = null;
let baselineGoals = null;
let marketOffset = 0; // Global return offset
let savingsBoost = 0; // Monthly savings boost
let charts = {};
let projectionTimeout = null; // For debouncing projections
let chartUpdateTimeout = null; // For debouncing chart updates

// Initialize the application
// App initialization moved to global initApp function for better testability

// Global Tooltips Implementation
function initTooltips() {
    const tooltip = document.getElementById('global-tooltip');
    if (!tooltip) return;

    // Prevent duplicate initialization
    if (document.body.hasAttribute('data-tooltips-init')) return;
    document.body.setAttribute('data-tooltips-init', 'true');

    let currentTarget = null;
    let updatePositionRef = null;

    // Event listener for tooltip triggers
    const handleMouseOver = (e) => {
        const target = e.target.closest('[data-tooltip]');
        
        // If we moved into a NEW tooltip container
        if (target && target !== currentTarget) {
            currentTarget = target;
            const text = target.getAttribute('data-tooltip');
            if (!text) return;

            tooltip.textContent = text;
            
            if (updatePositionRef) {
                window.removeEventListener('scroll', updatePositionRef);
                window.removeEventListener('resize', updatePositionRef);
            }

            updatePositionRef = () => {
                if (!currentTarget) return;
                const rect = currentTarget.getBoundingClientRect();
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.top = `${rect.top}px`;
            };

            updatePositionRef();
            tooltip.classList.add('active');
            
            window.addEventListener('scroll', updatePositionRef, { passive: true });
            window.addEventListener('resize', updatePositionRef, { passive: true });
        }
    };

    const handleMouseOut = (e) => {
        const target = e.target.closest('[data-tooltip]');
        const relatedTarget = e.relatedTarget ? (e.relatedTarget instanceof Element ? e.relatedTarget.closest('[data-tooltip]') : null) : null;
        
        if (target && target !== relatedTarget) {
            tooltip.classList.remove('active');
            
            if (updatePositionRef) {
                window.removeEventListener('scroll', updatePositionRef);
                window.removeEventListener('resize', updatePositionRef);
                updatePositionRef = null;
            }
            currentTarget = null;
        }
    };

    document.body.addEventListener('mouseover', handleMouseOver, true);
    document.body.addEventListener('mouseout', handleMouseOut, true);

    // Close on click or Escape key
    document.body.addEventListener('mousedown', () => {
        tooltip.classList.remove('active');
        currentTarget = null;
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            tooltip.classList.remove('active');
            currentTarget = null;
        }
    });
}

// Onboarding Guide Logic
function updateOnboardingGuide() {
    const totalNetWorth = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const netWorthCard = document.querySelector('.kpi-card.primary');
    const netWorthPlus = netWorthCard?.querySelector('.kpi-action');
    const sampleContainer = document.getElementById('onboarding-sample-container');
    
    // Clear existing pulse
    netWorthCard?.classList.remove('guide-pulse');
    netWorthPlus?.classList.remove('guide-pulse');
    
    // Only pulse if net worth is 0 and no investments added
    if (totalNetWorth === 0 && investments.length === 0) {
        netWorthCard?.classList.add('guide-pulse');
        netWorthPlus?.classList.add('guide-pulse');
        if (sampleContainer) sampleContainer.style.display = 'block';
    } else {
        if (sampleContainer) sampleContainer.style.display = 'none';
    }
}

// Global initialization function
function initApp() {
    // Check for shared data first
    const hasSharedData = loadSharedData();
    
    // Load local data if no shared data was found
    if (!hasSharedData) {
        loadData();
    }
    
    setupEventListeners();
    setupKeyboardShortcuts(); 
    setupMobileFeatures(); 
    updateDashboard();
    renderInvestments();
    renderEvents();
    renderGoals();
    setupCharts();
    initTooltips(); // Ensure tooltips are initialized
    
    displayPortfolioInsights();
    
    if (projections && projections.length > 0) {
        updateProjectionCharts();
        updateProjectionTable();
    }
    
    if (!hasSharedData && localStorage.getItem('hasRunProjection')) {
        setTimeout(() => {
            runProjection();
        }, 100);
    }

    // Initialize AI analysis manual prompt
    if (typeof updateManualPrompt === 'function') updateManualPrompt();
    
    // Show welcome message for new users
    if (!localStorage.getItem('hasVisited')) {
        showToast('Add some assets/debt/events and click run projection to get started', 'info', 6000);
        localStorage.setItem('hasVisited', 'true');
    }

    // Initialize onboarding guide
    if (typeof updateOnboardingGuide === 'function') updateOnboardingGuide();
    
    // Set initial event amount wrapper class
    if (typeof handleValueTypeChange === 'function') handleValueTypeChange('unified');

    const contactLink = document.getElementById('contact-us-link');
    if (contactLink) {
        contactLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('contact-modal').style.display = 'flex';
        });
    }
    
    const privacyLink = document.getElementById('privacy-policy-link');
    if (privacyLink) {
        privacyLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('privacy-policy-modal').style.display = 'flex';
        });
    }
    
    const disclaimerLink = document.getElementById('disclaimer-link');
    if (disclaimerLink) {
        disclaimerLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('disclaimer-modal').style.display = 'flex';
        });
    }
}

// Initialize the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function loadSampleScenario() {
    if (!confirm('This will populate the app with sample data so you can see how it works. Your current data (if any) will be replaced. Continue?')) return;

    // Sample Investments
    investments = [
        { id: 'sample-1', name: 'S&P 500 Index Fund', type: 'Stocks', amount: 45000, returnRate: 8, createdAt: new Date().toISOString() },
        { id: 'sample-2', name: 'Total Bond Market', type: 'Bonds', amount: 20000, returnRate: 4, createdAt: new Date().toISOString() },
        { id: 'sample-3', name: 'Emergency Fund', type: 'Cash', amount: 10000, returnRate: 2, createdAt: new Date().toISOString() }
    ];

    // Sample Events
    events = [
        { 
            id: 'sample-evt-1', 
            type: 'recurring-income', 
            description: 'Monthly Salary', 
            amount: 5000, 
            frequency: 'monthly', 
            startDate: new Date().toISOString().split('T')[0], 
            endDate: null,
            target: 'sample-1',
            createdAt: new Date().toISOString() 
        },
        { 
            id: 'sample-evt-2', 
            type: 'recurring', 
            description: 'Rent & Living Expenses', 
            amount: 3200, 
            frequency: 'monthly', 
            startDate: new Date().toISOString().split('T')[0], 
            endDate: null,
            source: 'sample-3',
            createdAt: new Date().toISOString() 
        },
        { 
            id: 'sample-evt-3', 
            type: 'expense', 
            description: 'New Car', 
            amount: 35000, 
            date: new Date(new Date().getFullYear() + 5, 5, 15).toISOString().split('T')[0],
            source: 'sample-1',
            createdAt: new Date().toISOString() 
        },
        { 
            id: 'sample-evt-4', 
            type: 'rebalancing', 
            frequency: 'annually',
            createdAt: new Date().toISOString() 
        }
    ];

    // Sample Goals
    goals = [
        {
            id: 'sample-goal-1',
            category: 'retirement',
            name: 'Comfortable Retirement',
            amount: 2000000,
            year: new Date().getFullYear() + 25,
            type: 'net-worth',
            deductOnComplete: false,
            createdAt: new Date().toISOString()
        },
        {
            id: 'sample-goal-2',
            category: 'car',
            name: 'Electric SUV Purchase',
            amount: 60000,
            year: new Date().getFullYear() + 5,
            type: 'net-worth',
            deductOnComplete: true,
            createdAt: new Date().toISOString()
        }
    ];

    // Set some flags to make the UI look active
    localStorage.setItem('hasRunProjection', 'true');
    localStorage.setItem('hasVisited', 'true');

    saveData();
    
    // Refresh UI
    renderInvestments();
    renderEvents();
    renderGoals();
    updateDashboard();
    runProjection();
    
    showToast('Sample scenario loaded! Feel free to explore and edit.', 'success', 5000);
}

// Enhanced UX features
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Alt + A for new investment
        if (e.altKey && (e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
            showAddInvestmentModal();
        }
        
        // Ctrl/Cmd + E for new event
        if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            showAddEventModal('expense');
        }

        // Ctrl/Cmd + G for new goal
        if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) {
            e.preventDefault();
            showAddGoalModal();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (modal.style.display === 'block') {
                    closeModal(modal.id);
                }
            });
        }
    });
}

function showAutoSaveIndicator() {
    showToast('All changes autosaved', 'success', 2000);
}

// Advanced Simulations: Monte Carlo
function boxMullerTransform() {
    const u = 1 - Math.random(); 
    const v = 1 - Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function runMonteCarlo() {
    const iterations = parseInt(document.getElementById('mc-iterations').value);
    const volatility = parseFloat(document.getElementById('mc-volatility').value) / 100;
    const years = parseInt(document.getElementById('projection-years-input').value);
    
    if (investments.length === 0) {
        showToast('Add at least one asset to run simulations.', 'error');
        return;
    }

    const runBtn = document.querySelector('.mc-settings .btn-primary');
    const originalBtnText = runBtn.innerHTML;
    runBtn.disabled = true;
    runBtn.innerHTML = '<i data-lucide="refresh-cw" class="spin"></i> <span>Simulating...</span>';
    lucide.createIcons();

    // Small delay to let UI update
    setTimeout(() => {
        const allSimulations = [];
        
        for (let i = 0; i < iterations; i++) {
            const simResult = calculateSingleSimulation(years, volatility);
            allSimulations.push(simResult);
        }

        const results = processMonteCarloResults(allSimulations);
        displayMonteCarloResults(results);
        
        runBtn.disabled = false;
        runBtn.innerHTML = originalBtnText;
        lucide.createIcons();
        
        document.getElementById('mc-results').style.display = 'block';
        showToast(`Simulation complete: ${iterations} iterations`, 'success');
    }, 100);
}

function calculateSingleSimulation(years, volatility) {
    const projection = [];
    const currentYear = new Date().getFullYear();
    const adjustInflation = document.getElementById('adjust-inflation').checked;
    const inflationValue = document.getElementById('inflation-rate').value;
    const inflationRate = (inflationValue !== "" ? parseFloat(inflationValue) : 2.5) / 100;
    
    let currentBalances = {};
    investments.forEach(inv => {
        currentBalances[inv.id] = inv.type === 'Debt' ? -inv.amount : inv.amount;
    });

    for (let year = 0; year <= years; year++) {
        let netWorth = 0;
        Object.keys(currentBalances).forEach(id => {
            netWorth += currentBalances[id];
        });

        const inflationFactor = adjustInflation ? Math.pow(1 + inflationRate, year) : 1;
        projection.push(netWorth / inflationFactor);

        if (year < years) {
            // Apply growth with random volatility
            investments.forEach(inv => {
                const baseRate = inv.returnRate / 100;
                // Add random noise based on volatility
                const randomShock = boxMullerTransform() * volatility;
                const effectiveRate = baseRate + randomShock;
                
                if (inv.type === 'Debt') {
                    // Debt interest is usually fixed, but we'll apply it
                    currentBalances[inv.id] *= (1 + (inv.returnRate / 100));
                } else {
                    currentBalances[inv.id] *= (1 + effectiveRate);
                }
            });

            // Apply events
            events.forEach(event => {
                if (event.type === 'rebalancing') return;
                
                let apply = false;
                if (event.isRecurring) {
                    const startYear = event.startDate ? new Date(event.startDate).getFullYear() : currentYear;
                    const endYear = event.endDate ? new Date(event.endDate).getFullYear() : 9999;
                    if ((currentYear + year) >= startYear && (currentYear + year) <= endYear) {
                        apply = true;
                    }
                } else {
                    const eventYear = event.date ? new Date(event.date).getFullYear() : currentYear;
                    if (eventYear === (currentYear + year)) {
                        apply = true;
                    }
                }

                if (apply) {
                    const amount = event.amountType === 'percent' ? 0 : (event.amount || 0);
                    if (event.type === 'income' && event.to) {
                        if (currentBalances[event.to] !== undefined) currentBalances[event.to] += amount;
                    } else if (event.type === 'expense' && event.from) {
                        if (currentBalances[event.from] !== undefined) currentBalances[event.from] -= amount;
                    } else if (event.type === 'withdrawal' && event.from) {
                        if (currentBalances[event.from] !== undefined) currentBalances[event.from] -= amount;
                    } else if (event.type === 'transfer' && event.from && event.to) {
                        if (currentBalances[event.from] !== undefined && currentBalances[event.to] !== undefined) {
                            currentBalances[event.from] -= amount;
                            currentBalances[event.to] += amount;
                        }
                    }
                }
            });
        }
    }
    return projection;
}

function processMonteCarloResults(simulations) {
    const years = simulations[0].length;
    const results = {
        p10: [],
        p50: [],
        p90: [],
        labels: [],
        goalProbability: 0
    };

    const currentYear = new Date().getFullYear();
    for (let year = 0; year < years; year++) {
        results.labels.push(currentYear + year);
        const yearValues = simulations.map(sim => sim[year]).sort((a, b) => a - b);
        
        results.p10.push(yearValues[Math.floor(simulations.length * 0.1)]);
        results.p50.push(yearValues[Math.floor(simulations.length * 0.5)]);
        results.p90.push(yearValues[Math.floor(simulations.length * 0.9)]);
    }

    // Goal probability: % of simulations where final net worth > combined goal amounts for those years
    // For simplicity, we'll check against the largest goal amount
    const maxGoal = goals.length > 0 ? Math.max(...goals.map(g => g.amount)) : 0;
    if (maxGoal > 0) {
        const successes = simulations.filter(sim => sim[sim.length - 1] >= maxGoal).length;
        results.goalProbability = (successes / simulations.length) * 100;
    } else {
        results.goalProbability = 100; // No goals = 100% success
    }

    return results;
}

function displayMonteCarloResults(results) {
    document.getElementById('mc-p90').textContent = '$' + formatNumber(results.p90[results.p90.length - 1]);
    document.getElementById('mc-p50').textContent = '$' + formatNumber(results.p50[results.p50.length - 1]);
    document.getElementById('mc-p10').textContent = '$' + formatNumber(results.p10[results.p10.length - 1]);
    document.getElementById('mc-goal-probability').textContent = results.goalProbability.toFixed(1) + '%';

    renderMonteCarloChart(results);
}

function renderMonteCarloChart(results) {
    const ctx = document.getElementById('mc-chart').getContext('2d');
    
    if (charts.mc) charts.mc.destroy();
    
    charts.mc = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.labels,
            datasets: [
                {
                    label: '90th Percentile (Best Case)',
                    data: results.p90,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: false,
                    borderDash: [5, 5],
                    tension: 0.3
                },
                {
                    label: '50th Percentile (Median)',
                    data: results.p50,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: '10th Percentile (Worst Case)',
                    data: results.p10,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: false,
                    borderDash: [5, 5],
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '$' + formatNumber(value)
                    }
                }
            }
        }
    });
}

function showLoadingState(elementId, isLoading = true) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    if (isLoading) {
        element.classList.add('loading');
        element.disabled = true;
        element.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
        element.classList.remove('loading');
        element.disabled = false;
        element.innerHTML = element.getAttribute('data-original-text') || 'Run Projection';
    }
}

// Enhanced save function with auto-save indicator
function saveData() {
    const data = {
        investments: investments,
        events: events,
        goals: goals,
        projections: projections,
        baselineProjections: baselineProjections,
        baselineInvestments: baselineInvestments,
        baselineEvents: baselineEvents,
        baselineGoals: baselineGoals,
        inflationAdjusted: document.getElementById('adjust-inflation').checked,
        inflationRate: document.getElementById('inflation-rate').value,
        lastSaved: new Date().toISOString()
    };
    localStorage.setItem('financeProjectionData', JSON.stringify(data));
    
    // Also save projection settings
    if (projections && projections.length > 0) {
        const projectionSettings = {
            years: document.getElementById('projection-years-input').value,
            projections: projections
        };
        localStorage.setItem('lastProjection', JSON.stringify(projectionSettings));
    }
    
    showAutoSaveIndicator();
}

function loadData() {
    const saved = localStorage.getItem('financeProjectionData');
    if (saved) {
        const data = JSON.parse(saved);
        investments = data.investments || [];
        events = data.events || [];
        goals = data.goals || [];
        projections = data.projections || [];
        baselineProjections = data.baselineProjections || null;
        baselineInvestments = data.baselineInvestments || null;
        baselineEvents = data.baselineEvents || null;
        baselineGoals = data.baselineGoals || null;
        
        if (data.inflationAdjusted !== undefined) {
            document.getElementById('adjust-inflation').checked = data.inflationAdjusted;
            document.getElementById('inflation-rate').value = data.inflationRate || '2.5';
            toggleInflationInput();
        }

        // Update UI if baseline exists
        if (baselineProjections) {
            const scenarioControls = document.getElementById('scenario-controls');
            const saveBtn = document.getElementById('save-baseline-btn');
            if (scenarioControls) scenarioControls.style.display = 'flex';
            if (saveBtn) saveBtn.style.display = 'none';
        }
    }
    
    // Also load projection settings and restore projections
    const lastProjection = localStorage.getItem('lastProjection');
    if (lastProjection) {
        const parsed = JSON.parse(lastProjection);
        document.getElementById('projection-years-input').value = parsed.years || 30;
        // Restore projections if they exist
        if (parsed.projections && parsed.projections.length > 0) {
            projections = parsed.projections;
        }
    }
}

function resetAllData() {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
        investments = [];
        events = [];
        goals = [];
        projections = [];
        baselineProjections = null;
        baselineInvestments = null;
        baselineEvents = null;
        baselineGoals = null;
        
        // Reset UI
        const scenarioControls = document.getElementById('scenario-controls');
        const saveBaselineBtn = document.getElementById('save-baseline-btn');
        if (scenarioControls) scenarioControls.style.display = 'none';
        if (saveBaselineBtn) saveBaselineBtn.style.display = 'inline-flex';
        
        localStorage.removeItem('financeProjectionData');
        localStorage.removeItem('lastProjection');
        localStorage.removeItem('warning-dismissed'); // Reset warning banner state
        localStorage.removeItem('hasRunProjection'); // Reset guide state
        
        // Clear all goals too
        goals = [];
        localStorage.removeItem('financeGoalsData');
        
        // Update UI immediately
        updateDashboard();
        renderInvestments();
        renderEvents();
        renderGoals();
        resetWhatIfSliders();
        
        // Run projection with empty data to clear charts
        if (document.getElementById('dashboard').classList.contains('active')) {
            runProjection();
        }
        
        // Refresh the guide state
        updateOnboardingGuide();
        
        alert('All data has been reset.');
    }
}

// Event Listeners
function setupEventListeners() {
    // Navigation (Sidebar and Bottom Nav)
    const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Investment form
    document.getElementById('investment-form').addEventListener('submit', handleInvestmentSubmit);

    // Event form
    const eventForm = document.getElementById('event-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventSubmit);
    }

    // Goal form
    const goalForm = document.getElementById('goal-form');
    if (goalForm) {
        goalForm.addEventListener('submit', handleGoalSubmit);
    }

    // File import
    document.getElementById('import-file').addEventListener('change', handleFileImport);

    // Window Resize Handling
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Update mobile classes/logic first
            setupMobileOptimizations();

            // Force charts to resize explicitly
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });

            // If we are on the dashboard, re-render everything to ensure alignment
            if (document.getElementById('dashboard').classList.contains('active')) {
                updateDashboard();
                runProjection();
            }
        }, 250);
    });
}

// Tab Management
function switchTab(tabName) {
    // Update navigation items
    const navItems = document.querySelectorAll('.nav-item, .bottom-nav-item');
    navItems.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
        } else {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        }
    });

    // Update content visibility
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.setAttribute('aria-hidden', 'true');
    });
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.setAttribute('aria-hidden', 'false');
    }

    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        const titles = {
            'dashboard': 'Dashboard',
            'investments': 'Investments',
            'events': 'Income & Events',
            'goals': 'Financial Goals',
            'export': 'Export & Share',
            'guide': 'User Guide',
            'ai-analysis': 'AI Financial Analysis',
            'advanced': 'Advanced Simulations'
        };
        pageTitle.textContent = titles[tabName] || 'My Projection';
    }

    // Update charts/lists if needed
    if (tabName === 'dashboard') {
        updateAllocationChart();
        runProjection();
        
        // Force a resize event to ensure Chart.js picks up new container dimensions
        setTimeout(() => {
            Object.values(charts).forEach(chart => {
                if (chart && typeof chart.resize === 'function') {
                    chart.resize();
                }
            });
        }, 50);
    }
    
    if (tabName === 'goals') {
        renderGoals();
    }
    
    if (tabName === 'ai-analysis') {
        updateManualPrompt();
    }
    
    // Accessibility: Focus first element in tab
    if (selectedTab) {
        const firstFocusable = selectedTab.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    // Refresh icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Investment Management
function showAddInvestmentModal(defaultType = 'Stocks') {
    const modal = document.getElementById('investment-modal');
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    // Store the currently focused element
    const activeElement = document.activeElement;
    if (activeElement) {
        activeElement.setAttribute('data-last-focus', 'true');
    }
    
    document.getElementById('investment-form').reset();
    document.getElementById('investment-amount').value = '10000';
    
    // Set the default investment type
    document.getElementById('investment-type').value = defaultType;
    
    // Set initial defaults based on selected type
    updateInvestmentDefaults();
    
    // Update button text to "Add Investment/Debt"
    const submitBtn = document.querySelector('#investment-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Add Investment/Debt';
    }
    
    // Hide delete button
    const deleteBtn = document.getElementById('delete-investment-btn');
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
    }
    
    // Focus the first input in the modal
    const firstInput = modal.querySelector('input, select');
    if (firstInput) {
        firstInput.focus();
    }
}

function generateUniqueInvestmentName(type = 'Stocks') {
    const baseNames = {
        'Stocks': ['S&P 500', 'Russell 2000', 'Vanguard Total Stock Market', 'Stock Market', 'Stocks'],
        'Bonds': ['US Treasury Bond', 'Corporate Bond Fund', 'Municipal Bond', 'TIPS Fund', 'High-Yield Bond'],
        'Real Estate': ['Real Estate Investment Trust', 'Property Investment', 'REIT Fund', 'Real Estate ETF', 'Property Portfolio'],
        'Cash': ['High-Yield Savings', 'Money Market Account', 'CD Ladder', 'Emergency Fund', 'Cash Reserve'],
        'Cryptocurrency': ['Bitcoin', 'Ethereum', 'Cardano', 'Polkadot', 'Solana'],
        'Mutual Fund/Index Fund': ['Vanguard Total Stock Market Index Fund', 'Fidelity 500 Index Fund', 'Schwab Total Bond Market Fund', 'iShares Core S&P 500 ETF', 'Vanguard Total International Stock Index Fund'],
        'Other': ['Alternative Investment', 'Commodity Fund', 'Hedge Fund', 'Private Equity', 'Structured Product']
    };
    
    const names = baseNames[type] || baseNames['Other'];
    const existingNames = investments.map(inv => inv.name);
    
    for (let name of names) {
        if (!existingNames.includes(name)) {
            return name;
        }
    }
    
    // If all base names are taken, add a number
    let counter = 1;
    while (existingNames.includes(`${names[0]} ${counter}`)) {
        counter++;
    }
    return `${names[0]} ${counter}`;
}

function getDefaultReturnRate(type) {
    const defaultRates = {
        'Stocks': 8,
        'Bonds': 4,
        'Real Estate': 6,
        'Cash': 2,
        'Cryptocurrency': 25,
        'Mutual Fund/Index Fund': 7,
        'Debt': 5,
        'Other': 5
    };
    return defaultRates[type] || 5;
}

function updateInvestmentDefaults() {
    const typeSelect = document.getElementById('investment-type');
    const nameInput = document.getElementById('investment-name');
    const returnInput = document.getElementById('investment-return');
    const debtFields = document.getElementById('debt-fields');
    const amountLabel = document.getElementById('investment-amount-label');
    const returnLabel = document.getElementById('investment-return-label');
    
    if (typeSelect && nameInput && returnInput) {
        const selectedType = typeSelect.value;
        const isDebt = selectedType === 'Debt';
        
        const newName = generateUniqueInvestmentName(selectedType);
        const newRate = getDefaultReturnRate(selectedType);
        
        nameInput.value = newName;
        returnInput.value = newRate;

        // Update labels and visibility
        if (debtFields) debtFields.style.display = isDebt ? 'block' : 'none';
        if (amountLabel) amountLabel.textContent = isDebt ? 'Total Debt Amount ($)' : 'Initial Amount ($)';
        if (returnLabel) returnLabel.textContent = isDebt ? 'Interest Rate (%)' : 'Return Rate (%)';
    }
}

function generateUniqueExpenseDescription() {
    const baseDescriptions = ['Car Purchase', 'Home Renovation', 'Medical Expense', 'Vacation', 'Electronics', 'Furniture', 'Education', 'Insurance Payment', 'Tax Payment', 'Emergency Fund'];
    let counter = 1;
    let description = baseDescriptions[0];
    
    while (events.some(evt => evt.type === 'expense' && evt.description === description)) {
        description = `${baseDescriptions[counter % baseDescriptions.length]} ${Math.floor(counter / baseDescriptions.length) + 1}`;
        counter++;
    }
    
    return description;
}

function generateUniqueIncomeDescription() {
    const baseDescriptions = ['Bonus Payment', 'Freelance Work', 'Investment Return', 'Gift', 'Inheritance', 'Side Business', 'Consulting', 'Rental Income', 'Dividend Payment', 'Tax Refund'];
    let counter = 1;
    let description = baseDescriptions[0];
    
    while (events.some(evt => evt.type === 'income' && evt.description === description)) {
        description = `${baseDescriptions[counter % baseDescriptions.length]} ${Math.floor(counter / baseDescriptions.length) + 1}`;
        counter++;
    }
    
    return description;
}

function generateUniqueRecurringExpenseName() {
    const baseNames = ['Rent Payment', 'Mortgage Payment', 'Car Payment', 'Insurance Premium', 'Utility Bills', 'Phone Bill', 'Internet Bill', 'Gym Membership', 'Streaming Services', 'Groceries'];
    let counter = 1;
    let name = baseNames[0];
    
    while (events.some(evt => evt.type === 'recurring' && evt.name === name)) {
        name = `${baseNames[counter % baseNames.length]} ${Math.floor(counter / baseNames.length) + 1}`;
        counter++;
    }
    
    return name;
}

function generateUniqueRecurringIncomeName() {
    const baseNames = ['Salary', 'Freelance Income', 'Rental Income', 'Dividend Income', 'Interest Income', 'Pension', 'Social Security', 'Side Business', 'Consulting Income', 'Investment Income'];
    let counter = 1;
    let name = baseNames[0];
    
    while (events.some(evt => evt.type === 'recurring-income' && evt.name === name)) {
        name = `${baseNames[counter % baseNames.length]} ${Math.floor(counter / baseNames.length) + 1}`;
        counter++;
    }
    
    return name;
}

function editInvestment(id) {
    const investment = investments.find(inv => inv.id === id);
    if (!investment) return;
    document.getElementById('investment-modal').style.display = 'flex';
    document.getElementById('investment-name').value = investment.name;
    document.getElementById('investment-type').value = investment.type;
    document.getElementById('investment-amount').value = investment.amount;
    document.getElementById('investment-return').value = investment.returnRate;
    
    // Debt fields
    const isDebt = investment.type === 'Debt';
    const debtFields = document.getElementById('debt-fields');
    if (debtFields) debtFields.style.display = isDebt ? 'block' : 'none';
    if (isDebt) {
        document.getElementById('debt-payment').value = investment.monthlyPayment || 0;
        document.getElementById('investment-amount-label').textContent = 'Total Debt Amount ($)';
        document.getElementById('investment-return-label').textContent = 'Interest Rate (%)';
    } else {
        document.getElementById('investment-amount-label').textContent = 'Initial Amount ($)';
        document.getElementById('investment-return-label').textContent = 'Return Rate (%)';
    }

    // Store editing id
    document.getElementById('investment-form').setAttribute('data-edit-id', id);
    
    // Update button text to "Update Investment/Debt"
    const submitBtn = document.querySelector('#investment-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Update Investment/Debt';
    }
    
    // Show delete button
    const deleteBtn = document.getElementById('delete-investment-btn');
    if (deleteBtn) {
        deleteBtn.style.display = 'block';
    }
}

function deleteCurrentInvestment() {
    const form = document.getElementById('investment-form');
    const editId = form.getAttribute('data-edit-id');
    if (editId) {
        deleteInvestment(editId);
        closeModal('investment-modal');
    }
}

function handleInvestmentSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('investment-form');
    const editId = form.getAttribute('data-edit-id');
    const existingInv = editId ? investments.find(inv => inv.id === editId) : null;
    const investment = {
        id: editId || Date.now().toString(),
        name: document.getElementById('investment-name').value,
        type: document.getElementById('investment-type').value,
        amount: parseFloat(document.getElementById('investment-amount').value),
        returnRate: parseFloat(document.getElementById('investment-return').value),
        targetAllocation: existingInv ? (existingInv.targetAllocation || 0) : 0,
        monthlyPayment: document.getElementById('investment-type').value === 'Debt' ? (parseFloat(document.getElementById('debt-payment').value) || 0) : 0,
        createdAt: editId ? existingInv.createdAt : new Date().toISOString()
    };
    
    // Validate investment data
    const validation = validateInvestment(investment);
    if (!validation.isValid) {
        showValidationErrors(validation.errors);
        return;
    }
    
    if (editId) {
        // Update existing
        const idx = investments.findIndex(inv => inv.id === editId);
        if (idx !== -1) investments[idx] = investment;
        form.removeAttribute('data-edit-id');
    } else {
        investments.push(investment);
    }
    saveData();
    closeModal('investment-modal');
    renderInvestments();
    updateDashboard();
    displayPortfolioInsights(); // Update insights
    updateEventFormOptions();
    
    // Refresh icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Auto-run projection if we're on dashboard or if we came from dashboard quick add
    // Only auto-run if the user has completed the onboarding step 2 (hasRunProjection)
    if (localStorage.getItem('hasRunProjection') && (document.getElementById('dashboard').classList.contains('active') || 
        document.getElementById('investment-form').getAttribute('data-from-dashboard') === 'true')) {
        runProjection();
        // Clear the flag
        document.getElementById('investment-form').removeAttribute('data-from-dashboard');
    }
    
    // Refresh the guide state
    updateOnboardingGuide();
}

function renderInvestments() {
    const container = document.getElementById('investments-list');
    container.innerHTML = '';

    if (investments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i data-lucide="briefcase"></i>
                </div>
                <div class="empty-state-content">
                    <h3>No Assets Yet</h3>
                    <p>Add your first investment, bank account, or property to start your projection.</p>
                    <button class="btn btn-primary" onclick="showAddInvestmentModal()" style="margin-top: 1rem;">
                        <i data-lucide="plus"></i>
                        <span>Add Asset</span>
                    </button>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    investments.forEach(investment => {
        const item = document.createElement('div');
        item.className = 'investment-item' + (investment.type === 'Debt' ? ' debt-item' : '');
        
        const isDebt = investment.type === 'Debt';
        const rateLabel = isDebt ? 'interest' : 'return';
        const amountDisplay = isDebt ? `-$${formatNumber(investment.amount)}` : `$${formatNumber(investment.amount)}`;
        const paymentInfo = isDebt ? ` • $${formatNumber(investment.monthlyPayment)}/mo payment` : '';

        item.innerHTML = `
            <div class="investment-info">
                <div class="investment-name">${investment.name} ${isDebt ? '<span class="badge debt">Debt</span>' : ''}</div>
                <div class="investment-details">
                    ${investment.type} • ${investment.returnRate}% ${rateLabel}${paymentInfo}
                </div>
            </div>
            <div class="investment-amount ${isDebt ? 'text-danger' : ''}">${amountDisplay}</div>
            <div class="investment-actions">
                <button class="btn btn-secondary" onclick="editInvestment('${investment.id}')">Edit</button>
                <button class="btn btn-danger" onclick="deleteInvestment('${investment.id}')">Delete</button>
            </div>
        `;
        container.appendChild(item);
    });

    // Refresh icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function deleteInvestment(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        investments = investments.filter(inv => inv.id !== id);
        saveData();
        renderInvestments();
        updateDashboard();
        updateEventFormOptions();
        
        // Auto-run projection if we're on dashboard or if we came from dashboard quick add
        if (document.getElementById('dashboard').classList.contains('active') || 
            document.getElementById('investment-form').getAttribute('data-from-dashboard') === 'true') {
            runProjection();
            // Clear the flag
            document.getElementById('investment-form').removeAttribute('data-from-dashboard');
        }
    }
}

// Event Management
function showAddEventModal(type) {
    const modal = document.getElementById('event-modal');
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    
    document.getElementById('event-form').reset();
    document.getElementById('event-form').removeAttribute('data-edit-id');
    
    // Map legacy types from quick buttons if needed
    let mappedType = type;
    let isRecurring = false;
    
    if (type === 'recurring' || type === 'recurring-income' || type === 'recurring-withdrawal') {
        isRecurring = true;
        if (type === 'recurring') mappedType = 'expense';
        if (type === 'recurring-income') mappedType = 'income';
        if (type === 'recurring-withdrawal') mappedType = 'withdrawal';
    } else if (type === 'cash-withdrawal') {
        mappedType = 'withdrawal';
    }

    document.getElementById('event-type').value = mappedType;
    document.getElementById('event-is-recurring').checked = isRecurring;
    
    updateEventForm();
    updateEventFormOptions();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('event-date');
    const startInput = document.getElementById('event-start-date');
    if (dateInput) dateInput.value = today;
    if (startInput) startInput.value = today;
    
    // Set default amounts
    const amountInput = document.getElementById('event-amount');
    if (amountInput) amountInput.value = isRecurring ? '500' : '1000';
    
    const amountTypeInput = document.getElementById('event-amount-type');
    if (amountTypeInput) amountTypeInput.value = 'fixed';

    if (mappedType === 'withdrawal' && type === 'cash-withdrawal') {
        const destSelect = document.getElementById('withdrawal-destination');
        if (destSelect) destSelect.value = 'cash';
    }

    // Update button text
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save Event';
}

function editEvent(id) {
    const event = events.find(evt => evt.id === id);
    if (!event) return;
    document.getElementById('event-modal').style.display = 'flex';
    document.getElementById('event-form').reset();
    document.getElementById('event-type').value = event.type;
    updateEventForm();
    updateEventFormOptions();
    document.getElementById('event-form').setAttribute('data-edit-id', id);
    
    // Update button text to "Update Event"
    const submitBtn = document.querySelector('#event-form button[type="submit"]');
    if (submitBtn) {
        submitBtn.textContent = 'Update Event';
    }
    
    switch (event.type) {
        case 'rebalancing':
            document.getElementById('rebalancing-frequency').value = event.frequency;
            break;
        case 'transfer':
            document.getElementById('transfer-date').value = event.date;
            document.getElementById('transfer-type').value = event.amountType || 'fixed';
            document.getElementById('transfer-amount').value = event.amount;
            document.getElementById('transfer-from').value = event.from;
            document.getElementById('transfer-to').value = event.to;
            break;
        case 'cash-withdrawal':
            document.getElementById('cash-withdrawal-date').value = event.date;
            document.getElementById('cash-withdrawal-type').value = event.amountType || 'fixed';
            document.getElementById('cash-withdrawal-amount').value = event.amount;
            document.getElementById('cash-withdrawal-source').value = event.from;
            document.getElementById('cash-withdrawal-description').value = event.description || '';
            break;
        case 'recurring-withdrawal':
            document.getElementById('recurring-withdrawal-type').value = event.amountType || 'fixed';
            document.getElementById('recurring-withdrawal-amount').value = event.amount;
            document.getElementById('recurring-withdrawal-frequency').value = event.frequency;
            document.getElementById('recurring-withdrawal-start').value = event.startDate;
            document.getElementById('recurring-withdrawal-end').value = event.endDate || '';
            document.getElementById('recurring-withdrawal-source').value = event.from;
            document.getElementById('recurring-withdrawal-description').value = event.description || '';
            break;
        case 'withdrawal':
            document.getElementById('withdrawal-date').value = event.date;
            document.getElementById('withdrawal-amount-type').value = event.amountType || 'fixed';
            document.getElementById('withdrawal-amount').value = event.amount;
            document.getElementById('withdrawal-source').value = event.from;
            document.getElementById('withdrawal-description').value = event.description || '';
            break;
        case 'expense':
            document.getElementById('expense-date').value = event.date;
            document.getElementById('expense-amount').value = event.amount;
            document.getElementById('expense-description').value = event.description;
            document.getElementById('expense-source').value = event.from;
            break;
        case 'recurring':
            document.getElementById('recurring-amount').value = event.amount;
            document.getElementById('recurring-frequency').value = event.frequency;
            document.getElementById('recurring-start').value = event.startDate;
            document.getElementById('recurring-end').value = event.endDate || '';
            document.getElementById('recurring-source').value = event.from;
            document.getElementById('recurring-description').value = event.description || '';
            break;
        case 'income':
            document.getElementById('income-date').value = event.date;
            document.getElementById('income-amount').value = event.amount;
            document.getElementById('income-description').value = event.description;
            document.getElementById('income-target').value = event.to;
            break;
        case 'recurring-income':
            document.getElementById('recurring-income-amount').value = event.amount;
            document.getElementById('recurring-income-frequency').value = event.frequency;
            document.getElementById('recurring-income-start').value = event.startDate;
            document.getElementById('recurring-income-end').value = event.endDate || '';
            document.getElementById('recurring-income-target').value = event.to;
            document.getElementById('recurring-income-description').value = event.description || '';
            break;
    }
}

function updateEventForm() {
    const type = document.getElementById('event-type').value;
    const title = document.getElementById('event-modal-title');
    const isRecurring = document.getElementById('event-is-recurring').checked;
    
    // Reset specialized visibility
    document.getElementById('one-time-date-group').style.display = isRecurring ? 'none' : 'block';
    document.getElementById('recurring-fields-group').style.display = isRecurring ? 'block' : 'none';
    document.getElementById('recurring-toggle-group').style.display = 'block';
    document.getElementById('common-fields').style.display = 'block';
    document.getElementById('rebalancing-fields').style.display = 'none';
    document.getElementById('source-group').style.display = 'block';
    document.getElementById('target-group').style.display = 'block';
    document.getElementById('destination-group').style.display = 'none';
    document.getElementById('amount-fields-group').style.display = 'block';
    document.getElementById('source-target-row').style.display = 'flex';

    const titles = {
        'income': 'Financial Income',
        'expense': 'Financial Expense',
        'transfer': 'Financial Transfer',
        'withdrawal': 'Financial Withdrawal',
        'rebalancing': 'Portfolio Rebalancing'
    };
    title.textContent = (isRecurring ? 'Recurring ' : 'One-Time ') + titles[type];

    // Source/Target label logic
    const sourceLabel = document.getElementById('source-label');
    const targetLabel = document.getElementById('target-label');
    
    switch (type) {
        case 'income':
            document.getElementById('source-group').style.display = 'none';
            targetLabel.textContent = 'Deposit To (Optional)';
            break;
        case 'expense':
            document.getElementById('target-group').style.display = 'none';
            sourceLabel.textContent = 'Pay From (Optional)';
            break;
        case 'transfer':
            sourceLabel.textContent = 'From Account';
            targetLabel.textContent = 'To Account';
            break;
        case 'withdrawal':
            document.getElementById('target-group').style.display = 'none';
            document.getElementById('destination-group').style.display = 'block';
            sourceLabel.textContent = 'Withdraw From';
            break;
        case 'rebalancing':
            document.getElementById('common-fields').style.display = 'none';
            document.getElementById('rebalancing-fields').style.display = 'block';
            document.getElementById('recurring-toggle-group').style.display = 'none'; 
            title.textContent = 'Portfolio Rebalancing';
            renderRebalancingPreview();
            break;
    }
}

function toggleRecurringFields() {
    updateEventForm();
}


function renderRebalancingPreview() {
    const list = document.getElementById('rebalancing-preview-list');
    if (!list) return;
    
    if (investments.length === 0) {
        list.innerHTML = '<p class="empty-state">No investments to rebalance. Add some first.</p>';
        return;
    }

    list.innerHTML = '';
    
    investments.forEach((inv) => {
        const item = document.createElement('div');
        item.className = 'rebalancing-preview-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.marginBottom = '0.75rem';
        item.style.padding = '0.5rem';
        item.style.background = 'var(--bg-main)';
        item.style.borderRadius = 'var(--radius-md)';
        
        const name = document.createElement('span');
        name.textContent = inv.name;
        name.style.fontWeight = '600';
        name.style.fontSize = '0.875rem';
        
        const inputContainer = document.createElement('div');
        inputContainer.style.display = 'flex';
        inputContainer.style.alignItems = 'center';
        inputContainer.style.gap = '0.5rem';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.value = inv.targetAllocation || 0;
        input.style.width = '60px';
        input.style.padding = '0.25rem 0.5rem';
        input.className = 'rebalance-target-input';
        input.dataset.invId = inv.id;
        
        input.onchange = (e) => {
            const val = parseFloat(e.target.value) || 0;
            const i = investments.find(inv => inv.id === e.target.dataset.invId);
            if (i) i.targetAllocation = val;
            saveData();
            updateTotal();
        };

        const percent = document.createElement('span');
        percent.textContent = '%';
        
        inputContainer.appendChild(input);
        inputContainer.appendChild(percent);
        item.appendChild(name);
        item.appendChild(inputContainer);
        list.appendChild(item);
    });

    const summary = document.createElement('div');
    summary.id = 'rebalancing-total-percent';
    summary.style.marginTop = '1rem';
    summary.style.fontSize = '0.875rem';
    summary.style.fontWeight = '700';
    summary.style.textAlign = 'right';
    
    function updateTotal() {
        let currentTotal = 0;
        document.querySelectorAll('.rebalance-target-input').forEach(inp => {
            currentTotal += (parseFloat(inp.value) || 0);
        });
        summary.textContent = `Total: ${currentTotal}%`;
        summary.style.color = currentTotal === 100 ? 'var(--success)' : 'var(--danger)';
    }
    
    list.appendChild(summary);
    updateTotal();
}

function updateEventFormOptions() {
    const options = investments.map(inv => `<option value="${inv.id}">${inv.name}</option>`).join('');
    const noSourceOption = '<option value="">No specific source (Proportional)</option>';
    const noTargetOption = '<option value="">No specific target (Proportional)</option>';
    
    const eventSource = document.getElementById('event-source');
    const eventTarget = document.getElementById('event-target');
    const boostTarget = document.getElementById('savings-boost-target');
    
    if (eventSource) eventSource.innerHTML = noSourceOption + options;
    if (eventTarget) eventTarget.innerHTML = noTargetOption + options;
    if (boostTarget) {
        const currentVal = boostTarget.value;
        boostTarget.innerHTML = options; // No "Proportional" option
        
        // Find highest balance asset as default
        const highestAsset = investments.length > 0 ? 
            [...investments].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] : null;
            
        if (currentVal && investments.some(i => i.id === currentVal)) {
            boostTarget.value = currentVal;
        } else if (highestAsset) {
            boostTarget.value = highestAsset.id;
        }
    }

    // Find highest balance asset as default for withdrawals
    const highestAsset = investments.length > 0 ? 
        [...investments].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] : null;
    
    if (highestAsset && eventSource && !eventSource.value) {
        eventSource.value = highestAsset.id;
    }
}

function handleEventSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('event-form');
    const editId = form.getAttribute('data-edit-id');
    const type = document.getElementById('event-type').value;
    const isRecurring = document.getElementById('event-is-recurring').checked;
    
    let event = {
        id: editId || Date.now().toString(),
        type: type,
        createdAt: editId ? events.find(evt => evt.id === editId).createdAt : new Date().toISOString(),
        description: document.getElementById('event-description').value,
        isRecurring: isRecurring
    };

    if (type === 'rebalancing') {
        event.frequency = 'annually'; 
        document.querySelectorAll('.rebalance-target-input').forEach(inp => {
            const invId = inp.dataset.invId;
            const inv = investments.find(i => i.id === invId);
            if (inv) inv.targetAllocation = parseFloat(inp.value) || 0;
        });
        saveData();
    } else {
        event.amount = parseFloat(document.getElementById('event-amount').value);
        event.amountType = document.getElementById('event-amount-type').value;
        
        if (isRecurring) {
            event.frequency = document.getElementById('event-frequency').value;
            event.startDate = document.getElementById('event-start-date').value;
            event.endDate = document.getElementById('event-end-date').value || null;
        } else {
            event.date = document.getElementById('event-date').value;
        }

        switch (type) {
            case 'income':
                event.to = document.getElementById('event-target').value;
                break;
            case 'expense':
                event.from = document.getElementById('event-source').value;
                break;
            case 'transfer':
                event.from = document.getElementById('event-source').value;
                event.to = document.getElementById('event-target').value;
                break;
            case 'withdrawal':
                event.from = document.getElementById('event-source').value;
                const dest = document.getElementById('withdrawal-destination').value;
                if (dest === 'external') {
                    event.to = 'external';
                } else {
                    let cashInv = investments.find(inv => inv.type === 'Cash');
                    if (!cashInv) {
                        cashInv = {
                            id: Date.now().toString(),
                            name: 'Cash Account',
                            type: 'Cash',
                            amount: 0,
                            returnRate: 0,
                            targetAllocation: 0,
                            createdAt: new Date().toISOString()
                        };
                        investments.push(cashInv);
                        saveData();
                    }
                    event.to = cashInv.id;
                }
                break;
        }
    }

    let isValid = true;
    let errorMessage = '';
    if (type !== 'rebalancing') {
        if (isNaN(event.amount)) {
            isValid = false;
            errorMessage = 'Please enter a valid amount.';
        } else if (isRecurring && !event.startDate) {
            isValid = false;
            errorMessage = 'Please select a start date for the recurring event.';
        } else if (!isRecurring && !event.date) {
            isValid = false;
            errorMessage = 'Please select a date for the event.';
        }
    }

    if (!isValid) {
        alert(errorMessage);
        return;
    }

    if (editId) {
        const idx = events.findIndex(evt => evt.id === editId);
        if (idx !== -1) events[idx] = event;
        form.removeAttribute('data-edit-id');
    } else {
        events.push(event);
    }

    saveData();
    closeModal('event-modal');
    renderEvents();
    updateDashboard();
    form.reset();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    const isDashboardActive = document.getElementById('dashboard').classList.contains('active');
    if (isDashboardActive && localStorage.getItem('hasRunProjection')) {
        runProjection();
    }
    updateOnboardingGuide();
}

function renderEvents() {
    const container = document.getElementById('events-list');
    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i data-lucide="calendar"></i>
                </div>
                <div class="empty-state-content">
                    <h3>No Financial Events</h3>
                    <p>Model your life changes like salary increases, major purchases, or retirement withdrawals.</p>
                    <button class="btn btn-primary" onclick="showAddEventModal('income')" style="margin-top: 1rem;">
                        <i data-lucide="plus"></i>
                        <span>Add Event</span>
                    </button>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    events.forEach(event => {
        const item = document.createElement('div');
        item.className = 'event-item';
        
        let title, details, icon, typeClass;
        const isRec = !!event.isRecurring;
        const freqLabel = isRec ? ` (${event.frequency})` : '';

        switch (event.type) {
            case 'rebalancing':
                title = `Rebalancing${freqLabel}`;
                details = `Portfolio will be rebalanced ${event.frequency || 'annually'}`;
                icon = 'refresh-cw';
                typeClass = 'rebalancing';
                break;
            case 'transfer':
                const fromInv = investments.find(inv => inv.id === event.from);
                const toInv = investments.find(inv => inv.id === event.to);
                const transferValue = event.amountType === 'percent' ? `${event.amount}%` : `$${formatNumber(event.amount)}`;
                title = `Transfer: ${transferValue}${freqLabel}`;
                details = `From ${fromInv?.name || 'Proportional'} to ${toInv?.name || 'Proportional'} on ${isRec ? formatDate(event.startDate) : formatDate(event.date)}`;
                icon = 'repeat';
                typeClass = 'transfer';
                break;
            case 'withdrawal':
                const withdrawFrom = investments.find(inv => inv.id === event.from);
                const withdrawalValue = event.amountType === 'percent' ? `${event.amount}%` : `$${formatNumber(event.amount)}`;
                const isExternal = event.to === 'external';
                title = `Withdrawal: ${withdrawalValue}${freqLabel}`;
                details = `From ${withdrawFrom?.name || 'General Assets'} to ${isExternal ? 'External' : 'Cash Account'} on ${isRec ? formatDate(event.startDate) : formatDate(event.date)}`;
                icon = isExternal ? 'external-link' : 'wallet';
                typeClass = 'withdrawal';
                break;
            case 'expense':
                const sourceInv = event.from ? investments.find(inv => inv.id === event.from) : null;
                title = `${isRec ? 'Recurring ' : ''}Expense: ${event.description || 'Untitled'}`;
                details = `$${formatNumber(event.amount)} ${isRec ? event.frequency : 'on ' + formatDate(event.date)}${sourceInv ? ` from ${sourceInv.name}` : ''}`;
                icon = 'trending-down';
                typeClass = 'expense';
                break;
            case 'income':
                const incomeTarget = event.to ? investments.find(inv => inv.id === event.to) : null;
                title = `${isRec ? 'Recurring ' : ''}Income: ${event.description || 'Untitled'}`;
                details = `$${formatNumber(event.amount)} ${isRec ? event.frequency : 'on ' + formatDate(event.date)}${incomeTarget ? ` to ${incomeTarget.name}` : ''}`;
                icon = 'trending-up';
                typeClass = 'income';
                break;
        }

        item.innerHTML = `
            <div class="event-type-icon ${typeClass}">
                <i data-lucide="${icon}"></i>
            </div>
            <div class="event-content">
                <div class="event-title">${title}</div>
                <div class="event-details">${details}</div>
            </div>
            <div class="event-actions">
                <button class="btn btn-outline btn-sm" onclick="editEvent('${event.id}')"><i data-lucide="edit-2"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteEvent('${event.id}')"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        container.appendChild(item);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function deleteEvent(id) {
    if (confirm('Are you sure you want to delete this event?')) {
        events = events.filter(evt => evt.id !== id);
        saveData();
        renderEvents();
        updateDashboard();
        
        if (document.getElementById('dashboard').classList.contains('active')) {
            runProjection();
        }
    }
}

// Goal Management
function handleGoalCategoryChange() {
    const category = document.getElementById('goal-category').value;
    const nameInput = document.getElementById('goal-name');
    const typeSelect = document.getElementById('goal-type');
    
    const defaults = {
        'retirement': { name: 'Retirement', type: 'net-worth' },
        'emergency-fund': { name: 'Emergency Fund', type: 'investment' },
        'home': { name: 'House Down Payment', type: 'net-worth' },
        'car': { name: 'New Car', type: 'net-worth' },
        'education': { name: 'College Fund', type: 'net-worth' },
        'vacation': { name: 'Dream Vacation', type: 'net-worth' },
        'investment': { name: 'Portfolio Milestone', type: 'investment' },
        'other': { name: '', type: 'net-worth' }
    };
    
    if (defaults[category]) {
        nameInput.value = defaults[category].name;
        typeSelect.value = defaults[category].type;
        // Trigger type change logic
        const isInvestment = typeSelect.value === 'investment';
        document.getElementById('goal-target-asset-group').style.display = isInvestment ? 'block' : 'none';
        document.getElementById('goal-deduct-group').style.display = isInvestment ? 'block' : 'none';
    }
}

function showAddGoalModal() {
    const modal = document.getElementById('goal-modal');
    modal.style.display = 'flex';
    document.getElementById('goal-form').reset();
    document.getElementById('goal-form').removeAttribute('data-edit-id');
    document.getElementById('goal-modal-title').textContent = 'Add Financial Goal';
    
    // Default year to 10 years from now
    document.getElementById('goal-year').value = new Date().getFullYear() + 10;
    
    // Update asset options
    const assetSelect = document.getElementById('goal-target-asset');
    assetSelect.innerHTML = investments.map(inv => `<option value="${inv.id}">${inv.name}</option>`).join('');
    
    // Handle goal type change
    document.getElementById('goal-type').onchange = function() {
        const isInvestment = this.value === 'investment';
        document.getElementById('goal-target-asset-group').style.display = isInvestment ? 'block' : 'none';
        document.getElementById('goal-deduct-group').style.display = isInvestment ? 'block' : 'none';
    };
    
    // Set initial defaults
    handleGoalCategoryChange();

    // Update button text
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save Goal';
}

function handleGoalSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const editId = form.getAttribute('data-edit-id');
    
    const goal = {
        id: editId || Date.now().toString(),
        category: document.getElementById('goal-category').value,
        name: document.getElementById('goal-name').value,
        amount: parseFloat(document.getElementById('goal-amount').value),
        year: parseInt(document.getElementById('goal-year').value),
        type: document.getElementById('goal-type').value,
        targetAssetId: document.getElementById('goal-type').value === 'investment' ? document.getElementById('goal-target-asset').value : null,
        deductOnComplete: document.getElementById('goal-type').value === 'investment' ? document.getElementById('goal-deduct').checked : false,
        createdAt: editId ? goals.find(g => g.id === editId).createdAt : new Date().toISOString()
    };

    if (!goal.name || isNaN(goal.amount) || isNaN(goal.year)) {
        showToast('Please fill in all required fields.', 'error');
        return;
    }

    if (goal.year < new Date().getFullYear() || goal.year > 2100) {
        showToast('Please enter a valid future year.', 'error');
        return;
    }
    
    if (editId) {
        const idx = goals.findIndex(g => g.id === editId);
        if (idx !== -1) goals[idx] = goal;
    } else {
        goals.push(goal);
    }
    
    saveData();
    closeModal('goal-modal');
    renderGoals();
    updateNetWorthChart(); // Refresh chart to show markers
}

function editGoal(id) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    
    showAddGoalModal();
    document.getElementById('goal-modal-title').textContent = 'Edit Financial Goal';
    document.getElementById('goal-form').setAttribute('data-edit-id', id);
    
    document.getElementById('goal-category').value = goal.category || 'other';
    document.getElementById('goal-name').value = goal.name;
    document.getElementById('goal-amount').value = goal.amount;
    document.getElementById('goal-year').value = goal.year;
    document.getElementById('goal-type').value = goal.type;
    
    if (goal.type === 'investment') {
        document.getElementById('goal-target-asset-group').style.display = 'block';
        document.getElementById('goal-target-asset').value = goal.targetAssetId;
        document.getElementById('goal-deduct-group').style.display = 'block';
        document.getElementById('goal-deduct').checked = goal.deductOnComplete || false;
    }
    
    document.querySelector('#goal-modal button[type="submit"]').textContent = 'Update Goal';
}

function deleteGoal(id) {
    if (confirm('Are you sure you want to delete this goal?')) {
        goals = goals.filter(g => g.id !== id);
        saveData();
        renderGoals();
        updateNetWorthChart();
    }
}

function renderGoals() {
    const container = document.getElementById('goals-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (goals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i data-lucide="target"></i>
                </div>
                <div class="empty-state-content">
                    <h3>No Goals Set</h3>
                    <p>Set a target for retirement, a home purchase, or any other financial objective.</p>
                    <button class="btn btn-primary" onclick="showAddGoalModal()" style="margin-top: 1rem;">
                        <i data-lucide="plus"></i>
                        <span>Set Goal</span>
                    </button>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    // Category icons map
    const categoryIcons = {
        'retirement': 'palmtree',
        'emergency-fund': 'shield',
        'home': 'home',
        'car': 'car',
        'education': 'graduation-cap',
        'vacation': 'plane',
        'investment': 'trending-up',
        'other': 'target'
    };
    
    // Sort goals by year
    const sortedGoals = [...goals].sort((a, b) => a.year - b.year);
    
    sortedGoals.forEach(goal => {
        // Calculate progress
        let currentVal = 0;
        const targetYear = goal.year;
        const projection = projections.find(p => p.year === targetYear);
        
        if (projection) {
            if (goal.type === 'net-worth') {
                currentVal = projection.totalNetWorth;
            } else {
                currentVal = projection.balances[goal.targetAssetId] || 0;
            }
        } else {
            // If beyond projection, use the last year's value as a proxy
            const lastYear = projections[projections.length - 1];
            if (lastYear) {
                if (goal.type === 'net-worth') {
                    currentVal = lastYear.totalNetWorth;
                } else {
                    currentVal = lastYear.balances[goal.targetAssetId] || 0;
                }
            }
        }
        
        const progress = Math.min(100, Math.max(0, (currentVal / goal.amount) * 100));
        const isOnTrack = currentVal >= goal.amount;
        const icon = categoryIcons[goal.category] || 'target';
        
        const card = document.createElement('div');
        card.className = 'goal-card';
        card.innerHTML = `
            <div class="goal-header">
                <div style="display: flex; gap: 1rem; align-items: flex-start;">
                    <div class="goal-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--border-focus); padding: 0.75rem; border-radius: var(--radius-md); display: flex;">
                        <i data-lucide="${icon}"></i>
                    </div>
                    <div class="goal-info">
                        <h3>${goal.name}</h3>
                        <div class="goal-target">Target: $${formatNumber(goal.amount)} in ${goal.year}</div>
                        ${goal.deductOnComplete ? `<div class="goal-target" style="color: var(--warning-color); font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem;"><i data-lucide="minus-circle" style="width: 14px; height: 14px;"></i> Deducts from balance on reach</div>` : ''}
                    </div>
                </div>
                <span class="goal-status-badge ${isOnTrack ? 'on-track' : 'off-track'}">
                    ${isOnTrack ? 'On Track' : 'Needs More'}
                </span>
            </div>
            
            <div class="goal-progress-container">
                <div class="goal-progress-labels">
                    <span>${progress.toFixed(1)}% of goal</span>
                    <span>$${formatNumber(currentVal)} / $${formatNumber(goal.amount)}</span>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            
            <div class="goal-actions">
                <button class="btn btn-outline btn-sm" onclick="editGoal('${goal.id}')">
                    <i data-lucide="edit-2"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteGoal('${goal.id}')">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Projection Engine
function updateWhatIf() {
    marketOffset = parseFloat(document.getElementById('market-performance-slider').value);
    savingsBoost = parseFloat(document.getElementById('savings-boost-slider').value);
    
    // Update labels
    document.getElementById('market-offset-val').textContent = (marketOffset > 0 ? '+' : '') + marketOffset.toFixed(1) + '%';
    const boostDisplay = (savingsBoost > 0 ? '+' : '') + '$' + formatNumber(savingsBoost);
    document.getElementById('savings-boost-val').textContent = boostDisplay;
    document.getElementById('savings-boost-val').className = savingsBoost >= 0 ? 'text-success' : 'text-danger';
    
    // Show/hide reset button
    const hasChanges = marketOffset !== 0 || savingsBoost !== 0;
    document.getElementById('reset-what-if').style.display = hasChanges ? 'block' : 'none';
    
    // Run projection with debounce
    if (projectionTimeout) clearTimeout(projectionTimeout);
    projectionTimeout = setTimeout(() => {
        runProjection();
    }, 100);
}

function resetWhatIfSliders() {
    document.getElementById('market-performance-slider').value = 0;
    document.getElementById('savings-boost-slider').value = 0;
    const boostTarget = document.getElementById('savings-boost-target');
    if (boostTarget) boostTarget.value = '';
    updateWhatIf();
}

function runProjection() {
    const years = parseInt(document.getElementById('projection-years-input').value);
    if (years < 1 || years > 60) {
        alert('Please enter a valid number of years (1-60)');
        return;
    }

    const startTime = performance.now();
    projections = calculateProjection(years);
    const endTime = performance.now();
    
    // Cache the last run projection
    localStorage.setItem('lastProjection', JSON.stringify({ years, projections }));

    updateProjectionTable();
    updateProjectionCharts();
    updateDashboard();
    updateProjectedNetWorth();
    displayPortfolioInsights();
    
    // Onboarding Guide Step 3: Set run flag
    if (!localStorage.getItem('hasRunProjection')) {
        localStorage.setItem('hasRunProjection', 'true');
        updateOnboardingGuide();
    }
}

function toggleInflationInput() {
    const isChecked = document.getElementById('adjust-inflation').checked;
    document.getElementById('inflation-rate-wrapper').style.display = isChecked ? 'flex' : 'none';
    runProjection();
}

function calculateProjection(years) {
    const projection = [];
    const currentYear = new Date().getFullYear();
    const adjustInflation = document.getElementById('adjust-inflation').checked;
    const inflationValue = document.getElementById('inflation-rate').value;
    const inflationRate = (inflationValue !== "" ? parseFloat(inflationValue) : 2.5) / 100;
    
    let currentBalances = {};
    if (investments.length === 0) {
        // Use a virtual balance if no investments
        currentBalances['virtual'] = 0;
    } else {
        investments.forEach(inv => {
            currentBalances[inv.id] = inv.type === 'Debt' ? -inv.amount : inv.amount;
        });
    }

    for (let year = 0; year <= years; year++) {
        const yearData = {
            year: currentYear + year,
            balances: {},
            events: [],
            milestones: [],
            growth: 0,
            investmentGrowth: 0,
            income: 0,
            isInflationAdjusted: adjustInflation
        };

        if (year > 0) {
            // Apply investment growth for the year leading up to this point
            if (investments.length > 0) {
                investments.forEach(inv => {
                    if (inv.type === 'Debt') {
                        const rate = inv.returnRate / 100;
                        const interest = currentBalances[inv.id] * rate;
                        currentBalances[inv.id] += interest;
                        yearData.growth += interest;
                    } else if (currentBalances[inv.id] > 0) {
                        const baseRate = inv.returnRate / 100;
                        const effectiveRate = baseRate + (marketOffset / 100);
                        const growth = currentBalances[inv.id] * effectiveRate;
                        currentBalances[inv.id] += growth;
                        yearData.investmentGrowth += growth;
                        yearData.growth += growth;
                    }
                });
            }

            // Apply What-If Savings Boost/Expense
            if (savingsBoost !== 0) {
                const annualBoost = savingsBoost * 12;
                const boostTargetEl = document.getElementById('savings-boost-target');
                let selectedTargetId = boostTargetEl ? boostTargetEl.value : '';
                
                // If target selection is lost or doesn't exist, find highest asset or fallback to virtual
                if (!selectedTargetId || currentBalances[selectedTargetId] === undefined) {
                    const potentialSources = Object.keys(currentBalances).filter(id => {
                        const inv = investments.find(i => i.id === id);
                        return !inv || inv.type !== 'Debt';
                    });
                    
                    if (potentialSources.length > 0) {
                        // Sort by current balance to target highest
                        selectedTargetId = potentialSources.sort((a, b) => currentBalances[b] - currentBalances[a])[0];
                    } else {
                        selectedTargetId = 'virtual';
                    }
                }
                
                if (currentBalances[selectedTargetId] === undefined) {
                    currentBalances[selectedTargetId] = 0;
                }
                
                currentBalances[selectedTargetId] += annualBoost;
                
                if (savingsBoost > 0) {
                    yearData.income += annualBoost;
                }
                yearData.growth += annualBoost;
                const boostLabel = savingsBoost > 0 ? 'What-If Boost' : 'What-If Expense';
                yearData.events.push(`${boostLabel}: ${savingsBoost > 0 ? '+' : '-'}$${formatNumber(Math.abs(annualBoost))}`);
            }

            // Apply Debt Payments
            investments.filter(inv => inv.type === 'Debt').forEach(debt => {
                if (currentBalances[debt.id] < 0) {
                    const annualPayment = (debt.monthlyPayment || 0) * 12;
                    const remainingDebt = Math.abs(currentBalances[debt.id]);
                    const actualPayment = Math.min(annualPayment, remainingDebt);
                    if (actualPayment > 0) {
                        currentBalances[debt.id] += actualPayment;
                        // Find a source account with positive balance, or use virtual
                        const potentialSources = Object.keys(currentBalances).filter(id => id !== debt.id && currentBalances[id] > 0);
                        const sourceId = potentialSources.length > 0 ? potentialSources[0] : 'virtual';
                        
                        // Ensure sourceId exists in currentBalances to avoid NaN
                        if (currentBalances[sourceId] === undefined) {
                            currentBalances[sourceId] = 0;
                        }
                        
                        currentBalances[sourceId] -= actualPayment;
                        yearData.events.push(`Debt Payment: ${debt.name} (-$${formatNumber(actualPayment)})`);
                    }
                }
            });

            // IMPORTANT: Apply events for the PREVIOUS calendar year leading into this point
            // This ensures currentYear (Year 0) events are applied in the Year 1 calculation.
            const yearToApply = currentYear + (year - 1);
            const yearEvents = getEventsForYear(yearToApply, currentYear + years);
            yearEvents.forEach(event => {
                if (investments.length === 0) {
                    applyEventToVirtual(event, currentBalances, yearData);
                } else {
                    applyEvent(event, currentBalances, yearData);
                }
            });

            // Update growth after events
            const prevTotal = projection[year-1].totalNetWorth * (adjustInflation ? Math.pow(1 + inflationRate, year-1) : 1);
            const currentTotal = Object.values(currentBalances).reduce((sum, val) => sum + val, 0);
            yearData.growth = currentTotal - prevTotal;

            if (investments.length > 0) {
                applyRebalancing(currentBalances, yearData);
            }

            // Apply Goal Deductions
            const yearGoals = goals.filter(g => g.year === yearToApply && g.deductOnComplete);
            yearGoals.forEach(goal => {
                if (goal.type === 'investment' && goal.targetAssetId) {
                    currentBalances[goal.targetAssetId] -= goal.amount;
                    yearData.events.push(`Goal Met & Deducted: ${goal.name} ($${formatNumber(goal.amount)})`);
                }
            });
        }

        // Calculate total and apply inflation discount if enabled
        const actualTotal = Object.values(currentBalances).reduce((sum, val) => sum + val, 0);
        const discountFactor = adjustInflation ? Math.pow(1 + inflationRate, year) : 1;
        
        yearData.totalNetWorth = actualTotal / discountFactor;
        
        // Populate balances with discounted values for the chart
        Object.keys(currentBalances).forEach(id => {
            yearData.balances[id] = currentBalances[id] / discountFactor;
        });

        // Milestone Checks
        const prevTotal = year > 0 ? projection[year-1].totalNetWorth : 0;
        
        // Millionaire Milestone
        if (prevTotal < 1000000 && yearData.totalNetWorth >= 1000000) {
            yearData.milestones.push('Millionaire Status 🏆');
        }
        // Debt Free Milestone
        if (prevTotal < 0 && yearData.totalNetWorth >= 0) {
            yearData.milestones.push('Debt Free! 🕊️');
        }
        // Financial Independence (Passive growth > Expenses)
        const annualExpenses = events
            .filter(e => e.type === 'recurring' || e.isRecurring || (e.frequency && e.frequency !== 'one-time'))
            .reduce((sum, e) => {
                const multiplier = e.frequency === 'monthly' ? 12 : e.frequency === 'quarterly' ? 4 : 1;
                return sum + (e.amount * multiplier);
            }, 0);
        if (yearData.investmentGrowth > annualExpenses && annualExpenses > 0 && (year === 0 || projection[year-1].investmentGrowth <= annualExpenses)) {
            yearData.milestones.push('Financial Independence 🚀');
        }

        projection.push(yearData);
    }

    return projection;
}

// Helper for event application when no investments
function applyEventToVirtual(event, balances, yearData) {
    let actualAmount = event.amount;
    
    switch (event.type) {
        case 'transfer':
        case 'withdrawal':
        case 'cash-withdrawal':
        case 'recurring-withdrawal':
            // For virtual accounts, transfers/withdrawals are treated as external outflows
            balances['virtual'] -= actualAmount;
            const displayAmount = event.amountType === 'percent' ? `${event.amount}% ($${formatNumber(actualAmount)})` : `$${formatNumber(actualAmount)}`;
            yearData.events.push(`${(event.type === 'withdrawal' || event.type.includes('withdrawal')) ? 'Withdrawal' : 'Transfer'}: ${displayAmount}`);
            break;
        case 'expense':
        case 'recurring':
            balances['virtual'] -= actualAmount;
            yearData.events.push(`Expense: $${formatNumber(actualAmount)}`);
            break;
        case 'income':
        case 'recurring-income':
            balances['virtual'] += actualAmount;
            yearData.income += actualAmount;
            yearData.growth += actualAmount;
            yearData.events.push(`Income: $${formatNumber(actualAmount)}`);
            break;
    }
}

function getEventsForYear(year, projectionEndYear) {
    const yearEvents = [];
    const getYearFromStr = (str) => {
        if (!str) return null;
        const parts = str.split('-');
        return parts.length > 0 ? parseInt(parts[0]) : null;
    };
    
    events.forEach(event => {
        if (event.type === 'rebalancing') return; // Handled separately

        // Treat as recurring if isRecurring flag is set OR if it has a valid frequency
        const isRecurring = event.isRecurring === true || (event.frequency && event.frequency !== 'one-time') || event.type.startsWith('recurring');
        
        if (isRecurring) {
            const startYear = getYearFromStr(event.startDate || event.date);
            let endYear;
            if (event.endDate && event.endDate !== 'null' && event.endDate !== '') {
                endYear = getYearFromStr(event.endDate);
            } else {
                endYear = startYear + 100;
            }

            if (year >= startYear && year <= endYear) {
                let multiplier = 1;
                switch (event.frequency) {
                    case 'monthly': multiplier = 12; break;
                    case 'quarterly': multiplier = 4; break;
                    case 'annually': multiplier = 1; break;
                }
                const annualAmount = event.amount * multiplier;
                // Force isRecurring to true for the engine
                yearEvents.push({ 
                    ...event, 
                    amount: annualAmount, 
                    originalAmount: event.amount, 
                    isRecurring: true 
                });
            }
        } else {
            const eventYear = getYearFromStr(event.date || event.startDate);
            if (eventYear === year) {
                yearEvents.push(event);
            }
        }
    });
    return yearEvents;
}

function applyEvent(event, balances, yearData) {
    switch (event.type) {
        case 'transfer':
        case 'withdrawal':
        case 'cash-withdrawal': // legacy support
        case 'recurring-withdrawal': // legacy support
            let actualAmount = event.amount;
            if (event.amountType === 'percent') {
                const sourceBalance = (event.from && balances[event.from] !== undefined) ? balances[event.from] : Object.values(balances).reduce((a, b) => a + b, 0);
                actualAmount = sourceBalance * (event.amount / 100);
            }
            
            const sourceId = (event.from && balances[event.from] !== undefined) ? event.from : Object.keys(balances)[0] || 'virtual';
            balances[sourceId] -= actualAmount;
            
            if (event.to && balances[event.to] !== undefined) {
                balances[event.to] += actualAmount;
            }
            
            const typeLabel = (event.type === 'withdrawal' || event.type === 'cash-withdrawal' || event.type === 'recurring-withdrawal') ? 'Withdrawal' : 'Transfer';
            const displayValue = event.amountType === 'percent' ? `${event.amount}% ($${formatNumber(actualAmount)})` : `$${formatNumber(actualAmount)}`;
            const frequencyLabel = event.isRecurring ? ` (${event.frequency})` : '';
            yearData.events.push(`${typeLabel}${frequencyLabel}: ${displayValue}`);
            break;

        case 'expense':
        case 'recurring': // legacy support
            let expenseAmount = event.amount;
            if (event.amountType === 'percent') {
                const sourceBalance = (event.from && balances[event.from] !== undefined) ? balances[event.from] : Object.values(balances).reduce((a, b) => a + b, 0);
                expenseAmount = sourceBalance * (event.amount / 100);
            }
            const expenseFrom = event.from || event.source; // support both
            
            if (expenseFrom && balances[expenseFrom] !== undefined) {
                balances[expenseFrom] -= expenseAmount;
            } else {
                const total = Object.values(balances).reduce((sum, val) => sum + val, 0);
                if (total > 0) {
                    Object.keys(balances).forEach(invId => {
                        const ratio = balances[invId] / total;
                        balances[invId] -= expenseAmount * ratio;
                    });
                } else {
                    const firstId = Object.keys(balances)[0];
                    if (firstId) balances[firstId] -= expenseAmount;
                }
            }
            
            if (event.isRecurring) {
                const orig = event.originalAmount || event.amount;
                const multiplier = event.frequency === 'monthly' ? 12 : event.frequency === 'quarterly' ? 4 : 1;
                const displayVal = event.amountType === 'percent' ? `${event.amount}% of balance` : `$${formatNumber(orig)}`;
                yearData.events.push(`Recurring Expense (${event.frequency}): ${displayVal} × ${multiplier} = $${formatNumber(expenseAmount)}`);
            } else {
                const displayVal = event.amountType === 'percent' ? `${event.amount}% ($${formatNumber(expenseAmount)})` : `$${formatNumber(expenseAmount)}`;
                yearData.events.push(`Expense: ${displayVal}`);
            }
            break;

        case 'income':
        case 'recurring-income': // legacy support
            let incomeAmount = event.amount;
            if (event.amountType === 'percent') {
                const targetBalance = (event.to && balances[event.to] !== undefined) ? balances[event.to] : Object.values(balances).reduce((a, b) => a + b, 0);
                incomeAmount = targetBalance * (event.amount / 100);
            }
            yearData.income += incomeAmount;
            yearData.growth += incomeAmount;
            const incomeTo = event.to || event.target; // support both
            
            if (incomeTo && balances[incomeTo] !== undefined) {
                balances[incomeTo] += incomeAmount;
            } else {
                const total = Object.values(balances).reduce((sum, val) => sum + val, 0);
                if (total > 0) {
                    Object.keys(balances).forEach(invId => {
                        const ratio = balances[invId] / total;
                        balances[invId] += incomeAmount * ratio;
                    });
                } else {
                    const firstId = Object.keys(balances)[0];
                    if (firstId) balances[firstId] += incomeAmount;
                }
            }
            
            if (event.isRecurring) {
                const orig = event.originalAmount || event.amount;
                const multiplier = event.frequency === 'monthly' ? 12 : event.frequency === 'quarterly' ? 4 : 1;
                const displayVal = event.amountType === 'percent' ? `${event.amount}% of balance` : `$${formatNumber(orig)}`;
                yearData.events.push(`Recurring Income (${event.frequency}): ${displayVal} × ${multiplier} = $${formatNumber(incomeAmount)}`);
            } else {
                const displayVal = event.amountType === 'percent' ? `${event.amount}% ($${formatNumber(incomeAmount)})` : `$${formatNumber(incomeAmount)}`;
                yearData.events.push(`Income: ${displayVal}`);
            }
            break;
    }
}

function applyRebalancing(balances, yearData) {
    const rebalancingEvents = events.filter(evt => evt.type === 'rebalancing');
    if (rebalancingEvents.length === 0) return;

    const total = Object.values(balances).reduce((sum, val) => sum + val, 0);
    if (total === 0) return;

    // Get target allocations
    const targets = {};
    investments.forEach(inv => {
        if (inv.targetAllocation > 0) {
            targets[inv.id] = inv.targetAllocation / 100;
        }
    });

    // Calculate target amounts
    const targetAmounts = {};
    Object.keys(targets).forEach(invId => {
        targetAmounts[invId] = total * targets[invId];
    });

    // Rebalance
    Object.keys(balances).forEach(invId => {
        if (targetAmounts[invId] !== undefined) {
            balances[invId] = targetAmounts[invId];
        }
    });

    yearData.events.push('Portfolio rebalanced');
}

// Dashboard Updates
function getCurrentNetWorth() {
    return investments.reduce((sum, inv) => {
        const amount = parseFloat(inv.amount) || 0;
        return inv.type === 'Debt' ? sum - amount : sum + amount;
    }, 0);
}

function updateDashboard() {
    const totalNetWorth = getCurrentNetWorth();
    const netWorthElement = document.getElementById('current-net-worth');
    if (netWorthElement) {
        netWorthElement.textContent = `$${formatNumber(totalNetWorth)}`;
    }
    
    const investmentCountEl = document.getElementById('investment-count');
    if (investmentCountEl) investmentCountEl.textContent = investments.length;
    
    const eventCountEl = document.getElementById('event-count');
    if (eventCountEl) eventCountEl.textContent = events.length;
    
    const yearsInput = document.getElementById('projection-years-input');
    const years = yearsInput ? yearsInput.value : '30';
    
    const yearsLabel = document.getElementById('projection-years-label');
    if (yearsLabel) yearsLabel.textContent = `In ${years} Years`;
    
    updateAllocationChart();
    updateProjectedNetWorth();
    updateOnboardingGuide();
}

function updateProjectedNetWorth() {
    const el = document.getElementById('projected-net-worth-value');
    const labelEl = document.getElementById('projection-years-label');
    if (!el) return;
    
    if (projections && projections.length > 0) {
        const last = projections[projections.length - 1];
        el.textContent = `$${formatNumber(last.totalNetWorth)}`;
        
        if (labelEl) {
            const years = projections.length - 1;
            const inflationNote = last.isInflationAdjusted ? " (Today's Value)" : "";
            labelEl.textContent = `In ${years} Years${inflationNote}`;
        }
    } else {
        el.textContent = '$0';
    }
}

function updateAllocationChart() {
    const ctx = document.getElementById('allocation-chart');
    if (!ctx) return;

    if (charts.allocation) {
        charts.allocation.destroy();
    }

    const validInvestments = investments.filter(inv => inv.amount > 0 && inv.type !== 'Debt');
    
    if (validInvestments.length === 0) {
        ctx.style.display = 'none';
        return;
    }

    ctx.style.display = 'block';
    const colors = generateInvestmentColors(validInvestments.length);
    const isDarkMode = true;

    charts.allocation = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: validInvestments.map(inv => inv.name),
            datasets: [{
                data: validInvestments.map(inv => inv.amount),
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const investment = validInvestments[index];
                    if (investment) editInvestment(investment.id);
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        padding: 15,
                        usePointStyle: true,
                        font: { family: 'Inter', weight: 500, size: 11 }
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                    titleColor: isDarkMode ? '#f8fafc' : '#1e293b',
                    bodyColor: isDarkMode ? '#94a3b8' : '#64748b',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percent = ((context.raw / total) * 100).toFixed(1);
                            return ` ${context.label}: $${formatNumber(context.raw)} (${percent}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Projection Charts
function updateProjectionCharts() {
    if (projections.length === 0) return;

    updateNetWorthChart();
    updateAllocationTimelineChart();
}

function saveBaseline() {
    if (projections.length === 0) {
        showToast('Run a projection first to set a baseline.', 'error');
        return;
    }
    
    baselineProjections = JSON.parse(JSON.stringify(projections));
    baselineInvestments = JSON.parse(JSON.stringify(investments));
    baselineEvents = JSON.parse(JSON.stringify(events));
    baselineGoals = JSON.parse(JSON.stringify(goals));
    
    // Update UI
    const controls = document.getElementById('scenario-controls');
    const btn = document.getElementById('save-baseline-btn');
    if (controls) controls.style.display = 'flex';
    if (btn) btn.style.display = 'none';
    
    showToast('Baseline saved. Modify your data to see the comparison.', 'success');
    updateNetWorthChart();
}

function resetToBaseline() {
    if (!baselineInvestments) {
        showToast('No baseline data to reset to.', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to reset all investments and events to the baseline state? This will overwrite your current changes.')) {
        investments = JSON.parse(JSON.stringify(baselineInvestments));
        events = JSON.parse(JSON.stringify(baselineEvents));
        goals = JSON.parse(JSON.stringify(baselineGoals || []));
        
        // Re-render and run
        renderInvestments();
        renderEvents();
        renderGoals();
        runProjection();
        
        // Hide baseline comparison UI since we are now at the baseline state
        baselineProjections = null;
        baselineInvestments = null;
        baselineEvents = null;
        baselineGoals = null;
        
        const controls = document.getElementById('scenario-controls');
        const btn = document.getElementById('save-baseline-btn');
        if (controls) controls.style.display = 'none';
        if (btn) btn.style.display = 'inline-flex';
        
        updateNetWorthChart();
        saveData();
        
        showToast('Reset to baseline state.', 'success');
    }
}

function clearBaseline() {
    // This is called by "Set this as my new baseline"
    baselineProjections = null;
    baselineInvestments = null;
    baselineEvents = null;
    baselineGoals = null;
    
    // Update UI
    const controls = document.getElementById('scenario-controls');
    const btn = document.getElementById('save-baseline-btn');
    if (controls) controls.style.display = 'none';
    if (btn) btn.style.display = 'inline-flex';
    
    showToast('Changes committed as new baseline reference.', 'success');
    updateNetWorthChart();
    saveData();
}

function updateNetWorthChart() {
    const ctx = document.getElementById('net-worth-chart');
    if (!ctx) return;

    if (charts.netWorth) {
        charts.netWorth.destroy();
    }

    const isDarkMode = true;
    let datasets = [];

    // Pre-calculate colors based on original investments order to keep them consistent
    const originalColors = generateInvestmentColors(investments.length);
    const colorMap = {};
    investments.forEach((inv, idx) => {
        colorMap[inv.id] = originalColors[idx];
    });

    const assets = investments.filter(inv => inv.type !== 'Debt');
    const debts = investments.filter(inv => inv.type === 'Debt');

    if (investments.length > 0) {
        // 1. Stack Assets from 0 UP
        let cumulativeAssets = projections.map(() => 0);
        assets.forEach((inv, idx) => {
            const color = colorMap[inv.id] || '#6366f1';
            const data = projections.map((p, pIdx) => {
                const balance = p.balances[inv.id] || 0;
                cumulativeAssets[pIdx] += balance;
                return cumulativeAssets[pIdx];
            });

            datasets.push({
                label: inv.name,
                data: data,
                backgroundColor: color + '40',
                borderColor: color,
                borderWidth: 2,
                fill: idx === 0 ? 'origin' : '-1',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                order: 10 + idx, // Drawn before the Net Worth line
            });
        });

        // 2. Stack Debts from 0 DOWN
        let cumulativeDebts = projections.map(() => 0);
        debts.forEach((inv, idx) => {
            const color = colorMap[inv.id] || '#ef4444';
            const data = projections.map((p, pIdx) => {
                const balance = p.balances[inv.id] || 0; // Already negative
                cumulativeDebts[pIdx] += balance;
                return cumulativeDebts[pIdx];
            });

            datasets.push({
                label: inv.name,
                data: data,
                backgroundColor: color + '40',
                borderColor: color,
                borderWidth: 2,
                fill: idx === 0 ? 'origin' : '-1',
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                order: 30 + idx, // Drawn before the Net Worth line
            });
        });
    } else {
        // Virtual balance fallback
        datasets.push({
            label: 'Net Worth',
            data: projections.map(p => p.balances['virtual'] || 0),
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: '#6366f1',
            borderWidth: 3,
            fill: 'origin',
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#6366f1',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2,
            order: 10
        });
    }

    // Add Total Net Worth Line (Distinct solid line on top of volumes)
    datasets.push({
        label: 'Total Net Worth',
        data: projections.map(p => p.totalNetWorth),
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 41, 59, 0.9)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: isDarkMode ? '#fff' : '#1e293b',
        pointHoverBorderColor: isDarkMode ? '#1e293b' : '#fff',
        pointHoverBorderWidth: 2,
        order: 100, // On top of all volumes
    });

    // Add Baseline (non-stacked, just a line)
    if (baselineProjections) {
        datasets.push({
            label: 'Baseline Net Worth',
            data: baselineProjections.map(p => p.totalNetWorth),
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
            borderWidth: 3,
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            order: 5, // Below volumes but above origin-0 line
        });
    }

    // Add Goal markers
    if (goals.length > 0) {
        const goalData = projections.map(p => {
            const yearGoals = goals.filter(g => g.year === p.year);
            return yearGoals.length > 0 ? p.totalNetWorth : null;
        });

        if (goalData.some(v => v !== null)) {
            datasets.push({
                label: 'Goals',
                data: goalData,
                backgroundColor: '#f59e0b',
                borderColor: '#fff',
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointStyle: 'star',
                showLine: false,
                order: 110, // Above Net Worth line
            });
        }
    }

    // Add Milestone markers
    const milestoneData = projections.map(p => p.milestones.length > 0 ? p.totalNetWorth : null);
    if (milestoneData.some(v => v !== null)) {
        datasets.push({
            label: 'Milestones',
            data: milestoneData,
            backgroundColor: '#10b981',
            borderColor: '#fff',
            borderWidth: 2,
            pointRadius: 7,
            pointHoverRadius: 9,
            pointStyle: 'rectRot',
            showLine: false,
            order: 120, // Above everything
        });
    }

    charts.netWorth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: projections.map(p => p.year),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { left: 0, right: 0, top: 10, bottom: 0 }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const datasetIndex = elements[0].datasetIndex;
                    const dataset = datasets[datasetIndex];
                    if (dataset && !['Baseline Net Worth', 'Goals', 'Milestones'].includes(dataset.label)) {
                        const investment = investments.find(inv => inv.name === dataset.label);
                        if (investment) editInvestment(investment.id);
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: {
                    display: investments.length > 0,
                    position: 'bottom',
                    labels: {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        padding: 15,
                        usePointStyle: true,
                        font: { family: 'Inter', weight: 500, size: 11 },
                        filter: (item) => !['Goals', 'Milestones'].includes(item.text)
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                    titleColor: isDarkMode ? '#f8fafc' : '#1e293b',
                    bodyColor: isDarkMode ? '#94a3b8' : '#64748b',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 4,
                    usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Goals') {
                                const year = context.label;
                                const yearGoals = goals.filter(g => g.year == year);
                                return yearGoals.map(g => ` Goal: ${g.name} ($${formatNumber(g.amount)})`).join('\n');
                            }
                            if (context.dataset.label === 'Milestones') {
                                const year = parseInt(context.label);
                                const yearData = projections.find(p => p.year === year);
                                if (yearData && yearData.milestones.length > 0) {
                                    return yearData.milestones.map(m => ` Milestone: ${m}`).join('\n');
                                }
                            }
                            
                            // For cumulative volume chart, we show individual asset balance
                            const inv = investments.find(i => i.name === context.dataset.label);
                            if (inv) {
                                const year = parseInt(context.label);
                                const yearData = projections.find(p => p.year === year);
                                const balance = yearData ? (yearData.balances[inv.id] || 0) : context.parsed.y;
                                return ` ${context.dataset.label}: $${formatNumber(balance)}`;
                            }
                            
                            return ` ${context.dataset.label}: $${formatNumber(context.parsed.y)}`;
                        },
                        footer: function(tooltipItems) {
                            const year = parseInt(tooltipItems[0].label);
                            const yearData = projections.find(p => p.year === year);
                            if (!yearData) return '';

                            let baselineValue = null;
                            const baselineItem = tooltipItems.find(i => i.dataset.label === 'Baseline Net Worth');
                            if (baselineItem) baselineValue = baselineItem.parsed.y;
                            
                            let footer = `\nTotal Net Worth: $${formatNumber(yearData.totalNetWorth)}`;
                            if (baselineValue !== null) {
                                const diff = yearData.totalNetWorth - baselineValue;
                                const diffStr = diff >= 0 ? `+$${formatNumber(diff)}` : `-$${formatNumber(Math.abs(diff))}`;
                                footer += `\nvs Baseline: ${diffStr}`;
                            }
                            
                            const adjustInflation = document.getElementById('adjust-inflation').checked;
                            if (adjustInflation) {
                                footer += `\n(Adjusted for Inflation)`;
                            }
                            
                            return footer;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        font: { family: 'Inter', weight: 500 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 10
                    }
                },
                y: {
                    stacked: false, // Switching to cumulative fill approach for better debt visualization
                    beginAtZero: false,
                    grid: {
                        color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        font: { family: 'Inter', weight: 500 },
                        callback: value => '$' + formatNumber(value),
                        maxTicksLimit: 8
                    }
                }
            }
        }
    });
}

function updateAllocationTimelineChart() {
    const ctx = document.getElementById('allocation-timeline-chart');
    if (!ctx) return;

    if (charts.allocationTimeline) {
        charts.allocationTimeline.destroy();
    }

    const colors = generateInvestmentColors(investments.length);
    const datasets = investments.map((inv, idx) => ({
        label: inv.name,
        data: projections.map(p => p.balances[inv.id] || 0),
        backgroundColor: colors[idx],
        borderColor: colors[idx],
        borderWidth: 0,
        borderRadius: 4
    }));

    const isDarkMode = true;
    
    charts.allocationTimeline = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: projections.map(p => p.year),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const datasetIndex = elements[0].datasetIndex;
                    const investment = investments[datasetIndex];
                    if (investment) editInvestment(investment.id);
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        padding: 20,
                        usePointStyle: true,
                        font: { family: 'Inter', weight: 500 }
                    }
                },
                tooltip: {
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                    titleColor: isDarkMode ? '#f8fafc' : '#1e293b',
                    bodyColor: isDarkMode ? '#94a3b8' : '#64748b',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: $${formatNumber(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        font: { family: 'Inter', weight: 500 }
                    }
                },
                y: {
                    stacked: true,
                    grid: {
                        color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: isDarkMode ? '#94a3b8' : '#64748b',
                        font: { family: 'Inter', weight: 500 },
                        callback: value => '$' + formatNumber(value)
                    }
                }
            }
        }
    });
}

function updateProjectionTable() {
    // Always fully rebuild the header row
    const headerRow = document.getElementById('projection-table-header');
    if (headerRow) {
        // Remove all children
        while (headerRow.firstChild) {
            headerRow.removeChild(headerRow.firstChild);
        }
        // Add static headers
        const staticHeaders = ['Year', 'Total Net Worth', 'Growth', 'Events'];
        staticHeaders.forEach(label => {
            const th = document.createElement('th');
            th.textContent = label;
            th.style.display = '';
            th.style.color = 'var(--text-primary)';
            th.style.fontWeight = '700';
            th.style.backgroundColor = 'var(--bg-secondary)';
            th.style.padding = '16px 20px';
            th.style.textAlign = 'left';
            th.style.borderBottom = '1px solid var(--table-border)';
            th.style.fontSize = '14px';
            th.style.letterSpacing = '0.025em';
            headerRow.appendChild(th);
        });
        // Add investment headers if any
        if (investments.length > 0) {
            investments.forEach(investment => {
                const th = document.createElement('th');
                th.textContent = investment.name;
                th.title = `${investment.name} Balance`;
                th.style.display = '';
                th.style.color = 'var(--text-primary)';
                th.style.fontWeight = '700';
                th.style.backgroundColor = 'var(--bg-secondary)';
                th.style.padding = '16px 20px';
                th.style.textAlign = 'left';
                th.style.borderBottom = '1px solid var(--table-border)';
                th.style.fontSize = '14px';
                th.style.letterSpacing = '0.025em';
                headerRow.appendChild(th);
            });
        } else {
            // Add a column for Virtual Balance if no investments
            const th = document.createElement('th');
            th.textContent = 'Virtual Balance';
            th.title = 'Virtual Balance';
            th.style.display = '';
            th.style.color = 'var(--text-primary)';
            th.style.fontWeight = '700';
            th.style.backgroundColor = 'var(--bg-secondary)';
            th.style.padding = '16px 20px';
            th.style.textAlign = 'left';
            th.style.borderBottom = '1px solid var(--table-border)';
            th.style.fontSize = '14px';
            th.style.letterSpacing = '0.025em';
            headerRow.appendChild(th);
        }
    }

    const tbody = document.getElementById('projection-table-body');
    tbody.innerHTML = '';

    // Add initial row with starting values
    const currentYear = new Date().getFullYear();
    let initialTotalNetWorth, initialRowHTML;
    
    // Use projection[0] for initial values if it exists, otherwise fall back to current
    const initialData = (projections && projections.length > 0) ? projections[0] : null;
    
    if (investments.length > 0) {
        initialTotalNetWorth = initialData ? (initialData.totalNetWorth * (initialData.isInflationAdjusted ? 1 : 1)) : getCurrentNetWorth();
        initialRowHTML = `
            <td>${currentYear} (Initial)</td>
            <td>$${formatNumber(initialTotalNetWorth)}</td>
            <td>$0</td>
            <td>Initial Values</td>
        `;
        // Investment balance columns - use initial amounts
        investments.forEach(investment => {
            const balance = initialData ? (initialData.balances[investment.id] || 0) : (investment.type === 'Debt' ? -investment.amount : investment.amount);
            initialRowHTML += `<td>$${formatNumber(balance)}</td>`;
        });
    } else {
        // Use virtual balance for initial row
        initialTotalNetWorth = initialData ? initialData.totalNetWorth : 0;
        initialRowHTML = `
            <td>${currentYear} (Initial)</td>
            <td>$${formatNumber(initialTotalNetWorth)}</td>
            <td>$0</td>
            <td>Initial Values</td>
            <td>$${formatNumber(initialTotalNetWorth)}</td>
        `;
    }
    const initialRow = document.createElement('tr');
    initialRow.className = 'clickable-row initial-row';
    initialRow.onclick = () => showYearDetails(0);
    initialRow.innerHTML = initialRowHTML;
    tbody.appendChild(initialRow);

    // Track previous year's net worth for calculating year-over-year change
    let previousNetWorth = initialTotalNetWorth;

    projections.forEach((projection, idx) => {
        // Skip the first projection entry (Year 0) as it is already shown in the Initial row
        if (idx === 0) return;
        
        const row = document.createElement('tr');
        row.className = 'clickable-row';
        row.onclick = () => showYearDetails(idx);
        
        // Calculate year-over-year change in net worth
        const netWorthChange = projection.totalNetWorth - previousNetWorth;
        let growthDisplay = '';
        if (netWorthChange > 0) {
            growthDisplay = `<span style="color: #27ae60;">+$${formatNumber(netWorthChange)}</span>`;
        } else if (netWorthChange < 0) {
            growthDisplay = `<span style="color: #e74c3c;">$${formatNumber(netWorthChange)}</span>`;
        } else {
            growthDisplay = '$0';
        }
        
        // Update previous net worth for next iteration
        previousNetWorth = projection.totalNetWorth;
        
        // Base columns
        let rowHTML = `
            <td>${projection.year}</td>
            <td>$${formatNumber(projection.totalNetWorth)}</td>
            <td>${growthDisplay}</td>
            <td>${projection.events.join(', ') || 'None'}</td>
        `;
        if (investments.length > 0) {
            // Investment balance columns - use the final balances after growth
            investments.forEach(investment => {
                const balance = projection.balances[investment.id] || 0;
                rowHTML += `<td>$${formatNumber(balance)}</td>`;
            });
        } else {
            // Show virtual balance
            const virtualBalance = projection.balances['virtual'] || 0;
            rowHTML += `<td>$${formatNumber(virtualBalance)}</td>`;
        }
        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });
}

// Utility Functions
function formatNumber(num) {
    // Handle NaN, null, undefined, and invalid numbers
    if (isNaN(num) || num === null || num === undefined || !isFinite(num)) {
        return '0';
    }
    return new Intl.NumberFormat('en-US').format(Math.round(num));
}

function formatDate(dateString) {
    if (!dateString) return '';
    // Use parts to avoid timezone shift for YYYY-MM-DD strings
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return date.toLocaleDateString();
    }
    return new Date(dateString).toLocaleDateString();
}

// Generate unique colors for each investment
function showYearDetails(index) {
    const p = projections[index];
    if (!p) return;
    
    document.getElementById('details-modal-year').textContent = `Year ${p.year} Details`;
    document.getElementById('details-net-worth').textContent = `$${formatNumber(p.totalNetWorth)}`;
    
    // Calculate growth from previous year or initial
    let prevTotal = 0;
    if (index === 0) {
        prevTotal = investments.reduce((sum, inv) => sum + inv.amount, 0);
    } else {
        prevTotal = projections[index-1].totalNetWorth;
    }
    const growth = p.totalNetWorth - prevTotal;
    const growthEl = document.getElementById('details-growth');
    growthEl.textContent = `${growth > 0 ? '+' : ''}$${formatNumber(growth)}`;
    growthEl.className = growth >= 0 ? 'text-success' : 'text-danger';
    
    // Asset Breakdown
    const assetList = document.getElementById('details-asset-list');
    assetList.innerHTML = '';
    
    if (investments.length > 0) {
        investments.forEach(inv => {
            const balance = p.balances[inv.id] || 0;
            const item = document.createElement('div');
            item.className = 'detail-item';
            item.innerHTML = `<span>${inv.name}</span><span class="val">$${formatNumber(balance)}</span>`;
            assetList.appendChild(item);
        });
    } else {
        const item = document.createElement('div');
        item.className = 'detail-item';
        item.innerHTML = `<span>Net Worth</span><span class="val">$${formatNumber(p.balances['virtual'] || 0)}</span>`;
        assetList.appendChild(item);
    }
    
    // Events
    const eventList = document.getElementById('details-event-list');
    eventList.innerHTML = '';
    
    if (p.events.length > 0) {
        p.events.forEach(evt => {
            const item = document.createElement('div');
            item.className = 'detail-item';
            item.innerHTML = `<span>${evt}</span>`;
            eventList.appendChild(item);
        });
    } else {
        eventList.innerHTML = '<p class="empty-state" style="padding: 0.5rem;">No events this year.</p>';
    }
    
    document.getElementById('projection-details-modal').style.display = 'flex';
}

function generateInvestmentColors(count) {
    const baseColors = [
        '#6366f1', '#a855f7', '#3b82f6', '#2dd4bf', '#f43f5e', 
        '#fb923c', '#10b981', '#f59e0b', '#ec4899', '#06b6d4',
        '#8b5cf6', '#64b6ff', '#14b8a6', '#f43f5e', '#a855f7'
    ];
    
    const colors = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

function getInvestmentColor(type) {
    const colors = {
        'Stocks': '#3498db',
        'Bonds': '#2ecc71',
        'Real Estate': '#e74c3c',
        'Cash': '#f39c12',
        'Cryptocurrency': '#f7931a',
        'Mutual Fund/Index Fund': '#9b59b6',
        'Debt': '#e74c3c', // Red for debt
        'Other': '#95a5a6'
    };
    return colors[type] || '#95a5a6';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        
        if (modalId === 'event-modal') {
            document.getElementById('event-form').removeAttribute('data-edit-id');
        }
        if (modalId === 'investment-modal') {
            document.getElementById('investment-form').removeAttribute('data-edit-id');
        }
        
        // Return focus to the element that opened the modal
        const lastActiveElement = document.querySelector('[data-last-focus]');
        if (lastActiveElement) {
            lastActiveElement.focus();
            lastActiveElement.removeAttribute('data-last-focus');
        }
    }
}

function setupCharts() {
    // Initialize charts when the page loads
    updateAllocationChart();
}

// Export Functions
function exportData() {
    const data = {
        investments: investments,
        events: events,
        goals: goals,
        projections: projections,
        baselineProjections: baselineProjections,
        baselineInvestments: baselineInvestments,
        baselineEvents: baselineEvents,
        baselineGoals: baselineGoals,
        exportedAt: new Date().toISOString(),
        version: '1.1'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-projection-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData() {
    document.getElementById('import-file').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.investments && data.events) {
                investments = data.investments;
                events = data.events;
                goals = data.goals || [];
                projections = data.projections || [];
                baselineProjections = data.baselineProjections || null;
                baselineInvestments = data.baselineInvestments || null;
                baselineEvents = data.baselineEvents || null;
                baselineGoals = data.baselineGoals || null;
                
                saveData();
                updateDashboard();
                renderInvestments();
                renderEvents();
                renderGoals();
                updateEventFormOptions();
                
                // Show/hide scenario controls based on imported baseline
                const scenarioControls = document.getElementById('scenario-controls');
                const saveBtn = document.getElementById('save-baseline-btn');
                if (baselineProjections) {
                    if (scenarioControls) scenarioControls.style.display = 'flex';
                    if (saveBtn) saveBtn.style.display = 'none';
                } else {
                    if (scenarioControls) scenarioControls.style.display = 'none';
                    if (saveBtn) saveBtn.style.display = 'inline-flex';
                }
                
                showToast('Data imported successfully!', 'success');
            } else {
                showToast('Invalid data format: Missing investments or events', 'error');
            }
        } catch (error) {
            showToast('Error importing data: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
}

function exportProjectionCSV() {
    if (projections.length === 0) {
        alert('Please run a projection first');
        return;
    }

    let csv = 'Year,Total Net Worth,Investment Returns,Income Sources,Total Growth,Events\n';
    projections.forEach(p => {
        const investmentReturns = p.investmentGrowth || 0;
        const incomeSources = p.income || 0;
        const totalGrowth = p.growth || 0;
        csv += `${p.year},${p.totalNetWorth},${investmentReturns},${incomeSources},${totalGrowth},"${p.events.join('; ')}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projection-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportProjectionExcel() {
    if (projections.length === 0) {
        alert('Please run a projection first');
        return;
    }

    const wb = XLSX.utils.book_new();
    
    // Projection timeline sheet
    const projectionData = projections.map(p => ({
        Year: p.year,
        'Total Net Worth': p.totalNetWorth,
        Growth: p.growth,
        Events: p.events.join('; ')
    }));
    const ws1 = XLSX.utils.json_to_sheet(projectionData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Projection Timeline');

    // Investments sheet
    const investmentData = investments.map(inv => ({
        Name: inv.name,
        Type: inv.type,
        'Initial Amount': inv.amount,
        'Return Rate (%)': inv.returnRate
    }));
    const ws2 = XLSX.utils.json_to_sheet(investmentData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Investments');

    // Events sheet
    const eventData = events.map(evt => ({
        Type: evt.type,
        ...evt
    }));
    const ws3 = XLSX.utils.json_to_sheet(eventData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Events');

    XLSX.writeFile(wb, `finance-projection-${new Date().toISOString().split('T')[0]}.xlsx`);
}

function exportRawData() {
    exportData();
}

// Share functionality
function shareProjection() {
    try {
        // Create shareable data object
        const shareData = {
            investments: investments,
            events: events,
            projections: projections,
            projectionYears: document.getElementById('projection-years-input').value || 30,
            sharedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        // Compress and encode the data
        const jsonString = JSON.stringify(shareData);
        const compressed = btoa(encodeURIComponent(jsonString));
        
        // Create share URL
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${compressed}`;
        
        // Copy to clipboard
        if (navigator.clipboard && window.isSecureContext) {
            // Use modern clipboard API
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('Share link copied to clipboard!', 'success');
            }).catch(() => {
                fallbackCopyToClipboard(shareUrl);
            });
        } else {
            // Fallback for older browsers
            fallbackCopyToClipboard(shareUrl);
        }
    } catch (error) {
        console.error('Error creating share link:', error);
        showToast('Error creating share link. Please try again.', 'error');
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('Share link copied to clipboard!', 'success');
    } catch (error) {
        console.error('Fallback copy failed:', error);
        showToast('Failed to copy link. Please copy manually.', 'error');
    }
    
    document.body.removeChild(textArea);
}

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        'success': 'check-circle',
        'error': 'alert-circle',
        'info': 'info',
        'warning': 'alert-triangle'
    };
    
    const iconName = icons[type] || 'info';
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Trigger animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Load shared data from URL
function loadSharedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareData = urlParams.get('share');
    
    if (shareData) {
        try {
            // Decode and decompress the data
            const jsonString = decodeURIComponent(atob(shareData));
            const data = JSON.parse(jsonString);
            
            // Validate the data structure
            if (data.investments && data.events && data.projectionYears) {
                // Load the shared data
                investments = data.investments || [];
                events = data.events || [];
                projections = data.projections || [];
                
                // Set projection years
                const projectionYearsInput = document.getElementById('projection-years-input');
                if (projectionYearsInput) {
                    projectionYearsInput.value = data.projectionYears;
                }
                
                // Save to localStorage
                saveData();
                
                // Update UI
                updateDashboard();
                renderInvestments();
                renderEvents();
                updateEventFormOptions();
                
                // Update projections if they exist
                if (projections && projections.length > 0) {
                    updateProjectionCharts();
                    updateProjectionTable();
                }
                
                // Show success message
                showToast('Shared projection data loaded successfully!', 'success', 5000);
                
                // Clean up URL
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
                
                return true;
            }
        } catch (error) {
            console.error('Error loading shared data:', error);
            showToast('Error loading shared data. The link may be invalid.', 'error', 5000);
        }
    }
    return false;
}

function quickAddInvestment(defaultType = 'Stocks') {
    // Set flag to indicate this came from dashboard
    document.getElementById('investment-form').setAttribute('data-from-dashboard', 'true');
    // If we're already on the dashboard, just open the modal
    if (document.getElementById('dashboard').classList.contains('active')) {
        showAddInvestmentModal(defaultType);
    } else {
        // Otherwise, switch to investments tab and open the modal
        switchTab('investments');
        setTimeout(() => {
            showAddInvestmentModal(defaultType);
        }, 100); // Small delay to ensure tab switch completes
    }
}

function quickAddEvent() {
    // If we're on the dashboard, open the quick event type modal
    if (document.getElementById('dashboard').classList.contains('active')) {
        document.getElementById('quick-event-type-modal').style.display = 'flex';
        document.getElementById('quick-event-type-modal').setAttribute('aria-hidden', 'false');
        // Focus the first button for accessibility
        setTimeout(() => {
            const firstBtn = document.querySelector('.quick-event-type-buttons .btn');
            if (firstBtn) firstBtn.focus();
        }, 100);
    } else {
        // Otherwise, switch to events tab
        switchTab('events');
    }
}

function quickAddEventType(type) {
    closeModal('quick-event-type-modal');
    // Set flag to indicate this came from dashboard
    document.getElementById('event-form').setAttribute('data-from-dashboard', 'true');
    showAddEventModal(type);
}

function autoRunProjection() {
    // Get the default projection years from the input or use 30
    const projectionYearsInput = document.getElementById('projection-years-input');
    const years = projectionYearsInput ? parseInt(projectionYearsInput.value) || 30 : 30;
    // Always run projection when going to dashboard
    calculateProjection(years);
    updateProjectionCharts();
    updateProjectionTable();
    updateProjectedNetWorth();
}

// Performance optimization: Debounce function
function debounce(func, wait) {
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(projectionTimeout);
            func(...args);
        };
        clearTimeout(projectionTimeout);
        projectionTimeout = setTimeout(later, wait);
    };
}

// Debounced projection function
const debouncedRunProjection = debounce(() => {
    const years = parseInt(document.getElementById('projection-years-input').value) || 30;
    calculateProjection(years);
    updateProjectionCharts();
    updateProjectionTable();
    updateProjectedNetWorth();
    displayPortfolioInsights();
}, 300);

// Mobile-specific features
function setupMobileFeatures() {
    // Add touch gesture support for navigation
    setupTouchGestures();
    
    // Add mobile-specific event listeners
    setupMobileEventListeners();
    
    // Add haptic feedback for important actions
    setupHapticFeedback();
    
    // Optimize for mobile performance
    setupMobileOptimizations();
    setupMobileMenu();
}

function setupMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const toggleBtn = document.getElementById('mobile-menu-toggle-btn');
    const closeBtn = document.getElementById('mobile-sidebar-close');
    const navItems = document.querySelectorAll('.sidebar .nav-item');

    if (!sidebar || !overlay || !toggleBtn || !closeBtn) return;

    const openMenu = () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    };

    const closeMenu = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = ''; // Re-enable background scrolling
    };

    toggleBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Close menu when clicking brand, nav item, or other sidebar buttons on mobile
    const closeTargets = document.querySelectorAll('.sidebar .brand, .sidebar .nav-item, .sidebar .btn-reset, .sidebar .theme-toggle');
    closeTargets.forEach(target => {
        target.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMenu();
            }
        });
    });
}

function setupTouchGestures() {
    let startX = 0;
    let startY = 0;
    let isSwiping = false;
    
    document.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = false;
    });
    
    document.addEventListener('touchmove', function(e) {
        if (!startX || !startY) return;
        
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        
        // Only trigger if horizontal swipe is more significant than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            isSwiping = true;
            e.preventDefault(); // Prevent default scrolling during swipe
        }
    });
    
    document.addEventListener('touchend', function(e) {
        if (!isSwiping) return;
        
        const deltaX = e.changedTouches[0].clientX - startX;
        const navButtons = document.querySelectorAll('.nav-btn');
        const activeButton = document.querySelector('.nav-btn.active');
        const activeIndex = Array.from(navButtons).indexOf(activeButton);
        
        if (deltaX > 50 && activeIndex > 0) {
            // Swipe right - go to previous tab
            switchTab(navButtons[activeIndex - 1].getAttribute('data-tab'));
            provideHapticFeedback();
        } else if (deltaX < -50 && activeIndex < navButtons.length - 1) {
            // Swipe left - go to next tab
            switchTab(navButtons[activeIndex + 1].getAttribute('data-tab'));
            provideHapticFeedback();
        }
        
        startX = 0;
        startY = 0;
        isSwiping = false;
    });
}

function setupMobileEventListeners() {
    // Add double-tap to zoom prevention for charts
    const charts = document.querySelectorAll('canvas');
    charts.forEach(canvas => {
        canvas.addEventListener('touchstart', function(e) {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        });
    });
    
    // Add mobile-friendly modal handling
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('touchmove', function(e) {
            e.stopPropagation();
        });
    });
    
    // Add mobile keyboard handling
    document.addEventListener('focusin', function(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            // Scroll to input on mobile
            setTimeout(() => {
                e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    });
}

function setupHapticFeedback() {
    // Add haptic feedback for important actions
    const hapticButtons = document.querySelectorAll('.btn-primary, .btn-danger, .quick-add-btn');
    hapticButtons.forEach(button => {
        button.addEventListener('click', function() {
            provideHapticFeedback();
        });
    });
}

function provideHapticFeedback() {
    // Provide haptic feedback if supported
    if ('vibrate' in navigator) {
        navigator.vibrate(50);
    }
}

function setupMobileOptimizations() {
    // Optimize chart rendering for mobile
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
        // Reduce chart animation duration on mobile
        Chart.defaults.animation.duration = 500;
        
        // Optimize chart options for mobile
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        document.body.classList.add('mobile-device');
    } else {
        // Standard desktop settings
        Chart.defaults.animation.duration = 1000;
        document.body.classList.remove('mobile-device');
    }
    
    // Handle orientation changes
    // Only add listener if not already added (though it's harmless to re-add if needed)
    if (!window.hasOrientationListener) {
        window.addEventListener('orientationchange', function() {
            setTimeout(() => {
                // Recalculate chart sizes after orientation change
                Object.values(charts).forEach(chart => {
                    if (chart && typeof chart.resize === 'function') {
                        chart.resize();
                    }
                });
            }, 500);
        });
        window.hasOrientationListener = true;
    }
}

// Data validation functions
function validateInvestment(investment) {
    const errors = [];
    const isDebt = investment.type === 'Debt';
    
    if (!investment.name || investment.name.trim().length === 0) {
        errors.push(isDebt ? 'Debt name is required' : 'Investment name is required');
    }
    
    if (investment.amount === undefined || investment.amount === null || isNaN(investment.amount) || investment.amount < 0) {
        errors.push(isDebt ? 'Debt amount must be a non-negative number' : 'Investment amount must be a non-negative number');
    }
    
    // Allow 0 as a valid return rate (interest rate for debt)
    if (investment.returnRate === undefined || investment.returnRate === null || isNaN(investment.returnRate) || investment.returnRate < -100) {
        errors.push(isDebt ? 'Interest rate must be a valid percentage' : 'Return rate must be a valid percentage (minimum -100%)');
    }
    
    if (investment.returnRate > 1000) {
        errors.push('Return rate seems unusually high. Please verify.');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function validateEvent(event) {
    const errors = [];
    
    if (!event.description || event.description.trim().length === 0) {
        errors.push('Event description is required');
    }
    
    if (!event.amount || isNaN(event.amount)) {
        errors.push('Event amount must be a valid number');
    }
    
    if (event.year && (isNaN(event.year) || event.year < 2020 || event.year > 2100)) {
        errors.push('Event year must be between 2020 and 2100');
    }
    
    if (event.type === 'recurring' || event.type === 'recurring-income') {
        if (!event.frequency || !['monthly', 'quarterly', 'yearly'].includes(event.frequency)) {
            errors.push('Recurring events must have a valid frequency');
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

function showValidationErrors(errors) {
    const errorMessage = errors.join('\n• ');
    showToast(`Validation errors:\n• ${errorMessage}`, 'error', 5000);
}

// Financial insights and analytics
function calculatePortfolioInsights() {
    if (!investments || investments.length === 0) {
        return null;
    }
    
    const totalNetWorth = getCurrentNetWorth();
    const totalAssets = investments.filter(inv => inv.type !== 'Debt').reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    
    // For weighted return, we calculate return in dollars and divide by assets to get a reasonable portfolio rate
    const returnInDollars = investments.reduce((sum, inv) => {
        const amount = parseFloat(inv.amount);
        const rate = parseFloat(inv.returnRate) / 100;
        return inv.type === 'Debt' ? sum - (amount * rate) : sum + (amount * rate);
    }, 0);
    
    const weightedReturn = totalAssets > 0 ? (returnInDollars / totalAssets) * 100 : 0;
    
    const riskScore = calculateRiskScore();
    const diversificationScore = calculateDiversificationScore();
    const projectedGrowth = calculateProjectedGrowth();
    
    return {
        totalValue: totalNetWorth, // Net worth for the display
        totalAssets,              // Total assets for percentages
        weightedReturn,
        riskScore,
        diversificationScore,
        projectedGrowth,
        recommendations: generateRecommendations(riskScore, diversificationScore, weightedReturn)
    };
}

function calculateRiskScore() {
    if (!investments || investments.length === 0) return 0;
    
    const riskWeights = {
        'Stocks': 0.8,
        'Bonds': 0.3,
        'Real Estate': 0.6,
        'Cash': 0.1,
        'Cryptocurrency': 0.9,
        'Mutual Fund/Index Fund': 0.5,
        'Other': 0.5
    };
    
    const assets = investments.filter(inv => inv.type !== 'Debt');
    if (assets.length === 0) return 0;

    const totalAssets = assets.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const weightedRisk = assets.reduce((sum, inv) => {
        const riskWeight = riskWeights[inv.type] || 0.5;
        return sum + (parseFloat(inv.amount) * riskWeight);
    }, 0) / totalAssets;
    
    return Math.round(weightedRisk * 100);
}

function calculateDiversificationScore() {
    if (!investments || investments.length === 0) return 0;
    
    const assets = investments.filter(inv => inv.type !== 'Debt');
    if (assets.length === 0) return 0;

    const totalAssets = assets.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const allocationPercentages = assets.map(inv => (parseFloat(inv.amount) / totalAssets) * 100);
    
    // Calculate Herfindahl-Hirschman Index (HHI) for concentration
    const hhi = allocationPercentages.reduce((sum, percentage) => sum + Math.pow(percentage, 2), 0);
    
    // Convert to diversification score (0-100, higher is better)
    const maxHhi = Math.pow(100, 2); // 100% in one investment
    const diversificationScore = Math.max(0, 100 - (hhi / maxHhi) * 100);
    
    return Math.round(diversificationScore);
}

function calculateProjectedGrowth() {
    if (!projections || projections.length === 0) return null;
    
    const currentValue = projections[0]?.totalNetWorth || 0;
    const finalValue = projections[projections.length - 1]?.totalNetWorth || 0;
    
    if (currentValue === 0) return 0;
    
    const totalGrowth = ((finalValue - currentValue) / currentValue) * 100;
    const annualizedGrowth = Math.pow(1 + totalGrowth / 100, 1 / projections.length) - 1;
    
    return {
        totalGrowth: Math.round(totalGrowth * 100) / 100,
        annualizedGrowth: Math.round(annualizedGrowth * 10000) / 100
    };
}

function generateRecommendations(riskScore, diversificationScore, weightedReturn) {
    const recommendations = [];
    
    if (riskScore > 70) {
        recommendations.push('Consider adding more conservative investments like bonds to reduce portfolio risk.');
    }
    
    if (diversificationScore < 50) {
        recommendations.push('Your portfolio could benefit from more diversification across different asset classes.');
    }
    
    if (weightedReturn < 5) {
        recommendations.push('Consider reviewing your investment returns. You might want to explore higher-yielding options.');
    }
    
    if (weightedReturn > 15) {
        recommendations.push('Your expected returns are quite high. Make sure these projections are realistic and sustainable.');
    }
    
    if (recommendations.length === 0) {
        recommendations.push('Your portfolio looks well-balanced! Consider regular rebalancing to maintain your target allocation.');
    }
    
    return recommendations;
}

// Enhanced professional insights
function generateProfessionalInsights(insights) {
    const rules = [];
    const totalValue = insights.totalValue; // Net worth
    const totalAssets = insights.totalAssets; // Assets only
    const weightedReturn = insights.weightedReturn;
    const riskScore = insights.riskScore;
    const diversificationScore = insights.diversificationScore;
    const projectedGrowth = insights.projectedGrowth;
    const investmentsCount = investments.length;
    
    // Categorize investments
    const cash = investments.filter(inv => inv.type === 'Cash').reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const stocks = investments.filter(inv => inv.type === 'Stocks').reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const crypto = investments.filter(inv => inv.type === 'Cryptocurrency').reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const bonds = investments.filter(inv => inv.type === 'Bonds').reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const funds = investments.filter(inv => inv.type === 'Mutual Fund/Index Fund').reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const debt = investments.filter(inv => inv.type === 'Debt').reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    
    const cashPercent = totalAssets > 0 ? (cash / totalAssets) * 100 : 0;
    const stocksPercent = totalAssets > 0 ? (stocks / totalAssets) * 100 : 0;
    const cryptoPercent = totalAssets > 0 ? (crypto / totalAssets) * 100 : 0;
    const bondsPercent = totalAssets > 0 ? (bonds / totalAssets) * 100 : 0;
    const fundsPercent = totalAssets > 0 ? (funds / totalAssets) * 100 : 0;
    
    // 1. Asset class concentration
    if (stocksPercent > 70) rules.push('High concentration in stocks (>70%). Consider diversifying to reduce volatility risk.');
    if (cryptoPercent > 10) rules.push('Cryptocurrency allocation exceeds 10%. This may increase portfolio volatility.');
    if (bondsPercent < 10) rules.push('Low bond allocation (<10%). Consider more bonds for stability, especially as you approach retirement.');
    if (stocksPercent + fundsPercent > 70) rules.push('High concentration in stocks and funds (>70%). Consider diversifying to reduce volatility risk.');
    if (fundsPercent > 50) rules.push('Large allocation to funds (>50%). Ensure underlying holdings are diversified and not overlapping.');
    
    // 2. Debt Analysis
    if (debt > 0) {
        const debtToAssets = totalAssets > 0 ? (debt / totalAssets) * 100 : 0;
        if (debtToAssets > 50) rules.push(`⚠️ High Debt: Your debt is ${debtToAssets.toFixed(1)}% of your assets. High leverage increases financial risk.`);
        
        investments.filter(i => i.type === 'Debt').forEach(d => {
            if (d.returnRate > 7) rules.push(`📉 High Interest Debt: "${d.name}" has a ${d.returnRate}% interest rate. Consider prioritizing its repayment.`);
        });
    }
    
    // 2. Cash drag
    if (cashPercent > 20) rules.push('Cash allocation exceeds 20%. Large cash positions may reduce long-term returns (cash drag).');
    if (cashPercent < 2) rules.push('Very low cash reserves (<2%). Consider maintaining some liquidity for emergencies.');
    
    // 3. Overexposure to high-risk assets
    if (riskScore > 80) rules.push('Portfolio risk score is very high. Consider reducing exposure to high-volatility assets.');
    
    // 4. Under-diversification by number of holdings
    if (investmentsCount < 5) rules.push('Fewer than 5 holdings. Broader diversification is recommended to reduce idiosyncratic risk.');
    
    // 5. Projected liquidity shortfalls
    if (projections && projections.length > 0) {
        const minNetWorth = Math.min(...projections.map(p => p.totalNetWorth));
        if (minNetWorth < 0) rules.push('Projection shows potential liquidity shortfall (negative net worth) in some years. Review cash flows and expenses.');
    }
    
    // 6. Event impact summary
    const monthlyExpenses = events
        .filter(e => e.type === 'recurring')
        .reduce((sum, e) => {
            let mult = 1;
            if (e.frequency === 'monthly') mult = 1;
            else if (e.frequency === 'quarterly') mult = 1/3;
            else if (e.frequency === 'annually') mult = 1/12;
            return sum + (e.amount * mult);
        }, 0);

    if (monthlyExpenses > 0) {
        const monthsOfRunway = cash / monthlyExpenses;
        if (monthsOfRunway < 3) {
            rules.push(`⚠️ Emergency Fund: Your cash covers only ${monthsOfRunway.toFixed(1)} months of expenses. Aim for 6 months.`);
        } else if (monthsOfRunway >= 6) {
            rules.push(`✅ Emergency Fund: Solid! You have ${monthsOfRunway.toFixed(1)} months of runway in cash.`);
        }
    }

    // 7. Goal Realism
    if (goals.length > 0 && projections && projections.length > 0) {
        goals.forEach(goal => {
            const targetYearProjection = projections.find(p => p.year === goal.year);
            if (targetYearProjection) {
                const currentVal = goal.type === 'net-worth' ? targetYearProjection.totalNetWorth : (targetYearProjection.balances[goal.targetAssetId] || 0);
                if (currentVal < goal.amount) {
                    const diff = goal.amount - currentVal;
                    const yearsLeft = goal.year - new Date().getFullYear();
                    const extraMonthly = diff / (yearsLeft * 12);
                    rules.push(`🎯 Goal Gap: Your "${goal.name}" goal is short by $${formatNumber(diff)}. Consider saving an extra $${formatNumber(extraMonthly)}/mo.`);
                } else {
                    rules.push(`🌟 Goal On Track: You are on track to hit your "${goal.name}" goal!`);
                }
            }
        });
    }

    // 9. Milestones Check
    if (projections && projections.length > 0) {
        projections.forEach(p => {
            if (p.milestones && p.milestones.length > 0) {
                p.milestones.forEach(m => {
                    rules.push(`🏆 Milestone reached in ${p.year}: ${m}`);
                });
            }
        });
    }

    // 10. Tax efficiency note (placeholder)
    rules.push('Review tax efficiency of your investments (e.g., asset location, tax-advantaged accounts).');
    
    // 11. Retirement readiness check
    if (totalValue < 100000 && projections && projections.length > 0 && projections[projections.length-1].totalNetWorth < 500000) {
        rules.push('Projected net worth may be insufficient for retirement. Consider increasing savings or adjusting goals.');
    }
    
    // 12. Rebalancing frequency analysis
    const rebalancingEvents = events.filter(e => e.type === 'rebalancing');
    if (rebalancingEvents.length === 0) rules.push('No rebalancing events scheduled. Regular rebalancing helps maintain target allocation and risk.');
    
    // 13. Expense ratio warning (if data available)
    if (investments.some(inv => inv.expenseRatio && inv.expenseRatio > 1)) {
        rules.push('Some investments have high expense ratios (>1%). Consider lower-cost alternatives to improve returns.');
    }
    
    return rules;
}

// Update displayPortfolioInsights to use these rules
function displayPortfolioInsights() {
    const insights = calculatePortfolioInsights();
    if (!insights) return;
    const insightsContainer = document.getElementById('portfolio-insights');
    if (!insightsContainer) return;
    const professionalRules = generateProfessionalInsights(insights);
    insightsContainer.innerHTML = `
        <div class="insights-grid">
            <div class="insight-card">
                <h4><i data-lucide="bar-chart"></i> Portfolio Metrics</h4>
                <div class="metric">
                    <span class="metric-label">Total Value:</span>
                    <span class="metric-value">$${formatNumber(insights.totalValue)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Weighted Return:</span>
                    <span class="metric-value">${insights.weightedReturn.toFixed(2)}%</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Risk Score:</span>
                    <span class="metric-value risk-${insights.riskScore > 70 ? 'high' : insights.riskScore > 40 ? 'medium' : 'low'}">${insights.riskScore}/100</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Diversification:</span>
                    <span class="metric-value">${insights.diversificationScore}/100</span>
                </div>
            </div>
            <div class="insight-card">
                <h4><i data-lucide="lightbulb"></i> Automated Analysis <a href="#" onclick="showDisclaimerModal(); return false;" class="disclaimer-link">(not professional advice)</a></h4>
                <ul class="recommendations-list">
                    ${professionalRules.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    // Refresh icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showDisclaimerModal() {
    document.getElementById('disclaimer-modal').style.display = 'flex';
}

// AI Analysis Functions
function generateFinancialPrompt() {
    const currentNetWorth = getCurrentNetWorth();
    const investmentCount = investments.length;
    const eventCount = events.length;
    
    let prompt = `I need financial analysis and recommendations for my personal finance projection. Here are my current financial details:

CURRENT FINANCIAL SITUATION:
- Current Net Worth: $${formatNumber(currentNetWorth)}
- Number of Investments: ${investmentCount}
- Number of Financial Events: ${eventCount}

INVESTMENTS:`;
    
    if (investments.length > 0) {
        investments.forEach((inv, index) => {
            const isDebt = inv.type === 'Debt';
            prompt += `\n${index + 1}. ${inv.name} (${inv.type})
   - Amount: ${isDebt ? '-' : ''}$${formatNumber(inv.amount)}
   - ${isDebt ? 'Interest' : 'Expected Return'}: ${inv.returnRate}%
   - ${isDebt ? 'Monthly Payment' : 'Return Rate'}: ${isDebt ? '$' + formatNumber(inv.monthlyPayment) : (inv.returnRate || 0) + '%'}`;
        });
    } else {
        prompt += `\nNo investments added yet.`;
    }
    
    prompt += `\n\nFINANCIAL EVENTS:`;
    
    if (events.length > 0) {
        events.forEach((event, index) => {
            prompt += `\n${index + 1}. ${event.type.toUpperCase()}`;
            if (event.description) prompt += ` - ${event.description}`;
            if (event.amount) prompt += ` - $${formatNumber(event.amount)}`;
            if (event.date) prompt += ` - ${event.date}`;
        });
    } else {
        prompt += `\nNo financial events added yet.`;
    }
    
    if (projections && projections.length > 0) {
        const lastProjection = projections[projections.length - 1];
        prompt += `\n\nPROJECTION SUMMARY:
- Projection Period: ${projections.length} years
- Projected Net Worth: $${formatNumber(lastProjection.totalNetWorth)}
- Total Growth: $${formatNumber(lastProjection.totalNetWorth - currentNetWorth)}`;
    }
    
    prompt += `\n\nPlease provide:
1. Analysis of my current financial situation
2. Recommendations for improving my investment strategy
3. Suggestions for optimizing my financial events
4. Risk assessment and diversification advice
5. Specific actionable steps to achieve better financial outcomes
6. Any red flags or areas of concern

Please be specific and provide practical, actionable advice.`;
    
    return prompt;
}

function updateManualPrompt() {
    const prompt = generateFinancialPrompt();
    document.getElementById('manual-prompt').value = prompt;
}

function copyManualPrompt() {
    const textarea = document.getElementById('manual-prompt');
    textarea.select();
    textarea.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        showToast('Analysis prompt copied to clipboard!', 'success', 3000);
    } catch (err) {
        // Fallback for modern browsers
        navigator.clipboard.writeText(textarea.value).then(() => {
            showToast('Analysis prompt copied to clipboard!', 'success', 3000);
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error', 3000);
        });
    }
}

function openChatGPT() {
    const prompt = generateFinancialPrompt();
    const encodedPrompt = encodeURIComponent(prompt);
    const chatGPTUrl = `https://chat.openai.com/?model=gpt-4&q=${encodedPrompt}`;
    
    window.open(chatGPTUrl, '_blank');
    showToast('Opening ChatGPT with your financial data...', 'info', 3000);
}
