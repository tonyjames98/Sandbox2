/**
 * Core Calculation Engine
 */

/**
 * Main projection calculation logic
 */
function calculateProjection(years) {
    const projection = [];
    const currentYear = new Date().getFullYear();
    const adjustInflationEl = document.getElementById('adjust-inflation');
    const inflationRateEl = document.getElementById('inflation-rate');
    
    const adjustInflation = adjustInflationEl ? adjustInflationEl.checked : false;
    const inflationValue = inflationRateEl ? inflationRateEl.value : "2.5";
    const inflationRate = (inflationValue !== "" ? parseFloat(inflationValue) : 2.5) / 100;
    
    let currentBalances = {};
    if (investments.length === 0) {
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
            // Apply investment growth
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

            // Apply Savings Boost
            if (savingsBoost !== 0) {
                const annualBoost = savingsBoost * 12;
                const boostTargetEl = document.getElementById('savings-boost-target');
                let selectedTargetId = boostTargetEl ? boostTargetEl.value : '';
                
                if (!selectedTargetId || currentBalances[selectedTargetId] === undefined) {
                    const potentialSources = Object.keys(currentBalances).filter(id => {
                        const inv = investments.find(i => i.id === id);
                        return !inv || inv.type !== 'Debt';
                    });
                    
                    if (potentialSources.length > 0) {
                        selectedTargetId = potentialSources.sort((a, b) => currentBalances[b] - currentBalances[a])[0];
                    } else {
                        selectedTargetId = 'virtual';
                    }
                }
                
                if (currentBalances[selectedTargetId] === undefined) {
                    currentBalances[selectedTargetId] = 0;
                }
                
                currentBalances[selectedTargetId] += annualBoost;
                if (savingsBoost > 0) yearData.income += annualBoost;
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
                        
                        let sourceId;
                        if (debt.fundingSource === 'proportional') {
                            const potentialSources = Object.keys(currentBalances).filter(id => id !== debt.id && currentBalances[id] > 0);
                            sourceId = potentialSources.length > 0 ? potentialSources[0] : 'virtual';
                        } else {
                            sourceId = debt.fundingSource || 'virtual';
                            if (sourceId !== 'virtual' && (!currentBalances[sourceId] || currentBalances[sourceId] <= 0)) {
                                sourceId = 'virtual';
                            }
                        }
                        
                        if (currentBalances[sourceId] === undefined) currentBalances[sourceId] = 0;
                        currentBalances[sourceId] -= actualPayment;
                        yearData.events.push(`Debt Payment: ${debt.name} (-$${formatNumber(actualPayment)})`);
                    }
                }
            });

            // Apply events
            const yearToApply = currentYear + (year - 1);
            const yearEvents = getEventsForYear(yearToApply, currentYear + years);
            yearEvents.forEach(event => {
                if (investments.length === 0) {
                    applyEventToVirtual(event, currentBalances, yearData);
                } else {
                    applyEvent(event, currentBalances, yearData);
                }
            });

            // Update growth
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

        const actualTotal = Object.values(currentBalances).reduce((sum, val) => sum + val, 0);
        const discountFactor = adjustInflation ? Math.pow(1 + inflationRate, year) : 1;
        
        yearData.totalNetWorth = actualTotal / discountFactor;
        Object.keys(currentBalances).forEach(id => {
            yearData.balances[id] = currentBalances[id] / discountFactor;
        });

        // Milestone Checks
        const prevTotal = year > 0 ? projection[year-1].totalNetWorth : 0;
        if (prevTotal < 1000000 && yearData.totalNetWorth >= 1000000) yearData.milestones.push('Millionaire Status 🏆');
        if (prevTotal < 0 && yearData.totalNetWorth >= 0) yearData.milestones.push('Debt Free! 🕊️');
        
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

function applyEventToVirtual(event, balances, yearData) {
    let actualAmount = event.amount;
    switch (event.type) {
        case 'transfer':
        case 'withdrawal':
        case 'cash-withdrawal':
        case 'recurring-withdrawal':
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
        if (event.type === 'rebalancing') return;
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
                yearEvents.push({ 
                    ...event, 
                    amount: event.amount * multiplier, 
                    originalAmount: event.amount, 
                    isRecurring: true 
                });
            }
        } else {
            const eventYear = getYearFromStr(event.date || event.startDate);
            if (eventYear === year) yearEvents.push(event);
        }
    });
    return yearEvents;
}

function applyEvent(event, balances, yearData) {
    switch (event.type) {
        case 'transfer':
        case 'withdrawal':
        case 'cash-withdrawal':
        case 'recurring-withdrawal':
            let actualAmount = event.amount;
            if (event.amountType === 'percent') {
                const sourceBalance = (event.from && balances[event.from] !== undefined) ? balances[event.from] : Object.values(balances).reduce((a, b) => a + b, 0);
                actualAmount = sourceBalance * (event.amount / 100);
            }
            const sourceId = (event.from && balances[event.from] !== undefined) ? event.from : Object.keys(balances)[0] || 'virtual';
            balances[sourceId] -= actualAmount;
            if (event.to && balances[event.to] !== undefined) balances[event.to] += actualAmount;
            
            const typeLabel = (event.type === 'withdrawal' || event.type.includes('withdrawal')) ? 'Withdrawal' : 'Transfer';
            const displayValue = event.amountType === 'percent' ? `${event.amount}% ($${formatNumber(actualAmount)})` : `$${formatNumber(actualAmount)}`;
            yearData.events.push(`${typeLabel}${event.isRecurring ? ` (${event.frequency})` : ''}: ${displayValue}`);
            break;

        case 'expense':
        case 'recurring':
            let expenseAmount = event.amount;
            if (event.amountType === 'percent') {
                const sourceBalance = (event.from && balances[event.from] !== undefined) ? balances[event.from] : Object.values(balances).reduce((a, b) => a + b, 0);
                expenseAmount = sourceBalance * (event.amount / 100);
            }
            const expenseFrom = event.from || event.source;
            if (expenseFrom && balances[expenseFrom] !== undefined) {
                balances[expenseFrom] -= expenseAmount;
            } else {
                const total = Object.values(balances).reduce((sum, val) => sum + val, 0);
                if (total > 0) {
                    Object.keys(balances).forEach(id => balances[id] -= expenseAmount * (balances[id] / total));
                } else {
                    const firstId = Object.keys(balances)[0];
                    if (firstId) balances[firstId] -= expenseAmount;
                }
            }
            yearData.events.push(`Expense: ${event.amountType === 'percent' ? `${event.amount}% ($${formatNumber(expenseAmount)})` : `$${formatNumber(expenseAmount)}`}`);
            break;

        case 'income':
        case 'recurring-income':
            let incomeAmount = event.amount;
            if (event.amountType === 'percent') {
                const targetBalance = (event.to && balances[event.to] !== undefined) ? balances[event.to] : Object.values(balances).reduce((a, b) => a + b, 0);
                incomeAmount = targetBalance * (event.amount / 100);
            }
            yearData.income += incomeAmount;
            yearData.growth += incomeAmount;
            const incomeTo = event.to || event.target;
            if (incomeTo && balances[incomeTo] !== undefined) {
                balances[incomeTo] += incomeAmount;
            } else {
                const total = Object.values(balances).reduce((sum, val) => sum + val, 0);
                if (total > 0) {
                    Object.keys(balances).forEach(id => balances[id] += incomeAmount * (balances[id] / total));
                } else {
                    const firstId = Object.keys(balances)[0];
                    if (firstId) balances[firstId] += incomeAmount;
                }
            }
            yearData.events.push(`Income: ${event.amountType === 'percent' ? `${event.amount}% ($${formatNumber(incomeAmount)})` : `$${formatNumber(incomeAmount)}`}`);
            break;
    }
}

function applyRebalancing(balances, yearData) {
    const rebalancingEvents = events.filter(evt => evt.type === 'rebalancing');
    if (rebalancingEvents.length === 0) return;

    const total = Object.values(balances).reduce((sum, val) => sum + val, 0);
    if (total === 0) return;

    investments.forEach(inv => {
        if (inv.targetAllocation > 0) {
            balances[inv.id] = total * (inv.targetAllocation / 100);
        }
    });
    yearData.events.push('Portfolio rebalanced');
}

/**
 * Specialized Projection for Stress Testing
 * @param {number} years - Number of years to project
 * @param {function} rateCallback - Function(year, investment) returning decimal rate
 */
function calculateCustomProjection(years, rateCallback) {
    const projection = [];
    const currentYear = new Date().getFullYear();
    let currentBalances = {};
    investments.forEach(inv => currentBalances[inv.id] = inv.type === 'Debt' ? -inv.amount : inv.amount);

    for (let year = 0; year <= years; year++) {
        const yearData = { year: currentYear + year, balances: {}, events: [], milestones: [], growth: 0, investmentGrowth: 0, income: 0, totalNetWorth: 0 };
        if (year > 0) {
            investments.forEach(inv => {
                const rate = rateCallback(year, inv);
                const growth = currentBalances[inv.id] * rate;
                currentBalances[inv.id] += growth;
                yearData.growth += growth;
            });
            const yearToApply = currentYear + (year - 1);
            getEventsForYear(yearToApply, currentYear + years).forEach(event => applyEvent(event, currentBalances, yearData));
        }
        yearData.totalNetWorth = Object.values(currentBalances).reduce((a, b) => a + b, 0);
        Object.keys(currentBalances).forEach(id => yearData.balances[id] = currentBalances[id]);
        projection.push(yearData);
    }
    return projection;
}

/**
 * Utility functions
 */
function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Math.round(num).toLocaleString();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
