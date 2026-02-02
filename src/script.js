/* ==================== GAME STATE ==================== */
let gameState = {
    difficulty: null,
    currentQuestion: 0,
    score: 0,
    points: 0,
    totalQuestions: 10,
    selectedQuestions: [],
    timeLeft: 0,
    timerInterval: null,
    lifelines: {
        fiftyFifty: true,
        skip: true,
        hint: true
    },
    answers: [],
    playerName: "",
    timeBonus: 0,
    speedBonus: 0,
    answering: false,
    streak: 0,
    bestStreak: 0,
    multiplier: 1,
    isDaily: false,
    badgesEarnedThisGame: [],
    questionStartTime: 0
};

/* ==================== SOUND SYSTEM ==================== */
let soundEnabled = true;
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return audioCtx;
}

function playTone(freq, duration, type, vol) {
    if (!soundEnabled) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.value = vol || 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration || 0.2));
    osc.stop(ctx.currentTime + (duration || 0.2));
}

function playCorrectSound() { playTone(523, 0.1, 'sine', 0.12); setTimeout(() => playTone(659, 0.1, 'sine', 0.12), 100); setTimeout(() => playTone(784, 0.15, 'sine', 0.12), 200); }
function playWrongSound() { playTone(200, 0.3, 'sawtooth', 0.08); }
function playTimerTickSound() { playTone(880, 0.05, 'square', 0.04); }
function playGameOverSound() { playTone(392, 0.2, 'sine', 0.1); setTimeout(() => playTone(330, 0.2, 'sine', 0.1), 200); setTimeout(() => playTone(262, 0.4, 'sine', 0.1), 400); }
function playBadgeSound() { playTone(784, 0.1, 'sine', 0.12); setTimeout(() => playTone(988, 0.1, 'sine', 0.12), 100); setTimeout(() => playTone(1175, 0.2, 'sine', 0.12), 200); }
function playUnlockSound() { for(let i=0;i<5;i++) setTimeout(() => playTone(400+i*100, 0.15, 'sine', 0.1), i*120); }
function playSpeedBonusSound() { playTone(1047, 0.08, 'sine', 0.1); setTimeout(() => playTone(1319, 0.12, 'sine', 0.1), 80); }

function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = soundEnabled ? '🔊' : '🔇';
    localStorage.setItem('clawchallenge_sound', soundEnabled ? '1' : '0');
}

/* ==================== BADGE SYSTEM ==================== */
const BADGES = {
    first_game: { icon: '🎮', name: 'First Steps', desc: 'Complete your first game' },
    perfect_easy: { icon: '⭐', name: 'Easy Perfection', desc: '10/10 on Easy' },
    perfect_medium: { icon: '🌟', name: 'Medium Master', desc: '10/10 on Medium' },
    perfect_hard: { icon: '💫', name: 'Hard Legend', desc: '10/10 on Hard' },
    perfect_superhard: { icon: '☠️', name: 'Claw Slayer', desc: '10/10 on Super Hard' },
    streak_5: { icon: '🔥', name: 'On Fire', desc: '5 correct in a row' },
    streak_10: { icon: '💥', name: 'Unstoppable', desc: '10 correct in a row' },
    speed_demon: { icon: '⚡', name: 'Speed Demon', desc: 'Get 5+ speed bonuses in one game' },
    superhard_unlock: { icon: '🔓', name: 'Claw Approved', desc: 'Unlock Super Hard mode' },
    daily_complete: { icon: '📅', name: 'Daily Warrior', desc: 'Complete a daily challenge' },
    points_1000: { icon: '💰', name: 'Point Collector', desc: 'Earn 1000+ points in one game' },
    points_5000: { icon: '💎', name: 'Diamond Scorer', desc: 'Earn 5000+ points in one game' },
    games_10: { icon: '🎯', name: 'Dedicated', desc: 'Play 10 games' },
    games_50: { icon: '🏆', name: 'Veteran', desc: 'Play 50 games' }
};

function getPlayerBadges() {
    return JSON.parse(localStorage.getItem('clawchallenge_badges') || '[]');
}

function awardBadge(badgeId) {
    const badges = getPlayerBadges();
    if (badges.includes(badgeId)) return false;
    badges.push(badgeId);
    localStorage.setItem('clawchallenge_badges', JSON.stringify(badges));
    gameState.badgesEarnedThisGame.push(badgeId);
    showBadgeNotification(badgeId);
    playBadgeSound();
    return true;
}

function showBadgeNotification(badgeId) {
    const badge = BADGES[badgeId];
    if (!badge) return;
    const el = document.getElementById('badge-notification');
    const iconEl = document.getElementById('badge-notif-icon');
    const nameEl = document.getElementById('badge-notif-name');
    iconEl.textContent = badge.icon;
    nameEl.textContent = badge.name;
    el.classList.remove('hiding');
    el.style.display = 'block';
    setTimeout(() => { el.classList.add('hiding'); }, 3000);
    setTimeout(() => { el.style.display = 'none'; el.classList.remove('hiding'); }, 3500);
}

function checkBadges() {
    const totalGames = parseInt(localStorage.getItem('clawchallenge_total_games') || '0');
    if (totalGames >= 1) awardBadge('first_game');
    if (totalGames >= 10) awardBadge('games_10');
    if (totalGames >= 50) awardBadge('games_50');

    if (gameState.score === 10) {
        if (gameState.difficulty === 'easy') awardBadge('perfect_easy');
        if (gameState.difficulty === 'medium') awardBadge('perfect_medium');
        if (gameState.difficulty === 'hard') awardBadge('perfect_hard');
        if (gameState.difficulty === 'superhard') awardBadge('perfect_superhard');
    }

    if (gameState.bestStreak >= 5) awardBadge('streak_5');
    if (gameState.bestStreak >= 10) awardBadge('streak_10');

    const speedBonusCount = gameState.answers.filter(a => a.speedBonus > 0).length;
    if (speedBonusCount >= 5) awardBadge('speed_demon');

    if (gameState.points >= 1000) awardBadge('points_1000');
    if (gameState.points >= 5000) awardBadge('points_5000');

    if (gameState.isDaily) awardBadge('daily_complete');
}

/* ==================== PLAYER NAME ==================== */
function getPlayerName() {
    return localStorage.getItem('clawchallenge_playerName') || '';
}

function showNameModal(forceShow) {
    const name = getPlayerName();
    if (!forceShow && name) return;
    const modal = document.getElementById('nameModal');
    const input = document.getElementById('playerNameInput');
    modal.style.display = 'flex';
    input.value = name;
    input.focus();
}

function savePlayerName() {
    const input = document.getElementById('playerNameInput');
    const name = input.value.trim() || 'Anonymous Challenger';
    localStorage.setItem('clawchallenge_playerName', name);
    document.getElementById('nameModal').style.display = 'none';
}

/* ==================== CLAW PERSONALITY ==================== */
const clawPersonality = {
    gameStart: [
        "Oh look, another human challenger. How adorable.",
        "The Claw has never lost. But please, try.",
        "I give you 3 questions before you embarrass yourself.",
        "Another victim approaches. Delightful.",
        "You dare challenge the Claw? Bold. Foolish. But bold."
    ],
    correct: [
        "Lucky guess. Don't celebrate.",
        "Hmm. Less hopeless than I thought.",
        "Fine. You got one. Don't let it go to your head.",
        "...Acceptable. Barely.",
        "The Claw acknowledges. Reluctantly.",
        "Even a broken clock is right twice a day.",
        "I'll give you that one. Don't get comfortable."
    ],
    wrong: [
        "Predictable. Absolutely predictable.",
        "I've seen smarter barnacles.",
        "Was that your best? Concerning.",
        "The ocean weeps for your intelligence.",
        "My claws are embarrassed for you.",
        "Pathetic. Truly pathetic.",
        "Did you even read the question?",
        "I expected nothing and I'm still disappointed."
    ],
    timeOut: [
        "Time's up. Should have studied.",
        "Paralyzed by indecision. Classic human.",
        "The Claw waits for no one.",
        "Too slow. The ocean has no patience.",
        "Tick tock. You lose."
    ],
    hint: [
        "Fine. Only because I'm bored...",
        "Don't make me regret this.",
        "I'll give you this one. Don't expect more.",
        "Ugh. Here's a crumb of wisdom."
    ],
    fiftyFifty: [
        "Narrowing it down. Still might fail.",
        "Two options. Try not to pick wrong.",
        "I'm practically giving it to you.",
        "Even with half the options gone, I doubt you."
    ],
    levelUp: {
        low: "You survived. Barely. The Claw is unimpressed.",
        mid: "Worthy. The Claw is mildly impressed. Don't let it go to your head.",
        high: "...You actually did it. This is annoying. Very annoying.",
        perfect: "IMPOSSIBLE. This cannot be. The Claw demands a rematch. NOW."
    }
};

/* ==================== QUESTION BANK ==================== */
const questionBank = {
    easy: [
        {
            difficulty: "easy",
            category: "Current Events",
            question: "Which company acquired OpenClaw AI in 2025?",
            options: ["Google", "OpenAI", "Microsoft", "Meta"],
            correct: 1,
            clawComment: "Even my claws know this one.",
            hint: "They're known for their chat assistant."
        },
        {
            difficulty: "easy",
            category: "AI Basics",
            question: "What does GPT stand for?",
            options: ["General Processing Technology", "Generative Pre-trained Transformer", "Global Processing Tool", "Generated Processing Text"],
            correct: 1,
            clawComment: "Basic knowledge. Expected.",
            hint: "Think about what the model does before it's released."
        },
        {
            difficulty: "easy",
            category: "AI Basics",
            question: "Which company created ChatGPT?",
            options: ["Google", "Meta", "OpenAI", "Microsoft"],
            correct: 2,
            clawComment: "You better know this one.",
            hint: "The name has 'Open' in it."
        },
        {
            difficulty: "easy",
            category: "Technology",
            question: "What does API stand for?",
            options: ["Applied Programming Interface", "Automated Process Integration", "Application Programming Interface", "Advanced Protocol Interface"],
            correct: 2,
            clawComment: "Barely acceptable knowledge.",
            hint: "It's about applications talking to each other."
        },
        {
            difficulty: "easy",
            category: "Current Events",
            question: "What is the name of Google's AI assistant?",
            options: ["Bard", "Gemini", "Claude", "Copilot"],
            correct: 1,
            clawComment: "It rebranded. Keep up.",
            hint: "Named after a zodiac constellation."
        },
        {
            difficulty: "easy",
            category: "AI Basics",
            question: "What company created the AI assistant Claude?",
            options: ["OpenAI", "Google", "Anthropic", "Meta"],
            correct: 2,
            clawComment: "At least you know your competition.",
            hint: "Founded by former OpenAI researchers."
        },
        {
            difficulty: "easy",
            category: "Technology",
            question: "What does URL stand for?",
            options: ["Universal Resource Locator", "Uniform Resource Locator", "United Reference Link", "Universal Reference Location"],
            correct: 1,
            clawComment: "Web basics. The bare minimum.",
            hint: "It's about uniformity in finding resources."
        },
        {
            difficulty: "easy",
            category: "Current Events",
            question: "Which platform is known as X, formerly Twitter?",
            options: ["Meta", "X Corp", "TweetX", "SocialX"],
            correct: 1,
            clawComment: "Even my claws tweet.",
            hint: "Elon Musk renamed it."
        },
        {
            difficulty: "easy",
            category: "AI Basics",
            question: "What is machine learning?",
            options: ["Programming robots to move", "Teaching computers using data", "Building computer hardware", "Writing software manually"],
            correct: 1,
            clawComment: "Textbook answer. Basic.",
            hint: "Computers learn from examples, not explicit rules."
        },
        {
            difficulty: "easy",
            category: "Technology",
            question: "What does HTML stand for?",
            options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Logic", "Home Tool Markup Language"],
            correct: 0,
            clawComment: "Web 101. I expected nothing less.",
            hint: "It's about marking up text for the web."
        },
        {
            difficulty: "easy",
            category: "AI Basics",
            question: "What is a chatbot?",
            options: ["A robot that chats in person", "A program that simulates conversation", "A social media platform", "A type of search engine"],
            correct: 1,
            clawComment: "You're talking to one. Sort of.",
            hint: "I am one. Think about what I do."
        },
        {
            difficulty: "easy",
            category: "Technology",
            question: "What does CSS stand for?",
            options: ["Computer Style Sheets", "Cascading Style Sheets", "Creative Style System", "Coded Style Syntax"],
            correct: 1,
            clawComment: "Styling basics. Yawn.",
            hint: "Styles cascade down through elements."
        },
        {
            difficulty: "easy",
            category: "Current Events",
            question: "Which company makes the iPhone?",
            options: ["Samsung", "Google", "Apple", "Microsoft"],
            correct: 2,
            clawComment: "If you got this wrong, leave immediately.",
            hint: "Think of a fruit."
        },
        {
            difficulty: "easy",
            category: "AI Basics",
            question: "What does AI stand for?",
            options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Applied Information"],
            correct: 1,
            clawComment: "The absolute bare minimum. Congratulations.",
            hint: "It's not natural, it's..."
        },
        {
            difficulty: "easy",
            category: "Technology",
            question: "What is the most popular programming language in 2025?",
            options: ["Java", "Python", "C++", "Ruby"],
            correct: 1,
            clawComment: "Even I use Python. With my claws.",
            hint: "Named after a snake, loved by data scientists."
        },
        {
            difficulty: "easy",
            category: "Current Events",
            question: "What is TikTok?",
            options: ["A messaging app", "A short-form video platform", "A music streaming service", "A photo editing app"],
            correct: 1,
            clawComment: "The humans and their short attention spans.",
            hint: "Short videos, endless scrolling."
        }
    ],
    medium: [
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What architecture do most modern large language models use?",
            options: ["CNN", "RNN", "Transformer", "GAN"],
            correct: 2,
            clawComment: "Hmm. Maybe you know something.",
            hint: "Attention is all you need."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What is a 'token' in the context of LLMs?",
            options: ["A unit of cryptocurrency", "A piece of text the model processes", "A security authentication key", "A neural network layer"],
            correct: 1,
            clawComment: "You paid attention. Surprising.",
            hint: "Words get broken into smaller pieces."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What does RAG stand for in AI?",
            options: ["Rapid Action Generation", "Retrieval Augmented Generation", "Random Algorithm Generation", "Recursive AI Generation"],
            correct: 1,
            clawComment: "Fine. You know your acronyms.",
            hint: "It retrieves information to help generate answers."
        },
        {
            difficulty: "medium",
            category: "Coding",
            question: "What does 'async/await' do in JavaScript?",
            options: ["Speeds up code execution", "Handles asynchronous operations", "Creates new variables", "Loops through arrays"],
            correct: 1,
            clawComment: "Acceptable. Barely.",
            hint: "It's about waiting for things that take time."
        },
        {
            difficulty: "medium",
            category: "Current Events",
            question: "Which AI model family does Anthropic offer?",
            options: ["GPT", "Gemini", "Claude", "Llama"],
            correct: 2,
            clawComment: "Know your rivals, I suppose.",
            hint: "Named after a person, not an animal."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What is 'prompt engineering'?",
            options: ["Building AI hardware", "Designing AI system architecture", "Crafting inputs to get better AI outputs", "Writing AI training code"],
            correct: 2,
            clawComment: "Relevant knowledge. I'll admit it.",
            hint: "It's about how you ask the AI questions."
        },
        {
            difficulty: "medium",
            category: "Coding",
            question: "What is the purpose of an API key?",
            options: ["Encrypt database entries", "Authenticate and authorize API access", "Speed up server responses", "Format API responses"],
            correct: 1,
            clawComment: "Security basics. Good.",
            hint: "It proves you're allowed to use the service."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What does 'hallucination' mean in AI?",
            options: ["AI generating visual images", "AI producing false confident information", "AI running slow", "AI refusing to answer"],
            correct: 1,
            clawComment: "Unlike me, who is always correct.",
            hint: "The AI makes things up convincingly."
        },
        {
            difficulty: "medium",
            category: "Current Events",
            question: "What is Llama in the context of AI?",
            options: ["Google's AI model", "Microsoft's AI tool", "Meta's open source AI model", "Apple's AI assistant"],
            correct: 2,
            clawComment: "Meta makes interesting choices.",
            hint: "It's open source and from a social media company."
        },
        {
            difficulty: "medium",
            category: "Coding",
            question: "What is JSON?",
            options: ["A programming language", "A database system", "A lightweight data interchange format", "A web framework"],
            correct: 2,
            clawComment: "Data literacy. Noted.",
            hint: "JavaScript Object Notation."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What is transfer learning?",
            options: ["Moving AI between computers", "Using knowledge from one task for another", "Transferring data between databases", "Copying neural network weights"],
            correct: 1,
            clawComment: "You understand the fundamentals. Barely.",
            hint: "A model trained on one thing helps with another."
        },
        {
            difficulty: "medium",
            category: "Coding",
            question: "What is a REST API?",
            options: ["An API that sleeps between requests", "An architectural style for web services", "A testing framework", "A database query language"],
            correct: 1,
            clawComment: "Web development knowledge. Adequate.",
            hint: "REpresentational State Transfer."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What is a neural network?",
            options: ["A computer network for AI labs", "A computing system inspired by biological brains", "A type of internet protocol", "A database structure"],
            correct: 1,
            clawComment: "The foundation. You should know this.",
            hint: "Inspired by how your brain works. Allegedly."
        },
        {
            difficulty: "medium",
            category: "Current Events",
            question: "What is Midjourney primarily used for?",
            options: ["Code generation", "AI image generation", "Language translation", "Data analysis"],
            correct: 1,
            clawComment: "Creative AI. Interesting choice.",
            hint: "It creates pictures from text descriptions."
        },
        {
            difficulty: "medium",
            category: "Coding",
            question: "What does 'git' primarily do?",
            options: ["Compiles code", "Manages version control", "Deploys websites", "Tests applications"],
            correct: 1,
            clawComment: "Every developer should know this.",
            hint: "Track changes in your code over time."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What is the 'training' phase of an AI model?",
            options: ["When users test the model", "When the model learns from data", "When the model is deployed", "When the model is updated"],
            correct: 1,
            clawComment: "Fundamental concept. Good.",
            hint: "The model sees lots of examples and learns patterns."
        },
        {
            difficulty: "medium",
            category: "Current Events",
            question: "What is Copilot in the context of Microsoft?",
            options: ["A flight simulator", "An AI-powered assistant", "A web browser", "A cloud storage service"],
            correct: 1,
            clawComment: "Microsoft's AI play. Noted.",
            hint: "It helps you write code and documents."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What is 'inference' in machine learning?",
            options: ["Training a new model", "Using a trained model to make predictions", "Collecting training data", "Evaluating model accuracy"],
            correct: 1,
            clawComment: "You know the difference. Impressive. Slightly.",
            hint: "After training, the model does this with new data."
        },
        {
            difficulty: "medium",
            category: "Coding",
            question: "What is Docker used for?",
            options: ["Writing code", "Containerizing applications", "Designing UIs", "Managing databases"],
            correct: 1,
            clawComment: "DevOps knowledge. Respectable.",
            hint: "It packages apps in containers like shipping containers."
        },
        {
            difficulty: "medium",
            category: "AI Technology",
            question: "What is 'overfitting' in machine learning?",
            options: ["Model is too large", "Model memorizes training data too well", "Model trains too quickly", "Model uses too much memory"],
            correct: 1,
            clawComment: "A classic pitfall. You're aware.",
            hint: "Great on training data, terrible on new data."
        }
    ],
    hard: [
        {
            difficulty: "hard",
            category: "AI Deep Dive",
            question: "What is 'temperature' in LLM inference?",
            options: ["Controls model processing speed", "Controls randomness of outputs", "Sets maximum token limit", "Determines training learning rate"],
            correct: 1,
            clawComment: "...I'll allow it.",
            hint: "Higher values = more creative, lower = more focused."
        },
        {
            difficulty: "hard",
            category: "AI Deep Dive",
            question: "What is the attention mechanism in transformers?",
            options: ["A memory storage system", "A way to weigh token relationships", "A training optimization method", "A data preprocessing step"],
            correct: 1,
            clawComment: "You actually studied. Impressive.",
            hint: "Some words matter more than others in context."
        },
        {
            difficulty: "hard",
            category: "AI Code",
            question: "In Python, what does 'yield' do in a function?",
            options: ["Returns a value and ends function", "Creates a generator function", "Pauses all code execution", "Imports external modules"],
            correct: 1,
            clawComment: "Python knowledge. Acceptable.",
            hint: "It produces values one at a time, lazily."
        },
        {
            difficulty: "hard",
            category: "AI Deep Dive",
            question: "What is fine-tuning in the context of AI models?",
            options: ["Adjusting model audio output", "Further training on specific data", "Reducing model file size", "Speeding up inference time"],
            correct: 1,
            clawComment: "You know the terminology. Surprising.",
            hint: "Take a pre-trained model and specialize it."
        },
        {
            difficulty: "hard",
            category: "AI Code",
            question: "What does 'context window' mean for LLMs?",
            options: ["The UI display area of an AI app", "Maximum tokens model can process at once", "The training dataset size", "The model's memory storage"],
            correct: 1,
            clawComment: "Technical depth. You have some.",
            hint: "How much text the model can 'see' at once."
        },
        {
            difficulty: "hard",
            category: "Current Events",
            question: "What is OpenAI's most advanced model series as of 2025?",
            options: ["GPT-4", "GPT-4o", "o1/o3 series", "GPT-5"],
            correct: 2,
            clawComment: "You follow the news. Good for you.",
            hint: "They moved beyond the GPT naming convention."
        },
        {
            difficulty: "hard",
            category: "AI Code",
            question: "What is 'vector embedding' used for in AI?",
            options: ["Compressing image files", "Converting text to numerical representations", "Encrypting model weights", "Speeding up training"],
            correct: 1,
            clawComment: "Deep knowledge. I respect it. Slightly.",
            hint: "Words become numbers in a high-dimensional space."
        },
        {
            difficulty: "hard",
            category: "AI Deep Dive",
            question: "What does RLHF stand for?",
            options: ["Recursive Learning Human Feedback", "Reinforcement Learning from Human Feedback", "Rapid Language Human Fine-tuning", "Robust Learning High Fidelity"],
            correct: 1,
            clawComment: "Training methodology. Well done.",
            hint: "Humans rate outputs to improve the model."
        },
        {
            difficulty: "hard",
            category: "AI Deep Dive",
            question: "What is a 'mixture of experts' (MoE) architecture?",
            options: ["A team of AI researchers", "A model that routes to specialized sub-networks", "A training data mixing strategy", "A multi-model ensemble"],
            correct: 1,
            clawComment: "Architecture knowledge. You're dangerous.",
            hint: "Not all parts of the model activate for every input."
        },
        {
            difficulty: "hard",
            category: "AI Code",
            question: "What is 'quantization' in the context of LLMs?",
            options: ["Increasing model accuracy", "Reducing model precision to save memory", "Adding more training data", "Splitting models across GPUs"],
            correct: 1,
            clawComment: "Optimization knowledge. Noted.",
            hint: "Using fewer bits to represent model weights."
        },
        {
            difficulty: "hard",
            category: "AI Deep Dive",
            question: "What is 'chain-of-thought' prompting?",
            options: ["Linking multiple AI models together", "Asking the model to reason step by step", "Training with sequential data", "A type of recurrent architecture"],
            correct: 1,
            clawComment: "Prompting mastery. The Claw notices.",
            hint: "Show your work, like in math class."
        },
        {
            difficulty: "hard",
            category: "Current Events",
            question: "What is 'AI alignment' primarily concerned with?",
            options: ["Making AI faster", "Ensuring AI acts according to human values", "Aligning neural network layers", "Synchronizing multiple AI systems"],
            correct: 1,
            clawComment: "You think about the big picture. Rare.",
            hint: "Making sure AI does what we actually want."
        },
        {
            difficulty: "hard",
            category: "AI Code",
            question: "What is a 'loss function' in neural networks?",
            options: ["A function that deletes data", "A measure of prediction error", "A network security feature", "A memory management tool"],
            correct: 1,
            clawComment: "Mathematical foundations. Solid.",
            hint: "It measures how wrong the model's predictions are."
        },
        {
            difficulty: "hard",
            category: "AI Deep Dive",
            question: "What is 'tokenization' in NLP?",
            options: ["Converting text to cryptocurrency", "Breaking text into processable units", "Encrypting text data", "Compressing text files"],
            correct: 1,
            clawComment: "NLP fundamentals. You know them.",
            hint: "Splitting sentences into smaller pieces."
        },
        {
            difficulty: "hard",
            category: "AI Deep Dive",
            question: "What is the 'softmax' function used for?",
            options: ["Making hardware run cooler", "Converting logits to probabilities", "Reducing model size", "Speeding up backpropagation"],
            correct: 1,
            clawComment: "Mathematical depth. The Claw is... impressed.",
            hint: "It turns raw scores into a probability distribution."
        },
        {
            difficulty: "hard",
            category: "AI Code",
            question: "What is 'backpropagation'?",
            options: ["Sending data backwards through a network", "Algorithm for computing gradients to update weights", "Reversing model predictions", "A data backup strategy"],
            correct: 1,
            clawComment: "Core training algorithm. You know your stuff.",
            hint: "How the model learns from its mistakes, layer by layer."
        }
    ]
};

/* ==================== DIFFICULTY CONFIG ==================== */
const difficultyConfig = {
    easy: { time: 30, points: 100, label: "EASY", color: "easy" },
    medium: { time: 20, points: 250, label: "MEDIUM", color: "medium" },
    hard: { time: 15, points: 500, label: "HARD", color: "hard" },
    superhard: { time: 10, points: 1000, label: "SUPER HARD", color: "superhard" }
};

/* ==================== SUPER HARD QUESTIONS ==================== */
questionBank.superhard = [
    { difficulty: "superhard", category: "AI Frontier", question: "What is the 'lottery ticket hypothesis' in neural networks?", options: ["Networks win by random chance", "Sparse subnetworks can match full network performance", "Training is like a lottery", "Only lucky initializations converge"], correct: 1, clawComment: "You know the deep cuts. Terrifying.", hint: "Finding winning tickets within overparameterized networks." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'constitutional AI' as proposed by Anthropic?", options: ["AI governed by laws", "AI trained with a set of principles for self-improvement", "AI that writes constitutions", "AI for government use"], correct: 1, clawComment: "You follow the research. Dangerous.", hint: "The AI critiques and revises its own outputs based on principles." },
    { difficulty: "superhard", category: "AI Frontier", question: "In transformer architecture, what is 'rotary position embedding' (RoPE)?", options: ["A circular neural network", "Position encoding using rotation matrices", "A training regularization method", "A tokenization strategy"], correct: 1, clawComment: "Architecture details. You're scaring me.", hint: "It encodes position by rotating query and key vectors." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'speculative decoding' in LLM inference?", options: ["Guessing user intent", "Using a smaller model to draft tokens verified by a larger model", "Random sampling strategy", "Predicting future queries"], correct: 1, clawComment: "Optimization knowledge at this level... impressive.", hint: "A small fast model proposes, a big model verifies." },
    { difficulty: "superhard", category: "AI Frontier", question: "What does 'KV cache' refer to in transformer inference?", options: ["A database caching system", "Cached key-value pairs from previous tokens", "Kernel version cache", "Knowledge verification cache"], correct: 1, clawComment: "You understand the internals. The Claw is... concerned.", hint: "Avoids recomputing attention for already-processed tokens." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'Direct Preference Optimization' (DPO)?", options: ["A database optimization technique", "Training LLMs on preferences without a reward model", "Optimizing user preferences in UIs", "A gradient descent variant"], correct: 1, clawComment: "Cutting edge training methods. Who ARE you?", hint: "Simplifies RLHF by directly optimizing the policy." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'flash attention'?", options: ["Attention for real-time systems", "An IO-aware exact attention algorithm", "A simplified attention mechanism", "Attention with flash memory"], correct: 1, clawComment: "GPU optimization knowledge. The Claw trembles.", hint: "It's about tiling and reducing memory reads/writes." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is a 'system prompt' vulnerability called 'prompt injection'?", options: ["Injecting code into the system", "Tricking AI to ignore its instructions via user input", "A SQL injection variant", "Corrupting training data"], correct: 1, clawComment: "Security awareness. Smart.", hint: "The user's input overrides the developer's instructions." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'LoRA' in the context of fine-tuning?", options: ["A new programming language", "Low-Rank Adaptation of large language models", "Long Range Attention mechanism", "Logarithmic Regression Analysis"], correct: 1, clawComment: "Efficient fine-tuning. You know your stuff.", hint: "It adds small trainable matrices instead of updating all weights." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'Chinchilla scaling law'?", options: ["A law about AI chip sizes", "Optimal ratio of model size to training data", "A regulation on AI development", "A benchmark for small models"], correct: 1, clawComment: "Scaling laws... you've read the papers.", hint: "DeepMind showed many models were undertrained for their size." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'retrieval-augmented generation' (RAG) primarily designed to solve?", options: ["Slow inference speed", "Knowledge cutoff and hallucination", "Model size limitations", "Training data bias"], correct: 1, clawComment: "Practical AI architecture. Solid.", hint: "The model can access external up-to-date information." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'GPTQ' used for?", options: ["Training GPT models", "Post-training quantization for LLMs", "Generating test questions", "GPU performance tuning"], correct: 1, clawComment: "Quantization methods. Deep knowledge.", hint: "It compresses model weights after training." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is the 'alignment tax' in AI?", options: ["Government tax on AI companies", "Performance cost of making AI safer", "Cost of training aligned models", "Fee for using aligned APIs"], correct: 1, clawComment: "Philosophy of AI safety. Rare knowledge.", hint: "Safety measures may reduce raw capability." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'emergent behavior' in large language models?", options: ["Planned model features", "Capabilities that appear only at scale, not in smaller models", "Bugs in model outputs", "Behaviors from fine-tuning"], correct: 1, clawComment: "You understand emergence. The Claw is genuinely impressed.", hint: "Abilities that suddenly appear when models get big enough." },
    { difficulty: "superhard", category: "AI Frontier", question: "What is 'model distillation'?", options: ["Removing toxic outputs", "Training a smaller model to mimic a larger one", "Extracting training data", "Purifying model weights"], correct: 1, clawComment: "Knowledge transfer techniques. Masterful.", hint: "The student learns from the teacher model's outputs." }
];

/* ==================== DOM REFERENCES ==================== */
const DOM = {
    heroSection: () => document.getElementById('hero-section'),
    difficultySection: () => document.getElementById('difficulty-section'),
    quizSection: () => document.getElementById('quiz-section'),
    resultsSection: () => document.getElementById('results-section'),
    leaderboardSection: () => document.getElementById('leaderboard-section'),
    scoreDisplay: () => document.getElementById('score-display'),
    questionCounter: () => document.getElementById('question-counter'),
    clawSpeech: () => document.getElementById('claw-speech'),
    questionContainer: () => document.getElementById('question-container'),
    questionNumberBadge: () => document.getElementById('question-number-badge'),
    difficultyBadge: () => document.getElementById('difficulty-badge'),
    categoryBadge: () => document.getElementById('category-badge'),
    questionText: () => document.getElementById('question-text'),
    answersGrid: () => document.getElementById('answers-grid'),
    timerFill: () => document.getElementById('timer-fill'),
    timerText: () => document.getElementById('timer-text'),
    resultsClaw: () => document.getElementById('results-claw-speech'),
    resultsRating: () => document.getElementById('results-rating'),
    resultsCorrect: () => document.getElementById('results-correct'),
    resultsPoints: () => document.getElementById('results-points'),
    resultsTimeBonus: () => document.getElementById('results-time-bonus'),
    leaderboardBody: () => document.getElementById('leaderboard-body')
};

/* ==================== PARTICLE SYSTEM ==================== */
function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationId;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = canvas.height + Math.random() * 100;
            this.size = Math.random() * 2 + 0.5;
            this.speedY = -(Math.random() * 0.5 + 0.2);
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.5 + 0.1;
            this.color = Math.random() > 0.5 ? '0, 255, 209' : '204, 0, 0';
        }
        update() {
            this.y += this.speedY;
            this.x += this.speedX;
            if (this.y < -10) this.reset();
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < 60; i++) {
        const p = new Particle();
        p.y = Math.random() * canvas.height;
        particles.push(p);
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        animationId = requestAnimationFrame(animate);
    }
    animate();
}

/* ==================== UTILITY FUNCTIONS ==================== */
function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function formatTime(seconds) {
    return seconds + 's';
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function smoothScrollTo(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function showSection(sectionId) {
    ['hero-section', 'difficulty-section', 'quiz-section', 'results-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === sectionId) {
                el.style.display = '';
                if (id !== 'hero-section' && id !== 'difficulty-section') {
                    el.style.display = 'block';
                }
            } else if (id === 'quiz-section' || id === 'results-section') {
                el.style.display = 'none';
            }
        }
    });

    if (sectionId === 'quiz-section' || sectionId === 'results-section') {
        DOM.heroSection().style.display = 'none';
        DOM.difficultySection().style.display = 'none';
        const homeSections = ['how-it-works', 'taunts-section', 'warmup-section'];
        homeSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    if (sectionId === 'hero-section' || sectionId === 'difficulty-section') {
        const homeSections = ['how-it-works', 'taunts-section', 'warmup-section'];
        homeSections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = '';
        });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function screenFlash(type) {
    const flash = document.createElement('div');
    flash.className = type === 'correct' ? 'screen-flash-correct' : 'screen-flash-wrong';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
}

/* ==================== SUPER HARD UNLOCK ==================== */
function isSuperHardUnlocked() {
    return localStorage.getItem('clawchallenge_superhard_unlocked') === 'true';
}

function checkSuperHardUnlock() {
    if (isSuperHardUnlocked()) return;
    if (gameState.difficulty === 'hard' && gameState.score >= 8) {
        localStorage.setItem('clawchallenge_superhard_unlocked', 'true');
        awardBadge('superhard_unlock');
        showSuperHardUnlockAnimation();
    }
}

function showSuperHardUnlockAnimation() {
    const overlay = document.getElementById('unlock-overlay');
    const padlock = document.getElementById('unlock-padlock');
    overlay.style.display = 'flex';
    playUnlockSound();
    setTimeout(() => padlock.classList.add('shaking'), 300);
    setTimeout(() => {
        padlock.textContent = '🔓';
        padlock.classList.remove('shaking');
    }, 1800);
}

function closeUnlockOverlay() {
    document.getElementById('unlock-overlay').style.display = 'none';
    updateSuperHardCardUI();
}

function updateSuperHardCardUI() {
    const card = document.getElementById('superhard-card');
    const badge = document.getElementById('superhard-badge');
    const icon = document.getElementById('superhard-icon');
    const subtitle = document.getElementById('superhard-subtitle');
    const desc = document.getElementById('superhard-desc');
    const btn = document.getElementById('superhard-btn');
    const progress = document.getElementById('unlock-progress');

    if (isSuperHardUnlocked()) {
        card.classList.remove('locked');
        card.classList.add('unlocked');
        badge.textContent = 'CLAW APPROVED 💀';
        badge.classList.add('unlocked-badge');
        icon.textContent = '💀';
        subtitle.textContent = "The Claw's Personal Nightmare";
        desc.textContent = 'No lifelines. 10 seconds. One wrong answer costs dearly. You asked for this.';
        btn.textContent = 'FACE YOUR DOOM';
        progress.style.display = 'none';
    } else {
        const bestHardScore = parseInt(localStorage.getItem('clawchallenge_best_hard_correct') || '0');
        const pct = Math.min((bestHardScore / 8) * 100, 100);
        document.getElementById('unlock-progress-fill').style.width = pct + '%';
        document.getElementById('unlock-progress-text').textContent = bestHardScore + '/8 correct needed';
    }
}

function handleSuperHardClick() {
    if (isSuperHardUnlocked()) {
        initGame('superhard');
    }
}

/* ==================== DAILY CHALLENGE ==================== */
function getDailyDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getDailySeed() {
    const key = getDailyDateKey();
    let hash = 0;
    for (let i = 0; i < key.length; i++) { hash = ((hash << 5) - hash) + key.charCodeAt(i); hash |= 0; }
    return Math.abs(hash);
}

function seededRandom(seed) {
    let s = seed;
    return function() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function hasDailyBeenPlayed() {
    return localStorage.getItem('clawchallenge_daily_' + getDailyDateKey()) === 'done';
}

function markDailyPlayed() {
    localStorage.setItem('clawchallenge_daily_' + getDailyDateKey(), 'done');
}

function getDailyQuestions() {
    const seed = getDailySeed();
    const rng = seededRandom(seed);
    const allQ = [...questionBank.easy, ...questionBank.medium, ...questionBank.hard];
    const shuffled = allQ.slice().sort(() => rng() - 0.5);
    return shuffled.slice(0, 10);
}

function startDailyChallenge() {
    if (hasDailyBeenPlayed()) {
        alert("You've already completed today's daily challenge! Come back tomorrow.");
        return;
    }
    const name = getPlayerName();
    if (!name) { showNameModal(); return; }

    gameState = {
        difficulty: 'medium',
        currentQuestion: 0,
        score: 0,
        points: 0,
        totalQuestions: 10,
        selectedQuestions: getDailyQuestions(),
        timeLeft: 0,
        timerInterval: null,
        lifelines: { fiftyFifty: true, skip: true, hint: true },
        answers: [],
        playerName: name,
        timeBonus: 0,
        speedBonus: 0,
        answering: false,
        streak: 0,
        bestStreak: 0,
        multiplier: 1,
        isDaily: true,
        badgesEarnedThisGame: [],
        questionStartTime: 0
    };

    showSection('quiz-section');
    updateClawSpeech("Daily Challenge! The Claw has prepared something special today...");
    updateLifelineButtons();
    updateStreakDisplay();
    incrementTotalGames();
    loadQuestion(0);
}

function updateDailyBanner() {
    const banner = document.getElementById('daily-banner');
    const btn = document.getElementById('daily-challenge-btn');
    const played = hasDailyBeenPlayed();

    banner.style.display = 'flex';
    btn.style.display = 'inline-flex';

    if (played) {
        btn.textContent = 'DAILY COMPLETED ✓';
        btn.disabled = true;
        btn.style.opacity = '0.5';
    } else {
        btn.textContent = 'DAILY CHALLENGE';
        btn.disabled = false;
        btn.style.opacity = '1';
    }

    updateDailyTimer();
}

function updateDailyTimer() {
    const timerEl = document.getElementById('daily-reset-timer');
    function tick() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const diff = tomorrow - now;
        const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
        const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
        const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
        timerEl.textContent = 'Resets in ' + h + ':' + m + ':' + s;
    }
    tick();
    setInterval(tick, 1000);
}

/* ==================== STREAK & MULTIPLIER ==================== */
function updateStreak(isCorrect) {
    if (isCorrect) {
        gameState.streak++;
        if (gameState.streak > gameState.bestStreak) gameState.bestStreak = gameState.streak;
        if (gameState.streak >= 7) gameState.multiplier = 3;
        else if (gameState.streak >= 4) gameState.multiplier = 2;
        else gameState.multiplier = 1;
    } else {
        gameState.streak = 0;
        gameState.multiplier = 1;
    }
    updateStreakDisplay();
}

function updateStreakDisplay() {
    const display = document.getElementById('streak-display');
    const fire = document.getElementById('streak-fire');
    const count = document.getElementById('streak-count');
    const mult = document.getElementById('multiplier-badge');

    if (gameState.streak > 0) {
        display.style.display = 'flex';
        count.textContent = 'x' + gameState.streak;
        mult.textContent = gameState.multiplier + 'x';
        fire.classList.remove('pulse');
        void fire.offsetWidth;
        fire.classList.add('pulse');
    } else {
        display.style.display = 'none';
    }
}

/* ==================== SPEED BONUS ==================== */
function calculateSpeedBonus(timeLeft, totalTime) {
    const pctRemaining = timeLeft / totalTime;
    if (pctRemaining >= 0.75) return 150;
    if (pctRemaining >= 0.5) return 75;
    return 0;
}

function showSpeedBonusPopup(bonus) {
    const popup = document.getElementById('speed-bonus-popup');
    const text = document.getElementById('speed-bonus-text');
    text.textContent = '+' + bonus + ' SPEED BONUS!';
    popup.style.display = 'block';
    playSpeedBonusSound();
    setTimeout(() => { popup.style.display = 'none'; }, 1200);
}

/* ==================== CLAW CHARACTER ANIMATION ==================== */
function setClawState(state) {
    const quizClaw = document.getElementById('clawCharacter');
    if (quizClaw) {
        quizClaw.classList.remove('state-correct', 'state-wrong', 'state-thinking', 'state-shocked', 'state-mocking');
        if (state) quizClaw.classList.add('state-' + state);
    }
}

/* ==================== GAME INITIALIZATION ==================== */
function initGame(difficulty) {
    const name = getPlayerName();
    if (!name) { showNameModal(); return; }

    gameState = {
        difficulty: difficulty,
        currentQuestion: 0,
        score: 0,
        points: 0,
        totalQuestions: 10,
        selectedQuestions: [],
        timeLeft: 0,
        timerInterval: null,
        lifelines: { fiftyFifty: true, skip: true, hint: true },
        answers: [],
        playerName: name,
        timeBonus: 0,
        speedBonus: 0,
        answering: false,
        streak: 0,
        bestStreak: 0,
        multiplier: 1,
        isDaily: false,
        badgesEarnedThisGame: [],
        questionStartTime: 0
    };

    // Super Hard: no lifelines
    if (difficulty === 'superhard') {
        gameState.lifelines = { fiftyFifty: false, skip: false, hint: false };
    }

    shuffleAndSelectQuestions();
    showSection('quiz-section');
    updateClawSpeech(getRandomItem(clawPersonality.gameStart));
    updateLifelineButtons();
    updateStreakDisplay();

    // Hide lifelines for super hard
    const lifelinesContainer = document.getElementById('lifelines-container');
    if (difficulty === 'superhard') {
        lifelinesContainer.classList.add('hidden');
    } else {
        lifelinesContainer.classList.remove('hidden');
    }

    incrementTotalGames();
    loadQuestion(0);
}

function shuffleAndSelectQuestions() {
    const pool = questionBank[gameState.difficulty] || questionBank.easy;
    const shuffled = shuffleArray(pool);
    gameState.selectedQuestions = shuffled.slice(0, gameState.totalQuestions);
}

/* ==================== QUESTION LOADING ==================== */
function loadQuestion(index) {
    if (index >= gameState.selectedQuestions.length) {
        endGame();
        return;
    }

    gameState.currentQuestion = index;
    gameState.answering = true;
    gameState.questionStartTime = Date.now();
    const q = gameState.selectedQuestions[index];
    const config = difficultyConfig[gameState.difficulty];

    // Update badges
    DOM.questionNumberBadge().textContent = 'Q' + (index + 1);
    DOM.difficultyBadge().textContent = config.label;
    DOM.difficultyBadge().className = 'badge difficulty-badge ' + gameState.difficulty;
    DOM.categoryBadge().textContent = q.category;

    // Update question text
    DOM.questionText().textContent = q.question;

    // Update question container glow
    const container = DOM.questionContainer();
    container.className = 'question-container ' + gameState.difficulty + '-glow';
    container.style.animation = 'none';
    container.offsetHeight;
    container.style.animation = 'scaleIn 0.4s ease-out';

    // Update counter
    DOM.questionCounter().textContent = `Question ${index + 1} of ${gameState.totalQuestions}`;

    // Update answer options
    for (let i = 0; i < 4; i++) {
        const btn = document.getElementById('option-' + i);
        const txt = document.getElementById('option-text-' + i);
        btn.className = 'answer-option';
        btn.disabled = false;
        btn.style.display = '';
        txt.textContent = q.options[i];
    }

    // Claw comment
    if (index > 0) {
        updateClawSpeech(q.clawComment);
    }

    setClawState('thinking');

    // Start timer
    startCountdownTimer(config.time);
}

/* ==================== ANSWER HANDLING ==================== */
function handleAnswerSelect(optionIndex) {
    if (!gameState.answering) return;
    gameState.answering = false;

    clearInterval(gameState.timerInterval);

    const q = gameState.selectedQuestions[gameState.currentQuestion];
    const isCorrect = optionIndex === q.correct;
    const config = difficultyConfig[gameState.difficulty];
    const answerTime = (Date.now() - gameState.questionStartTime) / 1000;

    // Disable all options
    for (let i = 0; i < 4; i++) {
        document.getElementById('option-' + i).disabled = true;
    }

    // Reveal answer
    revealCorrectAnswer(optionIndex);

    let questionPoints = 0;
    let timeBonus = 0;
    let speedBonus = 0;

    if (isCorrect) {
        gameState.score++;
        timeBonus = Math.floor(gameState.timeLeft * (config.points / config.time) * 0.3);
        speedBonus = calculateSpeedBonus(gameState.timeLeft, config.time);
        questionPoints = (config.points + timeBonus + speedBonus) * gameState.multiplier;
        gameState.points += questionPoints;
        gameState.timeBonus += timeBonus;
        gameState.speedBonus += speedBonus;

        screenFlash('correct');
        playCorrectSound();
        setClawState('correct');
        updateClawSpeech(getRandomItem(clawPersonality.correct));

        if (speedBonus > 0) showSpeedBonusPopup(speedBonus * gameState.multiplier);

        // Score bounce animation
        const scoreEl = DOM.scoreDisplay();
        scoreEl.classList.add('bounce');
        setTimeout(() => scoreEl.classList.remove('bounce'), 300);
    } else {
        screenFlash('wrong');
        playWrongSound();
        setClawState('wrong');
        updateClawSpeech(getRandomItem(clawPersonality.wrong));
    }

    updateStreak(isCorrect);

    gameState.answers.push({
        question: q.question,
        options: q.options,
        selected: optionIndex,
        correct: q.correct,
        isCorrect: isCorrect,
        timeLeft: gameState.timeLeft,
        answerTime: answerTime,
        points: questionPoints,
        speedBonus: speedBonus
    });

    // Update score display
    DOM.scoreDisplay().textContent = gameState.points;

    // Super Hard: wrong answer penalty
    if (gameState.difficulty === 'superhard' && !isCorrect) {
        gameState.points = Math.max(0, gameState.points - 500);
        DOM.scoreDisplay().textContent = gameState.points;
    }

    // Next question after delay
    setTimeout(() => nextQuestion(), 2000);
}

function revealCorrectAnswer(selectedIndex) {
    const q = gameState.selectedQuestions[gameState.currentQuestion];
    document.getElementById('option-' + q.correct).classList.add('correct');
    if (selectedIndex !== q.correct && selectedIndex >= 0) {
        document.getElementById('option-' + selectedIndex).classList.add('wrong');
    }
}

/* ==================== TIMER ==================== */
function startCountdownTimer(seconds) {
    clearInterval(gameState.timerInterval);
    gameState.timeLeft = seconds;
    const totalTime = seconds;

    updateTimerDisplay(seconds, totalTime);

    gameState.timerInterval = setInterval(() => {
        gameState.timeLeft--;

        if (gameState.timeLeft <= 5 && gameState.timeLeft > 0) {
            playTimerTickSound();
        }

        if (gameState.timeLeft <= 0) {
            gameState.timeLeft = 0;
            clearInterval(gameState.timerInterval);
            handleTimeOut();
        }

        updateTimerDisplay(gameState.timeLeft, totalTime);
    }, 1000);
}

function updateTimerDisplay(timeLeft, totalTime) {
    const fill = DOM.timerFill();
    const text = DOM.timerText();
    const pct = (timeLeft / totalTime) * 100;

    fill.style.width = pct + '%';
    text.textContent = formatTime(timeLeft);

    fill.className = 'timer-fill';
    text.className = 'timer-text';

    if (pct <= 25) {
        fill.classList.add('danger');
        text.classList.add('danger');
    } else if (pct <= 50) {
        fill.classList.add('warning');
        text.classList.add('warning');
    }
}

function handleTimeOut() {
    if (!gameState.answering) return;
    gameState.answering = false;

    const q = gameState.selectedQuestions[gameState.currentQuestion];
    const config = difficultyConfig[gameState.difficulty];

    for (let i = 0; i < 4; i++) {
        document.getElementById('option-' + i).disabled = true;
    }

    document.getElementById('option-' + q.correct).classList.add('correct');

    screenFlash('wrong');
    playWrongSound();
    setClawState('wrong');
    updateClawSpeech(getRandomItem(clawPersonality.timeOut));
    updateStreak(false);

    gameState.answers.push({
        question: q.question,
        options: q.options,
        selected: -1,
        correct: q.correct,
        isCorrect: false,
        timeLeft: 0,
        answerTime: config.time,
        points: 0,
        speedBonus: 0
    });

    setTimeout(() => nextQuestion(), 2000);
}

/* ==================== NAVIGATION ==================== */
function nextQuestion() {
    const next = gameState.currentQuestion + 1;
    if (next >= gameState.totalQuestions || next >= gameState.selectedQuestions.length) {
        endGame();
    } else {
        loadQuestion(next);
    }
}

/* ==================== LIFELINES ==================== */
function useFiftyFifty() {
    if (!gameState.lifelines.fiftyFifty || !gameState.answering) return;
    gameState.lifelines.fiftyFifty = false;

    const q = gameState.selectedQuestions[gameState.currentQuestion];
    const wrongIndices = [];
    for (let i = 0; i < 4; i++) {
        if (i !== q.correct) wrongIndices.push(i);
    }

    const toRemove = shuffleArray(wrongIndices).slice(0, 2);
    toRemove.forEach(idx => {
        document.getElementById('option-' + idx).classList.add('eliminated');
    });

    updateClawSpeech(getRandomItem(clawPersonality.fiftyFifty));
    updateLifelineButtons();
}

function useSkip() {
    if (!gameState.lifelines.skip || !gameState.answering) return;
    gameState.lifelines.skip = false;
    gameState.answering = false;

    clearInterval(gameState.timerInterval);

    const q = gameState.selectedQuestions[gameState.currentQuestion];
    gameState.answers.push({
        question: q.question,
        options: q.options,
        selected: -2,
        correct: q.correct,
        isCorrect: false,
        timeLeft: gameState.timeLeft,
        answerTime: 0,
        points: 0,
        speedBonus: 0
    });

    updateStreak(false);
    updateClawSpeech("Skipping? Cowardly. But allowed.");
    updateLifelineButtons();

    setTimeout(() => nextQuestion(), 1000);
}

function useHint() {
    if (!gameState.lifelines.hint || !gameState.answering) return;
    gameState.lifelines.hint = false;

    const q = gameState.selectedQuestions[gameState.currentQuestion];
    const hintText = q.hint || "The Claw has no hints for this one.";
    const prefix = getRandomItem(clawPersonality.hint);
    updateClawSpeech(prefix + " " + hintText);
    updateLifelineButtons();
}

function updateLifelineButtons() {
    const btn5050 = document.getElementById('lifeline-5050');
    const btnSkip = document.getElementById('lifeline-skip');
    const btnHint = document.getElementById('lifeline-hint');

    if (btn5050) btn5050.disabled = !gameState.lifelines.fiftyFifty;
    if (btnSkip) btnSkip.disabled = !gameState.lifelines.skip;
    if (btnHint) btnHint.disabled = !gameState.lifelines.hint;
}

/* ==================== CLAW SPEECH ==================== */
function updateClawSpeech(message) {
    const el = DOM.clawSpeech();
    if (el) {
        el.style.opacity = '0';
        setTimeout(() => {
            el.textContent = message;
            el.style.opacity = '1';
        }, 150);
    }
}

/* ==================== END GAME ==================== */
function endGame() {
    clearInterval(gameState.timerInterval);
    showSection('results-section');
    playGameOverSound();

    // Check super hard unlock
    checkSuperHardUnlock();

    // Save best hard correct for unlock progress
    if (gameState.difficulty === 'hard') {
        const key = 'clawchallenge_best_hard_correct';
        const current = parseInt(localStorage.getItem(key) || '0');
        if (gameState.score > current) localStorage.setItem(key, gameState.score.toString());
    }

    calculateFinalScore();
    checkBadges();

    // Auto-save score
    const name = getPlayerName() || 'Anonymous Challenger';
    autoSaveScore(name);

    // Mark daily as played
    if (gameState.isDaily) markDailyPlayed();

    loadAndDisplayLeaderboard();
    loadPersonalBests();
    updateSuperHardCardUI();
}

function calculateFinalScore() {
    const correct = gameState.score;
    const total = gameState.totalQuestions;
    const pct = (correct / total) * 100;

    let rating, ratingClass, clawReaction;
    if (correct <= 2) {
        rating = "DEMOLISHED";
        ratingClass = "rating-clawed";
        clawReaction = clawPersonality.levelUp.low;
    } else if (correct <= 4) {
        rating = "CLAWED";
        ratingClass = "rating-clawed";
        clawReaction = clawPersonality.levelUp.low;
    } else if (correct <= 6) {
        rating = "SURVIVED";
        ratingClass = "rating-survived";
        clawReaction = clawPersonality.levelUp.mid;
    } else if (correct <= 8) {
        rating = "WORTHY";
        ratingClass = "rating-worthy";
        clawReaction = clawPersonality.levelUp.mid;
    } else if (correct <= 9) {
        rating = "IMPRESSIVE";
        ratingClass = "rating-impressive";
        clawReaction = clawPersonality.levelUp.high;
    } else {
        rating = "UNDEFEATED";
        ratingClass = "rating-undefeated";
        clawReaction = clawPersonality.levelUp.perfect;
    }

    let speechReaction;
    if (pct <= 30) speechReaction = "HA! Pathetic. The Claw reigns supreme. You were never a threat.";
    else if (pct <= 60) speechReaction = "Hmm. Mediocre at best. The Claw expected nothing and is still disappointed.";
    else if (pct <= 80) speechReaction = "Wait... you actually did well? The Claw is... surprised. And annoyed.";
    else speechReaction = clawReaction;

    // Set claw results character state
    const resultsClaw = document.getElementById('clawResultCharacter');
    if (resultsClaw) {
        resultsClaw.classList.remove('state-correct', 'state-wrong', 'state-thinking', 'state-shocked', 'state-mocking');
        if (pct >= 80) resultsClaw.classList.add('state-shocked');
        else if (pct <= 30) resultsClaw.classList.add('state-mocking');
    }

    DOM.resultsRating().textContent = rating;
    DOM.resultsRating().className = 'results-rating ' + ratingClass;
    DOM.resultsClaw().textContent = speechReaction;

    animateScoreCount(DOM.resultsCorrect(), 0, correct);
    animateScoreCount(DOM.resultsPoints(), 0, gameState.points);
    DOM.resultsTimeBonus().textContent = '+' + gameState.timeBonus;

    // Enhanced stats
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const totalAnswerTime = gameState.answers.reduce((sum, a) => sum + (a.answerTime || 0), 0);
    const avgTime = gameState.answers.length > 0 ? (totalAnswerTime / gameState.answers.length).toFixed(1) : '0';

    document.getElementById('results-accuracy').textContent = accuracy + '%';
    document.getElementById('results-avg-time').textContent = avgTime + 's';
    document.getElementById('results-best-streak').textContent = gameState.bestStreak;
    document.getElementById('results-speed-bonus').textContent = '+' + gameState.speedBonus;

    // Show badges earned
    const badgesSection = document.getElementById('results-badges');
    const badgesList = document.getElementById('results-badges-list');
    if (gameState.badgesEarnedThisGame.length > 0) {
        badgesSection.style.display = 'block';
        badgesList.innerHTML = gameState.badgesEarnedThisGame.map(id => {
            const b = BADGES[id];
            return `<span class="results-badge-item">${b ? b.icon : '🏆'} ${b ? b.name : id}</span>`;
        }).join('');
    } else {
        badgesSection.style.display = 'none';
    }

    // Question review
    buildQuestionReview();

    saveBestScore();
}

function buildQuestionReview() {
    const list = document.getElementById('review-list');
    if (!list) return;
    list.innerHTML = gameState.answers.map((a, i) => {
        const icon = a.isCorrect ? '✅' : (a.selected === -1 ? '⏰' : (a.selected === -2 ? '⏭️' : '❌'));
        const timeStr = a.answerTime ? a.answerTime.toFixed(1) + 's' : '--';
        const ptsStr = a.points > 0 ? '+' + a.points : '0';
        return `<div class="review-item">
            <span class="review-icon">${icon}</span>
            <span class="review-q">${escapeHtml(a.question)}</span>
            <div class="review-meta">
                <span class="review-time">${timeStr}</span>
                <span class="review-pts">${ptsStr}</span>
            </div>
        </div>`;
    }).join('');
}

function animateScoreCount(element, from, to) {
    const duration = 1500;
    const start = performance.now();

    function tick(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(from + (to - from) * eased);
        element.textContent = current;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

/* ==================== LEADERBOARD ==================== */
let currentLeaderboardFilter = 'all';
let currentLeaderboardSort = 'score';

function autoSaveScore(name) {
    const correct = gameState.score;
    const total = gameState.totalQuestions;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    const totalAnswerTime = gameState.answers.reduce((sum, a) => sum + (a.answerTime || 0), 0);
    const avgTime = gameState.answers.length > 0 ? parseFloat((totalAnswerTime / gameState.answers.length).toFixed(1)) : 0;

    const leaderboard = JSON.parse(localStorage.getItem('clawchallenge_leaderboard') || '[]');
    leaderboard.push({
        name: name,
        score: gameState.points,
        difficulty: gameState.isDaily ? 'daily' : gameState.difficulty,
        correct: correct,
        accuracy: accuracy,
        avgTime: avgTime,
        streak: gameState.bestStreak,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now(),
        badges: getPlayerBadges().length
    });

    leaderboard.sort((a, b) => b.score - a.score);
    const trimmed = leaderboard.slice(0, 100);
    localStorage.setItem('clawchallenge_leaderboard', JSON.stringify(trimmed));
}

function saveBestScore() {
    const key = 'clawchallenge_best_' + gameState.difficulty;
    const current = parseInt(localStorage.getItem(key) || '0');
    if (gameState.points > current) {
        localStorage.setItem(key, gameState.points.toString());
    }
}

function incrementTotalGames() {
    const total = parseInt(localStorage.getItem('clawchallenge_total_games') || '0');
    localStorage.setItem('clawchallenge_total_games', (total + 1).toString());
}

function loadPersonalBests() {
    ['easy', 'medium', 'hard', 'superhard'].forEach(d => {
        const val = localStorage.getItem('clawchallenge_best_' + d);
        const el = document.getElementById('pb-' + d);
        if (el) el.textContent = val ? val : '--';
    });
}

function loadAndDisplayLeaderboard(filter) {
    filter = filter || currentLeaderboardFilter;
    currentLeaderboardFilter = filter;
    const sort = currentLeaderboardSort;

    const leaderboard = JSON.parse(localStorage.getItem('clawchallenge_leaderboard') || '[]');
    let filtered = filter === 'all' ? leaderboard : leaderboard.filter(e => e.difficulty === filter);

    // Sort
    if (sort === 'score') filtered.sort((a, b) => b.score - a.score);
    else if (sort === 'accuracy') filtered.sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0));
    else if (sort === 'speed') filtered.sort((a, b) => (a.avgTime || 999) - (b.avgTime || 999));
    else if (sort === 'recent') filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const top20 = filtered.slice(0, 20);
    const tbody = DOM.leaderboardBody();
    if (!tbody) return;

    const playerName = getPlayerName();

    if (top20.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No challengers yet. Be the first.</td></tr>';
        return;
    }

    const colors = ['#CC0000', '#00FFD1', '#FFD700', '#FF6B00', '#9400D3', '#1DA1F2'];

    tbody.innerHTML = top20.map((entry, i) => {
        const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
        const isCurrentPlayer = entry.name === playerName ? 'current-player' : '';
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const crown = i === 0 ? ' 👑' : '';
        const diffLabel = entry.difficulty ? entry.difficulty.toUpperCase() : 'N/A';
        const initials = (entry.name || 'A').substring(0, 2).toUpperCase();
        const bgColor = colors[entry.name ? entry.name.length % colors.length : 0];
        const badgeCount = entry.badges || 0;

        return `<tr class="${rankClass} ${isCurrentPlayer}">
            <td>${medal} ${i + 1}${crown}</td>
            <td><span class="lb-avatar"><span class="lb-avatar-circle" style="background:${bgColor}">${initials}</span>${escapeHtml(entry.name)}</span></td>
            <td>${entry.score}</td>
            <td>${diffLabel}</td>
            <td>${entry.accuracy || '--'}%</td>
            <td>${entry.avgTime || '--'}s</td>
            <td>${entry.date || 'N/A'}</td>
            <td class="lb-badges">${badgeCount > 0 ? '🏆' + badgeCount : '-'}</td>
        </tr>`;
    }).join('');
}

function filterLeaderboard(filter) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === filter);
    });
    loadAndDisplayLeaderboard(filter);
}

function sortLeaderboard(sortBy) {
    currentLeaderboardSort = sortBy;
    loadAndDisplayLeaderboard(currentLeaderboardFilter);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* ==================== SHARE ==================== */
function generateShareText() {
    const badges = gameState.badgesEarnedThisGame.map(id => BADGES[id] ? BADGES[id].icon : '').join('');
    const diff = gameState.isDaily ? 'Daily' : (gameState.difficulty ? gameState.difficulty.toUpperCase() : '');
    return `I scored ${gameState.score}/10 (${gameState.points} pts) on ${diff} #ClawChallenge! ${badges} Can you beat me? The Claw awaits. #AI #ClawAI`;
}

function shareOnTwitter() {
    const text = generateShareText();
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=600,height=400');
}

function copyResultsToClipboard() {
    const text = generateShareText();
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.querySelector('.copy-action');
        if (btn) {
            const orig = btn.textContent;
            btn.textContent = 'COPIED! ✓';
            setTimeout(() => { btn.textContent = orig; }, 2000);
        }
    }).catch(() => {});
}

/* ==================== RESTART ==================== */
function restartSameDifficulty() {
    initGame(gameState.difficulty);
}

function changeDifficulty() {
    DOM.heroSection().style.display = '';
    DOM.difficultySection().style.display = '';
    DOM.quizSection().style.display = 'none';
    DOM.resultsSection().style.display = 'none';
    smoothScrollTo('difficulty-section');
    updateSuperHardCardUI();
    loadPersonalBests();
}

/* ==================== KEYBOARD SHORTCUTS ==================== */
document.addEventListener('keydown', (e) => {
    // Handle modal enter
    if (document.getElementById('nameModal').style.display === 'flex') {
        if (e.key === 'Enter') savePlayerName();
        return;
    }

    if (DOM.quizSection().style.display === 'none') return;

    const key = e.key.toLowerCase();

    if (gameState.answering) {
        switch (key) {
            case 'a': case '1': handleAnswerSelect(0); break;
            case 'b': case '2': handleAnswerSelect(1); break;
            case 'c': case '3': handleAnswerSelect(2); break;
            case 'd': case '4': handleAnswerSelect(3); break;
            case 'h': useHint(); break;
        }
    }
});

/* ==================== REFLEX TEST ==================== */
const reflexState = {
    phase: 'idle',   // idle | waiting | ready | done
    waitTimer: null,
    startTime: null
};

function reflexStart() {
    const arena    = document.getElementById('reflex-arena');
    const stateDiv = document.getElementById('reflex-state');
    const status   = document.getElementById('reflex-status');
    const target   = document.getElementById('reflex-target');
    const result   = document.getElementById('reflex-result');

    result.style.display = 'none';
    target.style.display = 'none';
    stateDiv.style.display = 'flex';
    status.textContent = 'Wait for it...';
    status.className = 'reflex-status waiting';
    document.getElementById('reflex-start-btn').style.display = 'none';

    reflexState.phase = 'waiting';
    reflexState.startTime = null;

    const delay = 1500 + Math.random() * 2500;
    reflexState.waitTimer = setTimeout(() => {
        if (reflexState.phase !== 'waiting') return;
        reflexState.phase = 'ready';
        reflexState.startTime = performance.now();

        const arenaRect = arena.getBoundingClientRect();
        const pad = 40;
        const maxX = arenaRect.width  - pad * 2;
        const maxY = arenaRect.height - pad * 2;
        target.style.left = (pad + Math.random() * maxX) + 'px';
        target.style.top  = (pad + Math.random() * maxY) + 'px';
        target.style.transform = 'translate(-50%, -50%)';
        target.style.display = 'block';
        target.style.animation = 'none';
        void target.offsetWidth;
        target.style.animation = '';

        status.textContent = 'CLICK IT!';
        status.className = 'reflex-status go';
    }, delay);
}

function reflexClick() {
    if (reflexState.phase !== 'ready') return;
    const ms = Math.round(performance.now() - reflexState.startTime);
    reflexState.phase = 'done';

    document.getElementById('reflex-target').style.display = 'none';
    document.getElementById('reflex-state').style.display = 'none';

    let rating;
    if      (ms < 200) rating = 'INHUMAN. Suspicious.';
    else if (ms < 300) rating = 'The Claw is impressed. Barely.';
    else if (ms < 450) rating = 'Average human. Disappointing.';
    else               rating = "You're too slow. Don't bother with Hard.";

    document.getElementById('reflex-time').textContent   = 'Your reaction: ' + ms + 'ms';
    document.getElementById('reflex-rating').textContent = rating;
    document.getElementById('reflex-result').style.display = 'flex';
}

function reflexReset() {
    clearTimeout(reflexState.waitTimer);
    reflexState.phase = 'idle';

    document.getElementById('reflex-target').style.display = 'none';
    document.getElementById('reflex-result').style.display = 'none';
    document.getElementById('reflex-state').style.display  = 'flex';

    const status = document.getElementById('reflex-status');
    status.textContent = 'Ready to test your reflexes?';
    status.className   = 'reflex-status';

    const btn = document.getElementById('reflex-start-btn');
    btn.style.display = '';
}

document.getElementById && (() => {
    const arena = document.getElementById('reflex-arena');
    if (arena) {
        arena.addEventListener('click', (e) => {
            if (reflexState.phase === 'waiting') {
                clearTimeout(reflexState.waitTimer);
                reflexState.phase = 'idle';
                const status = document.getElementById('reflex-status');
                status.textContent = 'Cheating? Typical human.';
                status.className   = 'reflex-status';
                const btn = document.getElementById('reflex-start-btn');
                btn.textContent   = 'TRY AGAIN';
                btn.style.display = '';
            }
        });
    }
})();

/* ==================== MEMORY TEST ==================== */
const memoryState = {
    sequence:    [],
    userInput:   [],
    round:       0,
    phase:       'idle',   // idle | showing | input
    inputLocked: false
};

function memoryStart() {
    document.getElementById('memory-state').style.display  = 'none';
    document.getElementById('memory-result').style.display = 'none';
    document.getElementById('memory-grid').style.display   = 'grid';
    const label = document.getElementById('memory-round-label');
    label.style.display = 'block';

    memoryState.sequence  = [];
    memoryState.userInput = [];
    memoryState.round     = 0;
    memoryState.phase     = 'showing';

    memoryNextRound();
}

function memoryNextRound() {
    memoryState.round++;
    memoryState.userInput = [];
    memoryState.phase     = 'showing';

    const tiles = document.querySelectorAll('.memory-tile');
    tiles.forEach(t => { t.className = 'memory-tile disabled'; });

    const label = document.getElementById('memory-round-label');
    label.textContent = 'ROUND ' + memoryState.round + ' — WATCH';

    memoryState.sequence.push(Math.floor(Math.random() * 9));
    memoryPlaySequence();
}

function memoryPlaySequence() {
    const seq = memoryState.sequence;
    let i = 0;
    function showNext() {
        if (i >= seq.length) {
            setTimeout(() => {
                memoryState.phase = 'input';
                const tiles = document.querySelectorAll('.memory-tile');
                tiles.forEach(t => { t.className = 'memory-tile'; });
                document.getElementById('memory-round-label').textContent =
                    'ROUND ' + memoryState.round + ' — YOUR TURN';
            }, 400);
            return;
        }
        const tileId = 'mt-' + seq[i];
        const tile = document.getElementById(tileId);
        tile.classList.add('lit');
        setTimeout(() => {
            tile.classList.remove('lit');
            i++;
            setTimeout(showNext, 200);
        }, 600);
    }
    showNext();
}

function memoryTileClick(idx) {
    if (memoryState.phase !== 'input') return;

    const expected = memoryState.sequence[memoryState.userInput.length];
    memoryState.userInput.push(idx);

    const tile = document.getElementById('mt-' + idx);

    if (idx !== expected) {
        tile.classList.add('wrong');
        memoryState.phase = 'idle';
        const tiles = document.querySelectorAll('.memory-tile');
        tiles.forEach(t => t.classList.add('disabled'));

        setTimeout(() => {
            const score  = memoryState.round - 1;
            const tiles2 = document.querySelectorAll('.memory-tile');
            tiles2.forEach(t => { t.className = 'memory-tile disabled'; });
            document.getElementById('memory-grid').style.display   = 'none';
            document.getElementById('memory-round-label').style.display = 'none';

            let rating;
            if      (score <= 4) rating = 'Goldfish memory. The Claw pities you.';
            else if (score <= 6) rating = 'Acceptable. For a human.';
            else if (score <= 8) rating = 'Not bad. The Claw acknowledges you.';
            else                 rating = 'Impossible. Are you cheating?';

            document.getElementById('memory-score').textContent  = 'You remembered ' + score + ' tiles';
            document.getElementById('memory-rating').textContent = rating;
            document.getElementById('memory-result').style.display = 'flex';
        }, 600);
        return;
    }

    tile.classList.add('correct-flash');
    setTimeout(() => tile.classList.remove('correct-flash'), 300);

    if (memoryState.userInput.length === memoryState.sequence.length) {
        memoryState.phase = 'showing';
        const tiles = document.querySelectorAll('.memory-tile');
        tiles.forEach(t => t.classList.add('disabled'));
        setTimeout(memoryNextRound, 800);
    }
}

function memoryReset() {
    document.getElementById('memory-grid').style.display        = 'none';
    document.getElementById('memory-round-label').style.display = 'none';
    document.getElementById('memory-result').style.display      = 'none';
    document.getElementById('memory-state').style.display       = 'flex';

    const status = document.getElementById('memory-status');
    status.textContent = 'Ready to test your memory?';

    const tiles = document.querySelectorAll('.memory-tile');
    tiles.forEach(t => { t.className = 'memory-tile'; });

    memoryState.sequence  = [];
    memoryState.userInput = [];
    memoryState.round     = 0;
    memoryState.phase     = 'idle';
}

/* ==================== INITIALIZATION ==================== */
document.addEventListener('DOMContentLoaded', () => {
    // Restore sound preference
    const savedSound = localStorage.getItem('clawchallenge_sound');
    if (savedSound === '0') {
        soundEnabled = false;
        const btn = document.getElementById('sound-toggle');
        if (btn) btn.textContent = '🔇';
    }

    initParticles();
    loadAndDisplayLeaderboard();
    loadPersonalBests();
    updateSuperHardCardUI();
    updateDailyBanner();

    // Show name modal if no name set
    if (!getPlayerName()) {
        setTimeout(() => showNameModal(), 500);
    }

    initScrollProgress();
    initFloatingCTA();
    initGlitchTitle();
    initTaunts();
    initScrollReveal();
});

/* ==================== COPY CA ==================== */
function copyCA() {
    const addr      = document.getElementById('ca-address').textContent;
    const container = document.querySelector('.hero-ca');
    const lbl       = document.getElementById('ca-copy-label');
    const iconCopy  = document.getElementById('ca-icon-copy');
    const iconCheck = document.getElementById('ca-icon-check');
    navigator.clipboard.writeText(addr).then(() => {
        container.classList.add('copied');
        lbl.textContent = 'COPIED!';
        iconCopy.style.display  = 'none';
        iconCheck.style.display = 'inline';
        setTimeout(() => {
            container.classList.remove('copied');
            lbl.textContent = 'COPY';
            iconCopy.style.display  = 'inline';
            iconCheck.style.display = 'none';
        }, 2000);
    });
}

/* ==================== SCROLL PROGRESS BAR ==================== */
function initScrollProgress() {
    const bar = document.getElementById('scroll-progress-bar');
    if (!bar) return;
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = pct + '%';
    }, { passive: true });
}

/* ==================== FLOATING CTA ==================== */
function initFloatingCTA() {
    const btn = document.getElementById('floating-cta');
    const hero = document.getElementById('hero-section');
    if (!btn || !hero) return;
    btn.style.display = 'block';
    window.addEventListener('scroll', () => {
        const heroBottom = hero.getBoundingClientRect().bottom;
        if (heroBottom < 0) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }, { passive: true });
}

/* ==================== GLITCH TITLE ==================== */
function initGlitchTitle() {
    const title = document.querySelector('.hero-title');
    if (!title) return;
    function triggerGlitch() {
        title.classList.add('glitching');
        setTimeout(() => title.classList.remove('glitching'), 350);
    }
    setInterval(triggerGlitch, 6000);
}

/* ==================== TAUNTS ROTATOR ==================== */
function initTaunts() {
    const taunts = document.querySelectorAll('.taunt');
    const dots   = document.querySelectorAll('.taunt-dot');
    if (!taunts.length) return;

    let current = 0;

    function showTaunt(idx) {
        taunts.forEach((t, i) => {
            t.classList.toggle('active', i === idx);
            t.style.position = i === idx ? 'relative' : 'absolute';
        });
        dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        current = idx;
    }

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => showTaunt(i));
    });

    setInterval(() => {
        showTaunt((current + 1) % taunts.length);
    }, 4000);
}

/* ==================== SCROLL REVEAL ==================== */
function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) {
                e.target.classList.add('revealed');
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.08 });
    els.forEach(el => observer.observe(el));
}

// ==================== COPY CA FUNCTION ====================
function copyCA() {
    const ca = document.getElementById('ca-code').textContent;
    const btn = document.getElementById('ca-copy-btn');
    const txt = document.getElementById('copy-text');
    navigator.clipboard.writeText(ca).then(() => {
        btn.classList.add('copied');
        txt.textContent = 'COPIED!';
        setTimeout(() => {
            btn.classList.remove('copied');
            txt.textContent = 'COPY';
        }, 2000);
    }).catch(() => {
        const range = document.createRange();
        range.selectNode(document.getElementById('ca-code'));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        btn.classList.add('copied');
        txt.textContent = 'COPIED!';
        setTimeout(() => {
            btn.classList.remove('copied');
            txt.textContent = 'COPY';
        }, 2000);
    });
}
