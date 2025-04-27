from diagrams import Diagram, Cluster
from diagrams.aws.compute import EC2
from diagrams.aws.database import RDS
from diagrams.aws.network import ELB

with Diagram('Web Service Architecture', show=True):
    with Cluster('AWS Cloud'):
        lb = ELB('Load Balancer')
        with Cluster('Web Tier'):
            web = EC2('Web Server')
        with Cluster('Database Tier'):
            db = RDS('Database')
        
        lb >> web >> db
