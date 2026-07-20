import os
import sys

# Add backend directory to path
backend_path = os.path.join(os.path.dirname(__file__), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from main import app as fast_app
from a2wsgi import ASGIMiddleware

# WSGI-compatible entrypoint so default `gunicorn app:app` works seamlessly
app = ASGIMiddleware(fast_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(fast_app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
