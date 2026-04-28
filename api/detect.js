import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';
import formidable from 'formidable';
import fs from 'fs';

let model;

async function loadModel() {
  if (!model) {
    model = await nsfwjs.load(); // auto load default model
  }
  return model;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Upload error' });
    }

    const file = files.image;
    if (!file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    try {
      const data = fs.readFileSync(file.filepath);
      const image = tf.node.decodeImage(data, 3);

      const model = await loadModel();
      const predictions = await model.classify(image);

      const nsfwScore =
        (predictions.find(p => p.className === 'Porn')?.probability || 0) +
        (predictions.find(p => p.className === 'Hentai')?.probability || 0) +
        (predictions.find(p => p.className === 'Sexy')?.probability || 0);

      const isNsfw = nsfwScore > 0.5;

      res.json({
        success: true,
        isNSFW: isNsfw,
        score: nsfwScore,
        predictions
      });

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Detection failed' });
    }
  });
}