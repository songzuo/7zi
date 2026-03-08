#!/usr/bin/env python3
"""
7zi AlertManager Webhook Receiver
用于接收和记录 Prometheus AlertManager 发送的告警通知
"""

import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime
import os

LOG_FILE = "/var/log/alertmanager/webhook.log"

class AlertHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """自定义日志格式"""
        pass
    
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            alert_data = json.loads(post_data.decode('utf-8'))
            timestamp = datetime.now().isoformat()
            
            # 确保日志目录存在
            os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
            
            # 记录告警到日志文件
            with open(LOG_FILE, 'a') as f:
                f.write(f"\n{'='*60}\n")
                f.write(f"Timestamp: {timestamp}\n")
                f.write(f"Path: {self.path}\n")
                f.write(f"Alert Data:\n{json.dumps(alert_data, indent=2)}\n")
            
            # 在控制台输出
            print(f"[{timestamp}] Received alert via {self.path}")
            if 'alerts' in alert_data:
                for alert in alert_data['alerts']:
                    # 确保 alert 是字典类型
                    if isinstance(alert, dict):
                        status = alert.get('status', {}).get('state', 'unknown') if isinstance(alert.get('status'), dict) else 'unknown'
                        alertname = alert.get('labels', {}).get('alertname', 'unknown') if isinstance(alert.get('labels'), dict) else 'unknown'
                        severity = alert.get('labels', {}).get('severity', 'unknown') if isinstance(alert.get('labels'), dict) else 'unknown'
                        print(f"  - {status.upper()}: {alertname} ({severity})")
                    else:
                        print(f"  - Warning: alert is not a dict: {type(alert)}")
            
            # 返回成功响应
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'success'}).encode())
            
        except Exception as e:
            print(f"Error processing alert: {e}", file=sys.stderr)
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'error', 'message': str(e)}).encode())
    
    def do_GET(self):
        """健康检查端点"""
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            'status': 'healthy',
            'service': '7zi-alert-webhook',
            'timestamp': datetime.now().isoformat()
        }).encode())

def main():
    port = 5001
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    
    server = HTTPServer(('0.0.0.0', port), AlertHandler)
    print(f"🔔 7zi Alert Webhook Receiver starting on port {port}")
    print(f"📝 Logs will be written to: {LOG_FILE}")
    print(f"🏥 Health check: http://localhost:{port}/")
    print(f"📥 Webhook endpoints:")
    print(f"   - http://localhost:{port}/webhook")
    print(f"   - http://localhost:{port}/webhook/critical")
    print(f"   - http://localhost:{port}/webhook/warning")
    print(f"   - http://localhost:{port}/webhook/info")
    print("="*60)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()

if __name__ == '__main__':
    main()
