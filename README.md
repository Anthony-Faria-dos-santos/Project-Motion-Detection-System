# 🎓 Système de Détection de Mouvement - 

> **Projet Personnel** -  Système de surveillance automatisé avec alertes Slack et stockage cloud

## 📋 À propos du projet

J'ai créé ce projet afin de me challenger à en apprendre plus sur la reconnaissance d'objets. Le code n'est pas parfait mais dans un premier temps ça marche ! 😊
Je m'occuperai de l'améliorer et de l'intégrer dans un ensemble de projet open source lié à la domotique et à la sécurité.

### 🎯 Ce que fait le système

- **Détecte les mouvements** avec une webcam (OpenCV)
- **Prend des photos** quand il détecte quelque chose
- **Envoie des alertes** sur Slack avec les images
- **Sauvegarde tout** dans Google Cloud Storage
- **Fonctionne 24h/24** (Si tout va bien 😅)

## 🚀 Installation rapide

### 1. Prérequis

- Python 3.8 ou plus récent
- Une webcam
- Un compte Slack (gratuit)
- Un compte Google Cloud (gratuit avec crédits)

### 2. Installation

```bash
# Je clone le projet
git clone [URL_DU_REPO]
cd Project-Motion-Detection-System

# J'installe les dépendances
pip install -r requirements.txt

# Je copie le fichier de configuration
cp .env.example .env
```

### 3. Configuration

Éditez le fichier `.env` avec vos informations :

```bash
# Slack (obtenez le token sur https://api.slack.com/apps)
SLACK_TOKEN=xoxb-votre-token-ici
SLACK_CHANNEL=#votre-canal

# Google Cloud (créez un projet sur console.cloud.google.com)
GOOGLE_CLOUD_BUCKET=mon-bucket-captures
```

### 4. Test

```bash
# Je teste que tout fonctionne
python test_connections.py
```

### 5. Lancement

```bash
# Je lance le système
python main.py
```

## 🔧 Configuration détaillée

### Slack Setup

1. **Créer une app Slack** :
   - Allez sur https://api.slack.com/apps
   - Cliquez "Create New App" → "From scratch"
   - Donnez un nom à votre app

2. **Ajouter les permissions** :
   - Dans "OAuth & Permissions"
   - Ajoutez ces scopes : `chat:write`, `files:write`
   - Installez l'app dans votre workspace

3. **Récupérer le token** :
   - Copiez le "Bot User OAuth Token" (commence par `xoxb-`)
   - Collez-le dans votre `.env`

### Google Cloud Setup

1. **Créer un projet** :
   - Allez sur https://console.cloud.google.com
   - Créez un nouveau projet

2. **Activer les APIs** :
   - Cherchez "Cloud Storage API" et activez-la
   - Cherchez "Cloud Logging API" et activez-la

3. **Créer un bucket** :
   - Dans "Cloud Storage" → "Buckets"
   - Créez un nouveau bucket (nom unique globalement)

4. **Configurer l'authentification** :
   - Dans "IAM & Admin" → "Service Accounts"
   - Créez un compte de service
   - Téléchargez le fichier JSON de clé
   - Placez-le dans le projet et ajoutez le chemin dans `.env`

## 📁 Structure du projet

```
Project-Motion-Detection-System/
├── main.py                 # Programme principal (ma première version)
├── test_connections.py     # Script de test (pour débugger)
├── requirements.txt        # Dépendances Python
├── env.example            # Exemple de configuration
├── .env                   # Votre configuration (à créer)
├── captures/              # Images capturées localement
├── utils/
│   ├── gcs_utils.py       # Fonctions Google Cloud (j'ai appris ça!)
│   └── slack_utils.py     # Fonctions Slack (copié de la doc)
└── docs/                  # Documentation (mes notes)
```

## 🎮 Utilisation

### Démarrage simple

```bash
python main.py
```

Le système va :
1. Ouvrir votre webcam
2. Afficher l'image en temps réel
3. Détecter les mouvements (rectangles verts)
4. Prendre des photos automatiquement
5. Envoyer des alertes Slack
6. Sauvegarder dans Google Cloud

### Contrôles

- **Q** : Quitter le programme
- **Espace** : Prendre une photo manuellement (à implémenter)

### Paramètres ajustables

Dans le fichier `.env` :

```bash
# Sensibilité de détection (1-100, plus bas = plus sensible)
MOTION_THRESHOLD=25

# Taille minimale du mouvement (en pixels)
MIN_AREA=500

# Délai entre captures (en secondes)
CAPTURE_INTERVAL=30
```

## 🐛 Dépannage

### Problèmes courants

**❌ "Impossible d'ouvrir la caméra"**
- Vérifiez que votre webcam est connectée
- Essayez `CAMERA_INDEX=1` dans `.env`

**❌ "Erreur Slack API"**
- Vérifiez votre token Slack
- Assurez-vous que le bot est dans le canal

**❌ "Erreur Google Cloud"**
- Vérifiez votre fichier de clé de service
- Assurez-vous que le bucket existe

**❌ "Module not found"**
- Installez les dépendances : `pip install -r requirements.txt`

### Logs et debug

Le système affiche des messages dans la console. Si quelque chose ne marche pas, regardez les messages d'erreur !

## 🔮 Améliorations futures

TODO: ajouter :

- [ ] Interface web pour configurer le système
- [ ] Détection de visages (OpenCV)
- [ ] Reconnaissance d'objets (TensorFlow)
- [ ] Alertes par email
- [ ] Interface mobile
- [ ] Base de données pour les événements
- [ ] Machine learning pour réduire les faux positifs

## 📚 Ce que j'ai intégré dans le projet

- **OpenCV** : Détection de mouvement, traitement d'images
- **APIs REST** : Slack, Google Cloud
- **Gestion d'erreurs** : Try/catch, validation
- **Configuration** : Variables d'environnement
- **Git** : Versioning, documentation
- **Déploiement** : Cloud, conteneurs

## 🤝 Contribution

C'est un projet d'apprentissage, donc :
- Les suggestions sont les bienvenues !
- Les bugs peuvent être signalés
- Le code n'est pas encore parfait

## 📄 Licence

Ce projet est sous licence MIT. Vous pouvez l'utiliser, le modifier, le distribuer librement.

---

**Note** : Ce système est fait pour l'apprentissage et la surveillance personnelle. Utilisez-le de manière responsable et respectez la vie privée des autres ! 🔒


<<<<<<< HEAD
=======
# OPEN-SOURCE Motion Detection System with Slack/GCP Integration
  # =On-Progress= MacOS 

## Overview

This project uses a camera to detect motion, capture photos, and send alerts via Slack. It combines computer vision techniques with cloud services to create a complete, automated solution.

## Project Goals

As a cybersecurity student, this project aims to:
1. Provide an affordable open-source security solution
2. Demonstrate practical implementation of motion detection
3. Serve as a modular component in larger security ecosystems
4. Showcase integration with cloud services (Google Cloud) and collaboration tools (Slack)

## Features

- Motion detection using OpenCV
- Photo capture when motion is detected
- Slack alerts with captured photos
- Photo and log storage in Google Cloud

## Setup

### Prerequisites

- Python 3.x
- Required Python packages: `opencv-python`, `slack-sdk`, `google-cloud-storage`, `google-cloud-logging`, `numpy`, `python-dotenv`

### Installation

1. Clone this repository
2. Install Python@3.10 & pyenv-virtualenv (Python manager to use/switch multiple Python versions with virtual environment)
   ```bash
   brew install python@3.10
   brew install pyenv-virtualenv  
3. Execute Python virtual environment :
   ```bash
   python3.x -m venv venv

4. Install the required packages:
   ```bash
   pip install -r requirements.txt


#### Configuration

#### Slack Setup:

- Create a Slack account and app
- Get an API token for your Slack app
- Set up a Slack channel to receive alerts

#### Google Cloud Setup:

- Create a Google Cloud project
- Enable Google Cloud Storage and Google Cloud Logging APIs
- Create a Google Cloud Storage bucket for photos
- Configure permissions and API keys

#### .env File:

- Clone the .env.exemple file in your project directory and rename it to .env

SLACK_TOKEN=your_slack_token
SLACK_CHANNEL=your_slack_channel
GOOGLE_CLOUD_PROJECT=your_google_cloud_project
GOOGLE_CLOUD_BUCKET=your_google_cloud_storage_bucket

#### Usage

- Run the Python script:
   ```bash
   python3.x main.py

The system will start monitoring for motion and send alerts via Slack when detected.

#### Example Output

When motion is detected:

1- A photo is captured and saved locally
2- The photo is uploaded to Google Cloud Storage
3- An alert with the photo is sent to your Slack channel
4- A log entry is created in Google Cloud Logging

#### Cloud Integration

The project integrates with two Google Cloud services:

- Google Cloud Storage for photo storage
- Google Cloud Logging for system logs
This provides a complete solution with both real-time alerts and historical data storage.



====== LICENCE ======

### Key Points:
- Open-source security solution
- Designed for cost-effective deployment
- Part of a broader ecosystem of security tools

Copyright (c) 2023 Anthony Faria Dos Santos

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software...
>>>>>>> origin/HEAD
