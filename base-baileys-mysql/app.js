const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')
require("dotenv").config();
console.log("Variables de entorno cargadas:", process.env.MYSQL_DB_HOST); // Agrega esta línea


const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MySQLAdapter = require('@bot-whatsapp/database/mysql')


const path = require("path");
const fs = require("fs");
const chat = require("./chatGPT");
const { guardarConsulta, prompt } = require("./consultas.controllers.js"); // Correctly import both functions

// Leer archivos
const saludoPath = path.join(__dirname, "mensajes", "saludo.txt");
const saludo = fs.readFileSync(saludoPath, "utf8");

const seguirConsultandoPath = path.join(__dirname, "mensajes", "seguirConsultando.txt");
const seguirConsulta = fs.readFileSync(seguirConsultandoPath, "utf8");

const promptOrganizarPath = path.join(__dirname, "mensajes", "promptOrganizar.txt");
const promptOrganizar = fs.readFileSync(promptOrganizarPath, "utf8");


const flowSeguirConsultando = addKeyword(EVENTS.ACTION)
    .addAnswer(seguirConsulta, { capture: true }, async (ctx, { gotoFlow, flowDynamic }) => {
        const mensaje = ctx.body.trim().toLowerCase();
        const from = ctx.from;

        if (mensaje === 'no') {
            return gotoFlow(flowDespedida);
        }

        if (mensaje === 'si' || mensaje === 'sí') {
            return gotoFlow(flowConsultas); //Manda a flowConsultas para preguntar sobre su siguiente consulta.
        }

        // Si no es "sí" o "no", lo tratamos como una consulta directamente
        const consulta = ctx.body;
        console.log("flowConsultas - Valor de 'from':", from); 

        const respuestaClasificacionRaw = await chat(promptOrganizar, consulta);
        console.log("Respuesta cruda de clasificación:", respuestaClasificacionRaw); 
        const clasificacionTexto = respuestaClasificacionRaw.content.trim();

        const promptR = await prompt();
        const promptTextForChat = promptR ? promptR.content : "";

        let subtemaId = null;
        const partesClasificacion = clasificacionTexto.split(' - ');
        if (partesClasificacion.length > 0 && !clasificacionTexto.startsWith('0 -')) {
            const posibleSubtemaId = parseInt(partesClasificacion[0]);
            if (!isNaN(posibleSubtemaId)) {
                subtemaId = posibleSubtemaId;
            }
        }
        if (subtemaId === null) {
            subtemaId = 0;
        }

        const respuestaConsultaRaw = await chat(promptTextForChat, consulta);

        await guardarConsulta({
            numero: from,
            mensaje: consulta,
            subtema_id: subtemaId,
            respuesta: respuestaConsultaRaw,
        });

        await flowDynamic(respuestaConsultaRaw.content);

        // Repetimos el flujo para seguir escuchando
        return gotoFlow(flowSeguirConsultando);
    });

    
    // Flujo por si el usuario dice "no"
const flowDespedida = addKeyword(EVENTS.ACTION)
    .addAnswer('Gracias por hacer uso del chatbot UTL. ¡Hasta luego! 👋')
    .addAction(async({flowDynamic})=>{
        await flowDynamic('Si existe algo mas, no dudes en contactarnos!');
    });


// Flujo para cuando el usuario dice "sí"
const flowConsultas = addKeyword(EVENTS.ACTION)
    .addAnswer("Haz tu consulta:", { capture: true }, async (ctx, {gotoFlow, flowDynamic, from: destructuredFrom}) => {
        const from = destructuredFrom || ctx.from;
        const consulta = ctx.body;
        console.log("flowConsultas - Valor de 'from':", from); 

        const respuestaClasificacionRaw = await chat(promptOrganizar, consulta);
        console.log("Respuesta cruda de clasificación:", respuestaClasificacionRaw); 
        const clasificacionTexto = respuestaClasificacionRaw.content.trim();

        

        const promptR = await prompt(); 
        const promptTextForChat = promptR ? promptR.content : ""; // Add this line
        let subtemaId = null;
        const partesClasificacion = clasificacionTexto.split(' - ');
        if (partesClasificacion.length > 0 && !clasificacionTexto.startsWith('0 -')){
            const posibleSubtemaId = parseInt(partesClasificacion[0]);
            if (!isNaN(posibleSubtemaId)){
                subtemaId = posibleSubtemaId;
            }
        }
        
        if (subtemaId ===null){
            subtemaId = 0;
        }
        const respuestaConsultaRaw = await chat(promptTextForChat, consulta);

        await guardarConsulta({
            numero: from,
            mensaje: consulta,
            subtema_id: subtemaId,
            respuesta: respuestaConsultaRaw
        });

        await flowDynamic(respuestaConsultaRaw.content);
        return gotoFlow(flowSeguirConsultando);

    });

// Flujo inicial que responde a "hola", "hi", etc.
const flowEntrada = addKeyword([])
    .addAnswer(saludo, {capture : true}, async(ctx, {from:destructuredFrom, gotoFlow,flowDynamic}) => {
        const from = destructuredFrom || ctx.from;
        const consulta = ctx.body;
        console.log("flowConsultas - Valor de 'from':", from); 

        const respuestaClasificacionRaw = await chat(promptOrganizar, consulta);
        console.log("Respuesta cruda de clasificación:", respuestaClasificacionRaw); 
        const clasificacionTexto = respuestaClasificacionRaw.content.trim();

        const promptR = await prompt();
        const promptTextForChat = promptR ? promptR.content : ""; // Add this line
        let subtemaId = null;
        const partesClasificacion = clasificacionTexto.split(' - ');
        if (partesClasificacion.length >0 && !clasificacionTexto.startsWith('0 -')){
            const posibleSubtemaId = parseInt(partesClasificacion[0]);
            if (!isNaN(posibleSubtemaId)){
                subtemaId = posibleSubtemaId;
            }
        }
        if (subtemaId ===null){
            subtemaId = 0;
        }
        const respuestaConsultaRaw = await chat(promptTextForChat, consulta);

        await guardarConsulta({
            numero: from,
            mensaje: consulta,
            subtema_id : subtemaId,
            respuesta: respuestaConsultaRaw
        });

        await flowDynamic(respuestaConsultaRaw.content);
        return gotoFlow(flowSeguirConsultando);
    });
    
const main = async () => {
    const adapterDB = new MySQLAdapter({
        host: process.env.MYSQL_DB_HOST,
        user: process.env.MYSQL_DB_USER,
        database: process.env.MYSQL_DB_NAME,
        password: process.env.MYSQL_DB_PASSWORD,
        port: parseInt(process.env.MYSQL_DB_PORT || '3306'),
    })
    const adapterFlow = createFlow([flowSeguirConsultando,flowEntrada ,flowConsultas])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
