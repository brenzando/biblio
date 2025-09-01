import { sql } from './_db.js';

export default async function handler(request, response) {
  try {
    const { rows: items } = await sql`SELECT * FROM Items ORDER BY Title;`;
    const { rows: copies } = await sql`SELECT * FROM Copies;`;
    const { rows: users } = await sql`SELECT * FROM Users ORDER BY Name;`;
    const { rows: loans } = await sql`SELECT * FROM Loans;`;
    const { rows: reservations } = await sql`SELECT * FROM Reservations WHERE Status = 'Pendente';`;
    const { rows: notifications } = await sql`SELECT * FROM Notifications ORDER BY Timestamp DESC;`;

    // Em um app maior, você faria queries mais complexas para juntar os dados.
    // Para simplificar, estamos buscando tudo separadamente.
    const data = { items, copies, users, loans, reservations, notifications };
    
    return response.status(200).json(data);
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Falha ao buscar dados do banco.' });
  }
}