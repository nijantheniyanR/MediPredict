from backend.predictor import DiabetesPredictor
p = DiabetesPredictor()
print('is_tf_loaded=', p.is_tf_loaded)
print('model_type=', p.model_type)
print('load_error=', getattr(p, 'load_error', None))
