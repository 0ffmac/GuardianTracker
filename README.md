# Guardian Tracking

Guardian Tracking is a full-stack GPS tracking system that allows you to monitor the location of your devices in real-time. It consists of a mobile client (Android) that sends location data to a Next.js backend, and a web-based dashboard to view the tracking data on a map.

## App Description

The application allows users to track their devices' location history. The main features are:

- **Real-time Location Tracking:** The mobile client sends GPS coordinates to the backend, which are then displayed on a map in the dashboard.
- **Tracking Sessions:** The application groups location data into tracking sessions, which can be reviewed individually.
- **Session Statistics:** For each session, the application calculates and displays statistics like total distance and duration.
- **Environment Scanning:** The mobile client can optionally scan for and send Wi-Fi and Bluetooth Low Energy (BLE) auras to the backend.

## How it Works

The system is composed of two main parts:

- **Next.js Backend/Frontend:** A full-stack application built with Next.js that provides a REST API for the mobile client and a web dashboard to visualize the data. It uses Prisma as the ORM to interact with a SQLite database. The map is rendered using Leaflet.js with OpenStreetMap tiles.
- **Mobile Client:** An Android application that tracks the device's location and sends the data to the backend. The mobile client is not included in this repository.

## Architecture Overview
```
┌──────────────────────────────────┐
│        Frontend (React 18)       │
│ ┌────────────┬───────────┬───────┐│
│ │ /          │ /dashboard│ /login││
│ │ /dashboard │ /dashboard│       ││
│ │ /map       │ /metrics  │       ││
│ └────────────┴───────────┴───────┘│
└──────────────────────────────────┘
                 ↓
┌──────────────────────────────────┐
│        Next.js API Routes        │
│ ┌────────────┬───────────┬───────┐│
│ │ /api/auth  │ /api/loca │ /api/ ││
│ │            │ tions     │ mobil ││
│ │ /api/start │ /api/stop │ e_log ││
│ │ _tracking  │ _tracking │ in    ││
│ │ /api/sync  │ /api/trac │ /api/ ││
│ │ _locations │ king_sess │ user/ ││
│ │            │ ion/[id]/ │ [id]  ││
│ │            │ environm  │       ││
│ │ /api/updat │ ent       │       ││
│ │ e_location │           │       ││
│ └────────────┴───────────┴───────┘│
└──────────────────────────────────┘
                 ↓
┌──────────────────────────────────┐
│         Backend (Next.js)        │
│ ┌──────────────────────────────┐ │
│ │ Business Logic & Data Proc.  │ │
│ │ - Location fusion & analysis │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
                 ↓
┌──────────────────────────────────┐
│   Database (SQLite + Prisma)     │
│ ┌──────────────────────────────┐ │
│ │ - Users & Authentication     │ │
│ │ - Location History & Track.  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

## Installation

To run the application locally, follow these steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/guardian-tracking.git
   cd guardian-tracking
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up the database:**
   Run the following command to create the SQLite database and apply the migrations:
   ```bash
   npx prisma migrate dev
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at [http://localhost:3000](http://localhost:3000).

## Deployment

The application is a standard Next.js project and can be deployed to any platform that supports Next.js, such as Vercel.

For more information on deploying Next.js applications, see the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying).