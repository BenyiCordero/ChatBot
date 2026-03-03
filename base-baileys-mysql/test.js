const fetch = require("node-fetch");

async function test() {
    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "phi3:mini",
                prompt: "Responde solo: Hola",
                stream: false
            })
        });

        const data = await response.json();
        console.log("Respuesta:", data.response);

    } catch (error) {
        console.error("Error:", error);
    }
}

test();