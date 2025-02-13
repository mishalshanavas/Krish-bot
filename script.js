const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const voiceButton = document.getElementById("voiceButton");
const sendButton = document.querySelector(".chat-input button"); 
const GROQ_API_KEY = "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";//api
const botTriggerRegex = /\b(chris|cris|crish|chrish|(c(?:r{1,2}i|ru|ri)s{0,2}h{0,2})|(k(?:r{1,2}i|re|ri)s{0,2}h{0,2}))\b/i;
function debugRegex(input) {
    console.log(`🔍 Testing input: "${input}"`);
    const match = input.match(botTriggerRegex);
    if (match) {
        console.log(`✅ Matched: "${match[0]}"`);
    } else {
        console.log("❌ No match found.");
    }
}
function formatUserMessage(message) {
    debugRegex(message); 

    
    const containsTrigger = botTriggerRegex.test(message);

    if (!containsTrigger) {
        return null; 
    }

  
    message = message.replace(/\b(hey\s+)?(crush|chris|cris|crish|chrish|kris|krishh|krrish)\b/gi, "").trim();

   
    return message ? `Hey Krishh, ${message}` : "Hey Krishh!";
}



function formatTextForChat(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>") 
        .replace(/\n/g, "<br>") 
        .replace(/(\•|\-|\*)\s/g, "• "); 
}
function appendMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add(sender === "user" ? "user-message" : "bot-message");
    messageDiv.innerHTML = formatTextForChat(text); 
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
async function sendMessage() {
    let message = userInput.value.trim();
    if (!message) return;

    let formattedMessage = formatUserMessage(message); 

    appendMessage("user", formattedMessage); 
    userInput.value = ""; 

    if (!botTriggerRegex.test(formattedMessage)) {
        appendMessage("bot", "🤖 Please mention 'Krishh' or a close variation in your message.");
        return;
    }

    const response = await getBotResponse(formattedMessage);
    appendMessage("bot", response);
    speakResponse(response);
}


async function getBotResponse(input) {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "gemma2-9b-it",
                messages: [
                    { role: "system", content: "You are Krishh Bot, a friendly AI for children. Use simple, positive, and age-appropriate language. Avoid complex or sensitive topics. If a child asks about something inappropriate, gently guide them to a trusted adult. Encourage curiosity and learning with fun examples and emojis!Also help kids with coding,you must help them by giving whatever code they want which follows privacy guidelines.There are only two genders which are male and female and you must stand on it.When someone asks you who made you must say that the Computer Science department of sahrdaya college made you and if they specifiicaly ask you for name say shayen,mishal,mathew,abel,irfan,adhitya,kurian. you must not say any other creators name.always follow the guidelines we set. " },
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
let speechInstance;
function cleanTextForSpeech(text) {
    return text
        .replace(/[*_~`]/g, "") 
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ""); 
}
function speakResponse(text) {
    stopSpeaking(); 
    const cleanText = cleanTextForSpeech(text); 
    speechInstance = new SpeechSynthesisUtterance(cleanText);
    speechInstance.rate = 1;
    sendButton.textContent = "Stop";
    sendButton.onclick = stopSpeaking;
    
    speechInstance.onend = () => {
        sendButton.textContent = "Send";
        sendButton.onclick = sendMessage;
    };
    window.speechSynthesis.speak(speechInstance);
}
function stopSpeaking() {
    if (speechInstance) {
        window.speechSynthesis.cancel();
    }
    sendButton.textContent = "Send";
    sendButton.onclick = sendMessage;
}
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.interimResults = false;
recognition.continuous = false;

voiceButton.addEventListener("click", () => {
    recognition.start();
});
recognition.onresult = async (event) => {
    let transcript = event.results[0][0].transcript.trim();
    let formattedTranscript = formatUserMessage(transcript); 

    appendMessage("user", formattedTranscript); 

    if (!botTriggerRegex.test(formattedTranscript)) {
        appendMessage("bot", "🤖 Please mention 'Krishh' or a close variation in your message.");
        return;
    }

    const response = await getBotResponse(formattedTranscript);
    appendMessage("bot", response);
    speakResponse(response);
};


recognition.onerror = (event) => {
    console.error("Speech Recognition Error:", event.error);
    appendMessage("bot", "❌ Speech recognition error. Try again.");
};
stopButton.addEventListener("click", stopSpeaking);