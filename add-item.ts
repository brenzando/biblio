import { sql } from './_db.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Método não permitido' });
  }

  const { itemData, quantity } = request.body;

  try {
    // Inicia uma transação para garantir que tudo seja executado ou nada
    await sql`BEGIN`;

    const { rows: [newItem] } = await sql`
      INSERT INTO Items (Type, Title, Author, Publisher, Year, Isbn_Issn, Classification, Location, RecommendedBy)
      VALUES (${itemData.type}, ${itemData.title}, ${itemData.author}, ${itemData.publisher}, ${itemData.year}, ${itemData.isbn_issn}, ${itemData.classification}, ${itemData.location}, ${itemData.recommendedBy})
      RETURNING Id;
    `;
    const itemId = newItem.id;
    const typePrefix = itemData.type.substring(0, 3).toUpperCase();
    
    for (let i = 0; i < quantity; i++) {
        const barcode = `${typePrefix}${Date.now() + i}`;
        await sql`
            INSERT INTO Copies (ItemId, Barcode, Status)
            VALUES (${itemId}, ${barcode}, 'Disponível');
        `;
    }
    
    await sql`
        INSERT INTO Notifications (Text)
        VALUES (${`Novo item adicionado: "${itemData.title}"`});
    `;

    // Confirma a transação
    await sql`COMMIT`;

    return response.status(201).json({ message: 'Item e exemplares adicionados com sucesso!' });
  } catch (error) {
    // Desfaz a transação em caso de erro
    await sql`ROLLBACK`;
    console.error(error);
    return response.status(500).json({ error: 'Erro ao adicionar item.' });
  }
}