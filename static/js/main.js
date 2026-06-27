/* --------------------------------------------------
   MediPredict Interactive UI & API Client
-------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
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
        document.body.style.overflow = 'hidden'; // Disable background scrolling
    }
    
    function closeDrawer() {
        mobileNavDrawer.classList.remove('open');
        mobileDrawerOverlay.classList.remove('visible');
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openDrawer);
    if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeDrawer);
    if (mobileDrawerOverlay) mobileDrawerOverlay.addEventListener('click', closeDrawer);

    // --- GENDER / SEX SELECTION LOGIC ---
    const genderSelect = document.getElementById('Gender');
    const pregnanciesInput = document.getElementById('Pregnancies');
    let pregnanciesGroup = null;
    if (pregnanciesInput) {
        pregnanciesGroup = pregnanciesInput.closest('.form-group');
    }

    function handleGenderChange() {
        if (!genderSelect || !pregnanciesInput || !pregnanciesGroup) return;
        if (genderSelect.value === 'male') {
            pregnanciesInput.value = 0;
            pregnanciesInput.disabled = true;
            pregnanciesGroup.style.opacity = '0.5';
            pregnanciesGroup.style.pointerEvents = 'none';
            // Clear any validation errors on Pregnancies
            const errSpan = document.getElementById('err-Pregnancies');
            if (errSpan) errSpan.textContent = "";
            pregnanciesGroup.classList.remove('has-error');
        } else {
            pregnanciesInput.disabled = false;
            pregnanciesGroup.style.opacity = '1';
            pregnanciesGroup.style.pointerEvents = 'auto';
        }
    }

    if (genderSelect) {
        genderSelect.addEventListener('change', handleGenderChange);
    }

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
    handleGenderChange();
    handleFamilyHistoryChange();

    // --- SAMPLE PATIENT DATA SEEDS ---
    
    const samplePatients = [
        {
            // Sample 1: Female Non-Diabetic Profile (Low Risk)
            Gender: 'female',
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
            // Sample 2: Female Diabetic Profile (High Risk)
            Gender: 'female',
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
        },
        {
            // Sample 3: Male Diabetic Profile (High Risk)
            Gender: 'male',
            Pregnancies: 0,
            Glucose: 162,
            BloodPressure: 82,
            SkinThickness: 28,
            Insulin: 180,
            BMI: 31.8,
            FamilyHistory: 'yes',
            FatherDiabetic: 'yes',
            MotherDiabetic: 'no',
            SiblingDiabetic: 'yes',
            Age: 54
        }
    ];
    
    let currentSampleIndex = 0;
    
    function loadSampleData() {
        const seed = samplePatients[currentSampleIndex];
        
        // Handle Gender select first
        if (genderSelect && seed.hasOwnProperty('Gender')) {
            genderSelect.value = seed.Gender;
            handleGenderChange();
        }

        // Handle Family History select next
        if (familyHistorySelect && seed.hasOwnProperty('FamilyHistory')) {
            familyHistorySelect.value = seed.FamilyHistory;
            handleFamilyHistoryChange();
        }

        Object.keys(seed).forEach(key => {
            if (key === 'Gender' || key === 'FamilyHistory') return;
            const element = document.getElementById(key);
            if (element) {
                element.value = seed[key];
                // Trigger input validation check on fill if it's an input
                if (element.tagName === 'INPUT') {
                    validateField(element);
                }
            }
        });
        
        // Label formatting for preset loaded feedback
        let presetLabel = '';
        if (currentSampleIndex === 0) {
            presetLabel = 'Female Low Risk';
        } else if (currentSampleIndex === 1) {
            presetLabel = 'Female High Risk';
        } else {
            presetLabel = 'Male High Risk';
        }

        // Cycle to the other sample preset for next click
        currentSampleIndex = (currentSampleIndex + 1) % samplePatients.length;
        
        // Custom feedback animation on button
        fillSampleBtn.innerHTML = `<i class="fa-solid fa-check"></i> Loaded Preset: ${presetLabel}`;
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
        
        // Valid State
        errSpan.textContent = "";
        group.classList.remove('has-error');
        return true;
    }

    // Attach live blur & input listeners for fluid validation experience
    if (diabetesForm) {
        const formInputs = diabetesForm.querySelectorAll('input');
        formInputs.forEach(input => {
            input.addEventListener('blur', () => validateField(input));
            input.addEventListener('input', () => {
                // If in error, clear error as user edits to be user-friendly
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
        
        // Reset Gender and Pregnancies field state
        if (genderSelect) {
            genderSelect.value = 'female';
            handleGenderChange();
        }

        // Reset Family History fields state
        if (familyHistorySelect) {
            familyHistorySelect.value = 'no';
            handleFamilyHistoryChange();
        }
        
        // Remove error styles and clear text
        const formInputs = diabetesForm.querySelectorAll('input');
        formInputs.forEach(input => {
            const group = input.closest('.form-group');
            group.classList.remove('has-error');
            const errSpan = document.getElementById(`err-${input.id}`);
            if (errSpan) errSpan.textContent = "";
        });
        
        // Hide result, show initial state
        if (resultDisplayCard) resultDisplayCard.classList.add('hidden');
        if (initialResultCard) initialResultCard.classList.remove('hidden');
    }
    
    if (resetFormBtn) resetFormBtn.addEventListener('click', resetForm);

    // --- AJAX SUBMISSION AND RESULT PROCESSING ---

    if (diabetesForm) {
        diabetesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate all fields
            const formInputs = diabetesForm.querySelectorAll('input');
            let isFormValid = true;
            
            formInputs.forEach(input => {
                const isValid = validateField(input);
                if (!isValid) isFormValid = false;
            });
            
            if (!isFormValid) {
                // Scroll to first error
                const firstError = diabetesForm.querySelector('.has-error');
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }
            
            // Gather form data
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
            
            // Set button loading state
            predictSubmitBtn.classList.add('loading');
            predictSubmitBtn.disabled = true;
            resetFormBtn.disabled = true;
            
            try {
                const response = await fetch('/api/predict', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const result = await response.get_json ? await response.get_json() : await response.json();
                
                if (response.ok && result.success) {
                    displayResult(result, formData);
                } else {
                    // Handle server-side validation error mapping
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
                alert("Could not connect to the prediction server. Please make sure the backend Flask app is running.");
            } finally {
                // Restore button states
                predictSubmitBtn.classList.remove('loading');
                predictSubmitBtn.disabled = false;
                resetFormBtn.disabled = false;
            }
        });
    }

    function displayResult(res, inputs) {
        // Toggle view cards
        initialResultCard.classList.add('hidden');
        resultDisplayCard.classList.remove('hidden');
        
        // Update Model Type Badge
        resultModelBadge.textContent = res.model_type;
        
        // Update Status & Colors
        const isDiabetic = res.prediction === 1;
        
        // Clear old classes
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
        
        // Update Confidence text
        const confidencePercentage = (res.confidence * 100).toFixed(1);
        resultConfidenceValue.textContent = `${confidencePercentage}%`;
        
        // Update SVG Gauge Ring
        // Circumference of our r=50 circle is 314
        const circumference = 314;
        
        // In this UI context, the gauge represents the RISK SCORE / Diabetic Susceptibility Index
        // If predicted non-diabetic, risk is (1 - confidence), else risk is confidence
        const riskScore = isDiabetic ? res.confidence : (1.0 - res.confidence);
        
        const offset = circumference * (1 - riskScore);
        
        // Update radial meter with animation delay
        setTimeout(() => {
            gaugeProgressCircle.style.strokeDashoffset = offset;
        }, 50);
        
        // Update dial label dynamically to represent what the gauge means
        const confidenceLabel = resultDisplayCard.querySelector('.gauge-label');
        if (confidenceLabel) {
            confidenceLabel.textContent = "RISK SCORE";
        }
        // If they want to read the confidence itself, let's keep the value matching the risk score
        const riskPercentText = (riskScore * 100).toFixed(1) + '%';
        resultConfidenceValue.textContent = riskPercentText;

        // Populate Recommendations
        resultRecommendationsList.innerHTML = "";
        res.recommendations.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            resultRecommendationsList.appendChild(li);
        });
        
        // Scroll results card into view on smaller displays
        if (window.innerWidth <= 992) {
            resultDisplayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});
