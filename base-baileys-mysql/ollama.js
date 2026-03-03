const fetch = require("node-fetch");

const OLLAMA_URL = "http://localhost:11434/api/generate";

async function chat(promptBase, userInput, resumenContexto) {
    try {
        let fullPrompt = `${promptBase}\n\n`;

        if (resumenContexto) {
            fullPrompt += `Resumen del contexto previo:\n${resumenContexto}\n\n`;
        }

        fullPrompt += `Usuario: ${userInput}\nAsistente:`;

        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "phi3:mini",
                prompt: fullPrompt,
                stream: false,
                options: {
                    temperature: 0,
                    top_p : 0.1,
                    repeat_penalty: 1.2
                }
            })
        });

        const data = await response.json();

        return { content: data.response.trim() };

    } catch (error) {
        console.error("Error al conectar con Ollama:", error);
        return { content: "Lo siento, hubo un error al procesar tu consulta." };
    }
}

async function chatResoome(promptBase, messagesHistory) {
    try {
        const fullPrompt = `
${promptBase}

Conversación:
${messagesHistory}

Genera un resumen claro:
`;

        const response = await fetch(OLLAMA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "tinyllama",
                prompt: fullPrompt,
                stream: false,
                options: {
                    temperature: 0,
                    top_p: 0.1,
                    repeat_penalty: 1.2
                }
            })
        });

        const data = await response.json();

        return { content: data.response.trim() };

    } catch (error) {
        console.error("Error al generar resumen:", error);
        return { content: "Error generando resumen." };
    }
}

module.exports = {
    chat,
    chatResoome
};