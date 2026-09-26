"""
COMMENTED PROJECT COPY — setup.py

Purpose: Action/tool module (setup). Implements the setup capability that can be invoked by the main assistant or agent.

The comments/docstrings in this copy are explanatory. Keep API credentials private;
configure your own keys locally and never commit config/api_keys.json.
"""
import subprocess
import sys

print("Installing requirements...")
subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)

print("Installing Playwright browsers...")
subprocess.run([sys.executable, "-m", "playwright", "install"], check=True)

print("\n✅ Setup complete! Run 'python main.py' to start MARK XXV.")