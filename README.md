# 🎓 Système de Détection de Mouvement - 

> **Projet Personnel** -  Système de surveillance automatisé avec alertes Slack et stockage cloud

## 📋 À propos du projet

J'ai créé ce projet afin de me challenger. Le code n'est pas parfait mais dans un premier temps ça marche ! 😊
Je m'occuperai de l'améliorer et de l'intégrer dans un ensemble de projet open source lié à la domotique et à la sécurité.

### 🎯 Ce que fait le système

- **Détecte les mouvements** avec une webcam (OpenCV)
- **Prend des photos** quand il détecte quelque chose
- **Envoie des alertes** sur Slack avec les images
- **Sauvegarde tout** dans Google Cloud Storage
- **Fonctionne 24h/24** 

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
   - Créez un channel pour votre app (ex: #motion-detection)
   - Ajouter votre bot à votre channel

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
   - Créez un compte de service (attribuer le role "roles/storage.objectAdmin")
   - Téléchargez le fichier JSON de clé (Cliquez sur le service crée, onglet "Clés", ajouter une clé et téléchargez le fichier JSON)
   - Placez-le dans le projet et ajoutez le chemin dans la variable GOOGLE_APPLICATION_CREDENTIALS dans le fichier `.env`

## 📁 Structure du projet

```
Project-Motion-Detection-System/
├── main.py                 # Programme principal (ma première version)
├── test_connections.py     # Script de test (pour débugger)
├── requirements.txt        # Dépendances Python
├── env.example            # Exemple de configuration
├── .env                   # Votre configuration (à créer lors du 1er lancement de setup.py)
├── captures/              # Images capturées localement
├── utils/
│   ├── gcs_utils.py       # Fonctions Google Cloud
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

# Taille minimale du mouvement (en pixels) plus bas = plus sensible
MIN_AREA=5000

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

**❌ "Erreur de connexion"**
- Vérifiez que vous avez bien configuré le fichier de clé de service dans la variable GOOGLE_APPLICATION_CREDENTIALS dans le fichier `.env`

**❌ "Les variables d'environnement ne sont pas chargées"**
- Si vous utilisez un environnement virtuel (ex: venv), après avoir modifié le fichier `.env`, il faut lancer le script reload_venv.sh via la commande `source reload_venv.sh` 

### Logs et debug

Le système affiche des messages dans la console. Si quelque chose ne marche pas, regardez les messages d'erreur !

## 🔮 Améliorations futures

TODO: ajouter :

- [ ] Intergration du Workload Identity Federation (WIF) plutôt que de charger le fichier de clé de service dans le code
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