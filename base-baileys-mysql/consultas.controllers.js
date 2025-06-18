const db = require('./db');

function getCurrentWeek(){
    const ahora = new Date();
    const dia = ahora.getDate();
    return semanaDelMes = Math.floor((dia - 1) / 7) + 1;
}

async function guardarConsulta({ numero, mensaje, subtema_id, respuesta }) {
    const conn = await db.getConnection();

    try {
        let [rows] = await conn.query("SELECT id FROM usuario WHERE numero_celular = ?", [numero]);
        let usuario_id;

        if (rows.length > 0) {
            usuario_id = rows[0].id;
        } else {
            const [insertResult] = await conn.query("INSERT INTO usuario (numero_celular) VALUES (?)", [numero]);
            usuario_id = insertResult.insertId;
        }
        let tema_id = null;
        if (subtema_id !== null && subtema_id !== undefined) {
            const [subtemaRows] = await conn.query("SELECT tema_id FROM subtema WHERE id = ?", [subtema_id]);
            if (subtemaRows.length > 0) {
                tema_id = subtemaRows[0].tema_id;
            }
        }
        console.log(subtema_id)

        const ahora = new Date();
        const year = ahora.getFullYear();
        const month = ahora.getMonth() + 1;  
        const day = ahora.getDate();
        const week = getCurrentWeek();
        const [consultaResult] = await conn.query(`
            INSERT INTO consulta (usuario_id, mensaje, subtema_id, tema_id, day, month, year, week )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [usuario_id, mensaje, subtema_id, tema_id, day, month, year, week]);
        
        const consulta_id = consultaResult.insertId;
        await conn.query(`
            INSERT INTO respuesta (consulta_id, mensaje)
            VALUES (?, ?)`, [consulta_id, respuesta.content]);

    } catch (error) {
        console.error("Error al guardar en la base de datos:", error);
    } finally {
        conn.release();
    }
}

async function getPrompt() {
    let conn; 
    try {
        conn = await db.getConnection(); 

        const [rows] = await conn.query("SELECT id, prompt as content FROM prompt order by id desc limit 1");

        if (rows.length > 0) {
            return { id: 1, content: rows[0].content }; 
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching prompt from database:", error);
        throw error; 
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

/**
 * **NUEVA FUNCIÓN:** Obtiene la URL de una imagen asociada a un subtema.
 * Consulta la tabla `subtema_imagenes` para encontrar la URL.
 * @param {number} subtemaId El ID del subtema clasificado.
 * @returns {string|null} La URL de la imagen o `null` si no hay imagen asociada.
 */
async function getImageUrlForSubtema(subtemaId) {
    let conn;
    try {
        conn = await db.getConnection();
        const [rows] = await conn.query("SELECT url_imagen FROM subtema_imagenes WHERE subtema_id = ?", [subtemaId]);

        if (rows.length > 0) {
            return rows[0].url_imagen;
        } else {
            return null; 
        }
    } catch (error) {
        console.error("Error al obtener la URL de la imagen del subtema:", error);
        return null;
    } finally {
        if (conn) {
            conn.release();
        }
    }
}

async function getResoomeForChat(numero){
    let conn;
    try{
        conn = await db.getConnection();

        const [rows] = await conn.query ("select c.id, c.mensaje as usuario, r.mensaje as respuesta from consulta c join respuesta r on c.id = r.consulta_id join usuario u on u.id = c.usuario_id where c.subtema_id != 0 and u.numero_celular = ? order by c.id desc limit 10", [numero]) ;

        return rows.reverse();
        
    }catch (error) {
        console.error("Error al obtener la URL de la imagen del subtema:", error);
        return null;
    } finally {
        if (conn) {
            conn.release();
        }
    }
}


module.exports = {
    guardarConsulta,
    prompt: getPrompt, 
    getImageUrlForSubtema,
    getResoomeForChat
};