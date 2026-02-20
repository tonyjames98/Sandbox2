# Financial Projection Software - Requirements Document

## 1. Introduction
This document outlines the functional and non-functional requirements for the Financial Projection Software, a client-side application designed to help users visualize their long-term financial future through interactive projections, goal tracking, and cash flow analysis.

## 2. Product Overview
The application is a browser-based tool that allows users to input their current assets, liabilities, and expected future financial events. It provides a year-by-year projection of net worth, asset allocation, and financial health metrics.

## 3. Functional Requirements

### 3.1 Data Management
*   **FR-1.1: Local Persistence:** All user data (investments, events, goals, settings) shall be persisted in the browser's `localStorage`.
*   **FR-1.2: Data Reset:** Users shall have the ability to clear all local data and return to a clean state.
*   **FR-1.3: Data Portability:**
    *   **Export JSON:** Users can download their entire financial profile as a JSON file.
    *   **Import JSON:** Users can upload a previously exported JSON file to restore their profile.
    *   **Export CSV/Excel:** Users can export the projection results table to CSV or Excel formats for external analysis.

### 3.2 Investment & Asset Tracking
*   **FR-2.1: Asset Types:** Support for various asset categories including Stocks, Bonds, Cash, Real Estate, Cryptocurrency, and Other.
*   **FR-2.2: Debt Tracking:** Support for liabilities (e.g., Mortgages, Loans). Debts are treated as negative balances with custom interest rates and monthly payments.
*   **FR-2.3: Return Rates:** Each asset can have a custom annual return rate.
*   **FR-2.4: Target Allocation:** Users can define a target percentage for each asset to be used in automated rebalancing.

### 3.3 Financial Events & Cash Flow
*   **FR-3.1: Unified Event Interfaces:** The system shall provide unified screens for Income, Expense, Transfer, Withdrawal, and Rebalancing, with an optional "Recurring" toggle to switch between one-time and ongoing occurrences.
*   **FR-3.2: Event Types & Impacts:**
    *   **Income:** Increases total net worth. Can target a specific asset or be distributed proportionally.
    *   **Expense:** Reduces total net worth. Can be paid from a specific asset or proportionally.
    *   **Transfer:** Movement of funds between two assets. Preserves total net worth.
    *   **Withdrawal:** Movement of funds out of an asset. Supports both "External" (reduces net worth) and "Cash Account" (preserves net worth) destinations.
    *   **Rebalancing:** Automated portfolio realignment based on target allocations. (Always recurring).
*   **FR-3.3: Flexible Amount Logic:**
    *   **Fixed Amount:** Movements based on a static dollar value.
    *   **Percentage-based:** Movements calculated as a percentage of the source/target asset's current balance (supports Safe Withdrawal Rates, percentage-based savings, etc.).
*   **FR-3.4: Recurring Logic:** Recurring events shall support Monthly, Quarterly, or Annual frequencies and optional end dates.
*   **FR-3.5: Cash Flow Accounting:** The "Projection Timeline" shall explicitly log each event's impact for auditability.

### 3.4 What-If Scenarios & Baselines
*   **FR-4.1: Market Performance Slider:** Real-time adjustment of market returns (bull/bear offsets) across the entire portfolio.
*   **FR-4.2: Monthly Boost/Expense Slider:** Real-time simulation of additional monthly savings or expenses (supports negative values).
*   **FR-4.3: Targeted Impact:** Users can select a specific asset as the target for the What-If boost/expense.
*   **FR-4.4: Baseline Comparison:** Users can "Set Baseline" to save a snapshot of their current plan, then visualize deviations from that baseline as they adjust What-If sliders.
*   **FR-4.5: Scenario Persistence:** What-If settings are persisted in `localStorage` until explicitly reset.

### 3.5 Goal Tracking
*   **FR-5.1: Goal Categories:** Support for various goals including Retirement, Home Purchase, Emergency Fund, and Education.
*   **FR-5.2: Target Types:** Goals can target a specific "Total Net Worth" or a "Specific Asset Balance."
*   **FR-5.3: Purchase Simulation:** An optional "Deduct on Reach" feature shall simulate a large purchase by withdrawing the goal amount from the target asset once the goal is met.

### 3.6 Visualization & Analysis
*   **FR-6.1: Interactive Charts:** Provide stacked area charts for Net Worth Projections and Allocation Timelines, and donut charts for current Asset Allocation.
*   **FR-6.2: Drill-down Details:** Users can click on projection table rows or chart elements to see detailed annual breakdowns of assets, growth, and events.
*   **FR-6.3: Automated Insights:** A rule-based engine shall provide insights on emergency fund runway, debt leverage, high-interest debt, and portfolio diversification.
*   **FR-6.4: Milestone Celebrations:** The system shall automatically identify and highlight milestones (e.g., Millionaire Status, Debt Free, Financial Independence).

### 3.7 AI Integration
*   **FR-7.1: Prompt Generation:** The system shall generate a detailed, context-aware prompt containing the user's full financial state for use with external AI models.
*   **FR-7.2: One-click Launch:** Provide a direct integration link to open AI analysis tools with the generated prompt.

### 3.8 Shortcuts & Accessibility
*   **FR-8.1: Keyboard Shortcuts:** The application shall provide quick shortcuts for power users:
    *   `Ctrl/Cmd + N`: Add New Investment.
    *   `Ctrl/Cmd + E`: Add New Event.
    *   `Ctrl/Cmd + G`: Add New Goal.
    *   `Escape`: Close any open modal.
*   **FR-8.2: Visual Feedback:** The system shall provide "Toast" notifications for successful actions (e.g., "Data saved", "Data imported", "Link copied").
*   **FR-8.3: Sidebar & Menu:** Desktop users have a fixed sidebar for navigation, while mobile users use a hamburger-toggle menu.

---

## 4. Non-Functional Requirements

### 4.1 Usability & UX
*   **NFR-1.1: Responsive Design:** The UI shall be optimized for both Desktop (Sidebar navigation) and Mobile (Bottom navigation + Hamburger menu).
*   **NFR-1.2: Onboarding:** New users with an empty state shall be guided via visual pulse animations on primary call-to-action elements.
*   **NFR-1.3: Sample Data:** A "Try Sample Scenario" feature shall be provided to allow new users to instantly populate the app with realistic data for exploration.
*   **NFR-1.4: Theme Support:** Support for high-contrast Light and Dark modes.

### 4.2 Performance
*   **NFR-2.1: Calculation Speed:** 60-year projections with complex event logic shall complete in under 100ms.
*   **NFR-2.2: Responsiveness:** Charts shall resize and redraw smoothly during window resizing without page reloads.

### 4.3 Data Privacy & Portability
*   **NFR-3.1: Zero-Server Storage:** All user data must be stored locally in the browser's `localStorage`. No financial data shall be sent to any server.
*   **NFR-3.2: Portability:** Users shall be able to export/import their data via JSON and export projection timelines to CSV or Excel.

---

### 4.4 Quality & Reliability
*   **NFR-4.1: Data Consistency:** The system shall maintain consistent asset balances across projections, insights, and goal calculations.
*   **NFR-4.2: Input Sanitization:** All user inputs (names, descriptions) shall be sanitized to prevent basic XSS or UI corruption.
*   **NFR-4.3: Error Handling:** The application shall handle missing or corrupted `localStorage` data gracefully without crashing the UI.

## 5. Technical Specifications

### 5.1 Technology Stack
*   **Frontend:** HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript (ES6+).
*   **Icons:** Lucide Icons.
*   **Charts:** Chart.js.
*   **Data Processing:** SheetJS (for Excel exports).

### 5.2 Data Model
*   **Investment:** `id, name, type, amount, returnRate, monthlyPayment (for debt), createdAt`
*   **Event:** `id, type, description, amount, date, isRecurring, frequency, startDate, endDate, sourceAssetId, targetAssetId, valueType (fixed/percent)`
*   **Goal:** `id, name, category, amount, year, type, targetAssetId, deductOnComplete`

---

## 6. Quality Assurance
*   **QA-1.1: Test Suite:** A comprehensive suite of 2,600+ qualitative scenarios covering boundary testing, financial personas, and economic stress tests.
*   **QA-1.2: Accuracy:** Mathematical accuracy verified against standard compound interest and debt amortization formulas.
*   **QA-1.3: Real-time Validation:** Continuous regression testing of What-If sliders and Baseline comparison logic.
