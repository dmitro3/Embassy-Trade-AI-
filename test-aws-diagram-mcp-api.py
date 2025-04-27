import subprocess
import json
import time
import os
import tempfile
import base64
from pathlib import Path

def test_aws_diagram_mcp_api():
    print("Starting AWS Diagram MCP Server API test...")
    
    # Start the MCP server
    print("Starting MCP server...")
    env = os.environ.copy()
    env["PATH"] = r"C:\Program Files\Graphviz\bin" + os.pathsep + env["PATH"]
    
    server_process = subprocess.Popen(
        ["uvx", "--from", "awslabs-aws-diagram-mcp-server", "awslabs.aws-diagram-mcp-server.exe"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env={**env, "FASTMCP_LOG_LEVEL": "INFO"}
    )
    
    # Create a temporary file to store the server's output
    with tempfile.NamedTemporaryFile(mode='w+', delete=False) as temp_file:
        temp_path = temp_file.name
    
    try:
        # Give the server a moment to start
        time.sleep(2)
        
        # Check if the server is running
        if server_process.poll() is not None:
            print("Error: MCP server failed to start")
            stdout, stderr = server_process.communicate()
            print(f"STDOUT: {stdout}")
            print(f"STDERR: {stderr}")
            return False
        
        print("MCP server started successfully!")
        
        # Use a fixed port number (MCP servers typically use 8080)
        port = "8080"
        print(f"Using default port {port}")
        
        # Create a diagram using the MCP server
        diagram_code = """
from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2, Lambda
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB, VPC
from diagrams.aws.storage import S3

with Diagram('AWS Architecture', show=False):
    with Cluster('VPC'):
        lb = ELB('Load Balancer')
        
        with Cluster('Web Tier'):
            web_servers = [EC2('Web Server 1'),
                          EC2('Web Server 2')]
        
        with Cluster('Application Tier'):
            app_servers = [EC2('App Server 1'),
                          EC2('App Server 2')]
            
        with Cluster('Database Tier'):
            primary = RDS('Primary')
            replica = RDS('Replica')
            
        s3 = S3('Static Content')
        lambda_func = Lambda('ETL Process')
        
        lb >> web_servers >> app_servers
        app_servers >> primary
        primary >> replica
        web_servers >> s3
        app_servers >> lambda_func
        """
        
        # Create a request to the MCP server
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "create_aws_diagram",
            "params": {
                "title": "AWS Architecture Example",
                "code": diagram_code
            }
        }
        
        # Write the request to a file
        with open(temp_path, 'w') as f:
            json.dump(request, f)
        
        # Send the request to the MCP server
        print("Sending request to MCP server...")
        curl_cmd = [
            "curl", "-s", "-X", "POST", 
            f"http://localhost:{port}/jsonrpc", 
            "-H", "Content-Type: application/json", 
            "-d", f"@{temp_path}"
        ]
        
        response = subprocess.run(
            curl_cmd,
            capture_output=True,
            text=True,
            env=env
        )
        
        print(f"Response status: {response.returncode}")
        
        # Parse the response
        try:
            result = json.loads(response.stdout)
            if "result" in result and "diagram_base64" in result["result"]:
                print("Successfully generated diagram!")
                
                # Save the diagram to a file
                diagram_base64 = result["result"]["diagram_base64"]
                diagram_data = base64.b64decode(diagram_base64)
                
                with open("aws_architecture_mcp.png", "wb") as f:
                    f.write(diagram_data)
                
                print("Diagram saved to aws_architecture_mcp.png")
                return True
            else:
                print("Error: Invalid response from MCP server")
                print(f"Response: {result}")
                return False
        except json.JSONDecodeError:
            print("Error: Could not parse response from MCP server")
            print(f"Response: {response.stdout}")
            return False
    
    finally:
        # Clean up
        print("Stopping MCP server...")
        server_process.terminate()
        server_process.wait(timeout=5)
        print("MCP server stopped")
        
        # Remove the temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    success = test_aws_diagram_mcp_api()
    if success:
        print("AWS Diagram MCP Server API test completed successfully!")
    else:
        print("AWS Diagram MCP Server API test failed!")
