/**
 * Helper and Utility Functions
 */

function generateUniqueInvestmentName(type) {
    const baseNames = { 'Stocks': 'Stock Portfolio', 'Bonds': 'Bond Fund', 'Real Estate': 'Rental Property', 'Cash': 'Savings Account', 'Debt': 'Loan', 'Cryptocurrency': 'Crypto Wallet', 'Mutual Fund/Index Fund': 'Index Fund', 'Other': 'Asset' };
    const base = baseNames[type] || 'Asset';
    let counter = 1, name = base;
    while (investments.some(inv => inv.name === name)) { name = `${base} ${++counter}`; }
    return name;
}

function getDefaultReturnRate(type) {
    const rates = { 'Stocks': 8, 'Bonds': 4, 'Real Estate': 5, 'Cash': 2, 'Debt': 7, 'Cryptocurrency': 15, 'Mutual Fund/Index Fund': 7, 'Other': 5 };
    return rates[type] || 5;
}

function generateUniqueExpenseDescription() {
    const base = ['Rent', 'Groceries', 'Utilities', 'Insurance', 'Entertainment', 'Travel', 'Medical', 'Other'];
    let counter = 1, desc = base[0];
    while (events.some(e => e.type === 'expense' && e.description === desc)) { desc = `${base[counter % base.length]} ${Math.floor(counter / base.length) + 1}`; counter++; }
    return desc;
}

function generateUniqueIncomeDescription() {
    const base = ['Salary', 'Bonus', 'Freelance', 'Gift', 'Dividend', 'Other'];
    let counter = 1, desc = base[0];
    while (events.some(e => e.type === 'income' && e.description === desc)) { desc = `${base[counter % base.length]} ${Math.floor(counter / base.length) + 1}`; counter++; }
    return desc;
}

function validateInvestment(inv) {
    const errors = [];
    if (!inv.name?.trim()) errors.push('Name is required');
    if (inv.amount === null || isNaN(inv.amount) || inv.amount < 0) errors.push('Amount must be positive');
    if (inv.returnRate === null || isNaN(inv.returnRate)) errors.push('Rate is required');
    return { isValid: errors.length === 0, errors };
}

function validateEvent(event) {
    const errors = [];
    if (!event.description?.trim()) errors.push('Description is required');
    if (!event.amount || isNaN(event.amount)) errors.push('Amount is required');
    return { isValid: errors.length === 0, errors };
}

function showValidationErrors(errors) {
    showToast(`Validation errors:\n• ${errors.join('\n• ')}`, 'error', 5000);
}

/**
 * Portfolio Insights Logic
 */
function calculatePortfolioInsights() {
    if (!investments.length) return null;
    const totalAssets = investments.filter(i => i.type !== 'Debt').reduce((s, i) => s + parseFloat(i.amount), 0);
    const returnInDollars = investments.reduce((s, i) => {
        const amt = parseFloat(i.amount), rate = parseFloat(i.returnRate) / 100;
        return i.type === 'Debt' ? s - (amt * rate) : s + (amt * rate);
    }, 0);
    const riskScore = calculateRiskScore();
    const diversificationScore = calculateDiversificationScore();
    return {
        totalValue: getCurrentNetWorth(), totalAssets, weightedReturn: totalAssets > 0 ? (returnInDollars / totalAssets) * 100 : 0,
        riskScore, diversificationScore, projectedGrowth: calculateProjectedGrowth(),
        recommendations: generateRecommendations(riskScore, diversificationScore)
    };
}

function calculateRiskScore() {
    const weights = { 'Stocks': 0.8, 'Bonds': 0.3, 'Real Estate': 0.6, 'Cash': 0.1, 'Cryptocurrency': 0.9, 'Mutual Fund/Index Fund': 0.5, 'Other': 0.5 };
    const assets = investments.filter(i => i.type !== 'Debt');
    if (!assets.length) return 0;
    const total = assets.reduce((s, i) => s + parseFloat(i.amount), 0);
    return Math.round(assets.reduce((s, i) => s + (parseFloat(i.amount) * (weights[i.type] || 0.5)), 0) / total * 100);
}

function calculateDiversificationScore() {
    const assets = investments.filter(i => i.type !== 'Debt');
    if (!assets.length) return 0;
    const total = assets.reduce((s, i) => s + parseFloat(i.amount), 0);
    const hhi = assets.reduce((s, i) => s + Math.pow((parseFloat(i.amount) / total) * 100, 2), 0);
    return Math.round(Math.max(0, 100 - (hhi / 10000) * 100));
}

function calculateProjectedGrowth() {
    if (!projections.length) return null;
    const start = projections[0].totalNetWorth, end = projections[projections.length - 1].totalNetWorth;
    if (start === 0) return 0;
    const total = ((end - start) / start) * 100;
    return { totalGrowth: total, annualizedGrowth: (Math.pow(1 + total / 100, 1 / projections.length) - 1) * 100 };
}

function generateRecommendations(risk, div) {
    const recs = [];
    if (risk > 70) recs.push('Consider bonds to reduce risk.');
    if (div < 50) recs.push('Portfolio could be more diversified.');
    return recs.length ? recs : ['Portfolio looks balanced!'];
}

function displayPortfolioInsights() {
    const insights = calculatePortfolioInsights();
    if (!insights) return;
    const container = document.getElementById('portfolio-insights');
    if (!container) return;
    const rules = generateProfessionalInsights(insights);
    container.innerHTML = `
        <div class="insights-grid">
            <div class="insight-card">
                <h4>Portfolio Metrics</h4>
                <div class="metric"><span>Net Worth:</span><span>$${formatNumber(insights.totalValue)}</span></div>
                <div class="metric"><span>Return:</span><span>${insights.weightedReturn.toFixed(2)}%</span></div>
                <div class="metric"><span>Risk:</span><span class="risk-${insights.riskScore > 70 ? 'high' : 'low'}">${insights.riskScore}/100</span></div>
            </div>
            <div class="insight-card">
                <h4>Analysis</h4>
                <ul class="recommendations-list">${rules.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function generateProfessionalInsights(insights) {
    const rules = [];
    const assets = investments.filter(i => i.type !== 'Debt');
    const totalAssets = assets.reduce((s, i) => s + parseFloat(i.amount), 0);
    const getPct = (type) => totalAssets > 0 ? (investments.filter(i => i.type === type).reduce((s, i) => s + parseFloat(i.amount), 0) / totalAssets) * 100 : 0;
    
    if (getPct('Stocks') > 70) rules.push('High stock concentration (>70%).');
    if (getPct('Cryptocurrency') > 10) rules.push('Crypto exceeds 10% of portfolio.');
    if (getPct('Cash') > 20) rules.push('Cash drag: >20% in cash.');
    
    const debt = investments.filter(i => i.type === 'Debt').reduce((s, i) => s + parseFloat(i.amount), 0);
    if (debt > 0 && (debt / totalAssets) > 0.5) rules.push('High debt-to-asset ratio (>50%).');
    
    if (projections.length > 0 && projections[projections.length-1].totalNetWorth < 0) rules.push('Potential liquidity shortfall detected.');
    
    return rules.length ? rules : ['Stay the course!'];
}
