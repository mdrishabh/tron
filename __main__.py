"""
Entry point for standalone mode: python -m tron
"""
import uvicorn
import webbrowser
import threading
import time
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tron.api.app import create_app

def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://localhost:8100")

def main():
    print("=" * 60)
    print("  TRON — AI Telecaller Platform")
    print("  Version 1.0.0")
    print("=" * 60)
    print()
    print("  Starting on http://localhost:8100")
    print("  Press Ctrl+C to stop")
    print()

    # Open browser after server starts
    threading.Thread(target=open_browser, daemon=True).start()

    app = create_app()
    uvicorn.run(app, host="0.0.0.0", port=8100, log_level="info")

if __name__ == "__main__":
    main()
