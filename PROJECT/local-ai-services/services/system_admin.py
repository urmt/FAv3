from typing import Dict, List, Optional, Any
import os
import subprocess
import platform
import logging
import json
import shutil
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class TaskResult:
    success: bool
    message: str
    output: Optional[str] = None
    error: Optional[str] = None
    exit_code: Optional[int] = None

@dataclass
class SystemService:
    name: str
    status: str  # active, inactive, failed, etc.
    enabled: bool
    description: str

@dataclass
class MountPoint:
    device: str
    mountpoint: str
    fstype: str
    opts: str
    size: str
    used: str
    available: str
    use_percent: str

class SystemAdministrationService:
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.os_type = platform.system().lower()
        
        # Command mappings for different OS
        self.commands = {
            'linux': {
                'package_manager': self._detect_package_manager(),
                'service_manager': 'systemctl',
                'mount_cmd': 'mount',
                'unmount_cmd': 'umount'
            },
            'darwin': {
                'package_manager': 'brew',
                'service_manager': 'launchctl',
                'mount_cmd': 'mount',
                'unmount_cmd': 'umount'
            },
            'windows': {
                'package_manager': 'choco',
                'service_manager': 'sc',
                'mount_cmd': 'net use',
                'unmount_cmd': 'net use /delete'
            }
        }
    
    def _detect_package_manager(self) -> str:
        """Detect the package manager on Linux systems"""
        managers = {
            '/usr/bin/apt': 'apt',
            '/usr/bin/yum': 'yum',
            '/usr/bin/dnf': 'dnf',
            '/usr/bin/pacman': 'pacman',
            '/usr/bin/zypper': 'zypper'
        }
        
        for path, manager in managers.items():
            if os.path.exists(path):
                return manager
        
        return 'unknown'
    
    def execute_command(self, command: str, timeout: int = 30, 
                       require_sudo: bool = False) -> TaskResult:
        """Execute a system command safely"""
        try:
            # Add sudo if required and not already present
            if require_sudo and not command.startswith('sudo') and self.os_type == 'linux':
                command = f'sudo {command}'
            
            self.logger.info(f"Executing command: {command}")
            
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return TaskResult(
                success=result.returncode == 0,
                message="Command executed successfully" if result.returncode == 0 else "Command failed",
                output=result.stdout.strip() if result.stdout else None,
                error=result.stderr.strip() if result.stderr else None,
                exit_code=result.returncode
            )
            
        except subprocess.TimeoutExpired:
            return TaskResult(
                success=False,
                message=f"Command timed out after {timeout} seconds",
                error="Timeout"
            )
        except Exception as e:
            self.logger.error(f"Command execution failed: {e}")
            return TaskResult(
                success=False,
                message=f"Command execution failed: {str(e)}",
                error=str(e)
            )
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get comprehensive system information"""
        info = {
            "basic": {
                "hostname": platform.node(),
                "os": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
                "processor": platform.processor()
            },
            "python": {
                "version": platform.python_version(),
                "implementation": platform.python_implementation(),
                "compiler": platform.python_compiler()
            }
        }
        
        # OS-specific information
        if self.os_type == 'linux':
            info.update(self._get_linux_info())
        elif self.os_type == 'darwin':
            info.update(self._get_macos_info())
        elif self.os_type == 'windows':
            info.update(self._get_windows_info())
        
        return info
    
    def _get_linux_info(self) -> Dict[str, Any]:
        """Get Linux-specific system information"""
        info = {}
        
        # Distribution info
        try:
            with open('/etc/os-release', 'r') as f:
                os_release = {}
                for line in f:
                    if '=' in line:
                        key, value = line.strip().split('=', 1)
                        os_release[key] = value.strip('"')
                info['distribution'] = os_release
        except Exception:
            pass
        
        # Kernel info
        result = self.execute_command('uname -a')
        if result.success:
            info['kernel'] = result.output
        
        # Package manager
        info['package_manager'] = self.commands['linux']['package_manager']
        
        return info
    
    def _get_macos_info(self) -> Dict[str, Any]:
        """Get macOS-specific system information"""
        info = {}
        
        # macOS version
        result = self.execute_command('sw_vers')
        if result.success:
            info['macos_version'] = result.output
        
        # Homebrew info
        result = self.execute_command('brew --version')
        if result.success:
            info['homebrew'] = result.output.split('\n')[0]
        
        return info
    
    def _get_windows_info(self) -> Dict[str, Any]:
        """Get Windows-specific system information"""
        info = {}
        
        # Windows version
        result = self.execute_command('ver')
        if result.success:
            info['windows_version'] = result.output
        
        return info
    
    def manage_services(self, action: str, service_name: str) -> TaskResult:
        """Manage system services (start, stop, restart, enable, disable)"""
        if self.os_type == 'linux':
            command = f'systemctl {action} {service_name}'
            return self.execute_command(command, require_sudo=True)
        elif self.os_type == 'darwin':
            if action in ['start', 'stop', 'restart']:
                command = f'brew services {action} {service_name}'
            else:
                return TaskResult(
                    success=False,
                    message=f"Action '{action}' not supported on macOS"
                )
            return self.execute_command(command)
        elif self.os_type == 'windows':
            if action == 'start':
                command = f'sc start {service_name}'
            elif action == 'stop':
                command = f'sc stop {service_name}'
            else:
                return TaskResult(
                    success=False,
                    message=f"Action '{action}' not supported on Windows"
                )
            return self.execute_command(command)
        else:
            return TaskResult(
                success=False,
                message=f"Service management not supported on {self.os_type}"
            )
    
    def get_services_status(self) -> List[SystemService]:
        """Get status of system services"""
        services = []
        
        if self.os_type == 'linux':
            result = self.execute_command('systemctl list-units --type=service --no-pager')
            if result.success:
                lines = result.output.split('\n')[1:]  # Skip header
                for line in lines:
                    if line.strip() and not line.startswith('●'):
                        parts = line.split()
                        if len(parts) >= 4:
                            services.append(SystemService(
                                name=parts[0],
                                status=parts[2],
                                enabled=parts[1] == 'loaded',
                                description=' '.join(parts[4:]) if len(parts) > 4 else ''
                            ))
        
        return services[:20]  # Limit to first 20 services
    
    def manage_packages(self, action: str, package_name: str) -> TaskResult:
        """Manage system packages (install, remove, update)"""
        package_manager = self.commands.get(self.os_type, {}).get('package_manager', 'unknown')
        
        if package_manager == 'unknown':
            return TaskResult(
                success=False,
                message=f"Package management not supported on {self.os_type}"
            )
        
        # Define commands for different package managers
        commands = {
            'apt': {
                'install': f'apt install -y {package_name}',
                'remove': f'apt remove -y {package_name}',
                'update': 'apt update && apt upgrade -y',
                'search': f'apt search {package_name}'
            },
            'yum': {
                'install': f'yum install -y {package_name}',
                'remove': f'yum remove -y {package_name}',
                'update': 'yum update -y',
                'search': f'yum search {package_name}'
            },
            'dnf': {
                'install': f'dnf install -y {package_name}',
                'remove': f'dnf remove -y {package_name}',
                'update': 'dnf update -y',
                'search': f'dnf search {package_name}'
            },
            'pacman': {
                'install': f'pacman -S --noconfirm {package_name}',
                'remove': f'pacman -R --noconfirm {package_name}',
                'update': 'pacman -Syu --noconfirm',
                'search': f'pacman -Ss {package_name}'
            },
            'brew': {
                'install': f'brew install {package_name}',
                'remove': f'brew uninstall {package_name}',
                'update': 'brew update && brew upgrade',
                'search': f'brew search {package_name}'
            }
        }
        
        if package_manager in commands and action in commands[package_manager]:
            command = commands[package_manager][action]
            require_sudo = package_manager in ['apt', 'yum', 'dnf', 'pacman']
            return self.execute_command(command, timeout=300, require_sudo=require_sudo)
        else:
            return TaskResult(
                success=False,
                message=f"Action '{action}' not supported for {package_manager}"
            )
    
    def get_mount_points(self) -> List[MountPoint]:
        """Get system mount points"""
        mounts = []
        
        if self.os_type in ['linux', 'darwin']:
            # Get mount info
            result = self.execute_command('mount')
            mount_lines = result.output.split('\n') if result.success else []
            
            # Get disk usage
            df_result = self.execute_command('df -h')
            df_lines = df_result.output.split('\n')[1:] if df_result.success else []
            
            # Parse df output for size information
            df_info = {}
            for line in df_lines:
                if line.strip():
                    parts = line.split()
                    if len(parts) >= 6:
                        mountpoint = parts[5]
                        df_info[mountpoint] = {
                            'size': parts[1],
                            'used': parts[2],
                            'available': parts[3],
                            'use_percent': parts[4]
                        }
            
            # Parse mount output
            for line in mount_lines:
                if ' on ' in line and ' type ' in line:
                    parts = line.split(' on ', 1)
                    if len(parts) == 2:
                        device = parts[0]
                        rest = parts[1].split(' type ', 1)
                        if len(rest) == 2:
                            mountpoint = rest[0]
                            type_opts = rest[1].split(' (', 1)
                            fstype = type_opts[0]
                            opts = type_opts[1].rstrip(')') if len(type_opts) > 1 else ''
                            
                            # Get size info from df
                            size_info = df_info.get(mountpoint, {
                                'size': 'Unknown',
                                'used': 'Unknown',
                                'available': 'Unknown',
                                'use_percent': 'Unknown'
                            })
                            
                            mounts.append(MountPoint(
                                device=device,
                                mountpoint=mountpoint,
                                fstype=fstype,
                                opts=opts,
                                size=size_info['size'],
                                used=size_info['used'],
                                available=size_info['available'],
                                use_percent=size_info['use_percent']
                            ))
        
        return mounts
    
    def mount_device(self, device: str, mountpoint: str, fstype: str = 'auto', 
                    options: str = 'defaults') -> TaskResult:
        """Mount a device"""
        # Create mountpoint if it doesn't exist
        Path(mountpoint).mkdir(parents=True, exist_ok=True)
        
        if self.os_type in ['linux', 'darwin']:
            command = f'mount -t {fstype} -o {options} {device} {mountpoint}'
            return self.execute_command(command, require_sudo=True)
        else:
            return TaskResult(
                success=False,
                message=f"Mount operation not supported on {self.os_type}"
            )
    
    def unmount_device(self, mountpoint: str, force: bool = False) -> TaskResult:
        """Unmount a device"""
        if self.os_type in ['linux', 'darwin']:
            command = f'umount {"-f" if force else ""} {mountpoint}'
            return self.execute_command(command, require_sudo=True)
        else:
            return TaskResult(
                success=False,
                message=f"Unmount operation not supported on {self.os_type}"
            )
    
    def clean_system(self) -> TaskResult:
        """Clean system temporary files and caches"""
        results = []
        
        if self.os_type == 'linux':
            # Clean package manager cache
            package_manager = self.commands['linux']['package_manager']
            if package_manager == 'apt':
                result = self.execute_command('apt autoremove -y && apt autoclean', require_sudo=True)
                results.append(f"APT cleanup: {'Success' if result.success else 'Failed'}")
            elif package_manager == 'yum':
                result = self.execute_command('yum clean all', require_sudo=True)
                results.append(f"YUM cleanup: {'Success' if result.success else 'Failed'}")
            elif package_manager == 'dnf':
                result = self.execute_command('dnf clean all', require_sudo=True)
                results.append(f"DNF cleanup: {'Success' if result.success else 'Failed'}")
        
        # Clean temporary files
        temp_dirs = ['/tmp', '/var/tmp'] if self.os_type in ['linux', 'darwin'] else ['C:\\Temp']
        
        for temp_dir in temp_dirs:
            if os.path.exists(temp_dir):
                try:
                    # Remove files older than 7 days
                    if self.os_type in ['linux', 'darwin']:
                        result = self.execute_command(f'find {temp_dir} -type f -mtime +7 -delete', require_sudo=True)
                        results.append(f"Temp cleanup {temp_dir}: {'Success' if result.success else 'Failed'}")
                except Exception as e:
                    results.append(f"Temp cleanup {temp_dir}: Failed - {str(e)}")
        
        return TaskResult(
            success=True,
            message="System cleanup completed",
            output="\n".join(results)
        )
    
    def get_system_logs(self, service: Optional[str] = None, lines: int = 100) -> TaskResult:
        """Get system logs"""
        if self.os_type == 'linux':
            if service:
                command = f'journalctl -u {service} -n {lines} --no-pager'
            else:
                command = f'journalctl -n {lines} --no-pager'
            return self.execute_command(command)
        elif self.os_type == 'darwin':
            command = f'log show --last {lines} --style compact'
            return self.execute_command(command)
        else:
            return TaskResult(
                success=False,
                message=f"Log viewing not supported on {self.os_type}"
            )
    
    def diagnose_system(self) -> Dict[str, Any]:
        """Run system diagnostics"""
        diagnostics = {
            "timestamp": datetime.now().isoformat(),
            "system_info": self.get_system_info(),
            "disk_usage": [],
            "memory_info": {},
            "network_status": {},
            "service_status": [],
            "issues_found": []
        }
        
        # Check disk usage
        mounts = self.get_mount_points()
        for mount in mounts:
            if mount.use_percent != 'Unknown':
                usage = int(mount.use_percent.rstrip('%'))
                diagnostics["disk_usage"].append({
                    "mountpoint": mount.mountpoint,
                    "usage_percent": usage,
                    "size": mount.size,
                    "available": mount.available
                })
                
                if usage > 90:
                    diagnostics["issues_found"].append(f"High disk usage on {mount.mountpoint}: {usage}%")
        
        # Check memory
        import psutil
        memory = psutil.virtual_memory()
        diagnostics["memory_info"] = {
            "total_gb": round(memory.total / (1024**3), 2),
            "available_gb": round(memory.available / (1024**3), 2),
            "usage_percent": memory.percent
        }
        
        if memory.percent > 90:
            diagnostics["issues_found"].append(f"High memory usage: {memory.percent}%")
        
        # Check network connectivity
        ping_result = self.execute_command('ping -c 1 8.8.8.8')
        diagnostics["network_status"] = {
            "internet_connectivity": ping_result.success,
            "dns_resolution": True  # If ping worked, DNS is working
        }
        
        if not ping_result.success:
            diagnostics["issues_found"].append("No internet connectivity")
        
        # Get critical service status
        services = self.get_services_status()
        critical_services = ['ssh', 'sshd', 'network-manager', 'NetworkManager']
        for service in services:
            if any(cs in service.name for cs in critical_services):
                diagnostics["service_status"].append({
                    "name": service.name,
                    "status": service.status,
                    "enabled": service.enabled
                })
                
                if service.status != 'active':
                    diagnostics["issues_found"].append(f"Critical service {service.name} is {service.status}")
        
        return diagnostics