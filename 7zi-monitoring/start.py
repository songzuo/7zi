#!/usr/bin/env python3
"""
Start script for 7zi Monitoring System
"""

import sys
import os
import argparse
import asyncio
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from src.main import MonitoringSystem


def main():
    parser = argparse.ArgumentParser(
        description='7zi Performance Monitoring System',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start with default config
  python start.py
  
  # Start with custom config
  python start.py --config /path/to/config.yaml
  
  # Start on specific port
  python start.py --port 9090
  
  # Start with verbose logging
  python start.py --log-level DEBUG
        """
    )
    
    parser.add_argument(
        '--config', '-c',
        default='config/monitoring.yaml',
        help='Path to configuration file (default: config/monitoring.yaml)'
    )
    
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=None,
        help='API server port (overrides config)'
    )
    
    parser.add_argument(
        '--host',
        default=None,
        help='API server host (overrides config)'
    )
    
    parser.add_argument(
        '--log-level',
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        default=None,
        help='Logging level (overrides config)'
    )
    
    parser.add_argument(
        '--no-api',
        action='store_true',
        help='Disable API server'
    )
    
    parser.add_argument(
        '--no-scaling',
        action='store_true',
        help='Disable auto-scaling'
    )
    
    parser.add_argument(
        '--no-alerts',
        action='store_true',
        help='Disable alerting'
    )
    
    args = parser.parse_args()
    
    # Create monitoring system
    monitoring = MonitoringSystem(config_path=args.config)
    
    # Apply command-line overrides
    if args.port:
        monitoring.config.setdefault('api', {})['port'] = args.port
    if args.host:
        monitoring.config.setdefault('api', {})['host'] = args.host
    if args.log_level:
        monitoring.config.setdefault('core', {})['log_level'] = args.log_level
    if args.no_api:
        monitoring.config['api'] = None
    if args.no_scaling:
        monitoring.config.setdefault('scaling', {})['enabled'] = False
    if args.no_alerts:
        monitoring.config.setdefault('alerting', {})['enabled'] = False
    
    # Run
    print(f"Starting 7zi Monitoring System v{monitoring.config.get('core', {}).get('version', '1.10.0')}")
    print(f"Config: {args.config}")
    
    asyncio.run(monitoring.run())


if __name__ == '__main__':
    main()