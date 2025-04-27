import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API route to handle extension download requests
 * 
 * @param {Request} request - The incoming request
 * @returns {NextResponse} - The response with the extension file
 */
export async function GET(request) {
  try {
    // Get the browser type from the query parameters
    const { searchParams } = new URL(request.url);
    const browser = searchParams.get('browser') || 'chrome';
    
    // Determine the file path based on the browser
    let filePath;
    let fileName;
    let contentType;
    
    if (browser.toLowerCase() === 'firefox') {
      filePath = path.join(process.cwd(), 'extension/dist/tradeforce-ai-trading-agent-firefox.xpi');
      fileName = 'tradeforce-ai-trading-agent-firefox.xpi';
      contentType = 'application/x-xpinstall';
    } else {
      // Default to Chrome
      filePath = path.join(process.cwd(), 'extension/dist/tradeforce-ai-trading-agent-chrome.zip');
      fileName = 'tradeforce-ai-trading-agent-chrome.zip';
      contentType = 'application/zip';
    }
    
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.error(`Extension file not found: ${filePath}`);
      return NextResponse.json(
        { error: 'Extension file not found. Please run the packaging script first.' },
        { status: 404 }
      );
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(filePath);
    
    // Create the response with the file
    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString()
      }
    });
    
    return response;
  } catch (error) {
    console.error('Error downloading extension:', error);
    return NextResponse.json(
      { error: 'Failed to download extension' },
      { status: 500 }
    );
  }
}
