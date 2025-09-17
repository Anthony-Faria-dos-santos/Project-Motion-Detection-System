# 🎓 Motion Detection System

> **Personal Project** – Automated surveillance system with Slack alerts and cloud storage

## 📋 About the project

I created this project as a challenge to learn more about object recognition. The code isn’t perfect but it works for now! 😊
I plan to improve it and integrate it into a set of open source projects related to home automation and security.

### 🎯 What the system does

- **Detects motion** with a webcam (OpenCV)
- **Takes pictures** when something is detected
- **Sends alerts** on Slack with images
- **Saves everything** in Google Cloud Storage
- **Runs 24/7**

## 🚀 Quick installation

### 1. Prerequisites

- Python 3.8 or newer
- A webcam
- A Slack account (free)
- A Google Cloud account (free with credits)

### 2. Installation

```bash
# Clone the project
git clone [REPO_URL]
cd Project-Motion-Detection-System

# Install dependencies
pip install -r requirements.txt

# Copy the configuration file
cp .env.example .env
```

### 3. Configuration

Edit the `.env` file with your information:

```bash
# Slack (get the token at https://api.slack.com/apps)
SLACK_TOKEN=xoxb-your-token-here
SLACK_CHANNEL=your-channel

# Google Cloud (create a project at console.cloud.google.com)
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLOUD_BUCKET=my-bucket-captures-motion-detection
GOOGLE_APPLICATION_CREDENTIALS=path/to/your-key-file.json
```

### 4. Test

```bash
# Test that everything works
python test_connections.py
```

### 5. Launch

```bash
# Start the system
python main.py
```

## 🔧 Detailed configuration

### Slack Setup

1. **Create a Slack app:**
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Give your app a name

2. **Add permissions:**
   - In "OAuth & Permissions"
   - Add these scopes: `chat:write`, `files:write`
   - Install the app in your workspace
   - Create a channel for your app (e.g.: #motion-detection)
   - Add your bot to your channel

3. **Get the token:**
   - Copy the "Bot User OAuth Token" (starts with `xoxb-`)
   - Paste it into your `.env`

### Google Cloud Setup

1. **Create a project:**
   - Go to https://console.cloud.google.com
   - Create a new project

2. **Enable APIs:**
   - Search for "Cloud Storage API" and enable it
   - Search for "Cloud Logging API" and enable it

3. **Create a bucket:**
   - In "Cloud Storage" → "Buckets"
   - Create a new bucket (globally unique name)

4. **Set up authentication:**
   - In "IAM & Admin" → "Service Accounts"
   - Create a service account (assign the role "roles/storage.objectAdmin")
   - Download the JSON key file (Click on the created service, "Keys" tab, add a key and download the JSON file)
   - Place it in the project and add the path in the GOOGLE_APPLICATION_CREDENTIALS variable in the `.env` file

## 📁 Project structure

```
Project-Motion-Detection-System/
├── main.py                 # Main program (my first version)
├── test_connections.py     # Test script (for debugging)
├── requirements.txt        # Python dependencies
├── env.example             # Configuration example
├── .env                    # Your configuration (to be created at first setup)
├── captures/               # Locally captured images
├── utils/
│   ├── gcs_utils.py       # Google Cloud functions
│   └── slack_utils.py     # Slack functions (copied from the docs)
└── docs/                  # Documentation (my notes)
```

## 🎮 Usage

### Simple start

```bash
python main.py
```

The system will:
1. Open your webcam
2. Display the image in real time
3. Detect motion (green rectangles)
4. Take pictures automatically
5. Send Slack alerts
6. Save to Google Cloud

### Controls

- **Q** : Quit the program
- **Space** : Take a picture manually (to be implemented)

### Adjustable parameters

In the `.env` file:

```bash
# Detection sensitivity (1-100, lower = more sensitive)
MOTION_THRESHOLD=25

# Minimum movement area (in pixels) lower = more sensitive
MIN_AREA=5000

# Delay between captures (in seconds)
CAPTURE_INTERVAL=30
```

## 🐛 Troubleshooting

### Common issues

**❌ "Unable to open camera"**
- Check that your webcam is connected
- Try `CAMERA_INDEX=1` in `.env`

**❌ "Slack API error"**
- Check your Slack token
- Make sure the bot is in the channel

**❌ "Google Cloud error"**
- Check your service key file
- Make sure the bucket exists

**❌ "Module not found"**
- Install dependencies: `pip install -r requirements.txt`

**❌ "Connection error"**
- Make sure you have set up the service key file in the GOOGLE_APPLICATION_CREDENTIALS variable in the `.env` file

**❌ "Environment variables are not loaded"**
- If you use a virtual environment (e.g.: venv), after modifying the `.env` file, run the script reload_venv.sh with the command `source reload_venv.sh`

### Logs and debug

The system prints messages in the console. If something doesn’t work, check the error messages!

## 🔮 Future improvements

TODO: add:

- [ ] Integration of Workload Identity Federation (WIF) instead of loading the service key file in the code
- [ ] Web interface to configure the system
- [ ] Face detection (OpenCV)
- [ ] Object recognition (TensorFlow)
- [ ] Email alerts
- [ ] Mobile interface
- [ ] Database for events
- [ ] Machine learning to reduce false positives

## 📚 What I integrated in the project

- **OpenCV**: Motion detection, image processing
- **REST APIs**: Slack, Google Cloud
- **Error handling**: Try/catch, validation
- **Configuration**: Environment variables
- **Git**: Versioning, documentation
- **Deployment**: Cloud, containers

## 🤝 Contribution

This is a learning project, so:
- Suggestions are welcome!
- Bugs can be reported
- The code is not perfect yet

## 📄 License

This project is under the MIT license. You can use, modify, and distribute it freely.

---

**Note**: This system is for learning and personal surveillance. Use it responsibly and respect others’ privacy! 🔒 