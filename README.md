# ⚡ FinTrade OS

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white)

**FinTrade OS** is an enterprise-grade, front-end B2B Inventory, Order Management, and GST Billing application designed specifically for wholesale trading companies. 

Built with an intense focus on dense, professional UI/UX, data immutability, and government compliance, this system mimics the workflows of industry-standard ERPs like Zoho Inventory or SAP Business One.

---

## ✨ Enterprise Features

### 🏢 Multi-Godown (Warehouse) Architecture
Manage stock across multiple physical locations (e.g., Main Warehouse, City Showroom, Transit). Includes a dedicated UI for executing intra-warehouse stock transfers with immediate validation against maximum stock limits.

### 🏷️ Serial & Batch Tracking (with RFID Simulation)
Track high-value inventory like Transformers and MCCBs down to the individual unit level. Features color-coded availability statuses and a simulated hardware integration module for WebUSB/Bluetooth RFID scanners.

### 🇮🇳 Automated NIC E-Way Bill & GST Invoicing
Automates compliance for B2B transactions. Invoices exceeding ₹50,000 trigger a multi-step API handshake simulation with the Indian Government's NIC portal, generating a unique 12-digit E-Way Bill number and a scannable QR Code matrix directly on the print-ready invoice.

### 🔒 Immutable System Audit Log
Every critical action (stock adjustments, invoice generation, product deletion) is permanently logged in a centralized audit trail. Each log entry is cryptographically stamped with a SHA-256 checksum to ensure data integrity and prevent tampering.

### 📊 Real-Time Analytics & Reporting
Instantly calculate stock valuation, sales distributions, and aggregated GST liabilities using high-performance memoized hooks.

---

## 🛠️ Technology Stack

* **Core:** React 18, React Router v6
* **Language:** TypeScript (Strict Mode)
* **State Management:** Zustand (with local storage persistence)
* **Styling:** Tailwind CSS (Custom design system avoiding generic "startup" aesthetics)
* **Forms & Validation:** React Hook Form, Zod
* **Build Tool:** Vite

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18 or higher)
* npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/fintrade-os.git
   cd fintrade-os
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

> **Note:** The application uses a mandatory Security PIN gate. The default PIN for local development is **1234**.

---

## 📸 Core Workflows

1. **Adding Inventory:** Navigate to the Inventory tab to add new switchgears or transformers. Assign minimum order quantities (MOQ) and HSN codes.
2. **Transferring Stock:** Open a product drawer and click "Transfer" to move physical stock between your warehouses.
3. **Generating Invoices:** Draft a B2B order, apply CGST/SGST/IGST automatically, and generate an E-Way Bill before printing the final PDF.
4. **Security Auditing:** Review the Reports > System Audit Log tab to trace exactly which employee triggered a specific stock movement or invoice.

---

## 👨‍💻 Developer

Built to demonstrate advanced front-end architecture, strict type safety, and domain-driven design in the context of complex B2B logistics.
