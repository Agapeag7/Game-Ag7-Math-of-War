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

class PowerUp {
    constructor() {
        this.types = [
            { 
                id: 'double_points',
                name: "💪 DOUBLE POINTS", 
                icon: "⭐",
                description: "Prochaine bonne réponse = 2 points !",
                color: "#ffd700",
                duration: 1,
                applyEffect: (game) => {
                    game.pointMultiplier = 2;
                    UI.showMessage("💪 DOUBLE POINTS activé !", 'success');
                }
            },
            { 
                id: 'time_freeze',
                name: "❄️ GEL DU TEMPS", 
                icon: "⏸️",
                description: "Le chrono s'arrête pour l'adversaire (5s)",
                color: "#00cec9",
                duration: 5000,
                applyEffect: (game) => {
                    game.timeFrozen = true;
                    game.frozenUntil = Date.now() + 5000;
                    UI.showMessage("❄️ TEMPS GELÉ pour l'adversaire !", 'info');
                    
                    // Arrêter le timer si l'adversaire est en train de jouer
                    if (game.activeTeam === 2) {
                        if (game.timer) clearInterval(game.timer);
                        if (game.iaTimeout) clearTimeout(game.iaTimeout);
                    }
                    
                    // Vérifier périodiquement si le gel est terminé
                    const checkFrozen = setInterval(() => {
                        if (Date.now() >= game.frozenUntil) {
                            game.timeFrozen = false;
                            clearInterval(checkFrozen);
                            UI.showMessage("⏱️ Le temps reprend !", 'info');
                            
                            // Relancer le timer ou l'IA si c'est toujours le tour de l'adversaire
                            if (game.activeTeam === 2 && game.gameMode === 'pvai' && !game.isPaused) {
                                game.startIA();
                            } else if (!game.isPaused) {
                                game.startTimer();
                            }
                        }
                    }, 100);
                }
            },
            { 
                id: 'shield',
                name: "🛡️ BOUCLIER", 
                icon: "🛡️",
                description: "Protège contre une mauvaise réponse",
                color: "#0984e3",
                duration: 1,
                applyEffect: (game) => {
                    game.shieldActive = true;
                    game.shieldTeam = game.activeTeam;
                    UI.showMessage("🛡️ BOUCLIER activé !", 'success');
                }
            },
            { 
                id: 'auto_answer',
                name: "⚡ RÉPONSE AUTO", 
                icon: "✨",
                description: "La bonne réponse s'affiche !",
                color: "#fdcb6e",
                duration: 0,
                applyEffect: (game) => {
                    const currentTeam = game.activeTeam === 1 ? game.team1 : game.team2;
                    currentTeam.setAnswer(currentTeam.currentOperation.result.toString());
                    UI.updateAnswerDisplay();
                    UI.showMessage("✨ RÉPONSE AUTO activée !", 'success');
                }
            },
            { 
                id: 'speed_boost',
                name: "🚀 TURBO", 
                icon: "⚡",
                description: "L'adversaire a moins de temps (50%)",
                color: "#e17055",
                duration: 10000,
                applyEffect: (game) => {
                    game.opponentTimeReduced = true;
                    game.timeReduction = 0.5;
                    game.timeReductionUntil = Date.now() + 10000;
                    UI.showMessage("🚀 TURBO activé ! L'adversaire est ralenti", 'info');
                    
                    // Si l'adversaire est en train de jouer, redémarrer son timer avec le nouveau temps
                    if (game.activeTeam === 2 && game.gameMode === 'pvai') {
                        if (game.timer) clearInterval(game.timer);
                        if (game.iaTimeout) clearTimeout(game.iaTimeout);
                        game.startIA();
                    }
                    
                    setTimeout(() => {
                        game.opponentTimeReduced = false;
                        UI.showMessage("Turbo terminé", 'info');
                        
                        // Si l'adversaire est en train de jouer, redémarrer normalement
                        if (game.activeTeam === 2 && game.gameMode === 'pvai') {
                            if (game.timer) clearInterval(game.timer);
                            if (game.iaTimeout) clearTimeout(game.iaTimeout);
                            game.startIA();
                        }
                    }, 10000);
                }
            },
            { 
                id: 'extra_life',
                name: "❤️ VIE EXTRA", 
                icon: "➕",
                description: "Une chance en cas d'erreur",
                color: "#ff4757",
                duration: 1,
                applyEffect: (game) => {
                    game.extraLife = true;
                    game.extraLifeTeam = game.activeTeam;
                    UI.showMessage("❤️ VIE EXTRA ! Vous pouvez vous tromper sans perdre", 'success');
                }
            }
        ];
        
        this.spawnChance = 0.4; // 40% de chance par tour (au lieu de 15%)
    }
    
    getRandomPowerUp() {
        return this.types[Math.floor(Math.random() * this.types.length)];
    }
    
    trySpawnPowerUp(roundNumber, isCritical = false) {
        // Plus de chances si la corde est près de la victoire
        const criticalBonus = isCritical ? 0.3 : 0;
        const chance = this.spawnChance + (roundNumber * 0.05) + criticalBonus;
        
        console.log("Tentative spawn power-up, chance:", chance); // Debug
        
        if (Math.random() < chance) {
            const powerUp = this.getRandomPowerUp();
            console.log("Power-up généré:", powerUp.name); // Debug
            return powerUp;
        }
        return null;
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

        // Système de power-ups
        this.powerUpSystem = new PowerUp();
        this.currentPowerUp = null;
        
        // États des power-ups actifs
        this.pointMultiplier = 1;
        this.timeFrozen = false;
        this.frozenUntil = 0;
        this.shieldActive = false;
        this.shieldTeam = null;
        this.extraLife = false;
        this.extraLifeTeam = null;
        this.confusionActive = false;
        this.confusionTeam = null;
        this.opponentTimeReduced = false;
        this.timeReduction = 1;
        this.timeReductionUntil = 0;
        
        // Tentatives (UNIFIÉES)
        this.attempts = { 1: 3, 2: 3 };
        this.maxAttempts = 3;

        this.bonusInventory = {
            double_points: { count: 0, name: "💪 Double points", icon: "⭐", color: "#ffd700" },
            extra_attempt: { count: 0, name: "➕ Tentative sup", icon: "➕", color: "#00cec9" },
            shield: { count: 0, name: "🛡️ Bouclier", icon: "🛡️", color: "#0984e3" },
            steal_attempt: { count: 0, name: "👻 Voleur", icon: "👻", color: "#6c5ce7" },
            time_bonus: { count: 0, name: "⏱️ Temps bonus", icon: "⏱️", color: "#fdcb6e" },
            confusion: { count: 0, name: "🌀 Confusion", icon: "🌀", color: "#e17055" }
        };

        this.bonusTypes = [
            { id: 'double_points', name: "💪 Double points", icon: "⭐", description: "Double les points pour 1 tour", color: "#ffd700" },
            { id: 'extra_attempt', name: "➕ Tentative sup", icon: "➕", description: "Gagne 1 tentative supplémentaire", color: "#00cec9" },
            { id: 'shield', name: "🛡️ Bouclier", icon: "🛡️", description: "Protège contre 1 erreur", color: "#0984e3" },
            { id: 'steal_attempt', name: "👻 Voleur", icon: "👻", description: "Vole 1 tentative à l'adversaire", color: "#6c5ce7" },
            { id: 'time_bonus', name: "⏱️ Temps bonus", icon: "⏱️", description: "+5 secondes au chrono", color: "#fdcb6e" },
            { id: 'confusion', name: "🌀 Confusion", icon: "🌀", description: "L'adversaire perd 1 tentative", color: "#e17055" }
        ];

        this.bonusActions = {
            double_points: (game) => {
                game.pointMultiplier = 2;
                UI.showMessage("💪 Double points activé !", 'success');
            },
            extra_attempt: (game, team) => {
                game.attempts[team]++;
                UI.updateAttempts();
                UI.showMessage("➕ Tentative supplémentaire !", 'success');
            },
            shield: (game, team) => {
                game.shieldActive = true;
                game.shieldTeam = team;
                UI.showMessage("🛡️ Bouclier activé !", 'success');
            },
            steal_attempt: (game, team) => {
                const opponent = team === 1 ? 2 : 1;
                if (game.attempts[opponent] > 0) {
                    game.attempts[opponent]--;
                    game.attempts[team]++;
                    UI.updateAttempts();
                    UI.showMessage(`👻 Tentative volée à l'adversaire !`, 'success');
                }
            },
            time_bonus: (game) => {
                game.timeLeft += 5;
                UI.updateTimerDisplay();
                UI.showMessage("⏱️ +5 secondes !", 'success');
            },
            confusion: (game, team) => {
                const opponent = team === 1 ? 2 : 1;
                if (game.attempts[opponent] > 0) {
                    game.attempts[opponent]--;
                    UI.updateAttempts();
                    UI.showMessage(`🌀 L'adversaire perd une tentative !`, 'success');
                }
            }
        };
    }

    tryAddBonus() {
        if (Math.random() < 0.4) { // 40% de chance
            const bonusTypes = [
                { id: 'double_points', name: "💪 Double points", icon: "⭐", color: "#ffd700" },
                { id: 'extra_attempt', name: "➕ Tentative sup", icon: "➕", color: "#00cec9" },
                { id: 'shield', name: "🛡️ Bouclier", icon: "🛡️", color: "#0984e3" },
                { id: 'steal_attempt', name: "👻 Voleur", icon: "👻", color: "#6c5ce7" },
                { id: 'time_bonus', name: "⏱️ Temps bonus", icon: "⏱️", color: "#fdcb6e" },
                { id: 'confusion', name: "🌀 Confusion", icon: "🌀", color: "#e17055" }
            ];
            
            const randomBonus = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
            this.bonusInventory[randomBonus.id].count++;
            UI.updateBonusIcons(this.bonusInventory);
            UI.showMessage(`✨ Bonus obtenu : ${randomBonus.name} !`, 'success');
        }
    }

    useBonus(bonusId) {
        // Vérifier que c'est le tour du joueur (pas l'IA)
        if (this.gameMode === 'pvai' && this.activeTeam === 2) {
            UI.showMessage("Ce n'est pas votre tour !", 'warning');
            return;
        }
        
        const bonus = this.bonusInventory[bonusId];
        if (!bonus || bonus.count <= 0) return;
        
        // Actions des bonus
        switch(bonusId) {
            case 'double_points':
                this.pointMultiplier = 2;
                UI.showMessage("💪 Double points activé !", 'success');
                break;
                
            case 'extra_attempt':
                this.attempts[this.activeTeam]++;
                UI.updateAttempts();
                UI.showMessage("➕ Tentative supplémentaire !", 'success');
                break;
                
            case 'shield':
                this.shieldActive = true;
                this.shieldTeam = this.activeTeam;
                UI.showMessage("🛡️ Bouclier activé !", 'success');
                break;
                
            case 'steal_attempt':
                const opponent = this.activeTeam === 1 ? 2 : 1;
                if (this.attempts[opponent] > 0) {
                    this.attempts[opponent]--;
                    this.attempts[this.activeTeam]++;
                    UI.updateAttempts();
                    UI.showMessage(`👻 Tentative volée à l'adversaire !`, 'success');
                } else {
                    UI.showMessage("L'adversaire n'a pas de tentative à voler !", 'warning');
                    return;
                }
                break;
                
            case 'time_bonus':
                this.timeLeft += 5;
                this.updateTimerDisplay();
                UI.showMessage("⏱️ +5 secondes !", 'success');
                break;
                
            case 'confusion':
                const opponent2 = this.activeTeam === 1 ? 2 : 1;
                if (this.attempts[opponent2] > 0) {
                    this.attempts[opponent2]--;
                    UI.updateAttempts();
                    UI.showMessage(`🌀 L'adversaire perd une tentative !`, 'success');
                } else {
                    UI.showMessage("L'adversaire n'a pas de tentative à perdre !", 'warning');
                    return;
                }
                break;
                
            default:
                return;
        }
        
        // Décrémenter le compteur et mettre à jour l'affichage
        bonus.count--;
        UI.updateBonusIcons(this.bonusInventory);
    }

    testClick() {
        console.log("Test clic réussi !");
        UI.showMessage("Test clic réussi !", 'success');
    }

    startNewGame(difficulty, mode) {
        this.currentDifficulty = difficulty;
        this.gameMode = mode;
        this.currentRound = 1;
        this.ropePosition = 0;
        this.team1.reset();
        this.team2.reset();
        
        // Réinitialiser les bonus
        for (let key in this.bonusInventory) {
            this.bonusInventory[key].count = 0;
        }
        
        // Mettre à jour l'affichage
        UI.updateBonusIcons(this.bonusInventory);
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
        
        // Réinitialiser les power-ups temporaires
        this.pointMultiplier = 1;
        
        // Mettre à jour l'affichage des bonus
        UI.updateBonusIcons(this.bonusInventory);
        
        // Vérifier si la corde est en position critique (pour plus de chances)
        const isCritical = Math.abs(this.ropePosition) > CONFIG.ROPE_STEPS * 0.7;
        
        // Générer un power-up aléatoire
        const powerUp = this.powerUpSystem.trySpawnPowerUp(this.currentRound, isCritical);
        if (powerUp) {
            this.currentPowerUp = powerUp;
            UI.showPowerUp(powerUp);
            
            // Appliquer l'effet immédiatement si c'est un power-up instantané
            if (powerUp.duration === 0) {
                powerUp.applyEffect(this);
            }
        } else {
            this.currentPowerUp = null;
        }
        
        // Générer les questions
        this.generateOperation(this.team1);
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
        let timeLimit = CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit;
        
        // Appliquer les power-ups qui affectent le temps
        if (this.timeFrozen) {
            // Temps gelé, ne pas décrémenter
            return;
        }
        
        if (this.opponentTimeReduced && this.activeTeam === this.confusionTeam) {
            timeLimit = Math.floor(timeLimit * this.timeReduction);
        }
        
        this.timeLeft = timeLimit;
        this.maxTime = this.timeLeft;
        this.updateTimerDisplay();
        
        if (this.timer) clearInterval(this.timer);
        
        this.timer = setInterval(() => {
            if (this.isPaused || this.timeFrozen) return;
            
            this.timeLeft--;
            this.updateTimerDisplay();
            UI.updateTimerBar(this.timeLeft, this.maxTime);
            
            if (this.timeLeft <= 0) {
                this.handleTimeout();
            }
        }, 1000);
    }

    handleTimeout() {
        if (this.waitingForAnswer) return;
        
        UI.showMessage(`Temps écoulé pour ${this.activeTeam === 1 ? this.team1.name : (this.gameMode === 'pvai' && this.activeTeam === 2 ? 'IA' : this.team2.name)} !`, 'warning');
        this.switchTeam();
        this.prepareNextTurn();
    }

    switchTeam() {
        this.activeTeam = this.activeTeam === 1 ? 2 : 1;
        
        // Vérifier si un power-up doit être appliqué au changement d'équipe
        if (this.currentPowerUp && this.currentPowerUp.duration > 0) {
            // Appliquer l'effet si c'est le bon moment
            if (this.currentPowerUp.id === 'double_points' && this.activeTeam === 1) {
                this.currentPowerUp.applyEffect(this);
            } else if (this.currentPowerUp.id === 'shield' && this.activeTeam === 1) {
                this.currentPowerUp.applyEffect(this);
            } else if (this.currentPowerUp.id === 'extra_life' && this.activeTeam === 1) {
                this.currentPowerUp.applyEffect(this);
            }
        }
        
        UI.showTurnIndicator(this.activeTeam);
    }

    prepareNextTurn() {
        this.waitingForAnswer = false;
        
        // Réinitialiser les tentatives pour l'équipe active
        this.attempts[this.activeTeam] = this.maxAttempts;
        UI.updateAttempts();
        
        // Réinitialiser les réponses
        this.team1.clearAnswer();
        this.team2.clearAnswer();
        
        const currentTeam = this.activeTeam === 1 ? this.team1 : this.team2;
        
        if (this.gameMode === 'pvp' || (this.gameMode === 'pvai' && this.activeTeam === 1)) {
            this.generateOperation(currentTeam);
            UI.updateQuestion(this.activeTeam, currentTeam.currentOperation.text);
            UI.updateQuestion(this.activeTeam === 1 ? 2 : 1, "À ton tour !");
            this.startTimer();
        } else if (this.gameMode === 'pvai' && this.activeTeam === 2) {
            this.generateOperation(currentTeam);
            UI.updateQuestion(2, currentTeam.currentOperation.text);
            UI.updateQuestion(1, "L'IA réfléchit...");
            this.startIA();
        }
    }

    handleAnswer() {
        if (this.isPaused || this.waitingForAnswer) return;
        
        const currentTeam = this.activeTeam === 1 ? this.team1 : this.team2;
        
        // Pour l'IA, on ne vérifie pas la présence de réponse (elle est déjà définie)
        if (this.gameMode !== 'pvai' || this.activeTeam !== 2) {
            if (!currentTeam.currentAnswer) {
                UI.showMessage("Entre une réponse d'abord !", 'warning');
                return;
            }
        }
        
        this.waitingForAnswer = true;
        
        // Arrêter le timer
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        
        if (currentTeam.isCorrect()) {
            // Bonne réponse
            UI.showEffect('correct', this.activeTeam);
            UI.showMessage("Bonne réponse ! 🎉", 'success');
            
            // Jouer un son (optionnel)
            UI.playSound('correct');
            
            // Récompenser avec un bonus (40%)
            this.tryAddBonus();
            
            // Déplacer la corde (avec multiplicateur)
            const points = this.pointMultiplier || 1;
            for (let i = 0; i < points; i++) {
                this.moveRope(this.activeTeam);
            }
            this.pointMultiplier = 1; // Reset
            
            // Réinitialiser les tentatives pour l'équipe active
            this.attempts[this.activeTeam] = this.maxAttempts;
            UI.updateAttempts();
            
            // Vérifier victoire
            if (Math.abs(this.ropePosition) >= CONFIG.ROPE_STEPS) {
                this.winRound(this.activeTeam);
                return;
            }
            
            // Passer à l'autre équipe
            setTimeout(() => {
                this.switchTeam();
                this.prepareNextTurn();
            }, CONFIG.ANIMATION_DURATION);
            
        } else {
            // Mauvaise réponse
            UI.showEffect('wrong', this.activeTeam);
            UI.playSound('wrong');
            
            // Vérification du bouclier
            if (this.shieldActive && this.shieldTeam === this.activeTeam) {
                this.shieldActive = false;
                UI.showMessage("🛡️ Bouclier vous protège !", 'success');
                this.waitingForAnswer = false;
                currentTeam.clearAnswer();
                UI.clearAnswerDisplay();
                this.startTimer();
                return;
            }
            
            // Vérification de la vie extra
            if (this.extraLife && this.extraLifeTeam === this.activeTeam) {
                this.extraLife = false;
                UI.showMessage("❤️ Vie extra utilisée !", 'success');
                this.waitingForAnswer = false;
                currentTeam.clearAnswer();
                UI.clearAnswerDisplay();
                this.startTimer();
                return;
            }
            
            // Décrémenter les tentatives
            this.attempts[this.activeTeam]--;
            UI.updateAttempts();
            
            UI.showMessage(`Mauvaise réponse ! Tentatives restantes: ${this.attempts[this.activeTeam]}`, 'error');
            
            if (this.attempts[this.activeTeam] <= 0) {
                // Plus de tentatives, passage à l'adversaire
                UI.showMessage("Plus de tentatives ! Passage à l'adversaire", 'warning');
                
                // Pénalité : la corde bouge vers l'adversaire
                const otherTeam = this.activeTeam === 1 ? 2 : 1;
                this.moveRope(otherTeam);
                
                if (Math.abs(this.ropePosition) >= CONFIG.ROPE_STEPS) {
                    this.winRound(otherTeam);
                    return;
                }
                
                // Réinitialiser les tentatives pour l'équipe active
                this.attempts[this.activeTeam] = this.maxAttempts;
                UI.updateAttempts();
                
                setTimeout(() => {
                    this.switchTeam();
                    this.prepareNextTurn();
                }, CONFIG.ANIMATION_DURATION);
                
            } else {
                // Il reste des tentatives, on réessaye
                setTimeout(() => {
                    this.waitingForAnswer = false;
                    currentTeam.clearAnswer();
                    UI.clearAnswerDisplay();
                    
                    // Si c'est l'IA, relancer automatiquement
                    if (this.gameMode === 'pvai' && this.activeTeam === 2) {
                        this.startIA();
                    } else {
                        this.startTimer();
                    }
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
        
        // Vérifier si l'IA est en pause ou si le temps est gelé
        if (this.isPaused || this.timeFrozen) {
            // Réessayer dans 1 seconde
            this.iaTimeout = setTimeout(() => this.startIA(), 1000);
            return;
        }
        
        // Afficher un message différent selon le contexte
        if (this.attempts[2] <= 0) {
            UI.showMessage("L'IA réfléchit (plus de tentatives)...", 'info');
        } else {
            UI.showMessage(`L'IA réfléchit (${this.attempts[2]}/${this.maxAttempts} tentatives)...`, 'info');
        }
        
        // Ajuster le temps de réflexion selon les power-ups
        let thinkingTime = settings.aiSpeed;
        if (this.opponentTimeReduced && this.activeTeam === 2) {
            thinkingTime = Math.floor(thinkingTime * 0.5); // 50% plus rapide si turbo
        }
        
        this.iaTimeout = setTimeout(() => {
            if (this.isPaused || this.gameMode !== 'pvai' || this.activeTeam !== 2) return;
            
            // Vérifier si le temps est toujours gelé
            if (this.timeFrozen) {
                // Réessayer plus tard
                this.iaTimeout = setTimeout(() => this.startIA(), 1000);
                return;
            }
            
            this.handleIAResponse();
            
        }, thinkingTime);
    }

    handleIAResponse() {
        if (this.isPaused || this.gameMode !== 'pvai' || this.activeTeam !== 2 || this.waitingForAnswer) return;
        
        const currentTeam = this.team2;
        
        // L'IA utilise ses tentatives
        if (this.attempts[2] <= 0) {
            // Plus de tentatives, l'IA passe son tour
            UI.showMessage("L'IA n'a plus de tentatives !", 'warning');
            this.switchTeam();
            this.prepareNextTurn();
            return;
        }
        
        // Décision de l'IA (basée sur le taux d'erreur)
        const shouldBeWrong = Math.random() < CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].aiErrorRate;
        
        if (shouldBeWrong) {
            // L'IA fait une erreur
            const wrongAnswer = currentTeam.currentOperation.result + Math.floor(Math.random() * 5) + 1;
            currentTeam.setAnswer(wrongAnswer.toString());
            UI.showMessage("L'IA a fait une erreur !", 'error');
            
            // IMPORTANT: L'IA utilise une tentative même en erreur
            this.attempts[2]--;
            UI.updateAttempts();
            
            // Vérifier si l'IA a encore des tentatives
            if (this.attempts[2] > 0) {
                // Il reste des tentatives, l'IA peut réessayer après un délai
                setTimeout(() => {
                    this.waitingForAnswer = false;
                    currentTeam.clearAnswer();
                    UI.clearAnswerDisplay();
                    this.startIA(); // Relancer l'IA pour une nouvelle tentative
                }, CONFIG.ANIMATION_DURATION);
            } else {
                // Plus de tentatives, pénalité et changement de tour
                this.moveRope(1); // L'adversaire (équipe 1) gagne un point
                this.attempts[2] = this.maxAttempts; // Réinitialiser pour le prochain tour
                this.switchTeam();
                this.prepareNextTurn();
            }
        } else {
            // L'IA répond correctement
            currentTeam.setAnswer(currentTeam.currentOperation.result.toString());
            UI.showMessage("L'IA a trouvé la réponse !", 'success');
            
            // Traiter la bonne réponse (qui gère déjà les tentatives)
            this.handleAnswer();
        }
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

    startPowerUpIndicator() {
        if (this.powerUpInterval) clearInterval(this.powerUpInterval);
        
        this.powerUpInterval = setInterval(() => {
            UI.updatePowerUpIndicators(this);
        }, 500);
    }

    testAddBonus() {
        const testBonus = { id: 'double_points', name: "💪 Double points", icon: "⭐", color: "#ffd700" };
        this.bonusInventory[testBonus.id].count++;
        UI.updateBonusIcons(this.bonusInventory); // CORRECTION : utiliser updateBonusIcons
        UI.showMessage(`✨ Bonus de test ajouté !`, 'success');
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
        this.setupBonusUI();
        this.addBonusStyles();
        
        // Raccourci clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && game && !game.isPaused && !game.waitingForAnswer) {
                if (game.gameMode === 'pvai' && game.activeTeam === 2) {
                    this.showMessage("C'est à l'IA de jouer !", 'warning');
                    return;
                }
                this.validateAnswer();
            }
        });
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

        // Mode cards
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

        // Cartes de difficulté
        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const difficulty = e.currentTarget.dataset.difficulty;
                const select = document.getElementById('difficulty');
                if (select) select.value = difficulty;

                document.querySelectorAll('.difficulty-card').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Cartes de mode
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const mode = e.currentTarget.dataset.mode;
                this.setMode(mode);
                document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteLastDigit());
        }

        const clearBtn = document.getElementById('clear-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllInput());
        }
    }

    // Activez la première carte par défaut
    static setDefaultCards() {
        const firstDifficulty = document.querySelector('.difficulty-card[data-difficulty="1"]');
        if (firstDifficulty) firstDifficulty.classList.add('active');
        
        const firstMode = document.querySelector('.mode-card[data-mode="pvp"]');
        if (firstMode) firstMode.classList.add('active');
    }

    static createMessageContainer() {
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
        
        message.innerHTML = icon + text;
        
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
        document.querySelectorAll('.mode-card').forEach(btn => btn.classList.remove('active'));
        const activeCard = document.querySelector(`.mode-card[data-mode="${mode}"]`);
        if (activeCard) activeCard.classList.add('active');
        
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
        
        this.team1Area.classList.remove('active-team');
        this.team2Area.classList.remove('active-team');
        
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
        
        if (game.gameMode === 'pvai' && game.activeTeam === 2) {
            this.showMessage("C'est à l'IA de jouer !", 'warning');
            return;
        }
        
        const currentTeam = game.activeTeam === 1 ? game.team1 : game.team2;
        currentTeam.setAnswer(currentTeam.currentAnswer + num);
        this.updateAnswerDisplay();
    }

    static clearInput() {
        if (!game || game.isPaused || game.waitingForAnswer) return;
        
        if (game.gameMode === 'pvai' && game.activeTeam === 2) {
            this.showMessage("C'est à l'IA de jouer !", 'warning');
            return;
        }
        
        const currentTeam = game.activeTeam === 1 ? game.team1 : game.team2;
        currentTeam.clearAnswer();
        this.updateAnswerDisplay();
    }

    static clearAnswerDisplay() {
        if (this.team1Answer) this.team1Answer.textContent = '?';
        if (this.team2Answer) this.team2Answer.textContent = '?';
    }

    static validateAnswer() {
        if (!game || game.isPaused || game.waitingForAnswer) return;
        
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
                if (game && game.team1) game.team1.clearAnswer();
                this.team1Question.innerHTML = `${operation} = <span class="answer" id="team1-answer">?</span>`;
                this.team1Answer = document.getElementById('team1-answer');
            }
        } else {
            if (this.team2Question) {
                if (game && game.team2) game.team2.clearAnswer();
                this.team2Question.innerHTML = `${operation} = <span class="answer" id="team2-answer">?</span>`;
                this.team2Answer = document.getElementById('team2-answer');
            }
        }
    }

    // static updateRopePosition(position, maxSteps) {
    //     if (!this.ropeCenter) return;
        
    //     const percentage = (position / maxSteps) * 50;
    //     this.ropeCenter.style.left = `calc(50% + ${percentage}%)`;
        
    //     // Animation de la corde
    //     this.ropeCenter.style.transform = `translate(-50%, -50%) scale(1.2)`;
    //     setTimeout(() => {
    //         if (this.ropeCenter) {
    //             this.ropeCenter.style.transform = `translate(-50%, -50%) scale(1)`;
    //         }
    //     }, CONFIG.ANIMATION_DURATION);
    // }

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
        const scores = localStorage.getItem('mathTugOfWarScores');
        if (!scores) {
            localStorage.setItem('mathTugOfWarScores', JSON.stringify([]));
        }
    }
    // Dans UI.createTimerBar(), vérifiez que matchInfo existe
    static createTimerBar() {
        const matchInfo = document.querySelector('.match-info');
        if (!matchInfo) return;
        
        const oldBar = document.getElementById('timer-container');
        if (oldBar) oldBar.remove();
        
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
        
        if (percentage > 60) {
            this.timerProgress.style.background = 'linear-gradient(90deg, #2ed573, #7bed9f)';
        } else if (percentage > 30) {
            this.timerProgress.style.background = 'linear-gradient(90deg, #ffa502, #ff7f50)';
        } else {
            this.timerProgress.style.background = 'linear-gradient(90deg, #ff4757, #ff6b81)';
            this.timerProgress.classList.add('timer-critical');
        }
        
        if (percentage <= 20) {
            this.timerProgress.style.animation = 'pulse-danger 0.5s infinite';
        } else {
            this.timerProgress.style.animation = 'none';
        }
    }

    //Modifiez la méthode init() pour appeler createTimerBar()
    // static init() {
    //     this.cacheElements();
    //     this.attachEventListeners();
    //     this.loadHighScores();
    //     this.createMessageContainer();
    //     this.createTimerBar();
    //     this.setDefaultCards(); // Ajoutez cette ligne
    // }

    // Dans la classe UI, remplacez updateRopePosition()
    static updateRopePosition(position, maxSteps) {
        if (!this.ropeCenter) return;
        
        const percentage = (position / maxSteps) * 50;
        const newLeft = `calc(50% + ${percentage}%)`;
        
        this.ropeCenter.style.transition = 'left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        this.ropeCenter.style.left = newLeft;
        
        this.updateRopeTension(position, maxSteps);
        this.animateTeamIndicators(position);
        
        if (Math.abs(position) > maxSteps * 0.7) {
            this.ropeCenter.classList.add('rope-glow');
            this.createRopeStrain();
        } else {
            this.ropeCenter.classList.remove('rope-glow');
        }
        
        this.ropeCenter.style.transform = `translate(-50%, -50%) scale(1.3)`;
        setTimeout(() => {
            if (this.ropeCenter) {
                this.ropeCenter.style.transform = `translate(-50%, -50%) scale(1)`;
            }
        }, 200);
    }

    static updateRopeTension(position, maxSteps) {
        document.querySelectorAll('.rope-strain').forEach(el => el.remove());
        
        const tension = Math.abs(position) / maxSteps;
        if (tension > 0.3) {
            const ropeContainer = document.querySelector('.rope-container');
            
            const leftStrain = document.createElement('div');
            leftStrain.className = 'rope-strain left';
            leftStrain.style.width = `${tension * 50}px`;
            
            const rightStrain = document.createElement('div');
            rightStrain.className = 'rope-strain right';
            rightStrain.style.width = `${tension * 50}px`;
            
            ropeContainer.appendChild(leftStrain);
            ropeContainer.appendChild(rightStrain);
            
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
            team1Indicator.classList.add('pulled');
            team2Indicator.classList.remove('pulled');
        } else if (position > 3) {
            team2Indicator.classList.add('pulled');
            team1Indicator.classList.remove('pulled');
        } else {
            team1Indicator.classList.remove('pulled');
            team2Indicator.classList.remove('pulled');
        }
    }

    static createRopeStrain() {
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

    static showPowerUp(powerUp) {
        const powerUpDiv = document.createElement('div');
        powerUpDiv.className = 'power-up-notification';
        powerUpDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${powerUp.color};
            color: white;
            padding: 40px;
            border-radius: 30px;
            font-size: 2.5rem;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            z-index: 3000;
            animation: powerUpPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            border: 5px solid white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        `;
        
        powerUpDiv.innerHTML = `
            <div style="font-size: 6rem; margin-bottom: 20px; animation: spin 2s infinite;">${powerUp.icon}</div>
            <div style="font-weight: bold; font-size: 2rem; margin-bottom: 15px;">${powerUp.name}</div>
            <div style="font-size: 1.2rem; opacity: 0.9; max-width: 300px;">${powerUp.description}</div>
        `;
        
        document.body.appendChild(powerUpDiv);
        
        this.playPowerUpSound();
        
        setTimeout(() => {
            powerUpDiv.style.animation = 'powerUpFadeOut 0.5s ease';
            setTimeout(() => powerUpDiv.remove(), 500);
        }, 3000);
    }

    static playPowerUpSound() {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                document.body.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 80%)`;
                setTimeout(() => {
                    document.body.style.backgroundColor = '';
                }, 100);
            }, i * 150);
        }
    }

    static updatePowerUpIndicators(game) {
        let indicator = document.getElementById('power-up-indicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'power-up-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 15px 20px;
                border-radius: 15px;
                z-index: 2500;
                border-left: 5px solid gold;
                backdrop-filter: blur(5px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                min-width: 200px;
            `;
            document.body.appendChild(indicator);
        }
        
        const activePowerUps = [];
        if (game.pointMultiplier > 1) activePowerUps.push("💪 Double points");
        if (game.timeFrozen) activePowerUps.push("❄️ Temps gelé");
        if (game.shieldActive) activePowerUps.push("🛡️ Bouclier");
        if (game.extraLife) activePowerUps.push("❤️ Vie extra");
        if (game.opponentTimeReduced) activePowerUps.push("🚀 Turbo actif");
        
        if (activePowerUps.length > 0) {
            indicator.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 10px; color: gold;">✨ POWER-UPS ACTIFS</div>
                ${activePowerUps.map(p => `
                    <div style="margin: 8px 0; display: flex; align-items: center;">
                        <span style="margin-right: 10px;">${p}</span>
                    </div>
                `).join('')}
            `;
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    static updateAttempts() {
        if (!game) return;
        
        const attempts1 = document.getElementById('attempts-1');
        const attempts2 = document.getElementById('attempts-2');
        
        if (attempts1) {
            attempts1.textContent = game.attempts[1];
            attempts1.style.color = game.attempts[1] <= 1 ? '#ff4757' : '';
            attempts1.style.fontWeight = game.attempts[1] <= 1 ? 'bold' : '';
        }
        
        if (attempts2) {
            attempts2.textContent = game.attempts[2];
            attempts2.style.color = game.attempts[2] <= 1 ? '#ff4757' : '';
            attempts2.style.fontWeight = game.attempts[2] <= 1 ? 'bold' : '';
        }
    }

    static setupBonusUI() {
        if (!document.querySelector('.bonus-bar')) {
            const gameScreen = document.getElementById('game-screen');
            const gameArea = document.querySelector('.game-area');
            
            if (gameArea && gameScreen) {
                const bonusBar = document.createElement('div');
                bonusBar.className = 'bonus-bar';
                bonusBar.innerHTML = `
                    <div class="bonus-icons" id="bonus-icons">
                        <span class="no-bonus-message">🎁</span>
                    </div>
                    <div class="attempts-compact">
                        <span class="attempts-team1">🔴 <span id="attempts-1">3</span></span>
                        <span class="attempts-team2">🔵 <span id="attempts-2">3</span></span>
                    </div>
                `;
                
                gameArea.parentNode.insertBefore(bonusBar, gameArea.nextSibling);
            }
        }
    }

    static playSound(type) {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            switch(type) {
                case 'correct':
                    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.1);
                    break;
                case 'wrong':
                    oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
                    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                    oscillator.start();
                    oscillator.stop(audioContext.currentTime + 0.2);
                    break;
            }
        } catch(e) { /* Silently fail if AudioContext not supported */ }
    }

    static updateBonusIcons(bonusInventory) {
        const container = document.getElementById('bonus-icons');
        if (!container) return;
        
        const activeBonuses = Object.entries(bonusInventory).filter(([_, bonus]) => bonus.count > 0);
        
        if (activeBonuses.length === 0) {
            container.innerHTML = '<span class="no-bonus-message">🎁</span>';
            return;
        }
        
        container.innerHTML = activeBonuses.map(([id, bonus]) => `
            <div class="bonus-icon-item" data-bonus-id="${id}" title="${bonus.name} - Cliquez pour activer">
                <span class="bonus-emoji" style="color: ${bonus.color};">${bonus.icon}</span>
                <span class="bonus-counter" style="background: ${bonus.color};">${bonus.count}</span>
            </div>
        `).join('');
        
        container.querySelectorAll('.bonus-icon-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const bonusId = item.dataset.bonusId;
                if (game) {                        // ← remplacer window.game par game
                    game.useBonus(bonusId);
                }
            });
        });
    }

    static addBonusStyles() {
        if (document.getElementById('bonus-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'bonus-styles';
        style.textContent = `
            .bonus-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(255, 255, 255, 0.15);
                padding: 8px 20px;
                border-radius: 50px;
                margin: 15px 0;
                backdrop-filter: blur(5px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                width: 100%;
                box-sizing: border-box;
            }
            
            .bonus-icons {
                display: flex;
                flex-direction: row;
                gap: 12px;
                align-items: center;
                flex-wrap: wrap;
            }
            
            .bonus-icon-item {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px 15px 6px 10px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 40px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            
            .bonus-icon-item:hover {
                transform: translateY(-2px) scale(1.05);
                background: rgba(0, 0, 0, 0.4);
                border-color: gold;
                box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
            }
            
            .bonus-icon-item:active {
                transform: scale(0.95);
            }
            
            .bonus-emoji {
                font-size: 1.8rem;
                filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
                line-height: 1;
            }
            
            .bonus-counter {
                font-size: 1.1rem;
                font-weight: bold;
                color: white;
                min-width: 28px;
                height: 28px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 14px;
                padding: 0 6px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
            }
            
            .no-bonus-message {
                font-size: 1.8rem;
                opacity: 0.5;
                padding: 5px 10px;
                color: #999;
            }
            
            .attempts-compact {
                display: flex;
                gap: 20px;
                font-size: 1.2rem;
                font-weight: bold;
                background: rgba(0, 0, 0, 0.3);
                padding: 6px 20px;
                border-radius: 40px;
                white-space: nowrap;
            }
            
            .attempts-team1, .attempts-team2 {
                display: flex;
                align-items: center;
                gap: 8px;
                color: white;
            }
            
            .attempts-team1 span, .attempts-team2 span {
                background: white;
                color: black;
                padding: 4px 12px;
                border-radius: 30px;
                font-weight: bold;
                min-width: 35px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
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

        @keyframes powerUpPop {
            0% { transform: translate(-50%, -50%) scale(0) rotate(-180deg); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.2) rotate(10deg); }
            100% { transform: translate(-50%, -50%) scale(1) rotate(0); opacity: 1; }
        }
        
        @keyframes powerUpFadeOut {
            0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(0); }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    // Initialiser l'interface utilisateur
    UI.init();
});