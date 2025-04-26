@echo off
echo Starting Token Discovery MCP Server...
cd /d %~dp0
node start-server.js
pause
