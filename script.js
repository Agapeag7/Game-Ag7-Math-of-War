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
                name: "<i class='fas fa-dumbbell'></i> DOUBLE POINTS", 
                icon: "<i class='fas fa-star'></i>",
                description: "Prochaine bonne réponse = 2 points !",
                color: "#ffd700",
                duration: 1,
                applyEffect: (game) => {
                    game.pointMultiplier = 2;
                    UI.showMessage("<i class='fas fa-dumbbell'></i> DOUBLE POINTS activé !", 'success');
                }
            },
            { 
                id: 'time_freeze',
                name: "<i class='fas fa-snowflake'></i> GEL DU TEMPS", 
                icon: "<i class='fas fa-pause'></i>",
                description: "Le chrono s'arrête pour l'adversaire (5s)",
                color: "#00cec9",
                duration: 5000,
                applyEffect: (game) => {
                    game.timeFrozen = true;
                    game.frozenUntil = Date.now() + 5000;
                    UI.showMessage("<i class='fas fa-snowflake'></i> TEMPS GELÉ pour l'adversaire !", 'info');
                    
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
                            UI.showMessage("<i class='fas fa-stopwatch'></i> Le temps reprend !", 'info');
                            
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
                id: 'rope_freeze',
                name: "<i class='fas fa-snowflake'></i> GEL DE CORDE", 
                icon: "<i class='fas fa-snowflake'></i>",
                description: "L'adversaire ne marque pas au prochain point",
                color: "#00cec9",
                duration: 1,
                applyEffect: (game) => {
                    game.ropeFrozen = true;
                    game.ropeFreezedTeam = game.activeTeam;
                    UI.showMessage("<i class='fas fa-snowflake'></i> GEL DE CORDE activé pour l'adversaire !", 'success');
                }
            },
            { 
                id: 'auto_answer',
                name: "<i class='fas fa-bolt'></i> RÉPONSE AUTO", 
                icon: "<i class='fas fa-sparkles'></i>",
                description: "La bonne réponse s'affiche !",
                color: "#fdcb6e",
                duration: 0,
                applyEffect: (game) => {
                    const currentTeam = game.activeTeam === 1 ? game.team1 : game.team2;
                    currentTeam.setAnswer(currentTeam.currentOperation.result.toString());
                    UI.updateAnswerDisplay();
                    UI.showMessage("<i class='fas fa-sparkles'></i> RÉPONSE AUTO activée !", 'success');
                }
            },
            { 
                id: 'speed_boost',
                name: "<i class='fas fa-rocket'></i> TURBO", 
                icon: "<i class='fas fa-bolt'></i>",
                description: "L'adversaire a moins de temps (50%)",
                color: "#e17055",
                duration: 10000,
                applyEffect: (game) => {
                    game.opponentTimeReduced = true;
                    game.timeReduction = 0.5;
                    game.timeReductionUntil = Date.now() + 10000;
                    UI.showMessage("<i class='fas fa-rocket'></i> TURBO activé ! L'adversaire est ralenti", 'info');
                    
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
                name: "<i class='fas fa-heart'></i> VIE EXTRA", 
                icon: "<i class='fas fa-plus'></i>",
                description: "Une chance en cas d'erreur",
                color: "#ff4757",
                duration: 1,
                applyEffect: (game) => {
                    game.extraLife = true;
                    game.extraLifeTeam = game.activeTeam;
                    UI.showMessage("<i class='fas fa-heart'></i> VIE EXTRA ! Vous pouvez vous tromper sans perdre", 'success');
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
        this.ropeFrozen = false;
        this.ropeFreezedTeam = null;
        this.extraLife = false;
        this.extraLifeTeam = null;
        this.confusionActive = false;
        this.confusionTeam = null;
        this.opponentTimeReduced = false;
        this.timeReduction = 1;
        this.timeReductionUntil = 0;
        // Effets programmés à appliquer au tour de l'adversaire
        this.pendingConfusions = []; // { target: teamNumber, ghostOp: {text,result}, originalOp }
        this.pendingTimeSteals = []; // { target: teamNumber, amount: seconds }
        this.activeGhosts = {}; // active ghost per team: { ghostOp, originalOp }
        
        // Tentatives (UNIFIÉES)
        this.attempts = { 1: 2, 2: 2 };
        this.maxAttempts = 2;

        this.bonusInventories = {
            1: {
                double_points: { count: 0, name: "<i class='fas fa-dumbbell'></i> Double points", icon: "<i class='fas fa-star'></i>", color: "#ffd700" },
                extra_attempt: { count: 0, name: "<i class='fas fa-plus'></i> Tentative sup", icon: "<i class='fas fa-plus'></i>", color: "#00cec9" },
                rope_freeze: { count: 0, name: "<i class='fas fa-snowflake'></i> Gel de corde", icon: "<i class='fas fa-snowflake'></i>", color: "#00cec9" },
                steal_attempt: { count: 0, name: "<i class='fas fa-stopwatch'></i> Vol de temps", icon: "<i class='fas fa-stopwatch'></i>", color: "#6c5ce7" },
                time_bonus: { count: 0, name: "<i class='fas fa-stopwatch'></i> Temps bonus", icon: "<i class='fas fa-stopwatch'></i>", color: "#fdcb6e" },
                confusion: { count: 0, name: "<i class='fas fa-dizzy'></i> Confusion", icon: "<i class='fas fa-dizzy'></i>", color: "#e17055" }
            },
            2: {
                double_points: { count: 0, name: "<i class='fas fa-dumbbell'></i> Double points", icon: "<i class='fas fa-star'></i>", color: "#ffd700" },
                extra_attempt: { count: 0, name: "<i class='fas fa-plus'></i> Tentative sup", icon: "<i class='fas fa-plus'></i>", color: "#00cec9" },
                rope_freeze: { count: 0, name: "<i class='fas fa-snowflake'></i> Gel de corde", icon: "<i class='fas fa-snowflake'></i>", color: "#00cec9" },
                steal_attempt: { count: 0, name: "<i class='fas fa-stopwatch'></i> Vol de temps", icon: "<i class='fas fa-stopwatch'></i>", color: "#6c5ce7" },
                time_bonus: { count: 0, name: "<i class='fas fa-stopwatch'></i> Temps bonus", icon: "<i class='fas fa-stopwatch'></i>", color: "#fdcb6e" },
                confusion: { count: 0, name: "<i class='fas fa-dizzy'></i> Confusion", icon: "<i class='fas fa-dizzy'></i>", color: "#e17055" }
            }
        };

        this.bonusTypes = [
            { id: 'double_points', name: "<i class='fas fa-dumbbell'></i> Double points", icon: "<i class='fas fa-star'></i>", description: "Double les points pour 1 tour", color: "#ffd700" },
            { id: 'extra_attempt', name: "<i class='fas fa-plus'></i> Tentative sup", icon: "<i class='fas fa-plus'></i>", description: "Gagne 1 tentative supplémentaire", color: "#00cec9" },
            { id: 'rope_freeze', name: "<i class='fas fa-snowflake'></i> Gel de corde", icon: "<i class='fas fa-snowflake'></i>", description: "Bloque le prochain point adverse", color: "#00cec9" },
            { id: 'steal_attempt', name: "<i class='fas fa-stopwatch'></i> Vol de temps", icon: "<i class='fas fa-stopwatch'></i>", description: "Réduit le temps de l'adversaire (selon la difficulté)", color: "#6c5ce7" },
            { id: 'time_bonus', name: "<i class='fas fa-stopwatch'></i> Temps bonus", icon: "<i class='fas fa-stopwatch'></i>", description: "+5 secondes au chrono", color: "#fdcb6e" },
            { id: 'confusion', name: "<i class='fas fa-dizzy'></i> Confusion", icon: "<i class='fas fa-dizzy'></i>", description: "Modifie la question de l'adversaire (même résultat)", color: "#e17055" }
        ];

        this.bonusActions = {
            double_points: (game) => {
                game.pointMultiplier = 2;
                UI.showMessage("<i class='fas fa-dumbbell'></i> Double points activé !", 'success');
            },
            extra_attempt: (game, team) => {
                game.attempts[team]++;
                UI.updateAttempts();
                UI.showMessage("<i class='fas fa-plus'></i> Tentative supplémentaire !", 'success');
            },
            rope_freeze: (game, team) => {
                game.ropeFrozen = true;
                game.ropeFreezedTeam = team;
                UI.showMessage("<i class='fas fa-snowflake'></i> Gel de corde activé !", 'success');
            },
            steal_attempt: (game, team) => {
                const opponent = team === 1 ? 2 : 1;
                if (game.attempts[opponent] > 0) {
                    game.attempts[opponent]--;
                    game.attempts[team]++;
                    UI.updateAttempts();
                    UI.showMessage(`<i class='fas fa-ghost'></i> Tentative volée à l'adversaire !`, 'success');
                }
            },
            time_bonus: (game) => {
                game.timeLeft += 5;
                UI.updateTimerDisplay();
                UI.showMessage("<i class='fas fa-stopwatch'></i> +5 secondes !", 'success');
            },
            confusion: (game, team) => {
                const opponent = team === 1 ? 2 : 1;
                if (game.attempts[opponent] > 0) {
                    game.attempts[opponent]--;
                    UI.updateAttempts();
                    UI.showMessage(`<i class='fas fa-dizzy'></i> L'adversaire perd une tentative !`, 'success');
                }
            }
        };
    }

    tryAddBonus(team) {
        if (Math.random() < 0.4) {
            const bonusTypes = [
                { id: 'double_points', name: "<i class='fas fa-dumbbell'></i> Double points", icon: "<i class='fas fa-star'></i>", color: "#ffd700" },
                { id: 'extra_attempt', name: "<i class='fas fa-plus'></i> Tentative sup", icon: "<i class='fas fa-plus'></i>", color: "#00cec9" },
                { id: 'rope_freeze', name: "<i class='fas fa-snowflake'></i> Gel de corde", icon: "<i class='fas fa-snowflake'></i>", color: "#00cec9" },
                { id: 'steal_attempt', name: "<i class='fas fa-stopwatch'></i> Vol de temps", icon: "<i class='fas fa-stopwatch'></i>", description: "Réduit le temps de l'adversaire (selon la difficulté)", color: "#6c5ce7" },
                { id: 'time_bonus', name: "<i class='fas fa-stopwatch'></i> Temps bonus", icon: "<i class='fas fa-stopwatch'></i>", color: "#fdcb6e" },
                { id: 'confusion', name: "<i class='fas fa-dizzy'></i> Confusion", icon: "<i class='fas fa-dizzy'></i>", description: "Modifie la question de l'adversaire (même résultat)", color: "#e17055" }
            ];
            const randomBonus = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
            this.bonusInventories[team][randomBonus.id].count++;
            UI.updateBonusIcons(this.bonusInventories); // transmettre les deux inventaires
            // Removed bonus obtained notification
        }
    }

    useBonus(bonusId, team, isIA = false) {
        const bonus = this.bonusInventories[team][bonusId];
        if (!bonus || bonus.count <= 0) return;

        // Tous les bonus doivent être activés pendant le tour du joueur qui les possède (sauf IA flag pour tests)
        if (!isIA) {
            const isPlayerTurn = (this.activeTeam === team);
            if (!isPlayerTurn) {
                UI.showMessage("Ce n'est pas le moment d'utiliser ce bonus !", 'warning');
                return;
            }
        }

        const opponent = team === 1 ? 2 : 1;

        switch(bonusId) {
            case 'double_points':
                this.pointMultiplier = 2;
                UI.showMessage("<i class='fas fa-dumbbell'></i> Double points activé !", 'success');
                break;

            case 'extra_attempt':
                this.attempts[team]++;
                UI.updateAttempts();
                UI.showMessage("<i class='fas fa-plus'></i> Tentative supplémentaire !", 'success');
                break;

            case 'rope_freeze':
                this.ropeFrozen = true;
                this.ropeFreezedTeam = team;
                UI.showMessage("<i class='fas fa-snowflake'></i> Gel de corde activé ! L'adversaire ne marquera pas au prochain point.", 'success');
                break;

            case 'steal_attempt': // Vol de temps
                // Programmer le vol de temps pour l'adversaire au début de son prochain tour
                // Montant proportionnel au temps alloué par niveau de difficulté (70% demandé)
                const timeLimitForDifficulty = CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit || 5;
                const stealAmount = Math.max(1, Math.round(timeLimitForDifficulty * 0.7));
                this.pendingTimeSteals.push({ target: opponent, amount: stealAmount, from: team });
                UI.showMessage(`<i class='fas fa-stopwatch'></i> Vol de temps programmé pour l'adversaire (-${stealAmount}s) !`, 'success');
                UI.showScheduledEffect(team, 'steal_attempt');
                break;

            case 'time_bonus':
                this.timeLeft += 5;
                this.updateTimerDisplay();
                UI.showMessage("<i class='fas fa-stopwatch'></i> +5 secondes !", 'success');
                break;

            case 'confusion': {
                const advTeam = opponent === 1 ? this.team1 : this.team2;
                if (advTeam.currentOperation && advTeam.currentOperation.result !== null) {
                    const originalResult = advTeam.currentOperation.result;
                    const newOp = this.generateConfusingOperation(originalResult);
                    // Ne pas remplacer l'opération réelle : stocker l'illusion pour le prochain tour de l'adversaire
                    this.pendingConfusions.push({ target: opponent, ghostOp: newOp, originalOp: { ...advTeam.currentOperation } });
                    UI.showMessage(`<i class='fas fa-dizzy'></i> Confusion programmée pour l'adversaire (illusion stockée) !`, 'success');
                    UI.showScheduledEffect(team, 'confusion');
                } else {
                    UI.showMessage("Impossible de perturber : l'adversaire n'a pas d'opération active.", 'warning');
                }
                break;
            }

            default:
                return;
        }

        bonus.count--;
        UI.updateBonusIcons(this.bonusInventories);
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
        for (let team in this.bonusInventories) {
            for (let key in this.bonusInventories[team]) {
                this.bonusInventories[team][key].count = 0;
            }
        }
        // Réinitialiser les tentatives pour les deux équipes
        this.attempts = { 1: this.maxAttempts, 2: this.maxAttempts };
        UI.updateAttempts();
        
        // Mettre à jour l'affichage
        UI.updateBonusIcons(this.bonusInventories);
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
        UI.updateBonusIcons(this.bonusInventories);
        
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

    generateConfusingOperation(originalResult) {
        // Évite les résultats négatifs ou nuls problématiques
        if (originalResult <= 0) {
            let a = this.getRandomNumber(0, 10);
            let b = originalResult - a;
            if (b < 0) { a = originalResult; b = 0; }
            return { text: `${a} + ${b}`, result: originalResult };
        }

        const op = this.getRandomNumber(0, 3); // 0:add, 1:sub, 2:mul, 3:div
        switch(op) {
            case 0: // addition
                let a = this.getRandomNumber(0, originalResult);
                let b = originalResult - a;
                return { text: `${a} + ${b}`, result: originalResult };
            case 1: // soustraction
                let bSub = this.getRandomNumber(0, 20);
                let aSub = originalResult + bSub;
                return { text: `${aSub} - ${bSub}`, result: originalResult };
            case 2: // multiplication
                let divisors = [];
                for (let i = 1; i <= originalResult; i++) {
                    if (originalResult % i === 0) divisors.push(i);
                }
                if (divisors.length > 0) {
                    let aMul = divisors[Math.floor(Math.random() * divisors.length)];
                    let bMul = originalResult / aMul;
                    return { text: `${aMul} × ${bMul}`, result: originalResult };
                }
                // fallback addition
                return { text: `0 + ${originalResult}`, result: originalResult };
            case 3: // division
                let bDiv = this.getRandomNumber(1, 10);
                let aDiv = originalResult * bDiv;
                return { text: `${aDiv} ÷ ${bDiv}`, result: originalResult };
            default:
                return { text: `${originalResult} + 0`, result: originalResult };
        }
    }

    // Dans la classe Game, remplacez startTimer()
    // reset: if true (default) set timeLeft to difficulty limit, otherwise resume from existing this.timeLeft
    startTimer(reset = true) {
        let timeLimit = CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit;
        
        // Si le temps est gelé, ne pas démarrer
        if (this.timeFrozen) {
            return;
        }

        // Appliquer réduction de temps au moment de l'initialisation seulement
        if (this.opponentTimeReduced && this.activeTeam === this.confusionTeam) {
            timeLimit = Math.floor(timeLimit * this.timeReduction);
        }

        if (reset || typeof this.timeLeft === 'undefined' || this.timeLeft <= 0) {
            this.timeLeft = timeLimit;
        }

        // maxTime représente la durée initiale pour la barre
        this.maxTime = timeLimit;
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
        
        // Removed timeout notification
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
            } else if (this.currentPowerUp.id === 'rope_freeze' && this.activeTeam === 1) {
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

            // (Les effets programmés - vol de temps - sont appliqués plus bas après l'initialisation du chrono)

            // Appliquer les confusions programmées : afficher l'opération réelle puis la fantôme
            const confForActiveIdx = this.pendingConfusions.findIndex(c => c.target === this.activeTeam);
            if (confForActiveIdx !== -1) {
                const conf = this.pendingConfusions.splice(confForActiveIdx, 1)[0];
                // L'opération réelle reste inchangée (vérification au moment de la réponse)
                // On affiche l'illusion après 1 seconde
                setTimeout(() => {
                    UI.updateQuestion(this.activeTeam, conf.ghostOp.text);
                    // Marquer le ghost comme actif (pour que l'IA puisse s'y faire piéger)
                    this.activeGhosts[this.activeTeam] = { ghostOp: conf.ghostOp, originalOp: conf.originalOp };
                    UI.showMessage('<i class="fas fa-dizzy"></i> Illusion affichée : attention à la vraie question !', 'warning');
                }, 1000);
            }

            // Si c'est le tour du joueur en mode IA, l'IA peut utiliser ses bonus "hors-tour"
            if (this.gameMode === 'pvai' && this.activeTeam === 1) {
                // Initialiser le temps avant que l'IA puisse le réduire
                let timeLimit = CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit;
                this.timeLeft = timeLimit;
                this.maxTime = this.timeLeft;
                this.updateTimerDisplay();
                UI.updateTimerBar(this.timeLeft, this.maxTime);

                // L'IA peut décider d'utiliser un bonus pendant son propre tour via tryUseBonusIA()

                // Appliquer tout vol de temps programmé ciblant l'équipe active (joueur)
                const stealsForActive = this.pendingTimeSteals.filter(s => s.target === this.activeTeam);
                if (stealsForActive.length > 0) {
                    let total = 0;
                    stealsForActive.forEach(s => { total += s.amount; });
                    this.timeLeft = Math.max(0, this.timeLeft - total);
                    UI.showMessage(`<i class="fas fa-stopwatch"></i> Vol de temps appliqué : -${total}s pour ${this.activeTeam === 1 ? this.team1.name : this.team2.name}`, 'info');
                    this.pendingTimeSteals = this.pendingTimeSteals.filter(s => s.target !== this.activeTeam);
                    this.updateTimerDisplay();
                    UI.updateTimerBar(this.timeLeft, this.maxTime);
                }

                // Démarrer le timer (en conservant la valeur ajustée)
                this.startTimer(false);
            } else {
                // Appliquer vol de temps s'il y en a (mode PVP ou autres)
                let timeLimit = CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit;
                const stealsForActive2 = this.pendingTimeSteals.filter(s => s.target === this.activeTeam);
                if (stealsForActive2.length > 0) {
                    let total = 0;
                    stealsForActive2.forEach(s => { total += s.amount; });
                    this.timeLeft = Math.max(0, timeLimit - total);
                    this.maxTime = timeLimit;
                    UI.showMessage(`<i class="fas fa-stopwatch"></i> Vol de temps appliqué : -${total}s pour ${this.activeTeam === 1 ? this.team1.name : this.team2.name}`, 'info');
                    this.pendingTimeSteals = this.pendingTimeSteals.filter(s => s.target !== this.activeTeam);
                    this.updateTimerDisplay();
                    UI.updateTimerBar(this.timeLeft, this.maxTime);
                    this.startTimer(false);
                } else {
                    this.startTimer();
                }
            }
        } else if (this.gameMode === 'pvai' && this.activeTeam === 2) {
            this.generateOperation(currentTeam);
            UI.updateQuestion(2, currentTeam.currentOperation.text);
            UI.updateQuestion(1, "L'IA réfléchit...");

            // Appliquer vol de temps et confusion ciblant l'IA (équipe 2)
            const stealsForActive2 = this.pendingTimeSteals.filter(s => s.target === 2);
            if (stealsForActive2.length > 0) {
                stealsForActive2.forEach(s => {
                    this.timeLeft = Math.max(0, (typeof this.timeLeft === 'number' && this.timeLeft > 0 ? this.timeLeft : CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit) - s.amount);
                    UI.showMessage(`<i class="fas fa-stopwatch"></i> Vol de temps appliqué : -${s.amount}s pour l'IA`, 'info');
                });
                this.pendingTimeSteals = this.pendingTimeSteals.filter(s => s.target !== 2);
                this.updateTimerDisplay();
                UI.updateTimerBar(this.timeLeft, this.maxTime || CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit);
            }

            const confForIAIdx = this.pendingConfusions.findIndex(c => c.target === 2);
            if (confForIAIdx !== -1) {
                const conf = this.pendingConfusions.splice(confForIAIdx, 1)[0];
                setTimeout(() => {
                    UI.updateQuestion(2, conf.ghostOp.text);
                    this.activeGhosts[2] = { ghostOp: conf.ghostOp, originalOp: conf.originalOp };
                    UI.showMessage('<i class="fas fa-dizzy"></i> Illusion affichée pour l\'IA (ne change pas la vraie réponse)', 'warning');
                }, 1000);
            }
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
            UI.showMessage("Bonne réponse ! <i class='fas fa-check-circle'></i>", 'success');
            
            // Jouer un son (optionnel)
            UI.playSound('correct');
            
            // Récompenser avec un bonus (40%)
            this.tryAddBonus(this.activeTeam);
            
            // Déplacer la corde (avec multiplicateur) SAUF si elle est gelée pour cette équipe
            if (this.ropeFrozen && this.ropeFreezedTeam !== this.activeTeam) {
                // L'adversaire a activé le gel contre nous : la corde ne bouge pas
                UI.showMessage("<i class='fas fa-snowflake'></i> La corde est gelée ! Vos points ne comptent pas cette fois.", 'warning');
                this.ropeFrozen = false;
                this.ropeFreezedTeam = null;
            } else {
                // Corde libre, déplacer normalement
                const points = this.pointMultiplier || 1;
                for (let i = 0; i < points; i++) {
                    this.moveRope(this.activeTeam);
                }
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
            // Le gel de corde empêche de marquer au prochain point correct (c'est l'équipe active qui l'active)
            // Il n'est pas annulé ici, il est utilisé dans moveRope si l'équipe adverse l'a activé contre nous
            
            // Vérification de la vie extra
            if (this.extraLife && this.extraLifeTeam === this.activeTeam) {
                this.extraLife = false;
                UI.showMessage("<i class='fas fa-heart'></i> Vie extra utilisée !", 'success');
                this.waitingForAnswer = false;
                currentTeam.clearAnswer();
                UI.clearAnswerDisplay();
                this.startTimer(false);
                return;
            }
            
            // Décrémenter les tentatives
            this.attempts[this.activeTeam]--;
            UI.updateAttempts();
            
            // Removed error notification
            
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
                            this.startTimer(false);
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
            UI.showMessage(`${this.team1.name} remporte la manche ! <i class="fas fa-trophy"></i>`, 'success');
        } else {
            this.team2.winRound();
            UI.showMessage(`${this.gameMode === 'pvai' ? 'IA' : this.team2.name} remporte la manche ! <i class="fas fa-trophy"></i>`, 'success');
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

        // L'IA peut utiliser un bonus avant de réfléchir
        this.tryUseBonusIA();
        
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
        // Si une illusion active existe pour l'IA, il y a une chance qu'elle réponde selon l'illusion (se faire piéger)
        const activeGhost = this.activeGhosts[2];
        let fallenForGhost = false;
        if (activeGhost) {
            // chance de se faire piéger décroissante selon la difficulté
            const baseChance = 0.7 - ((this.currentDifficulty - 1) * 0.05);
            const ghostFallChance = Math.max(0.2, Math.min(0.9, baseChance));
            if (Math.random() < ghostFallChance) {
                fallenForGhost = true;
            }
        }

        const shouldBeWrong = Math.random() < CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].aiErrorRate;

        if (fallenForGhost) {
            // L'IA répond selon la question fantôme (généralement incorrecte)
            const ghostAnswer = activeGhost.ghostOp.result;
            currentTeam.setAnswer(ghostAnswer.toString());
            // Removed IA error notification
            // L'IA utilise une tentative
            this.attempts[2]--;
            UI.updateAttempts();

            // Nettoyer le ghost actif
            delete this.activeGhosts[2];

            if (this.attempts[2] > 0) {
                setTimeout(() => {
                    this.waitingForAnswer = false;
                    currentTeam.clearAnswer();
                    UI.clearAnswerDisplay();
                    this.startIA();
                }, CONFIG.ANIMATION_DURATION);
            } else {
                // Plus de tentatives
                this.moveRope(1);
                this.attempts[2] = this.maxAttempts;
                this.switchTeam();
                this.prepareNextTurn();
            }
            return;
        }

        if (shouldBeWrong) {
            // L'IA fait une erreur
            const wrongAnswer = currentTeam.currentOperation.result + Math.floor(Math.random() * 5) + 1;
            currentTeam.setAnswer(wrongAnswer.toString());
            // Removed IA error notification
            
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
            // Removed IA success notification
            // Nettoyer un éventuel ghost (si présent mais non tombé)
            if (this.activeGhosts[2]) delete this.activeGhosts[2];
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
        this.startTimer(false);
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
        const testBonus = { id: 'double_points', name: "<i class='fas fa-dumbbell'></i> Double points", icon: "<i class='fas fa-star'></i>", color: "#ffd700" };
        this.bonusInventories[this.activeTeam][testBonus.id].count++;
        UI.updateBonusIcons(this.bonusInventories);
        UI.showMessage(`<i class="fas fa-sparkles"></i> Bonus de test ajouté !`, 'success');
    }

    tryUseBonusIA() {
        // L'IA (team 2) examine son inventaire et choisit un bonus de manière heuristique
        const inventory = this.bonusInventories[2];
        const available = Object.entries(inventory).filter(([id, b]) => b.count > 0);
        if (available.length === 0) return;

        // Scoring des bonus selon contexte
        const scores = available.map(([id, b]) => {
            let score = 0;
            // Favoriser double points si l'IA est susceptible de répondre correctement or proche de gagner
            if (id === 'double_points') {
                const willBeCorrect = Math.random() >= CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].aiErrorRate;
                if (willBeCorrect) score += 30;
                if (Math.abs(this.ropePosition) >= CONFIG.ROPE_STEPS - 2 && this.ropePosition > 0) score += 40; // push to win
            }
            if (id === 'extra_attempt') {
                if (this.attempts[2] <= 1) score += 40;
                else score += 5;
            }
            if (id === 'rope_freeze') {
                // Utile quand le joueur est sur le point de gagner ou est en bonne position
                if (Math.abs(this.ropePosition) >= CONFIG.ROPE_STEPS - 3 && this.ropePosition < 0) score += 50; // joueur en danger
                else score += 25; // sinon, modérément utile
            }
            if (id === 'steal_attempt') {
                // Useful if opponent has time remaining
                const oppTime = typeof this.timeLeft === 'number' && this.activeTeam === 1 ? this.timeLeft : (CONFIG.DIFFICULTY_SETTINGS[this.currentDifficulty].timeLimit);
                if (oppTime > 5) score += 25;
            }
            if (id === 'time_bonus') {
                if (this.timeLeft <= 5) score += 20;
            }
            if (id === 'confusion') {
                // Useful if opponent has an operation and some time/attempts
                const opp = this.team1;
                if (opp.currentOperation && opp.currentOperation.result !== null) {
                    score += 25;
                    if (this.attempts[1] >= 2) score += 10;
                }
            }

            // Small randomness
            score += Math.random() * 10;
            return { id, score };
        });

        // Choisir le meilleur score (probabilistic choice)
        scores.sort((a,b) => b.score - a.score);
        const chosen = scores[0].id;
        // Utiliser le bonus choisi
        this.useBonus(chosen, 2, true);
    }

    AIUseOutOfTurnBonuses() {
        // L'IA (team 2) peut utiliser confusion ou vol de temps pendant le tour du joueur
        const inventory = this.bonusInventories[2];
        const outOfTurnBonuses = ['confusion', 'steal_attempt'];
        const available = outOfTurnBonuses.filter(id => inventory[id].count > 0);
        if (available.length === 0) return;

        // Probabilité de 50% d'utiliser un bonus si disponible
        if (Math.random() < 0.5) {
            const bonusId = available[Math.floor(Math.random() * available.length)];
            this.useBonus(bonusId, 2, true); // isIA = true
        }
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

    static isMobile() {
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
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
        // Sur mobile, ne montrer que les messages "Bonne réponse"
        if (this.isMobile() && !text.includes('Bonne réponse')) {
            return;
        }
        
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

        // Afficher ou cacher les panneaux de bonus selon l'écran
        const isGameScreen = (screenName === 'game');
        if (this.bonusLeft) this.bonusLeft.style.display = isGameScreen ? 'flex' : 'none';
        if (this.bonusRight) this.bonusRight.style.display = isGameScreen ? 'flex' : 'none';
        // Ne rien faire pour attemptsContainer – il est dans l'écran de jeu
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
            // Removed turn notification
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
        
        // Update rope visual split (gradient) based on position
        this.updateRopeGradient(position, maxSteps);
        this.updateRopeTension(position, maxSteps);
        this.animateTeamIndicators(position);
        this.updateRopeCharacters(position, maxSteps);
        
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

    static updateRopeGradient(position, maxSteps) {
        const ropeEl = document.querySelector('.rope');
        if (!ropeEl) return;

        // Split percent moves with position. Clamp between 10% and 90% for visual balance
        const raw = 50 + (position / maxSteps) * 40; // range ~10..90
        const split = Math.max(10, Math.min(90, raw));

        const leftColor = getComputedStyle(document.documentElement).getPropertyValue('--team1-color') || '#ff4757';
        const rightColor = getComputedStyle(document.documentElement).getPropertyValue('--team2-color') || '#1e90ff';

        ropeEl.style.transition = 'background 0.45s ease';
        ropeEl.style.background = `linear-gradient(90deg, ${leftColor} 0%, ${leftColor} ${split}%, ${rightColor} ${split}%, ${rightColor} 100%)`;
    }

    static updateRopeCharacters(position, maxSteps) {
        // Animate decorative puller icons slightly based on rope position
        const left = document.querySelector('.left-puller');
        const right = document.querySelector('.right-puller');
        if (!left || !right) return;

        const strength = Math.max(-1, Math.min(1, position / maxSteps));
        // left moves left when position negative (team1 advantage), right moves opposite
        const leftOffset = Math.round(-strength * 12); // px
        const rightOffset = Math.round(-strength * -12);

        left.style.transform = `translateY(-50%) translateX(${leftOffset}px) rotate(${leftOffset/2}deg)`;
        right.style.transform = `translateY(-50%) translateX(${rightOffset}px) rotate(${rightOffset/2}deg)`;

        // Add a small pull visual when strong
        if (Math.abs(position) > maxSteps * 0.6) {
            left.classList.add('pull-strong');
            right.classList.add('pull-strong');
        } else {
            left.classList.remove('pull-strong');
            right.classList.remove('pull-strong');
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

    // Affiche un petit message localisé lorsqu'un effet est programmé pour l'adversaire
    static showScheduledEffect(team, effectId) {
        const container = document.createElement('div');
        container.className = 'scheduled-effect-toast';
        const isLeft = team === 1;
        const icon = effectId === 'confusion' ? "<i class='fas fa-dizzy'></i>" : "<i class='fas fa-stopwatch'></i>";
        const label = effectId === 'confusion' ? 'Illusion programmée' : 'Vol de temps programmé';

        container.innerHTML = `
            <div style="font-size:1.2rem; margin-right:8px;">${icon}</div>
            <div style="font-size:0.95rem;">${label}</div>
        `;

        container.style.cssText = `
            position: fixed;
            top: 120px;
            ${isLeft ? 'left: 10px;' : 'right: 10px;'}
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 10px 14px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 3000;
            box-shadow: 0 8px 20px rgba(0,0,0,0.4);
            opacity: 0;
            transform: translateY(-6px);
            transition: all 220ms ease;
        `;

        document.body.appendChild(container);
        // animate in
        requestAnimationFrame(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            container.style.opacity = '0';
            container.style.transform = 'translateY(-6px)';
            setTimeout(() => container.remove(), 220);
        }, 2200);
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
        if (game.pointMultiplier > 1) activePowerUps.push("<i class='fas fa-dumbbell'></i> Double points");
        if (game.timeFrozen) activePowerUps.push("<i class='fas fa-snowflake'></i> Temps gelé");
        if (game.ropeFrozen) activePowerUps.push("<i class='fas fa-snowflake'></i> Gel de corde");
        if (game.extraLife) activePowerUps.push("<i class='fas fa-heart'></i> Vie extra");
        if (game.opponentTimeReduced) activePowerUps.push("<i class='fas fa-rocket'></i> Turbo actif");
        
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
        // Créer le panneau gauche pour l'équipe 1 (s'il n'existe pas)
        if (!document.getElementById('bonus-left')) {
            const leftBonus = document.createElement('div');
            leftBonus.id = 'bonus-left';
            leftBonus.className = 'bonus-side left';
            leftBonus.dataset.team = 'Équipe Rouge';
            leftBonus.style.display = 'none'; // Caché par défaut
            document.body.appendChild(leftBonus);
            this.bonusLeft = leftBonus;
        }
        // Créer le panneau droit pour l'équipe 2 (s'il n'existe pas)
        if (!document.getElementById('bonus-right')) {
            const rightBonus = document.createElement('div');
            rightBonus.id = 'bonus-right';
            rightBonus.className = 'bonus-side right';
            rightBonus.dataset.team = 'Équipe Bleue';
            rightBonus.style.display = 'none';
            document.body.appendChild(rightBonus);
            this.bonusRight = rightBonus;
        }

        // NE PAS créer attempts-display – on utilise le HTML existant
        // On garde une référence vers le conteneur des tentatives si besoin (optionnel)
        this.attemptsContainer = document.querySelector('.attempts-compact');
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

    static updateBonusIcons(inventories) {
        const leftContainer = document.getElementById('bonus-left');
        const rightContainer = document.getElementById('bonus-right');
        if (leftContainer) this.renderBonusIconsForTeam(leftContainer, inventories[1], 1);
        if (rightContainer) this.renderBonusIconsForTeam(rightContainer, inventories[2], 2);
    }

    static renderBonusIconsForTeam(container, inventory, team) {
        if (!container) return;
        const activeBonuses = Object.entries(inventory).filter(([_, bonus]) => bonus.count > 0);
        
        if (activeBonuses.length === 0) {
            container.innerHTML = '<span class="no-bonus-message"><i class="fas fa-gift"></i></span>';
            const parentEmpty = container.closest('.bonus-side');
            if (parentEmpty) {
                parentEmpty.classList.remove('expanded');
                parentEmpty.classList.remove('visible');
            }
            return;
        }
        
        container.innerHTML = activeBonuses.map(([id, bonus]) => `
            <div class="bonus-icon-item" data-bonus-id="${id}" data-team="${team}" title="${bonus.name} - Cliquez pour activer">
                <span class="bonus-emoji" style="color: ${bonus.color};">${bonus.icon}</span>
                <span class="bonus-counter" style="background: ${bonus.color};">${bonus.count}</span>
            </div>
        `).join('');
        // Show the side panel only when there are bonuses; expand if many
        const parentPanel = container.closest('.bonus-side');
        if (parentPanel) {
            parentPanel.classList.add('visible');
            if (activeBonuses.length > 3) parentPanel.classList.add('expanded');
            else parentPanel.classList.remove('expanded');
        }
        
        container.querySelectorAll('.bonus-icon-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const bonusId = item.dataset.bonusId;
                const teamId = parseInt(item.dataset.team);
                if (game) {
                    game.useBonus(bonusId, teamId);  // On transmet l'équipe
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
                flex-wrap: wrap;
                gap: 15px;
            }

            .bonus-section {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: rgba(0, 0, 0, 0.2);
                padding: 5px 15px;
                border-radius: 40px;
                min-width: 150px;
            }

            .team1-bonus {
                border-left: 4px solid var(--team1-color);
            }

            .team2-bonus {
                border-left: 4px solid var(--team2-color);
            }

            .bonus-label {
                font-size: 0.9rem;
                font-weight: bold;
                color: white;
                margin-bottom: 5px;
            }
            
            .bonus-icons {
                display: flex;
                flex-direction: row;
                gap: 8px;
                align-items: center;
                flex-wrap: wrap;
                justify-content: center;
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
            
            .bonus-emoji { font-size: 1.8rem; }
            
            .bonus-counter {
                background: gold;
                color: black;
                font-weight: bold;
                padding: 2px 8px;
                border-radius: 20px;
                margin-left: auto;
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
                padding: 5px 15px;
                border-radius: 30px;
                margin-left: 8px;
            }

            .game-container {
                position: relative !important;
            }

            .bonus-side {
                position: fixed;
                top: 120px;
                width: 160px;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                border-radius: 15px;
                padding: 15px 10px;
                border: 2px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                color: white;
            }

            .bonus-side.left { left: 10px; }
            .bonus-side.right { right: 10px; }

            .bonus-side::before {
                content: none; /* Supprime le nom de l'équipe */
            }

            .bonus-side .bonus-icons {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .bonus-side .bonus-icon-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                background: rgba(255,255,255,0.1);
                border-radius: 30px;
                cursor: pointer;
                transition: all 0.2s;
                border: 2px solid transparent;
            }

            .bonus-side .bonus-icon-item:hover {
                transform: translateX(5px);
                background: rgba(255,255,255,0.2);
                border-color: gold;
            }

            .attempts-display {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.6);
                backdrop-filter: blur(5px);
                padding: 10px 30px;
                border-radius: 50px;
                display: flex;
                gap: 40px;
                font-size: 1.5rem;
                font-weight: bold;
                color: white;
                border: 2px solid rgba(255,255,255,0.2);
                z-index: 1000;
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