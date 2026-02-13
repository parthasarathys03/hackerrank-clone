import subprocess
import asyncio
import sys
import os
from typing import Dict

# Fix Windows event loop for subprocess
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

class PythonRunner:
    """Python code execution runner with timeout and output capture"""
    
    TIMEOUT = 5  # seconds (increased for Windows)
    MAX_OUTPUT_SIZE = 10000  # characters
    
    async def run_with_input(self, code: str, stdin_input: str = "") -> Dict:
        """
        Execute Python code with custom input
        Returns dict with status, stdout, stderr
        """
        try:
            # Windows-compatible subprocess creation
            if os.name == 'nt':  # Windows
                process = await asyncio.create_subprocess_exec(
                    sys.executable, '-u', '-c', code,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
                )
            else:  # Linux/Mac
                process = await asyncio.create_subprocess_exec(
                    sys.executable, '-c', code,
                    stdin=asyncio.subprocess.PIPE,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(input=stdin_input.encode('utf-8')),
                    timeout=self.TIMEOUT
                )
                
                stdout_str = stdout.decode('utf-8', errors='replace')[:self.MAX_OUTPUT_SIZE]
                stderr_str = stderr.decode('utf-8', errors='replace')[:self.MAX_OUTPUT_SIZE]
                
                if process.returncode == 0:
                    return {
                        "status": "success",
                        "stdout": stdout_str,
                        "stderr": stderr_str
                    }
                else:
                    return {
                        "status": "error",
                        "stdout": stdout_str,
                        "stderr": stderr_str if stderr_str else f"Process exited with code {process.returncode}"
                    }
                    
            except asyncio.TimeoutError:
                try:
                    process.kill()
                    await process.wait()
                except:
                    pass
                return {
                    "status": "error",
                    "stdout": "",
                    "stderr": f"Error: Code execution timed out after {self.TIMEOUT} seconds"
                }
                
        except FileNotFoundError as e:
            return {
                "status": "error",
                "stdout": "",
                "stderr": f"Python interpreter not found: {sys.executable}"
            }
        except PermissionError as e:
            return {
                "status": "error",
                "stdout": "",
                "stderr": f"Permission denied executing Python: {str(e)}"
            }
        except Exception as e:
            import traceback
            return {
                "status": "error",
                "stdout": "",
                "stderr": f"Execution error: {type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
            }
