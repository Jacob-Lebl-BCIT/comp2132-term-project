// COMP 2132 Project
// Jacob Lebl A01384181

// Constants
const MAX_GUESSES: number = 7;
const WORDS_FILE: string = "data/words.json";

// Order of images to reveal
const IMAGE_FILES: string[] = [
    "images/head.webp",
    "images/body.webp",
    "images/legs.webp",
    "images/tendril1.webp",
    "images/tendril2.webp",
    "images/tendril3.webp",
    "images/tendril4.webp"
];

type WordsEntry = {
    word: string;
    hint: string;
}

interface GameManager {
    wordsList: WordsEntry[];
    secretWord: string;
    secretHint: string;
    guessedSet: Set<string>;
    wrongCount: number;
    isActive: boolean;
}

// object to manage the game parameters and current progress
const gameManager: GameManager = {
    wordsList: [],
    secretWord: "",
    secretHint: "",
    guessedSet: new Set<string>(),
    wrongCount: 0,
    isActive: true
};


const segmentBox = document.getElementById("segment-container") as HTMLElement;
const hintText = document.getElementById("hint-display") as HTMLElement;
const wordContainer = document.getElementById("word-display") as HTMLElement;
const statusMessage = document.getElementById("message-display") as HTMLElement;
const virtualKeyboard = document.getElementById("keyboard") as HTMLElement;
const playAgainButton = document.getElementById("reset-btn") as HTMLButtonElement;
const textGuessForm = document.getElementById("guess-form") as HTMLFormElement;
const textInput = document.getElementById("letter-input") as HTMLInputElement;


/** animateElementFade
 * @param {HTMLElement} elem the element to animate.
 * fade-in animation on a DOM element.
 */
function animateElementFade(elem: HTMLElement): void {
    if (!elem || !(elem instanceof HTMLElement)) {
        return;
    }

    elem.animate(
        [
            {opacity: 0},
            {opacity: 1}
        ],
        {
            duration: 400,
            fill: "forwards"
        }
    );
}

/** setupImageSegments
 * Pre-injects the image elements into the page.
 */
function setupImageSegments(): void {
    let imagesHtml: string = "";

    let indexCount = 0;
    for (const imgPath of IMAGE_FILES) {
        imagesHtml += `<img src="${imgPath}" class="segment-img" id="seg-${indexCount}" alt="Part ${indexCount + 1}">`;
        indexCount++;
    }

    segmentBox.innerHTML = imagesHtml;
}


async function fetchWordsData(): Promise<void> {
    try {
        const response = await fetch(WORDS_FILE);
        const data = await response.json()

        if (Array.isArray(data)) {
            gameManager.wordsList = data;
        }
    } catch (err) {
        console.error("Could not fetch words data", err);
        statusMessage.textContent = "error loading words JSON";
    }
}

/**
 * Builds the interactive keyboard keys
 */
function createKeyboardKeys(): void {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let keysHtml: string = "";

    for (const letter of alphabet) {
        keysHtml += `<button class="key" data-letter="${letter}">${letter}</button>`;
        // data-* is an html5 convention for defining custom attributes
        // https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Use_data_attributes
    }

    virtualKeyboard.innerHTML = keysHtml;

    // Add click listeners to new keys
    const buttons = virtualKeyboard.querySelectorAll(".key");
    for (const btnNode of buttons) {
        const btn = btnNode as HTMLButtonElement; // 'as' is a type assertion
        btn.addEventListener("click", () => {
            const chosenLetter = btn.getAttribute("data-letter");
            if (chosenLetter) {
                processLetterGuess(chosenLetter);
            }
        });
    }
}

/**
 * Displays the current word slots (either letter or blank line).
 */
function refreshWordDisplay(): void {
    let wordHtml: string = "";

    for (const letter of gameManager.secretWord) {
        const lowerChar = letter.toLowerCase();
        if (gameManager.guessedSet.has(lowerChar)) {
            wordHtml += `<span>${letter.toUpperCase()}</span>`;
        } else {
            wordHtml += `<span>&nbsp;</span>`;
            // &nbsp non-breaking space
        }
    }

    wordContainer.innerHTML = wordHtml;
}

/**
 * Checks for win/loss conditions.
 */
function evaluateGameState(): void {
    // loss check
    if (gameManager.wrongCount >= MAX_GUESSES) {
        finishGame(false);
        return;
    }

    // 2. Win check
    let wordCompleted = true;
    for (const char of gameManager.secretWord) {
        if (!gameManager.guessedSet.has(char.toLowerCase())) {
            wordCompleted = false;
            break;
        }
    }


    if (wordCompleted) {
        finishGame(true);
    }
}

/**
 * Process a letter guess from any input source
 */
function processLetterGuess(letter: string): void {
    if (typeof letter !== "string") {
        return;
    }
    if (letter.length !== 1) {
        return;
    }

    if (!gameManager.isActive) {
        return;
    }

    const cleanLetter = letter.toLowerCase();

    // Avoid double guesses
    if (gameManager.guessedSet.has(cleanLetter)) {
        return;
    }

    // track guess
    gameManager.guessedSet.add(cleanLetter);

    // Disable virtual keyboard key
    const keyBtn = virtualKeyboard.querySelector(`[data-letter="${cleanLetter}"]`) as HTMLButtonElement;
    const wordContainsLetter = gameManager.secretWord.toLowerCase().includes(cleanLetter);

    if (keyBtn) {
        keyBtn.disabled = true;
        if (wordContainsLetter) {
            keyBtn.classList.add("correct");
        } else {
            keyBtn.classList.add("incorrect");
        }
    }

    // apply result
    if (wordContainsLetter) {
        refreshWordDisplay();
        animateElementFade(wordContainer);
    } else {
        // Show next image segment
        const segmentImg = document.getElementById(`seg-${gameManager.wrongCount}`);
        if (segmentImg) {
            segmentImg.classList.add("revealed");
        }
        gameManager.wrongCount++;
    }

    evaluateGameState();
}

/**
 * Locks inputs and displays win/loss results.
 */
function finishGame(isWon: boolean): void {
    gameManager.isActive = false;

    // disable all keyboard keys
    const keys = virtualKeyboard.querySelectorAll(".key");
    for (const keyNode of keys) {
        const btn = keyNode as HTMLButtonElement;
        btn.disabled = true;
    }

    textInput.disabled = true;
    const submitBtn = textGuessForm.querySelector("button") as HTMLButtonElement;
    if (submitBtn) {
        submitBtn.disabled = true;
    }

    // Display result message
    if (isWon) {
        statusMessage.textContent = "You won! You escaped the Slenderman.";
        statusMessage.className = "message-display win";
    } else {
        // Reveal the secret word to the user in red
        let revealHtml = "";
        for (const char of gameManager.secretWord) {
            revealHtml += `<span style="color: #ff4444; border-bottom-color: #ff4444;">${char.toUpperCase()}</span>`;
        }
        wordContainer.innerHTML = revealHtml;

        statusMessage.textContent = "You lost. The Slenderman took you.";
        statusMessage.className = "message-display lose";
    }

    animateElementFade(statusMessage);

    playAgainButton.classList.remove("hidden");
}

/**
 * Resets variables and chooses a new word to play.
 */
function selectRandomWord(): void {
    if (gameManager.wordsList.length === 0) {
        return;
    }

    // reset state
    gameManager.secretWord = "";
    gameManager.secretHint = "";
    gameManager.guessedSet.clear();
    gameManager.wrongCount = 0;
    gameManager.isActive = true;

    // choose randomly
    const randomIndex = Math.floor(Math.random() * gameManager.wordsList.length);
    const item = gameManager.wordsList[randomIndex];
    gameManager.secretWord = item.word;
    gameManager.secretHint = item.hint;

    // reset inputs
    textInput.disabled = false;
    textInput.value = "";
    const submitBtn = textGuessForm.querySelector("button") as HTMLButtonElement;
    if (submitBtn) {
        submitBtn.disabled = false;
    }

    // clear message and images
    statusMessage.textContent = "";
    statusMessage.className = "message-display";
    playAgainButton.classList.add("hidden");


    const segmentImages = segmentBox.querySelectorAll(".segment-img");
    for (const imgNode of segmentImages) {
        imgNode.classList.remove("revealed");
    }

    hintText.textContent = `HINT: ${gameManager.secretHint}`;
    refreshWordDisplay();
    createKeyboardKeys();

}

// === Event Listeners ===

// Listen to text input form
textGuessForm.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    const char = textInput.value.trim().toLowerCase();

    if (char.length === 1 && /^[a-zA-Z]$/.test(char)) {
        processLetterGuess(char);
    }

    textInput.value = "";
    textInput.focus();
});

// Listen to keyup on document (when input box is not focused)
window.addEventListener("keyup", (e: KeyboardEvent) => {
    if (document.activeElement === textInput) {
        return;
    }

    const key = e.key;
    if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
        processLetterGuess(key);

    }
});


playAgainButton.addEventListener("click", () => {
    selectRandomWord();
});

// Initialize on load
window.addEventListener("DOMContentLoaded", async () => {
    setupImageSegments();
    await fetchWordsData();
    selectRandomWord();
});
