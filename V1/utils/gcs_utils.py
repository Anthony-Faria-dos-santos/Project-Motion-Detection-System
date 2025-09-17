# Utilitaires Google Cloud Storage - Projet Motion Detection System
# J'ai appris à utiliser Google Cloud en suivant la documentation officielle
# TODO: Améliorer la gestion d'erreurs quand j'aurai plus de temps

import os
from google.cloud import storage
from datetime import datetime
import logging
from dotenv import load_dotenv

# Je charge les variables d'environnement
load_dotenv()

# Je configure le logging pour voir ce qui se passe
# Mon prof m'a dit que c'est important pour débugger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration depuis les variables d'environnement
GOOGLE_CLOUD_BUCKET = os.getenv('GOOGLE_CLOUD_BUCKET')
GOOGLE_CLOUD_PROJECT = os.getenv('GOOGLE_CLOUD_PROJECT')

def upload_image_to_gcs(image_path, bucket_name=None):
    """
    Upload une image vers Google Cloud Storage
    J'ai copié cette fonction depuis la documentation Google
    """
    try:
        # Je récupère le nom du bucket depuis les variables d'environnement
        # Si c'est pas défini, j'utilise une valeur par défaut
        if bucket_name is None:
            bucket_name = GOOGLE_CLOUD_BUCKET
            if not bucket_name:
                print("Erreur: Nom du bucket Google Cloud non défini!")
                print("Ajoutez GOOGLE_CLOUD_BUCKET dans votre fichier .env")
                return False

        # Je crée un client Google Cloud Storage
        storage_client = storage.Client()
        
        # Je récupère le bucket
        bucket = storage_client.bucket(bucket_name)
        
        # Je crée un nom de fichier unique avec la date
        # Format: captures/2024/01/15/motion_14-30-25.jpg
        timestamp = datetime.now()
        year = timestamp.strftime("%Y")
        month = timestamp.strftime("%m")
        day = timestamp.strftime("%d")
        time_str = timestamp.strftime("%H-%M-%S")
        
        # Je construis le chemin dans le bucket
        blob_name = f"captures/{year}/{month}/{day}/motion_{time_str}.jpg"
        
        # Je crée un "blob" (c'est comme un fichier dans le cloud)
        blob = bucket.blob(blob_name)
        
        # J'upload le fichier
        print(f"Upload en cours vers Google Cloud: {blob_name}")
        blob.upload_from_filename(image_path)
        
        print(f"Upload réussi! Fichier disponible dans le bucket: {blob_name}")
        return True
        
    except Exception as e:
        # Si quelque chose va mal, j'affiche l'erreur
        print(f"Erreur lors de l'upload vers Google Cloud: {e}")
        print("Vérifiez que:")
        print("1. Votre fichier .env contient les bonnes clés")
        print("2. Vous avez activé l'API Google Cloud Storage")
        print("3. Votre compte a les bonnes permissions")
        return False

def test_gcs_connection():
    """
    Test simple pour vérifier que la connexion Google Cloud fonctionne
    J'ai ajouté cette fonction pour débugger les problèmes de connexion
    """
    try:
        print("Test de connexion à Google Cloud Storage...")
        
        # Je récupère le nom du bucket
        bucket_name = GOOGLE_CLOUD_BUCKET
        if not bucket_name:
            print("❌ Erreur: GOOGLE_CLOUD_BUCKET non défini dans .env")
            return False
        
        # Je teste la connexion
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # Je vérifie si le bucket existe
        if bucket.exists():
            print(f"✅ Connexion réussie! Bucket '{bucket_name}' trouvé")
            return True
        else:
            print(f"❌ Erreur: Bucket '{bucket_name}' n'existe pas")
            return False
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        print("Vérifiez votre configuration Google Cloud")
        return False

def list_recent_captures(bucket_name=None, limit=10):
    """
    Liste les captures récentes dans le bucket
    Utile pour vérifier que les uploads fonctionnent
    """
    try:
        if bucket_name is None:
            bucket_name = GOOGLE_CLOUD_BUCKET
            if not bucket_name:
                print("Erreur: Nom du bucket non défini")
                return []
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # Je liste les fichiers dans le dossier captures
        blobs = bucket.list_blobs(prefix="captures/")
        
        # Je trie par date (les plus récents en premier)
        files = []
        for blob in blobs:
            files.append({
                'name': blob.name,
                'created': blob.time_created,
                'size': blob.size
            })
        
        # Je trie par date de création (plus récent en premier)
        files.sort(key=lambda x: x['created'], reverse=True)
        
        print(f"📁 {len(files)} captures trouvées dans Google Cloud Storage")
        
        # J'affiche les plus récentes
        for i, file in enumerate(files[:limit]):
            print(f"{i+1}. {file['name']} ({file['created'].strftime('%Y-%m-%d %H:%M:%S')})")
        
        return files
        
    except Exception as e:
        print(f"Erreur lors de la liste des captures: {e}")
        return []

# Fonction pour nettoyer les anciens fichiers (optionnel)
def cleanup_old_captures(bucket_name=None, days_to_keep=30):
    """
    Supprime les captures plus anciennes que X jours
    J'ai ajouté ça pour éviter de remplir le bucket
    TODO: Améliorer cette fonction
    """
    try:
        if bucket_name is None:
            bucket_name = GOOGLE_CLOUD_BUCKET
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        
        # Je calcule la date limite
        from datetime import timedelta
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        print(f"Nettoyage des captures plus anciennes que {days_to_keep} jours...")
        
        # Je liste et supprime les anciens fichiers
        blobs = bucket.list_blobs(prefix="captures/")
        deleted_count = 0
        
        for blob in blobs:
            if blob.time_created < cutoff_date:
                blob.delete()
                deleted_count += 1
                print(f"Supprimé: {blob.name}")
        
        print(f"Nettoyage terminé: {deleted_count} fichiers supprimés")
        return deleted_count
        
    except Exception as e:
        print(f"Erreur lors du nettoyage: {e}")
        return 0
