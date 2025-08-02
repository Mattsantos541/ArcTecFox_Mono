#!/bin/bash
# Fix GPG signing issues in Codespaces
# Run this script if you encounter GPG commit signing errors

echo "🔧 Fixing Git GPG signing configuration..."

# Disable GPG signing globally and locally
git config --global commit.gpgsign false
git config --local commit.gpgsign false

# Clear any GPG program configurations
git config --global --unset gpg.program 2>/dev/null || true
git config --local --unset gpg.program 2>/dev/null || true

# Remove any duplicate gpgsign entries
git config --global --unset-all commit.gpgsign 2>/dev/null || true
git config --local --unset-all commit.gpgsign 2>/dev/null || true

# Set them back to false
git config --global commit.gpgsign false
git config --local commit.gpgsign false

echo "✅ Git GPG configuration fixed!"
echo "📋 Current settings:"
echo "   Global GPG signing: $(git config --global commit.gpgsign)"
echo "   Local GPG signing: $(git config --local commit.gpgsign)"