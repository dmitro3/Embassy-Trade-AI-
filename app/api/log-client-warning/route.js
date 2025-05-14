// API route to log client-side warnings

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Get current timestamp
    const timestamp = new Date().toISOString();
    
    // Extract data from request
    const { warnings, url, userAgent } = body;
    
    // Log to server console for now
    console.warn(`[CLIENT WARNING] ${timestamp} - ${url} - ${userAgent}`);
    warnings.forEach((warning, index) => {
      console.warn(`[CLIENT WARNING ${index + 1}] ${warning.timestamp} - ${warning.message}`);
    });
    
    // Here you could also write to a log file or database
    // For now we're just logging to the server console
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing client warning log:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
