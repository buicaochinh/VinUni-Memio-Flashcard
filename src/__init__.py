"""
Root package marker for the backend.

This helps Python tooling and Uvicorn app loading reliably resolve `src.*`
imports even when `sys.path` differs between environments.
"""

