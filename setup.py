#!/usr/bin/env python3
# Script d'Installation - Projet Motion Detection System
# Script d'installation automatique
# TODO: Améliorer ce script quand j'aurai plus de temps

import os
import sys
import subprocess
import shutil
from pathlib import Path

def print_banner():
    """Affiche une bannière jolie pour le script d'installation"""
    print("=" * 60)
    print("🎓 SYSTÈME DE DÉTECTION DE MOUVEMENT")
    print("   Installation automatique")
    print("=" * 60)
    print()

def check_python_version():
    """Vérifie que Python est à la bonne version"""
    print("🐍 Vérification de la version Python...")
    
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ requis!")
        print(f"Version actuelle: {version.major}.{version.minor}.{version.micro}")
        return False
    
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} OK!")
    return True

def install_dependencies():
    """Installe les dépendances Python"""
    print("\n📦 Installation des dépendances...")
    
    try:
        # Je vérifie si pip est disponible
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, capture_output=True)
        
        # J'installe les dépendances
        print("Installation en cours... (ça peut prendre quelques minutes)")
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Dépendances installées avec succès!")
            return True
        else:
            print("❌ Erreur lors de l'installation:")
            print(result.stderr)
            return False
            
    except subprocess.CalledProcessError:
        print("❌ pip non trouvé!")
        print("Installez pip: https://pip.pypa.io/en/stable/installation/")
        return False
    except FileNotFoundError:
        print("❌ Fichier requirements.txt non trouvé!")
        return False

def setup_environment():
    """Configure le fichier d'environnement"""
    print("\n⚙️ Configuration de l'environnement...")
    
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if env_file.exists():
        print("⚠️ Fichier .env existe déjà")
        response = input("Voulez-vous le remplacer? (o/N): ").lower()
        if response != 'o':
            print("Configuration d'environnement ignorée")
            return True
    
    if not env_example.exists():
        print("❌ Fichier .env.example non trouvé!")
        return False
    
    try:
        # Je copie le fichier d'exemple
        shutil.copy(env_example, env_file)
        print("✅ Fichier .env créé!")
        print("📝 N'oubliez pas de configurer vos clés API dans le fichier .env")
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la création du .env: {e}")
        return False

def create_directories():
    """Crée les dossiers nécessaires"""
    print("\n📁 Création des dossiers...")
    
    directories = ["captures", "logs", "utils"]
    
    for directory in directories:
        dir_path = Path(directory)
        if not dir_path.exists():
            dir_path.mkdir(exist_ok=True)
            print(f"✅ Dossier {directory} créé")
        else:
            print(f"ℹ️ Dossier {directory} existe déjà")

def test_installation():
    """Teste l'installation"""
    print("\n🧪 Test de l'installation...")
    
    try:
        # Je teste l'import des modules principaux
        import cv2
        print("✅ OpenCV OK")
        
        import numpy
        print("✅ NumPy OK")
        
        from dotenv import load_dotenv
        print("✅ python-dotenv OK")
        
        # Je teste si les fichiers utils existent
        if Path("utils/gcs_utils.py").exists():
            print("✅ Utilitaires Google Cloud OK")
        else:
            print("⚠️ Utilitaires Google Cloud manquants")
        
        if Path("utils/slack_utils.py").exists():
            print("✅ Utilitaires Slack OK")
        else:
            print("⚠️ Utilitaires Slack manquants")
        
        return True
        
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        return False

def print_next_steps():
    """Affiche les prochaines étapes"""
    print("\n" + "=" * 60)
    print("🎉 INSTALLATION TERMINÉE!")
    print("=" * 60)
    print()
    print("📋 Prochaines étapes:")
    print()
    print("1. 🔧 Configurez votre fichier .env:")
    print("   - Éditez le fichier .env")
    print("   - Ajoutez vos clés API Slack et Google Cloud")
    print()
    print("2. 🧪 Testez la configuration:")
    print("   python test_connections.py")
    print()
    print("3. 🚀 Lancez le système:")
    print("   python main.py")
    print()
    print("📚 Documentation:")
    print("   - README.md pour les détails")
    print()
    print("🐛 Problèmes?")
    print("   - Vérifiez les messages d'erreur ci-dessus")
    print("   - Consultez la section dépannage du README")
    print()
    print("Installation terminée! 🎓")

def main():
    """Fonction principale du script d'installation"""
    print_banner()
    
    # Je vérifie Python
    if not check_python_version():
        sys.exit(1)
    
    # J'installe les dépendances
    if not install_dependencies():
        print("\n❌ Installation des dépendances échouée!")
        print("Essayez d'installer manuellement: pip install -r requirements.txt")
        sys.exit(1)
    
    # Je configure l'environnement
    if not setup_environment():
        print("\n⚠️ Configuration d'environnement échouée")
        print("Vous devrez configurer manuellement le fichier .env")
    
    # Je crée les dossiers
    create_directories()
    
    # Je teste l'installation
    if not test_installation():
        print("\n⚠️ Certains tests ont échoué")
        print("Vérifiez les messages d'erreur ci-dessus")
    
    # J'affiche les prochaines étapes
    print_next_steps()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Installation interrompue par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erreur inattendue: {e}")
        print("Essayez d'installer manuellement les dépendances")
        sys.exit(1) 