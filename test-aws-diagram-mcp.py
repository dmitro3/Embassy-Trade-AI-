import subprocess
import json
import time
import os

def test_aws_diagram_mcp():
    print("Starting AWS Diagram MCP Server test...")
    
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
    
    # Clean up
    print("Stopping MCP server...")
    server_process.terminate()
    server_process.wait(timeout=5)
    print("MCP server stopped")
    
    return True

if __name__ == "__main__":
    success = test_aws_diagram_mcp()
    if success:
        print("AWS Diagram MCP Server test completed successfully!")
    else:
        print("AWS Diagram MCP Server test failed!")
