@echo off
echo Running Token Discovery MCP Server tests...
cd /d %~dp0
node test-server.js
pause
