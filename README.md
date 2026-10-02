# ⚡ FinTrade OS

<div align="center">
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white" alt="Zustand" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
</div>

<br/>

**FinTrade OS** is a high-performance, production-grade B2B Financial Operations and Inventory Management system. 

Engineered strictly for **scale, data immutability, and government tax compliance**, this platform moves beyond standard CRUD apps to simulate the complex architectural requirements of enterprise FinOps systems.

---

## 🚀 Advanced Engineering Features

### 🔐 Cryptographic System Audit Log (SHA-256)
Built a strictly immutable audit trail designed for financial security. Every critical system action (stock transfers, ledger adjustments, invoice generation) is permanently logged and cryptographically hashed using **SHA-256 checksums** to prevent unauthorized database tampering and ensure ledger integrity.

### 📡 Hardware & Government API Simulations
- **NIC E-Way Bill Integration:** Implemented a multi-step, asynchronous API handshake simulation mimicking the Indian Government's GST portal to generate 12-digit transportation E-Way Bills for invoices > ₹50,000.
- **RFID/Barcode Hardware Mocking:** Built a UI module that simulates WebUSB/Bluetooth hardware integration, allowing warehouse workers to "scan" high-value serial/batch numbers for dispatch.

### 🏢 Multi-Node Inventory & Relational State
Leveraged **Zustand** with persistent storage to create a complex, relational frontend database. 
- Tracks atomic stock levels across multiple physical godowns (warehouses).
- Implements strict validation to prevent over-drafting stock during intra-warehouse transfers.
- Computes real-time dynamic stock valuations using memoized hooks for zero-lag rendering.

### 🧾 Algorithmic Tax Engine (GST)
Features a dynamic billing engine that automatically resolves Inter-state vs. Intra-state B2B logic. It seamlessly computes **CGST, SGST, and IGST** liabilities based on the dealer's registered region, injecting the data directly into print-ready, barcode-embedded PDF templates.

---

## 🛠️ Architecture & Tech Stack

* **Core Engine:** React 18 with React Router v6 (Lazy-loaded routes)
* **Type Safety:** Strict TypeScript to enforce strict domain models (Products, Orders, Invoices, Godowns).
* **State Management:** Modular Zustand stores (Inventory, Orders, UI, Audit) with local-storage persistence simulating a distributed backend.
* **UI/UX Design System:** Custom-built, highly-dense Tailwind CSS components designed for "heads-down" data entry, avoiding generic consumer aesthetics.
* **Forms & Validation:** React Hook Form bound with Zod for rigorous input sanitization.

---

## ⚙️ Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/fintrade-os.git
   cd fintrade-os
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Spin up the dev server:
   ```bash
   npm run dev
   ```

> **Security Notice:** The application is gated by a mock authentication layer. Use the default Developer PIN: **1234** to access the system.

---

## 🧠 Why This Project Exists

This repository demonstrates advanced front-end capabilities specifically tailored for **Fintech and Enterprise SaaS** roles. It proves competency not just in rendering components, but in handling complex relational state, adhering to financial compliance regulations, and designing systems that prioritize data integrity and auditability.
