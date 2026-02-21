/**
 * Event Listeners and Hub
 */

function setupEventListeners() {
    // Form Submissions
    document.getElementById('investment-form')?.addEventListener('submit', handleInvestmentSubmit);
    document.getElementById('event-form')?.addEventListener('submit', handleEventSubmit);
    document.getElementById('goal-form')?.addEventListener('submit', handleGoalSubmit);

    // Dynamic Updates
    document.getElementById('investment-type')?.addEventListener('change', updateInvestmentDefaults);
    document.getElementById('event-type')?.addEventListener('change', updateEventForm);
    document.getElementById('event-is-recurring')?.addEventListener('change', toggleRecurringFields);
    document.getElementById('goal-category')?.addEventListener('change', handleGoalCategoryChange);
    document.getElementById('adjust-inflation')?.addEventListener('change', toggleInflationInput);
    document.getElementById('projection-years-input')?.addEventListener('input', runProjection);

    // What-If Sliders
    document.getElementById('market-performance-slider')?.addEventListener('input', (e) => {
        marketOffset = parseFloat(e.target.value);
        document.getElementById('market-offset-val').textContent = (marketOffset >= 0 ? '+' : '') + marketOffset + '%';
        debouncedRunProjection();
    });

    document.getElementById('savings-boost-slider')?.addEventListener('input', (e) => {
        savingsBoost = parseFloat(e.target.value);
        document.getElementById('savings-boost-val').textContent = (savingsBoost >= 0 ? '+' : '-') + '$' + formatNumber(Math.abs(savingsBoost));
        debouncedRunProjection();
    });

    document.getElementById('savings-boost-target')?.addEventListener('change', runProjection);

    // Advanced Simulation Forms
    document.getElementById('mc-iterations')?.addEventListener('change', runMonteCarlo);
    document.getElementById('mc-volatility-slider')?.addEventListener('input', (e) => {
        document.getElementById('mc-volatility').value = e.target.value;
        runMonteCarlo();
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.altKey && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); showAddInvestmentModal(); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) { e.preventDefault(); showAddEventModal('expense'); }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); showAddGoalModal(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => closeModal(m.id));
    });
}

const debouncedRunProjection = debounce(() => {
    const years = parseInt(document.getElementById('projection-years-input').value) || 30;
    calculateProjection(years);
    updateProjectionCharts();
    updateProjectionTable();
    updateProjectedNetWorth();
    displayPortfolioInsights();
}, 300);

function debounce(func, wait) {
    return function(...args) {
        clearTimeout(projectionTimeout);
        projectionTimeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Form Submissions
 */
function handleInvestmentSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('investment-form'), editId = form.getAttribute('data-edit-id');
    const existing = editId ? investments.find(inv => inv.id === editId) : null;
    const inv = {
        id: editId || Date.now().toString(), name: document.getElementById('investment-name').value,
        type: document.getElementById('investment-type').value, amount: parseFloat(document.getElementById('investment-amount').value),
        returnRate: parseFloat(document.getElementById('investment-return').value), targetAllocation: existing?.targetAllocation || 0,
        monthlyPayment: document.getElementById('investment-type').value === 'Debt' ? (parseFloat(document.getElementById('debt-payment').value) || 0) : 0,
        fundingSource: document.getElementById('investment-type').value === 'Debt' ? document.getElementById('debt-funding-source').value : null,
        createdAt: existing?.createdAt || new Date().toISOString()
    };
    const val = validateInvestment(inv);
    if (!val.isValid) { showValidationErrors(val.errors); return; }
    if (editId) { const idx = investments.findIndex(i => i.id === editId); if (idx !== -1) investments[idx] = inv; form.removeAttribute('data-edit-id'); }
    else investments.push(inv);
    saveData(); closeModal('investment-modal'); renderInvestments(); updateDashboard(); displayPortfolioInsights(); updateEventFormOptions();
    if (localStorage.getItem('hasRunProjection')) runProjection();
}

function handleEventSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('event-form'), editId = form.getAttribute('data-edit-id');
    const type = document.getElementById('event-type').value, isRec = document.getElementById('event-is-recurring').checked;
    const event = {
        id: editId || Date.now().toString(), type, description: document.getElementById('event-description').value,
        amount: parseFloat(document.getElementById('event-amount').value), amountType: document.getElementById('event-amount-type').value,
        isRecurring: isRec, createdAt: editId ? events.find(ev => ev.id === editId).createdAt : new Date().toISOString()
    };
    if (isRec) { event.frequency = document.getElementById('event-frequency').value; event.startDate = document.getElementById('event-start-date').value; event.endDate = document.getElementById('event-end-date').value; }
    else event.date = document.getElementById('event-date').value;

    if (['transfer', 'expense', 'withdrawal'].includes(type)) event.from = document.getElementById('event-source').value;
    if (['transfer', 'income'].includes(type)) event.to = document.getElementById('event-target').value;
    if (type === 'withdrawal') { const dest = document.getElementById('withdrawal-destination').value; event.to = dest === 'external' ? 'external' : 'cash'; }

    const val = validateEvent(event);
    if (!val.isValid) { showValidationErrors(val.errors); return; }
    if (editId) { const idx = events.findIndex(ev => ev.id === editId); if (idx !== -1) events[idx] = event; }
    else events.push(event);
    saveData(); closeModal('event-modal'); renderEvents(); updateDashboard(); if (localStorage.getItem('hasRunProjection')) runProjection();
}

function handleGoalSubmit(e) {
    e.preventDefault();
    const form = document.getElementById('goal-form'), editId = form.getAttribute('data-edit-id');
    const goal = {
        id: editId || Date.now().toString(), category: document.getElementById('goal-category').value,
        name: document.getElementById('goal-name').value, amount: parseFloat(document.getElementById('goal-amount').value),
        year: parseInt(document.getElementById('goal-year').value), type: document.getElementById('goal-type').value,
        deductOnComplete: document.getElementById('goal-deduct').checked, targetAssetId: document.getElementById('goal-target-asset').value,
        createdAt: editId ? goals.find(g => g.id === editId).createdAt : new Date().toISOString()
    };
    if (editId) { const idx = goals.findIndex(g => g.id === editId); if (idx !== -1) goals[idx] = goal; }
    else goals.push(goal);
    saveData(); closeModal('goal-modal'); renderGoals(); updateDashboard(); if (localStorage.getItem('hasRunProjection')) runProjection();
}
