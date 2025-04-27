@echo off
echo Starting Token Discovery MCP Server...

REM Update MCP settings
echo Updating MCP settings...
cd /d %~dp0\scripts
call update-mcp-settings.bat

REM Start the Token Discovery MCP server
echo Starting Token Discovery MCP server...
cd /d %~dp0\mcp\token-discovery-mcp
call start-server.bat
