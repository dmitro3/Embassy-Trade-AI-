@echo off
echo Starting all MCP servers for TradeForce AI...

echo.
echo Starting SHYFT Data Normalization MCP Server...
start "SHYFT Data MCP" cmd /c "cd mcp\shyft-data-mcp && start-server.bat"

echo.
echo Starting Token Discovery MCP Server...
start "Token Discovery MCP" cmd /c "cd mcp\token-discovery-mcp && start-server.bat"

echo.
echo All MCP servers started successfully!
echo.
echo You can now use these MCP servers in your TradeForce AI application.
echo To stop the servers, close their respective command windows.
echo.
