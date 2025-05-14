# TradeForce AI Dashboard Access Script
Write-Host "Opening TradeForce AI Dashboard..." -ForegroundColor Green

# Open the TradeForce AI dashboard in the default browser
Start-Process "http://localhost:3008/tradeforce-ai"

Write-Host "Dashboard opened in your default browser." -ForegroundColor Green
Write-Host "If the browser didn't open automatically, please navigate to: http://localhost:3008/tradeforce-ai" -ForegroundColor Yellow
