/* ============================================
   SUPER CALCULADORA ANIME - LOGIC
   ============================================ */

// ---- State ----
let currentValue = '0';
let previousValue = '';
let currentOperator = '';
let expression = '';
let shouldResetDisplay = false;
let isScientificMode = false;
let isHistoryOpen = false;
let useDegrees = true;
let history = [];
let waitingForExponent = false;

// ---- DOM Elements ----
const displayEl = document.getElementById('display');
const expressionEl = document.getElementById('expression');
const modeLabel = document.getElementById('modeLabel');
const angleLabel = document.getElementById('angleLabel');
const angleBtnLabel = document.getElementById('angleBtnLabel');
const scientificPanel = document.getElementById('scientificPanel');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const modeToggle = document.getElementById('modeToggle');
const toggleText = document.getElementById('toggleText');

// ---- Initialize Particles ----
function initParticles() {
    const container = document.getElementById('particles');
    const colors = ['#ff6b9d', '#c44dff', '#00d2ff', '#ffd700', '#ff6bca'];

    for (let i = 0; i < 25; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const size = Math.random() * 4 + 2;
        const color = colors[Math.floor(Math.random() * colors.length)];

        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.background = color;
        particle.style.boxShadow = `0 0 ${size * 2}px ${color}`;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';

        container.appendChild(particle);
    }
}

// ---- Display Functions ----
function updateDisplay() {
    displayEl.textContent = formatNumber(currentValue);
    expressionEl.textContent = expression;

    // Auto-shrink display for long numbers
    if (currentValue.length > 10) {
        displayEl.classList.add('small');
    } else {
        displayEl.classList.remove('small');
    }

    // Add animation
    displayEl.classList.remove('animate');
    void displayEl.offsetWidth; // Trigger reflow
    displayEl.classList.add('animate');
}

function formatNumber(numStr) {
    if (numStr === 'Error' || numStr === 'Infinity' || numStr === '-Infinity' || numStr === 'NaN') {
        return '✧ Error ✧';
    }

    const num = parseFloat(numStr);
    if (isNaN(num)) return numStr;

    // If it has a decimal point being typed, keep as-is
    if (numStr.includes('.') && numStr.endsWith('.')) return numStr;

    // Format with reasonable precision
    if (Math.abs(num) >= 1e15 || (Math.abs(num) < 1e-10 && num !== 0)) {
        return num.toExponential(6);
    }

    // Keep the decimal format if explicitly typed
    if (numStr.includes('.')) {
        return numStr;
    }

    // Add thousands separators
    const parts = numStr.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
}

// ---- Input Functions ----
function inputNumber(num) {
    if (waitingForExponent) {
        currentValue = num;
        waitingForExponent = false;
        shouldResetDisplay = false;
        updateDisplay();
        return;
    }

    if (shouldResetDisplay) {
        currentValue = num;
        shouldResetDisplay = false;
    } else {
        if (currentValue === '0') {
            currentValue = num;
        } else if (currentValue.length < 16) {
            currentValue += num;
        }
    }
    updateDisplay();
}

function inputDecimal() {
    if (shouldResetDisplay) {
        currentValue = '0.';
        shouldResetDisplay = false;
    } else if (!currentValue.includes('.')) {
        currentValue += '.';
    }
    updateDisplay();
}

function inputOperator(op) {
    if (currentOperator && !shouldResetDisplay) {
        calculate();
    }

    previousValue = currentValue;
    currentOperator = op;
    expression = `${formatNumber(previousValue)} ${op}`;
    shouldResetDisplay = true;

    // Highlight active operator buttons
    document.querySelectorAll('.btn.operator').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.trim() === op) {
            btn.classList.add('active');
        }
    });

    updateDisplay();
}

function inputPercent() {
    const num = parseFloat(currentValue);
    if (isNaN(num)) return;

    if (previousValue && currentOperator) {
        // Calculate percentage of previousValue
        currentValue = String(parseFloat(previousValue) * num / 100);
    } else {
        currentValue = String(num / 100);
    }
    updateDisplay();
}

function toggleSign() {
    if (currentValue === '0' || currentValue === 'Error') return;

    if (currentValue.startsWith('-')) {
        currentValue = currentValue.substring(1);
    } else {
        currentValue = '-' + currentValue;
    }
    updateDisplay();
}

// ---- Calculation ----
function calculate() {
    if (!currentOperator || !previousValue) return;

    const prev = parseFloat(previousValue);
    const curr = parseFloat(currentValue);
    let result;

    switch (currentOperator) {
        case '+': result = prev + curr; break;
        case '−': result = prev - curr; break;
        case '×': result = prev * curr; break;
        case '÷':
            if (curr === 0) {
                result = 'Error';
            } else {
                result = prev / curr;
            }
            break;
        default: return;
    }

    const fullExpression = `${formatNumber(previousValue)} ${currentOperator} ${formatNumber(currentValue)}`;

    if (result === 'Error') {
        currentValue = 'Error';
    } else {
        // Round to avoid floating point issues
        result = parseFloat(result.toPrecision(12));
        currentValue = String(result);
    }

    expression = `${fullExpression} =`;

    // Add to history
    addToHistory(fullExpression, currentValue);

    // Clear operator state
    document.querySelectorAll('.btn.operator').forEach(btn => btn.classList.remove('active'));
    previousValue = '';
    currentOperator = '';
    shouldResetDisplay = true;

    updateDisplay();
}

function clearAll() {
    currentValue = '0';
    previousValue = '';
    currentOperator = '';
    expression = '';
    shouldResetDisplay = false;
    waitingForExponent = false;

    document.querySelectorAll('.btn.operator').forEach(btn => btn.classList.remove('active'));
    updateDisplay();
}

// ---- Scientific Functions ----
function toRadians(deg) {
    return deg * (Math.PI / 180);
}

function toDegrees(rad) {
    return rad * (180 / Math.PI);
}

function calcFunction(func) {
    const num = parseFloat(currentValue);
    if (isNaN(num) && func !== 'pow') return;

    let result;
    let funcLabel = func;

    switch (func) {
        case 'sin':
            result = useDegrees ? Math.sin(toRadians(num)) : Math.sin(num);
            break;
        case 'cos':
            result = useDegrees ? Math.cos(toRadians(num)) : Math.cos(num);
            break;
        case 'tan':
            result = useDegrees ? Math.tan(toRadians(num)) : Math.tan(num);
            break;
        case 'log':
            result = num <= 0 ? 'Error' : Math.log10(num);
            break;
        case 'ln':
            result = num <= 0 ? 'Error' : Math.log(num);
            break;
        case 'sqrt':
            funcLabel = '√';
            result = num < 0 ? 'Error' : Math.sqrt(num);
            break;
        case 'cbrt':
            funcLabel = '∛';
            result = Math.cbrt(num);
            break;
        case 'square':
            funcLabel = 'x²';
            result = num * num;
            break;
        case 'pow':
            funcLabel = 'xⁿ';
            expression = `${formatNumber(currentValue)} ^`;
            previousValue = currentValue;
            currentOperator = '^';
            shouldResetDisplay = true;
            waitingForExponent = true;
            updateDisplay();
            return;
        case 'factorial':
            funcLabel = 'n!';
            if (num < 0 || !Number.isInteger(num) || num > 170) {
                result = 'Error';
            } else {
                result = factorial(num);
            }
            break;
        case 'abs':
            funcLabel = '|x|';
            result = Math.abs(num);
            break;
        case 'inv':
            funcLabel = '1/x';
            result = num === 0 ? 'Error' : 1 / num;
            break;
        case 'exp':
            funcLabel = 'eˣ';
            result = Math.exp(num);
            break;
        default: return;
    }

    const exprStr = `${funcLabel}(${formatNumber(currentValue)})`;

    if (result === 'Error') {
        expression = `${exprStr} = Error`;
        currentValue = 'Error';
    } else {
        result = parseFloat(result.toPrecision(12));
        expression = `${exprStr} =`;
        addToHistory(exprStr, String(result));
        currentValue = String(result);
    }

    shouldResetDisplay = true;
    updateDisplay();
}

function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

function insertConstant(constant) {
    switch (constant) {
        case 'pi':
            currentValue = String(Math.PI);
            expression = 'π';
            break;
        case 'e':
            currentValue = String(Math.E);
            expression = 'e';
            break;
    }
    shouldResetDisplay = true;
    updateDisplay();
}

function toggleAngle() {
    useDegrees = !useDegrees;
    const label = useDegrees ? 'DEG' : 'RAD';
    angleLabel.textContent = label;
    angleBtnLabel.textContent = label;
}

// ---- Handle Power Operator ----
const originalCalculate = calculate;
// Override calculate to handle power
function calculate() {
    if (currentOperator === '^') {
        const base = parseFloat(previousValue);
        const exp = parseFloat(currentValue);
        let result = Math.pow(base, exp);

        const fullExpression = `${formatNumber(previousValue)} ^ ${formatNumber(currentValue)}`;

        if (isNaN(result) || !isFinite(result)) {
            currentValue = 'Error';
        } else {
            result = parseFloat(result.toPrecision(12));
            currentValue = String(result);
        }

        expression = `${fullExpression} =`;
        addToHistory(fullExpression, currentValue);

        document.querySelectorAll('.btn.operator').forEach(btn => btn.classList.remove('active'));
        previousValue = '';
        currentOperator = '';
        shouldResetDisplay = true;
        waitingForExponent = false;

        updateDisplay();
        return;
    }

    if (!currentOperator || !previousValue) return;

    const prev = parseFloat(previousValue);
    const curr = parseFloat(currentValue);
    let result;

    switch (currentOperator) {
        case '+': result = prev + curr; break;
        case '−': result = prev - curr; break;
        case '×': result = prev * curr; break;
        case '÷':
            if (curr === 0) {
                result = 'Error';
            } else {
                result = prev / curr;
            }
            break;
        default: return;
    }

    const fullExpression = `${formatNumber(previousValue)} ${currentOperator} ${formatNumber(currentValue)}`;

    if (result === 'Error') {
        currentValue = 'Error';
    } else {
        result = parseFloat(result.toPrecision(12));
        currentValue = String(result);
    }

    expression = `${fullExpression} =`;
    addToHistory(fullExpression, currentValue);

    document.querySelectorAll('.btn.operator').forEach(btn => btn.classList.remove('active'));
    previousValue = '';
    currentOperator = '';
    shouldResetDisplay = true;

    updateDisplay();
}

// ---- Mode Toggle ----
function toggleMode() {
    isScientificMode = !isScientificMode;
    scientificPanel.classList.toggle('open');
    modeToggle.classList.toggle('active');

    if (isScientificMode) {
        modeLabel.textContent = 'CIENTÍFICA';
        toggleText.textContent = '🔢 Modo Básico';
    } else {
        modeLabel.textContent = 'BÁSICA';
        toggleText.textContent = '🔬 Modo Científico';
    }
}

// ---- History ----
function addToHistory(expr, result) {
    if (result === 'Error') return;

    history.unshift({ expression: expr, result: result });
    if (history.length > 20) history.pop();
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">Sin cálculos aún ✨</div>';
        return;
    }

    historyList.innerHTML = history.map((item, i) => `
        <div class="history-item" onclick="useHistoryItem(${i})">
            <div class="history-expression">${item.expression}</div>
            <div class="history-result">= ${formatNumber(item.result)}</div>
        </div>
    `).join('');
}

function useHistoryItem(index) {
    currentValue = history[index].result;
    expression = history[index].expression;
    shouldResetDisplay = true;
    updateDisplay();
    toggleHistory();
}

function clearHistory() {
    history = [];
    renderHistory();
}

function toggleHistory() {
    isHistoryOpen = !isHistoryOpen;
    historyPanel.classList.toggle('open');
}

// ---- Window Controls ----
function minimizeWindow() {
    if (window.electronAPI) window.electronAPI.minimize();
}

function maximizeWindow() {
    if (window.electronAPI) window.electronAPI.maximize();
}

function closeWindow() {
    if (window.electronAPI) window.electronAPI.close();
}

// ---- Keyboard Support ----
document.addEventListener('keydown', (e) => {
    e.preventDefault();

    if (e.key >= '0' && e.key <= '9') {
        inputNumber(e.key);
    } else if (e.key === '.') {
        inputDecimal();
    } else if (e.key === '+') {
        inputOperator('+');
    } else if (e.key === '-') {
        inputOperator('−');
    } else if (e.key === '*') {
        inputOperator('×');
    } else if (e.key === '/') {
        inputOperator('÷');
    } else if (e.key === 'Enter' || e.key === '=') {
        calculate();
    } else if (e.key === 'Escape' || e.key === 'Delete') {
        clearAll();
    } else if (e.key === 'Backspace') {
        if (currentValue.length > 1) {
            currentValue = currentValue.slice(0, -1);
        } else {
            currentValue = '0';
        }
        updateDisplay();
    } else if (e.key === '%') {
        inputPercent();
    }
});

// ---- Init ----
initParticles();
updateDisplay();

// ---- Auto Updater ----
if (window.electronAPI && window.electronAPI.onUpdateAvailable) {
    window.electronAPI.onUpdateAvailable(() => {
        document.getElementById('updateModal').classList.add('show');
    });
}

function acceptUpdate() {
    const autoUpdate = document.getElementById('autoUpdateCheck').checked;
    if (window.electronAPI) window.electronAPI.sendUpdateResponse(true, autoUpdate);
    document.getElementById('updateModal').classList.remove('show');
}

function cancelUpdate() {
    const autoUpdate = document.getElementById('autoUpdateCheck').checked;
    if (window.electronAPI) window.electronAPI.sendUpdateResponse(false, autoUpdate);
    document.getElementById('updateModal').classList.remove('show');
}
