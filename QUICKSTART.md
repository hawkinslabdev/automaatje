## Getting Started

As of right now, we're focussing on launching the first version. That means that there's no image available; you'll have to build the application yourself. To get Automaatje running on your local machine, follow these steps:

### Prerequisites
- Node.js (v25 or higher)
- npm

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/melosso/automaatje.git
    cd automaatje
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up your environment:**
    Copy the example environment file and fill in the required variables.
    ```bash
    cp .env.example .env
    ```

4.  **Run database migrations:**
    This will set up the SQLite database schema.
    ```bash
    npm run db:migrate
    ```

5.  **Start the development server:**
    ```bash
    npm run dev
    ```

When we've reached the first major version, you'll be able to use Docker to host this quickly.

Access the application at **http://localhost:3123**.

The first user to register automatically becomes an administrator. Follow the on-screen setup wizard to configure your account.

### PWA Generation

For future reference, since we may change the icons:

```bash
cd /mnt/d/Repository/automaatje/automaatje && npx pwa-asset-generator public/pwa/icons/icon-512x512.png public/pwa --background "#6a93a0" --splash-only --type png --quality 100 --dark-mode false --index app/layout.tsx --manifest public/pwa/manifest.json
```` 