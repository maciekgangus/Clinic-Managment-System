# Graph Algorithm Visualization App

A Node.js + Express based web application for managing a medical clinic. The system supports different user roles **(Admin, Doctor, Receptionist)**, allowing secure access and interaction with functionalities such as patient registration, appointment scheduling, prescriptions, diagnoses, and work statistics.

The app uses **EJS templates** for views, **Bootstrap** for styling, and a **PostgreSQL** database that initializes automatically with example data for testing.
![App Screenshot](ScreenMaze.png)

## Table of Contents
- [Description](#description)
- [Installation](#installation)
- [Usage](#usage)
- [Login Credentials](#login credentials)
- [Technologies](#technologies)



## Description

This application provides a complete workflow for managing clinic operations with multiple user roles. The database initializes automatically with demo data, so you can start testing immediately.
### Key Features:
- **Role-Based Access**: 
    - Admin
    - Doctor
    - Receptionist
- **Patient Managment**: Add and view patients.
- **Appointentments**: Schedule and view doctor appointments,
- **Visits & Prescriptions**: Doctors can run visits, add diagnoses, and prescribe medication.
- **Statistics**: Doctors can view work statistics.
- **Session-Based Authentication**: Login sessions handled securely.

## Installation

To get started with the project locally, follow these steps:

1. **Clone the repository**:
   ```bash
    git clone https://github.com/maciekgangus/Clinic-Managment-System.git
   ```
2. **Navigate to the project directory**:
   ```bash
    cd Pathfinding-Visualizer
    ```
3. **Install Docker https://www.docker.com/products/docker-desktop**:
   ```bash
    docker --version
    ```
4.  **Build and run containers**:
   ```bash
    docker-compose up --build
   ```

## Usage

**Acces the app by typing the following in your browser**:
```
localhost:4000
```

## Login Credentials

| Role       | Username    | Password        |
|------------|-------------|-----------------|
| Admin      | `admin1`    | `adminpass123`  |
| Doctor     | `lekarz1`   | `lekarzpass`    |
| Reception  | `recepcja1` | `recepcjapass`  |


### Roles and Permissions

- **Admin**: 
    - Add new users (doctors/receptionists) via the admin panel.
    - Remove users from the system.
    - View the list of the users.
- **Receptionist**: 
    - Register new patients.
    - Schedule appointment for patients.
    - View doctors' calendar.
    - Check history of patients' visits.
- **Doctor**:
    - Access the calendar and conduct scheduled visits.
    - Add diagnoses and prescribe medications.
    - View statistics of performed visits.

### Test Data

The PostgreSQL database is automatically initialized with example users and test data during first run.


## Technologies

- **Node.js**: Server-side runtime.
- **Express.js**: Web framework for routing and backend logic.
- **EJS**: Template engine for rendering dynamic HTML.
- **PostgreSQL**: Database.
- **Bootstrap**: Styling and layout of views.

