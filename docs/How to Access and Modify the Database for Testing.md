# How to Access and Modify the Database for Testing

## Overview

This guide will walk you through connecting to and interacting with the Oyster
PostgreSQL development database. This is essential for adding test data,
experimenting with changes, and troubleshooting during development.

**Prerequisites:**

- **Docker:** Docker should be installed and running on your system.
- **PostgreSQL:** Have PostgreSQL (or psql) installed if you want to connect via
  the command line. REMEMBER YOUR PASSWORD.
- **(Optional) pgAdmin 4:** Install pgAdmin 4 if you prefer a graphical user
  interface for database management.

## Steps

1. **Database Setup:**

   Open your terminal, navigate to the project's root directory, and run:

   ```
   yarn dx:up
   ```

   This command starts the necessary Docker containers, including the PostgreSQL
   database and Redis for development.

2. **Connect to the Database:**

   You have two options for connecting:

   - **Command Line (psql):**

     1. Connect:

        ```bash
        psql postgresql://oyster:oyster@localhost:5433/oyster
        ```

        Enter your `POSTGRES_PASSWORD` when prompted.

   - **pgAdmin 4 (GUI):**
     1. Open pgAdmin 4.
     2. Right-click on "Servers" and select "Register > Server..."
     3. In the "General" tab, give your server a **name** (e.g., "oyster dev").
     4. Switch to the "Connection" tab and fill in:
        - Host: `localhost`
        - Port: `5433`
        - Maintenance Database: `oyster`
        - Username: `oyster`
        - Password: `oyster`
     5. Click "Save".

3. **Verify the Connection:**

   - **Command Line:** You should see the `oyster=#` prompt.
   - **pgAdmin 4:** You should see the "Oyster Dev" server listed under
     "Servers".

4. **Modify the Database:**

   Now you can use SQL/PSQL commands in the psql shell or pgAdmin 4's interface
   to:

   - Insert dummy data for testing
   - Create, update, or delete tables
   - Run queries to inspect data

## Troubleshooting

- **Connection Issues:**
  - Ensure the Docker container is running.
  - Double-check the hostname, port, database name, username, and password.
    [How to get docker container information from CLI](https://stackoverflow.com/questions/25540711/docker-postgres-pgadmin-local-connection)
- **PostgreSQL Installation:**
  - If you're having trouble with psql, make sure PostgreSQL is correctly
    installed. Refer to the official documentation if needed.

Let me know if you need help with specific SQL commands or have any other
questions! [author](https://github.com/wflore19)
