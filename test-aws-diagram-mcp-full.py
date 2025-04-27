import subprocess
import json
import time
import os
import tempfile
import base64
from pathlib import Path

def test_aws_diagram_mcp_full():
    print("Starting AWS Diagram MCP Server full test...")
    
    # Start the MCP server
    print("Starting MCP server...")
    server_process = subprocess.Popen(
        ["uvx", "--from", "awslabs-aws-diagram-mcp-server", "awslabs.aws-diagram-mcp-server.exe"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env={**os.environ, "FASTMCP_LOG_LEVEL": "ERROR"}
    )
    
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
    
    # Create a temporary file to store the server's output
    with tempfile.NamedTemporaryFile(mode='w+', delete=False) as temp_file:
        temp_path = temp_file.name
    
    try:
        # Read the server's stdout to get the port number
        server_output = ""
        while "Listening on" not in server_output:
            line = server_process.stdout.readline()
            if not line:
                break
            server_output += line
            print(f"Server output: {line.strip()}")
        
        # Extract the port number from the server output
        port = None
        for line in server_output.split('\n'):
            if "Listening on" in line:
                port = line.split(":")[-1].strip()
                break
        
        if not port:
            print("Error: Could not determine the server port")
            return False
        
        print(f"Server is listening on port {port}")
        
        # Create a diagram using the MCP server
        diagram_code = """
from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB

with Diagram('Web Service Architecture', show=False):
    with Cluster('AWS Cloud'):
        lb = ELB('Load Balancer')
        with Cluster('Web Tier'):
            web = EC2('Web Server')
        with Cluster('Database Tier'):
            db = RDS('Database')
        
        lb >> web >> db
        """
        
        # Create a request to the MCP server
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "create_aws_diagram",
            "params": {
                "title": "Simple AWS Architecture",
                "code": diagram_code
            }
        }
        
        # Write the request to a file
        with open(temp_path, 'w') as f:
            json.dump(request, f)
        
        # Send the request to the MCP server
        print("Sending request to MCP server...")
        response = subprocess.run(
            ["curl", "-s", "-X", "POST", f"http://localhost:{port}/jsonrpc", 
             "-H", "Content-Type: application/json", 
             "-d", f"@{temp_path}"],
            capture_output=True,
            text=True
        )
        
        print(f"Response: {response.stdout}")
        
        # Parse the response
        try:
            result = json.loads(response.stdout)
            if "result" in result and "diagram_base64" in result["result"]:
                print("Successfully generated diagram!")
                
                # Save the diagram to a file
                diagram_base64 = result["result"]["diagram_base64"]
                diagram_data = base64.b64decode(diagram_base64)
                
                with open("aws_diagram.png", "wb") as f:
                    f.write(diagram_data)
                
                print("Diagram saved to aws_diagram.png")
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
    success = test_aws_diagram_mcp_full()
    if success:
        print("AWS Diagram MCP Server full test completed successfully!")
    else:
        print("AWS Diagram MCP Server full test failed!")
