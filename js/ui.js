/**
 * UI and DOM Management
 */

/**
 * Initializes tooltip functionality
 */
function initTooltips() {
    const tooltip = document.getElementById('global-tooltip');
    if (!tooltip) return;

    if (document.body.hasAttribute('data-tooltips-init')) return;
    document.body.setAttribute('data-tooltips-init', 'true');

    let currentTarget = null;
    let updatePositionRef = null;

    const handleMouseOver = (e) => {
        const target = e.target.closest('[data-tooltip]');
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
                if (rect.top < 100) {
                    tooltip.classList.add('tooltip-bottom');
                    tooltip.style.top = `${rect.bottom}px`;
                } else {
                    tooltip.classList.remove('tooltip-bottom');
                    tooltip.style.top = `${rect.top}px`;
                }
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

/**
 * Onboarding Guide Logic
 */
function disableOnboarding(e) {
    if (e) {
        e.stopPropagation();
        e.preventDefault();
    }
    localStorage.setItem('onboardingDisabled', 'true');
    updateOnboardingGuide();
    showToast('Onboarding guide disabled. You can re-enable it anytime in the Guide tab.', 'info');
}

function enableOnboarding() {
    localStorage.removeItem('onboardingDisabled');
    updateOnboardingGuide();
    showToast('Onboarding guide re-enabled!', 'success');
}

function updateOnboardingGuide() {
    const netWorthCard = document.querySelector('.kpi-card.primary');
    const btnInvestment = document.getElementById('guide-add-investment');
    const btnDebt = document.getElementById('guide-add-debt');
    const yearsControl = document.getElementById('guide-years');
    const eventsCard = document.getElementById('guide-events-card');
    const sampleContainer = document.getElementById('onboarding-sample-container');
    
    const onboardingDisabled = localStorage.getItem('onboardingDisabled') === 'true';
    
    document.querySelectorAll('.onboarding-tip').forEach(tip => tip.remove());
    netWorthCard?.classList.remove('guide-glow');
    btnInvestment?.classList.remove('guide-pulse');
    btnDebt?.classList.remove('guide-pulse');
    yearsControl?.classList.remove('guide-glow');
    eventsCard?.classList.remove('guide-glow');
    
    if (onboardingDisabled) {
        if (sampleContainer) sampleContainer.style.display = 'none';
        return;
    }
    
    const addTip = (parent, text) => {
        if (!parent) return;
        const tip = document.createElement('div');
        tip.className = 'onboarding-tip';
        tip.innerHTML = `<span>${text}</span><button class="tip-close" onclick="disableOnboarding(event)" title="Hide all onboarding tips">×</button>`;
        parent.appendChild(tip);
    };

    if (investments.length === 0) {
        netWorthCard?.classList.add('guide-glow');
        btnInvestment?.classList.add('guide-pulse');
        btnDebt?.classList.add('guide-pulse');
        addTip(netWorthCard, 'Step 1: Add Assets or Debt');
        if (sampleContainer) sampleContainer.style.display = 'block';
        return;
    } else if (sampleContainer) {
        sampleContainer.style.display = 'none';
    }

    if (events.length === 0) {
        eventsCard?.classList.add('guide-glow');
        const incomeBtn = eventsCard?.querySelector('.kpi-btn');
        incomeBtn?.classList.add('guide-pulse');
        addTip(eventsCard, 'Step 2: Add Income or Expenses');
        return;
    }

    const hasRunProjection = localStorage.getItem('hasRunProjection');
    if (!hasRunProjection) {
        yearsControl?.classList.add('guide-glow');
        addTip(yearsControl, 'Step 3: Set Timeframe');
        return;
    }
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { 'success': 'check-circle', 'error': 'alert-circle', 'info': 'info', 'warning': 'alert-triangle' };
    const iconName = icons[type] || 'info';
    toast.innerHTML = `<i data-lucide="${iconName}"></i><span>${message}</span>`;
    container.appendChild(toast);
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (container.contains(toast)) container.removeChild(toast); }, 300);
    }, duration);
}

function showAutoSaveIndicator() {
    showToast('All changes autosaved', 'success', 2000);
}

/**
 * Navigation and Tab Management
 */
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(link => {
        link.classList.toggle('active', link.getAttribute('onclick')?.includes(tabId));
    });
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        window.scrollTo(0, 0);
    }
    
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        const titles = {
            'dashboard': 'Financial Dashboard',
            'investments': 'Add Assets/Debt',
            'events': 'Add Income/Events',
            'goals': 'Financial Goals',
            'export': 'Export & Share',
            'guide': 'User Guide',
            'ai-analysis': 'AI Financial Analysis',
            'advanced': 'Advanced Simulations'
        };
        pageTitle.textContent = titles[tabId] || 'Financial Planner';
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    if (typeof updateCharts === 'function') updateCharts();
}

/**
 * Modal Handling
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
    }
}

/**
 * Form helpers
 */
function toggleInflationInput() {
    const adjust = document.getElementById('adjust-inflation').checked;
    const group = document.getElementById('inflation-rate-group');
    if (group) group.style.display = adjust ? 'block' : 'none';
    if (typeof runProjection === 'function') runProjection();
}

/**
 * Investment/Asset Management UI
 */
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

        if (debtFields) debtFields.style.display = isDebt ? 'block' : 'none';
        if (isDebt) populateDebtFundingSources();
        
        if (amountLabel) amountLabel.textContent = isDebt ? 'Total Debt Amount ($)' : 'Initial Amount ($)';
        if (returnLabel) returnLabel.textContent = isDebt ? 'Interest Rate (%)' : 'Return Rate (%)';
    }
}

function populateDebtFundingSources() {
    const fundingSourceSelect = document.getElementById('debt-funding-source');
    if (!fundingSourceSelect) return;

    const currentValue = fundingSourceSelect.value;
    const form = document.getElementById('investment-form');
    const editingId = form.getAttribute('data-edit-id');

    fundingSourceSelect.innerHTML = `
        <option value="proportional">Proportional (All Assets)</option>
        <option value="virtual">Virtual Balance (Income)</option>
    `;

    investments.forEach(inv => {
        if (inv.type !== 'Debt' && inv.id !== editingId) {
            const option = document.createElement('option');
            option.value = inv.id;
            option.textContent = inv.name;
            fundingSourceSelect.appendChild(option);
        }
    });

    if (currentValue && fundingSourceSelect.querySelector(`option[value="${currentValue}"]`)) {
        fundingSourceSelect.value = currentValue;
    }
}

function editInvestment(id) {
    const investment = investments.find(inv => inv.id === id);
    if (!investment) return;
    document.getElementById('investment-modal').style.display = 'flex';
    document.getElementById('investment-name').value = investment.name;
    document.getElementById('investment-type').value = investment.type;
    document.getElementById('investment-amount').value = investment.amount;
    document.getElementById('investment-return').value = investment.returnRate;
    
    const amountSlider = document.getElementById('investment-amount-slider');
    const returnSlider = document.getElementById('investment-return-slider');
    if (amountSlider) amountSlider.value = investment.amount;
    if (returnSlider) returnSlider.value = investment.returnRate;

    const isDebt = investment.type === 'Debt';
    const debtFields = document.getElementById('debt-fields');
    if (debtFields) debtFields.style.display = isDebt ? 'block' : 'none';
    if (isDebt) {
        populateDebtFundingSources();
        document.getElementById('debt-payment').value = investment.monthlyPayment || 0;
        document.getElementById('debt-funding-source').value = investment.fundingSource || 'proportional';
        document.getElementById('investment-amount-label').textContent = 'Total Debt Amount ($)';
        document.getElementById('investment-return-label').textContent = 'Interest Rate (%)';
        const debtSlider = document.getElementById('debt-payment-slider');
        if (debtSlider) debtSlider.value = investment.monthlyPayment || 0;
    } else {
        document.getElementById('investment-amount-label').textContent = 'Initial Amount ($)';
        document.getElementById('investment-return-label').textContent = 'Return Rate (%)';
    }

    document.getElementById('investment-form').setAttribute('data-edit-id', id);
    const submitBtn = document.querySelector('#investment-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Update Asset/Debt';
    const deleteBtn = document.getElementById('delete-investment-btn');
    if (deleteBtn) deleteBtn.style.display = 'block';
}

function renderInvestments() {
    const container = document.getElementById('investments-list');
    if (!container) return;
    container.innerHTML = '';

    if (investments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i data-lucide="briefcase"></i></div>
                <div class="empty-state-content">
                    <h3>No Assets Yet</h3>
                    <p>Add your first investment, bank account, or property to start your projection.</p>
                    <button class="btn btn-primary" onclick="showAddInvestmentModal()" style="margin-top: 1rem;">
                        <i data-lucide="plus"></i><span>Add Asset</span>
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
        const rateLabel = isDebt ? 'Interest' : 'Return';
        const amountDisplay = isDebt ? `-$${formatNumber(investment.amount)}` : `$${formatNumber(investment.amount)}`;
        const paymentInfo = isDebt ? ` • $${formatNumber(investment.monthlyPayment)}/mo` : '';
        const icon = isDebt ? 'landmark' : (investment.type === 'Real Estate' ? 'home' : (investment.type === 'Cash' ? 'banknote' : 'trending-up'));

        item.innerHTML = `
            <div class="event-type-icon ${isDebt ? 'expense' : 'income'}"><i data-lucide="${icon}"></i></div>
            <div class="event-content">
                <div class="event-title">${investment.name} ${isDebt ? '<span class="badge debt">Debt</span>' : ''}</div>
                <div class="event-details">${investment.type} • ${investment.returnRate}% ${rateLabel}${paymentInfo}</div>
            </div>
            <div class="investment-amount ${isDebt ? 'text-danger' : ''}" style="margin-right: 1rem; font-weight: 700;">${amountDisplay}</div>
            <div class="event-actions">
                <button class="btn btn-outline btn-sm" onclick="editInvestment('${investment.id}')"><i data-lucide="edit-2"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteInvestment('${investment.id}')"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        container.appendChild(item);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateOnboardingGuide();
}

/**
 * Event Management UI
 */
function updateEventForm() {
    const type = document.getElementById('event-type').value;
    const title = document.getElementById('event-modal-title');
    const isRecurring = document.getElementById('event-is-recurring').checked;
    
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

    const titles = { 'income': 'Financial Income', 'expense': 'Financial Expense', 'transfer': 'Financial Transfer', 'withdrawal': 'Financial Withdrawal', 'rebalancing': 'Portfolio Rebalancing' };
    if (title) title.textContent = (isRecurring ? 'Recurring ' : 'One-Time ') + titles[type];

    const sourceLabel = document.getElementById('source-label');
    const targetLabel = document.getElementById('target-label');
    
    switch (type) {
        case 'income':
            document.getElementById('source-group').style.display = 'none';
            if (targetLabel) targetLabel.textContent = 'Deposit To (Optional)';
            break;
        case 'expense':
            document.getElementById('target-group').style.display = 'none';
            if (sourceLabel) sourceLabel.textContent = 'Pay From (Optional)';
            break;
        case 'transfer':
            if (sourceLabel) sourceLabel.textContent = 'From Account';
            if (targetLabel) targetLabel.textContent = 'To Account';
            break;
        case 'withdrawal':
            document.getElementById('target-group').style.display = 'none';
            document.getElementById('destination-group').style.display = 'block';
            if (sourceLabel) sourceLabel.textContent = 'Withdraw From';
            break;
        case 'rebalancing':
            document.getElementById('common-fields').style.display = 'none';
            document.getElementById('rebalancing-fields').style.display = 'block';
            document.getElementById('recurring-toggle-group').style.display = 'none'; 
            if (title) title.textContent = 'Portfolio Rebalancing';
            if (typeof renderRebalancingPreview === 'function') renderRebalancingPreview();
            break;
    }
}

function editEvent(id) {
    const event = events.find(evt => evt.id === id);
    if (!event) return;
    
    document.getElementById('event-modal').style.display = 'flex';
    document.getElementById('event-form').reset();
    document.getElementById('event-type').value = event.type;
    document.getElementById('event-is-recurring').checked = !!event.isRecurring;
    
    updateEventForm();
    updateEventFormOptions();
    document.getElementById('event-form').setAttribute('data-edit-id', id);
    
    const submitBtn = document.querySelector('#event-form button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Update Event';
    
    document.getElementById('event-description').value = event.description || '';
    document.getElementById('event-amount').value = event.amount || 0;
    document.getElementById('event-amount-type').value = event.amountType || 'fixed';
    
    const amountSlider = document.getElementById('event-amount-slider');
    if (amountSlider) amountSlider.value = event.amount || 0;

    if (event.isRecurring) {
        document.getElementById('event-frequency').value = event.frequency || 'annually';
        document.getElementById('event-start-date').value = event.startDate || '';
        document.getElementById('event-end-date').value = event.endDate || '';
    } else {
        document.getElementById('event-date').value = event.date || '';
    }

    const sourceSelect = document.getElementById('event-source');
    const targetSelect = document.getElementById('event-target');
    if (sourceSelect) sourceSelect.value = event.from || '';
    if (targetSelect) targetSelect.value = event.to || '';

    if (event.type === 'withdrawal') {
        const destSelect = document.getElementById('withdrawal-destination');
        if (destSelect) destSelect.value = (event.to === 'external') ? 'external' : 'cash';
    }

    if (typeof handleValueTypeChange === 'function') handleValueTypeChange('unified', true);
}

function renderEvents() {
    const container = document.getElementById('events-list');
    if (!container) return;
    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i data-lucide="calendar"></i></div>
                <div class="empty-state-content">
                    <h3>No Events Scheduled</h3>
                    <p>Model future income, expenses, or transfers to see their impact on your wealth.</p>
                    <button class="btn btn-primary" onclick="showAddEventModal('income')" style="margin-top: 1rem;">
                        <i data-lucide="plus"></i><span>Add Event</span>
                    </button>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    const sortedEvents = [...events].sort((a, b) => {
        const dateA = a.isRecurring ? a.startDate : a.date;
        const dateB = b.isRecurring ? b.startDate : b.date;
        return new Date(dateA) - new Date(dateB);
    });

    sortedEvents.forEach(event => {
        if (event.type === 'rebalancing') return;
        const item = document.createElement('div');
        item.className = 'event-item';
        const isRec = !!event.isRecurring;
        const freqLabel = isRec ? ` (${event.frequency})` : '';
        let title, details, icon, typeClass;

        switch (event.type) {
            case 'transfer':
                const fromInv = investments.find(inv => inv.id === event.from);
                const toInv = investments.find(inv => inv.id === event.to);
                title = `Transfer: $${formatNumber(event.amount)}${freqLabel}`;
                details = `From ${fromInv?.name || 'General'} to ${toInv?.name || 'General'}`;
                icon = 'repeat';
                typeClass = 'transfer';
                break;
            case 'withdrawal':
                const withdrawFrom = investments.find(inv => inv.id === event.from);
                const withdrawalValue = event.amountType === 'percent' ? `${event.amount}%` : `$${formatNumber(event.amount)}`;
                title = `Withdrawal: ${withdrawalValue}${freqLabel}`;
                details = `From ${withdrawFrom?.name || 'General'} to ${event.to === 'external' ? 'External' : 'Cash Account'}`;
                icon = event.to === 'external' ? 'external-link' : 'wallet';
                typeClass = 'withdrawal';
                break;
            case 'expense':
                title = `${isRec ? 'Recurring ' : ''}Expense: ${event.description || 'Untitled'}`;
                details = `$${formatNumber(event.amount)} ${isRec ? event.frequency : 'on ' + formatDate(event.date)}`;
                icon = 'trending-down';
                typeClass = 'expense';
                break;
            case 'income':
                title = `${isRec ? 'Recurring ' : ''}Income: ${event.description || 'Untitled'}`;
                details = `$${formatNumber(event.amount)} ${isRec ? event.frequency : 'on ' + formatDate(event.date)}`;
                icon = 'trending-up';
                typeClass = 'income';
                break;
        }

        item.innerHTML = `
            <div class="event-type-icon ${typeClass}"><i data-lucide="${icon}"></i></div>
            <div class="event-content"><div class="event-title">${title}</div><div class="event-details">${details}</div></div>
            <div class="event-actions">
                <button class="btn btn-outline btn-sm" onclick="editEvent('${event.id}')"><i data-lucide="edit-2"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteEvent('${event.id}')"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        container.appendChild(item);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateOnboardingGuide();
}

/**
 * Dashboard & Summary UI
 */
function updateDashboard() {
    const totalNetWorth = getCurrentNetWorth();
    const netWorthElement = document.getElementById('current-net-worth');
    if (netWorthElement) netWorthElement.textContent = `$${formatNumber(totalNetWorth)}`;
    
    const invCountEl = document.getElementById('investment-count');
    if (invCountEl) invCountEl.textContent = investments.length;
    
    const eventCountEl = document.getElementById('event-count');
    if (eventCountEl) eventCountEl.textContent = events.length;
    
    const yearsInput = document.getElementById('projection-years-input');
    const years = yearsInput ? yearsInput.value : '30';
    const yearsLabel = document.getElementById('projection-years-label');
    if (yearsLabel) yearsLabel.textContent = `In ${years} Years`;
    
    if (typeof updateAllocationChart === 'function') updateAllocationChart();
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
        if (labelEl) labelEl.textContent = `By ${last.year}${last.isInflationAdjusted ? " (Today's Value)" : ""}`;
    } else {
        el.textContent = '$0';
    }
}

/**
 * Projection Details and Table
 */
function showYearDetails(index) {
    const p = projections[index];
    if (!p) return;
    document.getElementById('details-modal-year').textContent = `Year ${p.year} Details`;
    document.getElementById('details-net-worth').textContent = `$${formatNumber(p.totalNetWorth)}`;
    let prevTotal = index === 0 ? investments.reduce((s, i) => s + i.amount, 0) : projections[index-1].totalNetWorth;
    const growth = p.totalNetWorth - prevTotal;
    const gEl = document.getElementById('details-growth');
    gEl.textContent = `${growth > 0 ? '+' : ''}$${formatNumber(growth)}`;
    gEl.className = growth >= 0 ? 'text-success' : 'text-danger';
    
    const assetList = document.getElementById('details-asset-list');
    assetList.innerHTML = '';
    if (investments.length > 0) {
        investments.forEach(inv => {
            const item = document.createElement('div');
            item.className = 'detail-item';
            item.innerHTML = `<span>${inv.name}</span><span class="val">$${formatNumber(p.balances[inv.id] || 0)}</span>`;
            assetList.appendChild(item);
        });
    } else {
        assetList.innerHTML = `<div class="detail-item"><span>Net Worth</span><span class="val">$${formatNumber(p.balances['virtual'] || 0)}</span></div>`;
    }
    
    const eventList = document.getElementById('details-event-list');
    eventList.innerHTML = p.events.length ? p.events.map(e => `<div class="detail-item"><span>${e}</span></div>`).join('') : '<p class="empty-state">No events.</p>';
    document.getElementById('projection-details-modal').style.display = 'flex';
}

function updateProjectionTable() {
    const header = document.getElementById('projection-table-header');
    if (header) {
        header.innerHTML = '';
        ['Year', 'Net Worth', 'Growth', 'Events', ...investments.map(i => i.name)].forEach(label => {
            const th = document.createElement('th');
            th.textContent = label;
            header.appendChild(th);
        });
        if (!investments.length) { const th = document.createElement('th'); th.textContent = 'Virtual Balance'; header.appendChild(th); }
    }

    const tbody = document.getElementById('projection-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    projections.forEach((p, idx) => {
        const row = document.createElement('tr');
        row.className = 'clickable-row' + (idx === 0 ? ' initial-row' : '');
        row.onclick = () => showYearDetails(idx);
        let growthDisp = '$0';
        if (idx > 0) {
            const diff = p.totalNetWorth - projections[idx-1].totalNetWorth;
            growthDisp = `<span style="color: ${diff >= 0 ? '#27ae60' : '#e74c3c'}">${diff >= 0 ? '+' : ''}$${formatNumber(diff)}</span>`;
        }
        
        let html = `<td>${p.year}${idx === 0 ? ' (Init)' : ''}</td><td>$${formatNumber(p.totalNetWorth)}</td><td>${growthDisp}</td><td>${p.events.join(', ') || 'None'}</td>`;
        if (investments.length) investments.forEach(inv => html += `<td>$${formatNumber(p.balances[inv.id] || 0)}</td>`);
        else html += `<td>$${formatNumber(p.balances['virtual'] || 0)}</td>`;
        
        row.innerHTML = html;
        tbody.appendChild(row);
    });
}

/**
 * Goal Management UI
 */
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
        const isInvestment = typeSelect.value === 'investment';
        document.getElementById('goal-target-asset-group').style.display = isInvestment ? 'block' : 'none';
        document.getElementById('goal-deduct-group').style.display = isInvestment ? 'block' : 'none';
    }
}

function showAddGoalModal() {
    const modal = document.getElementById('goal-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('goal-form').reset();
    document.getElementById('goal-form').removeAttribute('data-edit-id');
    document.getElementById('goal-modal-title').textContent = 'Add Financial Goal';
    document.getElementById('goal-year').value = new Date().getFullYear() + 10;
    
    const assetSelect = document.getElementById('goal-target-asset');
    assetSelect.innerHTML = investments.map(inv => `<option value="${inv.id}">${inv.name}</option>`).join('');
    
    document.getElementById('goal-type').onchange = function() {
        const isInv = this.value === 'investment';
        document.getElementById('goal-target-asset-group').style.display = isInv ? 'block' : 'none';
        document.getElementById('goal-deduct-group').style.display = isInv ? 'block' : 'none';
    };
    handleGoalCategoryChange();
    const submitBtn = modal.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Save Goal';
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

function renderGoals() {
    const container = document.getElementById('goals-list');
    if (!container) return;
    container.innerHTML = '';
    if (goals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"><i data-lucide="target"></i></div>
                <div class="empty-state-content">
                    <h3>No Goals Set</h3>
                    <p>Set a target for retirement, a home purchase, or any other financial objective.</p>
                    <button class="btn btn-primary" onclick="showAddGoalModal()" style="margin-top: 1rem;">
                        <i data-lucide="plus"></i><span>Set Goal</span>
                    </button>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }
    
    const categoryIcons = { 'retirement': 'palmtree', 'emergency-fund': 'shield', 'home': 'home', 'car': 'car', 'education': 'graduation-cap', 'vacation': 'plane', 'investment': 'trending-up', 'other': 'target' };
    [...goals].sort((a, b) => a.year - b.year).forEach(goal => {
        let currentVal = 0;
        const projection = projections.find(p => p.year === goal.year) || projections[projections.length-1];
        if (projection) currentVal = goal.type === 'net-worth' ? projection.totalNetWorth : (projection.balances[goal.targetAssetId] || 0);
        
        const progress = Math.min(100, Math.max(0, (currentVal / goal.amount) * 100));
        const isOnTrack = currentVal >= goal.amount;
        const icon = categoryIcons[goal.category] || 'target';
        
        const card = document.createElement('div');
        card.className = 'goal-card';
        card.innerHTML = `
            <div class="goal-header">
                <div style="display: flex; gap: 1rem; align-items: flex-start;">
                    <div class="goal-icon" style="background: rgba(99, 102, 241, 0.1); color: var(--border-focus); padding: 0.75rem; border-radius: var(--radius-md); display: flex;"><i data-lucide="${icon}"></i></div>
                    <div class="goal-info"><h3>${goal.name}</h3><div class="goal-target">Target: $${formatNumber(goal.amount)} in ${goal.year}</div></div>
                </div>
                <span class="goal-status-badge ${isOnTrack ? 'on-track' : 'off-track'}">${isOnTrack ? 'On Track' : 'Needs More'}</span>
            </div>
            <div class="goal-progress-container">
                <div class="goal-progress-labels"><span>${progress.toFixed(1)}% of goal</span><span>$${formatNumber(currentVal)} / $${formatNumber(goal.amount)}</span></div>
                <div class="goal-progress-bar"><div class="goal-progress-fill" style="width: ${progress}%"></div></div>
            </div>
            <div class="goal-actions event-actions">
                <button class="btn btn-outline btn-sm" onclick="editGoal('${goal.id}')"><i data-lucide="edit-2"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deleteGoal('${goal.id}')"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        container.appendChild(card);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}
