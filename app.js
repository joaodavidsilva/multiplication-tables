/**
 * Tabuadas - Aplicação para memorizar e praticar tabuadas
 * Mobile-first SPA usando JavaScript Vanilla
 */

// ============================================
// STATE MANAGEMENT
// ============================================

const DEFAULT_STATS = {
    total: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    maxStreak: 0,
    byTable: {},
    byOperation: {},
    lastPlayed: null
};

const appState = {
    currentScreen: 'menu',
    selectedTables: [],
    memorizeIndex: 0,
    memorizeAccounts: [],
    calculateAccounts: [],
    calculateIndex: 0,
    userAnswer: '',
    stats: { ...DEFAULT_STATS },
    isProcessing: false
};

// ============================================
// LOCAL STORAGE
// ============================================

function loadStats() {
    try {
        const saved = localStorage.getItem('tabuadas_stats');
        if (saved) {
            appState.stats = { ...DEFAULT_STATS, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error('Erro ao carregar estatísticas:', e);
    }
}

function saveStats() {
    try {
        localStorage.setItem('tabuadas_stats', JSON.stringify(appState.stats));
    } catch (e) {
        console.error('Erro ao guardar estatísticas:', e);
    }
}

function resetStats() {
    appState.stats = { ...DEFAULT_STATS };
    saveStats();
}

// ============================================
// ACCOUNT GENERATION
// ============================================

function generateAccounts(tables, shuffle = false) {
    const accounts = [];
    for (const table of tables) {
        for (let i = 1; i <= 10; i++) {
            accounts.push({
                a: table,
                b: i,
                result: table * i
            });
        }
    }
    
    if (shuffle) {
        for (let i = accounts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [accounts[i], accounts[j]] = [accounts[j], accounts[i]];
        }
    }
    
    return accounts;
}

// ============================================
// STATISTICS UPDATE
// ============================================

function updateStats(correct, operation) {
    const stats = appState.stats;
    const { a, b, result } = operation;
    const key = `${a}x${b}`;
    const tableKey = a;
    
    stats.total++;
    stats.lastPlayed = new Date().toISOString();
    
    if (correct) {
        stats.correct++;
        stats.streak++;
        if (stats.streak > stats.maxStreak) {
            stats.maxStreak = stats.streak;
        }
    } else {
        stats.wrong++;
        stats.streak = 0;
    }
    
    if (!stats.byTable[tableKey]) {
        stats.byTable[tableKey] = { correct: 0, wrong: 0, total: 0 };
    }
    stats.byTable[tableKey].total++;
    if (correct) {
        stats.byTable[tableKey].correct++;
    } else {
        stats.byTable[tableKey].wrong++;
    }
    
    if (!stats.byOperation[key]) {
        stats.byOperation[key] = { correct: 0, wrong: 0 };
    }
    if (correct) {
        stats.byOperation[key].correct++;
    } else {
        stats.byOperation[key].wrong++;
    }
    
    saveStats();
}

// ============================================
// SCREEN RENDERING
// ============================================

function showScreen(screenName) {
    appState.currentScreen = screenName;
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const screen = document.getElementById(`${screenName}-screen`);
    if (screen) {
        screen.classList.add('active');
    }
}

// ============================================
// MENU SCREEN
// ============================================

function renderMenu() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div id="menu-screen" class="screen active">
            <h1 class="menu-title">Tabuadas</h1>
            <p class="menu-subtitle">Seleciona as tabuadas que queres praticar</p>
            
            <div class="tables-grid" id="tables-grid">
                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(n => `
                    <button class="table-btn" data-table="${n}">${n}</button>
                `).join('')}
            </div>
            
            <p class="selection-hint" id="selection-hint">Nenhuma tabuada selecionada</p>
            
            <div class="action-buttons">
                <button class="action-btn primary" id="btn-memorizar" disabled>
                    Memorizar
                </button>
                <button class="action-btn primary" id="btn-calcular" disabled>
                    Calcular
                </button>
                <button class="action-btn secondary" id="btn-estatisticas">
                    Estatísticas
                </button>
            </div>
        </div>
    `;
    
    // Event listeners
    document.getElementById('tables-grid').addEventListener('click', handleTableSelect);
    document.getElementById('btn-memorizar').addEventListener('click', startMemorize);
    document.getElementById('btn-calcular').addEventListener('click', startCalculate);
    document.getElementById('btn-estatisticas').addEventListener('click', showStats);
}

function handleTableSelect(e) {
    const btn = e.target.closest('.table-btn');
    if (!btn) return;
    
    const table = parseInt(btn.dataset.table);
    const index = appState.selectedTables.indexOf(table);
    
    if (index > -1) {
        appState.selectedTables.splice(index, 1);
        btn.classList.remove('selected');
    } else {
        appState.selectedTables.push(table);
        btn.classList.add('selected');
    }
    
    appState.selectedTables.sort((a, b) => a - b);
    updateMenuButtons();
}

function updateMenuButtons() {
    const hasSelection = appState.selectedTables.length > 0;
    const hint = document.getElementById('selection-hint');
    
    document.getElementById('btn-memorizar').disabled = !hasSelection;
    document.getElementById('btn-calcular').disabled = !hasSelection;
    
    if (hasSelection) {
        hint.textContent = `${appState.selectedTables.length} tabuada${appState.selectedTables.length > 1 ? 's' : ''} selecionada${appState.selectedTables.length > 1 ? 's' : ''}`;
    } else {
        hint.textContent = 'Nenhuma tabuada selecionada';
    }
}

// ============================================
// MEMORIZE SCREEN
// ============================================

function startMemorize() {
    appState.memorizeIndex = 0;
    appState.memorizeAccounts = generateAccounts(appState.selectedTables, false);
    renderMemorize();
    showScreen('memorize');
}

function renderMemorize() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div id="memorize-screen" class="screen">
            <div class="header">
                <button class="back-btn" id="back-btn">←</button>
                <span class="header-title">Memorizar</span>
                <div style="width: 40px;"></div>
            </div>
            
            <div class="memorize-screen" id="memorize-container">
                <div class="memorize-card">
                    <div class="memorize-equation" id="memorize-equation"></div>
                    <div class="memorize-result" id="memorize-result"></div>
                    <div class="memorize-hint">
                        <span id="memorize-progress"></span>
                    </div>
                </div>
                <div class="swipe-indicator">
                    <span id="swipe-left">←</span>
                    <span id="swipe-right">→</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('back-btn').addEventListener('click', () => {
        showScreen('menu');
        renderMenu();
    });
    
    const container = document.getElementById('memorize-container');
    let touchStartX = 0;
    let touchEndX = 0;
    
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const diff = touchEndX - touchStartX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                navigateMemorize(-1);
            } else {
                navigateMemorize(1);
            }
        }
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (appState.currentScreen !== 'memorize') return;
        if (e.key === 'ArrowLeft') navigateMemorize(-1);
        if (e.key === 'ArrowRight') navigateMemorize(1);
    });
    
    updateMemorizeDisplay();
}

function navigateMemorize(direction) {
    const newIndex = appState.memorizeIndex + direction;
    
    if (newIndex >= 0 && newIndex < appState.memorizeAccounts.length) {
        appState.memorizeIndex = newIndex;
        updateMemorizeDisplay();
    }
}

function updateMemorizeDisplay() {
    const account = appState.memorizeAccounts[appState.memorizeIndex];
    
    document.getElementById('memorize-equation').textContent = `${account.a} × ${account.b}`;
    document.getElementById('memorize-result').textContent = account.result;
    document.getElementById('memorize-progress').textContent = 
        `${appState.memorizeIndex + 1} / ${appState.memorizeAccounts.length}`;
    
    // Update swipe indicators
    const leftIndicator = document.getElementById('swipe-left');
    const rightIndicator = document.getElementById('swipe-right');
    
    leftIndicator.style.opacity = appState.memorizeIndex > 0 ? '1' : '0.3';
    rightIndicator.style.opacity = appState.memorizeIndex < appState.memorizeAccounts.length - 1 ? '1' : '0.3';
}

// ============================================
// CALCULATE SCREEN
// ============================================

function startCalculate() {
    appState.calculateIndex = 0;
    appState.calculateAccounts = generateAccounts(appState.selectedTables, true);
    appState.userAnswer = '';
    renderCalculate();
    showScreen('calculate');
}

function renderCalculate() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div id="calculate-screen" class="screen">
            <div class="header">
                <button class="back-btn" id="back-btn">←</button>
                <span class="header-title">Calcular</span>
                <div style="width: 40px;"></div>
            </div>
            
            <div class="calculate-screen" id="calculate-container">
                <div class="calculate-card">
                    <div class="calculate-equation" id="calculate-equation"></div>
                    
                    <div class="answer-viewbox" id="answer-viewbox" tabindex="0">
                        ${appState.userAnswer || '?'}
                    </div>
                    
                    <input type="text" inputmode="numeric" pattern="[0-9]*" 
                           class="hidden-input" id="hidden-input">
                    
                    <button class="submit-btn" id="submit-btn" disabled>Verificar</button>
                    
                    <div id="feedback-container"></div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('back-btn').addEventListener('click', () => {
        showScreen('menu');
        renderMenu();
    });
    
    const viewbox = document.getElementById('answer-viewbox');
    const hiddenInput = document.getElementById('hidden-input');
    
    // Focus management
    viewbox.addEventListener('click', () => {
        hiddenInput.focus();
    });
    
    viewbox.addEventListener('focus', () => {
        viewbox.classList.add('focused');
    });
    
    viewbox.addEventListener('blur', () => {
        viewbox.classList.remove('focused');
    });
    
    hiddenInput.addEventListener('input', (e) => {
        appState.userAnswer = e.target.value.replace(/[^0-9]/g, '');
        viewbox.textContent = appState.userAnswer || '?';
        
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = appState.userAnswer === '';
        
        // Auto-submit when answer length matches correct result
        const account = appState.calculateAccounts[appState.calculateIndex];
        if (appState.userAnswer.length === String(account.result).length) {
            submitAnswer();
        }
    });
    
    document.getElementById('submit-btn').addEventListener('click', (e) => {
        e.preventDefault();
        submitAnswer();
    });
    
    hiddenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === 'Done') {
            e.preventDefault();
            submitAnswer();
        }
    });
    
    // Keep focus on the container click
    document.getElementById('calculate-container').addEventListener('click', (e) => {
        if (!e.target.closest('.back-btn') && !e.target.closest('#hidden-input')) {
            hiddenInput.focus();
        }
    });
    
    // Auto-focus on show
    setTimeout(() => hiddenInput.focus(), 100);
    
    updateCalculateDisplay();
}

function updateCalculateDisplay() {
    const account = appState.calculateAccounts[appState.calculateIndex];
    document.getElementById('calculate-equation').textContent = `${account.a} × ${account.b} = ?`;
    
    const viewbox = document.getElementById('answer-viewbox');
    const hiddenInput = document.getElementById('hidden-input');
    
    appState.userAnswer = '';
    viewbox.textContent = '?';
    viewbox.classList.remove('correct', 'incorrect');
    hiddenInput.value = '';
    
    document.getElementById('feedback-container').innerHTML = '';
    
    setTimeout(() => hiddenInput.focus(), 100);
}

function submitAnswer() {
    if (appState.isProcessing || appState.userAnswer === '') return;
    
    const account = appState.calculateAccounts[appState.calculateIndex];
    const userNum = parseInt(appState.userAnswer, 10);
    const correct = userNum === account.result;
    
    appState.isProcessing = true;
    
    updateStats(correct, account);
    
    const viewbox = document.getElementById('answer-viewbox');
    const feedbackContainer = document.getElementById('feedback-container');
    
    viewbox.classList.add(correct ? 'correct' : 'incorrect');
    
    feedbackContainer.innerHTML = `
        <div class="feedback-icon ${correct ? 'correct' : 'incorrect'}">
            ${correct ? '✓' : '✗'}
        </div>
        ${!correct ? `<div class="correct-answer">A resposta correta é ${account.result}</div>` : ''}
    `;
    
    setTimeout(() => {
        appState.calculateIndex++;
        
        if (appState.calculateIndex >= appState.calculateAccounts.length) {
            appState.calculateAccounts = generateAccounts(appState.selectedTables, true);
            appState.calculateIndex = 0;
        }
        
        appState.isProcessing = false;
        updateCalculateDisplay();
    }, correct ? 800 : 1500);
}

// ============================================
// STATISTICS SCREEN
// ============================================

function showStats() {
    renderStats();
    showScreen('stats');
}

function renderStats() {
    const stats = appState.stats;
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    
    // Calculate table stats
    const tableStats = [];
    for (let i = 1; i <= 12; i++) {
        const t = stats.byTable[i];
        if (t && t.total > 0) {
            tableStats.push({
                table: i,
                correct: t.correct,
                wrong: t.wrong,
                total: t.total,
                percentage: Math.round((t.correct / t.total) * 100)
            });
        }
    }
    
    tableStats.sort((a, b) => a.percentage - b.percentage);
    
    const worstTable = tableStats.length > 0 ? tableStats[0] : null;
    const bestTable = tableStats.length > 0 ? tableStats[tableStats.length - 1] : null;
    
    // Operation stats
    const operationStats = [];
    for (const [key, op] of Object.entries(stats.byOperation)) {
        if (op.correct + op.wrong > 0) {
            operationStats.push({
                operation: key,
                correct: op.correct,
                wrong: op.wrong,
                percentage: Math.round((op.correct / (op.correct + op.wrong)) * 100)
            });
        }
    }
    
    operationStats.sort((a, b) => a.percentage - b.percentage);
    const hardestOp = operationStats.length > 0 ? operationStats[0] : null;
    const easiestOp = operationStats.length > 0 ? operationStats[operationStats.length - 1] : null;
    
    // Generate recommendation
    let recommendation = '';
    let recommendationType = '';
    
    if (worstTable && worstTable.percentage < 70) {
        recommendation = `Deves treinar mais a tabuada do ${worstTable.table} (${worstTable.percentage}% de acerto)`;
        recommendationType = 'warning';
    } else if (stats.total === 0) {
        recommendation = 'Começa a praticar para veres as tuas estatísticas!';
        recommendationType = 'success';
    } else if (accuracy >= 90) {
        recommendation = 'Excelente! Estás a dominar as tabuadas!';
        recommendationType = 'success';
    } else {
        recommendation = 'Continua a praticar para melhorares os teus resultados!';
    }
    
    const app = document.getElementById('app');
    app.innerHTML = `
        <div id="stats-screen" class="screen">
            <div class="header">
                <button class="back-btn" id="back-btn">←</button>
                <span class="header-title">Estatísticas</span>
                <div style="width: 40px;"></div>
            </div>
            
            ${stats.total === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <p>Ainda não realizaste nenhum exercício.</p>
                    <p>Começa a praticar!</p>
                </div>
            ` : `
                <div class="stats-section">
                    <div class="stats-section-title">Geral</div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${stats.total}</div>
                            <div class="stat-label">Exercícios</div>
                        </div>
                        <div class="stat-card highlight">
                            <div class="stat-value">${accuracy}%</div>
                            <div class="stat-label">Precisão</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.correct}</div>
                            <div class="stat-label">Corretos</div>
                        </div>
                        <div class="stat-card error">
                            <div class="stat-value">${stats.wrong}</div>
                            <div class="stat-label">Errados</div>
                        </div>
                    </div>
                </div>
                
                <div class="stats-section">
                    <div class="stats-section-title">Sequência Máxima</div>
                    <div class="stat-card" style="margin-bottom: 16px;">
                        <div class="stat-value">${stats.maxStreak}</div>
                        <div class="stat-label">Acertos consecutivos</div>
                    </div>
                </div>
                
                ${tableStats.length > 0 ? `
                    <div class="stats-section">
                        <div class="stats-section-title">Por Tabuada</div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-label">
                                <span class="number">Melhor: ${bestTable.table}</span>
                                <span>${bestTable.percentage}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-bar-fill success" style="width: ${bestTable.percentage}%"></div>
                            </div>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar-label">
                                <span class="number">A melhorar: ${worstTable.table}</span>
                                <span>${worstTable.percentage}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-bar-fill ${worstTable.percentage < 50 ? 'error' : 'warning'}" 
                                     style="width: ${worstTable.percentage}%"></div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${operationStats.length > 0 ? `
                    <div class="stats-section">
                        <div class="stats-section-title">Análise</div>
                        ${hardestOp && hardestOp.percentage < 100 ? `
                            <div class="progress-bar-container">
                                <div class="progress-bar-label">
                                    <span class="number">Mais difícil: ${hardestOp.operation}</span>
                                    <span>${hardestOp.percentage}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-bar-fill warning" style="width: ${hardestOp.percentage}%"></div>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${recommendation ? `
                    <div class="stats-section">
                        <div class="recommendation ${recommendationType}">
                            ${recommendation}
                        </div>
                    </div>
                ` : ''}
                
                <button class="reset-btn" id="reset-btn">Repor Estatísticas</button>
            `}
        </div>
        
        <div class="modal-overlay" id="reset-modal">
            <div class="modal">
                <div class="modal-title">Repor Estatísticas?</div>
                <div class="modal-message">Esta ação não pode ser undone. Todos os teus dados serão apagados.</div>
                <div class="modal-buttons">
                    <button class="modal-btn cancel" id="modal-cancel">Cancelar</button>
                    <button class="modal-btn confirm" id="modal-confirm">Repor</button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('back-btn').addEventListener('click', () => {
        showScreen('menu');
        renderMenu();
    });
    
    if (stats.total > 0) {
        document.getElementById('reset-btn').addEventListener('click', () => {
            document.getElementById('reset-modal').classList.add('active');
        });
        
        document.getElementById('modal-cancel').addEventListener('click', () => {
            document.getElementById('reset-modal').classList.remove('active');
        });
        
        document.getElementById('modal-confirm').addEventListener('click', () => {
            resetStats();
            document.getElementById('reset-modal').classList.remove('active');
            renderStats();
        });
        
        document.getElementById('reset-modal').addEventListener('click', (e) => {
            if (e.target.id === 'reset-modal') {
                document.getElementById('reset-modal').classList.remove('active');
            }
        });
    }
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
    loadStats();
    renderMenu();
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
