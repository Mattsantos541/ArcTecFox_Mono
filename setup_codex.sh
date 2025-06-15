#!/bin/bash
set -e  # Exit on first error

echo "🛠️ Setting up Codex environment..."

# === Trust Codex network proxy ===
export NODE_EXTRA_CA_CERTS=$CODEX_PROXY_CERT
export PIP_CERT=$CODEX_PROXY_CERT

# === Setup Lite Backend ===
echo "📦 Setting up Lite backend Python environment..."
cd apps/lite/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
cd ../../../..

# === Setup Lite Frontend ===
echo "📦 Installing Lite frontend dependencies..."
cd apps/lite
npm install
cd ../..

# === Setup V1 Backend ===
echo "📦 Setting up V1 backend Python environment..."
cd apps/v1/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install fastapi uvicorn python-dotenv openai pandas pyjwt \
  python-jose passlib python-multipart supabase
deactivate
cd ../../..

# === Setup V1 Frontend ===
echo "📦 Installing V1 frontend dependencies..."
cd apps/v1/frontend
npm install
cd ../../..

echo "✅ Codex setup complete."

# === Optional Debug Output ===
echo "🔐 SUPABASE_URL: $SUPABASE_URL"
echo "🔐 OPENAI_API_KEY: $OPENAI_API_KEY"
