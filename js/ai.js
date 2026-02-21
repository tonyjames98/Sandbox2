/**
 * AI Financial Analysis Logic
 */

function generateFinancialPrompt() {
    const nw = getCurrentNetWorth();
    let prompt = `Analyze my finances:\n- Net Worth: $${formatNumber(nw)}\n- Assets: ${investments.length}\n- Events: ${events.length}\n\nINVESTMENTS:`;
    investments.forEach((inv, i) => prompt += `\n${i + 1}. ${inv.name} (${inv.type}): $${formatNumber(inv.amount)} @ ${inv.returnRate}%`);
    prompt += `\n\nEVENTS:`;
    events.forEach((evt, i) => prompt += `\n${i + 1}. ${evt.type.toUpperCase()}: ${evt.description || 'Untitled'} ($${formatNumber(evt.amount)})`);
    if (projections.length) prompt += `\n\nPROJECTION: ${projections.length} years, final value $${formatNumber(projections[projections.length-1].totalNetWorth)}`;
    prompt += `\n\nPlease provide actionable advice, risk assessment, and steps to improve.`;
    return prompt;
}

function updateManualPrompt() {
    const el = document.getElementById('manual-prompt');
    if (el) el.value = generateFinancialPrompt();
}

function copyAIPrompt() {
    const prompt = generateFinancialPrompt();
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(prompt).then(() => showToast('AI Prompt copied to clipboard!', 'success')).catch(() => fallbackCopyToClipboard(prompt));
    } else { fallbackCopyToClipboard(prompt); }
}
