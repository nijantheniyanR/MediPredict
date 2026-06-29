import os
import pickle
import math
import numpy as np

# Set TensorFlow logging to suppress warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

class DiabetesPredictor:
    def __init__(self, model_dir='models'):
        self.model_dir = model_dir
        self.model_path_tf = os.path.join(model_dir, 'diabetes_model.keras')
        self.model_path_sklearn = os.path.join(model_dir, 'diabetes_model.pkl')
        self.scaler_path = os.path.join(model_dir, 'scaler.pkl')
        
        self.model = None
        self.scaler = None
        self.load_error = None
        self.is_tf_loaded = False
        self.model_type = 'None'
        
        # Load the models/scaler
        self.load_assets()

    def load_assets(self):
        """Attempts to load the TensorFlow model/Scikit-Learn fallback and scaler from disk."""
        if os.path.exists(self.scaler_path):
            try:
                with open(self.scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                
                # Check for Keras/TensorFlow model first
                if os.path.exists(self.model_path_tf):
                    try:
                        import tensorflow as tf
                        self.model = tf.keras.models.load_model(self.model_path_tf)
                        self.is_tf_loaded = True
                        self.model_type = 'TensorFlow Sequential Neural Network'
                        self.load_error = None
                        print("[MediPredict Predictor] Successfully loaded TensorFlow model and Scaler.")
                        return
                    except Exception as e:
                        self.load_error = str(e)
                        print(f"[MediPredict Predictor] Error loading TensorFlow assets: {e}")
                
                # Check for Scikit-Learn fallback model next
                if os.path.exists(self.model_path_sklearn):
                    try:
                        with open(self.model_path_sklearn, 'rb') as f:
                            self.model = pickle.load(f)
                        self.is_tf_loaded = True
                        self.model_type = 'Scikit-Learn MLP Neural Network'
                        self.load_error = None
                        print("[MediPredict Predictor] Successfully loaded Scikit-Learn MLP model and Scaler.")
                        return
                    except Exception as e:
                        self.load_error = str(e)
                        print(f"[MediPredict Predictor] Error loading Scikit-Learn assets: {e}")
                
                self.load_error = 'Model binary file not found.'
                print("[MediPredict Predictor] Model binary file not found.")
                self.is_tf_loaded = False
            except Exception as e:
                self.load_error = str(e)
                print(f"[MediPredict Predictor] Error loading assets: {e}")
                self.is_tf_loaded = False
        else:
            self.load_error = 'Scaler file not found.'
            print("[MediPredict Predictor] Scaler file not found.")
            print("[MediPredict Predictor] Run 'python train_model.py' to generate model assets.")
            print("[MediPredict Predictor] Running in Heuristic Fallback mode.")
            self.is_tf_loaded = False

    def check_and_reload(self):
        """Checks if assets became available and loads them (allows hot-reloading)."""
        if not self.is_tf_loaded:
            if os.path.exists(self.scaler_path) and (os.path.exists(self.model_path_tf) or os.path.exists(self.model_path_sklearn)):
                print("[MediPredict Predictor] Detected model assets! Reloading...")
                self.load_assets()

    def predict_heuristic(self, features):
        """
        Fallback heuristic model calibrated on the PIMA Indians Diabetes Dataset.
        Provides a logical prediction and confidence score based on input features.
        """
        # Feature mapping
        pregnancies = features.get('Pregnancies', 0)
        glucose = features.get('Glucose', 120)
        bp = features.get('BloodPressure', 70)
        skin = features.get('SkinThickness', 20)
        insulin = features.get('Insulin', 80)
        bmi = features.get('BMI', 30.0)
        pedigree = features.get('DiabetesPedigreeFunction', 0.5)
        age = features.get('Age', 33)

        # Log-odds equation coefficients estimated from logistic regression on PIMA dataset
        z = -5.3
        z += pregnancies * 0.12
        z += glucose * 0.036
        z += bp * -0.012
        z += skin * 0.004
        z += insulin * 0.0008
        z += bmi * 0.082
        z += pedigree * 0.98
        z += age * 0.016

        # Sigmoid function to map to probability (0 to 1)
        prob = 1.0 / (1.0 + math.exp(-z))
        
        prediction = 1 if prob >= 0.5 else 0
        confidence = prob if prediction == 1 else (1.0 - prob)
        
        return {
            'prediction': prediction,
            'confidence': float(confidence),
            'model_type': 'Heuristic Fallback (PIMA Calibrated)'
        }

    def predict(self, features):
        """
        Runs prediction on the input features.
        features: dict containing the 8 PIMA features
        """
        # Hot-reload check (switches to model dynamically if it gets trained)
        self.check_and_reload()
        
        if not self.is_tf_loaded:
            return self.predict_heuristic(features)
        
        # Extract features in the correct order
        feature_order = [
            'Pregnancies', 'Glucose', 'BloodPressure', 
            'SkinThickness', 'Insulin', 'BMI', 
            'DiabetesPedigreeFunction', 'Age'
        ]
        
        try:
            input_list = [float(features[col]) for col in feature_order]
            input_arr = np.array(input_list).reshape(1, -1)
            
            # Scale input
            scaled_arr = self.scaler.transform(input_arr)
            
            # Predict probability based on model type
            if self.model_type == 'Scikit-Learn MLP Neural Network':
                prob_arr = self.model.predict_proba(scaled_arr)
                prob = float(prob_arr[0][1])
            else:
                # Predict probability using Keras model
                prob_arr = self.model.predict(scaled_arr, verbose=0)
                prob = float(prob_arr[0][0])
            
            prediction = 1 if prob >= 0.5 else 0
            confidence = prob if prediction == 1 else (1.0 - prob)
            
            return {
                'prediction': prediction,
                'confidence': confidence,
                'model_type': self.model_type
            }
        except Exception as e:
            print(f"[MediPredict Predictor] Error during inference: {e}")
            # Fall back if prediction fails for any reason
            return self.predict_heuristic(features)
