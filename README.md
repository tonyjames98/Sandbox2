# My Projection Calculator

## Summary
A fast, privacy-focused financial projection tool built with vanilla JavaScript and Chart.js.

## Key Features
- **Net Worth Projection**: Model wealth over 1–60 years with inflation adjustments.
- **Advanced Simulations**: **Monte Carlo** probabilistic modeling to see Best/Worst case scenarios.
- **Asset/Debt Tracking**: Support for multiple asset classes and interest-bearing debt.
- **Financial Events**: One-time or recurring income, expenses, transfers, and withdrawals.
- **Interactive Scenarios**: "What-If" sliders for market performance and monthly savings.
- **Baseline Comparison**: Lock in a scenario and compare it against hypothetical changes.
- **Privacy First**: All data is stored locally in your browser (no server storage).
- **Export & Share**: Download as CSV/Excel or share via a unique encoded link.
- **AI Analysis**: Generate personalized financial prompts for ChatGPT.
- **UX Polish**: Global tooltips, dynamic form sliders, and $/% symbol auto-formatting.

## Technical Details
- **Frontend**: HTML5, CSS3, ES6+ JavaScript.
- **Visuals**: Chart.js for interactive line, doughnut, and stacked area charts.
- **Icons**: Lucide Icons.
- **Export**: XLSX.js for Excel generation.
- **Math**: Box-Muller transform for Gaussian random distribution in simulations.

## Documentation
- [Requirements & Feature List](REQUIREMENTS.md)
- [Calculation Engine (Internal)](script.js)

## Testing
The application includes a comprehensive integration test suite (`simple-tests.js`) that verifies over 2,500 financial scenarios. To run tests, open `simple-test-runner.html` in your browser.
