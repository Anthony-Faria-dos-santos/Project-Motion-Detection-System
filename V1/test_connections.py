# Script de Test des Connexions - Projet Motion Detection System
# TODO: Améliorer les tests

import os
from dotenv import load_dotenv
import sys

# J'ajoute le dossier utils au path pour pouvoir importer mes modules
sys.path.append('utils')

# Je charge les variables d'environnement
load_dotenv()

def test_environment():
    """
    Test simple pour vérifier que le fichier .env est bien configuré
    """
    print("=== Test de Configuration ===")
    
    # Je vérifie les variables importantes
    required_vars = [
        'SLACK_TOKEN',
        'SLACK_CHANNEL', 
        'GOOGLE_CLOUD_BUCKET'
    ]
    
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Je masque les valeur sensibles
            masked_value = value[:8] + "..." if len(value) > 8 else value
            print(f"✅ {var}: {masked_value}")
        else:
            print(f"❌ {var}: NON DÉFINI")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n⚠️ Variables manquantes: {', '.join(missing_vars)}")
        print("Copiez env.example vers .env et remplissez les valeurs")
        return False
    else:
        print("\n✅ Configuration OK!")
        return True

def test_slack():
    """
    Test de la connexion Slack
    """
    print("\n=== Test Slack ===")
    
    try:
        from slack_utils import test_slack_connection
        return test_slack_connection()
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        print("Vérifiez que slack_utils.py existe dans le dossier utils")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

def test_google_cloud():
    """
    Test de la connexion Google Cloud
    """
    print("\n=== Test Google Cloud ===")
    
    try:
        from gcs_utils import test_gcs_connection
        return test_gcs_connection()
    except ImportError as e:
        print(f"❌ Erreur d'import: {e}")
        print("Vérifiez que gcs_utils.py existe dans le dossier utils")
        return False
    except Exception as e:
        print(f"❌ Erreur inattendue: {e}")
        return False

def test_camera():
    """
    Test simple de la caméra
    """
    print("\n=== Test Caméra ===")
    
    try:
        import cv2
        
        # J'essaie d'ouvrir la caméra
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("❌ Impossible d'ouvrir la caméra")
            print("Vérifiez que votre webcam est connectée")
            return False
        
        # Je lis une image pour tester
        ret, frame = cap.read()
        if not ret:
            print("❌ Impossible de lire une image de la caméra")
            cap.release()
            return False
        
        # Je récupère les informations de la caméra
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        cap.release()
        
        print(f"✅ Caméra OK! Résolution: {width}x{height}")
        return True
        
    except ImportError:
        print("❌ OpenCV non installé")
        print("Installez-le avec: pip install opencv-python")
        return False
    except Exception as e:
        print(f"❌ Erreur caméra: {e}")
        return False

def main():
    """
    Fonction principale qui lance tous les tests
    """
    print("🧪 Tests de Connexion - Système de Détection de Mouvement")
    print("=" * 60)
    
    # Je lance tous les tests
    tests = [
        ("Configuration", test_environment),
        ("Caméra", test_camera),
        ("Slack", test_slack),
        ("Google Cloud", test_google_cloud)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Erreur lors du test {test_name}: {e}")
            results.append((test_name, False))
    
    # Je résume les résultats
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nRésultat: {passed}/{total} tests réussis")
    
    if passed == total:
        print("🎉 Tous les tests sont passés! Le système est prêt.")
        print("Vous pouvez maintenant lancer: python main.py")
    else:
        print("⚠️ Certains tests ont échoué. Corrigez les problèmes avant de continuer.")
        print("\nConseils:")
        print("1. Vérifiez votre fichier .env")
        print("2. Assurez-vous que toutes les dépendances sont installées")
        print("3. Vérifiez vos clés API et permissions")

if __name__ == "__main__":
    main() 