/**
 * Global State and Data Management
 */

// Global state variables
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

/**
 * Saves current application state to localStorage
 */
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
    
    if (typeof showAutoSaveIndicator === 'function') {
        showAutoSaveIndicator();
    }
}

/**
 * Loads application state from localStorage
 */
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
        
        const adjustInflation = document.getElementById('adjust-inflation');
        const inflationRate = document.getElementById('inflation-rate');
        
        if (data.inflationAdjusted !== undefined && adjustInflation && inflationRate) {
            adjustInflation.checked = data.inflationAdjusted;
            inflationRate.value = data.inflationRate || '2.5';
            if (typeof toggleInflationInput === 'function') {
                toggleInflationInput();
            }
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
    const projectionYearsInput = document.getElementById('projection-years-input');
    if (lastProjection && projectionYearsInput) {
        const parsed = JSON.parse(lastProjection);
        projectionYearsInput.value = parsed.years || 30;
        if (parsed.projections && parsed.projections.length > 0) {
            projections = parsed.projections;
        }
    }
}

/**
 * Resets all application data
 */
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
        
        // Reset UI components
        const scenarioControls = document.getElementById('scenario-controls');
        const saveBaselineBtn = document.getElementById('save-baseline-btn');
        if (scenarioControls) scenarioControls.style.display = 'none';
        if (saveBaselineBtn) saveBaselineBtn.style.display = 'inline-flex';
        
        localStorage.removeItem('financeProjectionData');
        localStorage.removeItem('lastProjection');
        localStorage.removeItem('warning-dismissed');
        localStorage.removeItem('hasRunProjection');
        localStorage.removeItem('financeGoalsData');
        
        // Callback into UI rendering if functions exist
        if (typeof updateDashboard === 'function') updateDashboard();
        if (typeof renderInvestments === 'function') renderInvestments();
        if (typeof renderEvents === 'function') renderEvents();
        if (typeof renderGoals === 'function') renderGoals();
        if (typeof resetWhatIfSliders === 'function') resetWhatIfSliders();
        
        if (typeof showToast === 'function') {
            showToast('All data has been reset.', 'info');
        }
    }
}

/**
 * Sets current projections as a baseline for comparison
 */
function saveBaseline() {
    if (projections.length === 0) {
        if (typeof showToast === 'function') {
            showToast('Run a projection first to set a baseline.', 'error');
        }
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
    
    if (typeof showToast === 'function') {
        showToast('Baseline saved. Modify your data to see the comparison.', 'success');
    }
    
    if (typeof updateNetWorthChart === 'function') {
        updateNetWorthChart();
    }
}

/**
 * Resets the application to the saved baseline state
 */
function resetToBaseline() {
    if (!baselineInvestments) {
        if (typeof showToast === 'function') {
            showToast('No baseline data to reset to.', 'error');
        }
        return;
    }
    
    if (confirm('Are you sure you want to reset to the baseline? This will overwrite your current changes.')) {
        investments = JSON.parse(JSON.stringify(baselineInvestments));
        events = JSON.parse(JSON.stringify(baselineEvents));
        goals = JSON.parse(JSON.stringify(baselineGoals || []));
        
        if (typeof renderInvestments === 'function') renderInvestments();
        if (typeof renderEvents === 'function') renderEvents();
        if (typeof renderGoals === 'function') renderGoals();
        if (typeof runProjection === 'function') runProjection();
        
        if (typeof showToast === 'function') {
            showToast('Restored to baseline.', 'info');
        }
    }
}

/**
 * Clears the saved baseline
 */
function clearBaseline() {
    baselineProjections = null;
    baselineInvestments = null;
    baselineEvents = null;
    baselineGoals = null;
    
    const controls = document.getElementById('scenario-controls');
    const btn = document.getElementById('save-baseline-btn');
    if (controls) controls.style.display = 'none';
    if (btn) btn.style.display = 'inline-flex';
    
    if (typeof showToast === 'function') {
        showToast('Baseline cleared.', 'info');
    }
    
    if (typeof updateNetWorthChart === 'function') {
        updateNetWorthChart();
    }
    saveData();
}
