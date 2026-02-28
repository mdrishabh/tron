"""
Main FastAPI application for Tron.
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

logger = logging.getLogger("tron.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    # Initialize database
    from tron.core.database import init_db
    await init_db()
    logger.info("Tron database initialized")
    yield
    logger.info("Tron shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Tron — AI Telecaller Platform",
        description="Self-hosted AI telecaller for Indian markets",
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS — allow all origins for local dev
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API routes
    from tron.api.router import api_router
    app.include_router(api_router, prefix="/api/tron")

    # Mount WebSocket
    from tron.api.websocket import ws_router
    app.include_router(ws_router)

    # Serve frontend static files
    web_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "web", "dist")
    if os.path.exists(web_dist):
        app.mount("/assets", StaticFiles(directory=os.path.join(web_dist, "assets")), name="assets")

        @app.get("/")
        @app.get("/{full_path:path}")
        async def serve_frontend(full_path: str = ""):
            # Don't intercept API or WebSocket routes
            if full_path.startswith("api/") or full_path.startswith("ws"):
                from fastapi import HTTPException
                raise HTTPException(status_code=404)
            index_file = os.path.join(web_dist, "index.html")
            if os.path.exists(index_file):
                return FileResponse(index_file)
            return {"message": "Tron API is running. Build the frontend with: cd tron/web && npm run build"}
    else:
        @app.get("/")
        async def root():
            return {
                "message": "Tron API is running",
                "version": "1.0.0",
                "frontend": "Build with: cd tron/web && npm install && npm run build",
                "api_docs": "/docs",
            }

    return app
