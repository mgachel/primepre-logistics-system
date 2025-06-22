# 📦 Primepre Logistics System

This is a capstone project developed by Computer Science students from the University of Ghana for **Primepre**, a China-to-Ghana logistics and procurement company. The project aims to digitally transform Primepre's operations by building an all-in-one logistics management platform.

---

## 📚 Table of Contents

- [Project Overview](#project-overview)
- [System Features](#system-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Folder Structure](#folder-structure)
- [Getting Started](#getting-started)
- [Contributing](#contributing)
- [Team Members](#team-members)
- [Project Timeline](#project-timeline)
- [License](#license)

---

## 🚀 Project Overview

**Primepre** specializes in sourcing, shipping, customs clearance, warehousing, and last-mile delivery between China and Ghana. The logistics system will digitize and automate the following key components:

- Supplier database and performance tracking
- Shipment coordination (air & sea)
- Inventory management in China and Ghana
- Goods received tracking
- Admin dashboard with analytics
- Real-time tracking & customer updates
- Excel import/export support
- Integrated communication tools (SMS/WhatsApp)

---

## 🧩 System Features

| Module | Description |
|--------|-------------|
| Supplier Management | Add, update, and track Chinese suppliers |
| Warehouse Management | Barcode-based inventory in China & Ghana |
| Goods Received (China) | Bulk Excel uploads to register items before shipping |
| Goods Received (Ghana) | Manual item logging with daily filtering |
| Shipping Coordination | Track shipping containers, CBM, air freight, sea cargo |
| Admin Dashboard | Operational KPIs, analytics, reports |
| Communication | Customer updates via SMS and WhatsApp |
| Documentation System | Uploads, invoices, bills of lading |

> ❌ Financial modules (wallets, revenue, expenses) have been excluded.

---

## 🛠️ Technology Stack

| Layer | Tech |
|-------|------|
| Backend | Django, Django REST Framework |
| Frontend | React.js, TailwindCSS |
| Database | PostgreSQL |
| DevOps | Docker, GitHub Actions, Railway/Render |
| Auth | Django AllAuth or SimpleJWT |
| File Storage | Cloudinary / S3-compatible storage |
| Communication APIs | Twilio (SMS), WhatsApp Cloud API |

---

## 🏗️ System Architecture

[Frontend: React] → [Django REST API] → [PostgreSQL Database]
↓
[File Uploads: Cloudinary/S3]
↓
[Notifications: Twilio / WhatsApp API]



Each module is isolated by functionality but integrated through RESTful APIs.

---

## 📁 Folder Structure

primepre-logistics-system/
├── backend/
# Django backend
│ └── primepre/ 
# Main project app
├── frontend/ 
# React frontend
├── devops/
# Docker, NGINX, CI configs
├── docs/ 
# Diagrams, requirements, documentation
├── .gitignore
├── README.md
└── LICENSE



---

## 🧪 Getting Started

### 🔧 Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Git
- Docker (optional)

### ⚙️ Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver


💻 Frontend Setup
cd frontend
npm install
npm run dev


🐘 PostgreSQL Config (env)

DB_NAME=primepre
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost



🧑‍💻 Contributing
We use a feature-branch model. Here’s how to contribute:

1. CLone the Repository
git clone https://github.com/YOUR_USERNAME/primepre-logistics-system.git

2.git checkout -b feature/module-name

3. git commit -m "Add: goods received ghana module"

4. Push and make a Pull Request.


👨‍👩‍👧‍👦 Team Members

| Role               | Name     | Responsibilities          |
| ------------------ | -------- | ------------------------- |
| Backend Developer  | \[Michael] | Django models, APIs, DB   |
| Backend Developer  | \[Francis] | Admin logic, integrations |
| Frontend Developer | \[Crystal] | React components          |
| Frontend Developer | \[Bright] | Data fetching, UI logic   |
| UI/UX Designer     | \[Gabriel] | User flows, wireframes    |
| UI/UX Designer     | \[Sherriffa] | Prototypes, color palette |
| DevOps Engineer    | \[Isabella] | CI/CD, Docker, deployment |



🧠 Acknowledgements
University of Ghana, Department of Computer Science

Primepre Logistics Ltd







