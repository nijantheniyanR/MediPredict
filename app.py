import os
import json
from flask import Flask, render_template, request, jsonify
from backend.predictor import DiabetesPredictor
import requests

app = Flask(__name__)

# Optional remote model server URL (e.g. http://tf-server.example.com)
MODEL_SERVER_URL = os.environ.get('MODEL_SERVER_URL')

# Initialize Predictor
predictor = DiabetesPredictor()

def load_metrics():
    """Loads model performance metrics from metrics.json or returns defaults."""
    metrics_path = os.path.join('models', 'metrics.json')
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, 'r') as f:
                return json.load(f), False
        except Exception:
            pass
    
    # Baseline/Typical PIMA model metrics to show as placeholder if model is not yet trained
    default_metrics = {
        'accuracy': 0.7922,
        'precision': 0.7347,
        'recall': 0.6545,
        'f1_score': 0.6923
    }
    return default_metrics, True

def generate_recommendations(features, prediction):
    """Generates simple health tips based on input features and prediction."""
    tips = []
    glucose = float(features.get('Glucose', 0))
    bmi = float(features.get('BMI', 0))
    bp = float(features.get('BloodPressure', 0))
    age = float(features.get('Age', 0))
    
    if prediction == 1:
        tips.append("Consult a healthcare professional for a diagnostic glucose tolerance test (OGTT) or HbA1c screening.")
        if glucose > 140:
            tips.append("Your glucose level is elevated. Consider monitoring your carbohydrate intake and checking pre- and post-meal glucose.")
        if bmi > 25:
            tips.append("Adopting a low-glycemic, calorie-controlled diet and regular cardiovascular exercise can help improve insulin sensitivity.")
    else:
        tips.append("Maintain your healthy routine! Focus on a balanced diet rich in fiber, whole grains, and lean proteins.")
        if glucose > 100:
            tips.append("Your fasting glucose is in the pre-diabetic range (100-125 mg/dL). Consider reducing refined sugars.")
        if bmi > 25:
            tips.append("Even with low immediate diabetes risk, maintaining a healthy BMI (18.5 - 24.9) supports long-term metabolic health.")
            
    if bp > 80:
        tips.append("Your blood pressure is elevated. Reducing sodium intake and practicing stress-management techniques are recommended.")
        
    if age > 45:
        tips.append("Annual metabolic screenings are recommended for individuals over 45 years of age.")
        
    return tips

# --- UI ROUTES ---

@app.route('/')
def index():
    return render_template('index.html', page='home')

@app.route('/predict')
def predict_ui():
    return render_template('predict.html', page='predict', model_loaded=predictor.is_tf_loaded)

# --- API ENDPOINTS ---

@app.route('/api/health', methods=['GET'])
def health():
    metrics, is_default = load_metrics()
    return jsonify({
        'status': 'healthy',
        'app_name': 'MediPredict',
        'tensorflow_model_loaded': predictor.is_tf_loaded,
        'fallback_mode': not predictor.is_tf_loaded,
        'load_error': getattr(predictor, 'load_error', None),
        'model_metrics_available': not is_default,
        'metrics': metrics
    })

@app.route('/api/predict', methods=['POST'])
def predict_api():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No input data provided'}), 400
        
        # Define expected features and human-readable names for error messages
        required_features = {
            'Pregnancies': 'Pregnancies',
            'Glucose': 'Glucose Level',
            'BloodPressure': 'Blood Pressure',
            'SkinThickness': 'Skin Thickness',
            'Insulin': 'Insulin Level',
            'BMI': 'Body Mass Index (BMI)',
            'DiabetesPedigreeFunction': 'Diabetes Pedigree Function',
            'Age': 'Age'
        }

        # Dynamically calculate DiabetesPedigreeFunction from Family History questionnaire if missing
        if 'DiabetesPedigreeFunction' not in data or data['DiabetesPedigreeFunction'] is None or str(data['DiabetesPedigreeFunction']).strip() == "":
            family_keys = ['FamilyHistory', 'FatherDiabetic', 'MotherDiabetic', 'SiblingDiabetic']
            if all(k in data for k in family_keys):
                family_history = str(data.get('FamilyHistory', 'no')).lower() == 'yes'
                father = str(data.get('FatherDiabetic', 'no')).lower() == 'yes'
                mother = str(data.get('MotherDiabetic', 'no')).lower() == 'yes'
                sibling = str(data.get('SiblingDiabetic', 'no')).lower() == 'yes'
                
                dpf = 0.08
                if family_history:
                    dpf = 0.15
                    if father: dpf += 0.25
                    if mother: dpf += 0.25
                    if sibling: dpf += 0.20
                data['DiabetesPedigreeFunction'] = round(dpf, 3)

        # Validation checks
        validated_data = {}
        errors = {}
        
        for key, name in required_features.items():
            if key not in data or data[key] is None or str(data[key]).strip() == "":
                errors[key] = f"{name} is required."
                continue
                
            try:
                val = float(data[key])
                if val < 0:
                    errors[key] = f"{name} cannot be negative."
                else:
                    validated_data[key] = val
            except ValueError:
                errors[key] = f"{name} must be a valid number."
        
        # Additional clinical range checks to flag extreme errors (not blocker, but warnings)
        if not errors:
            # Pregnancies limit
            if validated_data['Pregnancies'] > 25:
                errors['Pregnancies'] = "Pregnancies must be between 0 and 25."
            # Age limit
            if validated_data['Age'] > 120 or validated_data['Age'] < 1:
                errors['Age'] = "Age must be between 1 and 120."
            # BMI limit
            if validated_data['BMI'] > 100 or validated_data['BMI'] < 5:
                errors['BMI'] = "BMI must be between 5.0 and 100.0."
            # Glucose limit
            if validated_data['Glucose'] > 500 or validated_data['Glucose'] < 10:
                errors['Glucose'] = "Glucose must be between 10 and 500 mg/dL."
            # BloodPressure limit
            if validated_data['BloodPressure'] > 300 or validated_data['BloodPressure'] < 10:
                errors['BloodPressure'] = "Blood pressure must be between 10 and 300 mmHg."
            # SkinThickness limit
            if validated_data['SkinThickness'] > 120:
                errors['SkinThickness'] = "Skin thickness must be below 120 mm."
            # Insulin limit
            if validated_data['Insulin'] > 2000:
                errors['Insulin'] = "Insulin level must be below 2000 uIU/mL."
            # DiabetesPedigreeFunction limit
            if validated_data['DiabetesPedigreeFunction'] > 5.0:
                errors['DiabetesPedigreeFunction'] = "Diabetes pedigree function must be below 5.0."

        if errors:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'validation_errors': errors
            }), 400
        
        # If local TF/scikit model is not loaded but a remote model server is configured,
        # forward the validated payload to the remote server and return its response.
        if not predictor.is_tf_loaded and MODEL_SERVER_URL:
            try:
                remote_resp = requests.post(
                    MODEL_SERVER_URL.rstrip('/') + '/api/predict',
                    json=validated_data,
                    timeout=5
                )
                if remote_resp.status_code == 200:
                    jr = remote_resp.json()
                    # If remote succeeded, forward it
                    if jr.get('success'):
                        return jsonify(jr)
                # If remote failed or returned non-200, fall back to local heuristic
            except Exception as e:
                print(f"[MediPredict] Error forwarding to remote model server: {e}")

        # Run prediction (local predictor may fall back to heuristic)
        res = predictor.predict(validated_data)
        
        prediction = int(res['prediction'])
        confidence = float(res['confidence'])
        model_type = res['model_type']
        
        label = "Likely Diabetic" if prediction == 1 else "Likely Non-Diabetic"
        recommendations = generate_recommendations(validated_data, prediction)
        
        return jsonify({
            'success': True,
            'prediction': prediction,
            'label': label,
            'confidence': confidence,
            'model_type': model_type,
            'recommendations': recommendations
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'An unexpected error occurred during prediction: {str(e)}'
        }), 500

if __name__ == '__main__':
    # Bind to 0.0.0.0 to make it accessible in containerised or network set ups
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
