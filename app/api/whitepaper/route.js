import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

/**
 * API route handler for serving the EMBAI whitepaper PDF
 * 
 * @route GET /api/whitepaper/embai-whitepaper.pdf
 */
export async function GET(request) {
  try {
    // Extract the filename from the URL
    const url = new URL(request.url);
    const pathname = url.pathname;
    const filename = pathname.split('/').pop();
    
    // For now, we'll generate a simple PDF with basic content
    // In a production environment, you would serve an actual PDF file
    
    // Create a simple HTML that will be converted to PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>EMBAI Whitepaper</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
            }
            h1 {
              color: #3b82f6;
              text-align: center;
              font-size: 2rem;
              margin-bottom: 2rem;
            }
            h2 {
              color: #2563eb;
              margin-top: 2rem;
              font-size: 1.5rem;
            }
            h3 {
              color: #1d4ed8;
              font-size: 1.2rem;
            }
            p {
              margin: 1rem 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1rem 0;
            }
            th, td {
              padding: 0.5rem;
              border: 1px solid #ccc;
              text-align: left;
            }
            th {
              background: #f1f5f9;
            }
            .logo {
              text-align: center;
              margin-bottom: 2rem;
              font-size: 3rem;
              color: #3b82f6;
            }
          </style>
        </head>
        <body>
          <div class="logo">❄️</div>
          <h1>EMBAI Whitepaper</h1>
          <p><strong>Version 1.0</strong> | April 2025</p>
          
          <h2>1. Introduction</h2>
          <p>
            Embassy Trade AI is a revolutionary trading platform built on the Solana blockchain,
            designed to provide users with advanced trading algorithms, social features, and
            community-driven development. The platform is powered by the $EMBAI token, which
            serves as the utility token for the ecosystem.
          </p>
          
          <h2>2. Vision</h2>
          <p>
            Our vision is to create a transparent, community-driven trading platform that leverages
            the power of artificial intelligence to provide users with the best possible trading
            experience. By combining cutting-edge technology with a strong community focus, we aim
            to revolutionize the way people trade on the Solana blockchain.
          </p>
          
          <h2>3. Tokenomics</h2>
          <p>
            The $EMBAI token has been designed with a fair and sustainable distribution model that
            prioritizes community rewards and long-term growth.
          </p>
          
          <h3>3.1 Token Allocation</h3>
          <table>
            <tr>
              <th>Allocation</th>
              <th>Percentage</th>
              <th>Amount</th>
              <th>Distribution Timeline</th>
            </tr>
            <tr>
              <td>Community Rewards</td>
              <td>40%</td>
              <td>4M $EMBAI</td>
              <td>Ongoing staking & airdrops</td>
            </tr>
            <tr>
              <td>$EMB Migration Pool</td>
              <td>20%</td>
              <td>2M $EMBAI</td>
              <td>90-day migration post-Raydium</td>
            </tr>
            <tr>
              <td>Development</td>
              <td>20%</td>
              <td>2M $EMBAI</td>
              <td>6-month lock, then 12-month vesting</td>
            </tr>
            <tr>
              <td>Liquidity Pool</td>
              <td>10%</td>
              <td>1M $EMBAI</td>
              <td>Token Generation Event (TGE)</td>
            </tr>
            <tr>
              <td>Reserve Fund</td>
              <td>10%</td>
              <td>1M $EMBAI</td>
              <td>DAO-controlled, unlocked as needed</td>
            </tr>
          </table>
          
          <h3>3.2 Total Supply</h3>
          <p>
            <strong>Initial Supply:</strong> 10M $EMBAI (capped)<br>
            <strong>Emissions:</strong> Potential future emissions via staking rewards, controlled by DAO governance
          </p>
          
          <h3>3.3 Burn Mechanism</h3>
          <p>
            $EMB tokens burned during migration reduce the circulating supply, boosting $EMBAI scarcity and value for holders.
          </p>
          
          <h3>3.4 Investor Appeal</h3>
          <p>
            60% of the token supply (Community + Migration) directly benefits holders, with a lean development allocation
            signaling long-term commitment to the project.
          </p>
          
          <h2>4. Platform Features</h2>
          
          <h3>4.1 TradeForce</h3>
          <p>
            TradeForce is the core trading interface of Embassy Trade AI. It provides users with advanced trading algorithms,
            real-time market data, and automated trading capabilities. Key features include:
          </p>
          <ul>
            <li>Automated trading with AI-powered algorithms</li>
            <li>Real-time market data and analysis</li>
            <li>Multiple trading strategies (arbitrage, momentum, statistical)</li>
            <li>Risk management tools</li>
          </ul>
          
          <h3>4.2 Social Butterfly</h3>
          <p>
            Social Butterfly is a social networking feature that allows users to connect with other traders, share ideas,
            and participate in community activities. Key features include:
          </p>
          <ul>
            <li>Real-time chat with other traders</li>
            <li>Trading idea sharing</li>
            <li>Friend requests and social connections</li>
            <li>Integration with Arcade games</li>
          </ul>
          
          <h3>4.3 Live Statistics</h3>
          <p>
            Live Statistics provides users with real-time data on platform performance, including win rates, trades executed,
            and community metrics. This transparency helps users make informed decisions and track platform growth.
          </p>
          
          <h3>4.4 Arcade</h3>
          <p>
            The Arcade feature allows users to play games like chess and poker with $EMB stakes, adding a fun and engaging
            element to the platform while providing additional utility for the token.
          </p>
          
          <h2>5. Technology</h2>
          <p>
            Embassy Trade AI is built on the Solana blockchain, leveraging its high speed and low transaction costs to provide
            a seamless trading experience. The platform uses a combination of technologies:
          </p>
          <ul>
            <li>Solana blockchain for transactions and token management</li>
            <li>Next.js for the frontend user interface</li>
            <li>Node.js for backend services</li>
            <li>Firebase for authentication and data storage</li>
            <li>Machine learning algorithms for trading predictions</li>
          </ul>
          
          <h2>6. Roadmap</h2>
          <p>
            <strong>Q2 2025:</strong> Launch of TradeForce, Social Butterfly, and Live Statistics<br>
            <strong>Q3 2025:</strong> Migration from $EMB to $EMBAI, Desktop application release<br>
            <strong>Q4 2025:</strong> Enhanced AI algorithms, Mobile application, DAO governance<br>
            <strong>Q1 2026:</strong> Expansion to additional blockchains, Institutional partnerships
          </p>
          
          <h2>7. Team</h2>
          <p>
            Embassy Trade AI is developed by a team of experienced blockchain developers, AI specialists, and financial
            experts committed to creating a revolutionary trading platform. The team is supported by a growing community
            of beta testers and early adopters who provide valuable feedback and contribute to the platform's development.
          </p>
          
          <h2>8. Conclusion</h2>
          <p>
            Embassy Trade AI represents the future of trading on the Solana blockchain, combining advanced technology with
            community-driven development to create a platform that benefits all participants. With its fair tokenomics,
            innovative features, and strong community focus, Embassy Trade AI is positioned to become a leading player in
            the decentralized trading space.
          </p>
          
          <div style="margin-top: 3rem; text-align: center; color: #64748b; font-size: 0.9rem;">
            <p>© 2025 Embassy Trade AI. All rights reserved.</p>
            <p>
              This whitepaper is for informational purposes only and does not constitute financial advice.
              Always do your own research before making investment decisions.
            </p>
          </div>
        </body>
      </html>
    `;
    
    // For a real implementation, you would serve an actual PDF file
    // For now, we'll return the HTML with a PDF content type
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
    
  } catch (error) {
    console.error('Error serving whitepaper:', error);
    return new Response('Error loading whitepaper', { status: 500 });
  }
}
