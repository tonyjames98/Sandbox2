/**
 * Export, Import, and Share Logic
 */

function exportData() {
    const data = {
        investments, events, goals, projections, baselineProjections, baselineInvestments, baselineEvents, baselineGoals,
        exportedAt: new Date().toISOString(), version: '1.1'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-projection-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData() { document.getElementById('import-file').click(); }

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.investments && data.events) {
                investments = data.investments; events = data.events;
                goals = data.goals || []; projections = data.projections || [];
                baselineProjections = data.baselineProjections || null;
                baselineInvestments = data.baselineInvestments || null;
                baselineEvents = data.baselineEvents || null;
                baselineGoals = data.baselineGoals || null;
                saveData(); updateDashboard(); renderInvestments(); renderEvents(); renderGoals(); updateEventFormOptions();
                showToast('Data imported successfully!', 'success');
            }
        } catch (error) { showToast('Error importing data: ' + error.message, 'error'); }
    };
    reader.readAsText(file);
}

function exportProjectionCSV() {
    if (!projections.length) { alert('Please run a projection first'); return; }
    let csv = 'Year,Total Net Worth,Investment Returns,Income Sources,Total Growth,Events\n';
    projections.forEach(p => csv += `${p.year},${p.totalNetWorth},${p.investmentGrowth || 0},${p.income || 0},${p.growth || 0},"${p.events.join('; ')}"\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projection-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportProjectionExcel() {
    if (!projections.length) { alert('Please run a projection first'); return; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projections.map(p => ({ Year: p.year, 'Total Net Worth': p.totalNetWorth, Growth: p.growth, Events: p.events.join('; ') }))), 'Projection Timeline');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(investments.map(i => ({ Name: i.name, Type: i.type, 'Initial Amount': i.amount, 'Return Rate (%)': i.returnRate }))), 'Investments');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(events), 'Events');
    XLSX.writeFile(wb, `finance-projection-${new Date().toISOString().split('T')[0]}.xlsx`);
}

function shareProjection() {
    try {
        const shareData = { investments, events, projections, projectionYears: document.getElementById('projection-years-input').value || 30, sharedAt: new Date().toISOString(), version: '1.0' };
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${btoa(encodeURIComponent(JSON.stringify(shareData)))}`;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(shareUrl).then(() => showToast('Share link copied to clipboard!', 'success')).catch(() => fallbackCopyToClipboard(shareUrl));
        } else { fallbackCopyToClipboard(shareUrl); }
    } catch (error) { showToast('Error creating share link.', 'error'); }
}

function fallbackCopyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text; el.style.position = 'fixed'; el.style.left = '-9999px';
    document.body.appendChild(el); el.select();
    try { document.execCommand('copy'); showToast('Share link copied to clipboard!', 'success'); }
    catch (e) { showToast('Failed to copy link.', 'error'); }
    document.body.removeChild(el);
}

function loadSharedData() {
    const shareData = new URLSearchParams(window.location.search).get('share');
    if (shareData) {
        try {
            const data = JSON.parse(decodeURIComponent(atob(shareData)));
            if (data.investments && data.events) {
                investments = data.investments; events = data.events; projections = data.projections || [];
                document.getElementById('projection-years-input').value = data.projectionYears;
                saveData(); updateDashboard(); renderInvestments(); renderEvents(); updateEventFormOptions();
                if (projections.length) { updateProjectionCharts(); updateProjectionTable(); }
                showToast('Shared data loaded!', 'success', 5000);
                window.history.replaceState({}, document.title, window.location.pathname);
                return true;
            }
        } catch (e) { showToast('Invalid share link.', 'error'); }
    }
    return false;
}
