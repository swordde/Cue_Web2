# Club Booking App

This is a Vite + React project for a club booking system, using Tailwind CSS and React Router.

## User Navigation Pipeline

```mermaid
flowchart TD
    A[Home Page] -->|Login/Register| B(Login Page)
    B -->|Success| C(Dashboard)
    A -->|Go to Dashboard| C
    A -->|Go to User Panel| D(User Panel)
    C -->|Book a Game| E(Booking Page)
    C -->|Purchase| F(Purchase Page)
    C -->|Gifts| G(Gifts Page)
    C -->|Party Booking| H(Party Booking Page)
    C -->|Food/Menu| I(Food/Menu Page)
    C -->|Home Delivery| J(Home Delivery Page)
    C -->|Logout| A
    E -->|Booking Confirmed| D
    D -->|Edit/Cancel Booking| D
    D -->|Book a Game| E
    D -->|Logout| A
    C -->|Admin Only: Admin Panel| K(Admin Panel)
    K -->|Logout| A
    K -->|Edit/Cancel Booking| K
    K -->|Analytics/Export| K
    style K fill:#f9f,stroke:#333,stroke-width:2px
    style C fill:#bbf,stroke:#333,stroke-width:2px
    style D fill:#bfb,stroke:#333,stroke-width:2px
    style E fill:#ffb,stroke:#333,stroke-width:2px
    style A fill:#fff,stroke:#333,stroke-width:2px
    style B fill:#eee,stroke:#333,stroke-width:2px
    style F fill:#fff,stroke:#333,stroke-width:2px
    style G fill:#fff,stroke:#333,stroke-width:2px
    style H fill:#fff,stroke:#333,stroke-width:2px
    style I fill:#fff,stroke:#333,stroke-width:2px
    style J fill:#fff,stroke:#333,stroke-width:2px
```

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start the development server:
   ```sh
   npm run dev
   ```

## Features
- Tailwind CSS for styling
- React Router for navigation
- Modular folder structure for components, pages, and mock data

## Folder Structure
- `src/components` - Reusable UI components
- `src/pages` - Main app pages
- `src/data` - Mock data for games and slots
