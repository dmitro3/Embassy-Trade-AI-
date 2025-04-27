import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';

export async function GET() {
  try {
    // Get the absolute path to the migration guide markdown file with more robust path resolution
    let guidePath = path.join(process.cwd(), 'backend', 'migration-guide.md');
    
    // Check if file exists and log path for debugging
    try {
      await fs.access(guidePath);
      console.log(`Migration guide file found at: ${guidePath}`);
    } catch (err) {
      console.error(`Migration guide file not found at: ${guidePath}`);
      console.log(`Current working directory: ${process.cwd()}`);
      
      // Try alternate paths if the primary path fails
      const alternatePaths = [
        path.join(process.cwd(), '../backend', 'migration-guide.md'),
        path.join(process.cwd(), 'web/backend', 'migration-guide.md'),
        path.join(process.cwd(), '../web/backend', 'migration-guide.md')
      ];
      
      let found = false;
      for (const altPath of alternatePaths) {
        try {
          await fs.access(altPath);
          console.log(`Migration guide found at alternate path: ${altPath}`);
          found = true;
          // Use the alternate path that works
          guidePath = altPath;
          break;
        } catch (err) {
          console.log(`Alternate path not valid: ${altPath}`);
        }
      }
      
      if (!found) {
        throw new Error(`Migration guide file not found in any of the expected locations`);
      }
    }
    
    // Read the markdown file
    const guideContent = await fs.readFile(guidePath, 'utf-8');
    
    // Convert the markdown to HTML
    const htmlContent = marked(guideContent);
    
    // Add some basic styling
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Embassy Trade: EMB to EMBAI Migration Guide</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
              line-height: 1.6;
              color: #e2e8f0;
              background: linear-gradient(to bottom right, #0f172a, #1e293b);
              padding: 2rem;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 {
              color: #f8fafc;
              margin-top: 0;
              font-size: 2rem;
              border-bottom: 1px solid #334155;
              padding-bottom: 1rem;
            }
            h2 {
              color: #60a5fa;
              margin-top: 2rem;
              font-size: 1.5rem;
            }
            h3 {
              color: #93c5fd;
              font-size: 1.2rem;
            }
            code {
              background: #1e293b;
              padding: 0.1rem 0.3rem;
              border-radius: 3px;
              font-size: 0.9em;
            }
            pre {
              background: #0f172a;
              padding: 1rem;
              border-radius: 5px;
              overflow-x: auto;
              border: 1px solid #334155;
            }
            a {
              color: #38bdf8;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            p {
              margin: 1rem 0;
            }
            ul, ol {
              padding-left: 2rem;
            }
            li {
              margin: 0.5rem 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1rem 0;
            }
            th, td {
              padding: 0.5rem;
              border: 1px solid #334155;
              text-align: left;
            }
            th {
              background: #1e293b;
            }
            .container {
              background: rgba(15, 23, 42, 0.6);
              padding: 2rem;
              border-radius: 8px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              backdrop-filter: blur(10px);
            }
            .token-info {
              background: rgba(14, 165, 233, 0.1);
              border-left: 3px solid #0ea5e9;
              padding: 1rem;
              margin: 1rem 0;
              border-radius: 0 3px 3px 0;
            }
            .phases {
              display: flex;
              flex-wrap: wrap;
              gap: 1rem;
              margin: 2rem 0;
            }
            .phase {
              flex: 1 1 300px;
              background: rgba(30, 41, 59, 0.7);
              border-radius: 5px;
              padding: 1rem;
              border: 1px solid #334155;
            }
            .checklist {
              background: rgba(79, 70, 229, 0.1);
              border-radius: 5px;
              padding: 1rem;
            }
            .tokenomics-table {
              background: rgba(56, 189, 248, 0.05);
              border-radius: 8px;
              padding: 1.5rem;
              border: 1px solid rgba(56, 189, 248, 0.2);
              margin: 2rem 0;
            }
            .tokenomics-table table {
              width: 100%;
              border-collapse: collapse;
            }
            .tokenomics-table th {
              background: rgba(56, 189, 248, 0.1);
              color: #38bdf8;
              font-weight: 600;
            }
            .tokenomics-table td, .tokenomics-table th {
              padding: 0.75rem;
              border: 1px solid rgba(56, 189, 248, 0.2);
            }
            .download-btn {
              display: inline-block;
              background: linear-gradient(to right, #3b82f6, #2563eb);
              color: white;
              font-weight: 600;
              padding: 0.75rem 1.5rem;
              border-radius: 0.5rem;
              margin: 1.5rem 0;
              text-align: center;
              transition: all 0.3s ease;
              border: none;
              cursor: pointer;
              text-decoration: none;
              box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
            }
            .download-btn:hover {
              background: linear-gradient(to right, #2563eb, #1d4ed8);
              transform: translateY(-2px);
              box-shadow: 0 6px 8px -1px rgba(37, 99, 235, 0.3);
              text-decoration: none;
            }
            .download-btn svg {
              display: inline-block;
              vertical-align: middle;
              margin-right: 0.5rem;
              width: 1.25rem;
              height: 1.25rem;
            }
            .frosty-animation {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              pointer-events: none;
              z-index: -1;
              opacity: 0.2;
              background: 
                radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.1) 0%, transparent 25%),
                radial-gradient(circle at 80% 50%, rgba(79, 70, 229, 0.1) 0%, transparent 25%),
                radial-gradient(circle at 40% 80%, rgba(168, 85, 247, 0.1) 0%, transparent 25%);
            }
            .snowflake {
              position: fixed;
              color: #fff;
              text-shadow: 0 0 5px rgba(255, 255, 255, 0.7);
              opacity: 0.5;
              z-index: -1;
              user-select: none;
              animation: snowfall linear infinite;
            }
            @keyframes snowfall {
              0% {
                transform: translateY(-20px) rotate(0deg);
              }
              100% {
                transform: translateY(100vh) rotate(360deg);
              }
            }
          </style>
        </head>
        <body>
          <div class="frosty-animation"></div>
          <div class="container">
            ${htmlContent}
            
            <div style="text-align: center; margin-top: 3rem;">
              <a href="/api/whitepaper/embai-whitepaper.pdf" class="download-btn" download>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download EMBAI Whitepaper
              </a>
            </div>
          </div>
          
          <script>
            // Add some basic interactivity
            document.addEventListener('DOMContentLoaded', function() {
              // Handle checklist items
              const checklistItems = document.querySelectorAll('input[type="checkbox"]');
              checklistItems.forEach(item => {
                item.addEventListener('change', function() {
                  localStorage.setItem('embai_checklist_' + this.value, this.checked);
                });
                
                const savedState = localStorage.getItem('embai_checklist_' + item.value);
                if (savedState === 'true') {
                  item.checked = true;
                }
              });
              
              // Add snowflake animation
              function createSnowflakes() {
                const snowflakeChars = ['❅', '❆', '❄', '✻', '✼', '❉'];
                const container = document.body;
                
                for (let i = 0; i < 30; i++) {
                  const snowflake = document.createElement('div');
                  snowflake.className = 'snowflake';
                  snowflake.innerHTML = snowflakeChars[Math.floor(Math.random() * snowflakeChars.length)];
                  snowflake.style.left = Math.random() * 100 + 'vw';
                  snowflake.style.fontSize = (Math.random() * 20 + 10) + 'px';
                  snowflake.style.animationDuration = (Math.random() * 20 + 10) + 's';
                  snowflake.style.animationDelay = (Math.random() * 10) + 's';
                  container.appendChild(snowflake);
                }
              }
              
              createSnowflakes();
            });
          </script>
        </body>
      </html>
    `;
    
    return new Response(styledHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
    
  } catch (error) {
    console.error('Error serving migration guide:', error);
    return new Response('Error loading migration guide', { status: 500 });
  }
}
