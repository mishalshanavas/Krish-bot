const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.querySelector(".chat-input button"); 
const toggleListeningButton = document.getElementById("toggleListeningButton"); // Toggle button
const GROQ_API_KEY = "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"; // API key
const wakeUpWord = /\b(hey\s+)?(krishh|krrish|kris|krish|krris|krishna|crush|hello)\b/i; // Wake word regex

let speechInstance;
let isRecognitionRunning = false; // Flag to track recognition state
let isPassiveListeningEnabled = true; // Flag to track passive listening state

// Function to format text for chat
function formatTextForChat(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>") 
        .replace(/\n/g, "<br>") 
        .replace(/(\•|\-|\*)\s/g, "• "); 
}

// Function to append a message to the chat
function appendMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(sender === "user" ? "user-message" : "bot-message");
    messageDiv.innerHTML = formatTextForChat(text); 
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to get bot response from Groq API
async function getBotResponse(input) {
    try {
        const systemPrompt = "You are Krishh Bot. Answer directly without introducing yourself. Keep responses friendly and use emojis when appropriate. When someone asks who made you, say the Computer Science department of Sahrdaya College made you. If they ask specifically for names, say Shayen, Mishal, Mathew, Abel, Irfan, Adhitya, Kurian.";

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gemma2-9b-it",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: input }
                ]
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("API Error:", data);
            return `❌ API Error: ${data.error?.message || "Unknown error"}`;
        }
        return data.choices?.[0]?.message?.content || "Sorry, I didn't understand that.";
    } catch (error) {
        console.error("Fetch Error:", error);
        return "❌ Network error. Check API key & connection.";
    }
}

// Function to clean text for speech
function cleanTextForSpeech(text) {
    return text
        .replace(/[*_~`]/g, "") // Remove markdown formatting
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, ""); // Remove all emojis, including flags
}

// Function to speak the bot's response
function speakResponse(text) {
    // Cancel any ongoing speech and stop recognition to free the mic
    stopSpeaking();
    stopRecognition();

    // Clean the text for speech synthesis
    const cleanText = cleanTextForSpeech(text);
    
    // Create a new utterance with desired text
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-IN";     // Set language to US English
    utterance.rate = 1;           // Adjust rate as needed (0.75 to 1.25 are common)
    utterance.pitch = 1;          // Standard pitch
    utterance.volume = 1;         // Full volume

    // Function to select a quality voice (preferably a US female voice for Alexa-like quality)
    function setPreferredVoice() {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length) {
            // Try to select a US English female voice; fallback to first voice if not found.
            const preferredVoice = voices.find(voice =>
                voice.lang === "en-US" &&
                (voice.name.toLowerCase() || voice.name.toLowerCase().includes("en-us"))
            ) || voices[0];
            utterance.voice = preferredVoice;
            console.log("Using voice:", preferredVoice.name);
        }
    }

    // Try setting voice immediately; if voices aren't loaded, wait for the event.
    setPreferredVoice();
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = setPreferredVoice;
    }

    // Optional: Log when speech starts and ends
    utterance.onstart = () => {
        console.log("Speech started");
    };
    utterance.onend = () => {
        console.log("Speech ended. Restarting recognition...");
        // Restart recognition after a short delay
        setTimeout(() => {
            if (isPassiveListeningEnabled) startRecognition();
        }, 500);
    };

    // Speak the utterance and store it (for potential cancellation)
    speechInstance = utterance;
    window.speechSynthesis.speak(utterance);
}

// Function to stop any ongoing speech
function stopSpeaking() {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
    }
}

// Initialize speech recognition
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.interimResults = false;
recognition.continuous = true; // Keep the microphone on

// Function to start recognition
function startRecognition() {
    if (!isRecognitionRunning) {
        recognition.start();
        isRecognitionRunning = true;
        console.log("Recognition started.");
    }
}

// Function to stop recognition
function stopRecognition() {
    if (isRecognitionRunning) {
        recognition.stop();
        isRecognitionRunning = false;
        console.log("Recognition stopped.");
    }
}

// Event listener for recognition start
recognition.onstart = () => {
    isRecognitionRunning = true;
    console.log("Recognition started.");
};

// Event listener for recognition end
recognition.onend = () => {
    isRecognitionRunning = false;
    if (isPassiveListeningEnabled) {
        console.log("Recognition ended. Restarting...");
        setTimeout(() => {
            startRecognition();
        }, 1000);
    }
};

// Event listener for recognition results
recognition.onresult = async (event) => {
    if (!isPassiveListeningEnabled) return; // Ignore if passive listening is disabled

    let transcript = event.results[event.results.length - 1][0].transcript.trim().toLowerCase();
    console.log("Transcript:", transcript);

    // Check if the wake word is detected in the transcript
    if (wakeUpWord.test(transcript)) {
        console.log("Wake word detected!");
        appendMessage("user", transcript);

        // Remove the wake word from the transcript before sending to the bot
        const message = transcript.replace(wakeUpWord, "").trim();

        if (message) {
            const response = await getBotResponse(message);
            appendMessage("bot", response);
            speakResponse(response);
        } else {
            const greeting = await getBotResponse("Give me a greeting");
            appendMessage("bot", greeting);
            speakResponse(greeting);
        }
    }
};

// Event listener for recognition errors
recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);

    if (event.error === "no-speech") {
        console.log("No speech detected. Restarting recognition...");
    } else {
        console.log("Other error detected. Restarting recognition...");
    }

    stopRecognition(); // Stop recognition before restarting
    setTimeout(() => {
        startRecognition(); // Restart recognition
    }, 1000);
};

// Function to toggle passive listening
function togglePassiveListening() {
    isPassiveListeningEnabled = !isPassiveListeningEnabled;

    if (isPassiveListeningEnabled) {
        startRecognition();
        toggleListeningButton.textContent = "Disable Passive Listening";
        appendMessage("bot", "Passive listening enabled. Say 'Hey Krishh' to start.");
    } else {
        stopRecognition();
        toggleListeningButton.textContent = "Enable Passive Listening";
        appendMessage("bot", "Passive listening disabled.");
    }
}

// Add event listener to the toggle button
toggleListeningButton.addEventListener("click", togglePassiveListening);

// Start recognition initially
startRecognition();
