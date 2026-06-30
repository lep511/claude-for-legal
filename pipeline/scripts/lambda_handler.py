"""AWS Lambda handler wrapping the FastAPI application via Mangum."""

import os

os.environ.setdefault("API_HOST", "0.0.0.0")
os.environ.setdefault("API_PORT", "8080")

from mangum import Mangum
from api_server import app

handler = Mangum(app, lifespan="off")
