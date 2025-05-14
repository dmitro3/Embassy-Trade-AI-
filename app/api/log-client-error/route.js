// API route to log client-side errors

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Extract data from request
    const { errors, url, userAgent } = body;
    
    // Log to server console for now
    console.error(`[CLIENT ERROR] ${timestamp} - ${url} - ${userAgent}`);
    errors.forEach((error, index) => {
      console.error(`[CLIENT ERROR ${index + 1}] ${error.timestamp} - ${error.message}`);
    });
    
    // Here you could also write to a log file or database
    // For now we're just logging to the server console
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing client error log:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
