const API_URL = "http://127.0.0.1:2200/predict";

const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const retryBtn = document.getElementById("error-retry-btn");

const states = {
    idle: document.getElementById("state-idle"),
    loading: document.getElementById("state-loading"),
    result: document.getElementById("state-result"),
    error: document.getElementById("state-error")
};

const scoreNumber = document.getElementById("score-number");
const scoreBand = document.getElementById("score-band");
const scoreContext = document.getElementById("score-context");
const errorCopy = document.getElementById("error-copy");
const gaugeFill = document.getElementById("gauge-fill");


function showState(name) {
    Object.values(states).forEach(state => {
        state.hidden = true;
    });

    states[name].hidden = false;
}


function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle("loading", isLoading);
}


function setError(fieldName, message) {
    const field = document
        .getElementById(fieldName)
        ?.closest(".field");

    const error = document.querySelector(
        `.error-msg[data-for="${fieldName}"]`
    );

    if (field) {
        field.classList.toggle("invalid", Boolean(message));
    }

    if (error) {
        error.textContent = message || "";
    }
}


function clearErrors() {
    document
        .querySelectorAll(".field.invalid")
        .forEach(el => el.classList.remove("invalid"));

    document
        .querySelectorAll(".error-msg")
        .forEach(el => el.textContent = "");
}


/* Stress Level Buttons */

function selectStressLevel(value, button) {

    document
        .querySelectorAll(".seg-btn")
        .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");

    document.getElementById("stress_level").value = value;

    setError("stress_level", "");
}


document.querySelectorAll(".seg-btn").forEach(button => {

    button.addEventListener("click", () => {

        selectStressLevel(
            button.dataset.value,
            button
        );

    });

});


/* Form Validation */

function validateForm() {

    clearErrors();

    let valid = true;

    const requiredFields =
        form.querySelectorAll(
            "input[required], select[required]"
        );

    requiredFields.forEach(field => {

        if (!String(field.value).trim()) {

            setError(
                field.id,
                "This field is required."
            );

            valid = false;
        }

    });


    /* Age validation */

    const age =
        Number(document.getElementById("age").value);

    if (age && (age < 10 || age > 100)) {

        setError(
            "age",
            "Age must be between 10 and 100."
        );

        valid = false;
    }


    /* Hours validation */

    [
        "avg_daily_usage_hours",
        "study_hours",
        "physical_activity_hours",
        "sleep_hours_per_night"

    ].forEach(id => {

        const input = document.getElementById(id);

        if (input.value !== "") {

            const value = Number(input.value);

            if (value < 0 || value > 24) {

                setError(
                    id,
                    "Value must be between 0 and 24 hours."
                );

                valid = false;
            }
        }

    });

    return valid;
}


/* Get Form Data */

function getFormData() {

    const data =
        Object.fromEntries(
            new FormData(form).entries()
        );


    /* Convert strings to numbers */

    [
        "age",
        "avg_daily_usage_hours",
        "daily_unlocks",
        "study_hours",
        "physical_activity_hours",
        "sleep_hours_per_night"

    ].forEach(key => {

        if (data[key] !== "") {

            data[key] = Number(data[key]);

        }

    });


    return data;
}


/* Get Score From API Response */

function getScoreFromResponse(result) {

    const candidates = [

        result.mental_health_score,

        result.predicted_score,

        result.score,

        result.prediction,

        result.mentalHealthScore

    ];


    const score = candidates.find(
        value =>
            typeof value === "number" ||
            !isNaN(Number(value))
    );


    if (score === undefined) {

        return null;

    }


    return Number(score);
}


/* Score Band */

function getBand(score) {

    if (score < 3.5) {

        return "Needs attention";

    }

    if (score < 6.5) {

        return "Moderate signal";

    }

    if (score < 8.5) {

        return "Positive signal";

    }

    return "Strong signal";
}


/* Display Result */

function displayResult(result) {

    const score =
        getScoreFromResponse(result);


    if (
        score === null ||
        !Number.isFinite(score)
    ) {

        throw new Error(
            "The API response did not contain a numeric prediction score."
        );

    }


    const safeScore =
        Math.max(
            0,
            Math.min(10, score)
        );


    scoreNumber.textContent =
        safeScore.toFixed(1);


    scoreBand.textContent =
        result.band ||
        getBand(safeScore);


    scoreContext.textContent =
        result.message ||
        result.context ||
        "This result is informational and is not a clinical assessment.";


    /* Update Gauge */

    const circumference = 314;

    const progress =
        safeScore / 10;


    gaugeFill.style.strokeDashoffset =
        String(
            circumference *
            (1 - progress)
        );


    showState("result");
}


/* Send Prediction To FastAPI */

async function predict() {

    if (!validateForm()) {

        const firstInvalid =
            document.querySelector(
                ".field.invalid input, .field.invalid select"
            );

        firstInvalid?.focus();

        return;
    }


    setLoading(true);

    showState("loading");


    try {

        const response =
            await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(
                    getFormData()
                )

            });


        let result = {};


        try {

            result = await response.json();

        } catch {

            throw new Error(
                `Server returned HTTP ${response.status}.`
            );

        }


        if (!response.ok) {

            throw new Error(
                result.detail ||
                result.message ||
                `Server error: ${response.status}`
            );

        }


        displayResult(result);


    } catch (error) {

        console.error(error);


        if (
            error.message.includes(
                "Failed to fetch"
            )
        ) {

            errorCopy.textContent =
                "Could not connect to the FastAPI server. Make sure Uvicorn is running on port 2200.";

        } else {

            errorCopy.textContent =
                error.message;

        }


        showState("error");


    } finally {

        setLoading(false);

    }

}


/* Reset */

function resetForm() {

    form.reset();


    document
        .querySelectorAll(".seg-btn")
        .forEach(btn =>
            btn.classList.remove("active")
        );


    document.getElementById(
        "stress_level"
    ).value = "";


    gaugeFill.style.strokeDashoffset =
        "314";


    clearErrors();

    showState("idle");


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* Submit */

form.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        predict();

    }
);


/* Reset Button */

resetBtn.addEventListener(
    "click",
    resetForm
);


/* Retry Button */

retryBtn.addEventListener(
    "click",
    () => showState("idle")
);