const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function chat(promptBase, userInput, resumenContexto) {
    try {
        const messages = [
            { role: "system", content: promptBase }
        ];

        if (resumenContexto) {
            messages.push({ role: "system", content: `Resumen del contexto previo: ${resumenContexto}` });
        }

        // Finalmente, el mensaje actual del usuario
        messages.push({ role: "user", content: userInput });

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
        });

        return response.choices[0].message;
    } catch (error) {
        console.error("Error al conectar con OpenAI:", error);
        return { content: "Lo siento, hubo un error al procesar tu consulta." };
    }
};

async function chatResoome(promptBase, messagesHistory) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: promptBase },
                { role: "user", content: messagesHistory }
            ],
        });

        return response.choices[0].message;
    } catch (error) {
        console.error("Error al conectar con OpenAI:", error);
        return { content: "Lo siento, hubo un error al procesar tu consulta." };
    }
}

module.exports = {
    chat,
    chatResoome
};