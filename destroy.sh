#!/bin/bash
set -e

echo "========================================="
echo "  CavaLocal - Teardown"
echo "========================================="
echo ""
echo "This will delete the entire 'cavalocal' namespace and all its resources."
read -p "Are you sure? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Deleting namespace 'cavalocal' (this deletes all resources inside it)..."
kubectl delete namespace cavalocal --ignore-not-found=true

echo ""
echo "Done. All CavaLocal Kubernetes resources have been removed."
