import { db } from './server/_core/db.js';
import { cards, dataPoints } from './drizzle/schema.ts';

const cardData = await db.query.cards.findFirst({
  where: (c, { eq }) => eq(c.id, 270001),
  with: {
    dataPoints: true,
  },
});

console.log('Card 270001:', cardData);
console.log('Data points:', cardData?.dataPoints);

// Find the data point with value 61895
const target = cardData?.dataPoints?.find(dp => dp.value === 61895);
console.log('Data point with value 61895:', target);
