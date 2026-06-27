import os
import urllib.request
import pickle
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend for server environments
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
    from tensorflow.keras.regularizers import l2
    HAS_TENSORFLOW = True
except ImportError:
    HAS_TENSORFLOW = False
    from sklearn.neural_network import MLPClassifier

# Set random seed for reproducibility
np.random.seed(42)
if HAS_TENSORFLOW:
    tf.random.set_seed(42)

# File Paths
DATASET_DIR = 'dataset'
DATASET_PATH = os.path.join(DATASET_DIR, 'diabetes.csv')
MODELS_DIR = 'models'
SCALER_PATH = os.path.join(MODELS_DIR, 'scaler.pkl')
MODEL_PATH = os.path.join(MODELS_DIR, 'diabetes_model.keras')
METRICS_PATH = os.path.join(MODELS_DIR, 'metrics.json')
IMAGES_DIR = os.path.join('static', 'images')

# Ensure directories exist
os.makedirs(DATASET_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

# URL of PIMA Indians Diabetes Dataset
DATASET_URL = 'https://raw.githubusercontent.com/npradaschnor/Pima-Indians-Diabetes-Dataset/master/diabetes.csv'

def download_dataset():
    if not os.path.exists(DATASET_PATH):
        print(f"Downloading PIMA Indians Diabetes Dataset from {DATASET_URL}...")
        try:
            urllib.request.urlretrieve(DATASET_URL, DATASET_PATH)
            print("Dataset downloaded and saved successfully.")
        except Exception as e:
            print(f"Error downloading dataset: {e}")
            raise e
    else:
        print("Dataset already exists locally.")

def clean_and_prepare_data():
    print("Loading and preprocessing dataset...")
    df = pd.read_csv(DATASET_PATH)
    
    # Features with invalid zeros that represent missing values
    zero_columns = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
    
    # Replace zeros with NaN
    for col in zero_columns:
        df[col] = df[col].replace(0, np.nan)
    
    # Impute NaNs with median values of their respective columns
    # We use median as it is robust to outliers
    medians = {}
    for col in zero_columns:
        median_val = df[col].median()
        df[col] = df[col].fillna(median_val)
        medians[col] = float(median_val)
        print(f"Imputed missing (0) values in {col} with median: {median_val:.2f}")
    
    # Save medians for reference or validation in deployment if needed
    with open(os.path.join(MODELS_DIR, 'imputation_medians.json'), 'w') as f:
        json.dump(medians, f, indent=4)
        
    X = df.drop(columns=['Outcome'])
    y = df['Outcome']
    
    # Train-test split (80/20, stratified to maintain class ratio)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Save scaler
    with open(SCALER_PATH, 'wb') as f:
        pickle.dump(scaler, f)
    print(f"Scaler saved to {SCALER_PATH}")
    
    return X_train_scaled, X_test_scaled, y_train, y_test, X.columns.tolist()

def build_model(input_dim):
    print("Building TensorFlow Deep Learning Model...")
    model = Sequential([
        # Input + Hidden Layer 1
        Dense(64, input_dim=input_dim, kernel_regularizer=l2(0.001)),
        BatchNormalization(),
        Dense(64, activation='relu'),
        Dropout(0.2),
        
        # Hidden Layer 2
        Dense(32, kernel_regularizer=l2(0.001)),
        BatchNormalization(),
        Dense(32, activation='relu'),
        Dropout(0.1),
        
        # Hidden Layer 3
        Dense(16, activation='relu'),
        
        # Output Layer
        Dense(1, activation='sigmoid')
    ])
    
    # Compile model
    optimizer = tf.keras.optimizers.Adam(learning_rate=0.001)
    model.compile(
        optimizer=optimizer,
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    model.summary()
    return model

def train_and_evaluate():
    download_dataset()
    X_train, X_test, y_train, y_test, feature_names = clean_and_prepare_data()
    
    if HAS_TENSORFLOW:
        model = build_model(X_train.shape[1])
        
        # Callbacks
        early_stopping = EarlyStopping(
            monitor='val_loss', 
            patience=15, 
            restore_best_weights=True,
            verbose=1
        )
        
        lr_scheduler = ReduceLROnPlateau(
            monitor='val_loss', 
            factor=0.5, 
            patience=8, 
            min_lr=1e-5,
            verbose=1
        )
        
        # Train the model
        print("Starting TensorFlow model training...")
        history = model.fit(
            X_train, y_train,
            validation_split=0.2,
            epochs=150,
            batch_size=32,
            callbacks=[early_stopping, lr_scheduler],
            verbose=1
        )
        
        # Save model
        model.save(MODEL_PATH)
        print(f"Trained TensorFlow model saved to {MODEL_PATH}")
        
        # Evaluate model
        print("Evaluating model...")
        y_pred_prob = model.predict(X_test)
        y_pred = (y_pred_prob >= 0.5).astype(int).flatten()
    else:
        print("TensorFlow not found. Training Scikit-Learn MLPClassifier (Neural Network) fallback instead...")
        model = MLPClassifier(
            hidden_layer_sizes=(64, 32, 16),
            activation='relu',
            solver='adam',
            alpha=0.001,
            batch_size=32,
            learning_rate_init=0.001,
            max_iter=150,
            early_stopping=True,
            validation_fraction=0.2,
            random_state=42,
            verbose=True
        )
        
        model.fit(X_train, y_train)
        
        # Save model (pickle)
        sklearn_model_path = os.path.join(MODELS_DIR, 'diabetes_model.pkl')
        with open(sklearn_model_path, 'wb') as f:
            pickle.dump(model, f)
        print(f"Trained Scikit-Learn MLP model saved to {sklearn_model_path}")
        
        # Evaluate model
        print("Evaluating model...")
        y_pred_prob = model.predict_proba(X_test)[:, 1]
        y_pred = (y_pred_prob >= 0.5).astype(int).flatten()
        
        class MLPClassifierHistory:
            def __init__(self, clf):
                self.history = {
                    'loss': clf.loss_curve_,
                    'val_accuracy': clf.validation_scores_ if clf.validation_scores_ is not None else []
                }
        history = MLPClassifierHistory(model)
        
    # Compute metrics
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    metrics = {
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1_score': float(f1)
    }
    
    print("\n--- Model Evaluation Results ---")
    print(f"Accuracy:  {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall:    {rec:.4f}")
    print(f"F1 Score:  {f1:.4f}")
    print("Confusion Matrix:")
    print(cm)
    print("--------------------------------\n")
    
    # Save metrics JSON
    with open(METRICS_PATH, 'w') as f:
        json.dump(metrics, f, indent=4)
    print(f"Metrics saved to {METRICS_PATH}")
    
    # Save Plots
    plot_training_history(history)
    plot_confusion_matrix(cm)

def plot_training_history(history):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    # Set aesthetics style
    sns.set_theme(style="whitegrid")
    
    # Plot Accuracy
    accuracy_plotted = False
    if 'accuracy' in history.history and len(history.history['accuracy']) > 0:
        ax1.plot(history.history['accuracy'], label='Train Accuracy', color='#1e88e5', linewidth=2)
        accuracy_plotted = True
    if 'val_accuracy' in history.history and len(history.history['val_accuracy']) > 0:
        ax1.plot(history.history['val_accuracy'], label='Val Accuracy', color='#ffb300', linewidth=2)
        accuracy_plotted = True
    
    ax1.set_title('Model Accuracy over Epochs', fontsize=14, fontweight='bold', pad=15)
    ax1.set_xlabel('Epochs', fontsize=12)
    ax1.set_ylabel('Accuracy', fontsize=12)
    if accuracy_plotted:
        ax1.legend(loc='lower right', frameon=True, facecolor='white', edgecolor='none')
    
    # Plot Loss
    loss_plotted = False
    if 'loss' in history.history and len(history.history['loss']) > 0:
        ax2.plot(history.history['loss'], label='Train Loss', color='#e53935', linewidth=2)
        loss_plotted = True
    if 'val_loss' in history.history and len(history.history['val_loss']) > 0:
        ax2.plot(history.history['val_loss'], label='Val Loss', color='#8e24aa', linewidth=2)
        loss_plotted = True
        
    ax2.set_title('Model Loss over Epochs', fontsize=14, fontweight='bold', pad=15)
    ax2.set_xlabel('Epochs', fontsize=12)
    ax2.set_ylabel('Loss', fontsize=12)
    if loss_plotted:
        ax2.legend(loc='upper right', frameon=True, facecolor='white', edgecolor='none')
    
    plt.tight_layout()
    plot_path = os.path.join(IMAGES_DIR, 'training_metrics.png')
    plt.savefig(plot_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Training metrics plot saved to {plot_path}")

def plot_confusion_matrix(cm):
    plt.figure(figsize=(6, 5))
    sns.set_theme(style="white")
    
    # Create beautiful heatmap labels
    group_names = ['True Neg', 'False Pos', 'False Neg', 'True Pos']
    group_counts = [f"{value}" for value in cm.flatten()]
    group_percentages = [f"{value:.2%}" for value in cm.flatten() / np.sum(cm)]
    
    labels = [f"{v1}\n{v2}\n{v3}" for v1, v2, v3 in zip(group_names, group_counts, group_percentages)]
    labels = np.asarray(labels).reshape(2, 2)
    
    # Blue and Green medical color palette map
    cmap = sns.light_palette("#1e88e5", as_cmap=True)
    
    sns.heatmap(
        cm, annot=labels, fmt='', cmap=cmap, cbar=False,
        xticklabels=['Non-Diabetic', 'Diabetic'],
        yticklabels=['Non-Diabetic', 'Diabetic'],
        annot_kws={"fontsize": 11, "fontweight": "bold"}
    )
    
    plt.title('Confusion Matrix', fontsize=14, fontweight='bold', pad=15)
    plt.xlabel('Predicted Label', fontsize=12, labelpad=10)
    plt.ylabel('Actual Label', fontsize=12, labelpad=10)
    
    plt.tight_layout()
    plot_path = os.path.join(IMAGES_DIR, 'confusion_matrix.png')
    plt.savefig(plot_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Confusion matrix plot saved to {plot_path}")

if __name__ == '__main__':
    train_and_evaluate()
