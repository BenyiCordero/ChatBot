const db = require('./db')


function getCurrentWeek(){

    const ahora = new Date()
    const dia = ahora.getDate()

    return Math.floor((dia - 1) / 7) + 1

}



function limpiarNumero(numero){

    if (!numero) return null

    numero = numero.replace('@s.whatsapp.net','')

    if(numero.startsWith('521')){
        numero = numero.slice(3)
    }
    else if(numero.startsWith('52')){
        numero = numero.slice(2)
    }

    return numero.trim()

}



async function guardarConsulta({ numero, mensaje, subtema_id, respuesta }) {

    numero = limpiarNumero(numero)

    const conn = await db.getConnection()

    try {

        let [rows] = await conn.query(
            "SELECT id FROM usuario WHERE numero_celular = ?",
            [numero]
        )

        let usuario_id

        if (rows.length > 0) {

            usuario_id = rows[0].id

        } else {

            const [insertResult] = await conn.query(
                "INSERT INTO usuario (numero_celular) VALUES (?)",
                [numero]
            )

            usuario_id = insertResult.insertId

        }


        let tema_id = null

        if (subtema_id !== null && subtema_id !== undefined) {

            const [subtemaRows] = await conn.query(
                "SELECT tema_id FROM subtema WHERE id = ?",
                [subtema_id]
            )

            if (subtemaRows.length > 0) {
                tema_id = subtemaRows[0].tema_id
            }

        }


        const ahora = new Date()

        const year = ahora.getFullYear()
        const month = ahora.getMonth() + 1
        const day = ahora.getDate()
        const week = getCurrentWeek()


        const [consultaResult] = await conn.query(

            `INSERT INTO consulta
            (usuario_id, mensaje, subtema_id, day, month, year, week)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            
            [usuario_id, mensaje, subtema_id, day, month, year, week]

        )


        const consulta_id = consultaResult.insertId


        await conn.query(

            `INSERT INTO respuesta (mensaje, consulta_id)
            VALUES (?, ?)`,
            
            [respuesta, consulta_id]

        )


    } catch (error) {

        console.error("Error al guardar consulta:", error)

    } finally {

        conn.release()

    }

}



async function getPrompt(){

let conn

try{

    conn = await db.getConnection()

    const [rows] = await conn.query(
        "SELECT id, prompt as content FROM prompt ORDER BY id DESC LIMIT 1"
    )

    if(rows.length>0){

        return { id: rows[0].id, content: rows[0].content }

    }

    return null

}catch(error){

    console.error("Error obteniendo prompt:", error)
    throw error

}finally{

    if(conn) conn.release()

}

}



async function getImageUrlForSubtema(subtemaId){

let conn

try{

    conn = await db.getConnection()

    const [rows] = await conn.query(

        "SELECT url_image FROM subtema_imagenes WHERE subtema_id = ?",
        [subtemaId]

    )

    if(rows.length>0){

        return rows[0].url_image

    }

    return null

}catch(error){

    console.error("Error obteniendo imagen:", error)
    return null

}finally{

    if(conn) conn.release()

}

}



async function getResoomeForChat(numero){

let conn

try{

    conn = await db.getConnection()

    const [rows] = await conn.query(

`SELECT c.id,
c.mensaje AS usuario,
r.mensaje AS respuesta
FROM consulta c
JOIN respuesta r ON c.id = r.consulta_id
JOIN usuario u ON u.id = c.usuario_id
WHERE c.subtema_id != 0
AND u.numero_celular = ?
ORDER BY c.id DESC
LIMIT 10`

,[numero])

    return rows.reverse()

}catch(error){

    console.error("Error obteniendo historial:", error)
    return null

}finally{

    if(conn) conn.release()

}

}



module.exports = {

guardarConsulta,
prompt: getPrompt,
getImageUrlForSubtema,
getResoomeForChat

}