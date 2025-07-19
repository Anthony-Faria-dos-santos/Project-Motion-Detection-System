# Script d'Affichage de Configuration - Projet Motion Detection System
# J'ai créé ce script pour voir facilement la configuration actuelle
# TODO: Améliorer l'affichage

import os
from dotenv import load_dotenv

# Je charge les variables d'environnement
load_dotenv()

def print_config():
    """
    Affiche la configuration actuelle du système
    """
    print("=" * 60)
    print("🔧 CONFIGURATION ACTUELLE")
    print("=" * 60)
    print()
    
    # Configuration de détection
    print("📹 DÉTECTION DE MOUVEMENT:")
    motion_threshold = os.getenv('MOTION_THRESHOLD', '25 (défaut)')
    detect_area = os.getenv('DETECT_AREA', '500 (défaut)')
    capture_interval = os.getenv('CAPTURE_INTERVAL', '30 (défaut)')
    
    print(f"  • Seuil de sensibilité: {motion_threshold}")
    print(f"  • Aire minimale: {detect_area} pixels²")
    print(f"  • Intervalle de capture: {capture_interval} secondes")
    print()
    
    # Configuration caméra
    print("📷 CAMÉRA:")
    camera_index = os.getenv('CAMERA_INDEX', '0 (défaut)')
    camera_width = os.getenv('CAMERA_WIDTH', 'Auto')
    camera_height = os.getenv('CAMERA_HEIGHT', 'Auto')
    
    print(f"  • Index caméra: {camera_index}")
    print(f"  • Résolution: {camera_width}x{camera_height}")
    print()
    
    # Configuration stockage
    print("💾 STOCKAGE:")
    captures_folder = os.getenv('CAPTURES_FOLDER', 'captures (défaut)')
    retention_days = os.getenv('LOCAL_RETENTION_DAYS', '7 (défaut)')
    
    print(f"  • Dossier local: {captures_folder}")
    print(f"  • Rétention: {retention_days} jours")
    print()
    
    # Configuration Slack
    print("💬 SLACK:")
    slack_token = os.getenv('SLACK_TOKEN')
    slack_channel = os.getenv('SLACK_CHANNEL')
    
    if slack_token:
        masked_token = slack_token[:8] + "..." if len(slack_token) > 8 else slack_token
        print(f"  • Token: {masked_token} ✅")
    else:
        print("  • Token: NON CONFIGURÉ ❌")
    
    if slack_channel:
        print(f"  • Canal: {slack_channel} ✅")
    else:
        print("  • Canal: NON CONFIGURÉ ❌")
    print()
    
    # Configuration Google Cloud
    print("☁️ GOOGLE CLOUD:")
    gcs_bucket = os.getenv('GOOGLE_CLOUD_BUCKET')
    gcs_project = os.getenv('GOOGLE_CLOUD_PROJECT')
    
    if gcs_bucket:
        print(f"  • Bucket: {gcs_bucket} ✅")
    else:
        print("  • Bucket: NON CONFIGURÉ ❌")
    
    if gcs_project:
        print(f"  • Projet: {gcs_project} ✅")
    else:
        print("  • Projet: NON CONFIGURÉ ❌")
    print()
    
    # Configuration logging
    print("📝 LOGGING:")
    log_level = os.getenv('LOG_LEVEL', 'INFO (défaut)')
    log_file = os.getenv('LOG_FILE', 'Aucun (défaut)')
    
    print(f"  • Niveau: {log_level}")
    print(f"  • Fichier: {log_file}")
    print()
    
    # Résumé
    print("=" * 60)
    print("📊 RÉSUMÉ")
    print("=" * 60)
    
    required_configs = [
        ('SLACK_TOKEN', slack_token),
        ('SLACK_CHANNEL', slack_channel),
        ('GOOGLE_CLOUD_BUCKET', gcs_bucket)
    ]
    
    configured = 0
    total = len(required_configs)
    
    for name, value in required_configs:
        if value:
            print(f"✅ {name}: Configuré")
            configured += 1
        else:
            print(f"❌ {name}: Manquant")
    
    print()
    print(f"Configuration: {configured}/{total} éléments configurés")
    
    if configured == total:
        print("🎉 Toutes les configurations sont prêtes!")
        print("Vous pouvez lancer le système avec: python main.py")
    else:
        print("⚠️ Certaines configurations manquent.")
        print("Éditez le fichier .env pour compléter la configuration")

def show_help():
    """
    Affiche l'aide pour configurer le système
    """
    print("\n" + "=" * 60)
    print("❓ COMMENT CONFIGURER")
    print("=" * 60)
    print()
    print("1. Copiez le fichier d'exemple:")
    print("   cp env.example .env")
    print()
    print("2. Éditez le fichier .env avec vos valeurs:")
    print("   nano .env  # ou votre éditeur préféré")
    print()
    print("3. Variables obligatoires:")
    print("   • SLACK_TOKEN: Token de votre app Slack")
    print("   • SLACK_CHANNEL: Canal où envoyer les alertes")
    print("   • GOOGLE_CLOUD_BUCKET: Nom de votre bucket GCS")
    print()
    print("4. Variables optionnelles (valeurs par défaut):")
    print("   • MOTION_THRESHOLD=25 (sensibilité détection)")
    print("   • DETECT_AREA=500 (aire minimale en pixels)")
    print("   • CAPTURE_INTERVAL=30 (intervalle entre captures)")
    print("   • CAMERA_INDEX=0 (index de la caméra)")
    print()
    print("5. Relancez ce script pour vérifier:")
    print("   python show_config.py")

if __name__ == "__main__":
    print_config()
    show_help() 