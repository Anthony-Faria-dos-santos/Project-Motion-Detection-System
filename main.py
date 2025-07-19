import cv2
import numpy as np
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

def detect_motion():
    # Initialiser la caméra
    cap = cv2.VideoCapture(0)

    # Lire le premier frame
    ret, frame = cap.read()
    if not ret:
        print("Erreur: Impossible de lire la caméra")
        return

    # Convertir en niveaux de gris
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (21, 21), 0)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Traitement de l'image
        gray_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray_frame = cv2.GaussianBlur(gray_frame, (21, 21), 0)

        # Détection de mouvement
        frame_delta = cv2.absdiff(gray, gray_frame)
        thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)

        # Trouver les contours
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for contour in contours:
            if cv2.contourArea(contour) < 500:
                continue

            # Dessiner un rectangle autour du mouvement
            (x, y, w, h) = cv2.boundingRect(contour)
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

        # Afficher le résultat
        cv2.imshow("Motion Detection", frame)

        # Mettre à jour le frame de référence
        gray = gray_frame.copy()

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    detect_motion()
