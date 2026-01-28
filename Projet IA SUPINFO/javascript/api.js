document.addEventListener("DOMContentLoaded", function () {
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatMessages = document.getElementById("chat-messages");
    const resetChatButton = document.getElementById("reset-chat-button");
    const loaderElement = document.getElementById("loader");
    const bouton = document.getElementById("bouton");

    // Ollama API (compatible toutes versions)
    const OLLAMA_API_URL = "http://localhost:11434/api/generate";

    let conversationHistory = [];

    // Animation du bouton quand l'utilisateur tape
    userInput.addEventListener('input', () => {
        if (userInput.value.trim().length > 0) {
            bouton.classList.add('ready');
        } else {
            bouton.classList.remove('ready');
        }
    });

    function appendMessage(sender, text) {
        const messageElement = document.createElement("div");
        messageElement.className = `message ${sender.toLowerCase()}-message`;

        const senderElement = document.createElement("strong");
        senderElement.textContent = sender + ": ";

        const textElement = document.createElement("span");
        textElement.innerHTML = formatCodeBlocks(text);

        messageElement.appendChild(senderElement);
        messageElement.appendChild(textElement);
        chatMessages.appendChild(messageElement);

        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function toggleLoaderVisibility(show) {
        if (loaderElement) {
            if (show) {
                loaderElement.classList.remove("loader-hidden");
            } else {
                loaderElement.classList.add("loader-hidden");
            }
        }
    }

    chatForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const userMessage = userInput.value.trim();
        if (!userMessage) return;

        appendMessage("User", userMessage);
        userInput.value = "";
        bouton.classList.remove('ready'); // Retire l'animation après envoi
        userInput.focus();

        toggleLoaderVisibility(true);

        conversationHistory.push({
            role: "user",
            content: userMessage,
        });

        // Sauvegarde de l'historique après chaque message
        saveConversationHistory();

        try {
            const prompt = conversationHistory
                .map(m => `${m.role}: ${m.content}`)
                .join("\n");

            const requestData = {
                model: "phi4:latest",
                prompt: prompt,
                stream: false,
            };

            const response = await fetch(OLLAMA_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestData),
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP ${response.status}`);
            }

            const data = await response.json();

            const assistantReply = data.response || "Réponse vide.";

            conversationHistory.push({
                role: "assistant",
                content: assistantReply,
            });

            appendMessage("Assistant", assistantReply);

            // Sauvegarde de l'historique après la réponse de l'assistant
            saveConversationHistory();

        } catch (error) {
            console.error("Erreur Ollama :", error);
            appendMessage(
                "Système",
                "❌ Impossible de contacter Ollama. Vérifie qu'il est lancé."
            );
        } finally {
            toggleLoaderVisibility(false);
        }
    });

    // Gestion du bouton "Réinitialiser"
    resetChatButton.addEventListener("click", function () {
        resetConversation();
    });

    function formatCodeBlocks(text) {
        const formattedText = text.replace(
            /```([a-z]*)\n([\s\S]*?)\n```/g,
            function (_, language, code) {
                return `<pre><code class="language-${language}">${escapeHTML(code)}</code></pre>`;
            }
        );

        return formattedText.replace(/`([^`]+)`/g, "<code>$1</code>");
    }

    function escapeHTML(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ------------------- Gestion de l'historique -------------------

    function saveConversationHistory() {
        localStorage.setItem(
            "conversationHistory",
            JSON.stringify(conversationHistory)
        );
        console.log("Historique de conversation sauvegardé.");
    }

    function loadConversationHistory() {
        const savedHistory = localStorage.getItem("conversationHistory");
        if (savedHistory) {
            conversationHistory = JSON.parse(savedHistory);

            chatMessages.innerHTML = "";

            conversationHistory.forEach((message) => {
                const sender = message.role === "user" ? "User" : "Assistant";
                appendMessage(sender, message.content);
            });

            console.log("Historique de conversation chargé.");
        } else {
            appendMessage(
                "Système",
                "Bienvenue ! Posez votre première question à l'IA."
            );
            console.log("Aucun historique de conversation trouvé.");
        }
    }

    function resetConversation() {
        conversationHistory = [];
        chatMessages.innerHTML = "";
        userInput.value = "";
        bouton.classList.remove('ready');
        userInput.focus();

        appendMessage(
            "Système",
            "Nouvelle conversation démarrée. Posez votre première question !"
        );

        console.log("Conversation réinitialisée.");
        localStorage.removeItem("conversationHistory");
    }

    // Charger l'historique au démarrage
    loadConversationHistory();
});