# Système de Détection de Mouvement - Projet Motion Detection System
# Version 1.0 - 
# TODO: Rendre le code plus propre quand j'aurai plus de temps

import cv2
import numpy as np
import os
from datetime import datetime
from dotenv import load_dotenv

# Je charge les variables d'environnement depuis le fichier .env
load_dotenv()

# Configuration depuis les variables d'environnement
# Je récupère les valeurs avec des valeurs par défaut si pas définies
MOTION_THRESHOLD = int(os.getenv('MOTION_THRESHOLD', 25))
DETECT_AREA = int(os.getenv('DETECT_AREA', 500))
CAMERA_INDEX = int(os.getenv('CAMERA_INDEX', 0))
CAPTURES_FOLDER = os.getenv('CAPTURES_FOLDER', 'captures')
CAPTURE_INTERVAL = int(os.getenv('CAPTURE_INTERVAL', 30))

def detect_motion():
    """
    Fonction principale pour détecter le mouvement avec OpenCV
    """
    print("Démarrage du système de détection de mouvement...")
    
    # J'essaie d'ouvrir la caméra avec l'index configuré
    # Si ça marche pas, j'affiche une erreur
    cap = cv2.VideoCapture(CAMERA_INDEX)
    
    # Je vérifie si la caméra s'est bien ouverte
    if not cap.isOpened():
        print("Erreur: Impossible d'ouvrir la caméra!")
        print("Vérifiez que votre webcam est bien connectée")
        return
    
    print("Caméra ouverte avec succès!")

    # Je lis le premier frame pour avoir une image de référence
    # C'est important pour détecter les changements
    ret, frame = cap.read()
    if not ret:
        print("Erreur: Impossible de lire la première image de la caméra")
        cap.release()
        return

    # Je convertis l'image en noir et blanc (niveaux de gris)
    # C'est plus facile pour détecter les mouvements
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # J'applique un flou pour réduire le bruit
    # J'ai mis 21x21 ça fonctionnait bien dans mes tests
    gray = cv2.GaussianBlur(gray, (21, 21), 0)

    print("Système prêt! Appuyez sur 'q' pour quitter")
    print("Le rectangle vert indique les zones de mouvement détectées")
    print(f"Configuration: Seuil={MOTION_THRESHOLD}, Aire min={DETECT_AREA}, Intervalle={CAPTURE_INTERVAL}s")

    # Variables pour gérer les captures
    last_capture_time = None
    motion_detected = False

    # Boucle principale - je traite chaque image de la caméra
    while True:
        # Je lis une nouvelle image
        ret, frame = cap.read()
        if not ret:
            print("Erreur: Impossible de lire l'image de la caméra")
            break

        # Je traite la nouvelle image comme la référence
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray_frame = cv2.GaussianBlur(gray_frame, (21, 21), 0)

        # Je calcule la différence entre l'image actuelle et la référence
        # Si il y a du mouvement, il y aura des différences
        frame_delta = cv2.absdiff(gray, gray_frame)
        
        # Je convertis les différences en noir et blanc (seuil)
        # J'utilise le seuil configuré dans les variables d'environnement
        thresh = cv2.threshold(frame_delta, MOTION_THRESHOLD, 255, cv2.THRESH_BINARY)[1]
        
        # J'agrandis les zones blanches pour mieux voir les mouvements
        thresh = cv2.dilate(thresh, None, iterations=2)

        # Je trouve les contours (formes) dans l'image
        # Repérer les zones de mouvement
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Variable pour détecter s'il y a eu du mouvement dans cette frame
        motion_in_frame = False

        # Je regarde chaque contour trouvé
        for contour in contours:
            # Je calcule l'aire du contour
            area = cv2.contourArea(contour)
            
            # Si l'aire est trop petite, je l'ignore (limiter les déclenchement intenpestifs et le bruit)
            # J'utilise la valeur configurée dans les variables d'environnement
            if area < DETECT_AREA:
                continue

            # Je dessine un rectangle vert autour de la zone de mouvement
            # (x, y) = position en haut à gauche, (w, h) = largeur et hauteur
            (x, y, w, h) = cv2.boundingRect(contour)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # J'affiche l'aire détectée (pour débugger)
            print(f"Mouvement détecté! Aire: {area} pixels carrés")
            
            # Je marque qu'il y a eu du mouvement dans cette frame
            motion_in_frame = True

        # Si du mouvement a été détecté et qu'on peut prendre une image
        if motion_in_frame and should_capture_image(last_capture_time):
            print("🚨 MOUVEMENT DÉTECTÉ - Capture d'image...")
            saved_path = save_detected_image(frame)
            if saved_path:
                last_capture_time = datetime.now()
                motion_detected = True
                print(f"✅ Image sauvegardée: {saved_path}")
            else:
                print("❌ Erreur lors de la sauvegarde de l'image")
        elif motion_in_frame and not should_capture_image(last_capture_time):
            # Mouvement détecté mais trop tôt pour une nouvelle capture
            remaining_time = CAPTURE_INTERVAL - (datetime.now() - last_capture_time).total_seconds()
            print(f"⏰ Mouvement détecté mais attente {remaining_time:.1f}s avant prochaine capture")

        # J'affiche l'image avec les rectangles dessinés
        cv2.imshow("Détection de Mouvement - Projet MDS", frame)

        # Je mets à jour l'image de référence pour la prochaine comparaison
        gray = gray_frame.copy()

        # Je vérifie si l'utilisateur appuie sur 'q' pour quitter
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("Arrêt demandé par l'utilisateur")
            break

    # Je libère la caméra et ferme les fenêtres
    # Sinon la caméra se bloque
    cap.release()
    cv2.destroyAllWindows()
    print("Système arrêté proprement")

def save_detected_image(image, folder=None):
    # J'utilise le dossier configuré ou la valeur par défaut
    if folder is None:
        folder = CAPTURES_FOLDER
    """
    Sauvegarde une image quand du mouvement est détecté
    J'ajoute un timestamp pour organiser les fichiers
    """
    # Je crée le dossier s'il n'existe pas
    if not os.path.exists(folder):
        os.makedirs(folder)
        print(f"Dossier {folder} créé")

    # Je crée un nom de fichier avec la date et l'heure
    # Format: 2024-01-15_14-30-25.jpg
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"motion_{timestamp}.jpg"
    filepath = os.path.join(folder, filename)

    # Je sauvegarde l'image
    try:
        cv2.imwrite(filepath, image)
        print(f"Image sauvegardée: {filepath}")
        return filepath
    except Exception as e:
        print(f"Erreur lors de la sauvegarde: {e}")
        return None

def should_capture_image(last_capture_time):
    """
    Vérifie si on peut prendre une nouvelle image selon l'intervalle configuré
    Évite de spammer avec trop d'images
    """
    if last_capture_time is None:
        return True
    
    current_time = datetime.now()
    time_diff = (current_time - last_capture_time).total_seconds()
    
    return time_diff >= CAPTURE_INTERVAL

# Point d'entrée du programme
if __name__ == "__main__":
    print("=== Système de Détection de Mouvement ===")
    print("Projet Motion Detection System")
    print("==========================================")
    
    # Je lance la détection de mouvement
    detect_motion()
