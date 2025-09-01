import { sql } from './_db.js';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método não permitido' });
    }

    const { action, reservationId } = request.body;

    try {
        const { rows: [reservation] } = await sql`SELECT * FROM Reservations WHERE Id = ${reservationId};`;
        if (!reservation) {
            return response.status(404).json({ error: 'Reserva não encontrada.' });
        }

        if (action === 'approve') {
            await sql`BEGIN`;
            
            // Encontra um exemplar disponível para o item
            const { rows: [availableCopy] } = await sql`
                SELECT CopyId FROM Copies 
                WHERE ItemId = ${reservation.itemid} AND Status = 'Disponível' 
                LIMIT 1;
            `;

            if (!availableCopy) {
                await sql`ROLLBACK`;
                return response.status(409).json({ error: 'Nenhum exemplar disponível para reservar.' });
            }

            // Atualiza o status da reserva e do exemplar
            await sql`
                UPDATE Reservations 
                SET Status = 'Aprovada', CopyId = ${availableCopy.copyid} 
                WHERE Id = ${reservationId};
            `;
            await sql`
                UPDATE Copies 
                SET Status = 'Reservado' 
                WHERE CopyId = ${availableCopy.copyid};
            `;
            await sql`
                INSERT INTO Notifications (UserId, Text)
                VALUES (${reservation.userid}, ${`Sua reserva para "${reservation.itemtitle}" foi APROVADA.`});
            `;

            await sql`COMMIT`;
            return response.status(200).json({ message: 'Reserva aprovada!' });

        } else if (action === 'decline') {
            await sql`DELETE FROM Reservations WHERE Id = ${reservationId};`;
            await sql`
                INSERT INTO Notifications (UserId, Text)
                VALUES (${reservation.userid}, ${`Sua reserva para "${reservation.itemtitle}" foi RECUSADA.`});
            `;
            return response.status(200).json({ message: 'Reserva recusada.' });
        } else {
            return response.status(400).json({ error: 'Ação inválida.' });
        }

    } catch (error) {
        await sql`ROLLBACK`;
        console.error(error);
        return response.status(500).json({ error: 'Erro ao gerenciar reserva.' });
    }
}