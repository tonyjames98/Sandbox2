/**
 * Charting and Visualizations
 */

/**
 * Updates all projection-related charts
 */
function updateProjectionCharts() {
    if (projections.length === 0) return;
    updateNetWorthChart();
    updateAllocationTimelineChart();
}

/**
 * Updates the main Net Worth line chart
 */
function updateNetWorthChart() {
    const ctx = document.getElementById('net-worth-chart');
    if (!ctx) return;

    if (charts.netWorth) charts.netWorth.destroy();

    const isDarkMode = true;
    let datasets = [];
    const originalColors = generateInvestmentColors(investments.length);
    const colorMap = {};
    investments.forEach((inv, idx) => colorMap[inv.id] = originalColors[idx]);

    const assets = investments.filter(inv => inv.type !== 'Debt');
    const debts = investments.filter(inv => inv.type === 'Debt');

    if (investments.length > 0) {
        let cumulativeAssets = projections.map(() => 0);
        assets.forEach((inv, idx) => {
            const color = colorMap[inv.id] || '#6366f1';
            const data = projections.map((p, pIdx) => cumulativeAssets[pIdx] += (p.balances[inv.id] || 0));
            datasets.push({
                label: inv.name, data: data, backgroundColor: color + '40', borderColor: color,
                borderWidth: 2, fill: idx === 0 ? 'origin' : '-1', tension: 0.4, pointRadius: 0,
                pointHoverRadius: 4, pointHoverBackgroundColor: color, order: 10 + idx
            });
        });

        let cumulativeDebts = projections.map(() => 0);
        debts.forEach((inv, idx) => {
            const color = colorMap[inv.id] || '#ef4444';
            const data = projections.map((p, pIdx) => cumulativeDebts[pIdx] += (p.balances[inv.id] || 0));
            datasets.push({
                label: inv.name, data: data, backgroundColor: color + '40', borderColor: color,
                borderWidth: 2, fill: idx === 0 ? 'origin' : '-1', tension: 0.4, pointRadius: 0,
                pointHoverRadius: 4, pointHoverBackgroundColor: color, order: 30 + idx
            });
        });
    } else {
        datasets.push({
            label: 'Net Worth', data: projections.map(p => p.balances['virtual'] || 0),
            backgroundColor: 'rgba(99, 102, 241, 0.2)', borderColor: '#6366f1',
            borderWidth: 3, fill: 'origin', tension: 0.4, pointRadius: 0, order: 10
        });
    }

    datasets.push({
        label: 'Total Net Worth', data: projections.map(p => p.totalNetWorth),
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 41, 59, 0.9)',
        borderWidth: 3, fill: false, tension: 0.4, pointRadius: 0, order: 100
    });

    if (baselineProjections) {
        datasets.push({
            label: 'Baseline Net Worth', data: baselineProjections.map(p => p.totalNetWorth),
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)',
            borderWidth: 3, borderDash: [5, 5], fill: false, tension: 0.4, pointRadius: 0, order: 5
        });
    }

    if (goals.length > 0) {
        const goalData = projections.map(p => goals.some(g => g.year === p.year) ? p.totalNetWorth : null);
        if (goalData.some(v => v !== null)) {
            datasets.push({
                label: 'Goals', data: goalData, backgroundColor: '#f59e0b', borderColor: '#fff',
                borderWidth: 2, pointRadius: 6, pointHoverRadius: 8, pointStyle: 'star', showLine: false, order: 110
            });
        }
    }

    const milestoneData = projections.map(p => p.milestones.length > 0 ? p.totalNetWorth : null);
    if (milestoneData.some(v => v !== null)) {
        datasets.push({
            label: 'Milestones', data: milestoneData, backgroundColor: '#10b981', borderColor: '#fff',
            borderWidth: 2, pointRadius: 7, pointHoverRadius: 9, pointStyle: 'rectRot', showLine: false, order: 120
        });
    }

    charts.netWorth = new Chart(ctx, {
        type: 'line', data: { labels: projections.map(p => p.year), datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: {
                legend: {
                    display: investments.length > 0, position: 'bottom',
                    labels: { color: '#94a3b8', padding: 15, usePointStyle: true, font: { size: 11 }, filter: i => !['Goals', 'Milestones'].includes(i.text) }
                },
                tooltip: {
                    backgroundColor: '#1e293b', titleColor: '#f8fafc', bodyColor: '#94a3b8', borderColor: '#334155',
                    borderWidth: 1, padding: 12, usePointStyle: true,
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Goals') {
                                return goals.filter(g => g.year == context.label).map(g => ` Goal: ${g.name} ($${formatNumber(g.amount)})`).join('\n');
                            }
                            if (context.dataset.label === 'Milestones') {
                                const yearData = projections.find(p => p.year === parseInt(context.label));
                                return yearData?.milestones.map(m => ` Milestone: ${m}`).join('\n') || '';
                            }
                            const inv = investments.find(i => i.name === context.dataset.label);
                            const val = inv ? (projections.find(p => p.year === parseInt(context.label))?.balances[inv.id] || 0) : context.parsed.y;
                            return ` ${context.dataset.label}: $${formatNumber(val)}`;
                        },
                        footer: function(tooltipItems) {
                            const yearData = projections.find(p => p.year === parseInt(tooltipItems[0].label));
                            if (!yearData) return '';
                            const baselineItem = tooltipItems.find(i => i.dataset.label === 'Baseline Net Worth');
                            let footer = `\nTotal Net Worth: $${formatNumber(yearData.totalNetWorth)}`;
                            if (baselineItem) {
                                const diff = yearData.totalNetWorth - baselineItem.parsed.y;
                                footer += `\nvs Baseline: ${diff >= 0 ? '+' : '-'}$${formatNumber(Math.abs(diff))}`;
                            }
                            if (document.getElementById('adjust-inflation').checked) footer += `\n(Adjusted for Inflation)`;
                            return footer;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#94a3b8', maxTicksLimit: 10 } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => '$' + formatNumber(v) } }
            }
        }
    });
}

function updateAllocationTimelineChart() {
    const ctx = document.getElementById('allocation-timeline-chart');
    if (!ctx) return;
    if (charts.allocationTimeline) charts.allocationTimeline.destroy();

    const colors = generateInvestmentColors(investments.length);
    const datasets = investments.map((inv, idx) => ({
        label: inv.name, data: projections.map(p => p.balances[inv.id] || 0),
        backgroundColor: colors[idx], borderRadius: 4
    }));

    charts.allocationTimeline = new Chart(ctx, {
        type: 'bar', data: { labels: projections.map(p => p.year), datasets: datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', usePointStyle: true } },
                tooltip: { backgroundColor: '#1e293b', callbacks: { label: c => ` ${c.dataset.label}: $${formatNumber(c.parsed.y)}` } }
            },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', callback: v => '$' + formatNumber(v) } }
            }
        }
    });
}

function updateAllocationChart() {
    const ctx = document.getElementById('allocation-chart');
    if (!ctx) return;
    if (charts.allocation) charts.allocation.destroy();

    const validInvestments = investments.filter(inv => inv.amount > 0 && inv.type !== 'Debt');
    if (validInvestments.length === 0) { ctx.style.display = 'none'; return; }

    ctx.style.display = 'block';
    charts.allocation = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: validInvestments.map(inv => inv.name),
            datasets: [{ data: validInvestments.map(inv => inv.amount), backgroundColor: generateInvestmentColors(validInvestments.length), borderWidth: 0 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: function(c) {
                            const total = c.dataset.data.reduce((a, b) => a + b, 0);
                            return ` ${c.label}: $${formatNumber(c.raw)} (${((c.raw / total) * 100).toFixed(1)}%)`;
                        }
                    }
                }
            }
        }
    });
}

function generateInvestmentColors(count) {
    const baseColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    if (count <= baseColors.length) return baseColors.slice(0, count);
    const colors = [...baseColors];
    for (let i = baseColors.length; i < count; i++) {
        const hue = (i * 137.508) % 360;
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    return colors;
}

/**
 * Renders a chart comparing two different projections
 */
function renderComparisonChart(canvasId, baseline, scenario, baselineLabel, scenarioLabel) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (window.simCharts && window.simCharts[canvasId]) window.simCharts[canvasId].destroy();
    if (!window.simCharts) window.simCharts = {};

    window.simCharts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: baseline.map(p => p.year),
            datasets: [
                { label: baselineLabel, data: baseline.map(p => p.totalNetWorth), borderColor: '#94a3b8', borderDash: [5, 5], fill: false, tension: 0.3 },
                { label: scenarioLabel, data: scenario.map(p => p.totalNetWorth), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8' } } },
            scales: {
                y: { ticks: { color: '#94a3b8', callback: v => '$' + formatNumber(v) }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        }
    });
}

function renderMonteCarloChart(results) {
    const ctx = document.getElementById('mc-chart');
    if (!ctx) return;
    if (charts.mc) charts.mc.destroy();
    charts.mc = new Chart(ctx, {
        type: 'line',
        data: {
            labels: results.labels,
            datasets: [
                { label: '90th Percentile', data: results.p90, borderColor: '#10b981', borderDash: [5, 5], fill: false, tension: 0.3 },
                { label: '50th Percentile', data: results.p50, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)', fill: true, tension: 0.3 },
                { label: '10th Percentile', data: results.p10, borderColor: '#ef4444', borderDash: [5, 5], fill: false, tension: 0.3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => '$' + formatNumber(v) } }
            }
        }
    });
}

function renderCIChart(data, contributions) {
    const ctx = document.getElementById('ci-chart');
    if (!ctx) return;
    if (window.simCharts && window.simCharts['ci-chart']) window.simCharts['ci-chart'].destroy();
    if (!window.simCharts) window.simCharts = {};
    window.simCharts['ci-chart'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map((_, i) => `Year ${i}`),
            datasets: [
                { label: 'Total Balance', data: data, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, pointRadius: 0 },
                { label: 'Contributions', data: contributions, borderColor: '#10b981', fill: false, pointRadius: 0 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderAmortizationChart(labels, principal, interest) {
    const ctx = document.getElementById('loan-chart');
    if (!ctx) return;
    if (window.simCharts && window.simCharts['loan-chart']) window.simCharts['loan-chart'].destroy();
    if (!window.simCharts) window.simCharts = {};
    window.simCharts['loan-chart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(l => `Year ${l}`),
            datasets: [
                { label: 'Principal', data: principal, backgroundColor: '#3b82f6', stack: 's0' },
                { label: 'Interest', data: interest, backgroundColor: '#ef4444', stack: 's0' }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });
}

function renderAmortizationTable(schedule) {
    const tbody = document.querySelector('#amortization-table tbody');
    if (!tbody) return;
    tbody.innerHTML = schedule.map(r => `<tr><td>Year ${r.year}</td><td>$${formatNumber(r.principal)}</td><td>$${formatNumber(r.interest)}</td><td>$${formatNumber(r.remaining)}</td></tr>`).join('');
}
