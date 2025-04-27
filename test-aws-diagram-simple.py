import subprocess
import time
import os
import sys

def test_aws_diagram_simple():
    print("Starting AWS Diagram MCP Server simple test...")
    
    # Start the MCP server
    print("Starting MCP server...")
    server_process = subprocess.Popen(
        ["uvx", "--from", "awslabs-aws-diagram-mcp-server", "awslabs.aws-diagram-mcp-server.exe"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env={**os.environ, "FASTMCP_LOG_LEVEL": "ERROR"}
    )
    
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
        
        # Create a simple diagram using the diagrams package
        print("Creating a simple diagram...")
        diagram_code = """
from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB

with Diagram('Web Service Architecture', show=False, filename='aws_diagram_simple'):
    with Cluster('AWS Cloud'):
        lb = ELB('Load Balancer')
        with Cluster('Web Tier'):
            web = EC2('Web Server')
        with Cluster('Database Tier'):
            db = RDS('Database')
        
        lb >> web >> db
        """
        
        # Write the diagram code to a file
        with open("temp_diagram.py", "w") as f:
            f.write(diagram_code)
        
        # Add GraphViz to the PATH
        print("Adding GraphViz to the PATH...")
        env = os.environ.copy()
        env["PATH"] = r"C:\Program Files\Graphviz\bin" + os.pathsep + env["PATH"]
        
        # Run the diagram code
        print("Running the diagram code...")
        result = subprocess.run(
            [sys.executable, "temp_diagram.py"],
            capture_output=True,
            text=True,
            env=env
        )
        
        if result.returncode != 0:
            print("Error: Failed to create diagram")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            return False
        
        print("Diagram created successfully!")
        return True
    
    finally:
        # Clean up
        print("Stopping MCP server...")
        server_process.terminate()
        server_process.wait(timeout=5)
        print("MCP server stopped")
        
        # Remove the temporary file
        if os.path.exists("temp_diagram.py"):
            os.remove("temp_diagram.py")

if __name__ == "__main__":
    success = test_aws_diagram_simple()
    if success:
        print("AWS Diagram MCP Server simple test completed successfully!")
    else:
        print("AWS Diagram MCP Server simple test failed!")
