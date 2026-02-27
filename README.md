

## Project Structure

```
HackathonTemplate/
├── backend/
│   ├── auth/
│   │   ├── router.py      # Auth routes (login, signup, me)
│   │   ├── schemas.py     # Pydantic models
│   │   └── security.py    # Password hashing & JWT
│   ├── main.py            # FastAPI app
│   ├── database.py        # MongoDB connection
│   ├── config.py          # Configuration
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── app/
│   │   ├── page.tsx       # Landing page
│   │   ├── auth/
│   │   │   ├── login/     # Login page
│   │   │   └── signup/    # Signup page
│   │   └── dashboard/     # Dashboard pages
│   ├── components/        # React components
│   └── lib/               # Utilities & config
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the backend directory:
```env
MONGO_URI=mongodb://localhost:27017
MONGO_DB=morpheus_db
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

5. Make sure MongoDB is running on your system

6. Start the backend server:
```bash
uvicorn main:app --reload
```

The backend will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file (optional, defaults to localhost:8000):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

1. **Landing Page**: Visit `http://localhost:3000` to see the landing page
2. **Sign Up**: Click "Get Started" to create an account
3. **Login**: Use your credentials to log in
4. **Dashboard**: After login, you'll be redirected to the dashboard
5. **Features**: Navigate through the 5 features in the sidebar

## Customization

### Changing Feature Names

Edit `frontend/components/Sidebar.tsx` to change the feature names and icons:

```tsx
const menuItems = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard, shortText: "Home" },
  { name: "Your Feature", href: "/dashboard/feature1", icon: YourIcon, shortText: "Feature" },
  // ... more features
];
```

### Adding New Features

1. Create a new page in `frontend/app/dashboard/your-feature/page.tsx`
2. Add the route to the sidebar menu items
3. Implement your feature logic

### Styling

The project uses Tailwind CSS with custom CSS variables. Edit `frontend/app/globals.css` to customize colors and styles.

## Tech Stack

- **Backend**: FastAPI, MongoDB (Motor), Python
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Authentication**: JWT tokens, bcrypt password hashing
- **UI Components**: Radix UI, Lucide Icons

## License

This is a template project for hackathons. Feel free to use and modify as needed.
