import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from main import app as fast_app
from a2wsgi import ASGIMiddleware

# WSGI-compatible entrypoint so `gunicorn app:app` inside backend directory works seamlessly
app = ASGIMiddleware(fast_app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(fast_app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
