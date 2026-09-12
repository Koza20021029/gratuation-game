#!/bin/bash
cd "$(dirname "$0")"

# 啟用虛擬環境
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# 啟動伺服器
python3 server.py
