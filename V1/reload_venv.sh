#!/bin/bash
# Script pour recharger l'environnement virtuel Python (venv)
# use case: modification du code ou du .env => source reload_venv.sh
# Usage : source reload_venv.sh

# Vérifie si le script est sourcé
(return 0 2>/dev/null) || {
    echo "⚠️  Ce script doit être sourcé : 'source reload_venv.sh'"
    exit 1
}

# Chemin du venv (adapter si besoin)
VENV_DIR="venv"

# Désactive le venv si actif
if [[ -n "$VIRTUAL_ENV" ]]; then
    deactivate
fi

# Active le venv
echo "Activation du venv..."
source "$VENV_DIR/bin/activate"

# Affiche l'environnement Python utilisé
which python
python --version

echo "venv rechargé !" 