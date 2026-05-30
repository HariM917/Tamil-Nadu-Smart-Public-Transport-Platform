# Contributing to MobiTN

Thank you for your interest in contributing to MobiTN — the AI-Powered Smart Public Transport Platform for Tamil Nadu!

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature or fix: `git checkout -b feature/your-feature-name`
4. **Make your changes** and test them thoroughly
5. **Commit** with a clear message: `git commit -m "feat: add route search autocomplete"`
6. **Push** to your fork: `git push origin feature/your-feature-name`
7. **Open a Pull Request** against the `main` branch

## Development Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate      # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # Fill in your credentials
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env          # Fill in your credentials
npm run dev
```

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix   | Purpose                           |
|----------|-----------------------------------|
| `feat:`  | New feature                       |
| `fix:`   | Bug fix                           |
| `docs:`  | Documentation changes             |
| `style:` | Formatting (no logic changes)     |
| `refactor:` | Code restructuring             |
| `test:`  | Adding or updating tests          |
| `chore:` | Build, CI, or tooling changes     |

## Code Style

- **Python**: Follow PEP 8. Use type hints where possible.
- **JavaScript/React**: Use functional components with hooks. Keep components focused and reusable.
- **CSS**: Use Tailwind CSS utility classes.

## Reporting Issues

Open a [GitHub Issue](../../issues) with:
- A clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots if applicable

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
