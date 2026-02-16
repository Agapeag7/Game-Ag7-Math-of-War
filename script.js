/**
 * AG7 Mind Clash - Version corrigée
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
    MAX_ROUNDS: 3,
    ROPE_STEPS: 10,
    ANIMATION_DURATION: 300,
    DIFFICULTY_SETTINGS: {
        1: { name: "Additions simples", timeLimit: 30, aiSpeed: 1500, aiErrorRate: 0.1 },
        2: { name: "Additions/Soustractions", timeLimit: 25, aiSpeed: 1200, aiErrorRate: 0.2 },
        3: { name: "Multiplications", timeLimit: 20, aiSpeed: 1000, aiErrorRate: 0.3 },
        4: { name: "Divisions", timeLimit: 20, aiSpeed: 1000, aiErrorRate: 0.3 },
        5: { name: "Mélange", timeLimit: 15, aiSpeed: 800, aiErrorRate: 0.4 },
        6: { name: "Chronométré", timeLimit: 10, aiSpeed: 500, aiErrorRate: 0.5 }
    }
};

// ==================== CLASSE TEAM ====================
class Team {
    constructor(id, name, color, lightColor) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.lightColor = lightColor;
        this.score = 0;
        this.roundsWon = 0;
        this.currentAnswer = '';
        this.currentOperation = null;
    }

    reset() {
        this.score = 0;
        this.roundsWon = 0;
        this.currentAnswer = '';
        this.currentOperation = null;
    }

    addPoint() {
        this.score++;
    }

    winRound() {
        this.roundsWon++;
        this.score = 0;
    }

    setAnswer(value) {
        this.currentAnswer = value;
    }

    clearAnswer() {
        this.currentAnswer = '';
    }

    isCorrect() {
        if (!this.currentOperation || !this.currentAnswer) return false;
        return parseInt(this.currentAnswer) === this.currentOperation.result;
    }
}

// ==================== CLASSE GAME ====================
class Game {
    constructor() {
        this.team1 = new Team(1, "Équipe Rouge", "#ff4757", "#ff6b81");
        this.team2 = new Team(2, "Équipe Bleue", "#1e90ff", "#70a1ff");
        this.currentRound = 1;
        this.currentDifficulty = 1;
        this.gameMode = 'pvp';
        this.isPaused = false;
        this.activeTeam = 1;
        this.ropePosition = 0;
        this.timer = null;
        this.timeLeft = 0;
        this.iaTimeout = null;
        this.waitingForAnswer = false;
    }

    startNewGame(difficulty, mode) {
        this.currentDifficulty = difficulty;
        this.gameMode = mode;
        this.currentRound = 1;
        this.ropePosition = 0;
        this.team1.reset();
        this.team2.reset();
        UI.updateScores();
        UI.updateRounds(this.currentRound, CONFIG.MAX_ROUNDS);
        this.startRound();
    }

    startRound() {
        this.activeTeam = 1;
        this.ropePosition = 0;
        this.waitingForAnswer = false;
        this.team1.clearAnswer();
        this.team2.clearAnswer();
        
        // Ne générer que la question pour l'équipe active
        this.generateOperation(this.team1);
        // Cacher la question de l'autre équipe
        this.team2.currentOperation = { text: "À ton tour !", result: null };
        
        this.startTimer();
        this.updateUI();
        
        UI.showTurnIndicator(this.activeTeam);
        UI.updateQuestion(1, this.team1.currentOperation.text);
        UI.updateQuestion(2, "À ton tour !");
        UI.clearAnswerDisplay();
        
        if (this.gameMode === 'pvai' && this.activeTeam === 2) {
            this.startIA();
        }
    }

    generateOperation(team) {
        if (team.id === 2 && this.gameMode === 'pvai') {
            // Pour l'IA, on génère quand même l'opération
            const operations = this.getOperationsForDifficulty();
            const op = operations[Math.floor(Math.random() * operations.length)];
            
            let a, b, result, operationString;
            
            switch(op) {
                case 'add':
                    a = this.getRandomNumber(0, 10);
                    b = this.getRandomNumber(0, 10);
                    result = a + b;
                    operationString = `${a} + ${b}`;
                    break;
                case 'sub':
                    a = this.getRandomNumber(0, 20);
                    b = this.getRandomNumber(0, a);
                    result = a - b;
                    operationString = `${a} - ${b}`;
                    break;
                case 'mul':
                    a = this.getRandomNumber(1, 10);
                    b = this.getRandomNumber(1, 10);
                    result = a * b;
                    operationString = `${a} × ${b}`;
                    break;
                case 'div':
                    b = this.getRandomNumber(1, 10);
                    result = this.getRandomNumber(1, 10);
                    a = b * result;
                    operationString = `${a} ÷ ${b}`;
                    break;
                default:
                    a = this.getRandomNumber(0, 10);
                    b = this.getRandomNumber(0, 10);
                    result = a + b;
                    operationString = `${a} + ${b}`;
            }
            
            team.currentOperation = {
                text: operationString,
                result: result
            };
        } else if (team.id === 1 || (team.id === 2 && this.gameMode === 'pvp')) {
            // Génération normale pour les joueurs humains
            const operations = this.getOperationsForDifficulty();
            const op = operations[Math.floor(Math.random() * operations.length)];
            
            let a, b, result, operationString;
            
            switch(op) {
                case 'add':
                    a = this.getRandomNumber(0, 10);
                    b = this.getRandomNumber(0, 10);
                    result = a + b;
                    operationString = `${a} + ${b}`;
                    break;
                case 'sub':
                    a = this.getRandomNumber(0, 20);
                    b = this.getRandomNumber(0, a);
                    result = a - b;
                    operationString = `${a} - ${b}`;
                    break;
                case 'mul':
                    a = this.getRandomNumber(1, 10);
                    b = this.getRandomNumber(1, 10);
                    result = a * b;
                    operationString = `${a} × ${b}`;
                    break;
                case 'div':
                    b = this.getRandomNumber(1, 10);
                    result = this.getRandomNumber(1, 10);
                    a = b * result;
                    operationString = `${a} ÷ ${b}`;
                    break;
                default:
                    a = this.getRandomNumber(0, 10);
                    b = this.getRandomNumber(0, 10);
                    result = a + b;
                    operationString = `${a} + ${b}`;
            }
            
            team.currentOperation = {
                text: operationString,
                result: result
            };
        }
    }

    getOperationsForDifficulty() {
        switch(this.currentDifficulty) {
            case 1: return ['add'];
            case 2: return ['add', 'sub'];
            case 3: return ['mul'];
            case 4: return ['div'];
            case 5: return ['add', 'sub', 'mul', 'div'];
            case 6: return ['add', 'sub', 'mul', 'div'];
            default: return ['add'];
        }
    }

    getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Dans la classe Game, remplacez startTimer()
    startTimer() {
        this.timeLeft = CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit;
        this.maxTime = this.timeLeft;
        this.updateTimerDisplay();
        
        if (this.timer) clearInterval(this.timer);
        
        this.timer = setInterval(() => {
            if (this.isPaused) return;
            
            this.timeLeft--;
            this.updateTimerDisplay();
            UI.updateTimerBar(this.timeLeft, this.maxTime);
            
            if (this.timeLeft <= 0) {
                this.handleTimeout();
            }
        }, 1000); // Changé de 100ms à 1000ms (1 seconde)
    }

    handleTimeout() {
        if (this.waitingForAnswer) return;
        
        UI.showMessage(`Temps écoulé pour ${this.activeTeam === 1 ? this.team1.name : (this.gameMode === 'pvai' && this.activeTeam === 2 ? 'IA' : this.team2.name)} !`, 'warning');
        this.switchTeam();
        this.prepareNextTurn();
    }

    switchTeam() {
        this.activeTeam = this.activeTeam === 1 ? 2 : 1;
        UI.showTurnIndicator(this.activeTeam);
    }

    prepareNextTurn() {
        this.waitingForAnswer = false;
        // Réinitialiser les réponses des deux équipes
        this.team1.clearAnswer();
        this.team2.clearAnswer();
        const currentTeam = this.activeTeam === 1 ? this.team1 : this.team2;
        
        if (this.gameMode === 'pvp' || (this.gameMode === 'pvai' && this.activeTeam === 1)) {
            // Pour un joueur humain
            this.generateOperation(currentTeam);
            UI.updateQuestion(this.activeTeam, currentTeam.currentOperation.text);
            UI.updateQuestion(this.activeTeam === 1 ? 2 : 1, "À ton tour !");
            this.startTimer();
        } else if (this.gameMode === 'pvai' && this.activeTeam === 2) {
            // Pour l'IA
            this.generateOperation(currentTeam);
            UI.updateQuestion(2, currentTeam.currentOperation.text);
            UI.updateQuestion(1, "L'IA réfléchit...");
            this.startIA();
        }
    }

    handleAnswer() {
        if (this.isPaused || this.waitingForAnswer) return;
        
        const currentTeam = this.activeTeam === 1 ? this.team1 : this.team2;
        
        // Vérifier si une réponse a été saisie
        if (!currentTeam.currentAnswer) {
            UI.showMessage("Entre une réponse d'abord !", 'warning');
            return;
        }
        
        // Effacer immédiatement l'affichage de la réponse
        UI.clearAnswerDisplay();
        
        this.waitingForAnswer = true;
        
        if (currentTeam.isCorrect()) {
            // Bonne réponse
            UI.showEffect('correct', this.activeTeam);
            UI.showMessage("Bonne réponse ! 🎉", 'success');
            this.moveRope(this.activeTeam);
            
            // Vérifier si l'équipe a gagné la manche
            if (Math.abs(this.ropePosition) >= CONFIG.ROPE_STEPS) {
                this.winRound(this.activeTeam);
            } else {
                // Passer à l'équipe suivante
                setTimeout(() => {
                    this.switchTeam();
                    this.prepareNextTurn();
                }, CONFIG.ANIMATION_DURATION);
            }
        } else {
            // Mauvaise réponse
            UI.showEffect('wrong', this.activeTeam);
            UI.showMessage("Mauvaise réponse ! ❌", 'error');
            
            // Déplacer la corde dans l'autre sens
            const otherTeam = this.activeTeam === 1 ? 2 : 1;
            this.moveRope(otherTeam);
            
            if (Math.abs(this.ropePosition) >= CONFIG.ROPE_STEPS) {
                this.winRound(otherTeam);
            } else {
                // L'équipe qui s'est trompée rejoue (elle n'a pas marqué)
                setTimeout(() => {
                    this.waitingForAnswer = false;
                    currentTeam.clearAnswer();
                    UI.updateQuestion(this.activeTeam, currentTeam.currentOperation.text);
                    this.startTimer();
                }, CONFIG.ANIMATION_DURATION);
            }
        }
    }

    // Dans la classe Game, modifiez moveRope()
    moveRope(team) {
        const direction = team === 1 ? -1 : 1;
        this.ropePosition += direction;
        
        UI.updateRopePosition(this.ropePosition, CONFIG.ROPE_STEPS);
        
        // Ajouter un effet sonore visuel (ondes)
        this.createRippleEffect(team);
    }

    createRippleEffect(team) {
        const indicator = team === 1 ? 
            document.querySelector('.team1-indicator') : 
            document.querySelector('.team2-indicator');
        
        if (!indicator) return;
        
        // Créer une onde de choc
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 3px solid ${team === 1 ? '#ff4757' : '#1e90ff'};
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%) scale(0);
            animation: ripple 0.6s ease-out;
            pointer-events: none;
        `;
        
        indicator.style.position = 'relative';
        indicator.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }

    winRound(team) {
        // Arrêter le timer et l'IA
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
        if (this.iaTimeout) clearTimeout(this.iaTimeout);
        this.iaTimeout = null;
        
        // Ajouter la manche gagnée
        if (team === 1) {
            this.team1.winRound();
            UI.showMessage(`${this.team1.name} remporte la manche ! 🏆`, 'success');
        } else {
            this.team2.winRound();
            UI.showMessage(`${this.gameMode === 'pvai' ? 'IA' : this.team2.name} remporte la manche ! 🏆`, 'success');
        }
        
        UI.updateScores();
        
        // Vérifier si un joueur a gagné la partie
        if (this.team1.roundsWon >= CONFIG.MAX_ROUNDS) {
            this.endGame(1);
        } else if (this.team2.roundsWon >= CONFIG.MAX_ROUNDS) {
            this.endGame(2);
        } else {
            // Nouvelle manche après un délai
            setTimeout(() => {
                this.currentRound++;
                UI.updateRounds(this.currentRound, CONFIG.MAX_ROUNDS);
                this.startRound();
            }, 2000);
        }
    }

    // Dans Game.endGame(), assurez-vous d'arrêter tous les timers
    endGame(winner) {
        // Arrêter tous les timers
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.iaTimeout) {
            clearTimeout(this.iaTimeout);
            this.iaTimeout = null;
        }
        
        const winnerName = winner === 1 ? this.team1.name : (this.gameMode === 'pvai' ? 'IA' : this.team2.name);
        UI.showVictory(winnerName);
        this.saveHighScore(winnerName);
    }

    saveHighScore(winnerName) {
        const scores = JSON.parse(localStorage.getItem('mathTugOfWarScores') || '[]');
        scores.push({
            winner: winnerName,
            date: new Date().toLocaleDateString(),
            difficulty: this.currentDifficulty,
            mode: this.gameMode === 'pvp' ? 'Joueur vs Joueur' : 'Joueur vs IA'
        });
        
        localStorage.setItem('mathTugOfWarScores', JSON.stringify(scores));
    }

    startIA() {
        if (this.iaTimeout) clearTimeout(this.iaTimeout);
        
        const settings = CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty];
        
        UI.showMessage("L'IA réfléchit...", 'info');
        
        this.iaTimeout = setTimeout(() => {
            if (this.isPaused || this.gameMode !== 'pvai' || this.activeTeam !== 2 || this.waitingForAnswer) return;
            
            // Décision de l'IA
            if (Math.random() < settings.aiErrorRate) {
                // L'IA fait une erreur
                this.team2.setAnswer(Math.floor(Math.random() * 100).toString());
                UI.showMessage("L'IA a fait une erreur !", 'error');
            } else {
                // L'IA répond correctement
                this.team2.setAnswer(this.team2.currentOperation.result.toString());
                UI.showMessage("L'IA a trouvé la réponse !", 'success');
            }
            
            this.handleAnswer();
        }, settings.aiSpeed);
    }

    pause() {
        this.isPaused = true;
        if (this.timer) clearInterval(this.timer);
        if (this.iaTimeout) clearTimeout(this.iaTimeout);
    }

    resume() {
        this.isPaused = false;
        this.startTimer();
        if (this.gameMode === 'pvai' && this.activeTeam === 2) {
            this.startIA();
        }
    }

    updateUI() {
        UI.updateScores();
        UI.updateRounds(this.currentRound, CONFIG.MAX_ROUNDS);
        UI.updateRopePosition(this.ropePosition, CONFIG.ROPE_STEPS);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
}

// ==================== CLASSE UI ====================
class UI {
    static init() {
        this.cacheElements();
        this.attachEventListeners();
        this.loadHighScores();
        this.createMessageContainer();
        this.createTimerBar();
        this.setDefaultCards();
    }

    static cacheElements() {
        this.screens = {
            home: document.getElementById('home-screen'),
            game: document.getElementById('game-screen'),
            pause: document.getElementById('pause-screen'),
            scores: document.getElementById('scores-screen'),
            victory: document.getElementById('victory-screen')
        };
        
        this.team1Score = document.getElementById('team1-score');
        this.team2Score = document.getElementById('team2-score');
        this.team1Name = document.querySelector('.team1-header .team-name');
        this.team2Name = document.querySelector('.team2-header .team-name');
        this.roundsDisplay = document.getElementById('rounds');
        this.timerDisplay = document.getElementById('timer');
        this.ropeCenter = document.getElementById('rope-center');
        this.team1Question = document.getElementById('team1-operation');
        this.team2Question = document.getElementById('team2-operation');
        this.team1Answer = document.getElementById('team1-answer');
        this.team2Answer = document.getElementById('team2-answer');
        this.team1Area = document.querySelector('.team1-area');
        this.team2Area = document.querySelector('.team2-area');
    }

    static attachEventListeners() {
        // Boutons d'accueil
        const startBtn = document.getElementById('start-game');
        if (startBtn) startBtn.addEventListener('click', () => this.startGame());

        // Mode cards (HTML uses .mode-card elements)
        const modePvp = document.querySelector('.mode-card[data-mode="pvp"]');
        if (modePvp) modePvp.addEventListener('click', (e) => {
            const mode = e.currentTarget.dataset.mode;
            this.setMode(mode);
            document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
        const modePvai = document.querySelector('.mode-card[data-mode="pvai"]');
        if (modePvai) modePvai.addEventListener('click', (e) => {
            const mode = e.currentTarget.dataset.mode;
            this.setMode(mode);
            document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });

        // Pavé numérique
        document.querySelectorAll('.num-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const num = e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.num : undefined;
                if (num !== undefined) this.handleNumericInput(num);
            });
        });

        const validateBtn = document.getElementById('validate-btn');
        const validateMain = document.getElementById('validate-btn-main');

        if (validateBtn) {
            validateBtn.addEventListener('click', () => this.validateAnswer());
        }
        if (validateMain) {
            validateMain.addEventListener('click', () => this.validateAnswer());
        }

        // Contrôles du jeu
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.togglePause());
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) restartBtn.addEventListener('click', () => this.restartGame());
        const scoresBtn = document.getElementById('scores-btn');
        if (scoresBtn) scoresBtn.addEventListener('click', () => this.showScores());

        // Navigation
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.resumeGame());
        const quitBtn = document.getElementById('quit-to-menu-btn');
        if (quitBtn) quitBtn.addEventListener('click', () => this.quitToMenu());
        const backFromScores = document.getElementById('back-to-menu-from-scores');
        if (backFromScores) backFromScores.addEventListener('click', () => this.showHome());
        const clearScoresBtn = document.getElementById('clear-scores');
        if (clearScoresBtn) clearScoresBtn.addEventListener('click', () => this.clearScores());
        const playAgainBtn = document.getElementById('play-again-btn');
        if (playAgainBtn) playAgainBtn.addEventListener('click', () => this.restartGame());
        const backToMenuBtn = document.getElementById('back-to-menu-btn');
        if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => this.showHome());

        // Raccourci clavier : Entrée pour valider
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && game && !game.isPaused && !game.waitingForAnswer) {
                if (game.gameMode === 'pvai' && game.activeTeam === 2) {
                    this.showMessage("C'est à l'IA de jouer !", 'warning');
                    return;
                }
                this.validateAnswer();
            }
        });

        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.difficulty;
                const select = document.getElementById('difficulty');
                if (select) select.value = difficulty;

                // Mettre à jour l'affichage des cartes
                document.querySelectorAll('.difficulty-card').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Event listeners pour les cartes de mode (fallback)
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.setMode(mode);
                document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        const deleteBtn = document.getElementById('delete-btn');  // Efface dernier chiffre
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteLastDigit());
        }

        const clearBtn = document.getElementById('clear-btn');    // Efface tout
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllInput());
        }
    }

    // Activez la première carte par défaut
    static setDefaultCards() {
        // Carte difficulté par défaut (niveau 1)
        const firstDifficulty = document.querySelector('.difficulty-card[data-difficulty="1"]');
        if (firstDifficulty) firstDifficulty.classList.add('active');
        
        // Carte mode par défaut (PVP)
        const firstMode = document.querySelector('.mode-card[data-mode="pvp"]');
        if (firstMode) firstMode.classList.add('active');
    }

    static createMessageContainer() {
        // Vérifier si le conteneur existe déjà
        let container = document.getElementById('message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'message-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 2000;
                text-align: center;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        this.messageContainer = container;
    }

    // Dans UI.showMessage(), enlevez la ligne en double :
    static showMessage(text, type = 'info') {
        if (!this.messageContainer) {
            this.createMessageContainer();
        }
        
        const message = document.createElement('div');
        
        let bgColor;
        switch(type) {
            case 'success': bgColor = '#2ed573'; break;
            case 'error': bgColor = '#ff4757'; break;
            case 'warning': bgColor = '#ffa502'; break;
            default: bgColor = '#70a1ff';
        }

        let icon = '';
        switch(type) {
            case 'success': icon = '<i class="fas fa-check-circle"></i> '; break;
            case 'error': icon = '<i class="fas fa-times-circle"></i> '; break;
            case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i> '; break;
            default: icon = '<i class="fas fa-info-circle"></i> ';
        }
        
        message.innerHTML = icon + text;  // Utiliser innerHTML au lieu de textContent
        
        message.style.cssText = `
            background: ${bgColor};
            color: white;
            padding: 15px 30px;
            border-radius: 50px;
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 10px;
            animation: slideDown 0.3s ease;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            pointer-events: none;
        `;
        
        this.messageContainer.appendChild(message);
        
        setTimeout(() => {
            message.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => message.remove(), 300);
        }, 2000);
    }

    static startGame() {
        const difficulty = parseInt(document.getElementById('difficulty').value);
        game = new Game();
        game.startNewGame(difficulty, this.currentMode || 'pvp');
        this.showScreen('game');
    }

    static setMode(mode) {
        this.currentMode = mode;
        // Mettre à jour l'affichage des cartes de mode
        document.querySelectorAll('.mode-card').forEach(btn => btn.classList.remove('active'));
        const activeCard = document.querySelector(`.mode-card[data-mode="${mode}"]`);
        if (activeCard) activeCard.classList.add('active');
        
        // Mettre à jour les noms des équipes en fonction du mode
        if (mode === 'pvai') {
            if (this.team2Name) this.team2Name.textContent = 'IA';
        } else {
            if (this.team2Name) this.team2Name.textContent = 'Équipe Bleue';
        }
    }

    static showScreen(screenName) {
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });
        
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active');
        }
    }

    // Dans UI.showTurnIndicator(), ajoutez :
    static showTurnIndicator(team) {
        if (!this.team1Area || !this.team2Area) return;
        
        // Enlever la classe active des deux
        this.team1Area.classList.remove('active-team');
        this.team2Area.classList.remove('active-team');
        
        // Ajouter la classe active à l'équipe concernée
        if (team === 1) {
            this.team1Area.classList.add('active-team');
            this.team1Area.style.opacity = '1';
            this.team2Area.style.opacity = '0.7';
        } else {
            this.team2Area.classList.add('active-team');
            this.team2Area.style.opacity = '1';
            this.team1Area.style.opacity = '0.7';
        }
        
        if (game) {
            const teamName = team === 1 ? game.team1.name : (game.gameMode === 'pvai' && team === 2 ? 'IA' : game.team2.name);
            this.showMessage(`Au tour de ${teamName} !`, 'info');
        }
    }

    static handleNumericInput(num) {
        if (!game || game.isPaused || game.waitingForAnswer) return;
        
        // Vérifier que c'est bien le tour d'un joueur humain
        if (game.gameMode === 'pvai' && game.activeTeam === 2) {
            this.showMessage("C'est à l'IA de jouer !", 'warning');
            return;
        }
        
        const currentTeam = game.activeTeam === 1 ? game.team1 : game.team2;
        currentTeam.setAnswer(currentTeam.currentAnswer + num);
        
        if (game.activeTeam === 1) {
            if (this.team1Answer) this.team1Answer.textContent = currentTeam.currentAnswer || '?';
        } else {
            if (this.team2Answer) this.team2Answer.textContent = currentTeam.currentAnswer || '?';
        }
    }

    static clearInput() {
        if (!game || game.isPaused || game.waitingForAnswer) return;
        
        // Vérifier que c'est bien le tour d'un joueur humain
        if (game.gameMode === 'pvai' && game.activeTeam === 2) {
            this.showMessage("C'est à l'IA de jouer !", 'warning');
            return;
        }
        
        const currentTeam = game.activeTeam === 1 ? game.team1 : game.team2;
        currentTeam.clearAnswer();
        
        if (game.activeTeam === 1) {
            if (this.team1Answer) this.team1Answer.textContent = '?';
        } else {
            if (this.team2Answer) this.team2Answer.textContent = '?';
        }
    }

    static clearAnswerDisplay() {
        if (this.team1Answer) this.team1Answer.textContent = '?';
        if (this.team2Answer) this.team2Answer.textContent = '?';
    }

    static validateAnswer() {
        if (!game || game.isPaused || game.waitingForAnswer) return;
        
        // Vérifier que c'est bien le tour d'un joueur humain
        if (game.gameMode === 'pvai' && game.activeTeam === 2) {
            this.showMessage("C'est à l'IA de jouer !", 'warning');
            return;
        }
        
        game.handleAnswer();
    }

    static updateScores() {
        if (this.team1Score) this.team1Score.textContent = game ? game.team1.roundsWon : '0';
        if (this.team2Score) this.team2Score.textContent = game ? game.team2.roundsWon : '0';
    }

    static updateRounds(current, max) {
        if (this.roundsDisplay) {
            this.roundsDisplay.textContent = `Manche ${current}/${max}`;
        }
    }

    // Modifiez updateQuestion() dans UI :
    static updateQuestion(team, operation) {
        if (team === 1) {
            if (this.team1Question) {
                if (window.game && game.team1) game.team1.clearAnswer();
                this.team1Question.innerHTML = `${operation} = <span class="answer" id="team1-answer">?</span>`;
                // Recache l'élément answer
                this.team1Answer = document.getElementById('team1-answer');
            }
        } else {
            if (this.team2Question) {
                if (window.game && game.team2) game.team2.clearAnswer();
                this.team2Question.innerHTML = `${operation} = <span class="answer" id="team2-answer">?</span>`;
                // Recache l'élément answer
                this.team2Answer = document.getElementById('team2-answer');
            }
        }
    }

    static updateRopePosition(position, maxSteps) {
        if (!this.ropeCenter) return;
        
        const percentage = (position / maxSteps) * 50;
        this.ropeCenter.style.left = `calc(50% + ${percentage}%)`;
        
        // Animation de la corde
        this.ropeCenter.style.transform = `translate(-50%, -50%) scale(1.2)`;
        setTimeout(() => {
            if (this.ropeCenter) {
                this.ropeCenter.style.transform = `translate(-50%, -50%) scale(1)`;
            }
        }, CONFIG.ANIMATION_DURATION);
    }

    static showEffect(effect, team) {
        const element = team === 1 ? 
            document.querySelector('.team1-area .question-display') : 
            document.querySelector('.team2-area .question-display');
        
        if (!element) return;
        
        if (effect === 'correct') {
            element.classList.add('glow');
            setTimeout(() => element.classList.remove('glow'), 500);
        } else {
            element.classList.add('vibrate');
            setTimeout(() => element.classList.remove('vibrate'), 300);
        }
    }

    static togglePause() {
        if (!game) return;
        
        if (game.isPaused) {
            game.resume();
            this.showScreen('game');
        } else {
            game.pause();
            this.showScreen('pause');
        }
    }

    static resumeGame() {
        if (game) {
            game.resume();
            this.showScreen('game');
        }
    }

    static restartGame() {
        if (game) {
            const difficulty = game.currentDifficulty;
            const mode = game.gameMode;
            game.startNewGame(difficulty, mode);
            this.showScreen('game');
        } else {
            this.showHome();
        }
    }

    static quitToMenu() {
        if (game) {
            if (game.timer) clearInterval(game.timer);
            if (game.iaTimeout) clearTimeout(game.iaTimeout);
        }
        game = null;
        this.showHome();
    }

    static showHome() {
        game = null;
        this.showScreen('home');
    }

    static showVictory(winnerName) {
        const victoryMessage = document.getElementById('victory-message');
        if (victoryMessage) {
            victoryMessage.innerHTML = `
                <i class="fas fa-trophy" style="color: gold;"></i> 
                ${winnerName} a gagné la partie ! 
                <i class="fas fa-trophy" style="color: gold;"></i>
            `;
        }
        this.showScreen('victory');
        this.createConfetti();
        
        // Ajouter un effet sonore visuel
        document.body.style.animation = 'victoryFlash 0.5s 3';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 1500);
    }

    static createConfetti() {
        const container = document.getElementById('confetti-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = Math.random() * 10 + 5 + 'px';
            container.appendChild(confetti);
        }
    }

    static showScores() {
        const scores = JSON.parse(localStorage.getItem('mathTugOfWarScores') || '[]');
        const list = document.getElementById('highscores-list');
        
        if (!list) return;
        
        if (scores.length) {
            list.innerHTML = scores.map((score, index) => `
                <div class="score-item">
                    <span>${index + 1}. ${score.winner}</span>
                    <span>${score.mode || 'Joueur vs Joueur'} - Niv.${score.difficulty}</span>
                    <span>${score.date}</span>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<p class="no-scores">Aucun score pour le moment</p>';
        }
        
        this.showScreen('scores');
    }

    static clearScores() {
        if (confirm('Effacer tous les scores ?')) {
            localStorage.removeItem('mathTugOfWarScores');
            this.showScores();
        }
    }

    static loadHighScores() {
        // Précharger les scores si nécessaire
        const scores = localStorage.getItem('mathTugOfWarScores');
        if (!scores) {
            localStorage.setItem('mathTugOfWarScores', JSON.stringify([]));
        }
    }
    // Dans UI.createTimerBar(), vérifiez que matchInfo existe
    static createTimerBar() {
        const matchInfo = document.querySelector('.match-info');
        if (!matchInfo) return;
        
        // Supprimer l'ancienne barre si elle existe
        const oldBar = document.getElementById('timer-container');
        if (oldBar) oldBar.remove();
        
        // Créer le conteneur de la barre de temps
        const timerContainer = document.createElement('div');
        timerContainer.className = 'timer-container';
        timerContainer.id = 'timer-container';
        
        const timerProgress = document.createElement('div');
        timerProgress.className = 'timer-progress';
        timerProgress.id = 'timer-progress';
        
        timerContainer.appendChild(timerProgress);
        matchInfo.appendChild(timerContainer);
        
        this.timerContainer = timerContainer;
        this.timerProgress = timerProgress;
    }

    static updateTimerBar(timeLeft, maxTime) {
        if (!this.timerProgress) return;
        
        const percentage = (timeLeft / maxTime) * 100;
        this.timerProgress.style.width = `${percentage}%`;
        
        // Changer la couleur selon le temps restant
        if (percentage > 60) {
            this.timerProgress.style.background = 'linear-gradient(90deg, #2ed573, #7bed9f)';
        } else if (percentage > 30) {
            this.timerProgress.style.background = 'linear-gradient(90deg, #ffa502, #ff7f50)';
        } else {
            this.timerProgress.style.background = 'linear-gradient(90deg, #ff4757, #ff6b81)';
            this.timerProgress.classList.add('timer-critical');
        }
        
        // Animation de pulsation quand le temps est critique
        if (percentage <= 20) {
            this.timerProgress.style.animation = 'pulse-danger 0.5s infinite';
        } else {
            this.timerProgress.style.animation = 'none';
        }
    }

    // Modifiez la méthode init() pour appeler createTimerBar()
    static init() {
        this.cacheElements();
        this.attachEventListeners();
        this.loadHighScores();
        this.createMessageContainer();
        this.createTimerBar();
        this.setDefaultCards(); // Ajoutez cette ligne
    }

    // Dans la classe UI, remplacez updateRopePosition()
    static updateRopePosition(position, maxSteps) {
        if (!this.ropeCenter) return;
        
        const percentage = (position / maxSteps) * 50;
        const newLeft = `calc(50% + ${percentage}%)`;
        
        // Animation plus dynamique avec elastic effect
        this.ropeCenter.style.transition = 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        this.ropeCenter.style.left = newLeft;
        
        // Ajouter un effet de tension sur la corde
        this.updateRopeTension(position, maxSteps);
        
        // Animer les indicateurs d'équipe
        this.animateTeamIndicators(position);
        
        // Effet de secousse quand la corde bouge beaucoup
        if (Math.abs(position) > maxSteps * 0.7) {
            this.ropeCenter.classList.add('rope-glow');
            this.createRopeStrain();
        } else {
            this.ropeCenter.classList.remove('rope-glow');
        }
        
        // Animation de rebond
        this.ropeCenter.style.transform = `translate(-50%, -50%) scale(1.3)`;
        setTimeout(() => {
            if (this.ropeCenter) {
                this.ropeCenter.style.transform = `translate(-50%, -50%) scale(1)`;
            }
        }, 200);
    }

    static updateRopeTension(position, maxSteps) {
        // Supprimer les anciennes tensions
        document.querySelectorAll('.rope-strain').forEach(el => el.remove());
        
        const tension = Math.abs(position) / maxSteps;
        if (tension > 0.3) {
            // Ajouter des effets de tension sur la corde
            const ropeContainer = document.querySelector('.rope-container');
            
            const leftStrain = document.createElement('div');
            leftStrain.className = 'rope-strain left';
            leftStrain.style.width = `${tension * 50}px`;
            
            const rightStrain = document.createElement('div');
            rightStrain.className = 'rope-strain right';
            rightStrain.style.width = `${tension * 50}px`;
            
            ropeContainer.appendChild(leftStrain);
            ropeContainer.appendChild(rightStrain);
            
            // Supprimer après l'animation
            setTimeout(() => {
                leftStrain.remove();
                rightStrain.remove();
            }, 300);
        }
    }

    static animateTeamIndicators(position) {
        const team1Indicator = document.querySelector('.team1-indicator');
        const team2Indicator = document.querySelector('.team2-indicator');
        
        if (!team1Indicator || !team2Indicator) return;
        
        if (position < -3) {
            // Équipe 1 tire
            team1Indicator.classList.add('pulled');
            team2Indicator.classList.remove('pulled');
        } else if (position > 3) {
            // Équipe 2 tire
            team2Indicator.classList.add('pulled');
            team1Indicator.classList.remove('pulled');
        } else {
            team1Indicator.classList.remove('pulled');
            team2Indicator.classList.remove('pulled');
        }
    }

    static createRopeStrain() {
        // Créer un effet de vibration quand la corde est tendue
        const ropeCenter = this.ropeCenter;
        if (!ropeCenter) return;
        
        ropeCenter.style.animation = 'ropePulse 0.5s infinite';
        
        setTimeout(() => {
            if (ropeCenter) {
                ropeCenter.style.animation = 'none';
            }
        }, 500);
    }

    static deleteLastDigit() {
        if (!game || game.isPaused || game.waitingForAnswer) return;
        
        if (game.gameMode === 'pvai' && game.activeTeam === 2) {
            this.showMessage("C'est à l'IA de jouer !", 'warning');
            return;
        }
        
        const currentTeam = game.activeTeam === 1 ? game.team1 : game.team2;
        const currentAnswer = currentTeam.currentAnswer;
        
        if (currentAnswer.length > 0) {
            currentTeam.setAnswer(currentAnswer.slice(0, -1));
            this.updateAnswerDisplay();
        } else {
            this.showMessage("Aucun chiffre à effacer", 'info');
        }
    }

    static clearAllInput() {
        if (!game || game.isPaused || game.waitingForAnswer) return;
        
        if (game.gameMode === 'pvai' && game.activeTeam === 2) {
            this.showMessage("C'est à l'IA de jouer !", 'warning');
            return;
        }
        
        const currentTeam = game.activeTeam === 1 ? game.team1 : game.team2;
        currentTeam.clearAnswer();
        this.updateAnswerDisplay();
        this.showMessage("Réponse effacée", 'info');
    }

    static updateAnswerDisplay() {
        if (!game) return;
        
        const team1Answer = game.team1.currentAnswer || '?';
        const team2Answer = game.team2.currentAnswer || '?';
        
        if (this.team1Answer) this.team1Answer.textContent = team1Answer;
        if (this.team2Answer) this.team2Answer.textContent = team2Answer;
    }
}

// ==================== INITIALISATION ====================
let game;

// Attendre que le DOM soit complètement chargé
document.addEventListener('DOMContentLoaded', () => {
    // Ajouter les animations CSS manquantes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideUp {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(-100%); opacity: 0; }
        }
        
        .no-scores {
            text-align: center;
            color: #999;
            padding: 20px;
        }
        
        .glow {
            animation: glow 0.5s ease;
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 10px #2ed573; }
            50% { box-shadow: 0 0 30px #2ed573; }
        }
        
        .vibrate {
            animation: vibrate 0.3s ease;
        }
        
        @keyframes vibrate {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
    
    // Initialiser l'interface utilisateur
    UI.init();
});