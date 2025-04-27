@echo off
echo Updating MCP settings to include Token Discovery MCP server...
cd /d %~dp0
node update-mcp-settings.js
pause
