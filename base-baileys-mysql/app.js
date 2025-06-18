const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')
require("dotenv").config();
console.log("Variables de entorno cargadas:", process.env.MYSQL_DB_HOST); 

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
const MySQLAdapter = require('@bot-whatsapp/database/mysql')


const path = require("path");
const fs = require("fs");
const { chat, chatResoome } = require("./chatGPT");
const { guardarConsulta, prompt, getImageUrlForSubtema, getResoomeForChat } = require("./consultas.controllers.js"); 

const saludoPath = path.join(__dirname, "mensajes", "saludo.txt");
const saludo = fs.readFileSync(saludoPath, "utf8");

const seguirConsultandoPath = path.join(__dirname, "mensajes", "seguirConsultando.txt");
const seguirConsulta = fs.readFileSync(seguirConsultandoPath, "utf8");

const promptOrganizarPath = path.join(__dirname, "mensajes", "promptOrganizar.txt");
const promptOrganizar = fs.readFileSync(promptOrganizarPath, "utf8");

const promptResoomePath = path.join(__dirname, "mensajes", "promptResumen.txt");
const promptResoome = fs.readFileSync(promptResoomePath, "utf8");

const flowEntrada = addKeyword([])
    .addAnswer(saludo, {capture : true}, async(ctx, {from:destructuredFrom, gotoFlow,flowDynamic}) => {
        const from = destructuredFrom || ctx.from;
        const consulta = ctx.body;
        console.log("flowConsultas - Valor de 'from':", from); 
        await consultFunc(promptOrganizar, consulta, ctx, gotoFlow, flowDynamic, from)
    });

const flowSeguirConsultando = addKeyword(EVENTS.ACTION)
    .addAnswer(seguirConsulta, { capture: true }, async (ctx, { gotoFlow, flowDynamic }) => {
        const mensaje = ctx.body.trim().toLowerCase();
        const from = ctx.from;

        if (mensaje === 'no') { 
            return gotoFlow(flowDespedida);
        }

        if (mensaje === 'si' || mensaje === 'sí') { 
            return gotoFlow(flowConsultas); 
        }

        const consulta = ctx.body;
        console.log("flowConsultas - Valor de 'from':", from); 

        await consultFunc(promptOrganizar, consulta, ctx, gotoFlow, flowDynamic, from)
    });

const flowConsultas = addKeyword(EVENTS.ACTION)
    .addAnswer("Haz tu consulta:", { capture: true }, async (ctx, {gotoFlow, flowDynamic, from: destructuredFrom}) => {
        const from = destructuredFrom || ctx.from;
        const consulta = ctx.body;
        console.log("flowConsultas - Valor de 'from':", from); 

        await consultFunc(promptOrganizar, consulta, ctx, gotoFlow, flowDynamic, from)
    });

const flowDespedida = addKeyword(EVENTS.ACTION)
    .addAnswer('Gracias por hacer uso del chatbot UTL. ¡Hasta luego! 👋')
    .addAction(async(_, {flowDynamic})=>{
        await flowDynamic('Si existe algo mas, no dudes en contactarnos!');
    });

async function generarResumenDeConversacion(rows, promptBase) {
    let conversacionCompleta = "";

    for (const row of rows) {
        conversacionCompleta += `Usuario: ${row.usuario}\n`;
        conversacionCompleta += `Asistente: ${row.respuesta}\n`;
    }

    const resultadoResumen = await chatResoome(promptBase, conversacionCompleta);

    return resultadoResumen.content;
}

async function consultFunc(promptOrganizar, consulta, ctx, gotoFlow, flowDynamic) {
    try { 
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

        const messages = await getResoomeForChat(ctx.from)
        const resoome = await generarResumenDeConversacion(messages, promptResoome)

        const respuestaConsultaRaw = await chat(promptTextForChat, consulta, resoome);
        const respuestaTexto = respuestaConsultaRaw.content;

        const urlImagen = await getImageUrlForSubtema(subtemaId); 
        console.log(`URL de imagen para subtema ${subtemaId}:`, urlImagen);

        await guardarConsulta({
            numero: ctx.from,
            mensaje: consulta,
            subtema_id: subtemaId,
            respuesta: respuestaConsultaRaw,
        });

        if (urlImagen) {
            await flowDynamic([{ body: respuestaTexto, media: urlImagen }]);
        } else {
            await flowDynamic(respuestaTexto);
        }
        return gotoFlow(flowSeguirConsultando);
    } catch (error) {
        console.error("Error in consultFunc:", error);
        await flowDynamic("Lo siento, hubo un error procesando tu consulta. Por favor, inténtalo de nuevo más tarde.");
        return gotoFlow(flowDespedida); 
    }
}
    
const main = async () => {
    const adapterDB = new MySQLAdapter({
        host: process.env.MYSQL_DB_HOST,
        user: process.env.MYSQL_DB_USER,
        database: process.env.MYSQL_DB_NAME,
        password: process.env.MYSQL_DB_PASSWORD,
        port: parseInt(process.env.MYSQL_DB_PORT || '3306'),
    })
    const adapterFlow = createFlow([flowSeguirConsultando,flowEntrada ,flowConsultas, flowDespedida])
    const adapterProvider = createProvider(BaileysProvider)
    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })
    QRPortalWeb()
}

main()
