SELECT c.id, c.title, dp.itemName, dp.period, dp.value 
FROM cards c 
INNER JOIN dataPoints dp ON c.id = dp.cardId 
WHERE dp.value = 61895;
