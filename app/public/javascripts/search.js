require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Define MONGO_URI en tu .env');
    process.exit(1);
  }

  const termino = process.argv[2];
  if (!termino) {
    console.error('Uso: node search.js <término>');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const coll = client.db('audiofind').collection('transcripciones');

  const pipeline = [
    {
      $search: {
        index: 'default',
        text: {
          query: termino,
          path: 'segments.words.text'
        }
      }
    },
    { $unwind: '$segments' },
    { $unwind: '$segments.words' },
    {
      $match: {
        'segments.words.text': { $regex: `^${termino}$`, $options: 'i' }
      }
    },
    {
      $group: {
        _id: '$_id',
        menciones: {
          $push: {
            palabra: '$segments.words.text',
            start: '$segments.words.start',
            end: '$segments.words.end'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        audioId: '$_id',
        menciones: 1
      }
    }
  ];

  const resultados = await coll.aggregate(pipeline).toArray();
  if (resultados.length === 0) {
    console.log(`No se encontró “${termino}” en ningún audio.`);
  } else {
    console.log(`Resultados para “${termino}”:`);
    for (const { audioId, menciones } of resultados) {
      console.log(`\n• ${audioId}.wav`);
      for (const { palabra, start, end } of menciones) {
        console.log(`   - "${palabra}" [${start.toFixed(2)}s – ${end.toFixed(2)}s]`);
      }
    }
  }

  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
