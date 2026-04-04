#!/bin/bash
# Security checks before deployment
echo "Running npm audit..."
npm audit --production --audit-level=high
if [ $? -ne 0 ]; then
    echo "WARNING: High/critical vulnerabilities found. Review before deploying."
fi
