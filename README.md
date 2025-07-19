# Project-Motion-Detection-System

As a student in system administration, networks, and cybersecurity, I've designed this open-source project to offer reliable, cost-effective, and modular security solutions within my close circle, though it will be integrable into a broader ecosystem project of complementary solutions.
If you notice any security issues or have ideas to improve and make my project more reliable, I am open to any constructive and supportive suggestions.


# OPEN-SOURCE Motion Detection System with Slack/GCP Integration

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
2. Install the required packages:
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

Usage
Run the Python script:

python motion_detection.py

The system will start monitoring for motion and send alerts via Slack when detected.

Example Output
When motion is detected:

A photo is captured and saved locally
The photo is uploaded to Google Cloud Storage
An alert with the photo is sent to your Slack channel
A log entry is created in Google Cloud Logging
Cloud Integration
The project integrates with two Google Cloud services:

Google Cloud Storage for photo storage
Google Cloud Logging for system logs
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
