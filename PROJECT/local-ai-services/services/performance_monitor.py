from typing import Dict, List, Optional, Any
import psutil
import platform
import subprocess
import time
import logging
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class SystemMetrics:
    timestamp: float
    cpu_percent: float
    memory_percent: float
    memory_used: int  # MB
    memory_total: int  # MB
    disk_percent: float
    disk_used: int    # GB
    disk_total: int   # GB
    network_sent: int # MB
    network_recv: int # MB
    gpu_utilization: Optional[float] = None
    gpu_memory_used: Optional[int] = None
    gpu_memory_total: Optional[int] = None
    temperature: Optional[float] = None

@dataclass
class ProcessInfo:
    pid: int
    name: str
    cpu_percent: float
    memory_percent: float
    memory_mb: float
    status: str
    create_time: str
    cmdline: List[str]

@dataclass
class SystemAlert:
    level: str  # info, warning, critical
    component: str  # cpu, memory, disk, gpu, process
    message: str
    timestamp: float
    value: Optional[float] = None
    threshold: Optional[float] = None

class PerformanceMonitorService:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Performance history
        self.metrics_history: List[SystemMetrics] = []
        self.max_history_size = 1000  # Keep last 1000 data points
        
        # Alert configuration
        self.alert_thresholds = {
            'cpu_critical': 90.0,
            'cpu_warning': 75.0,
            'memory_critical': 90.0,
            'memory_warning': 80.0,
            'disk_critical': 95.0,
            'disk_warning': 85.0,
            'gpu_critical': 95.0,
            'gpu_warning': 85.0,
            'temperature_critical': 85.0,
            'temperature_warning': 75.0
        }
        
        self.active_alerts: List[SystemAlert] = []
        self.last_network_stats = None
        
        # GPU monitoring
        self.gpu_available = self._check_gpu_availability()
        
    def _check_gpu_availability(self) -> bool:
        """Check if GPU monitoring is available"""
        try:
            import GPUtil
            import py3nvml.py3nvml as nvml
            nvml.nvmlInit()
            return True
        except:
            return False
    
    def get_current_metrics(self) -> SystemMetrics:
        """Get current system metrics"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        memory_used_mb = (memory.total - memory.available) // (1024 * 1024)
        memory_total_mb = memory.total // (1024 * 1024)
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        disk_used_gb = (disk.total - disk.free) // (1024 * 1024 * 1024)
        disk_total_gb = disk.total // (1024 * 1024 * 1024)
        
        # Network metrics
        network = psutil.net_io_counters()
        network_sent_mb = network.bytes_sent // (1024 * 1024)
        network_recv_mb = network.bytes_recv // (1024 * 1024)
        
        # GPU metrics
        gpu_utilization = None
        gpu_memory_used = None
        gpu_memory_total = None
        
        if self.gpu_available:
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # Use first GPU
                    gpu_utilization = gpu.load * 100
                    gpu_memory_used = int(gpu.memoryUsed)
                    gpu_memory_total = int(gpu.memoryTotal)
            except Exception as e:
                self.logger.warning(f"GPU monitoring failed: {e}")
        
        # Temperature (Linux only)
        temperature = self._get_cpu_temperature()
        
        metrics = SystemMetrics(
            timestamp=time.time(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used=memory_used_mb,
            memory_total=memory_total_mb,
            disk_percent=disk.percent,
            disk_used=disk_used_gb,
            disk_total=disk_total_gb,
            network_sent=network_sent_mb,
            network_recv=network_recv_mb,
            gpu_utilization=gpu_utilization,
            gpu_memory_used=gpu_memory_used,
            gpu_memory_total=gpu_memory_total,
            temperature=temperature
        )
        
        # Add to history
        self.metrics_history.append(metrics)
        if len(self.metrics_history) > self.max_history_size:
            self.metrics_history.pop(0)
        
        # Check for alerts
        self._check_alerts(metrics)
        
        return metrics
    
    def _get_cpu_temperature(self) -> Optional[float]:
        """Get CPU temperature (Linux only)"""
        try:
            if platform.system() == "Linux":
                sensors = psutil.sensors_temperatures()
                if 'coretemp' in sensors:
                    temps = [temp.current for temp in sensors['coretemp']]
                    return max(temps) if temps else None
                elif 'acpi' in sensors:
                    temps = [temp.current for temp in sensors['acpi']]
                    return max(temps) if temps else None
        except Exception:
            pass
        return None
    
    def _check_alerts(self, metrics: SystemMetrics):
        """Check for system alerts based on current metrics"""
        current_time = time.time()
        new_alerts = []
        
        # CPU alerts
        if metrics.cpu_percent >= self.alert_thresholds['cpu_critical']:
            new_alerts.append(SystemAlert(
                level="critical",
                component="cpu",
                message=f"CPU usage critical: {metrics.cpu_percent:.1f}%",
                timestamp=current_time,
                value=metrics.cpu_percent,
                threshold=self.alert_thresholds['cpu_critical']
            ))
        elif metrics.cpu_percent >= self.alert_thresholds['cpu_warning']:
            new_alerts.append(SystemAlert(
                level="warning",
                component="cpu",
                message=f"CPU usage high: {metrics.cpu_percent:.1f}%",
                timestamp=current_time,
                value=metrics.cpu_percent,
                threshold=self.alert_thresholds['cpu_warning']
            ))
        
        # Memory alerts
        if metrics.memory_percent >= self.alert_thresholds['memory_critical']:
            new_alerts.append(SystemAlert(
                level="critical",
                component="memory",
                message=f"Memory usage critical: {metrics.memory_percent:.1f}%",
                timestamp=current_time,
                value=metrics.memory_percent,
                threshold=self.alert_thresholds['memory_critical']
            ))
        elif metrics.memory_percent >= self.alert_thresholds['memory_warning']:
            new_alerts.append(SystemAlert(
                level="warning",
                component="memory",
                message=f"Memory usage high: {metrics.memory_percent:.1f}%",
                timestamp=current_time,
                value=metrics.memory_percent,
                threshold=self.alert_thresholds['memory_warning']
            ))
        
        # Disk alerts
        if metrics.disk_percent >= self.alert_thresholds['disk_critical']:
            new_alerts.append(SystemAlert(
                level="critical",
                component="disk",
                message=f"Disk usage critical: {metrics.disk_percent:.1f}%",
                timestamp=current_time,
                value=metrics.disk_percent,
                threshold=self.alert_thresholds['disk_critical']
            ))
        elif metrics.disk_percent >= self.alert_thresholds['disk_warning']:
            new_alerts.append(SystemAlert(
                level="warning",
                component="disk",
                message=f"Disk usage high: {metrics.disk_percent:.1f}%",
                timestamp=current_time,
                value=metrics.disk_percent,
                threshold=self.alert_thresholds['disk_warning']
            ))
        
        # GPU alerts
        if metrics.gpu_utilization is not None:
            if metrics.gpu_utilization >= self.alert_thresholds['gpu_critical']:
                new_alerts.append(SystemAlert(
                    level="critical",
                    component="gpu",
                    message=f"GPU usage critical: {metrics.gpu_utilization:.1f}%",
                    timestamp=current_time,
                    value=metrics.gpu_utilization,
                    threshold=self.alert_thresholds['gpu_critical']
                ))
            elif metrics.gpu_utilization >= self.alert_thresholds['gpu_warning']:
                new_alerts.append(SystemAlert(
                    level="warning",
                    component="gpu",
                    message=f"GPU usage high: {metrics.gpu_utilization:.1f}%",
                    timestamp=current_time,
                    value=metrics.gpu_utilization,
                    threshold=self.alert_thresholds['gpu_warning']
                ))
        
        # Temperature alerts
        if metrics.temperature is not None:
            if metrics.temperature >= self.alert_thresholds['temperature_critical']:
                new_alerts.append(SystemAlert(
                    level="critical",
                    component="temperature",
                    message=f"Temperature critical: {metrics.temperature:.1f}°C",
                    timestamp=current_time,
                    value=metrics.temperature,
                    threshold=self.alert_thresholds['temperature_critical']
                ))
            elif metrics.temperature >= self.alert_thresholds['temperature_warning']:
                new_alerts.append(SystemAlert(
                    level="warning",
                    component="temperature",
                    message=f"Temperature high: {metrics.temperature:.1f}°C",
                    timestamp=current_time,
                    value=metrics.temperature,
                    threshold=self.alert_thresholds['temperature_warning']
                ))
        
        # Add new alerts
        self.active_alerts.extend(new_alerts)
        
        # Clean old alerts (older than 1 hour)
        self.active_alerts = [
            alert for alert in self.active_alerts
            if current_time - alert.timestamp < 3600
        ]
    
    def get_metrics_history(self, duration_minutes: int = 60) -> List[SystemMetrics]:
        """Get metrics history for specified duration"""
        cutoff_time = time.time() - (duration_minutes * 60)
        return [
            metrics for metrics in self.metrics_history
            if metrics.timestamp >= cutoff_time
        ]
    
    def get_process_list(self, sort_by: str = "memory", limit: int = 10) -> List[ProcessInfo]:
        """Get list of running processes"""
        processes = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 
                                       'memory_info', 'status', 'create_time', 'cmdline']):
            try:
                pinfo = proc.info
                memory_mb = pinfo['memory_info'].rss / (1024 * 1024) if pinfo['memory_info'] else 0
                create_time = datetime.fromtimestamp(pinfo['create_time']).strftime('%Y-%m-%d %H:%M:%S') if pinfo['create_time'] else 'Unknown'
                
                process_info = ProcessInfo(
                    pid=pinfo['pid'],
                    name=pinfo['name'] or 'Unknown',
                    cpu_percent=pinfo['cpu_percent'] or 0.0,
                    memory_percent=pinfo['memory_percent'] or 0.0,
                    memory_mb=memory_mb,
                    status=pinfo['status'] or 'unknown',
                    create_time=create_time,
                    cmdline=pinfo['cmdline'] or []
                )
                processes.append(process_info)
                
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Sort processes
        if sort_by == "memory":
            processes.sort(key=lambda p: p.memory_mb, reverse=True)
        elif sort_by == "cpu":
            processes.sort(key=lambda p: p.cpu_percent, reverse=True)
        elif sort_by == "name":
            processes.sort(key=lambda p: p.name.lower())
        
        return processes[:limit]
    
    def get_active_alerts(self, level: Optional[str] = None) -> List[SystemAlert]:
        """Get active system alerts"""
        if level:
            return [alert for alert in self.active_alerts if alert.level == level]
        return self.active_alerts[:]
    
    def dismiss_alert(self, alert_index: int) -> bool:
        """Dismiss a specific alert"""
        try:
            if 0 <= alert_index < len(self.active_alerts):
                self.active_alerts.pop(alert_index)
                return True
        except IndexError:
            pass
        return False
    
    def update_alert_thresholds(self, thresholds: Dict[str, float]) -> bool:
        """Update alert thresholds"""
        try:
            for key, value in thresholds.items():
                if key in self.alert_thresholds:
                    self.alert_thresholds[key] = float(value)
            return True
        except Exception as e:
            self.logger.error(f"Failed to update thresholds: {e}")
            return False
    
    def get_system_summary(self) -> Dict[str, Any]:
        """Get system summary with current metrics and alerts"""
        current_metrics = self.get_current_metrics()
        
        return {
            "current_metrics": asdict(current_metrics),
            "alerts": {
                "total": len(self.active_alerts),
                "critical": len([a for a in self.active_alerts if a.level == "critical"]),
                "warning": len([a for a in self.active_alerts if a.level == "warning"]),
                "recent": [asdict(alert) for alert in self.active_alerts[-5:]]
            },
            "thresholds": self.alert_thresholds,
            "system_info": {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "uptime": self._get_system_uptime()
            }
        }
    
    def _get_system_uptime(self) -> str:
        """Get system uptime"""
        try:
            uptime_seconds = time.time() - psutil.boot_time()
            uptime_delta = timedelta(seconds=int(uptime_seconds))
            return str(uptime_delta)
        except Exception:
            return "Unknown"
    
    def export_metrics(self, filepath: str, duration_hours: int = 24) -> bool:
        """Export metrics to JSON file"""
        try:
            metrics_data = self.get_metrics_history(duration_hours * 60)
            export_data = {
                "export_time": datetime.now().isoformat(),
                "duration_hours": duration_hours,
                "metrics_count": len(metrics_data),
                "metrics": [asdict(m) for m in metrics_data],
                "alert_thresholds": self.alert_thresholds
            }
            
            with open(filepath, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            return True
        except Exception as e:
            self.logger.error(f"Failed to export metrics: {e}")
            return False