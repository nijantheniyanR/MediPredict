from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import pickle
import numpy as np
import traceback

app = FastAPI(title='MediPredict Model Server')


class PredictRequest(BaseModel):
    Pregnancies: float
    Glucose: float
    BloodPressure: float
    SkinThickness: float
    Insulin: float
    BMI: float
    DiabetesPedigreeFunction: float
    Age: float


MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'diabetes_model.keras')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')

model = None
scaler = None
load_error = None


def load_assets():
    global model, scaler, load_error
    try:
        # Load scaler
        with open(SCALER_PATH, 'rb') as f:
            scaler = pickle.load(f)

        # Load Keras model
        import tensorflow as tf
        model = tf.keras.models.load_model(MODEL_PATH)
        load_error = None
    except Exception as e:
        load_error = str(e) + '\n' + traceback.format_exc()
        model = None
        scaler = None


@app.on_event('startup')
def startup_event():
    load_assets()


@app.get('/api/health')
def health():
    return {
        'model_loaded': model is not None,
        'load_error': load_error
    }


@app.post('/api/predict')
def predict(req: PredictRequest):
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail={'success': False, 'error': 'Model not loaded', 'load_error': load_error})

    try:
        feature_order = [
            'Pregnancies', 'Glucose', 'BloodPressure',
            'SkinThickness', 'Insulin', 'BMI',
            'DiabetesPedigreeFunction', 'Age'
        ]
        input_list = [float(getattr(req, f)) for f in feature_order]
        arr = np.array(input_list).reshape(1, -1)
        scaled = scaler.transform(arr)

        prob_arr = model.predict(scaled, verbose=0)
        prob = float(prob_arr[0][0])
        prediction = 1 if prob >= 0.5 else 0
        confidence = prob if prediction == 1 else (1.0 - prob)

        return {
            'success': True,
            'prediction': int(prediction),
            'label': 'Likely Diabetic' if prediction == 1 else 'Likely Non-Diabetic',
            'confidence': confidence,
            'model_type': 'TensorFlow Sequential Neural Network'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail={'success': False, 'error': str(e)})
