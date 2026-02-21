/**
 * Specialized Financial Simulations
 */

/**
 * Monte Carlo Simulation
 */
function boxMullerTransform() {
    const u = 1 - Math.random(), v = 1 - Math.random();
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
    if (typeof lucide !== 'undefined') lucide.createIcons();

    setTimeout(() => {
        const allSimulations = [];
        for (let i = 0; i < iterations; i++) {
            allSimulations.push(calculateSingleSimulation(years, volatility));
        }
        const results = processMonteCarloResults(allSimulations);
        displayMonteCarloResults(results);
        
        runBtn.disabled = false;
        runBtn.innerHTML = originalBtnText;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        document.getElementById('mc-results').style.display = 'block';
        showToast(`Simulation complete: ${iterations} iterations`, 'success');
    }, 100);
}

function calculateSingleSimulation(years, volatility) {
    const projection = [];
    const currentYear = new Date().getFullYear();
    const adjustInflation = document.getElementById('adjust-inflation').checked;
    const inflationRate = (parseFloat(document.getElementById('inflation-rate').value) || 2.5) / 100;
    
    let currentBalances = {};
    investments.forEach(inv => currentBalances[inv.id] = inv.type === 'Debt' ? -inv.amount : inv.amount);

    for (let year = 0; year <= years; year++) {
        let netWorth = Object.values(currentBalances).reduce((a, b) => a + b, 0);
        projection.push(netWorth / (adjustInflation ? Math.pow(1 + inflationRate, year) : 1));

        if (year < years) {
            investments.forEach(inv => {
                const baseRate = inv.returnRate / 100;
                const effectiveRate = inv.type === 'Debt' ? baseRate : (baseRate + boxMullerTransform() * volatility);
                currentBalances[inv.id] *= (1 + effectiveRate);
            });

            events.forEach(event => {
                if (event.type === 'rebalancing') return;
                let apply = false;
                const yearNum = currentYear + year;
                if (event.isRecurring) {
                    const startYear = event.startDate ? new Date(event.startDate).getFullYear() : currentYear;
                    const endYear = event.endDate ? new Date(event.endDate).getFullYear() : 9999;
                    if (yearNum >= startYear && yearNum <= endYear) apply = true;
                } else {
                    const eventYear = event.date ? new Date(event.date).getFullYear() : currentYear;
                    if (eventYear === yearNum) apply = true;
                }

                if (apply) {
                    const amount = event.amountType === 'percent' ? 0 : (event.amount || 0);
                    if (event.type === 'income' && event.to) { if (currentBalances[event.to] !== undefined) currentBalances[event.to] += amount; }
                    else if (event.type === 'expense' && event.from) { if (currentBalances[event.from] !== undefined) currentBalances[event.from] -= amount; }
                    else if (event.type === 'withdrawal' && event.from) { if (currentBalances[event.from] !== undefined) currentBalances[event.from] -= amount; }
                    else if (event.type === 'transfer' && event.from && event.to) {
                        if (currentBalances[event.from] !== undefined && currentBalances[event.to] !== undefined) {
                            currentBalances[event.from] -= amount; currentBalances[event.to] += amount;
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
    const results = { p10: [], p50: [], p90: [], labels: [], goalProbability: 0 };
    const currentYear = new Date().getFullYear();
    for (let year = 0; year < years; year++) {
        results.labels.push(currentYear + year);
        const yearValues = simulations.map(sim => sim[year]).sort((a, b) => a - b);
        results.p10.push(yearValues[Math.floor(simulations.length * 0.1)]);
        results.p50.push(yearValues[Math.floor(simulations.length * 0.5)]);
        results.p90.push(yearValues[Math.floor(simulations.length * 0.9)]);
    }
    const maxGoal = goals.length > 0 ? Math.max(...goals.map(g => g.amount)) : 0;
    const successes = maxGoal > 0 ? simulations.filter(sim => sim[sim.length - 1] >= maxGoal).length : simulations.length;
    results.goalProbability = (successes / simulations.length) * 100;
    return results;
}

function displayMonteCarloResults(results) {
    document.getElementById('mc-p90').textContent = '$' + formatNumber(results.p90[results.p90.length - 1]);
    document.getElementById('mc-p50').textContent = '$' + formatNumber(results.p50[results.p50.length - 1]);
    document.getElementById('mc-p10').textContent = '$' + formatNumber(results.p10[results.p10.length - 1]);
    document.getElementById('mc-goal-probability').textContent = results.goalProbability.toFixed(1) + '%';
    renderMonteCarloChart(results);
}

/**
 * Sequence of Returns Simulation
 */
function runSequenceOfReturns() {
    const magnitude = parseFloat(document.getElementById('sor-magnitude').value) / 100;
    const crashYear = parseInt(document.getElementById('sor-crash-year').value) || 1;
    const years = parseInt(document.getElementById('projection-years-input').value) || 30;
    
    if (investments.length === 0) { showToast('Add at least one asset to run simulations.', 'error'); return; }

    const resultsDiv = document.getElementById('sor-results');
    const summaryDiv = document.getElementById('sor-impact-summary');
    resultsDiv.style.display = 'block';

    const baseline = calculateProjection(years);
    const baselineFinal = baseline[baseline.length - 1].totalNetWorth;

    const stressProjection = calculateCustomProjection(years, (year, inv) => {
        let rate = (inv.returnRate || 0) / 100;
        if (year === crashYear || year === crashYear + 1) rate = -magnitude / 2;
        return rate;
    });
    const stressFinal = stressProjection[stressProjection.length - 1].totalNetWorth;
    const diff = baselineFinal - stressFinal;

    summaryDiv.innerHTML = `Crash in Year ${crashYear} Impact: <span class="text-danger">-$${formatNumber(diff)}</span> (${((diff / baselineFinal) * 100).toFixed(1)}% reduction in final wealth)`;
    renderComparisonChart('sor-chart', baseline, stressProjection, 'Baseline', 'Crash Scenario');
    showToast('Sequence of Returns Stress Test complete.', 'success');
}

/**
 * FIRE SWR Analyzer
 */
function runFireSWR() {
    const swr = parseFloat(document.getElementById('fire-swr').value) / 100;
    const annualExpenses = parseFloat(document.getElementById('fire-expenses').value) || 60000;
    const years = parseInt(document.getElementById('projection-years-input').value) || 30;
    const fiNumber = annualExpenses / swr;
    const currentAssets = investments.filter(i => i.type !== 'Debt').reduce((sum, i) => sum + i.amount, 0);
    
    const projection = calculateProjection(years);
    let fiYear = null;
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < projection.length; i++) {
        if (projection[i].totalNetWorth >= fiNumber) { fiYear = currentYear + i; break; }
    }

    document.getElementById('fire-results').style.display = 'block';
    document.getElementById('fire-number-val').textContent = '$' + formatNumber(fiNumber);
    const statusDiv = document.getElementById('fire-success-rate');
    let statusHTML = `Current Progress: ${((currentAssets / fiNumber) * 100).toFixed(1)}% of FI Goal<br>`;
    statusHTML += fiYear ? `<span class="text-success">Estimated FI Date: <strong>${fiYear}</strong></span>` : `<span class="text-danger">FI Number not reached within ${years} years.</span>`;
    statusDiv.innerHTML = statusHTML;
    showToast('FIRE Analysis complete.', 'success');
}

/**
 * Compound Interest Calculator
 */
function runCompoundInterest() {
    const principal = parseFloat(document.getElementById('ci-principal').value) || 0;
    const annualAddition = parseFloat(document.getElementById('ci-annual').value) || 0;
    const years = parseInt(document.getElementById('ci-years').value) || 10;
    const rate = (parseFloat(document.getElementById('ci-rate').value) || 0) / 100;
    
    document.getElementById('ci-results').style.display = 'block';
    let currentBalance = principal;
    const dataPoints = [principal], contributionPoints = [principal];
    
    for (let year = 1; year <= years; year++) {
        currentBalance = (currentBalance * (1 + rate)) + annualAddition;
        dataPoints.push(currentBalance);
        contributionPoints.push(principal + (annualAddition * year));
    }

    const totalContrib = principal + (annualAddition * years);
    document.getElementById('ci-future-val').textContent = '$' + formatNumber(currentBalance);
    document.getElementById('ci-total-contributions').textContent = '$' + formatNumber(totalContrib);
    document.getElementById('ci-total-interest').textContent = '$' + formatNumber(currentBalance - totalContrib);
    renderCIChart(dataPoints, contributionPoints);
    showToast('Compound interest calculation complete.', 'success');
}

/**
 * Loan Amortization Calculator
 */
function runAmortization() {
    const principal = parseFloat(document.getElementById('loan-amount').value) || 0;
    const annualRate = parseFloat(document.getElementById('loan-rate').value) || 0;
    const years = parseInt(document.getElementById('loan-years').value) || 30;
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    
    let monthlyPayment = monthlyRate > 0 ? principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1) : principal / numPayments;
    const totalCost = monthlyPayment * numPayments;

    document.getElementById('loan-monthly-val').textContent = '$' + formatNumber(monthlyPayment);
    document.getElementById('loan-total-principal').textContent = '$' + formatNumber(principal);
    document.getElementById('loan-total-interest').textContent = '$' + formatNumber(totalCost - principal);
    document.getElementById('loan-total-cost').textContent = '$' + formatNumber(totalCost);
    document.getElementById('loan-results').style.display = 'block';

    const schedule = [];
    let remaining = principal, yearlyP = 0, yearlyI = 0;
    const principalSeries = [], interestSeries = [];

    for (let m = 1; m <= numPayments; m++) {
        const iPay = remaining * monthlyRate, pPay = monthlyPayment - iPay;
        remaining -= pPay; yearlyP += pPay; yearlyI += iPay;
        if (m % 12 === 0 || m === numPayments) {
            schedule.push({ year: Math.ceil(m / 12), principal: yearlyP, interest: yearlyI, remaining: Math.max(0, remaining) });
            principalSeries.push(yearlyP); interestSeries.push(yearlyI);
            yearlyP = 0; yearlyI = 0;
        }
    }
    renderAmortizationTable(schedule);
    renderAmortizationChart(schedule.map(s => s.year), principalSeries, interestSeries);
    showToast('Amortization schedule calculated.', 'success');
}
