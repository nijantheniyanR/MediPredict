# Deploying MediPredict to Hugging Face Spaces

This repository is ready for deployment on Hugging Face Spaces using Docker.

## 1. Push to GitHub

Push your current `MediPredict` repo to a GitHub repository. Spaces can connect directly to GitHub.

## 2. Create a new Space

1. Go to https://huggingface.co/spaces.
2. Click **Create new Space**.
3. Choose **Docker** as the runtime.
4. Select your GitHub repository or upload the repository contents.

## 3. Build requirements

The repository already includes:

- `Dockerfile` that runs the Flask app with Gunicorn
- `requirements.txt` including TensorFlow and Flask
- `.dockerignore` to keep the build clean

## 4. Expected Space URL

After deploying, your Space URL will be:

```text
https://huggingface.co/spaces/<your-username>/<repo-name>
```

For example:

```text
https://huggingface.co/spaces/johndoe/MediPredict
```

## 5. Local testing before deployment

```bash
cd MediPredict
pip install -r requirements.txt
python app.py
```

Then open `http://localhost:5000`.

## 6. Notes

- Deploying TensorFlow on Spaces may take some time due to the large package.
- If you want to avoid TF on Spaces entirely, use the model server architecture and set `MODEL_SERVER_URL` instead.
