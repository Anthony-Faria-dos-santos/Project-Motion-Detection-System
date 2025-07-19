# Utilitaires Slack - Projet Motion Detection System
# J'ai appris à utiliser l'API Slack en suivant leur documentation
# TODO: Améliorer le formatage des messages plus tard

import os
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from datetime import datetime
import logging
from dotenv import load_dotenv

# Je charge les variables d'environnement
load_dotenv()

# Je configure le logging pour voir ce qui se passe
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration depuis les variables d'environnement
SLACK_TOKEN = os.getenv('SLACK_TOKEN')
SLACK_CHANNEL = os.getenv('SLACK_CHANNEL')

def send_slack_alert(message, image_path=None, channel=None):
    """
    Envoie une alerte Slack avec optionnellement une image
    J'ai copié cette fonction depuis la documentation Slack
    """
    try:
        # Je récupère le token Slack depuis les variables d'environnement
        slack_token = SLACK_TOKEN
        if not slack_token:
            print("Erreur: Token Slack non défini!")
            print("Ajoutez SLACK_TOKEN dans votre fichier .env")
            return False
        
        # Je récupère le canal par défaut
        if channel is None:
            channel = SLACK_CHANNEL
            if not channel:
                print("Erreur: Canal Slack non défini!")
                print("Ajoutez SLACK_CHANNEL dans votre fichier .env")
                return False
        
        # Je crée le client Slack
        client = WebClient(token=slack_token)
        
        # J'ajoute un timestamp au message
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        full_message = f"[{timestamp}] {message}"
        
        print(f"Envoi du message Slack vers #{channel}...")
        
        if image_path and os.path.exists(image_path):
            # Si j'ai une image, je l'envoie avec le message
            try:
                # J'upload l'image d'abord
                print("Upload de l'image vers Slack...")
                response = client.files_upload(
                    channels=channel,
                    file=image_path,
                    title="Capture de mouvement détecté",
                    initial_comment=full_message
                )
                print("✅ Message et image envoyés avec succès!")
                return True
                
            except SlackApiError as e:
                print(f"Erreur lors de l'envoi de l'image: {e.response['error']}")
                # Si l'image échoue, j'essaie d'envoyer juste le message
                print("Tentative d'envoi du message sans image...")
        
        # J'envoie juste le message texte
        response = client.chat_postMessage(
            channel=channel,
            text=full_message
        )
        
        print("✅ Message envoyé avec succès!")
        return True
        
    except SlackApiError as e:
        print(f"Erreur Slack API: {e.response['error']}")
        print("Vérifiez que:")
        print("1. Votre token Slack est valide")
        print("2. Le bot a les permissions d'écrire dans le canal")
        print("3. Le nom du canal est correct")
        return False
        
    except Exception as e:
        print(f"Erreur inattendue lors de l'envoi Slack: {e}")
        return False

def send_motion_detected_alert(image_path=None, confidence=None, location=None):
    """
    Envoie une alerte spécifique pour la détection de mouvement
    J'ai créé cette fonction pour avoir des messages plus jolis
    """
    # Je crée un message plus informatif
    message = "🚨 MOUVEMENT DÉTECTÉ! 🚨"
    
    if confidence:
        message += f"\nConfiance: {confidence}%"
    
    if location:
        message += f"\nZone: {location}"
    
    message += "\n\nVérifiez immédiatement la zone surveillée!"
    
    # J'envoie l'alerte
    return send_slack_alert(message, image_path)

def test_slack_connection():
    """
    Test simple pour vérifier que la connexion Slack fonctionne
    J'ai ajouté cette fonction pour débugger les problèmes de connexion
    """
    try:
        print("Test de connexion à Slack...")
        
        # Je vérifie les variables d'environnement
        slack_token = SLACK_TOKEN
        slack_channel = SLACK_CHANNEL
        
        if not slack_token:
            print("❌ Erreur: SLACK_TOKEN non défini dans .env")
            return False
        
        if not slack_channel:
            print("❌ Erreur: SLACK_CHANNEL non défini dans .env")
            return False
        
        # Je teste la connexion
        client = WebClient(token=slack_token)
        
        # Je teste en envoyant un message de test
        test_message = "🧪 Test de connexion - Système de détection de mouvement"
        
        response = client.chat_postMessage(
            channel=slack_channel,
            text=test_message
        )
        
        if response["ok"]:
            print(f"✅ Connexion Slack réussie! Message envoyé dans #{slack_channel}")
            return True
        else:
            print("❌ Erreur: Impossible d'envoyer le message de test")
            return False
            
    except SlackApiError as e:
        print(f"❌ Erreur Slack API: {e.response['error']}")
        print("Vérifiez votre configuration Slack")
        return False
        
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

def send_startup_notification():
    """
    Envoie une notification quand le MDS démarre
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = f"🟢 Système de détection de mouvement démarré\nHeure: {timestamp}"
        
        return send_slack_alert(message)
        
    except Exception as e:
        print(f"Erreur lors de la notification de démarrage: {e}")
        return False

def send_shutdown_notification():
    """
    Envoie une notification quand le MDS s'arrête
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = f"🔴 Système de détection de mouvement arrêté\nHeure: {timestamp}"
        
        return send_slack_alert(message)
        
    except Exception as e:
        print(f"Erreur lors de la notification d'arrêt: {e}")
        return False

def send_error_notification(error_message):
    """
    Envoie une notification d'erreur
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = f"⚠️ ERREUR SYSTÈME\nHeure: {timestamp}\nErreur: {error_message}"
        
        return send_slack_alert(message)
        
    except Exception as e:
        print(f"Erreur lors de la notification d'erreur: {e}")
        return False

# Fonction pour envoyer des statistiques (optionnel)
def send_daily_stats(detection_count, image_count):
    """
    Envoie un résumé quotidien des détections
    Premier essai de statistiques
    TODO: Améliorer cette fonction
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d")
        message = f"📊 Statistiques du {timestamp}\n"
        message += f"• Détections: {detection_count}\n"
        message += f"• Images capturées: {image_count}\n"
        
        return send_slack_alert(message)
        
    except Exception as e:
        print(f"Erreur lors de l'envoi des statistiques: {e}")
        return False
