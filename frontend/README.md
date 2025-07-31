## Project Structure

- `src/` - Main source code directory
  - `components/` - Reusable UI components
  - `contexts/` - React context providers for global state
  - `hooks/` - Custom React hooks (e.g., authentication)
  - `pages/` - Main page components (e.g., DashboardPage.jsx)
  - `services/` - API service modules for backend communication
  - `utils/` - Utility/helper functions
  - `assets/` - Static assets (images, icons, etc.)
  - `index.css` - Global styles (Tailwind CSS)
  - `main.jsx` - App entry point
- `public/` - Static files served directly
- `index.html` - Main HTML template

## Main Features

- **Dashboard**: Visual summary of logistics data (goods received, in transit, clients, etc.)
- **Cargo Tracking**: Table of transiting cargos with details
- **Client Distribution**: Visual stats on client activity
- **Authentication**: Secure login and token management

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Customization

- **Styling**: Modify `tailwind.config.js` and `index.css` for custom styles.
- **Components**: Add or update components in `src/components/`.
- **Pages**: Add new pages in `src/pages/` and update routing as needed.

## Contribution Guidelines

- Follow consistent code style (see ESLint config)
- Use functional components and hooks
- Write clear commit messages

## Troubleshooting

- If you encounter issues, check the browser console and terminal for errors.
- Ensure the backend API is running and accessible.
