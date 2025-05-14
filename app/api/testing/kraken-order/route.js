// API route for testing Kraken Order functionality
import { NextResponse } from 'next/server';
import tradeExecutionService from '../../../lib/tradeExecutionService';
import logger from '../../../lib/logger';

export async function GET() {
  try {
    // Initialize Kraken service
    if (!tradeExecutionService.krakenInitialized) {
      await tradeExecutionService.initializeKraken();
    }
    
    // HTML for testing Kraken order functionality
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kraken Order Test</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
      </head>
      <body class="bg-gray-900 text-white p-8">
        <div class="max-w-2xl mx-auto">
          <h1 class="text-2xl font-bold mb-6">Kraken Order Test</h1>
          
          <div class="mb-8 p-4 bg-gray-800 rounded-lg">
            <h2 class="text-xl font-semibold mb-4">Test Validation</h2>
            <p class="mb-4">Click the button below to test order validation (no real order will be placed)</p>
            <button id="testValidationBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded">
              Test Order Validation
            </button>
            <div id="validationResult" class="mt-4 p-3 hidden"></div>
          </div>
          
          <div class="p-4 bg-gray-800 rounded-lg">
            <h2 class="text-xl font-semibold mb-2">Manual Testing</h2>
            <p class="text-sm text-gray-400 mb-4">For manual testing of the KrakenOrderForm component, navigate to the ExchangeConnector component and use the form there.</p>
          </div>
        </div>
        
        <script>
          document.getElementById('testValidationBtn').addEventListener('click', async () => {
            try {
              const resultDiv = document.getElementById('validationResult');
              resultDiv.innerHTML = 'Testing...';
              resultDiv.className = 'mt-4 p-3 bg-yellow-900/50 text-yellow-200';
              resultDiv.classList.remove('hidden');
              
              const response = await fetch('/api/testing/validate-kraken-order');
              const result = await response.json();
              
              if (result.success) {
                resultDiv.innerHTML = '<p class="font-bold">Validation Successful!</p><pre class="mt-2 text-xs overflow-auto">' + 
                  JSON.stringify(result.data, null, 2) + '</pre>';
                resultDiv.className = 'mt-4 p-3 bg-green-900/50 text-green-200';
              } else {
                resultDiv.innerHTML = '<p class="font-bold">Validation Failed:</p><p class="text-red-400">' + 
                  result.error + '</p>';
                resultDiv.className = 'mt-4 p-3 bg-red-900/50 text-red-200';
              }
            } catch (error) {
              const resultDiv = document.getElementById('validationResult');
              resultDiv.innerHTML = '<p class="font-bold">Error:</p><p class="text-red-400">' + 
                error.message + '</p>';
              resultDiv.className = 'mt-4 p-3 bg-red-900/50 text-red-200';
              resultDiv.classList.remove('hidden');
            }
          });
        </script>
      </body>
      </html>
    `;
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    logger.error('Error rendering Kraken order test page:', error);
    return NextResponse.json({
      error: 'Failed to render test page: ' + error.message
    }, { status: 500 });
  }
}
