# My Projection Calculator - Requirements & Documentation

This document outlines the core requirements, features, and technical specifications for the "My Projection Calculator" financial planning tool.

## 1. Core Mission
To provide a fast, privacy-focused, and visual way for users to project their financial future without requiring signups or storing personal data on servers.

## 2. Functional Requirements

### 2.1 Asset & Debt Management
- **Add Assets**: Support for Stocks, Bonds, Real Estate, Cash, Crypto, and Mutual Funds.
- **Custom Return Rates**: Each asset can have its own expected annual return rate.
- **Debt Tracking**: Support for loans/debt with interest rates and mandatory monthly payments.
- **Debt Funding Source**: Ability to select a specific asset account or "Proportional" as the source for debt repayments.
- **Target Allocation**: Ability to set a target percentage for each asset to support automated rebalancing.

### 2.2 Financial Events
- **One-time Events**: Single-instance income or expenses (e.g., "Sell Car", "Bonus").
- **Recurring Events**: Support for monthly, quarterly, or annual recurring cash flows.
- **Transfers & Withdrawals**: Move money between accounts or simulate external withdrawals (fixed or percentage-based).
- **Flexible End Dates**: Recurring events can run for a specific duration or the entire projection.
- **Automated Rebalancing**: Simulation of periodic (annual) portfolio rebalancing back to target allocations.

### 2.3 Projection Engine
- **Net Worth Calculation**: Real-time projection of net worth over 1 to 60 years.
- **Goal Bridge Advice**: Actionable advice for goals that are "Off Track," calculating the exact additional monthly savings needed to reach the target based on expected asset returns.
- **Automatic Updates**: Real-time re-calculation of projections when years or any data point is modified.
- **Inflation Adjustment**: Option to discount future values to "today's dollars" using a custom inflation rate.
- **What-If Scenarios**: Real-time interactive sliders for market performance offsets and monthly savings boosts/expenses.
- **Baseline Comparison**: Capability to "lock" a scenario as a baseline and compare it against experimental changes.
- **Monte Carlo Simulation**: Advanced probabilistic modeling using random market fluctuations (100-1,000 iterations) to show Best Case, Worst Case, and Probability of Success.

### 2.4 Data & Privacy
- **Local Storage**: All data is saved strictly in the user's browser `localStorage`.
- **Autosave**: Real-time synchronization with `localStorage` on every change, with visual toast confirmation.
- **Export/Import**: Support for exporting data as JSON and importing it back.
- **Data Portability**: Ability to export the projection timeline to CSV or Excel.
- **Shareable Links**: Generate a unique URL containing encoded data for sharing scenarios without a backend.
- **Data Reset**: One-click option to clear all local data.

### 2.5 Visualization & UI
- **Interactive Charts**:
  - Net Worth Projection (Line chart)
  - Asset Allocation (Doughnut chart)
  - Asset Allocation Over Time (Stacked area chart)
  - Monte Carlo Probability (Line chart with percentile bands)
- **KPI Dashboard**: Modern 3-column view (Current Net Worth, Portfolio Summary, Projected Future) with direct action buttons.
- **Detailed Timeline**: Year-by-year breakdown table with "Year Details" modal. Mobile-responsive card view for easier reading on narrow screens.
- **Advanced Simulations**: Standalone calculators for FIRE SWR, Sequence of Returns, Compound Interest, and Loan Amortization.
- **Responsive Design**: Optimized for desktop, tablet, and mobile (sidebar vs bottom navigation).
- **Dark Mode**: Locked-in dark theme for a modern, high-contrast financial UI.
- **Global Tooltips**: Context-sensitive guidance for every major feature, managed via a global portal to prevent clipping.

### 2.6 UX Features
- **3-Step Guided Onboarding**: Step-by-step guidance tips (Step 1: Add Assets/Debt -> Step 2: Add Events -> Step 3: Set Timeframe). Tips can be dismissed/disabled using the "×" button.
- **Keyboard Shortcuts**: `Alt+A` (New Asset), `Ctrl+E` (New Event), `Ctrl+G` (New Goal), `Esc` (Close Modals/Tooltips).
- **Toast Notifications**: Modern animated feedback for user actions (Save, Delete, Errors) with status icons.
- **AI Integration**: One-click prompt generator for advanced analysis in external AI tools (like ChatGPT).
- **Dynamic Input Polish**: Real-time $ and % symbol formatting. Stacked input/slider layout for improved readability of large figures.
- **Enhanced Empty States**: Visual illustrations and quick-action buttons for empty lists.

## 3. Technical Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **Charts**: Chart.js.
- **Icons**: Lucide Icons.
- **Data Processing**: XLSX.js (Excel export).
- **State Management**: Local variables synchronized with `localStorage`.
- **Probabilistic Modeling**: Box-Muller transform for Gaussian random distribution in Monte Carlo simulations.

## 4. Testing Coverage
The application is verified by a custom integration test suite (`testing/simple-tests.js`) covering over 3,500 scenarios, including:
- Persona lifecycles (500 tests)
- Debt & interest dynamics (200 tests)
- Economic sensitivity (250 tests)
- Goal & purchase simulations (100 tests)
- Event variations & frequency math (150 tests)
- Automated rebalancing (100 tests)
- Milestones & Insights (100 tests)
- Data portability & encoding (20 tests)
- Withdrawals & Transfers (150 tests)
- UI Component stability (100 tests)
- Percentage-based cash flow (150 tests)
- What-If boost/expense (50 tests)
- Baseline comparison (100 tests)
- Data lifecycle (100 tests)
- UX features & Tooltips (150 tests)
- Monte Carlo Probability (150 tests)
- Form Polish & Symbols (80 tests)
- Goal Bridge Calculations (50 tests)
