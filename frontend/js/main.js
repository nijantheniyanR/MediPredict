/* --------------------------------------------------
   MediPredict Standalone Static Frontend JS
-------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // API Endpoint resolution
    // If run from file:/// in browser, target local Flask server on port 5000.
    // If served from Flask, use relative path.
    const isLocalFile = window.location.protocol === 'file:';
    const API_URL = isLocalFile ? 'http://127.0.0.1:5000/api/predict' : '/api/predict';

    console.log(`[MediPredict Static Frontend] API target resolved to: ${API_URL}`);

    // DOM Elements
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileCloseBtn = document.getElementById('mobile-close-btn');
    const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
    const mobileDrawerOverlay = document.getElementById('mobile-drawer-overlay');
    
    const diabetesForm = document.getElementById('diabetes-form');
    const resetFormBtn = document.getElementById('reset-form-btn');
    const fillSampleBtn = document.getElementById('fill-sample-btn');
    const predictSubmitBtn = document.getElementById('predict-submit-btn');
    const formSpinner = document.getElementById('form-spinner');
    
    const initialResultCard = document.getElementById('initial-result-card');
    const resultDisplayCard = document.getElementById('result-display-card');
    const resultModelBadge = document.getElementById('result-model-badge');
    const resultStatusPanel = document.getElementById('result-status-panel');
    const resultStatusIcon = document.getElementById('result-status-icon');
    const resultStatusValue = document.getElementById('result-status-value');
    const gaugeProgressCircle = document.getElementById('gauge-progress-circle');
    const resultConfidenceValue = document.getElementById('result-confidence-value');
    const resultRecommendationsList = document.getElementById('result-recommendations-list');

    // --- MOBILE DRAWER NAVIGATION ---
    
    function openDrawer() {
        mobileNavDrawer.classList.add('open');
        mobileDrawerOverlay.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }
    
    function closeDrawer() {
        mobileNavDrawer.classList.remove('open');
        mobileDrawerOverlay.classList.remove('visible');
        document.body.style.overflow = '';
    }
    
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
    if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeDrawer);
    if (mobileDrawerOverlay) mobileDrawerOverlay.addEventListener('click', closeDrawer);

    // --- FAMILY HISTORY SELECTION LOGIC ---
    const familyHistorySelect = document.getElementById('FamilyHistory');
    const fatherDiabeticSelect = document.getElementById('FatherDiabetic');
    const motherDiabeticSelect = document.getElementById('MotherDiabetic');
    const siblingDiabeticSelect = document.getElementById('SiblingDiabetic');

    function handleFamilyHistoryChange() {
        if (!familyHistorySelect || !fatherDiabeticSelect || !motherDiabeticSelect || !siblingDiabeticSelect) return;
        const isHistoryNo = familyHistorySelect.value === 'no';
        
        const dependents = [fatherDiabeticSelect, motherDiabeticSelect, siblingDiabeticSelect];
        dependents.forEach(select => {
            select.disabled = isHistoryNo;
            const group = select.closest('.form-group');
            if (group) {
                if (isHistoryNo) {
                    select.value = 'no';
                    group.style.opacity = '0.5';
                    group.style.pointerEvents = 'none';
                    // Clear error spans
                    const errSpan = document.getElementById(`err-${select.id}`);
                    if (errSpan) errSpan.textContent = "";
                    group.classList.remove('has-error');
                } else {
                    group.style.opacity = '1';
                    group.style.pointerEvents = 'auto';
                }
            }
        });
    }

    if (familyHistorySelect) {
        familyHistorySelect.addEventListener('change', handleFamilyHistoryChange);
    }

    // Dynamic Diabetes Pedigree Function Calculation
    function calculatePedigreeFunction(familyHistory, fatherDiabetic, motherDiabetic, siblingDiabetic) {
        if (familyHistory === 'no') {
            return 0.08;
        }
        let dpf = 0.15;
        if (fatherDiabetic === 'yes') dpf += 0.25;
        if (motherDiabetic === 'yes') dpf += 0.25;
        if (siblingDiabetic === 'yes') dpf += 0.20;
        return parseFloat(dpf.toFixed(3));
    }

    // Initialize interactive states
    handleFamilyHistoryChange();

    // --- SAMPLE PATIENT DATA SEEDS ---
    
    const samplePatients = [
        {
            Pregnancies: 1,
            Glucose: 85,
            BloodPressure: 66,
            SkinThickness: 29,
            Insulin: 45,
            BMI: 24.2,
            FamilyHistory: 'yes',
            FatherDiabetic: 'no',
            MotherDiabetic: 'no',
            SiblingDiabetic: 'yes',
            Age: 25
        },
        {
            Pregnancies: 6,
            Glucose: 154,
            BloodPressure: 78,
            SkinThickness: 32,
            Insulin: 125,
            BMI: 34.6,
            FamilyHistory: 'yes',
            FatherDiabetic: 'yes',
            MotherDiabetic: 'yes',
            SiblingDiabetic: 'no',
            Age: 47
        }
    ];
    
    let currentSampleIndex = 0;
    
    function loadSampleData() {
        const seed = samplePatients[currentSampleIndex];

        // Handle Family History select first
        if (familyHistorySelect && seed.hasOwnProperty('FamilyHistory')) {
            familyHistorySelect.value = seed.FamilyHistory;
            handleFamilyHistoryChange();
        }
        
        Object.keys(seed).forEach(key => {
            if (key === 'FamilyHistory') return;
            const element = document.getElementById(key);
            if (element) {
                element.value = seed[key];
                // Trigger input validation check on fill if it's an input
                if (element.tagName === 'INPUT') {
                    validateField(element);
                }
            }
        });
        
        currentSampleIndex = (currentSampleIndex + 1) % samplePatients.length;
        
        fillSampleBtn.innerHTML = `<i class="fa-solid fa-check"></i> Loaded Preset ${currentSampleIndex === 1 ? 'Low Risk' : 'High Risk'}`;
        setTimeout(() => {
            fillSampleBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Load Sample Data`;
        }, 1500);
    }
    
    if (fillSampleBtn) fillSampleBtn.addEventListener('click', loadSampleData);

    // --- CLIENT-SIDE VALIDATION ---

    const bounds = {
        Pregnancies: { min: 0, max: 25, label: "Pregnancies" },
        Glucose: { min: 10, max: 500, label: "Glucose Level" },
        BloodPressure: { min: 10, max: 300, label: "Blood Pressure" },
        SkinThickness: { min: 1, max: 120, label: "Skin Thickness" },
        Insulin: { min: 1, max: 2000, label: "Insulin" },
        BMI: { min: 5.0, max: 100.0, label: "BMI" },
        Age: { min: 1, max: 120, label: "Age" }
    };

    function validateField(input) {
        const id = input.id;
        const valueStr = input.value.trim();
        const errSpan = document.getElementById(`err-${id}`);
        const group = input.closest('.form-group');
        
        if (!errSpan) return true;
        
        // If not in validation bounds (e.g. select elements), clear error states and return true
        if (!bounds[id]) {
            errSpan.textContent = "";
            if (group) group.classList.remove('has-error');
            return true;
        }
        
        if (valueStr === "") {
            errSpan.textContent = `${bounds[id].label} is required.`;
            group.classList.add('has-error');
            return false;
        }
        
        const val = parseFloat(valueStr);
        if (isNaN(val)) {
            errSpan.textContent = `Must be a valid number.`;
            group.classList.add('has-error');
            return false;
        }
        
        if (val < bounds[id].min || val > bounds[id].max) {
            errSpan.textContent = `Must be between ${bounds[id].min} and ${bounds[id].max}.`;
            group.classList.add('has-error');
            return false;
        }
        
        errSpan.textContent = "";
        group.classList.remove('has-error');
        return true;
    }

    if (diabetesForm) {
        const formInputs = diabetesForm.querySelectorAll('input');
        formInputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                const group = input.closest('.form-group');
                if (group.classList.contains('has-error')) {
                    validateField(input);
                }
            });
        });
    }

    // --- FORM ACTIONS (RESET) ---
    
    function resetForm() {
        if (!diabetesForm) return;
        diabetesForm.reset();

        // Reset Family History fields state
        if (familyHistorySelect) {
            familyHistorySelect.value = 'no';
            handleFamilyHistoryChange();
        }
        
        const formInputs = diabetesForm.querySelectorAll('input');
        formInputs.forEach(input => {
            const group = input.closest('.form-group');
            group.classList.remove('has-error');
            const errSpan = document.getElementById(`err-${input.id}`);
            if (errSpan) errSpan.textContent = "";
        });
        
        if (resultDisplayCard) resultDisplayCard.classList.add('hidden');
        if (initialResultCard) initialResultCard.classList.remove('hidden');
    }
    
    if (resetFormBtn) resetFormBtn.addEventListener('click', resetForm);

    // --- AJAX SUBMISSION AND RESULT PROCESSING ---

    if (diabetesForm) {
        diabetesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formInputs = diabetesForm.querySelectorAll('input');
            let isFormValid = true;
            
            formInputs.forEach(input => {
                const isValid = validateField(input);
                if (!isValid) isFormValid = false;
            });
            
            if (!isFormValid) {
                const firstError = diabetesForm.querySelector('.has-error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            
            const formData = {};
            formInputs.forEach(input => {
                formData[input.id] = parseFloat(input.value);
            });

            // Calculate and add DiabetesPedigreeFunction dynamically based on dropdown checklist
            const famHist = familyHistorySelect ? familyHistorySelect.value : 'no';
            const faDiab = fatherDiabeticSelect ? fatherDiabeticSelect.value : 'no';
            const moDiab = motherDiabeticSelect ? motherDiabeticSelect.value : 'no';
            const sibDiab = siblingDiabeticSelect ? siblingDiabeticSelect.value : 'no';
            formData['DiabetesPedigreeFunction'] = calculatePedigreeFunction(famHist, faDiab, moDiab, sibDiab);
            
            predictSubmitBtn.classList.add('loading');
            predictSubmitBtn.disabled = true;
            resetFormBtn.disabled = true;
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    displayResult(result);
                } else {
                    if (result.validation_errors) {
                        Object.keys(result.validation_errors).forEach(key => {
                            const errSpan = document.getElementById(`err-${key}`);
                            const input = document.getElementById(key);
                            if (errSpan && input) {
                                errSpan.textContent = result.validation_errors[key];
                                input.closest('.form-group').classList.add('has-error');
                            }
                        });
                        
                        const firstError = diabetesForm.querySelector('.has-error');
                        if (firstError) {
                            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    } else {
                        alert(result.error || "An unexpected error occurred during prediction.");
                    }
                }
            } catch (err) {
                console.error("Prediction API Error:", err);
                let msg = "Could not connect to the prediction server. Please make sure the Flask application is running.";
                if (isLocalFile) {
                    msg += "\n\nNote: If opening the HTML files directly, ensure Flask is running locally at http://localhost:5000 and that Cross-Origin Resource Sharing (CORS) is handled by the server (if applicable) or run via standard browser testing.";
                }
                alert(msg);
            } finally {
                predictSubmitBtn.classList.remove('loading');
                predictSubmitBtn.disabled = false;
                resetFormBtn.disabled = false;
            }
        });
    }

    function displayResult(res) {
        initialResultCard.classList.add('hidden');
        resultDisplayCard.classList.remove('hidden');
        
        resultModelBadge.textContent = res.model_type;
        
        const isDiabetic = res.prediction === 1;
        
        resultStatusPanel.className = 'result-status-panel';
        resultDisplayCard.className = 'premium-card result-display-card';
        
        if (isDiabetic) {
            resultStatusPanel.classList.add('diabetic');
            resultDisplayCard.classList.add('diabetic');
            resultStatusValue.textContent = "Likely Diabetic";
            resultStatusIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
        } else {
            resultStatusPanel.classList.add('non-diabetic');
            resultDisplayCard.classList.add('non-diabetic');
            resultStatusValue.textContent = "Likely Non-Diabetic";
            resultStatusIcon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        }
        
        const circumference = 314;
        const riskScore = isDiabetic ? res.confidence : (1.0 - res.confidence);
        const offset = circumference * (1 - riskScore);
        
        setTimeout(() => {
            gaugeProgressCircle.style.strokeDashoffset = offset;
        }, 50);
        
        const confidenceLabel = resultDisplayCard.querySelector('.gauge-label');
        if (confidenceLabel) {
            confidenceLabel.textContent = "RISK SCORE";
        }
        const riskPercentText = (riskScore * 100).toFixed(1) + '%';
        resultConfidenceValue.textContent = riskPercentText;

        resultRecommendationsList.innerHTML = "";
        res.recommendations.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            resultRecommendationsList.appendChild(li);
        });
        
        if (window.innerWidth <= 992) {
            resultDisplayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});
